import { eventBus } from '@/core/EventBus';
import { BuildingConfig, TimeConfig } from '@/types';

export class ConfigPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private isCollapsed: boolean = false;

  private densityValue: number = 0.5;
  private minHeightValue: number = 50;
  private maxHeightValue: number = 200;
  private randomnessValue: number = 0.3;
  private timeValue: number = 12;
  private autoRotateValue: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.panel = this.createPanel();
    this.container.appendChild(this.panel);
    this.applyInitialValues();
    this.setupResponsive();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'config-panel';
    panel.innerHTML = `
      <style>
        #config-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          padding: 20px;
          background: #1a1a2eaa;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 12px;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          z-index: 1000;
          transition: width 0.15s ease, padding 0.15s ease, top 0.15s ease, right 0.15s ease, bottom 0.15s ease;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          overflow: hidden;
        }

        #config-panel.collapsed {
          padding-bottom: 20px;
        }

        #config-panel.collapsed .panel-body {
          max-height: 0;
          opacity: 0;
          padding-top: 0;
          padding-bottom: 0;
          margin-top: 0;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .panel-title {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0.5px;
        }

        .collapse-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: rgba(255,255,255,0.1);
          color: #ffffff;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: transform 0.2s ease, background 0.15s ease;
          line-height: 1;
        }

        .collapse-btn:hover {
          transform: scale(1.2);
          background: rgba(255,255,255,0.2);
        }

        .panel-body {
          max-height: 600px;
          opacity: 1;
          overflow: hidden;
          transition: max-height 0.15s ease, opacity 0.15s ease, padding 0.15s ease;
          padding-top: 8px;
        }

        .control-group {
          margin-bottom: 16px;
        }

        .control-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 13px;
          color: rgba(255,255,255,0.85);
        }

        .control-value {
          color: #4a9eff;
          font-weight: 500;
          font-size: 12px;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        input[type="range"]::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, #4a9eff, #ff6b6b);
        }

        input[type="range"]::-moz-range-track {
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(to right, #4a9eff, #ff6b6b);
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4a9eff;
          cursor: pointer;
          margin-top: -5px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: border-color 0.15s ease, transform 0.15s ease;
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #4a9eff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: border-color 0.15s ease, transform 0.15s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          border-color: #ff6b6b;
        }

        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.15);
          border-color: #ff6b6b;
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .toggle-label {
          font-size: 13px;
          color: rgba(255,255,255,0.85);
        }

        .toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          cursor: pointer;
        }

        .toggle-switch input {
          display: none;
        }

        .toggle-slider {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255,255,255,0.15);
          border-radius: 12px;
          transition: background 0.15s ease;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          left: 3px;
          top: 3px;
          background: #ffffff;
          border-radius: 50%;
          transition: transform 0.15s ease;
        }

        .toggle-switch input:checked + .toggle-slider {
          background: #4a9eff;
        }

        .toggle-switch input:checked + .toggle-slider::before {
          transform: translateX(20px);
        }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 16px 0;
        }

        .export-btn {
          width: 100%;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #4a9eff, #6b5bff);
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
          letter-spacing: 0.3px;
        }

        .export-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(74,158,255,0.4);
        }

        .export-btn:active {
          transform: translateY(0);
          opacity: 0.9;
        }

        @media (max-width: 768px) {
          #config-panel {
            width: 180px;
            top: auto;
            right: auto;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 14px;
            font-size: 12px;
          }

          .panel-title {
            font-size: 13px;
          }

          .control-label {
            font-size: 11px;
          }

          .control-value {
            font-size: 10px;
          }

          .export-btn {
            font-size: 12px;
            padding: 8px 12px;
          }
        }
      </style>

      <div class="panel-header">
        <span class="panel-title">SkylineSculpt</span>
        <button class="collapse-btn" id="collapse-btn">−</button>
      </div>

      <div class="panel-body">
        <div class="control-group">
          <div class="control-label">
            <span>建筑密度</span>
            <span class="control-value" id="density-val">0.50</span>
          </div>
          <input type="range" id="density-slider" min="0.1" max="1.0" step="0.05" value="0.5" />
        </div>

        <div class="control-group">
          <div class="control-label">
            <span>最小高度 (m)</span>
            <span class="control-value" id="min-height-val">50</span>
          </div>
          <input type="range" id="min-height-slider" min="20" max="300" step="5" value="50" />
        </div>

        <div class="control-group">
          <div class="control-label">
            <span>最大高度 (m)</span>
            <span class="control-value" id="max-height-val">200</span>
          </div>
          <input type="range" id="max-height-slider" min="20" max="300" step="5" value="200" />
        </div>

        <div class="control-group">
          <div class="control-label">
            <span>形态随机因子</span>
            <span class="control-value" id="randomness-val">0.30</span>
          </div>
          <input type="range" id="randomness-slider" min="0" max="1" step="0.05" value="0.3" />
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <div class="control-label">
            <span>时间 (小时)</span>
            <span class="control-value" id="time-val">12:00</span>
          </div>
          <input type="range" id="time-slider" min="0" max="24" step="0.5" value="12" />
        </div>

        <div class="toggle-row">
          <span class="toggle-label">自动旋转</span>
          <label class="toggle-switch">
            <input type="checkbox" id="auto-rotate-toggle" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="divider"></div>

        <button class="export-btn" id="export-btn">导出天际线轮廓</button>
      </div>
    `;

    this.bindEvents(panel);
    return panel;
  }

  private bindEvents(panel: HTMLElement): void {
    const densitySlider = panel.querySelector('#density-slider') as HTMLInputElement;
    const minHeightSlider = panel.querySelector('#min-height-slider') as HTMLInputElement;
    const maxHeightSlider = panel.querySelector('#max-height-slider') as HTMLInputElement;
    const randomnessSlider = panel.querySelector('#randomness-slider') as HTMLInputElement;
    const timeSlider = panel.querySelector('#time-slider') as HTMLInputElement;
    const autoRotateToggle = panel.querySelector('#auto-rotate-toggle') as HTMLInputElement;
    const exportBtn = panel.querySelector('#export-btn') as HTMLButtonElement;
    const collapseBtn = panel.querySelector('#collapse-btn') as HTMLButtonElement;

    densitySlider.addEventListener('input', () => {
      this.densityValue = parseFloat(densitySlider.value);
      (panel.querySelector('#density-val') as HTMLElement).textContent = this.densityValue.toFixed(2);
      this.emitBuildingConfig();
    });

    minHeightSlider.addEventListener('input', () => {
      this.minHeightValue = parseInt(minHeightSlider.value);
      if (this.minHeightValue > this.maxHeightValue) {
        this.maxHeightValue = this.minHeightValue;
        maxHeightSlider.value = String(this.maxHeightValue);
        (panel.querySelector('#max-height-val') as HTMLElement).textContent = String(this.maxHeightValue);
      }
      (panel.querySelector('#min-height-val') as HTMLElement).textContent = String(this.minHeightValue);
      this.emitBuildingConfig();
    });

    maxHeightSlider.addEventListener('input', () => {
      this.maxHeightValue = parseInt(maxHeightSlider.value);
      if (this.maxHeightValue < this.minHeightValue) {
        this.minHeightValue = this.maxHeightValue;
        minHeightSlider.value = String(this.minHeightValue);
        (panel.querySelector('#min-height-val') as HTMLElement).textContent = String(this.minHeightValue);
      }
      (panel.querySelector('#max-height-val') as HTMLElement).textContent = String(this.maxHeightValue);
      this.emitBuildingConfig();
    });

    randomnessSlider.addEventListener('input', () => {
      this.randomnessValue = parseFloat(randomnessSlider.value);
      (panel.querySelector('#randomness-val') as HTMLElement).textContent = this.randomnessValue.toFixed(2);
      this.emitBuildingConfig();
    });

    timeSlider.addEventListener('input', () => {
      this.timeValue = parseFloat(timeSlider.value);
      const hours = Math.floor(this.timeValue);
      const mins = Math.round((this.timeValue - hours) * 60);
      (panel.querySelector('#time-val') as HTMLElement).textContent =
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      eventBus.emit('config:time', {
        hour: this.timeValue,
        autoRotate: this.autoRotateValue
      });
    });

    autoRotateToggle.addEventListener('change', () => {
      this.autoRotateValue = autoRotateToggle.checked;
      eventBus.emit('config:autoRotate', this.autoRotateValue);
    });

    exportBtn.addEventListener('click', () => {
      eventBus.emit('action:export', undefined as any);
    });

    collapseBtn.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      if (this.isCollapsed) {
        panel.classList.add('collapsed');
        collapseBtn.textContent = '+';
      } else {
        panel.classList.remove('collapsed');
        collapseBtn.textContent = '−';
      }
    });
  }

  private emitBuildingConfig(): void {
    const config: BuildingConfig = {
      density: this.densityValue,
      minHeight: this.minHeightValue,
      maxHeight: this.maxHeightValue,
      randomness: this.randomnessValue
    };
    eventBus.emit('config:building', config);
  }

  private applyInitialValues(): void {
    this.emitBuildingConfig();
    eventBus.emit('config:time', {
      hour: this.timeValue,
      autoRotate: this.autoRotateValue
    });
  }

  private setupResponsive(): void {
    const checkWidth = () => {
      if (window.innerWidth < 768) {
        this.panel.style.width = '180px';
      } else {
        this.panel.style.width = '320px';
      }
    };
    window.addEventListener('resize', checkWidth);
    checkWidth();
  }
}
