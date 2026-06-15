const EASING_DURATION = 300;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

class AnimatedValue {
  private current: number;
  private target: number;
  private startValue: number;
  private startTime: number;
  private animating: boolean = false;

  constructor(initial: number) {
    this.current = initial;
    this.target = initial;
    this.startValue = initial;
    this.startTime = 0;
  }

  set(value: number): void {
    if (Math.abs(this.target - value) < 0.001) return;
    this.startValue = this.current;
    this.target = value;
    this.startTime = performance.now();
    this.animating = true;
  }

  get(): number {
    if (!this.animating) return this.current;
    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / EASING_DURATION, 1.0);
    const easedProgress = easeOutCubic(progress);
    this.current = this.startValue + (this.target - this.startValue) * easedProgress;
    if (progress >= 1.0) {
      this.current = this.target;
      this.animating = false;
    }
    return this.current;
  }
}

export class UIPanel {
  public onTidalSpeedChange: ((v: number) => void) | null = null;
  public onBrightnessChange: ((v: number) => void) | null = null;
  public onParticleSpeedChange: ((v: number) => void) | null = null;
  public onGlowToggle: ((v: boolean) => void) | null = null;

  private tidalSpeedValue: AnimatedValue;
  private brightnessValue: AnimatedValue;
  private particleSpeedValue: AnimatedValue;
  private glowOpacityValue: AnimatedValue;

  private tidalSpeedSlider: HTMLInputElement;
  private brightnessSlider: HTMLInputElement;
  private particleSpeedSlider: HTMLInputElement;
  private glowCheckbox: HTMLInputElement;

  private panelElement: HTMLElement;

  constructor(container: HTMLElement) {
    this.tidalSpeedValue = new AnimatedValue(1.0);
    this.brightnessValue = new AnimatedValue(1.0);
    this.particleSpeedValue = new AnimatedValue(1.0);
    this.glowOpacityValue = new AnimatedValue(1.0);

    const panel = document.createElement('div');
    panel.id = 'control-panel';

    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 260px;
        padding: 20px;
        background: rgba(10, 15, 40, 0.65);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(100, 140, 255, 0.2);
        border-radius: 16px;
        color: #c0d0ff;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        font-size: 13px;
        z-index: 100;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      }

      #control-panel .panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #8899dd;
        margin-bottom: 16px;
        letter-spacing: 1px;
        text-transform: uppercase;
        text-align: center;
      }

      #control-panel .control-group {
        margin-bottom: 14px;
      }

      #control-panel .control-group:last-child {
        margin-bottom: 0;
      }

      #control-panel label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 12px;
        color: #8899cc;
      }

      #control-panel label .value-display {
        color: #aabbee;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      #control-panel input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(60, 80, 140, 0.4);
        outline: none;
        cursor: pointer;
        transition: background 0.3s ease;
      }

      #control-panel input[type="range"]:hover {
        background: rgba(60, 80, 140, 0.6);
      }

      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #6688cc;
        border: 2px solid rgba(100, 140, 255, 0.5);
        cursor: pointer;
        transition: background 0.2s ease, transform 0.2s ease;
      }

      #control-panel input[type="range"]::-webkit-slider-thumb:hover {
        background: #7799dd;
        transform: scale(1.2);
      }

      #control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #6688cc;
        border: 2px solid rgba(100, 140, 255, 0.5);
        cursor: pointer;
      }

      #control-panel .checkbox-group {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-top: 4px;
      }

      #control-panel .custom-checkbox {
        position: relative;
        width: 36px;
        height: 20px;
        flex-shrink: 0;
      }

      #control-panel .custom-checkbox input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      #control-panel .custom-checkbox .slider-track {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(40, 50, 80, 0.6);
        border-radius: 10px;
        transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      #control-panel .custom-checkbox .slider-track::before {
        content: '';
        position: absolute;
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background: #5566aa;
        border-radius: 50%;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
      }

      #control-panel .custom-checkbox input:checked + .slider-track {
        background: rgba(60, 100, 200, 0.5);
      }

      #control-panel .custom-checkbox input:checked + .slider-track::before {
        transform: translateX(16px);
        background: #7799ff;
      }

      #control-panel .checkbox-label {
        font-size: 12px;
        color: #8899cc;
        cursor: pointer;
      }

      @media (max-width: 640px) {
        #control-panel {
          right: 0;
          bottom: 0;
          left: 0;
          width: 100%;
          border-radius: 16px 16px 0 0;
          padding: 16px 20px;
          max-height: 40vh;
          overflow-y: auto;
        }
      }
    `;
    document.head.appendChild(style);

    panel.innerHTML = `
      <div class="panel-title">潮汐光网控制</div>

      <div class="control-group">
        <label>
          潮汐速度
          <span class="value-display" id="tidal-speed-value">1.0x</span>
        </label>
        <input type="range" id="tidal-speed" min="0.5" max="2" step="0.1" value="1" />
      </div>

      <div class="control-group">
        <label>
          光丝亮度
          <span class="value-display" id="brightness-value">1.0</span>
        </label>
        <input type="range" id="brightness" min="0.5" max="1.5" step="0.05" value="1" />
      </div>

      <div class="control-group">
        <label>
          粒子流速
          <span class="value-display" id="particle-speed-value">1.0x</span>
        </label>
        <input type="range" id="particle-speed" min="0.5" max="2" step="0.1" value="1" />
      </div>

      <div class="control-group">
        <div class="checkbox-group">
          <div class="custom-checkbox">
            <input type="checkbox" id="glow-toggle" checked />
            <span class="slider-track"></span>
          </div>
          <span class="checkbox-label" id="glow-label">显示光晕叠加</span>
        </div>
      </div>
    `;

    container.appendChild(panel);
    this.panelElement = panel;

    this.tidalSpeedSlider = document.getElementById('tidal-speed') as HTMLInputElement;
    this.brightnessSlider = document.getElementById('brightness') as HTMLInputElement;
    this.particleSpeedSlider = document.getElementById('particle-speed') as HTMLInputElement;
    this.glowCheckbox = document.getElementById('glow-toggle') as HTMLInputElement;

    this.tidalSpeedSlider.addEventListener('input', () => {
      const v = parseFloat(this.tidalSpeedSlider.value);
      this.tidalSpeedValue.set(v);
      document.getElementById('tidal-speed-value')!.textContent = v.toFixed(1) + 'x';
    });

    this.brightnessSlider.addEventListener('input', () => {
      const v = parseFloat(this.brightnessSlider.value);
      this.brightnessValue.set(v);
      document.getElementById('brightness-value')!.textContent = v.toFixed(2);
    });

    this.particleSpeedSlider.addEventListener('input', () => {
      const v = parseFloat(this.particleSpeedSlider.value);
      this.particleSpeedValue.set(v);
      document.getElementById('particle-speed-value')!.textContent = v.toFixed(1) + 'x';
    });

    this.glowCheckbox.addEventListener('change', () => {
      const checked = this.glowCheckbox.checked;
      this.glowOpacityValue.set(checked ? 1 : 0);
      this.onGlowToggle?.(checked);
    });

    this.animateValues = this.animateValues.bind(this);
    requestAnimationFrame(this.animateValues);
  }

  private animateValues(): void {
    const tidalSpeed = this.tidalSpeedValue.get();
    const brightness = this.brightnessValue.get();
    const particleSpeed = this.particleSpeedValue.get();

    this.onTidalSpeedChange?.(tidalSpeed);
    this.onBrightnessChange?.(brightness);
    this.onParticleSpeedChange?.(particleSpeed);

    requestAnimationFrame(this.animateValues);
  }
}
