import { PlanetData, DisplayMode } from '../types';
import { getCachedData } from '../DataLoader';

type TimeSpeedCallback = (speed: number) => void;
type DisplayModeCallback = (mode: DisplayMode) => void;

export class UIPanel {
  private container: HTMLDivElement;
  private controlPanel: HTMLDivElement;
  private infoCard: HTMLDivElement | null = null;
  private timeSpeedSlider: HTMLInputElement;
  private timeSpeedValue: HTMLSpanElement;
  private displayMode: DisplayMode = { orbits: true, labels: false, texture: false };
  private orbitBtn: HTMLButtonElement;
  private labelBtn: HTMLButtonElement;
  private textureBtn: HTMLButtonElement;
  private onTimeSpeedChange: TimeSpeedCallback | null = null;
  private onDisplayModeChange: DisplayModeCallback | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'ui-container';
    document.body.appendChild(this.container);

    this.controlPanel = this.createControlPanel();
    this.timeSpeedSlider = this.createSpeedSlider();
    this.timeSpeedValue = this.createSpeedValue();

    const btnRow = this.createButtonRow();
    this.orbitBtn = this.createToggleButton('轨道线', true, () => {
      this.displayMode.orbits = !this.displayMode.orbits;
      this.updateButtonState(this.orbitBtn, this.displayMode.orbits);
      this.onDisplayModeChange?.(this.displayMode);
    });
    this.labelBtn = this.createToggleButton('标签', false, () => {
      this.displayMode.labels = !this.displayMode.labels;
      this.updateButtonState(this.labelBtn, this.displayMode.labels);
      this.onDisplayModeChange?.(this.displayMode);
    });
    this.textureBtn = this.createToggleButton('纹理', false, () => {
      this.displayMode.texture = !this.displayMode.texture;
      this.updateButtonState(this.textureBtn, this.displayMode.texture);
      this.onDisplayModeChange?.(this.displayMode);
    });

    btnRow.appendChild(this.orbitBtn);
    btnRow.appendChild(this.labelBtn);
    btnRow.appendChild(this.textureBtn);

    const sliderRow = document.createElement('div');
    sliderRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';
    sliderRow.appendChild(this.timeSpeedSlider);
    sliderRow.appendChild(this.timeSpeedValue);

    this.controlPanel.appendChild(sliderRow);
    this.controlPanel.appendChild(btnRow);

    this.container.appendChild(this.controlPanel);

    this.injectStyles();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #ui-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
      }
      #ui-container > * {
        pointer-events: auto;
      }
      .control-panel {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 200px;
        background: rgba(40,40,50,0.85);
        border-radius: 8px;
        padding: 12px;
        font-family: sans-serif;
      }
      .control-panel label {
        display: block;
        color: #e0e0e0;
        font-size: 12px;
        margin-bottom: 6px;
      }
      .speed-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 130px;
        height: 4px;
        border-radius: 2px;
        background: #4a4a5a;
        outline: none;
      }
      .speed-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #7c4dff;
        cursor: pointer;
      }
      .speed-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #7c4dff;
        cursor: pointer;
        border: none;
      }
      .speed-value {
        color: #e0e0e0;
        font-size: 14px;
        min-width: 36px;
        text-align: right;
      }
      .btn-row {
        display: flex;
        gap: 6px;
        justify-content: space-between;
      }
      .toggle-btn {
        width: 56px;
        height: 28px;
        border-radius: 6px;
        border: none;
        color: #ffffff;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
        background: #3a3a4a;
      }
      .toggle-btn.active {
        background: #7c4dff;
      }
      .info-card {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        width: 240px;
        min-height: 200px;
        background: rgba(0,0,0,0.8);
        border-radius: 12px;
        padding: 20px;
        color: #ffffff;
        font-family: sans-serif;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        animation: cardAppear 0.3s ease-out forwards;
        z-index: 200;
      }
      @keyframes cardAppear {
        from {
          transform: translate(-50%, -50%) scale(0.8);
          opacity: 0;
        }
        to {
          transform: translate(-50%, -50%) scale(1.0);
          opacity: 1;
        }
      }
      .info-card h3 {
        margin: 0 0 14px 0;
        font-size: 18px;
        border-bottom: 1px solid rgba(255,255,255,0.2);
        padding-bottom: 8px;
      }
      .info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 13px;
      }
      .info-row .label {
        color: #aaaaaa;
      }
      .info-row .value {
        color: #ffffff;
        font-weight: 500;
      }
      .info-card .close-btn {
        position: absolute;
        top: 8px;
        right: 12px;
        background: none;
        border: none;
        color: #888;
        font-size: 18px;
        cursor: pointer;
        line-height: 1;
      }
      .info-card .close-btn:hover {
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  private createControlPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    const label = document.createElement('label');
    label.textContent = '时间速度';
    panel.appendChild(label);

    return panel;
  }

  private createSpeedSlider(): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'speed-slider';
    slider.min = '0.1';
    slider.max = '10';
    slider.step = '0.1';
    slider.value = '1';
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      this.timeSpeedValue.textContent = val.toFixed(1) + 'x';
      this.onTimeSpeedChange?.(val);
    });
    return slider;
  }

  private createSpeedValue(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'speed-value';
    span.textContent = '1.0x';
    return span;
  }

  private createButtonRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'btn-row';
    return row;
  }

  private createToggleButton(
    text: string,
    active: boolean,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'toggle-btn' + (active ? ' active' : '');
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private updateButtonState(btn: HTMLButtonElement, active: boolean): void {
    if (active) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  setTimeSpeedCallback(cb: TimeSpeedCallback): void {
    this.onTimeSpeedChange = cb;
  }

  setDisplayModeCallback(cb: DisplayModeCallback): void {
    this.onDisplayModeChange = cb;
  }

  showPlanetInfo(planetName: string): void {
    this.hidePlanetInfo();

    const data = getCachedData();
    if (!data) return;

    const planet = data.find(p => p.name === planetName);
    if (!planet) return;

    const card = document.createElement('div');
    card.className = 'info-card';

    card.innerHTML = `
      <button class="close-btn">&times;</button>
      <h3>${planet.name} (${planet.nameEn})</h3>
      <div class="info-row">
        <span class="label">直径</span>
        <span class="value">${planet.diameter.toLocaleString()} km</span>
      </div>
      <div class="info-row">
        <span class="label">距太阳</span>
        <span class="value">${planet.distanceFromSun} AU</span>
      </div>
      <div class="info-row">
        <span class="label">公转周期</span>
        <span class="value">${planet.orbitalPeriod} 年</span>
      </div>
      <div class="info-row">
        <span class="label">卫星数量</span>
        <span class="value">${planet.satelliteCount}</span>
      </div>
    `;

    const closeBtn = card.querySelector('.close-btn')!;
    closeBtn.addEventListener('click', () => {
      this.hidePlanetInfo();
      this.onPlanetSelectCallback?.(null);
    });

    this.infoCard = card;
    this.container.appendChild(card);
  }

  private onPlanetSelectCallback: ((name: string | null) => void) | null = null;

  setPlanetSelectCallback(cb: (name: string | null) => void): void {
    this.onPlanetSelectCallback = cb;
  }

  hidePlanetInfo(): void {
    if (this.infoCard) {
      this.infoCard.remove();
      this.infoCard = null;
    }
  }

  getDisplayMode(): DisplayMode {
    return { ...this.displayMode };
  }
}
