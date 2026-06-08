import { Cloth } from './cloth';
import { ClothTexture } from './texture';

let globalSliderStylesInjected = false;

function injectGlobalSliderStyles() {
  if (globalSliderStylesInjected) return;
  globalSliderStylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    input[type="range"].cloth-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      background: #06B6D4;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
      transition: transform 0.15s ease;
    }
    input[type="range"].cloth-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }
    input[type="range"].cloth-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      background: #06B6D4;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
    }
    input[type="range"].cloth-slider::-moz-range-track {
      background: #334155;
      border-radius: 3px;
      height: 6px;
    }
  `;
  document.head.appendChild(style);
}

export class UIControls {
  private container: HTMLDivElement;
  private cloth: Cloth;
  private texture: ClothTexture;

  private windStrengthSlider: HTMLInputElement;
  private windDirectionSlider: HTMLInputElement;
  private gravitySlider: HTMLInputElement;
  private resetButton: HTMLButtonElement;

  private windStrengthValue: HTMLSpanElement;
  private windDirectionValue: HTMLSpanElement;
  private gravityValue: HTMLSpanElement;

  constructor(cloth: Cloth, texture: ClothTexture) {
    this.cloth = cloth;
    this.texture = texture;

    injectGlobalSliderStyles();

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 
        inset 0 1px 0 rgba(255,255,255,0.1),
        0 10px 40px rgba(0,0,0,0.5);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-width: 280px;
      z-index: 1000;
      user-select: none;
    `;

    const title = document.createElement('h2');
    title.textContent = '布料物理控制';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #06B6D4;
      letter-spacing: 0.5px;
    `;
    this.container.appendChild(title);

    this.windStrengthSlider = this.createSlider('风力强度', 0, 20, 5, (val) => {
      this.cloth.setWindStrength(val);
      this.texture.setWindStrength(val);
    });
    this.windStrengthValue = this.windStrengthSlider.querySelector('.value') as HTMLSpanElement;
    this.container.appendChild(this.windStrengthSlider);

    this.windDirectionSlider = this.createSlider('风向角度', 0, 360, 90, (val) => {
      this.cloth.setWindDirection(val);
    });
    this.windDirectionValue = this.windDirectionSlider.querySelector('.value') as HTMLSpanElement;
    this.container.appendChild(this.windDirectionSlider);

    this.gravitySlider = this.createSlider('重力强度', 0, 20, 9.8, (val) => {
      this.cloth.setGravity(val);
    });
    this.gravityValue = this.gravitySlider.querySelector('.value') as HTMLSpanElement;
    this.container.appendChild(this.gravitySlider);

    this.resetButton = document.createElement('button');
    this.resetButton.textContent = '重置布料';
    this.resetButton.style.cssText = `
      width: 100%;
      margin-top: 16px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    `;
    this.resetButton.addEventListener('mouseenter', () => {
      this.resetButton.style.filter = 'brightness(1.2)';
    });
    this.resetButton.addEventListener('mouseleave', () => {
      this.resetButton.style.filter = 'brightness(1)';
    });
    this.resetButton.addEventListener('mousedown', () => {
      this.resetButton.style.transform = 'scale(0.95)';
    });
    this.resetButton.addEventListener('mouseup', () => {
      this.resetButton.style.transform = 'scale(1)';
    });
    this.resetButton.addEventListener('click', () => {
      this.cloth.startReset();
    });
    this.container.appendChild(this.resetButton);

    const hint = document.createElement('p');
    hint.textContent = '提示：拖拽绿色球体可移动';
    hint.style.cssText = `
      margin: 12px 0 0 0;
      font-size: 12px;
      color: rgba(255,255,255,0.5);
      text-align: center;
    `;
    this.container.appendChild(hint);

    document.body.appendChild(this.container);
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    defaultValue: number,
    onChange: (value: number) => void
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 16px;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 13px;
      color: rgba(255,255,255,0.8);
    `;

    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    valueEl.textContent = defaultValue.toFixed(1);
    valueEl.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      color: #06B6D4;
      font-variant-numeric: tabular-nums;
    `;

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    wrapper.appendChild(labelRow);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String((max - min) / 200);
    slider.value = String(defaultValue);
    slider.className = 'cloth-slider';

    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #334155;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueEl.textContent = val.toFixed(1);
      onChange(val);
    });

    wrapper.appendChild(slider);

    return wrapper;
  }

  dispose() {
    this.container.remove();
  }
}

export class FPSCounter {
  private container: HTMLDivElement;
  private fpsText: HTMLSpanElement;
  private frameCount: number = 0;
  private lastTime: number = performance.now();

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(5px);
      padding: 8px 14px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      z-index: 1000;
      user-select: none;
    `;

    const label = document.createElement('span');
    label.textContent = 'FPS: ';
    label.style.cssText = `
      color: rgba(255,255,255,0.7);
      font-size: 14px;
    `;

    this.fpsText = document.createElement('span');
    this.fpsText.textContent = '60';
    this.fpsText.style.cssText = `
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    `;

    this.container.appendChild(label);
    this.container.appendChild(this.fpsText);

    document.body.appendChild(this.container);
  }

  update() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 500) {
      const fps = Math.round((this.frameCount * 1000) / elapsed);
      this.fpsText.textContent = String(fps);

      if (fps >= 45) {
        this.fpsText.style.color = '#10B981';
      } else if (fps >= 30) {
        this.fpsText.style.color = '#F59E0B';
      } else {
        this.fpsText.style.color = '#EF4444';
      }

      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  dispose() {
    this.container.remove();
  }
}
