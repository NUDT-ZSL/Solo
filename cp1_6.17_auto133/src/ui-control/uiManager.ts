import EventBus, { TimePeriod } from '../EventBus';
import SliderComponent from './sliderComponent';
import ColorPicker from './colorPicker';

interface PeriodInfo {
  key: TimePeriod;
  name: string;
  icon: string;
}

const PERIODS: PeriodInfo[] = [
  { key: 'morning', name: '清晨', icon: '🌅' },
  { key: 'noon', name: '正午', icon: '☀️' },
  { key: 'dusk', name: '黄昏', icon: '🌇' },
  { key: 'night', name: '夜晚', icon: '🌙' },
];

export class UIManager {
  private eventBus: EventBus;
  private container: HTMLDivElement;
  private currentPeriod: TimePeriod = 'noon';
  private periodNameLabel: HTMLSpanElement;
  private periodIconLabel: HTMLSpanElement;
  private periodButtons: Map<TimePeriod, HTMLButtonElement> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 20px;
      transform: translateY(-50%);
      width: 300px;
      background: rgba(30, 30, 30, 0.85);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 100;
      color: #fff;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    this.periodIconLabel = document.createElement('span');
    this.periodIconLabel.style.cssText = 'font-size: 28px;';
    this.periodIconLabel.textContent = '☀️';

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'flex: 1;';

    const sceneTitle = document.createElement('div');
    sceneTitle.textContent = '室内光照演示';
    sceneTitle.style.cssText = `
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 2px;
    `;

    this.periodNameLabel = document.createElement('div');
    this.periodNameLabel.textContent = '正午';
    this.periodNameLabel.style.cssText = `
      font-size: 13px;
      color: #FFD700;
      font-weight: 500;
    `;

    titleWrap.appendChild(sceneTitle);
    titleWrap.appendChild(this.periodNameLabel);
    header.appendChild(this.periodIconLabel);
    header.appendChild(titleWrap);

    this.container.appendChild(header);

    const lightSection = this.createSection('光照控制');
    this.container.appendChild(lightSection);
    lightSection.appendChild(this.createPeriodButtons());

    const tempSlider = new SliderComponent({
      min: 2700,
      max: 6500,
      step: 100,
      value: 5500,
      label: '色温',
      trackGradient: 'linear-gradient(to right, #FF8C00, #FFD700, #FFFFFF, #E0FFFF)',
      formatValue: (v) => `${Math.round(v)}K`,
    });
    tempSlider.onChange((v) => this.eventBus.emit('COLOR_TEMP_CHANGE', { temperature: v }));
    lightSection.appendChild(tempSlider.getElement());

    const intensitySlider = new SliderComponent({
      min: 0.2,
      max: 2.0,
      step: 0.05,
      value: 1.0,
      label: '光照强度',
      formatValue: (v) => v.toFixed(2),
    });
    intensitySlider.onChange((v) => this.eventBus.emit('LIGHT_INTENSITY_CHANGE', { intensity: v }));
    lightSection.appendChild(intensitySlider.getElement());

    const materialSection = this.createSection('材质调节');
    this.container.appendChild(materialSection);

    const colorPicker = new ColorPicker();
    colorPicker.onChange((hex) => this.eventBus.emit('TABLE_COLOR_CHANGE', { color: hex }));
    materialSection.appendChild(colorPicker.getElement());

    const roughnessSlider = new SliderComponent({
      min: 0.0,
      max: 1.0,
      step: 0.01,
      value: 0.5,
      label: '粗糙度',
      trackBackgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='6'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' x2='100%25'%3E%3Cstop offset='0%25' stop-color='%23333'/%3E%3Cstop offset='100%25' stop-color='%23888'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='6' fill='url(%23g)'/%3E%3C/svg%3E")`,
      formatValue: (v) => v.toFixed(2),
    });
    roughnessSlider.onChange((v) => this.eventBus.emit('TABLE_ROUGHNESS_CHANGE', { roughness: v }));
    materialSection.appendChild(roughnessSlider.getElement());

    const metalnessSlider = new SliderComponent({
      min: 0.0,
      max: 1.0,
      step: 0.01,
      value: 0.0,
      label: '金属度',
      trackBackgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='6'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' x2='100%25'%3E%3Cstop offset='0%25' stop-color='%23444'/%3E%3Cstop offset='50%25' stop-color='%23B0B0B0'/%3E%3Cstop offset='100%25' stop-color='%23E8E8E8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='6' fill='url(%23g)'/%3E%3C/svg%3E")`,
      formatValue: (v) => v.toFixed(2),
    });
    metalnessSlider.onChange((v) => this.eventBus.emit('TABLE_METALNESS_CHANGE', { metalness: v }));
    materialSection.appendChild(metalnessSlider.getElement());

    const glassSlider = new SliderComponent({
      min: 0.1,
      max: 1.0,
      step: 0.05,
      value: 0.5,
      label: '玻璃透光率',
      trackGradient: 'linear-gradient(to right, rgba(255,255,255,0.1), rgba(173,216,230,0.9))',
      formatValue: (v) => `${Math.round(v * 100)}%`,
    });
    glassSlider.onChange((v) => this.eventBus.emit('GLASS_TRANSMISSION_CHANGE', { transmission: v }));
    materialSection.appendChild(glassSlider.getElement());

    document.getElementById('app')?.appendChild(this.container);
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
    `;
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #aaa;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    section.appendChild(titleEl);
    return section;
  }

  private createPeriodButtons(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 16px;
    `;

    PERIODS.forEach((period) => {
      const btn = document.createElement('button');
      btn.textContent = period.icon;
      btn.title = period.name;
      btn.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: none;
        background: #444;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        transition: all 0.25s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      `;
      if (period.key === this.currentPeriod) {
        this.setActiveButton(btn);
      }
      btn.addEventListener('click', () => {
        this.currentPeriod = period.key;
        this.periodNameLabel.textContent = period.name;
        this.periodIconLabel.textContent = period.icon;
        this.periodButtons.forEach((b) => this.setInactiveButton(b));
        this.setActiveButton(btn);
        this.eventBus.emit('TIME_PERIOD_CHANGE', { period: period.key });
      });
      this.periodButtons.set(period.key, btn);
      wrap.appendChild(btn);
    });

    return wrap;
  }

  private setActiveButton(btn: HTMLButtonElement): void {
    btn.style.background = '#FFD700';
    btn.style.color = '#1a1a1a';
    btn.style.boxShadow = '0 0 16px rgba(255, 215, 0, 0.7), 0 0 32px rgba(255, 215, 0, 0.3)';
    btn.style.transform = 'scale(1.05)';
  }

  private setInactiveButton(btn: HTMLButtonElement): void {
    btn.style.background = '#444';
    btn.style.color = '#fff';
    btn.style.boxShadow = 'none';
    btn.style.transform = 'scale(1)';
  }

  public dispose(): void {
    this.container.remove();
  }
}

export default UIManager;
