import type { ForestType } from './TreeSystem';

export interface UIParams {
  lightIntensity: number;
  soilMoisture: number;
  mycorrhizaStrength: number;
  forestType: ForestType;
  isPlaying: boolean;
}

export type UIChangeHandler = (params: UIParams) => void;

export class UIPanel {
  private toggleBtn: HTMLButtonElement;
  private panel: HTMLElement;

  private lightSlider: HTMLInputElement;
  private lightValue: HTMLElement;
  private moistureSlider: HTMLInputElement;
  private moistureValue: HTMLElement;
  private mycorrhizaSlider: HTMLInputElement;
  private mycorrhizaValue: HTMLElement;
  private forestTypeSelect: HTMLSelectElement;
  private toggleAnimationBtn: HTMLButtonElement;

  private treeCountEl: HTMLElement;
  private particleCountEl: HTMLElement;
  private fpsCounterEl: HTMLElement;

  private params: UIParams = {
    lightIntensity: 1.25,
    soilMoisture: 50,
    mycorrhizaStrength: 0.5,
    forestType: 'mixed',
    isPlaying: true
  };

  private onChangeHandler: UIChangeHandler | null = null;
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 200;

  constructor() {
    this.panel = document.getElementById('ui-panel')!;
    this.toggleBtn = document.getElementById('panel-toggle') as HTMLButtonElement;

    this.lightSlider = document.getElementById('light-slider') as HTMLInputElement;
    this.lightValue = document.getElementById('light-value')!;
    this.moistureSlider = document.getElementById('moisture-slider') as HTMLInputElement;
    this.moistureValue = document.getElementById('moisture-value')!;
    this.mycorrhizaSlider = document.getElementById('mycorrhiza-slider') as HTMLInputElement;
    this.mycorrhizaValue = document.getElementById('mycorrhiza-value')!;
    this.forestTypeSelect = document.getElementById('forest-type') as HTMLSelectElement;
    this.toggleAnimationBtn = document.getElementById('toggle-animation') as HTMLButtonElement;

    this.treeCountEl = document.getElementById('tree-count')!;
    this.particleCountEl = document.getElementById('particle-count')!;
    this.fpsCounterEl = document.getElementById('fps-counter')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.toggleBtn.addEventListener('click', () => this.togglePanel());

    this.lightSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.lightIntensity = value;
      this.updateValueDisplay(this.lightValue, value.toFixed(2));
      this.scheduleChange();
    });

    this.moistureSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.params.soilMoisture = value;
      this.updateValueDisplay(this.moistureValue, value.toString());
      this.scheduleChange();
    });

    this.mycorrhizaSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.params.mycorrhizaStrength = value;
      this.updateValueDisplay(this.mycorrhizaValue, value.toFixed(2));
      this.scheduleChange();
    });

    this.forestTypeSelect.addEventListener('change', (e) => {
      this.params.forestType = (e.target as HTMLSelectElement).value as ForestType;
      this.notifyChange();
    });

    this.toggleAnimationBtn.addEventListener('click', (e) => {
      this.createRipple(e);
      this.params.isPlaying = !this.params.isPlaying;
      this.updateAnimationButton();
      this.notifyChange();
    });

    this.toggleBtn.addEventListener('click', (e) => this.createRipple(e));
  }

  private updateValueDisplay(element: HTMLElement, value: string): void {
    element.textContent = value;
    element.classList.remove('pop');
    void element.offsetWidth;
    element.classList.add('pop');
    setTimeout(() => element.classList.remove('pop'), 150);
  }

  private scheduleChange(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.notifyChange();
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }

  private notifyChange(): void {
    if (this.onChangeHandler) {
      this.onChangeHandler({ ...this.params });
    }
  }

  private togglePanel(): void {
    this.panel.classList.toggle('hidden');
  }

  private createRipple(event: MouseEvent): void {
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    btn.appendChild(ripple);

    setTimeout(() => ripple.remove(), 300);
  }

  private updateAnimationButton(): void {
    if (this.params.isPlaying) {
      this.toggleAnimationBtn.textContent = '⏸ 暂停动画';
      this.toggleAnimationBtn.classList.add('playing');
    } else {
      this.toggleAnimationBtn.textContent = '▶ 开始动画';
      this.toggleAnimationBtn.classList.remove('playing');
    }
  }

  onChange(handler: UIChangeHandler): void {
    this.onChangeHandler = handler;
  }

  getParams(): UIParams {
    return { ...this.params };
  }

  setTreeCount(count: number): void {
    this.treeCountEl.textContent = count.toString();
  }

  setParticleCount(count: number): void {
    this.particleCountEl.textContent = count.toString();
  }

  setFPS(fps: number): void {
    this.fpsCounterEl.textContent = fps.toFixed(0);
  }

  showPanel(): void {
    this.panel.classList.remove('hidden');
  }

  hidePanel(): void {
    this.panel.classList.add('hidden');
  }
}
