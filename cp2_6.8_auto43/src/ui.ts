import { WindFieldMode } from './windField';

export interface UICallbacks {
  onWindModeChange: (mode: WindFieldMode) => void;
  onParticleLifeChange: (value: number) => void;
  onEmissionRateChange: (value: number) => void;
  onSpeedMultiplierChange: (value: number) => void;
  onGridToggle: (show: boolean) => void;
}

export class UIController {
  private container: HTMLElement;
  private callbacks: UICallbacks;

  private windModeSelect!: HTMLSelectElement;
  private particleLifeSlider!: HTMLInputElement;
  private particleLifeValue!: HTMLSpanElement;
  private emissionRateSlider!: HTMLInputElement;
  private emissionRateValue!: HTMLSpanElement;
  private speedMultiplierSlider!: HTMLInputElement;
  private speedMultiplierValue!: HTMLSpanElement;
  private gridToggleInput!: HTMLInputElement;

  private statsElement!: HTMLElement;
  private fpsValue!: HTMLSpanElement;
  private particleCountValue!: HTMLSpanElement;

  constructor(containerId: string, callbacks: UICallbacks) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.callbacks = callbacks;
    this.buildUI();
    this.bindEvents();
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div class="ui-title">风场可视化控制台</div>
      <div class="ui-subtitle">Wind Field Visualizer</div>

      <div class="ui-section">
        <label class="ui-label">风场模式</label>
        <select class="ui-select" id="windModeSelect">
          <option value="vortex">顺时针漩涡</option>
          <option value="turbulence">随机湍流</option>
          <option value="laminar">水平层流</option>
        </select>
      </div>

      <div class="ui-divider"></div>

      <div class="ui-section">
        <label class="ui-label">
          粒子生命长度
          <span class="ui-value" id="particleLifeValue">5.0s</span>
        </label>
        <input type="range" class="ui-slider" id="particleLifeSlider"
          min="2" max="10" step="0.5" value="5" />
      </div>

      <div class="ui-section">
        <label class="ui-label">
          发射速率
          <span class="ui-value" id="emissionRateValue">30/s</span>
        </label>
        <input type="range" class="ui-slider" id="emissionRateSlider"
          min="10" max="100" step="5" value="30" />
      </div>

      <div class="ui-section">
        <label class="ui-label">
          速度倍率
          <span class="ui-value" id="speedMultiplierValue">1.00x</span>
        </label>
        <input type="range" class="ui-slider" id="speedMultiplierSlider"
          min="0.5" max="2.0" step="0.05" value="1.0" />
      </div>

      <div class="ui-divider"></div>

      <div class="ui-section">
        <label class="ui-toggle">
          <input type="checkbox" class="ui-toggle-input" id="gridToggle" checked />
          <span class="ui-toggle-slider"></span>
          <span class="ui-toggle-label">显示网格辅助线</span>
        </label>
      </div>

      <div class="ui-footer">
        将鼠标悬停在3D区域发射粒子 · 拖拽旋转视角
      </div>
    `;

    const body = document.body;
    const statsDiv = document.createElement('div');
    statsDiv.className = 'ui-stats';
    statsDiv.id = 'statsElement';
    statsDiv.innerHTML = `
      FPS: <span id="fpsValue">60</span> · 
      粒子: <span id="particleCountValue">0</span>
    `;
    body.appendChild(statsDiv);

    this.windModeSelect = document.getElementById('windModeSelect') as HTMLSelectElement;
    this.particleLifeSlider = document.getElementById('particleLifeSlider') as HTMLInputElement;
    this.particleLifeValue = document.getElementById('particleLifeValue') as HTMLSpanElement;
    this.emissionRateSlider = document.getElementById('emissionRateSlider') as HTMLInputElement;
    this.emissionRateValue = document.getElementById('emissionRateValue') as HTMLSpanElement;
    this.speedMultiplierSlider = document.getElementById('speedMultiplierSlider') as HTMLInputElement;
    this.speedMultiplierValue = document.getElementById('speedMultiplierValue') as HTMLSpanElement;
    this.gridToggleInput = document.getElementById('gridToggle') as HTMLInputElement;
    this.statsElement = document.getElementById('statsElement') as HTMLElement;
    this.fpsValue = document.getElementById('fpsValue') as HTMLSpanElement;
    this.particleCountValue = document.getElementById('particleCountValue') as HTMLSpanElement;
  }

  private bindEvents(): void {
    this.windModeSelect.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as WindFieldMode;
      this.callbacks.onWindModeChange(mode);
    });

    this.particleLifeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.particleLifeValue.textContent = value.toFixed(1) + 's';
      this.callbacks.onParticleLifeChange(value);
    });

    this.emissionRateSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.emissionRateValue.textContent = value + '/s';
      this.callbacks.onEmissionRateChange(value);
    });

    this.speedMultiplierSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.speedMultiplierValue.textContent = value.toFixed(2) + 'x';
      this.callbacks.onSpeedMultiplierChange(value);
    });

    this.gridToggleInput.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.callbacks.onGridToggle(checked);
    });
  }

  public updateStats(fps: number, particleCount: number): void {
    this.fpsValue.textContent = Math.round(fps).toString();
    this.particleCountValue.textContent = particleCount.toString();
  }
}
