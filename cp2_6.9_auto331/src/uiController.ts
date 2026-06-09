import {
  MirrorType,
  MirrorParams,
  getDefaultParams,
  renderMirror,
} from './mirrorProcessor.js';

const MIRROR_LABELS: Record<MirrorType, string> = {
  convex: '凸面镜',
  concave: '凹面镜',
  wave: '波浪镜',
  kaleidoscope: '万花筒',
};

const MIRROR_ORDER: MirrorType[] = ['convex', 'concave', 'wave', 'kaleidoscope'];

const CLOUD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 1 0-1.3-8.8 7 7 0 1 0-12.5 4.2"/><path d="M12 13v6"/><path d="m8 17 4-4 4 4"/></svg>`;

const SNAPSHOT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

const DOWNLOAD_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

const BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;

interface MirrorCell {
  type: MirrorType;
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  label: HTMLDivElement;
  params: MirrorParams;
}

export class UIController {
  private root: HTMLElement;
  private sourceImage: HTMLImageElement | null = null;
  private sourceCanvas: HTMLCanvasElement;
  private sourcePreviewCanvas: HTMLCanvasElement;
  private mirrorCells: MirrorCell[] = [];
  private expandedMirror: MirrorType | null = null;
  private expandedCanvas: HTMLCanvasElement | null = null;
  private expandedParams: MirrorParams | null = null;
  private sliderRaf: number | null = null;
  private pendingStrength: number | null = null;
  private snapshotModal: HTMLDivElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.sourceCanvas = document.createElement('canvas');
    this.sourcePreviewCanvas = document.createElement('canvas');
  }

  init(): void {
    this.injectStyles();
    this.buildLayout();
    this.bindUpload();
  }

  private injectStyles(): void {
    const css = `
      @keyframes mirror-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modal-rise {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes btn-press {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
      .mc-btn-press {
        animation: btn-press 150ms ease;
      }
      .mc-fade-transition {
        animation: mirror-fade-in 0.4s ease;
      }
      .mc-modal-enter {
        animation: modal-rise 300ms ease;
      }
      .mc-main-container {
        width: 900px;
        height: 620px;
        max-width: 100%;
        border-radius: 16px;
        background: rgba(20, 25, 40, 0.7);
        border: 1px solid rgba(180, 200, 255, 0.15);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }
      .mc-left-panel {
        width: 400px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        border-right: 1px solid rgba(180, 200, 255, 0.08);
      }
      .mc-right-panel {
        flex: 1;
        padding: 20px;
        display: flex;
        position: relative;
        overflow: hidden;
      }
      .mc-title {
        font-size: 20px;
        font-weight: 600;
        color: #e0e8ff;
        letter-spacing: 0.5px;
      }
      .mc-subtitle {
        font-size: 12px;
        color: rgba(180, 200, 255, 0.6);
        margin-top: -8px;
      }
      .mc-upload-box {
        flex: 1;
        min-height: 200px;
        border: 2px dashed rgba(0, 212, 255, 0.35);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.25s ease;
        background: rgba(0, 212, 255, 0.03);
        position: relative;
        overflow: hidden;
      }
      .mc-upload-box:hover {
        border-color: #00D4FF;
        background: rgba(0, 212, 255, 0.08);
      }
      .mc-upload-box.dragover {
        border-color: #7FDBFF;
        background: rgba(127, 219, 255, 0.12);
      }
      .mc-upload-text {
        font-size: 14px;
        color: rgba(180, 200, 255, 0.75);
      }
      .mc-preview-wrapper {
        flex: 1;
        min-height: 200px;
        border-radius: 12px;
        overflow: hidden;
        position: relative;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(180, 200, 255, 0.08);
      }
      .mc-preview-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .mc-reupload-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 6px 12px;
        background: rgba(0, 212, 255, 0.15);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 8px;
        color: #00D4FF;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(8px);
      }
      .mc-reupload-btn:hover {
        background: rgba(127, 219, 255, 0.25);
        color: #7FDBFF;
      }
      .mc-grid {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 12px;
        transition: opacity 0.4s ease;
      }
      .mc-grid.hidden {
        opacity: 0;
        pointer-events: none;
        position: absolute;
        inset: 20px;
      }
      .mc-cell {
        position: relative;
        border-radius: 10px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(180, 200, 255, 0.08);
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .mc-cell:hover {
        border-color: rgba(0, 212, 255, 0.5);
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.15);
        transform: translateY(-2px);
      }
      .mc-cell-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .mc-cell-label {
        position: absolute;
        top: 10px;
        left: 10px;
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 6px;
        color: #00D4FF;
        font-size: 12px;
        font-weight: 500;
        backdrop-filter: blur(6px);
      }
      .mc-expanded {
        flex: 1;
        display: none;
        flex-direction: column;
        gap: 16px;
        animation: mirror-fade-in 0.4s ease;
      }
      .mc-expanded.visible {
        display: flex;
      }
      .mc-expanded-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .mc-back-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: rgba(0, 212, 255, 0.1);
        border: 1px solid rgba(0, 212, 255, 0.25);
        border-radius: 8px;
        color: #00D4FF;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .mc-back-btn:hover {
        background: rgba(0, 212, 255, 0.2);
        color: #7FDBFF;
      }
      .mc-expanded-title {
        font-size: 16px;
        font-weight: 600;
        color: #e0e8ff;
      }
      .mc-expanded-canvas-wrap {
        flex: 1;
        position: relative;
        border-radius: 10px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(180, 200, 255, 0.1);
      }
      .mc-expanded-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .mc-snapshot-btn {
        position: absolute;
        bottom: 16px;
        right: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 212, 255, 0.1));
        border: 1px solid rgba(0, 212, 255, 0.5);
        border-radius: 10px;
        color: #00D4FF;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 16px rgba(0, 212, 255, 0.15);
      }
      .mc-snapshot-btn:hover {
        background: linear-gradient(135deg, rgba(127, 219, 255, 0.3), rgba(127, 219, 255, 0.15));
        color: #7FDBFF;
        border-color: #7FDBFF;
        box-shadow: 0 6px 24px rgba(127, 219, 255, 0.25);
      }
      .mc-slider-wrap {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 18px;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 10px;
        border: 1px solid rgba(180, 200, 255, 0.06);
      }
      .mc-slider-label {
        font-size: 13px;
        color: rgba(180, 200, 255, 0.8);
        white-space: nowrap;
        min-width: 70px;
      }
      .mc-slider {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        background: linear-gradient(90deg, rgba(0, 212, 255, 0.6), rgba(0, 212, 255, 0.15));
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      .mc-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #00D4FF;
        border: 2px solid #7FDBFF;
        cursor: pointer;
        transition: transform 0.15s ease;
        box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
      }
      .mc-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .mc-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #00D4FF;
        border: 2px solid #7FDBFF;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
      }
      .mc-slider-value {
        min-width: 44px;
        text-align: right;
        font-size: 13px;
        font-weight: 600;
        color: #00D4FF;
        font-variant-numeric: tabular-nums;
      }
      .mc-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 24px;
      }
      .mc-modal-card {
        max-width: 90vw;
        max-height: 90vh;
        background: linear-gradient(135deg, rgba(26, 26, 46, 0.95), rgba(22, 33, 62, 0.95));
        border: 1px solid rgba(180, 200, 255, 0.15);
        border-radius: 16px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
        animation: modal-rise 300ms ease;
      }
      .mc-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .mc-modal-title {
        font-size: 18px;
        font-weight: 600;
        color: #e0e8ff;
      }
      .mc-modal-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.06);
        border: none;
        border-radius: 8px;
        color: rgba(180, 200, 255, 0.7);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .mc-modal-close:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #7FDBFF;
      }
      .mc-modal-image-wrap {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.3);
        min-width: 300px;
        min-height: 200px;
      }
      .mc-modal-image {
        max-width: 70vw;
        max-height: 60vh;
        object-fit: contain;
        border-radius: 8px;
      }
      .mc-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      .mc-download-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 22px;
        background: linear-gradient(135deg, #00D4FF, #0099cc);
        border: none;
        border-radius: 10px;
        color: #0a1628;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);
      }
      .mc-download-btn:hover {
        background: linear-gradient(135deg, #7FDBFF, #00D4FF);
        box-shadow: 0 6px 24px rgba(127, 219, 255, 0.4);
        transform: translateY(-1px);
      }
      @media (max-width: 768px) {
        .mc-main-container {
          width: 100%;
          height: auto;
          min-height: 100vh;
          flex-direction: column;
          border-radius: 0;
        }
        .mc-left-panel {
          width: 100%;
          padding: 16px;
          border-right: none;
          border-bottom: 1px solid rgba(180, 200, 255, 0.08);
          height: auto;
        }
        .mc-upload-box, .mc-preview-wrapper {
          min-height: 180px;
          height: 200px;
        }
        .mc-right-panel {
          padding: 16px;
          height: auto;
          min-height: 420px;
        }
        .mc-grid {
          gap: 8px;
        }
        .mc-slider {
          height: 8px;
        }
        .mc-slider::-webkit-slider-thumb {
          width: 24px;
          height: 24px;
        }
        .mc-snapshot-btn, .mc-back-btn, .mc-download-btn {
          padding: 14px 20px;
          font-size: 15px;
        }
      }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  private buildLayout(): void {
    this.root.innerHTML = '';
    const main = document.createElement('div');
    main.className = 'mc-main-container';

    const leftPanel = document.createElement('div');
    leftPanel.className = 'mc-left-panel';

    const title = document.createElement('div');
    title.className = 'mc-title';
    title.textContent = '镜像回廊';
    const subtitle = document.createElement('div');
    subtitle.className = 'mc-subtitle';
    subtitle.textContent = 'Mirror Corridor · 扭曲镜面效果生成器';

    const uploadBox = document.createElement('div');
    uploadBox.className = 'mc-upload-box';
    uploadBox.id = 'mc-upload-box';
    uploadBox.innerHTML = `${CLOUD_ICON}<div class="mc-upload-text">拖拽或点击上传图片</div>`;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = 'mc-file-input';
    fileInput.style.display = 'none';

    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'mc-preview-wrapper';
    previewWrapper.id = 'mc-preview-wrapper';
    previewWrapper.style.display = 'none';
    this.sourcePreviewCanvas.className = 'mc-preview-canvas';
    this.sourcePreviewCanvas.id = 'mc-preview-canvas';
    previewWrapper.appendChild(this.sourcePreviewCanvas);
    const reuploadBtn = document.createElement('button');
    reuploadBtn.className = 'mc-reupload-btn';
    reuploadBtn.id = 'mc-reupload-btn';
    reuploadBtn.textContent = '重新上传';
    previewWrapper.appendChild(reuploadBtn);

    leftPanel.appendChild(title);
    leftPanel.appendChild(subtitle);
    leftPanel.appendChild(uploadBox);
    leftPanel.appendChild(previewWrapper);
    leftPanel.appendChild(fileInput);

    const rightPanel = document.createElement('div');
    rightPanel.className = 'mc-right-panel';
    rightPanel.id = 'mc-right-panel';

    const grid = document.createElement('div');
    grid.className = 'mc-grid';
    grid.id = 'mc-grid';

    MIRROR_ORDER.forEach((type) => {
      const cell = this.createMirrorCell(type);
      this.mirrorCells.push(cell);
      grid.appendChild(cell.container);
    });

    const expanded = document.createElement('div');
    expanded.className = 'mc-expanded';
    expanded.id = 'mc-expanded';

    const expandedHeader = document.createElement('div');
    expandedHeader.className = 'mc-expanded-header';
    const backBtn = document.createElement('button');
    backBtn.className = 'mc-back-btn';
    backBtn.id = 'mc-back-btn';
    backBtn.innerHTML = `${BACK_ICON}<span>返回四宫格</span>`;
    const expTitle = document.createElement('div');
    expTitle.className = 'mc-expanded-title';
    expTitle.id = 'mc-expanded-title';
    expTitle.textContent = '';
    expandedHeader.appendChild(backBtn);
    expandedHeader.appendChild(expTitle);

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'mc-expanded-canvas-wrap';
    this.expandedCanvas = document.createElement('canvas');
    this.expandedCanvas.className = 'mc-expanded-canvas';
    canvasWrap.appendChild(this.expandedCanvas);

    const snapBtn = document.createElement('button');
    snapBtn.className = 'mc-snapshot-btn';
    snapBtn.id = 'mc-snapshot-btn';
    snapBtn.innerHTML = `${SNAPSHOT_ICON}<span>截取快照</span>`;
    canvasWrap.appendChild(snapBtn);

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'mc-slider-wrap';
    const sliderLabel = document.createElement('div');
    sliderLabel.className = 'mc-slider-label';
    sliderLabel.textContent = '扭曲强度';
    const slider = document.createElement('input');
    slider.className = 'mc-slider';
    slider.id = 'mc-strength-slider';
    slider.type = 'range';
    slider.min = '0.1';
    slider.max = '2.0';
    slider.step = '0.05';
    slider.value = '1.0';
    const sliderValue = document.createElement('div');
    sliderValue.className = 'mc-slider-value';
    sliderValue.id = 'mc-slider-value';
    sliderValue.textContent = '1.00';
    sliderWrap.appendChild(sliderLabel);
    sliderWrap.appendChild(slider);
    sliderWrap.appendChild(sliderValue);

    expanded.appendChild(expandedHeader);
    expanded.appendChild(canvasWrap);
    expanded.appendChild(sliderWrap);

    rightPanel.appendChild(grid);
    rightPanel.appendChild(expanded);
    main.appendChild(leftPanel);
    main.appendChild(rightPanel);
    this.root.appendChild(main);

    this.bindGridEvents();
    this.bindExpandedEvents();
  }

  private createMirrorCell(type: MirrorType): MirrorCell {
    const container = document.createElement('div');
    container.className = 'mc-cell';
    container.dataset.mirrorType = type;

    const canvas = document.createElement('canvas');
    canvas.className = 'mc-cell-canvas';
    canvas.width = 250;
    canvas.height = 250;

    const label = document.createElement('div');
    label.className = 'mc-cell-label';
    label.textContent = MIRROR_LABELS[type];

    container.appendChild(canvas);
    container.appendChild(label);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(10,15,25,1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return {
      type,
      container,
      canvas,
      label,
      params: getDefaultParams(type),
    };
  }

  private bindUpload(): void {
    const uploadBox = document.getElementById('mc-upload-box') as HTMLDivElement;
    const fileInput = document.getElementById('mc-file-input') as HTMLInputElement;
    const reuploadBtn = document.getElementById('mc-reupload-btn') as HTMLButtonElement;

    uploadBox.addEventListener('click', () => fileInput.click());
    reuploadBtn.addEventListener('click', () => fileInput.click());

    uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadBox.classList.add('dragover');
    });
    uploadBox.addEventListener('dragleave', () => {
      uploadBox.classList.remove('dragover');
    });
    uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadBox.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) this.handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.handleFile(file);
    });
  }

  private handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        this.sourceImage = img;
        this.prepareSourceCanvas();
        this.showPreview();
        this.renderAllMirrors();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  private prepareSourceCanvas(): void {
    if (!this.sourceImage) return;
    const img = this.sourceImage;
    const maxSide = 400;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > h) {
      if (w > maxSide) {
        h = (h * maxSide) / w;
        w = maxSide;
      }
    } else {
      if (h > maxSide) {
        w = (w * maxSide) / h;
        h = maxSide;
      }
    }
    this.sourceCanvas.width = Math.round(w);
    this.sourceCanvas.height = Math.round(h);
    const ctx = this.sourceCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0f1a';
      ctx.fillRect(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
      ctx.drawImage(img, 0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
    }
  }

  private showPreview(): void {
    const uploadBox = document.getElementById('mc-upload-box') as HTMLDivElement;
    const previewWrapper = document.getElementById('mc-preview-wrapper') as HTMLDivElement;
    uploadBox.style.display = 'none';
    previewWrapper.style.display = 'block';

    if (!this.sourceImage) return;
    const { clientWidth, clientHeight } = previewWrapper;
    const canvas = this.sourcePreviewCanvas;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = clientWidth * dpr;
    canvas.height = clientHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a0f1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const img = this.sourceImage;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.min(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  }

  private renderAllMirrors(): void {
    this.mirrorCells.forEach((cell) => {
      const { canvas } = cell;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      renderMirror(cell.type, this.sourceCanvas, canvas, cell.params);
    });
  }

  private bindGridEvents(): void {
    this.mirrorCells.forEach((cell) => {
      cell.container.addEventListener('click', () => {
        cell.container.classList.add('mc-btn-press');
        setTimeout(() => cell.container.classList.remove('mc-btn-press'), 150);
        this.expandMirror(cell.type);
      });
    });
  }

  private bindExpandedEvents(): void {
    const backBtn = document.getElementById('mc-back-btn') as HTMLButtonElement;
    const slider = document.getElementById('mc-strength-slider') as HTMLInputElement;
    const snapBtn = document.getElementById('mc-snapshot-btn') as HTMLButtonElement;

    backBtn.addEventListener('click', () => {
      backBtn.classList.add('mc-btn-press');
      setTimeout(() => backBtn.classList.remove('mc-btn-press'), 150);
      this.collapseMirror();
    });

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.pendingStrength = value;
      const valueEl = document.getElementById('mc-slider-value') as HTMLDivElement;
      if (valueEl) valueEl.textContent = value.toFixed(2);
      if (this.sliderRaf === null) {
        this.sliderRaf = requestAnimationFrame(() => this.applyPendingSlider());
      }
    });

    snapBtn.addEventListener('click', () => {
      snapBtn.classList.add('mc-btn-press');
      setTimeout(() => snapBtn.classList.remove('mc-btn-press'), 150);
      this.takeSnapshot();
    });
  }

  private applyPendingSlider(): void {
    this.sliderRaf = null;
    if (this.pendingStrength === null) return;
    const strength = this.pendingStrength;
    this.pendingStrength = null;
    if (this.expandedMirror && this.expandedCanvas && this.expandedParams) {
      this.expandedParams.strength = strength;
      const cell = this.mirrorCells.find((c) => c.type === this.expandedMirror);
      if (cell) cell.params.strength = strength;
      this.resizeAndRenderExpanded();
    }
  }

  private expandMirror(type: MirrorType): void {
    const grid = document.getElementById('mc-grid') as HTMLDivElement;
    const expanded = document.getElementById('mc-expanded') as HTMLDivElement;
    const title = document.getElementById('mc-expanded-title') as HTMLDivElement;
    const slider = document.getElementById('mc-strength-slider') as HTMLInputElement;
    const valueEl = document.getElementById('mc-slider-value') as HTMLDivElement;
    const cell = this.mirrorCells.find((c) => c.type === type);
    if (!cell) return;

    this.expandedMirror = type;
    this.expandedParams = { ...cell.params };

    title.textContent = MIRROR_LABELS[type];
    slider.value = String(cell.params.strength);
    valueEl.textContent = cell.params.strength.toFixed(2);

    grid.classList.add('hidden');
    expanded.classList.add('visible');

    setTimeout(() => this.resizeAndRenderExpanded(), 50);
  }

  private collapseMirror(): void {
    const grid = document.getElementById('mc-grid') as HTMLDivElement;
    const expanded = document.getElementById('mc-expanded') as HTMLDivElement;
    expanded.classList.remove('visible');
    grid.classList.remove('hidden');
    this.expandedMirror = null;
    this.expandedParams = null;
    setTimeout(() => this.renderAllMirrors(), 50);
  }

  private resizeAndRenderExpanded(): void {
    if (!this.expandedCanvas || !this.expandedMirror || !this.expandedParams) return;
    const wrap = this.expandedCanvas.parentElement;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.expandedCanvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.expandedCanvas.height = Math.max(1, Math.round(rect.height * dpr));
    renderMirror(this.expandedMirror, this.sourceCanvas, this.expandedCanvas, this.expandedParams);
  }

  private takeSnapshot(): void {
    if (!this.expandedCanvas || !this.expandedMirror) return;
    const hiCanvas = document.createElement('canvas');
    const size = 1024;
    hiCanvas.width = size;
    hiCanvas.height = size;
    const cell = this.mirrorCells.find((c) => c.type === this.expandedMirror);
    const params = cell ? cell.params : getDefaultParams(this.expandedMirror);
    renderMirror(this.expandedMirror, this.sourceCanvas, hiCanvas, params);
    const dataUrl = hiCanvas.toDataURL('image/png');
    this.showSnapshotModal(dataUrl, MIRROR_LABELS[this.expandedMirror]);
  }

  private showSnapshotModal(dataUrl: string, mirrorName: string): void {
    if (this.snapshotModal) this.snapshotModal.remove();
    const overlay = document.createElement('div');
    overlay.className = 'mc-modal-overlay';
    const card = document.createElement('div');
    card.className = 'mc-modal-card';

    const header = document.createElement('div');
    header.className = 'mc-modal-header';
    const title = document.createElement('div');
    title.className = 'mc-modal-title';
    title.textContent = `快照 · ${mirrorName}`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mc-modal-close';
    closeBtn.innerHTML = CLOSE_ICON;
    header.appendChild(title);
    header.appendChild(closeBtn);

    const imgWrap = document.createElement('div');
    imgWrap.className = 'mc-modal-image-wrap';
    const img = document.createElement('img');
    img.className = 'mc-modal-image';
    img.src = dataUrl;
    imgWrap.appendChild(img);

    const actions = document.createElement('div');
    actions.className = 'mc-modal-actions';
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'mc-download-btn';
    downloadBtn.innerHTML = `${DOWNLOAD_ICON}<span>保存为 PNG</span>`;
    actions.appendChild(downloadBtn);

    card.appendChild(header);
    card.appendChild(imgWrap);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.snapshotModal = overlay;

    const close = () => {
      overlay.remove();
      this.snapshotModal = null;
    };
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    downloadBtn.addEventListener('click', () => {
      downloadBtn.classList.add('mc-btn-press');
      setTimeout(() => downloadBtn.classList.remove('mc-btn-press'), 150);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mirror_${mirrorName}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
}
