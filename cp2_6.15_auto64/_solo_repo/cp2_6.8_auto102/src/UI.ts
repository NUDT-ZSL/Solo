import { DisplayMode } from './BuildingSystem';

export interface UICallbacks {
  onDateChange: (dayOfYear: number) => void;
  onTimeChange: (timeOfDay: number) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onResetView: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private controlPanel: HTMLElement;
  private resetButton: HTMLElement;
  private dateSlider: HTMLInputElement;
  private timeSlider: HTMLInputElement;
  private dateLabel: HTMLElement;
  private timeLabel: HTMLElement;
  private infoPanel: HTMLElement;
  private infoContent: HTMLElement;
  private shadowModeBtn: HTMLButtonElement;
  private radiationModeBtn: HTMLButtonElement;

  private callbacks: UICallbacks;
  private isMobile: boolean = false;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.container = document.body;

    this.controlPanel = this.createControlPanel();
    this.dateSlider = this.createSlider('date-slider', 1, 365, 1, 172);
    this.timeSlider = this.createSlider('time-slider', 6, 18, 1 / 6, 12.5);
    this.dateLabel = document.createElement('div');
    this.timeLabel = document.createElement('div');
    this.shadowModeBtn = document.createElement('button');
    this.radiationModeBtn = document.createElement('button');
    this.infoPanel = this.createInfoPanel();
    this.infoContent = document.createElement('div');
    this.resetButton = this.createResetButton();

    this.setupPanelLayout();
    this.setupEventListeners();
    this.updateDateLabel(172);
    this.updateTimeLabel(12.5);
    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
  }

  private createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 220px;
      background: rgba(45, 55, 72, 0.85);
      border: 1px solid #4A5568;
      border-radius: 12px;
      padding: 16px;
      z-index: 100;
      backdrop-filter: blur(10px);
      font-family: Arial, Helvetica, sans-serif;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(panel);
    return panel;
  }

  private createInfoPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      right: 16px;
      top: 80px;
      width: 200px;
      background: rgba(45, 55, 72, 0.85);
      border: 1px solid #4A5568;
      border-radius: 12px;
      padding: 16px;
      z-index: 100;
      backdrop-filter: blur(10px);
      font-family: Arial, Helvetica, sans-serif;
      display: none;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(panel);
    return panel;
  }

  private createResetButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = '复位视角';
    btn.style.cssText = `
      position: fixed;
      right: 16px;
      top: 16px;
      background: #2D3748;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-family: Arial, Helvetica, sans-serif;
      cursor: pointer;
      z-index: 100;
      transition: background 0.2s ease;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#4A5568';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#2D3748';
    });
    document.body.appendChild(btn);
    return btn;
  }

  private createSlider(id: string, min: number, max: number, step: number, value: number): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    this.styleSlider(slider);
    return slider;
  }

  private styleSlider(slider: HTMLInputElement): void {
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #4A5568;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    `;

    const style = document.createElement('style');
    style.textContent = `
      #${slider.id}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #63B3ED;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      #${slider.id}::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      #${slider.id}::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #63B3ED;
        cursor: pointer;
        border: none;
        transition: transform 0.15s ease;
      }
      #${slider.id}::-moz-range-thumb:hover {
        transform: scale(1.2);
      }
    `;
    document.head.appendChild(style);
  }

  private setupPanelLayout(): void {
    const title = document.createElement('div');
    title.textContent = '日照分析控制';
    title.style.cssText = `
      color: #E2E8F0;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 12px;
    `;
    this.controlPanel.appendChild(title);

    const dateSection = document.createElement('div');
    dateSection.style.marginBottom = '12px';
    this.dateLabel.style.cssText = `
      color: #CBD5E0;
      font-size: 14px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    dateSection.appendChild(this.dateLabel);
    dateSection.appendChild(this.dateSlider);
    this.controlPanel.appendChild(dateSection);

    const timeSection = document.createElement('div');
    timeSection.style.marginBottom = '12px';
    this.timeLabel.style.cssText = `
      color: #CBD5E0;
      font-size: 14px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    timeSection.appendChild(this.timeLabel);
    timeSection.appendChild(this.timeSlider);
    this.controlPanel.appendChild(timeSection);

    const modeSection = document.createElement('div');
    modeSection.style.cssText = 'margin-bottom: 12px;';
    const modeLabel = document.createElement('div');
    modeLabel.textContent = '显示模式';
    modeLabel.style.cssText = 'color: #CBD5E0; font-size: 14px; margin-bottom: 8px;';
    modeSection.appendChild(modeLabel);

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display: flex; gap: 8px;';

    this.shadowModeBtn.textContent = '阴影覆盖';
    this.radiationModeBtn.textContent = '辐射分布';
    this.styleModeButton(this.shadowModeBtn, false);
    this.styleModeButton(this.radiationModeBtn, true);

    btnGroup.appendChild(this.shadowModeBtn);
    btnGroup.appendChild(this.radiationModeBtn);
    modeSection.appendChild(btnGroup);
    this.controlPanel.appendChild(modeSection);

    const infoTitle = document.createElement('div');
    infoTitle.textContent = '选中建筑信息';
    infoTitle.style.cssText = 'color: #E2E8F0; font-size: 14px; font-weight: bold; margin-bottom: 12px;';
    this.infoPanel.appendChild(infoTitle);
    this.infoContent.style.cssText = 'color: #E2E8F0; font-size: 13px; line-height: 1.8;';
    this.infoPanel.appendChild(this.infoContent);
  }

  private styleModeButton(btn: HTMLButtonElement, active: boolean): void {
    btn.style.cssText = `
      flex: 1;
      padding: 8px 4px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-family: Arial, Helvetica, sans-serif;
      color: #FFFFFF;
      background: ${active ? '#63B3ED' : '#2D3748'};
      transition: background 0.2s ease;
    `;
  }

  private setupEventListeners(): void {
    this.dateSlider.addEventListener('input', () => {
      const day = parseInt(this.dateSlider.value);
      this.updateDateLabel(day);
      this.callbacks.onDateChange(day);
    });

    this.timeSlider.addEventListener('input', () => {
      const time = parseFloat(this.timeSlider.value);
      this.updateTimeLabel(time);
      this.callbacks.onTimeChange(time);
    });

    this.shadowModeBtn.addEventListener('click', () => {
      this.styleModeButton(this.shadowModeBtn, true);
      this.styleModeButton(this.radiationModeBtn, false);
      this.callbacks.onDisplayModeChange('shadow');
    });

    this.radiationModeBtn.addEventListener('click', () => {
      this.styleModeButton(this.shadowModeBtn, false);
      this.styleModeButton(this.radiationModeBtn, true);
      this.callbacks.onDisplayModeChange('radiation');
    });

    this.resetButton.addEventListener('click', () => {
      this.callbacks.onResetView();
    });
  }

  private updateDateLabel(dayOfYear: number): void {
    const date = this.dayOfYearToDate(dayOfYear);
    const calendarIcon = '📅';
    this.dateLabel.innerHTML = `<span>${calendarIcon}</span><span>${date}</span>`;
  }

  private updateTimeLabel(timeOfDay: number): void {
    const hours = Math.floor(timeOfDay);
    const minutes = Math.round((timeOfDay - hours) * 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const clockIcon = '🕐';
    this.timeLabel.innerHTML = `<span>${clockIcon}</span><span>${timeStr}</span>`;
  }

  private dayOfYearToDate(dayOfYear: number): string {
    const date = new Date(2025, 0, dayOfYear);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }

  private checkResponsive(): void {
    const width = window.innerWidth;
    const shouldBeMobile = width < 1024;

    if (shouldBeMobile !== this.isMobile) {
      this.isMobile = shouldBeMobile;
      this.applyResponsiveLayout();
    }
  }

  private applyResponsiveLayout(): void {
    if (this.isMobile) {
      this.controlPanel.style.cssText = `
        position: fixed;
        left: 0;
        bottom: 0;
        top: auto;
        transform: none;
        width: 100%;
        height: 80px;
        background: rgba(45, 55, 72, 0.9);
        border: 1px solid #4A5568;
        border-radius: 12px 12px 0 0;
        padding: 8px 16px;
        z-index: 100;
        backdrop-filter: blur(10px);
        font-family: Arial, Helvetica, sans-serif;
        display: flex;
        align-items: center;
        gap: 16px;
        overflow-x: auto;
      `;

      const children = this.controlPanel.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        child.style.marginBottom = '0';
        child.style.flexShrink = '0';
        const labels = child.querySelectorAll('div');
        labels.forEach((l) => {
          (l as HTMLElement).style.fontSize = '12px';
        });
      }

      this.infoPanel.style.top = '60px';
      this.infoPanel.style.width = '180px';
    } else {
      this.controlPanel.style.cssText = `
        position: fixed;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 220px;
        background: rgba(45, 55, 72, 0.85);
        border: 1px solid #4A5568;
        border-radius: 12px;
        padding: 16px;
        z-index: 100;
        backdrop-filter: blur(10px);
        font-family: Arial, Helvetica, sans-serif;
      `;
    }
  }

  public updateBuildingInfo(info: { dimensions: string; orientation: string } | null): void {
    if (info) {
      this.infoPanel.style.display = 'block';
      this.infoContent.innerHTML = `
        <div>尺寸: ${info.dimensions}</div>
        <div>朝向: ${info.orientation}</div>
      `;
    } else {
      this.infoPanel.style.display = 'none';
    }
  }

  public destroy(): void {
    this.controlPanel.remove();
    this.resetButton.remove();
    this.infoPanel.remove();
  }
}
