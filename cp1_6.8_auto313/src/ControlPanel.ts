export interface ControlPanelCallbacks {
  onTimeChange: (progress: number) => void;
  onModeToggle: () => void;
  onResetView: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private slider!: HTMLInputElement;
  private timeLabel!: HTMLSpanElement;
  private modeBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;
  private callbacks: ControlPanelCallbacks;
  private _isManual: boolean = false;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.id = 'control-panel';
    this.injectStyles();
    this.buildUI();
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 14px 28px;
        background: rgba(30, 20, 60, 0.55);
        backdrop-filter: blur(18px) saturate(1.4);
        -webkit-backdrop-filter: blur(18px) saturate(1.4);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        z-index: 100;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        color: rgba(255, 255, 255, 0.85);
        user-select: none;
        transition: opacity 0.4s ease;
      }

      #control-panel .panel-section {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #control-panel .time-label {
        font-size: 13px;
        min-width: 48px;
        text-align: center;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.7);
      }

      #control-panel .slider-wrap {
        position: relative;
        width: 200px;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
        overflow: visible;
      }

      #control-panel .slider-track {
        position: absolute;
        top: 0; left: 0;
        height: 100%;
        border-radius: 3px;
        background: linear-gradient(90deg, #4466ff, #ffd700, #ffa040, #4b0082);
        pointer-events: none;
        transition: width 0.15s ease;
      }

      #control-panel input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 200px;
        height: 6px;
        background: transparent;
        margin: 0;
        cursor: pointer;
        position: relative;
        z-index: 2;
      }

      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 8px rgba(255, 215, 0, 0.5), 0 0 2px rgba(0, 0, 0, 0.3);
        border: none;
        cursor: grab;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      #control-panel input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(255, 215, 0, 0.7), 0 0 3px rgba(0, 0, 0, 0.4);
      }

      #control-panel input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        border: none;
        cursor: grab;
      }

      #control-panel .divider {
        width: 1px;
        height: 24px;
        background: rgba(255, 255, 255, 0.12);
      }

      #control-panel .btn {
        padding: 6px 16px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.8);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.3s ease;
        white-space: nowrap;
        letter-spacing: 0.3px;
      }

      #control-panel .btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.25);
        color: #fff;
      }

      #control-panel .btn:active {
        transform: scale(0.96);
      }

      #control-panel .btn.active {
        background: rgba(100, 140, 255, 0.2);
        border-color: rgba(100, 140, 255, 0.4);
        color: #aaccff;
      }
    `;
    document.head.appendChild(style);
  }

  private buildUI(): void {
    const section1 = document.createElement('div');
    section1.className = 'panel-section';

    this.timeLabel = document.createElement('span');
    this.timeLabel.className = 'time-label';
    this.timeLabel.textContent = '12:00';

    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'slider-wrap';

    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'slider-track';
    sliderTrack.id = 'slider-track';

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.max = '1000';
    this.slider.value = '500';
    this.slider.step = '1';

    sliderWrap.appendChild(sliderTrack);
    sliderWrap.appendChild(this.slider);
    section1.appendChild(this.timeLabel);
    section1.appendChild(sliderWrap);

    const divider = document.createElement('div');
    divider.className = 'divider';

    const section2 = document.createElement('div');
    section2.className = 'panel-section';

    this.modeBtn = document.createElement('button');
    this.modeBtn.className = 'btn active';
    this.modeBtn.textContent = '自动';
    this.modeBtn.addEventListener('click', () => {
      this.callbacks.onModeToggle();
    });

    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'btn';
    this.resetBtn.textContent = '重置视角';
    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onResetView();
    });

    section2.appendChild(this.modeBtn);
    section2.appendChild(this.resetBtn);

    const divider2 = document.createElement('div');
    divider2.className = 'divider';

    this.container.appendChild(section1);
    this.container.appendChild(divider);
    this.container.appendChild(section2);

    this.slider.addEventListener('input', () => {
      const progress = parseInt(this.slider.value, 10) / 1000;
      this.updateTrackWidth(progress);
      this.updateTimeLabel(progress);
      this.callbacks.onTimeChange(progress);
    });

    this.updateTrackWidth(0.5);
  }

  private updateTrackWidth(progress: number): void {
    const track = document.getElementById('slider-track');
    if (track) track.style.width = (progress * 100) + '%';
  }

  private updateTimeLabel(progress: number): void {
    const totalMinutes = Math.floor(progress * 1440);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    this.timeLabel.textContent = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }

  updateTimeProgress(progress: number): void {
    if (!this._isManual) {
      const val = Math.round(progress * 1000);
      this.slider.value = String(val);
      this.updateTrackWidth(progress);
    }
    this.updateTimeLabel(progress);
  }

  setModeDisplay(isAuto: boolean): void {
    this._isManual = !isAuto;
    if (isAuto) {
      this.modeBtn.textContent = '自动';
      this.modeBtn.classList.add('active');
      this.slider.disabled = true;
      this.slider.style.opacity = '0.6';
    } else {
      this.modeBtn.textContent = '手动';
      this.modeBtn.classList.remove('active');
      this.slider.disabled = false;
      this.slider.style.opacity = '1';
    }
  }
}
