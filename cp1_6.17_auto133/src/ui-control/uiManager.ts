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
  private header: HTMLDivElement;
  private periodButtonWrap: HTMLDivElement;
  private currentPeriod: TimePeriod = 'noon';
  private periodNameLabel: HTMLSpanElement;
  private periodIconLabel: HTMLSpanElement;
  private periodButtons: Map<TimePeriod, HTMLButtonElement> = new Map();
  private sliders: SliderComponent[] = [];
  private isNarrowScreen: boolean = false;
  private readonly BREAKPOINT = 768;
  private sectionElements: HTMLElement[] = [];

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.container = document.createElement('div');
    this.applyContainerStyle(false);

    this.header = document.createElement('div');
    this.applyHeaderStyle(false);

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
    this.header.appendChild(this.periodIconLabel);
    this.header.appendChild(titleWrap);

    this.container.appendChild(this.header);

    const lightSection = this.createSection('光照控制');
    this.sectionElements.push(lightSection);
    this.container.appendChild(lightSection);
    this.periodButtonWrap = this.createPeriodButtons();
    lightSection.appendChild(this.periodButtonWrap);

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
    this.sliders.push(tempSlider);
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
    this.sliders.push(intensitySlider);
    lightSection.appendChild(intensitySlider.getElement());

    const materialSection = this.createSection('材质调节');
    this.sectionElements.push(materialSection);
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
      textureType: 'roughness',
      formatValue: (v) => v.toFixed(2),
    });
    roughnessSlider.onChange((v) => this.eventBus.emit('TABLE_ROUGHNESS_CHANGE', { roughness: v }));
    this.sliders.push(roughnessSlider);
    materialSection.appendChild(roughnessSlider.getElement());

    const metalnessSlider = new SliderComponent({
      min: 0.0,
      max: 1.0,
      step: 0.01,
      value: 0.0,
      label: '金属度',
      textureType: 'metalness',
      formatValue: (v) => v.toFixed(2),
    });
    metalnessSlider.onChange((v) => this.eventBus.emit('TABLE_METALNESS_CHANGE', { metalness: v }));
    this.sliders.push(metalnessSlider);
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
    this.sliders.push(glassSlider);
    materialSection.appendChild(glassSlider.getElement());

    document.getElementById('app')?.appendChild(this.container);

    this.checkResponsive();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private applyContainerStyle(narrow: boolean): void {
    if (narrow) {
      this.container.style.cssText = `
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        background: rgba(20, 20, 20, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px 12px 0 0;
        padding: 12px;
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 100;
        color: #fff;
        max-height: 55vh;
        overflow-y: auto;
      `;
    } else {
      this.container.style.cssText = `
        position: absolute;
        top: 50%;
        left: 20px;
        transform: translateY(-50%);
        width: 300px;
        background: rgba(20, 20, 20, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
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
    }
  }

  private applyHeaderStyle(narrow: boolean): void {
    const mb = narrow ? '14px' : '20px';
    const pb = narrow ? '10px' : '14px';
    this.header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: ${mb};
      padding-bottom: ${pb};
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
  }

  private onResize(): void {
    this.checkResponsive();
  }

  private checkResponsive(): void {
    const narrow = window.innerWidth < this.BREAKPOINT;
    if (narrow !== this.isNarrowScreen) {
      this.isNarrowScreen = narrow;
      this.applyResponsiveLayout(narrow);
    }
  }

  private applyResponsiveLayout(narrow: boolean): void {
    this.applyContainerStyle(narrow);
    this.applyHeaderStyle(narrow);
    this.applyPeriodButtonWrapStyle(narrow);
    this.sectionElements.forEach((sec) => {
      sec.style.marginBottom = narrow ? '16px' : '20px';
      const title = sec.firstElementChild as HTMLElement | null;
      if (title) {
        title.style.marginBottom = narrow ? '10px' : '14px';
      }
    });
    this.sliders.forEach((slider) => slider.setCompactMode(narrow));
  }

  private applyPeriodButtonWrapStyle(narrow: boolean): void {
    if (narrow) {
      this.periodButtonWrap.style.cssText = `
        display: flex;
        flex-wrap: nowrap;
        gap: 10px;
        margin-bottom: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 4px;
      `;
      this.periodButtonWrap.style.justifyContent = 'flex-start';
    } else {
      this.periodButtonWrap.style.cssText = `
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 16px;
        overflow-x: visible;
        overflow-y: visible;
        padding-bottom: 0;
      `;
      this.periodButtonWrap.style.flexWrap = 'wrap';
    }
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.style.marginBottom = this.isNarrowScreen ? '16px' : '20px';
    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #aaa;
      margin-bottom: ${this.isNarrowScreen ? '10px' : '14px'};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    section.appendChild(titleEl);
    return section;
  }

  private createPeriodButtons(): HTMLDivElement {
    const wrap = document.createElement('div');
    this.periodButtonWrap = wrap;
    this.applyPeriodButtonWrapStyle(this.isNarrowScreen);

    PERIODS.forEach((period) => {
      const btn = document.createElement('button');
      btn.textContent = period.icon;
      btn.title = period.name;
      btn.style.cssText = `
        width: 60px;
        height: 60px;
        min-width: 60px;
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
    window.removeEventListener('resize', this.onResize.bind(this));
    this.container.remove();
  }
}

export default UIManager;
