import * as pdfjsLib from 'pdfjs-dist';
import type { PageData, TextItem, PdfDocument } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const PAGE_RENDER_SCALE = 1.5;
const CACHE_SIZE = 6;

interface RenderedPage {
  canvas: HTMLCanvasElement;
  pageNumber: number;
  lastAccessed: number;
}

export class PdfParser {
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private pageCache: Map<number, RenderedPage> = new Map();
  private textCache: Map<number, PageData> = new Map();
  private renderingInProgress: Set<number> = new Set();
  private documentInfo: PdfDocument | null = null;

  async parsePdf(buffer: ArrayBuffer, fileName: string): Promise<PdfDocument> {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    this.pdfDoc = await loadingTask.promise;

    this.documentInfo = {
      numPages: this.pdfDoc.numPages,
      fileName,
    };

    this.pageCache.clear();
    this.textCache.clear();
    this.renderingInProgress.clear();

    await this.preloadPages(1);

    return this.documentInfo;
  }

  private async preloadPages(startPage: number): Promise<void> {
    if (!this.pdfDoc) return;

    const endPage = Math.min(startPage + CACHE_SIZE - 1, this.pdfDoc.numPages);
    const promises: Promise<void>[] = [];

    for (let i = startPage; i <= endPage; i++) {
      if (!this.textCache.has(i)) {
        promises.push(this.extractPageText(i));
      }
    }

    await Promise.all(promises);
  }

  private async extractPageText(pageNumber: number): Promise<void> {
    if (!this.pdfDoc || this.textCache.has(pageNumber)) return;

    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const textItems: TextItem[] = [];
    let fullText = '';

    for (const item of textContent.items) {
      if ('str' in item && item.str) {
        const textItem: TextItem = {
          str: item.str,
          transform: item.transform,
          width: item.width,
          height: item.height,
          fontName: 'fontName' in item ? (item as Record<string, unknown>).fontName as string : 'sans',
        };
        textItems.push(textItem);
        fullText += item.str;
      }
    }

    this.textCache.set(pageNumber, {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      textContent: fullText,
      textItems,
    });
  }

  async renderPage(pageNumber: number): Promise<HTMLCanvasElement | null> {
    if (!this.pdfDoc) return null;

    const cached = this.pageCache.get(pageNumber);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.canvas;
    }

    if (this.renderingInProgress.has(pageNumber)) return null;
    this.renderingInProgress.add(pageNumber);

    try {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: PAGE_RENDER_SCALE });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      this.pageCache.set(pageNumber, {
        canvas,
        pageNumber,
        lastAccessed: Date.now(),
      });

      this.evictOldPages();
      this.preloadAdjacentPages(pageNumber);

      return canvas;
    } finally {
      this.renderingInProgress.delete(pageNumber);
    }
  }

  private evictOldPages(): void {
    if (this.pageCache.size <= CACHE_SIZE) return;

    const entries = Array.from(this.pageCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove = entries.slice(0, entries.length - CACHE_SIZE);
    for (const [key] of toRemove) {
      this.pageCache.delete(key);
    }
  }

  private preloadAdjacentPages(currentPage: number): void {
    if (!this.pdfDoc) return;

    const pages: number[] = [];
    if (currentPage > 1) pages.push(currentPage - 1);
    if (currentPage < this.pdfDoc.numPages) pages.push(currentPage + 1);
    if (currentPage + 1 < this.pdfDoc.numPages) pages.push(currentPage + 2);
    if (currentPage > 2) pages.push(currentPage - 2);

    for (const pn of pages) {
      if (!this.pageCache.has(pn) && !this.renderingInProgress.has(pn)) {
        this.renderPage(pn);
      }
      if (!this.textCache.has(pn)) {
        this.extractPageText(pn);
      }
    }
  }

  async getPageData(pageNumber: number): Promise<PageData | null> {
    if (!this.textCache.has(pageNumber)) {
      await this.extractPageText(pageNumber);
    }
    return this.textCache.get(pageNumber) ?? null;
  }

  getPageViewport(pageNumber: number, scale: number = 1): { width: number; height: number } | null {
    const data = this.textCache.get(pageNumber);
    if (!data) return null;
    return { width: data.width * scale, height: data.height * scale };
  }

  get numPages(): number {
    return this.pdfDoc?.numPages ?? 0;
  }

  get fileName(): string {
    return this.documentInfo?.fileName ?? '';
  }

  destroy(): void {
    this.pdfDoc?.destroy();
    this.pdfDoc = null;
    this.pageCache.clear();
    this.textCache.clear();
    this.renderingInProgress.clear();
    this.documentInfo = null;
  }
}
