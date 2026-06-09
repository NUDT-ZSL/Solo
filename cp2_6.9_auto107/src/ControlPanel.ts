import type { GalaxyParams } from './GalaxySystem';

export type ParamChangeHandler = (key: keyof GalaxyParams, value: GalaxyParams[keyof GalaxyParams]) => void;

export class ControlPanel {
  private panel: HTMLElement;
  private handlers: ParamChangeHandler[] = [];
  private isCollapsed = false;

  constructor() {
    const panel = document.getElementById('control-panel');
    if (!panel) throw new Error('Control panel element not found');
    this.panel = panel;

    this.initToggle();
    this.initSliders();
    this.initColorPickers();
  }

  private initToggle(): void {
    const collapseBtn = document.getElementById('collapse-btn');
    const toggleBtn = document.getElementById('panel-toggle');

    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.collapse());
    }
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.expand());
    }
  }

  public collapse(): void {
    this.panel.classList.add('collapsed');
    this.isCollapsed = true;
  }

  public expand(): void {
    this.panel.classList.remove('collapsed');
    this.isCollapsed = false;
  }

  public toggle(): void {
    if (this.isCollapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  private initSliders(): void {
    const sliderConfig: Array<{
      id: string;
      valueId: string;
      key: keyof GalaxyParams;
      format: (v: number) => string;
      parse: (v: string) => number;
    }> = [
      { id: 'slider-arms', valueId: 'value-arms', key: 'arms', format: (v) => String(v), parse: parseFloat },
      { id: 'slider-tightness', valueId: 'value-tightness', key: 'tightness', format: (v) => v.toFixed(2), parse: parseFloat },
      { id: 'slider-count', valueId: 'value-count', key: 'count', format: (v) => String(v), parse: parseFloat },
      { id: 'slider-speed', valueId: 'value-speed', key: 'rotationSpeed', format: (v) => v.toFixed(2), parse: parseFloat },
      { id: 'slider-size', valueId: 'value-size', key: 'particleSize', format: (v) => v.toFixed(2), parse: parseFloat },
      { id: 'slider-offset', valueId: 'value-offset', key: 'offsetAmount', format: (v) => v.toFixed(2), parse: parseFloat },
    ];

    sliderConfig.forEach(({ id, valueId, key, format, parse }) => {
      const slider = document.getElementById(id) as HTMLInputElement | null;
      const valueEl = document.getElementById(valueId);
      if (!slider || !valueEl) return;

      valueEl.textContent = format(parse(slider.value));

      slider.addEventListener('input', () => {
        const val = parse(slider.value);
        valueEl.textContent = format(val);
        this.emit(key, val);
      });
    });
  }

  private initColorPickers(): void {
    const colorConfig: Array<{ id: string; key: keyof GalaxyParams }> = [
      { id: 'color-center-start', key: 'colorCenterStart' },
      { id: 'color-center-end', key: 'colorCenterEnd' },
      { id: 'color-outer-start', key: 'colorOuterStart' },
      { id: 'color-outer-end', key: 'colorOuterEnd' },
    ];

    colorConfig.forEach(({ id, key }) => {
      const picker = document.getElementById(id) as HTMLInputElement | null;
      if (!picker) return;

      picker.addEventListener('input', () => {
        this.emit(key, picker.value);
      });
    });
  }

  private emit(key: keyof GalaxyParams, value: GalaxyParams[keyof GalaxyParams]): void {
    this.handlers.forEach((h) => h(key, value));
  }

  public onChange(handler: ParamChangeHandler): void {
    this.handlers.push(handler);
  }

  public setValues(params: Partial<GalaxyParams>): void {
    const setSlider = (id: string, value: string) => {
      const slider = document.getElementById(id) as HTMLInputElement | null;
      if (slider) slider.value = value;
    };
    const setValue = (id: string, value: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    const setColor = (id: string, value: string) => {
      const picker = document.getElementById(id) as HTMLInputElement | null;
      if (picker) picker.value = value;
    };

    if (params.arms !== undefined) { setSlider('slider-arms', String(params.arms)); setValue('value-arms', String(params.arms)); }
    if (params.tightness !== undefined) { setSlider('slider-tightness', String(params.tightness)); setValue('value-tightness', params.tightness.toFixed(2)); }
    if (params.count !== undefined) { setSlider('slider-count', String(params.count)); setValue('value-count', String(params.count)); }
    if (params.rotationSpeed !== undefined) { setSlider('slider-speed', String(params.rotationSpeed)); setValue('value-speed', params.rotationSpeed.toFixed(2)); }
    if (params.particleSize !== undefined) { setSlider('slider-size', String(params.particleSize)); setValue('value-size', params.particleSize.toFixed(2)); }
    if (params.offsetAmount !== undefined) { setSlider('slider-offset', String(params.offsetAmount)); setValue('value-offset', params.offsetAmount.toFixed(2)); }
    if (params.colorCenterStart !== undefined) setColor('color-center-start', params.colorCenterStart);
    if (params.colorCenterEnd !== undefined) setColor('color-center-end', params.colorCenterEnd);
    if (params.colorOuterStart !== undefined) setColor('color-outer-start', params.colorOuterStart);
    if (params.colorOuterEnd !== undefined) setColor('color-outer-end', params.colorOuterEnd);
  }
}
