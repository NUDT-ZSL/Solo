import { PointCloud, ColorMode, ParticleInfo } from './pointCloud';

export class UIController {
  private pointCloud: PointCloud;
  private panelLeft: HTMLElement;
  private panelRight: HTMLElement;
  private particleInfo: HTMLElement;
  private progressBar: HTMLElement;
  private progressLabel: HTMLElement;
  private autoRotateBtn: HTMLElement;
  private customSliders: HTMLElement;
  private hueMinInput: HTMLInputElement;
  private hueMaxInput: HTMLInputElement;
  private hueMinVal: HTMLElement;
  private hueMaxVal: HTMLElement;
  private toggleLeftBtn: HTMLElement;
  private toggleRightBtn: HTMLElement;
  private modeButtons: HTMLButtonElement[] = [];

  constructor(pointCloud: PointCloud) {
    this.pointCloud = pointCloud;

    this.panelLeft = document.getElementById('panel-left')!;
    this.panelRight = document.getElementById('panel-right')!;
    this.particleInfo = document.getElementById('particle-info')!;
    this.progressBar = document.getElementById('progress-bar')!;
    this.progressLabel = document.getElementById('progress-label')!;
    this.autoRotateBtn = document.getElementById('auto-rotate-btn')!;
    this.customSliders = document.getElementById('custom-sliders')!;
    this.hueMinInput = document.getElementById('hue-min') as HTMLInputElement;
    this.hueMaxInput = document.getElementById('hue-max') as HTMLInputElement;
    this.hueMinVal = document.getElementById('hue-min-val')!;
    this.hueMaxVal = document.getElementById('hue-max-val')!;
    this.toggleLeftBtn = document.getElementById('toggle-left')!;
    this.toggleRightBtn = document.getElementById('toggle-right')!;

    this.insertModeButtons();
    this.bindEvents();
    this.setupResponsivePanels();
    this.updateHueLabels();
    this.pointCloud.setRotationCallback((angle) => this.updateProgress(angle));
  }

  private insertModeButtons(): void {
    const modes: { key: ColorMode; label: string }[] = [
      { key: 'original', label: '原始颜色模式' },
      { key: 'heatmap', label: '热力图模式' },
      { key: 'custom', label: '自定义模式' }
    ];

    const fragment = document.createDocumentFragment();
    modes.forEach((mode) => {
      const btn = document.createElement('button');
      btn.className = 'mode-btn';
      btn.dataset.mode = mode.key;
      btn.textContent = mode.label;
      if (mode.key === 'original') btn.classList.add('active');
      fragment.appendChild(btn);
      this.modeButtons.push(btn);
    });

    const panelRight = document.getElementById('panel-right')!;
    const title = panelRight.querySelector('.panel-title')!;
    title.after(fragment);
  }

  private bindEvents(): void {
    this.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as ColorMode;
        this.setActiveMode(mode);
        this.pointCloud.setColorMode(mode);

        if (mode === 'custom') {
          this.customSliders.style.display = 'block';
        } else {
          this.customSliders.style.display = 'none';
        }
      });
    });

    this.autoRotateBtn.addEventListener('click', () => {
      const isActive = this.autoRotateBtn.classList.toggle('active');
      this.pointCloud.setAutoRotate(isActive);
      this.autoRotateBtn.textContent = isActive ? '停止旋转' : '自动旋转';
    });

    const updateCustomColors = () => {
      const hMin = parseInt(this.hueMinInput.value, 10);
      const hMax = parseInt(this.hueMaxInput.value, 10);
      this.updateHueLabels();
      this.pointCloud.setCustomHues(hMin, hMax);
    };

    this.hueMinInput.addEventListener('input', updateCustomColors);
    this.hueMaxInput.addEventListener('input', updateCustomColors);

    this.toggleLeftBtn.addEventListener('click', () => {
      this.panelLeft.classList.toggle('hidden');
      this.toggleLeftBtn.textContent = this.panelLeft.classList.contains('hidden') ? '▶' : '◀';
    });

    this.toggleRightBtn.addEventListener('click', () => {
      this.panelRight.classList.toggle('hidden');
      this.toggleRightBtn.textContent = this.panelRight.classList.contains('hidden') ? '◀' : '▶';
    });
  }

  private setActiveMode(mode: ColorMode): void {
    this.modeButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  private updateHueLabels(): void {
    this.hueMinVal.textContent = `${this.hueMinInput.value}°`;
    this.hueMaxVal.textContent = `${this.hueMaxInput.value}°`;
  }

  private setupResponsivePanels(): void {
    const checkScreen = () => {
      if (window.innerWidth < 768) {
        this.panelLeft.classList.add('hidden');
        this.panelRight.classList.add('hidden');
        this.toggleLeftBtn.textContent = '▶';
        this.toggleRightBtn.textContent = '◀';
      } else {
        this.panelLeft.classList.remove('hidden');
        this.panelRight.classList.remove('hidden');
      }
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
  }

  public showParticleInfo(info: ParticleInfo): void {
    const r = Math.round(info.color.r * 255);
    const g = Math.round(info.color.g * 255);
    const b = Math.round(info.color.b * 255);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    this.particleInfo.innerHTML = `
      <div class="info-row">
        <span class="info-label">X 坐标</span>
        <span class="info-value">${info.position.x.toFixed(2)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Y 坐标</span>
        <span class="info-value">${info.position.y.toFixed(2)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Z 坐标</span>
        <span class="info-value">${info.position.z.toFixed(2)}</span>
      </div>
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">RGB 颜色</span>
          <span class="info-value" style="display:flex;align-items:center;gap:8px;">
            <span class="color-preview" style="background:${hex};"></span>
            ${r}, ${g}, ${b}
          </span>
        </div>
      </div>
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">邻近平均距离</span>
          <span class="info-value">${info.avgNeighborDistance.toFixed(4)}</span>
        </div>
      </div>
    `;
  }

  private updateProgress(angle: number): void {
    const degrees = (angle * 180) / Math.PI;
    const normalized = ((degrees % 360) + 360) % 360;
    this.progressBar.style.width = `${(normalized / 360) * 100}%`;
    this.progressLabel.textContent = `${Math.round(normalized)}°`;
  }
}
