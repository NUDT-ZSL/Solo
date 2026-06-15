import Tesseract from 'tesseract.js';

interface TesseractLine {
  text: string;
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  words?: any[];
}

interface TesseractPageData {
  text: string;
  lines?: TesseractLine[];
}

export interface Bbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface CatalogItem {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  page: string;
  indent: number;
  bbox?: Bbox;
  shelfIndex?: number;
  positionOnShelf?: number;
}

export interface OCRProgress {
  status: 'loading' | 'recognizing' | 'parsing' | 'done' | 'error';
  progress: number;
  message?: string;
}

type ProgressCallback = (p: OCRProgress) => void;

export class OCRParser {
  private worker: Tesseract.Worker | null = null;

  async parseImage(
    imageFile: File | HTMLImageElement | string,
    onProgress?: ProgressCallback
  ): Promise<CatalogItem[]> {
    try {
      onProgress?.({ status: 'loading', progress: 5, message: '加载OCR引擎...' });

      if (!this.worker) {
        this.worker = await Tesseract.createWorker(['chi_sim', 'eng'], 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              onProgress?.({
                status: 'recognizing',
                progress: 50 + Math.round((m.progress || 0) * 40),
                message: `识别文字中... ${Math.round((m.progress || 0) * 100)}%`
              });
            }
          }
        });
      }

      onProgress?.({ status: 'recognizing', progress: 15, message: '文字识别中...' });
      const { data } = await this.worker.recognize(imageFile as any);

      onProgress?.({ status: 'parsing', progress: 92, message: '解析目录层级...' });
      const items = this.parseLines(data);

      onProgress?.({ status: 'done', progress: 100, message: `完成！共识别 ${items.length} 条目录` });
      return items;
    } catch (err: any) {
      onProgress?.({ status: 'error', progress: 0, message: '识别失败: ' + (err?.message || err) });
      throw err;
    }
  }

  private parseLines(data: TesseractPageData): CatalogItem[] {
    const lines = data.lines || [];
    if (lines.length === 0) {
      return this.fallbackParseText(data.text);
    }

    const items: CatalogItem[] = [];
    const sortedLines = [...lines].sort((a, b) => (a.bbox?.y0 ?? 0) - (b.bbox?.y0 ?? 0));

    const allX0 = sortedLines.map(l => l.bbox?.x0 ?? 0).filter(x => x > 0);
    const minX = allX0.length > 0 ? Math.min(...allX0) : 0;

    sortedLines.forEach((line, idx) => {
      const text = (line.text || '').trim();
      if (!text) return;

      const x0 = line.bbox?.x0 ?? 0;
      const offset = Math.max(0, x0 - minX);
      const avgCharWidth = this.estimateCharWidth(text, line.bbox);
      const indent = avgCharWidth > 0 ? Math.round(offset / avgCharWidth) : 0;

      const level: 1 | 2 | 3 = this.indentToLevel(indent);
      const { title, page } = this.splitTitleAndPage(text);

      if (title) {
        items.push({
          id: `item-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level,
          title,
          page,
          indent,
          bbox: line.bbox ? {
            x0: line.bbox.x0,
            y0: line.bbox.y0,
            x1: line.bbox.x1,
            y1: line.bbox.y1
          } : undefined
        });
      }
    });

    return items;
  }

  private fallbackParseText(text: string): CatalogItem[] {
    const rawLines = text.split(/\r?\n/).map(l => l.replace(/\s+$/g, ''));
    const items: CatalogItem[] = [];
    let idx = 0;

    const nonEmptyLines = rawLines.filter(l => l.trim().length > 0);
    const minIndent = nonEmptyLines.reduce((min, l) => {
      const m = l.match(/^(\s*)/);
      return Math.min(min, (m?.[1] || '').length);
    }, 999);

    rawLines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const spacesMatch = line.match(/^(\s*)/);
      const indent = Math.max(0, (spacesMatch?.[1] || '').length - minIndent);
      const level: 1 | 2 | 3 = this.indentToLevel(indent);
      const { title, page } = this.splitTitleAndPage(trimmed);
      if (title) {
        items.push({
          id: `item-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          level,
          title,
          page,
          indent
        });
        idx++;
      }
    });
    return items;
  }

  private estimateCharWidth(text: string, bbox?: Bbox): number {
    if (!bbox || !text) return 12;
    const width = (bbox.x1 - bbox.x0) || 1;
    const charCount = text.replace(/\s/g, '').length || 1;
    return Math.max(6, width / charCount);
  }

  private indentToLevel(indent: number): 1 | 2 | 3 {
    if (indent <= 2) return 1;
    if (indent <= 5) return 2;
    return 3;
  }

  private splitTitleAndPage(text: string): { title: string; page: string } {
    const romanRegex = /\s+([ivxIVX]+)\s*$/;
    const numRegex = /\s+(\d[\d\-]*)\s*$/;
    const dotNumRegex = /[\.\s]+(\d+)\s*$/;
    const leadingDots = /\.{2,}/g;

    const cleaned = text.replace(leadingDots, '  ').trim();

    let match = cleaned.match(romanRegex);
    if (match) {
      return {
        title: cleaned.slice(0, match.index).trim().replace(/[\.\s]+$/, ''),
        page: match[1]
      };
    }

    match = cleaned.match(numRegex);
    if (match) {
      const before = cleaned.slice(0, match.index).trim().replace(/[\.\s\-–—]+$/, '');
      if (before) {
        return { title: before, page: match[1] };
      }
    }

    match = cleaned.match(dotNumRegex);
    if (match) {
      return {
        title: cleaned.slice(0, match.index).trim().replace(/[\.\s]+$/, ''),
        page: match[1]
      };
    }

    return { title: cleaned, page: '' };
  }

  async destroy(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (_) { /* noop */ }
      this.worker = null;
    }
  }
}
