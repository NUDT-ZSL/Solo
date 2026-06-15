import { PageFlipper, type DeformedPage } from './paper';
import { CanvasRenderer } from './renderer';

interface GalleryImage {
  original: HTMLImageElement;
  cached: HTMLCanvasElement;
  thumb: HTMLCanvasElement;
  name: string;
}

interface GalleryState {
  images: GalleryImage[];
  currentPage: number;
  isDragging: boolean;
  pendingJump: number | null;
}

const PAPER_RATIO = 3 / 4;
const THUMB_SIZE = 60;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

class PaperGalleryApp {
  private canvas: HTMLCanvasElement;
  private canvasWrapper: HTMLElement;
  private loader: HTMLElement;
  private emptyHint: HTMLElement;
  private thumbsBar: HTMLElement;
  private dropOverlay: HTMLElement;
  private arrowLeft: HTMLElement;
  private arrowRight: HTMLElement;
  private fileInput: HTMLInputElement;
  private uploadBtn: HTMLElement;

  private flipper: PageFlipper;
  private renderer: CanvasRenderer;

  private state: GalleryState = {
    images: [],
    currentPage: 0,
    isDragging: false,
    pendingJump: null
  };

  private lastTime = 0;
  private rafId = 0;
  private canvasCssWidth = 0;
  private canvasCssHeight = 0;
  private paperWidth = 0;
  private paperHeight = 0;
  private dragSide: 'left' | 'right' | null = null;

  constructor() {
    this.canvas = document.getElementById('galleryCanvas') as HTMLCanvasElement;
    this.canvasWrapper = document.getElementById('canvasWrapper') as HTMLElement;
    this.loader = document.getElementById('loader') as HTMLElement;
    this.emptyHint = document.getElementById('emptyHint') as HTMLElement;
    this.thumbsBar = document.getElementById('thumbsBar') as HTMLElement;
    this.dropOverlay = document.getElementById('dropOverlay') as HTMLElement;
    this.arrowLeft = document.getElementById('arrowLeft') as HTMLElement;
    this.arrowRight = document.getElementById('arrowRight') as HTMLElement;
    this.fileInput = document.getElementById('fileInput') as HTMLInputElement;
    this.uploadBtn = document.getElementById('uploadBtn') as HTMLElement;

    this.flipper = new PageFlipper(800, 600);
    this.renderer = new CanvasRenderer(this.canvas);

    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);
  }

  start(): void {
    this.resizeCanvas();
    this.bindEvents();
    this.loadSampleImages().finally(() => {
      this.loader.classList.add('hidden');
      this.updateUIState();
      this.rafId = requestAnimationFrame(this.loop);
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);

    this.canvas.addEventListener('mousedown', this.onPointerDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onPointerMove.bind(this));
    window.addEventListener('mouseup', this.onPointerUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) this.addFiles(Array.from(files));
      this.fileInput.value = '';
    });

    this.arrowLeft.addEventListener('click', () => this.flipPrev());
    this.arrowRight.addEventListener('click', () => this.flipNext());

    const app = document.getElementById('app') as HTMLElement;
    app.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.dropOverlay.classList.add('active');
    });
    app.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    app.addEventListener('dragleave', (e) => {
      if (e.target === app) this.dropOverlay.classList.remove('active');
    });
    app.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropOverlay.classList.remove('active');
      const files = Array.from(e.dataTransfer?.files || []).filter(f =>
        f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/jpg'
      );
      if (files.length) this.addFiles(files);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.flipPrev();
      else if (e.key === 'ArrowRight') this.flipNext();
    });
  }

  private onPointerDown(e: MouseEvent): void {
    if (this.state.images.length < 2) return;
    if (this.flipper.isAnimating()) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const localX = x / DPR - (this.canvasCssWidth - this.paperWidth) / 2;
    this.dragSide = localX < this.paperWidth / 2 ? 'left' : 'right';
    if (this.dragSide === 'left' && this.state.currentPage === 0) return;
    if (this.dragSide === 'right' && this.state.currentPage === this.state.images.length - 1) return;
    this.state.isDragging = true;
    this.flipper.startDrag(localX, y, this.dragSide);
  }

  private onPointerMove(e: MouseEvent): void {
    if (!this.state.isDragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const localX = x / DPR - (this.canvasCssWidth - this.paperWidth) / 2;
    this.flipper.moveDrag(localX, y);
  }

  private onPointerUp(): void {
    if (!this.state.isDragging) return;
    this.state.isDragging = false;
    const result = this.flipper.endDrag();
    if (result.committed) {
      this.state.pendingJump = result.direction === 'next'
        ? this.state.currentPage + 1
        : this.state.currentPage - 1;
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.state.images.length < 2) return;
    if (this.flipper.isAnimating()) return;
    const t = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = (t.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (t.clientY - rect.top) * (this.canvas.height / rect.height);
    const localX = x / DPR - (this.canvasCssWidth - this.paperWidth) / 2;
    this.dragSide = localX < this.paperWidth / 2 ? 'left' : 'right';
    if (this.dragSide === 'left' && this.state.currentPage === 0) return;
    if (this.dragSide === 'right' && this.state.currentPage === this.state.images.length - 1) return;
    this.state.isDragging = true;
    this.flipper.startDrag(localX, y, this.dragSide);
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.state.isDragging) return;
    const t = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = (t.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (t.clientY - rect.top) * (this.canvas.height / rect.height);
    const localX = x / DPR - (this.canvasCssWidth - this.paperWidth) / 2;
    this.flipper.moveDrag(localX, y);
  }

  private onTouchEnd(): void {
    if (!this.state.isDragging) return;
    this.state.isDragging = false;
    const result = this.flipper.endDrag();
    if (result.committed) {
      this.state.pendingJump = result.direction === 'next'
        ? this.state.currentPage + 1
        : this.state.currentPage - 1;
    }
  }

  private flipNext(): void {
    if (this.state.currentPage >= this.state.images.length - 1) return;
    if (this.flipper.isAnimating()) return;
    this.flipper.triggerFlip('next');
    this.state.pendingJump = this.state.currentPage + 1;
  }

  private flipPrev(): void {
    if (this.state.currentPage <= 0) return;
    if (this.flipper.isAnimating()) return;
    this.flipper.triggerFlip('prev');
    this.state.pendingJump = this.state.currentPage - 1;
  }

  private jumpToPage(target: number): void {
    if (target === this.state.currentPage) return;
    if (target < 0 || target >= this.state.images.length) return;
    if (this.flipper.isAnimating()) return;
    const dir = target > this.state.currentPage ? 'next' : 'prev';
    this.state.pendingJump = target;
    this.flipper.triggerFlip(dir);
  }

  private handleResize(): void {
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const wrapper = this.canvasWrapper;
    const rect = wrapper.getBoundingClientRect();
    const cssW = Math.max(320, rect.width - 16);
    const cssH = Math.max(320, rect.height - 16);

    let pw: number, ph: number;
    if (cssW / cssH > PAPER_RATIO) {
      ph = cssH;
      pw = ph * PAPER_RATIO;
    } else {
      pw = cssW;
      ph = pw / PAPER_RATIO;
    }

    this.canvasCssWidth = cssW;
    this.canvasCssHeight = cssH;
    this.paperWidth = pw;
    this.paperHeight = ph;

    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    this.canvas.width = Math.floor(cssW * DPR);
    this.canvas.height = Math.floor(cssH * DPR);

    this.flipper.resize(pw, ph);
    this.renderer.resize(
      Math.floor(cssW * DPR),
      Math.floor(cssH * DPR),
      Math.floor(pw * DPR),
      Math.floor(ph * DPR)
    );
  }

  private loop(now: number): void {
    const dt = Math.min(48, now - this.lastTime || 16);
    this.lastTime = now;

    const finished = this.flipper.update(dt);
    if (finished && this.state.pendingJump !== null) {
      const target = this.state.pendingJump;
      const remaining = target - this.state.currentPage;
      if (Math.abs(remaining) > 1 && (remaining > 0 ? this.state.currentPage < target : this.state.currentPage > target)) {
        this.state.currentPage = this.flipper.getDirection() === 'next'
          ? this.state.currentPage + 1
          : this.state.currentPage - 1;
        this.flipper.reset();
        const dir = remaining > 0 ? 'next' : 'prev';
        this.flipper.triggerFlip(dir);
      } else {
        this.state.currentPage = target;
        this.state.pendingJump = null;
        this.flipper.reset();
        this.updateUIState();
      }
    }

    this.renderFrame();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private renderFrame(): void {
    const deformed: DeformedPage | null = this.flipper.isAnimating()
      ? this.flipper.getDeformedPage()
      : null;

    const images = this.state.images;
    const front = images[this.state.currentPage]?.cached ?? null;
    let back: HTMLCanvasElement | null = null;
    if (deformed) {
      const neighbor = deformed.direction === 'next'
        ? this.state.currentPage + 1
        : this.state.currentPage - 1;
      back = images[neighbor]?.cached ?? null;
    } else {
      back = images[this.state.currentPage + 1]?.cached ?? null;
    }

    this.renderer.render(deformed, {
      frontImage: front,
      backImage: back,
      pageNumber: this.state.currentPage + 1,
      totalPages: images.length || 1
    });
  }

  private async addFiles(files: File[]): Promise<void> {
    this.loader.classList.remove('hidden');
    const loaded = await Promise.all(files.map(f => this.loadImageFile(f)));
    const valid = loaded.filter((g): g is GalleryImage => !!g);
    if (valid.length) {
      this.state.images.push(...valid);
      if (this.state.images.length === valid.length) {
        this.state.currentPage = 0;
      }
      this.state.images.forEach(img => this.rebuildCache(img));
      this.rebuildThumbs();
    }
    this.loader.classList.add('hidden');
    this.updateUIState();
  }

  private async loadImageFile(file: File): Promise<GalleryImage | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const cached = document.createElement('canvas');
          const thumb = document.createElement('canvas');
          resolve({ original: img, cached, thumb, name: file.name });
        };
        img.onerror = () => resolve(null);
        img.src = reader.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  private rebuildCache(img: GalleryImage): void {
    const targetW = Math.max(800, Math.floor(this.paperWidth * DPR * 1.2));
    const targetH = Math.floor(targetW / PAPER_RATIO);
    img.cached.width = targetW;
    img.cached.height = targetH;
    const ctx = img.cached.getContext('2d');
    if (!ctx) return;
    const iw = img.original.naturalWidth;
    const ih = img.original.naturalHeight;
    const s = Math.max(targetW / iw, targetH / ih);
    const dw = iw * s;
    const dh = ih * s;
    const dx = (targetW - dw) / 2;
    const dy = (targetH - dh) / 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img.original, dx, dy, dw, dh);
  }

  private rebuildThumbs(): void {
    this.thumbsBar.innerHTML = '';
    this.state.images.forEach((img, idx) => {
      img.thumb.width = THUMB_SIZE;
      img.thumb.height = THUMB_SIZE;
      const tctx = img.thumb.getContext('2d');
      if (tctx) {
        const iw = img.original.naturalWidth;
        const ih = img.original.naturalHeight;
        const s = Math.max(THUMB_SIZE / iw, THUMB_SIZE / ih);
        const dw = iw * s;
        const dh = ih * s;
        tctx.drawImage(img.original, (THUMB_SIZE - dw) / 2, (THUMB_SIZE - dh) / 2, dw, dh);
      }
      const el = document.createElement('div');
      el.className = 'thumb-item' + (idx === this.state.currentPage ? ' active' : '');
      el.dataset.pageIndex = String(idx);

      const inner = document.createElement('div');
      inner.className = 'thumb-inner';
      const thumbImg = document.createElement('img');
      thumbImg.src = img.thumb.toDataURL('image/png');
      thumbImg.alt = img.name;
      inner.appendChild(thumbImg);
      el.appendChild(inner);

      const title = document.createElement('span');
      title.className = 'thumb-title';
      title.textContent = img.name.replace(/\.[^.]+$/, '');
      el.appendChild(title);

      el.addEventListener('mouseenter', () => {
        el.classList.add('is-hovered');
      });
      el.addEventListener('mouseleave', () => {
        el.classList.remove('is-hovered');
      });

      el.addEventListener('click', () => this.jumpToPage(idx));
      this.thumbsBar.appendChild(el);
    });
  }

  private updateUIState(): void {
    const count = this.state.images.length;
    this.emptyHint.classList.toggle('hidden', count > 0);
    this.arrowLeft.classList.toggle('visible', this.state.currentPage > 0);
    this.arrowRight.classList.toggle('visible', this.state.currentPage < count - 1);
    const thumbs = this.thumbsBar.querySelectorAll<HTMLElement>('.thumb-item');
    thumbs.forEach((el, idx) => {
      el.classList.toggle('active', idx === this.state.currentPage);
    });
    if (count > 0) {
      const active = thumbs[this.state.currentPage];
      if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  private async loadSampleImages(): Promise<void> {
    const colors = [
      ['#FFB88C', '#DE6262'],
      ['#654ea3', '#eaafc8'],
      ['#11998e', '#38ef7d'],
      ['#4776E6', '#8E54E9'],
      ['#f12711', '#f5af19'],
      ['#2193b0', '#6dd5ed']
    ];
    const names = ['晨光', '紫罗兰', '森林', '星海', '夕阳', '潮汐'];
    const samples: GalleryImage[] = [];

    for (let i = 0; i < colors.length; i++) {
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 1600;
      const g = c.getContext('2d');
      if (!g) continue;
      const grad = g.createLinearGradient(0, 0, 1200, 1600);
      grad.addColorStop(0, colors[i][0]);
      grad.addColorStop(1, colors[i][1]);
      g.fillStyle = grad;
      g.fillRect(0, 0, 1200, 1600);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let j = 0; j < 40; j++) {
        g.beginPath();
        g.arc(Math.random() * 1200, Math.random() * 1600, 20 + Math.random() * 120, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.font = 'bold 96px "Helvetica Neue", Arial, sans-serif';
      g.textAlign = 'center';
      g.fillText(names[i], 600, 820);
      const dataUrl = c.toDataURL('image/png');
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = dataUrl;
      });
      samples.push({
        original: img,
        cached: document.createElement('canvas'),
        thumb: document.createElement('canvas'),
        name: `${names[i]}.png`
      });
    }
    this.state.images = samples;
    this.state.images.forEach(img => this.rebuildCache(img));
    this.rebuildThumbs();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new PaperGalleryApp();
  app.start();
});
