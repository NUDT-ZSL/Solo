import { AppConfig } from '../types';

export class ControlPanel {
  private container: HTMLElement;
  private config: AppConfig;
  private onConfigChange: (config: AppConfig) => void;
  private onReset: () => void;

  constructor(
    parent: HTMLElement,
    config: AppConfig,
    onConfigChange: (config: AppConfig) => void,
    onReset: () => void
  ) {
    this.config = { ...config };
    this.onConfigChange = onConfigChange;
    this.onReset = onReset;

    this.container = document.createElement('div');
    this.container.className = 'control-panel';
    this.container.innerHTML = this.renderHTML();
    parent.appendChild(this.container);

    this.bindEvents();
  }

  private renderHTML(): string {
    return `
      <div class="panel-title">星语织梦</div>
      <div class="panel-group">
        <label class="panel-label">星星大小</label>
        <div class="slider-row">
          <input type="range" class="panel-slider" id="starSize"
            min="0.05" max="0.5" step="0.01" value="${this.config.starSize}">
          <span class="slider-value" id="starSizeValue">${this.config.starSize.toFixed(2)}</span>
        </div>
      </div>
      <div class="panel-group">
        <label class="panel-label">扩散速度</label>
        <div class="slider-row">
          <input type="range" class="panel-slider" id="burstSpeed"
            min="0.5" max="3.0" step="0.1" value="${this.config.burstSpeed}">
          <span class="slider-value" id="burstSpeedValue">${this.config.burstSpeed.toFixed(1)}</span>
        </div>
      </div>
      <button class="panel-reset-btn" id="resetBtn">重置画布</button>
      <div class="panel-hint">左键点击发射星星 · 右键拖拽旋转</div>
    `;
  }

  private bindEvents(): void {
    const starSizeInput = this.container.querySelector('#starSize') as HTMLInputElement;
    const starSizeValue = this.container.querySelector('#starSizeValue') as HTMLElement;
    const burstSpeedInput = this.container.querySelector('#burstSpeed') as HTMLInputElement;
    const burstSpeedValue = this.container.querySelector('#burstSpeedValue') as HTMLElement;
    const resetBtn = this.container.querySelector('#resetBtn') as HTMLButtonElement;

    starSizeInput.addEventListener('input', () => {
      this.config.starSize = parseFloat(starSizeInput.value);
      starSizeValue.textContent = this.config.starSize.toFixed(2);
      this.onConfigChange({ ...this.config });
    });

    burstSpeedInput.addEventListener('input', () => {
      this.config.burstSpeed = parseFloat(burstSpeedInput.value);
      burstSpeedValue.textContent = this.config.burstSpeed.toFixed(1);
      this.onConfigChange({ ...this.config });
    });

    resetBtn.addEventListener('click', () => {
      this.onReset();
    });
  }

  dispose(): void {
    this.container.remove();
  }
}
