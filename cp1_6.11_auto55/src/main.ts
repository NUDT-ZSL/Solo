import { BookShelf } from './bookShelf';
import { UIPanel } from './uiPanel';
import { performOcr } from './ocrParser';
import type { CatalogEntry } from './ocrParser';

class App {
  private bookShelf: BookShelf;
  private uiPanel: UIPanel;
  private uploadZone: HTMLElement;
  private uploadBox: HTMLElement;
  private fileInput: HTMLInputElement;
  private reuploadBtn: HTMLElement;
  private canvasContainer: HTMLElement;
  private loadingOverlay: HTMLElement;
  private progressBar: HTMLElement;
  private loadingText: HTMLElement;
  private currentImage: HTMLImageElement | null = null;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;
    this.uploadZone = document.getElementById('upload-zone')!;
    this.uploadBox = document.getElementById('upload-box')!;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.reuploadBtn = document.getElementById('reupload-btn')!;
    this.loadingOverlay = document.getElementById('loading-overlay')!;
    this.progressBar = document.getElementById('progress-bar')!;
    this.loadingText = document.getElementById('loading-text')!;

    this.bookShelf = new BookShelf(this.canvasContainer);
    this.uiPanel = new UIPanel(this.bookShelf);

    this.bookShelf.setOnSpineClick((entry: CatalogEntry) => {
      this.uiPanel.highlightRow(entry.id);
    });

    this.uiPanel.setOnEntryEdit((entries: CatalogEntry[]) => {
      this.bookShelf.buildShelf(entries);
    });

    this.bindEvents();
    this.hideLoading();
  }

  private bindEvents() {
    this.uploadBox.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.handleFile(file);
    });

    this.uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadBox.classList.add('drag-over');
    });

    this.uploadBox.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadBox.classList.remove('drag-over');
    });

    this.uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadBox.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (file) this.handleFile(file);
    });

    this.reuploadBtn.addEventListener('click', () => {
      this.resetApp();
    });
  }

  private async handleFile(file: File) {
    if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
      this.uiPanel.setStatus('仅支持 PNG / JPG 格式的图片');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.uiPanel.setStatus('图片文件过大，建议不超过 10MB');
      return;
    }

    this.uploadZone.classList.add('hidden');
    this.uiPanel.setStatus('正在进行 OCR 识别...');

    const img = new Image();
    const url = URL.createObjectURL(file);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
    });

    this.currentImage = img;
    this.bookShelf.setSourceImage(img);

    try {
      const result = await performOcr(img, (progress) => {
        this.uiPanel.setStatus(`OCR 识别中... ${progress}%`);
      });

      if (result.entries.length === 0) {
        this.uiPanel.setStatus('未识别到有效的目录条目，请尝试更清晰的截图');
        this.uploadZone.classList.remove('hidden');
        return;
      }

      this.uiPanel.setStatus(`识别完成，共 ${result.entries.length} 个条目`);
      this.uiPanel.renderTable(result.entries);
      this.bookShelf.buildShelf(result.entries);
      this.bookShelf.start();
    } catch (err) {
      console.error('OCR failed:', err);
      this.uiPanel.setStatus('OCR 识别失败，请重试');
      this.uploadZone.classList.remove('hidden');
    }

    URL.revokeObjectURL(url);
  }

  private resetApp() {
    this.bookShelf.stop();
    this.bookShelf.resetCamera();
    this.uiPanel.reset();
    this.uploadZone.classList.remove('hidden');
    this.fileInput.value = '';
    this.currentImage = null;
  }

  private hideLoading() {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          this.loadingOverlay.classList.add('hidden');
        }, 300);
      }
      this.progressBar.style.width = `${progress}%`;
      this.loadingText.textContent = progress < 50 ? '正在加载资源...' : '正在初始化场景...';
    }, 200);
  }
}

new App();
