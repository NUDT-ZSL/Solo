export interface UICallbacks {
  onThicknessChange: (px: number) => void;
  onColorSpeedChange: (multiplier: number) => void;
  onRotationSpeedChange: (radPerSec: number) => void;
}

interface SliderDefinition {
  key: 'thickness' | 'colorSpeed' | 'rotationSpeed';
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  format: (v: number) => string;
  callbackKey: keyof UICallbacks;
}

const SLIDERS: SliderDefinition[] = [
  {
    key: 'thickness',
    label: '线段粗细',
    min: 1,
    max: 8,
    step: 0.1,
    defaultValue: 2.5,
    unit: 'px',
    format: (v) => v.toFixed(1),
    callbackKey: 'onThicknessChange'
  },
  {
    key: 'colorSpeed',
    label: '色彩速率',
    min: 0.5,
    max: 3,
    step: 0.05,
    defaultValue: 1,
    unit: 'x',
    format: (v) => v.toFixed(2),
    callbackKey: 'onColorSpeedChange'
  },
  {
    key: 'rotationSpeed',
    label: '旋转速度',
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: 0.3,
    unit: 'rad/s',
    format: (v) => v.toFixed(2),
    callbackKey: 'onRotationSpeedChange'
  }
];

export class UIController {
  private host: HTMLElement;
  private callbacks: UICallbacks;
  private panel: HTMLDivElement | null = null;
  private sliderEls: Record<string, HTMLInputElement> = {};
  private valueEls: Record<string, HTMLSpanElement> = {};
  private mounted = false;

  constructor(host: HTMLElement, callbacks: UICallbacks) {
    this.host = host;
    this.callbacks = callbacks;
  }

  mount(): void {
    if (this.mounted) return;
    this.mounted = true;

    const panel = document.createElement('div');
    panel.id = 'ui-panel';
    panel.innerHTML = `<div class="panel-title">参数控制 · CONTROL</div>`;

    for (const def of SLIDERS) {
      const group = document.createElement('div');
      group.className = 'slider-group';
      const label = document.createElement('div');
      label.className = 'slider-label';
      const labelText = document.createElement('span');
      labelText.textContent = def.label;
      const valueEl = document.createElement('span');
      valueEl.className = 'slider-value';
      valueEl.dataset.unit = def.unit;
      valueEl.textContent = def.format(def.defaultValue) + ' ' + def.unit;
      label.appendChild(labelText);
      label.appendChild(valueEl);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = String(def.min);
      slider.max = String(def.max);
      slider.step = String(def.step);
      slider.value = String(def.defaultValue);
      slider.dataset.key = def.key;
      slider.setAttribute('aria-label', def.label);

      group.appendChild(label);
      group.appendChild(slider);
      panel.appendChild(group);

      this.sliderEls[def.key] = slider;
      this.valueEls[def.key] = valueEl;

      let raf = 0;
      let pending = false;
      let pendingValue = 0;
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        pendingValue = v;
        if (!raf) {
          pending = true;
          raf = requestAnimationFrame(() => {
            raf = 0;
            if (!pending) return;
            pending = false;
            this.valueEls[def.key].textContent =
              def.format(pendingValue) + ' ' + def.unit;
            const cb = this.callbacks[def.callbackKey];
            cb(pendingValue);
          });
        }
      });
    }

    this.host.appendChild(panel);
    this.panel = panel;
  }

  unmount(): void {
    if (!this.mounted) return;
    this.mounted = false;
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    this.panel = null;
    this.sliderEls = {};
    this.valueEls = {};
  }

  updateThicknessDisplay(value: number): void {
    const def = SLIDERS[0];
    if (this.valueEls.thickness)
      this.valueEls.thickness.textContent = def.format(value) + ' ' + def.unit;
    if (this.sliderEls.thickness) this.sliderEls.thickness.value = String(value);
  }

  updateColorSpeedDisplay(value: number): void {
    const def = SLIDERS[1];
    if (this.valueEls.colorSpeed)
      this.valueEls.colorSpeed.textContent = def.format(value) + ' ' + def.unit;
    if (this.sliderEls.colorSpeed) this.sliderEls.colorSpeed.value = String(value);
  }

  updateRotationSpeedDisplay(value: number): void {
    const def = SLIDERS[2];
    if (this.valueEls.rotationSpeed)
      this.valueEls.rotationSpeed.textContent = def.format(value) + ' ' + def.unit;
    if (this.sliderEls.rotationSpeed)
      this.sliderEls.rotationSpeed.value = String(value);
  }

  getDefaultValues(): { thickness: number; colorSpeed: number; rotationSpeed: number } {
    return {
      thickness: SLIDERS[0].defaultValue,
      colorSpeed: SLIDERS[1].defaultValue,
      rotationSpeed: SLIDERS[2].defaultValue
    };
  }
}
