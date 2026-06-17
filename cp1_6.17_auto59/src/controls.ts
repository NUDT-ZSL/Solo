import { AuroraController, AuroraParams } from './aurora';

export interface GalleryPhoto {
  id: number;
  dataUrl: string;
  timestamp: number;
}

export class UIController {
  private container: HTMLElement;
  private aurora: AuroraController;
  private renderer: THREE.WebGLRenderer;
  private getTime: () => number;
  private gallery: GalleryPhoto[] = [];
  private photoIdCounter = 0;
  private fpsDisplay: HTMLElement;
  private statusDisplay: HTMLElement;
  private galleryContainer: HTMLElement;

  constructor(
    container: HTMLElement,
    aurora: AuroraController,
    renderer: THREE.WebGLRenderer,
    getTime: () => number
  ) {
    this.container = container;
    this.aurora = aurora;
    this.renderer = renderer;
    this.getTime = getTime;

    this.injectStyles();

    const fpsStatus = this.createFPSAndStatusDisplay();
    this.fpsDisplay = fpsStatus.fps;
    this.statusDisplay = fpsStatus.status;

    this.galleryContainer = this.createGalleryPanel();
    this.createControlPanel();
    this.createCaptureButton();
  }

  private injectStyles() {
    const styleId = 'aurora-workshop-styles';
    if (document.getElementById(styleId)) return;

    const css = `
      #aurora-hud {
        position: absolute;
        top: 16px;
        left: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        color: #fff;
        z-index: 10;
        pointer-events: none;
        text-shadow: 0 1px 3px rgba(0,0,0,0.6);
      }
      #aurora-fps {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 6px;
        opacity: 0.9;
      }
      #aurora-status {
        font-size: 12px;
        opacity: 0.8;
        line-height: 1.6;
      }
      #control-panel {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 280px;
        padding: 20px;
        background: rgba(30, 30, 46, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 16px;
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        color: #fff;
        z-index: 10;
        user-select: none;
      }
      #control-panel h2 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 18px;
        color: #fff;
        letter-spacing: 0.5px;
      }
      .control-group {
        margin-bottom: 16px;
      }
      .control-group:last-child {
        margin-bottom: 0;
      }
      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        margin-bottom: 8px;
        color: rgba(255, 255, 255, 0.85);
      }
      .control-value {
        font-weight: 600;
        color: #00FF88;
        font-size: 12px;
      }
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: #2A2E3E;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #00FF88;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.15s ease;
        box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #33FF99;
        transform: scale(1.1);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #00FF88;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.15s ease;
        box-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
      }
      input[type="range"]::-moz-range-thumb:hover {
        background: #33FF99;
        transform: scale(1.1);
      }
      #capture-btn {
        position: absolute;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }
      #capture-btn:hover {
        background: #fff;
      }
      #capture-btn:active {
        transform: scale(0.9);
      }
      #capture-btn svg {
        width: 24px;
        height: 24px;
        fill: none;
        stroke: #1a1a2e;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #gallery-panel {
        position: absolute;
        top: 16px;
        left: 16px;
        width: 280px;
        max-height: calc(100vh - 32px);
        padding: 16px;
        background: rgba(30, 30, 46, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 16px;
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        color: #fff;
        z-index: 10;
        overflow-y: auto;
        margin-top: 80px;
      }
      #gallery-panel h3 {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 14px;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #gallery-panel h3::before {
        content: '';
        width: 8px;
        height: 8px;
        background: #00FF88;
        border-radius: 50%;
      }
      #gallery-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      #gallery-empty {
        grid-column: 1 / -1;
        text-align: center;
        padding: 24px 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
      }
      .gallery-thumb {
        position: relative;
        width: 100%;
        padding-bottom: 66.67%;
        border-radius: 6px;
        border: 0.3px solid #444;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        background: #111;
      }
      .gallery-thumb:hover {
        transform: scale(1.1);
        z-index: 5;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
      }
      .gallery-thumb img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .gallery-thumb .thumb-time {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 4px 6px;
        font-size: 10px;
        color: #fff;
        background: linear-gradient(transparent, rgba(0,0,0,0.8));
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .gallery-thumb:hover .thumb-time {
        opacity: 1;
      }
      @media (max-width: 900px) {
        #control-panel {
          width: 220px;
          padding: 14px;
        }
        #gallery-panel {
          width: 200px;
        }
        #gallery-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 640px) {
        #control-panel {
          width: calc(100% - 32px);
          top: auto;
          bottom: 90px;
          right: 16px;
          left: 16px;
        }
        #gallery-panel {
          width: calc(100% - 32px);
          top: 80px;
          left: 16px;
          right: 16px;
          max-height: 200px;
          margin-top: 0;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  private createFPSAndStatusDisplay() {
    const hud = document.createElement('div');
    hud.id = 'aurora-hud';

    const fps = document.createElement('div');
    fps.id = 'aurora-fps';
    fps.textContent = 'FPS: --';

    const status = document.createElement('div');
    status.id = 'aurora-status';
    status.textContent = '光带数：--，主色：--，速度：--';

    hud.appendChild(fps);
    hud.appendChild(status);
    this.container.appendChild(hud);

    return { fps, status };
  }

  private createGalleryPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'gallery-panel';

    const title = document.createElement('h3');
    title.textContent = '极光画廊';

    const grid = document.createElement('div');
    grid.id = 'gallery-grid';

    const empty = document.createElement('div');
    empty.id = 'gallery-empty';
    empty.textContent = '点击右下角按钮拍摄你的第一张极光照片';
    grid.appendChild(empty);

    panel.appendChild(title);
    panel.appendChild(grid);
    this.container.appendChild(panel);

    return grid;
  }

  private createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'control-panel';

    const title = document.createElement('h2');
    title.textContent = '极光参数';
    panel.appendChild(title);

    const initialParams = this.aurora.getParams();

    this.addSlider(panel, '色相 (H)', 180, 300, initialParams.hue, 1, (val) => {
      this.aurora.setParams({ hue: val }, this.getTime());
    }, (val) => `${val}°`);

    this.addSlider(panel, '饱和度 (S)', 50, 100, initialParams.saturation, 1, (val) => {
      this.aurora.setParams({ saturation: val }, this.getTime());
    }, (val) => `${val}%`);

    this.addSlider(panel, '亮度 (L)', 30, 80, initialParams.lightness, 1, (val) => {
      this.aurora.setParams({ lightness: val }, this.getTime());
    }, (val) => `${val}%`);

    this.addSlider(panel, '运动速度', 0.5, 3, initialParams.speed, 0.1, (val) => {
      this.aurora.setParams({ speed: val }, this.getTime());
    }, (val) => `${val.toFixed(1)}x`);

    this.addSlider(panel, '光带数量', 5, 20, initialParams.bandCount, 1, (val) => {
      this.aurora.setParams({ bandCount: val }, this.getTime());
    }, (val) => `${Math.round(val)}条`);

    this.addSlider(panel, '透明度', 0.2, 1, initialParams.opacity, 0.05, (val) => {
      this.aurora.setParams({ opacity: val }, this.getTime());
    }, (val) => `${Math.round(val * 100)}%`);

    this.container.appendChild(panel);
  }

  private addSlider(
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    initial: number,
    step: number,
    onChange: (val: number) => void,
    format: (val: number) => string
  ) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';
    const labelText = document.createElement('span');
    labelText.textContent = label;
    const valueText = document.createElement('span');
    valueText.className = 'control-value';
    valueText.textContent = format(initial);
    labelRow.appendChild(labelText);
    labelRow.appendChild(valueText);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(initial);

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueText.textContent = format(val);
      onChange(val);
    });

    group.appendChild(labelRow);
    group.appendChild(input);
    parent.appendChild(group);
  }

  private createCaptureButton() {
    const btn = document.createElement('button');
    btn.id = 'capture-btn';
    btn.title = '拍摄照片';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
    `;
    btn.addEventListener('click', () => this.capturePhoto());
    this.container.appendChild(btn);
  }

  private capturePhoto() {
    const btn = document.getElementById('capture-btn');
    if (btn) {
      btn.style.transform = 'scale(0.85)';
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
      }, 200);
    }

    const startTime = performance.now();
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    void startTime;

    const photo: GalleryPhoto = {
      id: ++this.photoIdCounter,
      dataUrl,
      timestamp: Date.now()
    };
    this.gallery.unshift(photo);
    this.renderGallery();
  }

  private renderGallery() {
    const emptyEl = this.galleryContainer.querySelector('#gallery-empty');
    if (emptyEl && this.gallery.length > 0) {
      emptyEl.remove();
    }

    this.galleryContainer.querySelectorAll('.gallery-thumb').forEach(el => el.remove());

    for (const photo of this.gallery) {
      const thumb = document.createElement('div');
      thumb.className = 'gallery-thumb';

      const img = document.createElement('img');
      img.src = photo.dataUrl;
      img.alt = `极光照片 ${photo.id}`;

      const timeLabel = document.createElement('div');
      timeLabel.className = 'thumb-time';
      const date = new Date(photo.timestamp);
      timeLabel.textContent = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;

      thumb.appendChild(img);
      thumb.appendChild(timeLabel);
      this.galleryContainer.appendChild(thumb);
    }
  }

  public updateFPS(fps: number) {
    this.fpsDisplay.textContent = `FPS: ${fps.toFixed(0)}`;
  }

  public updateStatus() {
    const s = this.aurora.getStatus();
    this.statusDisplay.textContent = `光带数：${s.bandCount}，主色：${s.mainColor}，速度：${s.speed}x`;
  }
}
