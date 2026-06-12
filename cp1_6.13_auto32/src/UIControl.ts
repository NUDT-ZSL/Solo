export type ParamKey = 'amplitude' | 'frequency' | 'decay';

interface SliderConfig {
  key: ParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'amplitude', label: '全局振幅', min: 0, max: 50, step: 1, default: 20, unit: 'px' },
  { key: 'frequency', label: '频率', min: 0.5, max: 5, step: 0.1, default: 1.5, unit: 'Hz' },
  { key: 'decay', label: '衰减系数', min: 0.9, max: 1, step: 0.01, default: 0.995, unit: '' }
];

export class UIControl {
  public onParamChange?: (key: ParamKey, value: number) => void;

  private container: HTMLElement;
  private panel: HTMLDivElement;
  private valueDisplays: Map<ParamKey, HTMLSpanElement> = new Map();
  private sliderInputs: Map<ParamKey, HTMLInputElement> = new Map();

  constructor(parent: HTMLElement) {
    this.container = parent;
    this.panel = document.createElement('div');
    this.stylePanel();
    this.buildContent();
    this.container.appendChild(this.panel);
  }

  private stylePanel(): void {
    Object.assign(this.panel.style, {
      position: 'absolute',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      width: '220px',
      padding: '20px',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(56, 189, 248, 0.15)',
      color: '#e2e8f0',
      zIndex: '100',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    });
  }

  private buildContent(): void {
    const title = document.createElement('h2');
    title.textContent = 'WaveField 控制台';
    Object.assign(title.style, {
      margin: '0 0 6px 0',
      fontSize: '15px',
      fontWeight: '600',
      color: '#38bdf8',
      letterSpacing: '0.3px'
    });
    this.panel.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = '点击/拖拽水面激起涟漪';
    Object.assign(subtitle.style, {
      margin: '0 0 20px 0',
      fontSize: '11px',
      color: '#94a3b8',
      lineHeight: '1.4'
    });
    this.panel.appendChild(subtitle);

    for (const cfg of SLIDERS) {
      this.createSlider(cfg);
    }

    const hint = document.createElement('div');
    hint.innerHTML =
      '<div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(148,163,184,0.12);font-size:10.5px;color:#64748b;line-height:1.6">' +
      '<div style="margin-bottom:4px">🖱 左键拖拽：旋转视角</div>' +
      '<div style="margin-bottom:4px">🖱 滚轮：缩放 (0.5x~3x)</div>' +
      '<div>💧 点击水面：生成涟漪</div>' +
      '</div>';
    this.panel.appendChild(hint);
  }

  private createSlider(cfg: SliderConfig): void {
    const row = document.createElement('div');
    Object.assign(row.style, { marginBottom: '16px' });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '7px'
    });

    const label = document.createElement('label');
    label.textContent = cfg.label;
    Object.assign(label.style, {
      fontSize: '12px',
      color: '#cbd5e1',
      fontWeight: '500'
    });

    const valueWrap = document.createElement('span');
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = this.formatValue(cfg.default, cfg.step);
    Object.assign(valueDisplay.style, {
      fontSize: '12px',
      fontWeight: '600',
      color: '#38bdf8',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
    });
    const unit = document.createElement('span');
    unit.textContent = cfg.unit;
    Object.assign(unit.style, {
      fontSize: '10.5px',
      color: '#64748b',
      marginLeft: '3px'
    });
    valueWrap.appendChild(valueDisplay);
    if (cfg.unit) valueWrap.appendChild(unit);
    header.appendChild(label);
    header.appendChild(valueWrap);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(cfg.min);
    input.max = String(cfg.max);
    input.step = String(cfg.step);
    input.value = String(cfg.default);
    Object.assign(input.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer'
    });

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valueDisplay.textContent = this.formatValue(v, cfg.step);
      if (this.onParamChange) {
        this.onParamChange(cfg.key, v);
      }
    });

    this.injectSliderStyles();

    row.appendChild(header);
    row.appendChild(input);
    this.panel.appendChild(row);

    this.valueDisplays.set(cfg.key, valueDisplay);
    this.sliderInputs.set(cfg.key, input);
  }

  private formatValue(v: number, step: number): string {
    const decimals = step < 1 ? (step < 0.1 ? 3 : 2) : 0;
    return v.toFixed(decimals);
  }

  private injectSliderStyles(): void {
    const id = 'wavefield-slider-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid #38bdf8;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
        transition: transform 0.1s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid #38bdf8;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
      }
      input[type="range"]::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 2px;
      }
      input[type="range"]::-moz-range-track {
        height: 4px;
        border-radius: 2px;
        background: linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%);
      }
    `;
    document.head.appendChild(style);
  }

  public setValue(key: ParamKey, value: number): void {
    const input = this.sliderInputs.get(key);
    const display = this.valueDisplays.get(key);
    if (!input || !display) return;
    const step = parseFloat(input.step);
    input.value = String(value);
    display.textContent = this.formatValue(value, step);
  }
}
