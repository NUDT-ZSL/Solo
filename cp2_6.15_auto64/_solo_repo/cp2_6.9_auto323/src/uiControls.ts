import { ColorMode } from './particleSystem';

export interface UIControlParams {
  gravityStrength: number;
  particleSize: number;
  colorMode: ColorMode;
  singleColor: string;
}

type Listener = (params: Partial<UIControlParams>) => void;

export class UIControls {
  private container: HTMLDivElement;
  private listeners: Listener[] = [];
  private params: UIControlParams = {
    gravityStrength: 1,
    particleSize: 4,
    colorMode: 'rainbow',
    singleColor: '#FF6B35'
  };

  private particleCountSpan!: HTMLSpanElement;
  private gravitySlider!: HTMLInputElement;
  private gravityValue!: HTMLSpanElement;
  private sizeSlider!: HTMLInputElement;
  private sizeValue!: HTMLSpanElement;
  private colorModeSelect!: HTMLSelectElement;
  private clearBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;

  constructor() {
    this.container = document.createElement('div');
    this.buildPanel();
    this.bindEvents();
    document.getElementById('app')?.appendChild(this.container);
  }

  private buildPanel(): void {
    this.container.id = 'ui-panel';
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      right: 30px;
      transform: translateY(-50%);
      width: 220px;
      padding: 20px;
      background: rgba(15, 20, 25, 0.65);
      border: 1px solid rgba(100, 150, 255, 0.2);
      border-radius: 16px;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      color: #A8C8FF;
      font-size: 13px;
      z-index: 20;
      user-select: none;
    `;

    this.container.innerHTML = `
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 4px; color: #D8E8FF; letter-spacing: 1px;">星尘回声</h3>
        <p style="font-size: 11px; color: rgba(168, 200, 255, 0.5);">Stardust Echo</p>
      </div>

      <div style="margin-bottom: 14px;">
        <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span>粒子总数</span>
          <span id="particle-count-value" style="color: #5A9BFF; font-weight: 600;">0</span>
        </label>
      </div>

      <div style="margin-bottom: 14px;">
        <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span>引力强度</span>
          <span id="gravity-value" style="color: #5A9BFF; font-weight: 600;">1.00</span>
        </label>
        <input type="range" id="gravity-slider" min="-5" max="5" step="0.1" value="1"
          style="width: 100%; accent-color: #3A7BFF; cursor: pointer; transition: all 0.2s ease;">
      </div>

      <div style="margin-bottom: 14px;">
        <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span>粒子大小</span>
          <span id="size-value" style="color: #5A9BFF; font-weight: 600;">4</span>
        </label>
        <input type="range" id="size-slider" min="2" max="12" step="1" value="4"
          style="width: 100%; accent-color: #3A7BFF; cursor: pointer; transition: all 0.2s ease;">
      </div>

      <div style="margin-bottom: 18px;">
        <label style="display: block; margin-bottom: 6px;">颜色模式</label>
        <select id="color-mode-select"
          style="width: 100%; padding: 6px 10px; background: rgba(58, 123, 255, 0.1);
                 border: 1px solid rgba(100, 150, 255, 0.25); border-radius: 8px;
                 color: #A8C8FF; font-size: 12px; cursor: pointer;
                 transition: all 0.2s ease; outline: none;">
          <option value="single" style="background: #0F1419;">单色 #FF6B35</option>
          <option value="rainbow" selected style="background: #0F1419;">随机彩虹</option>
          <option value="velocity" style="background: #0F1419;">按速度映射</option>
        </select>
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="clear-btn"
          style="width: 100%; padding: 9px; background: rgba(58, 123, 255, 0.15);
                 border: 1px solid rgba(58, 123, 255, 0.3); border-radius: 8px;
                 color: #A8C8FF; font-size: 12px; font-weight: 500;
                 cursor: pointer; transition: all 0.2s ease;">
          清空引力源
        </button>
        <button id="reset-btn"
          style="width: 100%; padding: 9px; background: rgba(58, 123, 255, 0.15);
                 border: 1px solid rgba(58, 123, 255, 0.3); border-radius: 8px;
                 color: #A8C8FF; font-size: 12px; font-weight: 500;
                 cursor: pointer; transition: all 0.2s ease;">
          重置粒子系统
        </button>
      </div>

      <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(100, 150, 255, 0.1); font-size: 11px; color: rgba(168, 200, 255, 0.5); line-height: 1.6;">
        <p>左键：创建引力源</p>
        <p>右键拖拽：产生斥力场</p>
      </div>
    `;

    this.particleCountSpan = this.container.querySelector('#particle-count-value') as HTMLSpanElement;
    this.gravitySlider = this.container.querySelector('#gravity-slider') as HTMLInputElement;
    this.gravityValue = this.container.querySelector('#gravity-value') as HTMLSpanElement;
    this.sizeSlider = this.container.querySelector('#size-slider') as HTMLInputElement;
    this.sizeValue = this.container.querySelector('#size-value') as HTMLSpanElement;
    this.colorModeSelect = this.container.querySelector('#color-mode-select') as HTMLSelectElement;
    this.clearBtn = this.container.querySelector('#clear-btn') as HTMLButtonElement;
    this.resetBtn = this.container.querySelector('#reset-btn') as HTMLButtonElement;
  }

  private bindEvents(): void {
    this.gravitySlider.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      this.params.gravityStrength = v;
      this.gravityValue.textContent = v.toFixed(2);
      this.emit({ gravityStrength: v });
    });

    this.sizeSlider.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value);
      this.params.particleSize = v;
      this.sizeValue.textContent = v.toString();
      this.emit({ particleSize: v });
    });

    this.colorModeSelect.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as ColorMode;
      this.params.colorMode = mode;
      this.emit({ colorMode: mode });
    });

    this.clearBtn.addEventListener('click', () => {
      this.emit({ __clearGravity: true } as any);
    });

    this.resetBtn.addEventListener('click', () => {
      this.emit({ __resetParticles: true } as any);
    });

    this.addButtonHover(this.clearBtn);
    this.addButtonHover(this.resetBtn);
  }

  private addButtonHover(btn: HTMLButtonElement): void {
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(90, 155, 255, 0.25)';
      btn.style.borderColor = 'rgba(90, 155, 255, 0.5)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(58, 123, 255, 0.15)';
      btn.style.borderColor = 'rgba(58, 123, 255, 0.3)';
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });
  }

  public setParticleCount(n: number): void {
    this.particleCountSpan.textContent = n.toString();
  }

  public subscribe(listener: Listener): void {
    this.listeners.push(listener);
  }

  private emit(params: Partial<UIControlParams>): void {
    for (const l of this.listeners) {
      l(params);
    }
  }

  public getParams(): UIControlParams {
    return { ...this.params };
  }
}
