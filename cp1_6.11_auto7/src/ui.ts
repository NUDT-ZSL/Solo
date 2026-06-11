/**
 * 参数面板UI模块
 * 
 * 职责：使用原生DOM创建滑块和按钮等参数控制面板，监听用户输入并同步到主线程
 * 
 * 数据流向：
 *   捕获用户输入事件 → 解析参数值 → 更新UI显示（数值、滑块颜色）
 *   → 调用回调函数传递参数到 main.ts
 * 
 * 调用关系：
 *   - 被 main.ts 的 CloudLoomApp 构造函数实例化
 *   - 通过 onParamChange 回调传递参数变化给 main.ts
 *   - 通过 onShapeChange 回调传递形状切换给 main.ts
 *   - 通过 onReset 回调传递重置事件给 main.ts
 *   - 接收 main.ts 传来的初始参数，双向同步
 */

import type { PatternParams } from './pattern';

export type ShapeType = 'cylinder' | 'sphere' | 'torusKnot';

export interface UIPanelParams {
  curl: number;
  density: number;
  hueOffset: number;
  flowSpeed: number;
  shape: ShapeType;
}

export type ParamChangeHandler = (params: Partial<PatternParams>) => void;
export type ShapeChangeHandler = (shape: ShapeType) => void;
export type ResetHandler = () => void;

export const DEFAULT_PARAMS: UIPanelParams = {
  curl: 50,
  density: 30,
  hueOffset: 0,
  flowSpeed: 0.05,
  shape: 'cylinder'
};

const COLOR_START = { r: 108, g: 99, b: 255 };
const COLOR_END = { r: 255, g: 101, b: 132 };

export class UIPanel {
  private params: UIPanelParams;
  private onParamChange: ParamChangeHandler;
  private onShapeChange: ShapeChangeHandler;
  private onReset: ResetHandler;

  private sliders: {
    curl: HTMLInputElement;
    density: HTMLInputElement;
    hueOffset: HTMLInputElement;
    flowSpeed: HTMLInputElement;
  };

  private valueDisplays: {
    curl: HTMLElement;
    density: HTMLElement;
    hueOffset: HTMLElement;
    flowSpeed: HTMLElement;
  };

  private shapeButtons: NodeListOf<HTMLButtonElement>;
  private resetBtn: HTMLButtonElement;

  private mobileSliders: {
    curl: HTMLInputElement;
    density: HTMLInputElement;
    hueOffset: HTMLInputElement;
    flowSpeed: HTMLInputElement;
  };

  private mobileValueDisplays: {
    curl: HTMLElement;
    density: HTMLElement;
    hueOffset: HTMLElement;
    flowSpeed: HTMLElement;
  };

  private mobileShapeButtons: NodeListOf<HTMLButtonElement>;
  private mobileResetBtn: HTMLButtonElement;
  private menuBtn: HTMLButtonElement;
  private mobilePanel: HTMLElement;
  private isMobileOpen: boolean = false;

  constructor(
    onParamChange: ParamChangeHandler,
    onShapeChange: ShapeChangeHandler,
    onReset: ResetHandler
  ) {
    this.params = { ...DEFAULT_PARAMS };
    this.onParamChange = onParamChange;
    this.onShapeChange = onShapeChange;
    this.onReset = onReset;

    this.sliders = {
      curl: document.getElementById('curl-slider') as HTMLInputElement,
      density: document.getElementById('density-slider') as HTMLInputElement,
      hueOffset: document.getElementById('hue-slider') as HTMLInputElement,
      flowSpeed: document.getElementById('speed-slider') as HTMLInputElement
    };

    this.valueDisplays = {
      curl: document.getElementById('curl-value') as HTMLElement,
      density: document.getElementById('density-value') as HTMLElement,
      hueOffset: document.getElementById('hue-value') as HTMLElement,
      flowSpeed: document.getElementById('speed-value') as HTMLElement
    };

    this.shapeButtons = document.querySelectorAll('#ui-container .btn[data-shape]');
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    this.mobileSliders = {
      curl: document.getElementById('m-curl-slider') as HTMLInputElement,
      density: document.getElementById('m-density-slider') as HTMLInputElement,
      hueOffset: document.getElementById('m-hue-slider') as HTMLInputElement,
      flowSpeed: document.getElementById('m-speed-slider') as HTMLInputElement
    };

    this.mobileValueDisplays = {
      curl: document.getElementById('m-curl-value') as HTMLElement,
      density: document.getElementById('m-density-value') as HTMLElement,
      hueOffset: document.getElementById('m-hue-value') as HTMLElement,
      flowSpeed: document.getElementById('m-speed-value') as HTMLElement
    };

    this.mobileShapeButtons = document.querySelectorAll('.mobile-panel .btn[data-shape]');
    this.mobileResetBtn = document.getElementById('m-reset-btn') as HTMLButtonElement;
    this.menuBtn = document.getElementById('menu-btn') as HTMLButtonElement;
    this.mobilePanel = document.getElementById('mobile-panel') as HTMLElement;

    this.bindEvents();
    this.updateAllSliderThumbColors();
  }

  private bindEvents(): void {
    this.sliders.curl.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleParamUpdate('curl', value, value.toString(), '');
    });

    this.sliders.density.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleParamUpdate('density', value, value.toString(), '');
    });

    this.sliders.hueOffset.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleParamUpdate('hueOffset', value, `${value}`, '°');
    });

    this.sliders.flowSpeed.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleParamUpdate('flowSpeed', value, value.toFixed(3), '');
    });

    this.shapeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const shape = btn.dataset.shape as ShapeType;
        this.setShape(shape);
        this.onShapeChange(shape);
      });
    });

    this.resetBtn.addEventListener('click', () => {
      this.reset();
    });

    this.mobileSliders.curl.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleParamUpdate('curl', value, value.toString(), '', true);
    });

    this.mobileSliders.density.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleParamUpdate('density', value, value.toString(), '', true);
    });

    this.mobileSliders.hueOffset.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleParamUpdate('hueOffset', value, `${value}`, '°', true);
    });

    this.mobileSliders.flowSpeed.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleParamUpdate('flowSpeed', value, value.toFixed(3), '', true);
    });

    this.mobileShapeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const shape = btn.dataset.shape as ShapeType;
        this.setShape(shape);
        this.onShapeChange(shape);
      });
    });

    this.mobileResetBtn.addEventListener('click', () => {
      this.reset();
    });

    this.menuBtn.addEventListener('click', () => {
      this.toggleMobilePanel();
    });
  }

  private handleParamUpdate(
    param: keyof typeof this.sliders,
    value: number,
    displayValue: string,
    suffix: string,
    fromMobile: boolean = false
  ): void {
    (this.params[param] as number) = value;

    if (fromMobile) {
      this.sliders[param].value = value.toString();
      this.valueDisplays[param].textContent = displayValue + suffix;
      this.mobileValueDisplays[param].textContent = displayValue + suffix;
    } else {
      this.mobileSliders[param].value = value.toString();
      this.valueDisplays[param].textContent = displayValue + suffix;
      this.mobileValueDisplays[param].textContent = displayValue + suffix;
    }

    this.updateSliderThumbColor(param);
    this.onParamChange({ [param]: value } as Partial<PatternParams>);
  }

  private updateAllSliderThumbColors(): void {
    this.updateSliderThumbColor('curl');
    this.updateSliderThumbColor('density');
    this.updateSliderThumbColor('hueOffset');
    this.updateSliderThumbColor('flowSpeed');
  }

  private updateSliderThumbColor(param: keyof typeof this.sliders): void {
    const ranges: Record<string, { min: number; max: number }> = {
      curl: { min: 0, max: 100 },
      density: { min: 10, max: 50 },
      hueOffset: { min: 0, max: 360 },
      flowSpeed: { min: 0, max: 0.2 }
    };

    const value = this.params[param] as number;
    const { min, max } = ranges[param];
    const t = (value - min) / (max - min);

    const color = this.interpolateColor(COLOR_START, COLOR_END, t);
    const colorHex = `rgb(${color.r}, ${color.g}, ${color.b})`;

    this.setSliderThumbColor(this.sliders[param], colorHex);
    this.setSliderThumbColor(this.mobileSliders[param], colorHex);
  }

  private setSliderThumbColor(slider: HTMLInputElement, color: string): void {
    slider.style.setProperty('--thumb-color', color);

    try {
      slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${(slider.value as any) / ((slider as any).max || 100) * 100}%, #2D2D44 ${(slider.value as any) / ((slider as any).max || 100) * 100}%, #4A4A6E 100%)`;
    } catch (e) {
      // Ignore if it fails
    }

    const styleId = `slider-style-${slider.id}`;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const webkitRule = `#${slider.id}::-webkit-slider-thumb { background-color: ${color} !important; }`;
    styleEl.textContent = webkitRule;
  }

  private interpolateColor(
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } {
    const clampedT = Math.max(0, Math.min(1, t));
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * clampedT),
      g: Math.round(c1.g + (c2.g - c1.g) * clampedT),
      b: Math.round(c1.b + (c2.b - c1.b) * clampedT)
    };
  }

  private setShape(shape: ShapeType): void {
    this.params.shape = shape;

    this.shapeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === shape);
    });

    this.mobileShapeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shape === shape);
    });
  }

  private toggleMobilePanel(): void {
    this.isMobileOpen = !this.isMobileOpen;
    this.mobilePanel.classList.toggle('open', this.isMobileOpen);
  }

  private reset(): void {
    this.params = { ...DEFAULT_PARAMS };

    this.sliders.curl.value = this.params.curl.toString();
    this.sliders.density.value = this.params.density.toString();
    this.sliders.hueOffset.value = this.params.hueOffset.toString();
    this.sliders.flowSpeed.value = this.params.flowSpeed.toString();

    this.valueDisplays.curl.textContent = this.params.curl.toString();
    this.valueDisplays.density.textContent = this.params.density.toString();
    this.valueDisplays.hueOffset.textContent = `${this.params.hueOffset}°`;
    this.valueDisplays.flowSpeed.textContent = this.params.flowSpeed.toFixed(3);

    this.mobileSliders.curl.value = this.params.curl.toString();
    this.mobileSliders.density.value = this.params.density.toString();
    this.mobileSliders.hueOffset.value = this.params.hueOffset.toString();
    this.mobileSliders.flowSpeed.value = this.params.flowSpeed.toString();

    this.mobileValueDisplays.curl.textContent = this.params.curl.toString();
    this.mobileValueDisplays.density.textContent = this.params.density.toString();
    this.mobileValueDisplays.hueOffset.textContent = `${this.params.hueOffset}°`;
    this.mobileValueDisplays.flowSpeed.textContent = this.params.flowSpeed.toFixed(3);

    this.setShape(this.params.shape);
    this.updateAllSliderThumbColors();

    this.onParamChange({
      curl: this.params.curl,
      density: this.params.density,
      hueOffset: this.params.hueOffset,
      flowSpeed: this.params.flowSpeed
    });

    this.onShapeChange(this.params.shape);

    this.onReset();
  }

  getParams(): UIPanelParams {
    return { ...this.params };
  }
}
