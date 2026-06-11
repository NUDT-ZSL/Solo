export interface UICallbacks {
  onFileUpload: (file: File) => void;
  onAutoRotateToggle: (enabled: boolean) => void;
  onReset: () => void;
  onPopupClose: () => void;
}

export class UIController {
  private fileInput: HTMLInputElement;
  private rotateBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private faceCountEl: HTMLElement;
  private loadingOverlay: HTMLElement;
  private previewContainer: HTMLElement;
  private previewImage: HTMLImageElement;
  private infoPopup: HTMLElement;
  private popupSnippet: HTMLImageElement;
  private popupColor: HTMLElement;
  private popupRgb: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private callbacks: UICallbacks;
  private isAutoRotate: boolean = false;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.rotateBtn = document.getElementById('rotate-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.faceCountEl = document.getElementById('face-count') as HTMLElement;
    this.loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
    this.previewContainer = document.getElementById('preview-container') as HTMLElement;
    this.previewImage = document.getElementById('preview-image') as HTMLImageElement;
    this.infoPopup = document.getElementById('info-popup') as HTMLElement;
    this.popupSnippet = document.getElementById('popup-snippet') as HTMLImageElement;
    this.popupColor = document.getElementById('popup-color') as HTMLElement;
    this.popupRgb = document.getElementById('popup-rgb') as HTMLElement;
    this.closeBtn = this.infoPopup.querySelector('.close-btn') as HTMLButtonElement;

    this.setupEventListeners();
    this.hideLoading();
  }

  private setupEventListeners(): void {
    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        if (file.type === 'image/jpeg' || file.type === 'image/png') {
          if (file.size <= 5 * 1024 * 1024) {
            this.showPreview(file);
            this.callbacks.onFileUpload(file);
          } else {
            alert('文件大小不能超过5MB');
          }
        } else {
          alert('请上传JPG或PNG格式的图片');
        }
        target.value = '';
      }
    });

    this.rotateBtn.addEventListener('click', () => {
      this.isAutoRotate = !this.isAutoRotate;
      this.rotateBtn.classList.toggle('active', this.isAutoRotate);
      this.callbacks.onAutoRotateToggle(this.isAutoRotate);
    });

    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onReset();
    });

    this.closeBtn.addEventListener('click', () => {
      this.hidePopup();
      this.callbacks.onPopupClose();
    });

    document.addEventListener('click', (e) => {
      if (this.infoPopup.classList.contains('visible')) {
        const target = e.target as HTMLElement;
        if (!this.infoPopup.contains(target) && !target.closest('canvas')) {
          this.hidePopup();
          this.callbacks.onPopupClose();
        }
      }
    });
  }

  private showPreview(file: File): void {
    const url = URL.createObjectURL(file);
    this.previewImage.src = url;
    this.previewContainer.classList.add('visible');
    
    setTimeout(() => {
      this.previewContainer.classList.remove('visible');
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }, 2000);
  }

  public showLoading(): void {
    this.loadingOverlay.classList.remove('hidden');
  }

  public hideLoading(): void {
    this.loadingOverlay.classList.add('hidden');
  }

  public setFaceCount(count: number): void {
    this.faceCountEl.textContent = count.toString();
  }

  public showPopup(
    snippetUrl: string,
    rgb: { r: number; g: number; b: number },
    screenPos: { x: number; y: number }
  ): void {
    this.popupSnippet.src = snippetUrl;
    this.popupColor.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    this.popupRgb.textContent = `RGB: (${rgb.r}, ${rgb.g}, ${rgb.b})`;

    const popupWidth = 200;
    const popupHeight = 180;
    let left = screenPos.x + 15;
    let top = screenPos.y + 15;

    if (left + popupWidth > window.innerWidth) {
      left = screenPos.x - popupWidth - 15;
    }
    if (top + popupHeight > window.innerHeight) {
      top = screenPos.y - popupHeight - 15;
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    this.infoPopup.style.left = `${left}px`;
    this.infoPopup.style.top = `${top}px`;
    this.infoPopup.classList.add('visible');
  }

  public hidePopup(): void {
    this.infoPopup.classList.remove('visible');
  }

  public isAutoRotateEnabled(): boolean {
    return this.isAutoRotate;
  }
}
