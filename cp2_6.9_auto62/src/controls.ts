import { AuroraEngine, AuroraConfig } from './aurora';

export class ControlPanel {
  private engine: AuroraEngine;
  private container: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private panel: HTMLDivElement;
  private bandCountSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private hueSlider: HTMLInputElement;
  private bandCountValue: HTMLSpanElement;
  private speedValue: HTMLSpanElement;
  private hueValue: HTMLSpanElement;
  private isExpanded = true;
  private infoBox: HTMLDivElement;
  private infoText: HTMLPreElement;

  constructor(engine: AuroraEngine) {
    this.engine = engine;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 100;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px 20px;
      min-width: 240px;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.textContent = '⚙️';
    this.toggleBtn.style.cssText = `
      display: none;
      position: absolute;
      right: 0;
      bottom: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: white;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    this.toggleBtn.addEventListener('click', () => this.toggle());

    const title = document.createElement('div');
    title.textContent = '极光控制面板';
    title.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 14px;
      text-align: center;
      letter-spacing: 0.5px;
    `;
    this.panel.appendChild(title);

    const config = engine.getConfig();

    this.bandCountSlider = this.createSlider('光带数量', 1, 5, 1, config.bandCount, (v) => `${v}条`);
    this.speedSlider = this.createSlider('光带速度', 0.1, 2.0, 0.1, config.speed, (v) => `${v.toFixed(1)}x`);
    this.hueSlider = this.createSlider('色彩偏移', -60, 60, 1, config.hueOffset, (v) => `${v > 0 ? '+' : ''}${v}°`);

    this.bandCountValue = this.bandCountSlider.parentElement!.querySelector('.val') as HTMLSpanElement;
    this.speedValue = this.speedSlider.parentElement!.querySelector('.val') as HTMLSpanElement;
    this.hueValue = this.hueSlider.parentElement!.querySelector('.val') as HTMLSpanElement;

    this.bandCountSlider.addEventListener('input', () => this.onChange());
    this.speedSlider.addEventListener('input', () => this.onChange());
    this.hueSlider.addEventListener('input', () => this.onChange());

    this.container.appendChild(this.panel);
    this.container.appendChild(this.toggleBtn);

    this.infoBox = document.createElement('div');
    this.infoBox.style.cssText = `
      position: fixed;
      left: 16px;
      top: 16px;
      z-index: 100;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 6px;
      padding: 8px 12px;
      font-family: monospace;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
      text-shadow: 0 0 6px rgba(255, 255, 255, 0.3);
      line-height: 1.6;
      pointer-events: none;
      transition: text-shadow 0.15s ease;
    `;
    this.infoText = document.createElement('pre');
    this.infoText.style.cssText = `
      margin: 0;
      font-family: monospace;
      font-size: 12px;
      white-space: pre;
    `;
    this.infoBox.appendChild(this.infoText);

    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    formatVal: (v: number) => string
  ): HTMLInputElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      margin-bottom: 12px;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      color: rgba(255, 255, 255, 0.75);
      font-size: 12px;
    `;

    const valEl = document.createElement('span');
    valEl.className = 'val';
    valEl.textContent = formatVal(value);
    valEl.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
      font-size: 12px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      transition: all 0.3s ease;
    `;

    header.appendChild(labelEl);
    header.appendChild(valEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.15);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    `;

    const styleId = 'aurora-slider-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00ff7f;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 0 8px rgba(0, 255, 127, 0.5);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 12px rgba(0, 255, 127, 0.8);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #00ff7f;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(0, 255, 127, 0.5);
        }
      `;
      document.head.appendChild(style);
    }

    const formatFn = formatVal;
    slider.addEventListener('input', () => {
      valEl.textContent = formatFn(parseFloat(slider.value));
    });

    wrap.appendChild(header);
    wrap.appendChild(slider);
    this.panel.appendChild(wrap);

    return slider;
  }

  private onChange() {
    const config: Partial<AuroraConfig> = {
      bandCount: parseInt(this.bandCountSlider.value),
      speed: parseFloat(this.speedSlider.value),
      hueOffset: parseInt(this.hueSlider.value),
    };
    this.engine.setConfig(config);
  }

  private checkResponsive() {
    const w = window.innerWidth;
    if (w < 768) {
      if (this.isExpanded) {
        this.panel.style.display = 'none';
        this.toggleBtn.style.display = 'block';
      } else {
        this.panel.style.display = 'block';
        this.toggleBtn.style.display = 'block';
      }
    } else {
      this.panel.style.display = 'block';
      this.toggleBtn.style.display = 'none';
    }
  }

  private toggle() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded) {
      this.panel.style.display = 'block';
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        this.panel.style.opacity = '1';
        this.panel.style.transform = 'translateY(0)';
      });
    } else {
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateY(10px)';
      setTimeout(() => {
        this.panel.style.display = 'none';
      }, 300);
    }
  }

  mount() {
    document.body.appendChild(this.container);
    document.body.appendChild(this.infoBox);
    this.updateInfo();
  }

  updateInfo() {
    const info = this.engine.getMouseInfo();
    const fps = this.engine.getFPS();
    this.infoText.textContent =
      `鼠标坐标: (${info.x}, ${info.y})\n` +
      `移动速度: ${info.speed.toFixed(1)}\n` +
      `光带宽度: ${info.bandWidth}px\n` +
      `条纹速度: ${this.engine.getConfig().speed.toFixed(1)}x\n` +
      `主色调:   ${info.dominantColor}\n` +
      `帧率:     ${fps} FPS`;

    this.infoBox.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.5)';
    setTimeout(() => {
      this.infoBox.style.textShadow = '0 0 6px rgba(255, 255, 255, 0.3)';
    }, 100);
  }
}
