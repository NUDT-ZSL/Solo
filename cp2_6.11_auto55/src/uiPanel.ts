import type { CatalogItem, ShelfConfig } from './main';

interface UIListeners {
  onFileSelected: (file: File) => void;
  onItemEdited: (item: CatalogItem) => void;
  onItemClicked: (item: CatalogItem) => void;
  onConfigChange: (config: Partial<ShelfConfig>) => void;
  onReupload: () => void;
}

export class UIPanel {
  private el: HTMLElement;
  private listeners: UIListeners;
  private items: CatalogItem[] = [];
  private activeId: string | null = null;
  private config: ShelfConfig = { layers: 5, bookGap: 8, background: 'wood' };
  private imageFile: File | null = null;

  constructor(listeners: UIListeners) {
    this.listeners = listeners;
    this.el = document.body;
    this.bindUpload();
    this.bindParams();
    this.bindReupload();
  }

  setImageFile(file: File): void {
    this.imageFile = file;
  }

  getImageFile(): File | null {
    return this.imageFile;
  }

  bindUpload(): void {
    const zone = document.getElementById('upload-zone')!;
    const input = document.getElementById('file-input') as HTMLInputElement;

    zone.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT') {
        input.click();
      }
    });
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (f) {
        this.imageFile = f;
        this.listeners.onFileSelected(f);
      }
    });
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const f = e.dataTransfer?.files?.[0];
      if (f && /^image\//.test(f.type)) {
        this.imageFile = f;
        input.files = e.dataTransfer!.files;
        this.listeners.onFileSelected(f);
      }
    });
  }

  bindReupload(): void {
    const btn = document.getElementById('btn-reupload')!;
    btn.addEventListener('click', () => {
      (document.getElementById('file-input') as HTMLInputElement).click();
    });
  }

  bindParams(): void {
    const layersSlider = document.getElementById('layers-slider') as HTMLInputElement;
    const gapSlider = document.getElementById('gap-slider') as HTMLInputElement;
    const layersVal = document.getElementById('layers-val')!;
    const gapVal = document.getElementById('gap-val')!;

    layersSlider.addEventListener('input', () => {
      const v = parseInt(layersSlider.value, 10);
      layersVal.textContent = String(v);
      this.config.layers = v;
      this.listeners.onConfigChange({ layers: v });
    });

    gapSlider.addEventListener('input', () => {
      const v = parseInt(gapSlider.value, 10);
      gapVal.textContent = String(v);
      this.config.bookGap = v;
      this.listeners.onConfigChange({ bookGap: v });
    });

    const bgOptions = document.querySelectorAll('#bg-options .bg-option');
    bgOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        bgOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const bg = (opt as HTMLElement).dataset.bg as ShelfConfig['background'];
        this.config.background = bg;
        this.listeners.onConfigChange({ background: bg });
      });
    });
  }

  showProgress(progress: number, message?: string, visible = true): void {
    const bar = document.getElementById('progress-bar')!;
    const fill = document.getElementById('progress-fill')!;
    const label = document.getElementById('progress-label')!;
    if (visible) {
      bar.classList.add('active');
      fill.style.width = Math.max(0, Math.min(100, progress)) + '%';
      if (message !== undefined) {
        label.style.display = 'block';
        label.textContent = message;
      }
    } else {
      setTimeout(() => {
        bar.classList.remove('active');
        label.style.display = 'none';
      }, 600);
    }
  }

  hidePlaceholder(): void {
    const ph = document.getElementById('placeholder');
    if (ph) ph.style.display = 'none';
  }

  renderItems(items: CatalogItem[]): void {
    this.items = [...items];
    const tbody = document.getElementById('ocr-tbody')!;
    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#666;">未识别到有效条目</td></tr>`;
      return;
    }
    tbody.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.dataset.id = item.id;
      if (this.activeId === item.id) tr.classList.add('active');

      const lvlTd = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `level-badge l${item.level}`;
      badge.textContent = `L${item.level}`;
      lvlTd.appendChild(badge);

      const titleTd = document.createElement('td');
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = item.title;
      titleInput.addEventListener('change', () => {
        item.title = titleInput.value.trim();
        this.listeners.onItemEdited(item);
      });
      titleInput.addEventListener('click', (e) => e.stopPropagation());
      titleTd.appendChild(titleInput);

      const pageTd = document.createElement('td');
      const pageInput = document.createElement('input');
      pageInput.type = 'text';
      pageInput.value = item.page;
      pageInput.addEventListener('change', () => {
        item.page = pageInput.value.trim();
        this.listeners.onItemEdited(item);
      });
      pageInput.addEventListener('click', (e) => e.stopPropagation());
      pageTd.appendChild(pageInput);

      tr.appendChild(lvlTd);
      tr.appendChild(titleTd);
      tr.appendChild(pageTd);

      tr.addEventListener('click', () => {
        this.setActive(item.id);
        this.listeners.onItemClicked(item);
      });

      tbody.appendChild(tr);
    });
  }

  setActive(id: string | null): void {
    this.activeId = id;
    const rows = document.querySelectorAll('#ocr-tbody tr');
    rows.forEach(row => {
      const r = row as HTMLTableRowElement;
      if (r.dataset.id === id) r.classList.add('active');
      else r.classList.remove('active');
    });
  }

  getItems(): CatalogItem[] {
    return this.items;
  }

  static showHoverBubble(visible: boolean, x?: number, y?: number): HTMLCanvasElement {
    const bubble = document.getElementById('hover-bubble') as HTMLElement;
    const canvas = document.getElementById('bubble-thumb') as HTMLCanvasElement;
    if (visible) {
      bubble.classList.add('visible');
      if (x !== undefined && y !== undefined) {
        const bw = bubble.offsetWidth;
        const bh = bubble.offsetHeight;
        let finalX = x;
        let finalY = y;
        if (finalX < 10) finalX = 10;
        if (finalY < 10) finalY = 10;
        if (finalX + bw + 10 > window.innerWidth) finalX = window.innerWidth - bw - 20;
        if (finalY + bh + 10 > window.innerHeight) finalY = window.innerHeight - bh - 20;
        bubble.style.left = finalX + 'px';
        bubble.style.top = finalY + 'px';
      }
    } else {
      bubble.classList.remove('visible');
    }
    return canvas;
  }

  static drawBubbleFromImage(
    image: HTMLImageElement | HTMLCanvasElement,
    bbox: { x0: number; y0: number; x1: number; y1: number } | undefined,
    canvas: HTMLCanvasElement
  ): void {
    const cx = canvas.getContext('2d');
    if (!cx) return;
    canvas.width = 120; canvas.height = 80;
    cx.clearRect(0, 0, 120, 80);
    const iw = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const ih = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (bbox) {
      const padX = (bbox.x1 - bbox.x0) * 0.4;
      const padY = (bbox.y1 - bbox.y0) * 1.2;
      sx = Math.max(0, bbox.x0 - padX);
      sy = Math.max(0, bbox.y0 - padY);
      sw = Math.min(iw - sx, (bbox.x1 - bbox.x0) + padX * 2);
      sh = Math.min(ih - sy, (bbox.y1 - bbox.y0) + padY * 2);
    }
    if (sw > 0 && sh > 0) {
      cx.drawImage(image, sx, sy, sw, sh, 0, 0, 120, 80);
    }
    cx.fillStyle = 'rgba(0,0,0,0.15)';
    cx.fillRect(0, 0, 120, 80);
  }
}
