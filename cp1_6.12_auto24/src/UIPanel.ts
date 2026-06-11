export interface UIPanelCallbacks {
  onDateChange: (dayOfYear: number) => void;
  onTimeChange: (hour: number) => void;
  onRotationChange: (x: number, y: number, z: number) => void;
  onResetCamera: () => void;
  onExportImage: () => void;
}

export class UIPanel {
  private container: HTMLDivElement;
  private dateSlider: HTMLInputElement;
  private timeSlider: HTMLInputElement;
  private rotXSlider: HTMLInputElement;
  private rotYSlider: HTMLInputElement;
  private rotZSlider: HTMLInputElement;
  private dateValueDisplay: HTMLDivElement;
  private timeValueDisplay: HTMLDivElement;
  private rotXValue: HTMLSpanElement;
  private rotYValue: HTMLSpanElement;
  private rotZValue: HTMLSpanElement;
  private coverageDisplay: HTMLDivElement;
  private coverageProgress: HTMLDivElement;
  private coverageValue: HTMLSpanElement;
  private callbacks: UIPanelCallbacks;

  private monthNames: string[] = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  constructor(callbacks: UIPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = this.createContainer();
    this.dateSlider = this.createSlider();
    this.timeSlider = this.createSlider();
    this.rotXSlider = this.createSlider();
    this.rotYSlider = this.createSlider();
    this.rotZSlider = this.createSlider();
    this.dateValueDisplay = document.createElement('div');
    this.timeValueDisplay = document.createElement('div');
    this.rotXValue = document.createElement('span');
    this.rotYValue = document.createElement('span');
    this.rotZValue = document.createElement('span');
    this.coverageDisplay = document.createElement('div');
    this.coverageProgress = document.createElement('div');
    this.coverageValue = document.createElement('span');

    this.buildUI();
    this.attachEventListeners();
    this.applyStyles();

    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'ui-panel';
    return container;
  }

  private createSlider(): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    return slider;
  }

  private buildUI(): void {
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '日照与阴影分析';

    const sunSection = this.createSection('日照参数', '☀️');
    
    this.dateValueDisplay.className = 'datetime-display';
    this.timeValueDisplay.className = 'datetime-display';

    this.dateSlider.min = '1';
    this.dateSlider.max = '365';
    this.dateSlider.step = '1';
    this.dateSlider.value = '172';
    this.dateSlider.className = 'main-slider';

    this.timeSlider.min = '6';
    this.timeSlider.max = '18';
    this.timeSlider.step = '0.25';
    this.timeSlider.value = '12';
    this.timeSlider.className = 'main-slider';

    const dateLabel = document.createElement('div');
    dateLabel.className = 'slider-label';
    dateLabel.innerHTML = '<span>📅 日期</span>';

    const timeLabel = document.createElement('div');
    timeLabel.className = 'slider-label';
    timeLabel.innerHTML = '<span>🕐 时刻</span>';

    sunSection.appendChild(this.dateValueDisplay);
    sunSection.appendChild(dateLabel);
    sunSection.appendChild(this.dateSlider);
    sunSection.appendChild(this.timeValueDisplay);
    sunSection.appendChild(timeLabel);
    sunSection.appendChild(this.timeSlider);

    const rotSection = this.createSection('建筑旋转', '🔄');
    rotSection.className += ' rotation-section';

    const rotXContainer = this.createRotationSlider(
      this.rotXSlider, this.rotXValue, 'X轴', -45, 45, 1
    );
    const rotYContainer = this.createRotationSlider(
      this.rotYSlider, this.rotYValue, 'Y轴', -45, 45, 1
    );
    const rotZContainer = this.createRotationSlider(
      this.rotZSlider, this.rotZValue, 'Z轴', -45, 45, 1
    );

    rotSection.appendChild(rotXContainer);
    rotSection.appendChild(rotYContainer);
    rotSection.appendChild(rotZContainer);

    const coverageSection = this.createSection('阴影分析', '📊');
    
    const coverageLabel = document.createElement('div');
    coverageLabel.className = 'coverage-label';
    coverageLabel.textContent = '当前阴影覆盖率';

    this.coverageDisplay.className = 'coverage-display';
    
    this.coverageValue.className = 'coverage-value';
    this.coverageValue.textContent = '0%';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    this.coverageProgress.className = 'progress-fill';
    this.coverageProgress.style.width = '0%';

    progressBar.appendChild(this.coverageProgress);

    this.coverageDisplay.appendChild(this.coverageValue);
    this.coverageDisplay.appendChild(progressBar);

    coverageSection.appendChild(coverageLabel);
    coverageSection.appendChild(this.coverageDisplay);

    const buttonSection = document.createElement('div');
    buttonSection.className = 'button-section';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'action-btn';
    resetBtn.innerHTML = '<span>🎯</span> 复位视角';
    resetBtn.onclick = () => this.callbacks.onResetCamera();

    const exportBtn = document.createElement('button');
    exportBtn.className = 'action-btn primary';
    exportBtn.innerHTML = '<span>📷</span> 导出PNG';
    exportBtn.onclick = () => this.callbacks.onExportImage();

    buttonSection.appendChild(resetBtn);
    buttonSection.appendChild(exportBtn);

    this.container.appendChild(title);
    this.container.appendChild(sunSection);
    this.container.appendChild(rotSection);
    this.container.appendChild(coverageSection);
    this.container.appendChild(buttonSection);

    this.updateDateDisplay(172);
    this.updateTimeDisplay(12);
  }

  private createSection(title: string, icon: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.innerHTML = `<span>${icon}</span> ${title}`;

    section.appendChild(sectionTitle);
    return section;
  }

  private createRotationSlider(
    slider: HTMLInputElement,
    valueSpan: HTMLSpanElement,
    label: string,
    min: number,
    max: number,
    step: number
  ): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'rotation-slider-container';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'rotation-label';
    labelDiv.innerHTML = `<span class="rot-axis">${label}</span>`;

    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = '0';
    slider.className = 'rotation-slider';

    valueSpan.className = 'rotation-value';
    valueSpan.textContent = '0°';

    const sliderRow = document.createElement('div');
    sliderRow.className = 'slider-row';
    sliderRow.appendChild(slider);
    sliderRow.appendChild(valueSpan);

    container.appendChild(labelDiv);
    container.appendChild(sliderRow);

    return container;
  }

  private attachEventListeners(): void {
    this.dateSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.updateDateDisplay(value);
      this.callbacks.onDateChange(value);
    });

    this.timeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateTimeDisplay(value);
      this.callbacks.onTimeChange(value);
    });

    const updateRotation = () => {
      const x = parseInt(this.rotXSlider.value);
      const y = parseInt(this.rotYSlider.value);
      const z = parseInt(this.rotZSlider.value);
      this.rotXValue.textContent = `${x}°`;
      this.rotYValue.textContent = `${y}°`;
      this.rotZValue.textContent = `${z}°`;
      this.callbacks.onRotationChange(x, y, z);
    };

    this.rotXSlider.addEventListener('input', updateRotation);
    this.rotYSlider.addEventListener('input', updateRotation);
    this.rotZSlider.addEventListener('input', updateRotation);
  }

  private updateDateDisplay(dayOfYear: number): void {
    const date = this.dayOfYearToDate(dayOfYear);
    const time = parseFloat(this.timeSlider.value);
    const timeStr = this.formatTime(time);
    this.dateValueDisplay.innerHTML = `<span class="mono">日期：${this.monthNames[date.month - 1]}${date.day}日 ${timeStr}</span>`;
  }

  private updateTimeDisplay(hour: number): void {
    const dayOfYear = parseInt(this.dateSlider.value);
    const date = this.dayOfYearToDate(dayOfYear);
    const timeStr = this.formatTime(hour);
    this.timeValueDisplay.innerHTML = `<span class="mono">时刻：${this.monthNames[date.month - 1]}${date.day}日 ${timeStr}</span>`;
  }

  private dayOfYearToDate(dayOfYear: number): { month: number; day: number } {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let remaining = dayOfYear;
    let month = 1;

    for (let i = 0; i < daysInMonth.length; i++) {
      if (remaining <= daysInMonth[i]) {
        return { month, day: remaining };
      }
      remaining -= daysInMonth[i];
      month++;
    }

    return { month: 12, day: 31 };
  }

  private formatTime(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  public updateCoverage(coverage: number): void {
    this.coverageValue.textContent = `${coverage.toFixed(1)}%`;
    this.coverageProgress.style.width = `${coverage}%`;

    if (coverage > 50) {
      this.coverageValue.style.color = '#ff8c42';
      this.coverageProgress.style.background = 'linear-gradient(90deg, #ff8c42, #ff6b35)';
    } else {
      this.coverageValue.style.color = '#4a90d9';
      this.coverageProgress.style.background = 'linear-gradient(90deg, #4a90d9, #8b5cf6)';
    }
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #ui-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 280px;
        height: 100vh;
        padding: 20px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-left: 1px solid rgba(255, 255, 255, 0.15);
        overflow-y: auto;
        z-index: 1000;
        box-sizing: border-box;
      }

      .panel-title {
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      }

      .panel-section {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      }

      .section-title {
        font-size: 14px;
        font-weight: 500;
        color: #e0e0e0;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .datetime-display {
        margin-bottom: 8px;
        color: #ffffff;
      }

      .mono {
        font-family: 'SF Mono', 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        color: #a5b4fc;
      }

      .slider-label {
        font-size: 12px;
        color: #b0b0b0;
        margin-bottom: 6px;
        margin-top: 12px;
      }

      .main-slider {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(90deg, #4a90d9, #8b5cf6);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
      }

      .main-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.15s ease;
      }

      .main-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .main-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }

      .rotation-section {
        background: rgba(255, 255, 255, 0.08);
      }

      .rotation-slider-container {
        margin-bottom: 12px;
      }

      .rotation-slider-container:last-child {
        margin-bottom: 0;
      }

      .rotation-label {
        font-size: 12px;
        color: #9ca3af;
        margin-bottom: 6px;
      }

      .rot-axis {
        display: inline-block;
        background: rgba(74, 144, 217, 0.3);
        color: #4a90d9;
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 500;
      }

      .slider-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .rotation-slider {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.2);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
      }

      .rotation-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #60a5fa;
        cursor: pointer;
        transition: transform 0.15s ease;
      }

      .rotation-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .rotation-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #60a5fa;
        cursor: pointer;
        border: none;
      }

      .rotation-value {
        font-size: 12px;
        color: #d1d5db;
        min-width: 35px;
        text-align: right;
        font-family: 'SF Mono', 'Consolas', monospace;
      }

      .coverage-label {
        font-size: 12px;
        color: #9ca3af;
        margin-bottom: 8px;
      }

      .coverage-display {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .coverage-value {
        font-size: 24px;
        font-weight: 700;
        color: #4a90d9;
        transition: color 0.3s ease;
        text-align: center;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4a90d9, #8b5cf6);
        border-radius: 4px;
        transition: width 0.5s ease-out, background 0.3s ease;
      }

      .button-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 20px;
      }

      .action-btn {
        width: 100%;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .action-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      .action-btn:active {
        transform: translateY(0);
      }

      .action-btn.primary {
        background: linear-gradient(135deg, #4a90d9, #8b5cf6);
      }

      .action-btn.primary:hover {
        background: linear-gradient(135deg, #5aa0e9, #9b6cf6);
        box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
      }

      #ui-panel::-webkit-scrollbar {
        width: 4px;
      }

      #ui-panel::-webkit-scrollbar-track {
        background: transparent;
      }

      #ui-panel::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }

      @media (max-width: 1024px) {
        #ui-panel {
          position: relative;
          width: 100%;
          height: auto;
          max-height: 50vh;
          border-left: none;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          order: 2;
        }

        .button-section {
          flex-direction: row;
        }

        .action-btn {
          flex: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  public dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
