import { FaceMeshInfo } from './origamiModel';
import { createThumbnail } from './faceGenerator';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface UICallbacks {
  onFileSelected: (file: File) => void;
  onAutoRotateToggle: (enabled: boolean) => void;
  onReset: () => void;
}

export class UIController {
  private fileInput: HTMLInputElement;
  private autoRotateBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private faceCountEl: HTMLElement;
  private infoPopup: HTMLElement;
  private loadingOverlay: HTMLElement;
  private callbacks: UICallbacks;
  private currentFile: File | null = null;
  private popupThumbCache: Map<number, string> = new Map();
  private lastPopupFaceIndex: number = -1;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.autoRotateBtn = document.getElementById('auto-rotate-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.faceCountEl = document.getElementById('face-count') as HTMLElement;
    this.infoPopup = document.getElementById('info-popup') as HTMLElement;
    this.loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        if (!this.validateFile(file)) {
          target.value = '';
          return;
        }
        this.currentFile = file;
        this.popupThumbCache.clear();
        this.lastPopupFaceIndex = -1;
        this.callbacks.onFileSelected(file);
        target.value = '';
      }
    });

    this.autoRotateBtn.addEventListener('click', () => {
      const isActive = this.autoRotateBtn.classList.toggle('active');
      this.callbacks.onAutoRotateToggle(isActive);
    });

    this.resetBtn.addEventListener('click', () => {
      this.autoRotateBtn.classList.remove('active');
      this.hidePopup();
      this.callbacks.onReset();
    });

    document.addEventListener('click', (e) => {
      if (!this.infoPopup.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'CANVAS' && target.closest('#ui-panel') === null) {
          this.hidePopup();
        }
      }
    });
  }

  private validateFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      this.showToast('请上传 JPG 或 PNG 格式的图片');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.showToast('图片大小不能超过 5MB');
      return false;
    }
    return true;
  }

  private showToast(message: string) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 32px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: rgba(255, 107, 107, 0.95);
      color: #fff;
      font-size: 13px;
      border-radius: 8px;
      z-index: 9999;
      box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
      backdrop-filter: blur(10px);
      animation: slideDown 0.3s ease;
    `;
    toast.textContent = message;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translate(-50%, -20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 300);
    }, 2800);
  }

  public hideLoading(delay: number = 600) {
    setTimeout(() => {
      this.loadingOverlay.classList.add('fade-out');
      setTimeout(() => {
        this.loadingOverlay.style.display = 'none';
      }, 600);
    }, delay);
  }

  public showLoading(text: string = '处理中') {
    const textEl = this.loadingOverlay.querySelector('.loading-text');
    if (textEl) textEl.textContent = text;
    this.loadingOverlay.classList.remove('fade-out');
    this.loadingOverlay.style.display = 'flex';
  }

  public setFaceCount(count: number) {
    this.faceCountEl.textContent = String(count);
  }

  public setAutoRotateActive(active: boolean) {
    if (active) {
      this.autoRotateBtn.classList.add('active');
    } else {
      this.autoRotateBtn.classList.remove('active');
    }
  }

  public async showFaceInfo(faceInfo: FaceMeshInfo, screenPos: { x: number; y: number }) {
    const { avgColor, uvBounds, index } = faceInfo;
    this.lastPopupFaceIndex = index;
    const colorHex = '#' + [avgColor.r, avgColor.g, avgColor.b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
    let thumbSrc = this.popupThumbCache.get(index);
    if (!thumbSrc && this.currentFile) {
      try {
        thumbSrc = await createThumbnail(this.currentFile, uvBounds);
        this.popupThumbCache.set(index, thumbSrc);
      } catch {
        thumbSrc = '';
      }
    }
    if (this.lastPopupFaceIndex !== index) return;
    const thumbHtml = thumbSrc ? `<img class="popup-thumb" src="${thumbSrc}" alt="局部预览" />` : '';
    this.infoPopup.innerHTML = `
      <div class="popup-header">
        <div class="color-swatch" style="background-color: ${colorHex};"></div>
        <div class="popup-title">面片 #${index + 1}</div>
      </div>
      ${thumbHtml}
      <div class="popup-row">
        <span class="popup-label">平均颜色</span>
        <span class="popup-val" style="color: ${colorHex};">${colorHex}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">RGB 值</span>
        <span class="popup-val">${avgColor.r}, ${avgColor.g}, ${avgColor.b}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">质心位置</span>
        <span class="popup-val">${faceInfo.centroid.x.toFixed(1)}, ${faceInfo.centroid.y.toFixed(1)}</span>
      </div>
      <div class="popup-row">
        <span class="popup-label">UV 范围</span>
        <span class="popup-val">${(uvBounds.minX * 100).toFixed(0)}%-${(uvBounds.maxX * 100).toFixed(0)}%, ${(uvBounds.minY * 100).toFixed(0)}%-${(uvBounds.maxY * 100).toFixed(0)}%</span>
      </div>
    `;
    this.positionPopup(screenPos);
    this.infoPopup.style.display = 'block';
    requestAnimationFrame(() => {
      this.positionPopup(screenPos);
    });
  }

  private positionPopup(screenPos: { x: number; y: number }) {
    const padding = 16;
    const popupRect = this.infoPopup.getBoundingClientRect();
    let x = screenPos.x + 18;
    let y = screenPos.y - popupRect.height / 2;
    if (x + popupRect.width + padding > window.innerWidth) {
      x = screenPos.x - popupRect.width - 18;
    }
    if (y < padding) y = padding;
    if (y + popupRect.height + padding > window.innerHeight) {
      y = window.innerHeight - popupRect.height - padding;
    }
    x = Math.max(padding, x);
    this.infoPopup.style.left = `${x}px`;
    this.infoPopup.style.top = `${y}px`;
  }

  public hidePopup() {
    this.infoPopup.style.display = 'none';
    this.lastPopupFaceIndex = -1;
  }
}
