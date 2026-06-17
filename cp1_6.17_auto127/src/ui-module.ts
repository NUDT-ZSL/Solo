import { LightState, TimeOfDay } from './lighting-module';

const TIME_COLOR_TEMPS: Record<TimeOfDay, number> = {
  morning: 3500,
  noon: 5500,
  dusk: 3000
};

export class UIModule {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private timeButtons: HTMLButtonElement[] = [];
  private colorTempSlider: HTMLInputElement;
  private intensitySlider: HTMLInputElement;
  private colorTempValue: HTMLSpanElement;
  private intensityValue: HTMLSpanElement;
  private currentTime: TimeOfDay = 'noon';

  constructor() {
    this.container = document.getElementById('app')!;
    this.panel = document.createElement('div');
    this.panel.className = 'ui-panel';

    this.colorTempSlider = document.createElement('input');
    this.intensitySlider = document.createElement('input');
    this.colorTempValue = document.createElement('span');
    this.intensityValue = document.createElement('span');

    this.createStyles();
    this.createPanel();
    this.bindEvents();
  }

  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .ui-panel {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #2D2D2D;
        border-radius: 12px;
        padding: 20px;
        max-width: 600px;
        width: 90%;
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .time-buttons {
        display: flex;
        justify-content: center;
        gap: 10px;
      }

      .time-btn {
        width: 80px;
        height: 36px;
        border: none;
        border-radius: 6px;
        background-color: #444;
        color: white;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease-out;
        font-family: inherit;
      }

      .time-btn:hover {
        transform: scale(1.05);
        background-color: #555;
      }

      .time-btn.active {
        background-color: #4A90D9;
        color: white;
      }

      .sliders-container {
        display: flex;
        justify-content: center;
        gap: 30px;
        flex-wrap: wrap;
      }

      .slider-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .slider-label {
        color: #aaa;
        font-size: 13px;
        min-width: 50px;
      }

      .slider-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 200px;
        height: 6px;
        background: #555;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #F5A623;
        border-radius: 50%;
        cursor: grab;
        transition: transform 0.1s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }

      input[type="range"]::-webkit-slider-thumb:active {
        cursor: grabbing;
        transform: scale(1.2);
      }

      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #F5A623;
        border-radius: 50%;
        cursor: grab;
        border: none;
        transition: transform 0.1s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }

      input[type="range"]::-moz-range-thumb:active {
        cursor: grabbing;
        transform: scale(1.2);
      }

      .slider-value {
        color: #F5A623;
        font-size: 14px;
        font-weight: 500;
        min-width: 60px;
        text-align: left;
        transition: transform 0.1s ease;
      }

      .slider-value.zoomed {
        transform: scale(1.1);
      }

      @media (max-width: 768px) {
        .ui-panel {
          width: 90%;
          padding: 15px;
        }

        .time-btn {
          width: 70px;
          height: 32px;
          font-size: 12px;
        }

        input[type="range"] {
          width: 140px;
        }

        .sliders-container {
          gap: 20px;
        }

        .slider-group {
          gap: 8px;
        }

        .slider-label {
          font-size: 12px;
          min-width: 40px;
        }

        .slider-value {
          font-size: 12px;
          min-width: 50px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): void {
    const timeButtonsContainer = document.createElement('div');
    timeButtonsContainer.className = 'time-buttons';

    const times: { key: TimeOfDay; label: string }[] = [
      { key: 'morning', label: '上午' },
      { key: 'noon', label: '正午' },
      { key: 'dusk', label: '黄昏' }
    ];

    times.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.className = 'time-btn';
      btn.textContent = label;
      btn.dataset.time = key;
      if (key === 'noon') {
        btn.classList.add('active');
      }
      timeButtonsContainer.appendChild(btn);
      this.timeButtons.push(btn);
    });

    const slidersContainer = document.createElement('div');
    slidersContainer.className = 'sliders-container';

    const colorTempGroup = document.createElement('div');
    colorTempGroup.className = 'slider-group';
    const colorTempLabel = document.createElement('span');
    colorTempLabel.className = 'slider-label';
    colorTempLabel.textContent = '色温';
    const colorTempWrapper = document.createElement('div');
    colorTempWrapper.className = 'slider-wrapper';
    this.colorTempSlider.type = 'range';
    this.colorTempSlider.min = '2700';
    this.colorTempSlider.max = '6500';
    this.colorTempSlider.step = '100';
    this.colorTempSlider.value = '5500';
    this.colorTempValue.className = 'slider-value';
    this.colorTempValue.textContent = '5500K';
    colorTempWrapper.appendChild(this.colorTempSlider);
    colorTempGroup.appendChild(colorTempLabel);
    colorTempGroup.appendChild(colorTempWrapper);
    colorTempGroup.appendChild(this.colorTempValue);

    const intensityGroup = document.createElement('div');
    intensityGroup.className = 'slider-group';
    const intensityLabel = document.createElement('span');
    intensityLabel.className = 'slider-label';
    intensityLabel.textContent = '强度';
    const intensityWrapper = document.createElement('div');
    intensityWrapper.className = 'slider-wrapper';
    this.intensitySlider.type = 'range';
    this.intensitySlider.min = '0.5';
    this.intensitySlider.max = '2.0';
    this.intensitySlider.step = '0.1';
    this.intensitySlider.value = '1.0';
    this.intensityValue.className = 'slider-value';
    this.intensityValue.textContent = '1.0';
    intensityWrapper.appendChild(this.intensitySlider);
    intensityGroup.appendChild(intensityLabel);
    intensityGroup.appendChild(intensityWrapper);
    intensityGroup.appendChild(this.intensityValue);

    slidersContainer.appendChild(colorTempGroup);
    slidersContainer.appendChild(intensityGroup);

    this.panel.appendChild(timeButtonsContainer);
    this.panel.appendChild(slidersContainer);
    this.container.appendChild(this.panel);
  }

  private bindEvents(): void {
    this.timeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const time = btn.dataset.time as TimeOfDay;
        const temp = TIME_COLOR_TEMPS[time];
        this.setActiveTime(time);
        this.dispatchTimeChange(time);
        this.dispatchColorTempChange(temp);
      });
    });

    this.colorTempSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.colorTempValue.textContent = `${value}K`;
      this.addZoomEffect(this.colorTempValue);
      this.dispatchColorTempChange(value);
    });

    this.intensitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.intensityValue.textContent = value.toFixed(1);
      this.addZoomEffect(this.intensityValue);
      this.dispatchIntensityChange(value);
    });

    this.colorTempSlider.addEventListener('mousedown', () => {
      this.colorTempValue.classList.add('zoomed');
    });
    this.colorTempSlider.addEventListener('mouseup', () => {
      this.colorTempValue.classList.remove('zoomed');
    });
    this.colorTempSlider.addEventListener('mouseleave', () => {
      this.colorTempValue.classList.remove('zoomed');
    });

    this.intensitySlider.addEventListener('mousedown', () => {
      this.intensityValue.classList.add('zoomed');
    });
    this.intensitySlider.addEventListener('mouseup', () => {
      this.intensityValue.classList.remove('zoomed');
    });
    this.intensitySlider.addEventListener('mouseleave', () => {
      this.intensityValue.classList.remove('zoomed');
    });
  }

  private addZoomEffect(element: HTMLElement): void {
    element.style.transform = 'scale(1.1)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 100);
  }

  private setActiveTime(time: TimeOfDay): void {
    this.currentTime = time;
    this.timeButtons.forEach(btn => {
      if (btn.dataset.time === time) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    const temp = TIME_COLOR_TEMPS[time];
    this.colorTempSlider.value = String(temp);
    this.colorTempValue.textContent = `${temp}K`;
  }

  private dispatchTimeChange(time: TimeOfDay): void {
    const event = new CustomEvent('uiTimeChanged', { detail: { time } });
    document.dispatchEvent(event);
  }

  private dispatchColorTempChange(temp: number): void {
    const event = new CustomEvent('uiColorTempChanged', { detail: { temp } });
    document.dispatchEvent(event);
  }

  private dispatchIntensityChange(intensity: number): void {
    const event = new CustomEvent('uiIntensityChanged', { detail: { intensity } });
    document.dispatchEvent(event);
  }

  getState(): { time: TimeOfDay; colorTemp: number; intensity: number } {
    return {
      time: this.currentTime,
      colorTemp: parseInt(this.colorTempSlider.value),
      intensity: parseFloat(this.intensitySlider.value)
    };
  }
}
