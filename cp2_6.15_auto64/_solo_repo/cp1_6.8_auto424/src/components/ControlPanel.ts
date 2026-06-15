import { ParticleSystemConfig } from './ParticleSystem';

export type ConfigChangeCallback = (config: Partial<ParticleSystemConfig>) => void;
export type ResetCallback = () => void;

export class ControlPanel {
  private container: HTMLElement;
  private onConfigChange: ConfigChangeCallback;
  private onReset: ResetCallback;
  private config: ParticleSystemConfig;

  constructor(
    parent: HTMLElement,
    config: ParticleSystemConfig,
    onConfigChange: ConfigChangeCallback,
    onReset: ResetCallback
  ) {
    this.config = { ...config };
    this.onConfigChange = onConfigChange;
    this.onReset = onReset;
    this.container = this.createPanel();
    parent.appendChild(this.container);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.innerHTML = '';
    panel.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 280px;
      padding: 24px;
      background: rgba(10, 14, 39, 0.6);
      backdrop-filter: blur(20px) saturate(1.5);
      -webkit-backdrop-filter: blur(20px) saturate(1.5);
      border: 1px solid rgba(74, 158, 255, 0.2);
      border-radius: 16px;
      z-index: 100;
      font-family: 'Orbitron', monospace;
      color: rgba(180, 210, 255, 0.9);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(74, 158, 255, 0.03);
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    `;

    panel.addEventListener('mouseenter', () => {
      panel.style.borderColor = 'rgba(74, 158, 255, 0.4)';
      panel.style.boxShadow = '0 8px 40px rgba(74, 158, 255, 0.15), inset 0 0 60px rgba(74, 158, 255, 0.05)';
    });
    panel.addEventListener('mouseleave', () => {
      panel.style.borderColor = 'rgba(74, 158, 255, 0.2)';
      panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(74, 158, 255, 0.03)';
    });

    const title = document.createElement('h3');
    title.textContent = '星尘控制';
    title.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: rgba(74, 158, 255, 0.9);
      text-shadow: 0 0 20px rgba(74, 158, 255, 0.3);
    `;
    panel.appendChild(title);

    this.createSlider(panel, '粒子数量', 500, 5000, 100, this.config.particleCount, (val) => {
      this.config.particleCount = val;
      this.onConfigChange({ particleCount: val });
    });

    this.createSlider(panel, '星风强度', 0.1, 2.0, 0.1, this.config.starWindStrength, (val) => {
      this.config.starWindStrength = val;
      this.onConfigChange({ starWindStrength: val });
    });

    this.createSlider(panel, '连接距离', 50, 200, 5, this.config.connectionDistance, (val) => {
      this.config.connectionDistance = val;
      this.onConfigChange({ connectionDistance: val });
    });

    const separator = document.createElement('div');
    separator.style.cssText = `
      height: 1px;
      margin: 20px 0;
      background: linear-gradient(90deg, transparent, rgba(74, 158, 255, 0.3), transparent);
    `;
    panel.appendChild(separator);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置星图';
    resetBtn.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      background: rgba(74, 158, 255, 0.1);
      border: 1px solid rgba(74, 158, 255, 0.3);
      border-radius: 8px;
      color: rgba(180, 210, 255, 0.9);
      font-family: 'Orbitron', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
    `;

    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(74, 158, 255, 0.25)';
      resetBtn.style.borderColor = 'rgba(74, 158, 255, 0.6)';
      resetBtn.style.boxShadow = '0 0 20px rgba(74, 158, 255, 0.2)';
      resetBtn.style.transform = 'translateY(-1px)';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(74, 158, 255, 0.1)';
      resetBtn.style.borderColor = 'rgba(74, 158, 255, 0.3)';
      resetBtn.style.boxShadow = 'none';
      resetBtn.style.transform = 'translateY(0)';
    });
    resetBtn.addEventListener('mousedown', () => {
      resetBtn.style.transform = 'translateY(0) scale(0.97)';
    });
    resetBtn.addEventListener('mouseup', () => {
      resetBtn.style.transform = 'translateY(-1px)';
    });
    resetBtn.addEventListener('click', () => {
      this.onReset();
    });

    panel.appendChild(resetBtn);

    return panel;
  }

  private createSlider(
    parent: HTMLElement,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (val: number) => void
  ) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `margin-bottom: 18px;`;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 1.5px;
      opacity: 0.7;
    `;

    const valueEl = document.createElement('span');
    valueEl.textContent = step < 1 ? value.toFixed(1) : String(value);
    valueEl.style.cssText = `
      font-size: 11px;
      font-weight: 700;
      color: rgba(74, 158, 255, 0.9);
      min-width: 36px;
      text-align: right;
    `;

    header.appendChild(labelEl);
    header.appendChild(valueEl);
    wrapper.appendChild(header);

    const sliderTrack = document.createElement('div');
    sliderTrack.style.cssText = `
      position: relative;
      width: 100%;
      height: 4px;
      background: rgba(74, 158, 255, 0.1);
      border-radius: 2px;
      cursor: pointer;
    `;

    const fill = document.createElement('div');
    const pct = ((value - min) / (max - min)) * 100;
    fill.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: ${pct}%;
      background: linear-gradient(90deg, rgba(74, 158, 255, 0.4), rgba(74, 158, 255, 0.8));
      border-radius: 2px;
      pointer-events: none;
      transition: width 0.05s linear;
    `;

    const thumb = document.createElement('div');
    const thumbLeft = pct;
    thumb.style.cssText = `
      position: absolute;
      top: 50%;
      left: ${thumbLeft}%;
      width: 14px;
      height: 14px;
      background: rgba(74, 158, 255, 0.9);
      border: 2px solid rgba(180, 210, 255, 0.8);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      cursor: grab;
      transition: box-shadow 0.2s ease, transform 0.15s ease;
      box-shadow: 0 0 8px rgba(74, 158, 255, 0.4);
    `;

    sliderTrack.appendChild(fill);
    sliderTrack.appendChild(thumb);
    wrapper.appendChild(sliderTrack);
    parent.appendChild(wrapper);

    let isDragging = false;

    const updateSlider = (clientX: number) => {
      const rect = sliderTrack.getBoundingClientRect();
      let ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0, Math.min(1, ratio));
      const newVal = min + ratio * (max - min);
      const stepped = Math.round(newVal / step) * step;
      const clamped = Math.max(min, Math.min(max, stepped));
      const newPct = ((clamped - min) / (max - min)) * 100;

      fill.style.width = `${newPct}%`;
      thumb.style.left = `${newPct}%`;
      valueEl.textContent = step < 1 ? clamped.toFixed(1) : String(Math.round(clamped));
      onChange(clamped);
    };

    thumb.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      thumb.style.cursor = 'grabbing';
      thumb.style.boxShadow = '0 0 16px rgba(74, 158, 255, 0.7)';
      thumb.style.transform = 'translate(-50%, -50%) scale(1.2)';
    });

    sliderTrack.addEventListener('mousedown', (e) => {
      isDragging = true;
      thumb.style.cursor = 'grabbing';
      thumb.style.boxShadow = '0 0 16px rgba(74, 158, 255, 0.7)';
      thumb.style.transform = 'translate(-50%, -50%) scale(1.2)';
      updateSlider(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        updateSlider(e.clientX);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        thumb.style.cursor = 'grab';
        thumb.style.boxShadow = '0 0 8px rgba(74, 158, 255, 0.4)';
        thumb.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    });

    thumb.addEventListener('mouseenter', () => {
      if (!isDragging) {
        thumb.style.boxShadow = '0 0 12px rgba(74, 158, 255, 0.6)';
        thumb.style.transform = 'translate(-50%, -50%) scale(1.1)';
      }
    });

    thumb.addEventListener('mouseleave', () => {
      if (!isDragging) {
        thumb.style.boxShadow = '0 0 8px rgba(74, 158, 255, 0.4)';
        thumb.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    });
  }

  dispose() {
    this.container.remove();
  }
}
