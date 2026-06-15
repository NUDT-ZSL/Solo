import { OCRParser, type CatalogItem, type OCRProgress } from './ocrParser';
import { BookShelf } from './bookShelf';
import { UIPanel } from './uiPanel';

export interface ShelfConfig {
  layers: number;
  bookGap: number;
  background: 'wood' | 'black' | 'navy';
}

export type { CatalogItem };

class App {
  private ocrParser: OCRParser;
  private bookShelf!: BookShelf;
  private uiPanel!: UIPanel;
  private uploadedImage: HTMLImageElement | null = null;
  private currentItems: CatalogItem[] = [];

  constructor() {
    this.ocrParser = new OCRParser();
    this.init();
  }

  private async init(): Promise<void> {
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;

    this.bookShelf = new BookShelf(canvas, {
      onHover: (item, x, y) => this.handleHover(item, x, y),
      onClick: (item) => this.handleClick(item)
    });

    this.uiPanel = new UIPanel({
      onFileSelected: (file) => this.handleFileSelected(file),
      onItemEdited: (item) => this.handleItemEdited(item),
      onItemClicked: (item) => this.bookShelf.focusOnBook(item),
      onConfigChange: (cfg) => this.bookShelf.setConfig(cfg),
      onReupload: () => this.triggerReupload()
    });

    this.loadDemoData();
    window.addEventListener('beforeunload', () => this.ocrParser.destroy());
  }

  private loadDemoData(): void {
    const demo: CatalogItem[] = [
      { id: 'demo1', level: 1, title: '第一章 代码的诞生', page: '1', indent: 0 },
      { id: 'demo2', level: 2, title: '1.1 什么是编程', page: '3', indent: 3 },
      { id: 'demo3', level: 2, title: '1.2 语言的演变', page: '8', indent: 3 },
      { id: 'demo4', level: 3, title: '1.2.1 机器语言', page: '9', indent: 6 },
      { id: 'demo5', level: 3, title: '1.2.2 高级语言', page: '12', indent: 6 },
      { id: 'demo6', level: 1, title: '第二章 数据结构', page: '21', indent: 0 },
      { id: 'demo7', level: 2, title: '2.1 数组与链表', page: '23', indent: 3 },
      { id: 'demo8', level: 2, title: '2.2 栈与队列', page: '35', indent: 3 },
      { id: 'demo9', level: 3, title: '2.2.1 栈的应用', page: '36', indent: 6 },
      { id: 'demo10', level: 1, title: '第三章 算法之美', page: '49', indent: 0 },
      { id: 'demo11', level: 2, title: '3.1 排序思想', page: '51', indent: 3 },
      { id: 'demo12', level: 2, title: '3.2 搜索策略', page: '68', indent: 3 },
      { id: 'demo13', level: 3, title: '3.2.1 深度优先', page: '70', indent: 6 },
      { id: 'demo14', level: 3, title: '3.2.2 广度优先', page: '75', indent: 6 },
      { id: 'demo15', level: 1, title: '第四章 系统设计', page: '89', indent: 0 },
      { id: 'demo16', level: 2, title: '4.1 模块化原则', page: '91', indent: 3 },
      { id: 'demo17', level: 2, title: '4.2 性能与优化', page: '108', indent: 3 },
      { id: 'demo18', level: 1, title: '第五章 未来展望', page: '131', indent: 0 },
      { id: 'demo19', level: 2, title: '5.1 人工智能', page: '133', indent: 3 },
      { id: 'demo20', level: 2, title: '5.2 量子计算', page: '145', indent: 3 }
    ];
    this.currentItems = demo;
    this.bookShelf.buildShelf(demo);
    this.uiPanel.renderItems(demo);
    this.uiPanel.hidePlaceholder();
  }

  private async handleFileSelected(file: File): Promise<void> {
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      alert('请上传 PNG 或 JPG 格式的图片');
      return;
    }

    this.uiPanel.showProgress(3, '读取图片...', true);

    const img = await this.loadImage(file);
    this.uploadedImage = img;

    const maxDim = 2000;
    let resized: HTMLCanvasElement | HTMLImageElement = img;
    if (img.naturalWidth > maxDim || img.naturalHeight > maxDim) {
      const ratio = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * ratio);
      c.height = Math.round(img.naturalHeight * ratio);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      resized = c;
    }

    try {
      const items = await this.ocrParser.parseImage(resized as any, (p: OCRProgress) => {
        this.uiPanel.showProgress(p.progress, p.message, true);
      });

      if (items.length === 0) {
        alert('未识别到有效目录条目，请尝试更清晰的截图');
        this.uiPanel.showProgress(100, '识别完成，无有效条目', false);
        return;
      }

      this.currentItems = items;
      this.uiPanel.setImageFile(file);
      this.uiPanel.renderItems(items);
      this.uiPanel.hidePlaceholder();
      this.bookShelf.buildShelf(items);
      this.uiPanel.showProgress(100, `完成！共 ${items.length} 条目录`, false);
    } catch (err) {
      console.error(err);
      this.uiPanel.showProgress(0, '识别失败，请重试', false);
    }
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('图片加载失败'));
      };
      img.src = url;
    });
  }

  private handleHover(item: CatalogItem | null, x: number, y: number): void {
    const canvas = UIPanel.showHoverBubble(!!item, x, y);
    if (item && this.uploadedImage) {
      UIPanel.drawBubbleFromImage(this.uploadedImage, item.bbox, canvas);
    } else if (item && !this.uploadedImage) {
      const c = canvas.getContext('2d')!;
      canvas.width = 120; canvas.height = 80;
      const g = c.createLinearGradient(0, 0, 120, 80);
      g.addColorStop(0, '#3E2723');
      g.addColorStop(1, '#5D4037');
      c.fillStyle = g;
      c.fillRect(0, 0, 120, 80);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.font = 'bold 11px sans-serif';
      c.textAlign = 'center';
      c.fillText(item.title.slice(0, 10), 60, 36);
      c.fillStyle = '#FFD700';
      c.font = 'bold 10px sans-serif';
      c.fillText('P.' + (item.page || '?'), 60, 56);
    }
  }

  private handleClick(item: CatalogItem): void {
    this.uiPanel.setActive(item.id);
    const tbody = document.getElementById('ocr-tbody');
    if (tbody) {
      const row = tbody.querySelector(`tr[data-id="${item.id}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  private handleItemEdited(item: CatalogItem): void {
    const idx = this.currentItems.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      this.currentItems[idx] = { ...item };
      this.bookShelf.buildShelf(this.currentItems);
    }
  }

  private triggerReupload(): void {
    (document.getElementById('file-input') as HTMLInputElement).click();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
