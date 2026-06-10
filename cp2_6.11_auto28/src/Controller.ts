export interface EnvParams {
  temperature: number;
  salinity: number;
  light: number;
}

export interface StatsData {
  temperature: number;
  salinity: number;
  light: number;
  coralCount: number;
  particleCount: number;
}

type SliderType = 'temp' | 'salinity' | 'light';

export class Controller {
  private params: EnvParams;
  private onParamsChange: (params: EnvParams) => void;
  private onStatsUpdate?: (stats: StatsData) => void;
  
  private tempMin = 10;
  private tempMax = 35;
  private salinityMin = 28;
  private salinityMax = 35;
  private lightMin = 0.1;
  private lightMax = 1.0;
  
  private activeSlider: SliderType | null = null;
  private isDragging = false;

  constructor(
    initialParams: EnvParams,
    onParamsChange: (params: EnvParams) => void
  ) {
    this.params = { ...initialParams };
    this.onParamsChange = onParamsChange;
    this.initSliders();
    this.updateSliderPositions();
    this.updateDisplayValues();
  }

  public setStatsCallback(callback: (stats: StatsData) => void): void {
    this.onStatsUpdate = callback;
  }

  public updateStats(stats: StatsData): void {
    if (this.onStatsUpdate) {
      this.onStatsUpdate(stats);
    }
    this.updateStatsDisplay(stats);
  }

  public getParams(): EnvParams {
    return { ...this.params };
  }

  private initSliders(): void {
    const sliders = document.querySelectorAll('.slider-container');
    
    sliders.forEach((slider) => {
      const type = slider.getAttribute('data-type') as SliderType;
      if (!type) return;
      
      const track = slider.querySelector('.slider-track');
      const thumb = slider.querySelector('.slider-thumb');
      
      if (!track || !thumb) return;
      
      track.addEventListener('mousedown', (e) => this.handleSliderStart(e as MouseEvent, type));
      track.addEventListener('touchstart', (e) => this.handleTouchStart(e as TouchEvent, type), { passive: false });
      
      thumb.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.handleSliderStart(e as MouseEvent, type);
      });
      thumb.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        this.handleTouchStart(e as TouchEvent, type);
      }, { passive: false });
    });
    
    document.addEventListener('mousemove', (e) => this.handleSliderMove(e as MouseEvent));
    document.addEventListener('mouseup', () => this.handleSliderEnd());
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e as TouchEvent), { passive: false });
    document.addEventListener('touchend', () => this.handleSliderEnd());
  }

  private handleSliderStart(e: MouseEvent, type: SliderType): void {
    e.preventDefault();
    this.isDragging = true;
    this.activeSlider = type;
    this.updateValueFromEvent(e.clientX, type);
  }

  private handleTouchStart(e: TouchEvent, type: SliderType): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.activeSlider = type;
      this.updateValueFromEvent(e.touches[0].clientX, type);
    }
  }

  private handleSliderMove(e: MouseEvent): void {
    if (!this.isDragging || !this.activeSlider) return;
    this.updateValueFromEvent(e.clientX, this.activeSlider);
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isDragging || !this.activeSlider) return;
    e.preventDefault();
    if (e.touches.length === 1) {
      this.updateValueFromEvent(e.touches[0].clientX, this.activeSlider);
    }
  }

  private handleSliderEnd(): void {
    this.isDragging = false;
    this.activeSlider = null;
  }

  private updateValueFromEvent(clientX: number, type: SliderType): void {
    const slider = document.querySelector(`.slider-container[data-type="${type}"]`);
    if (!slider) return;
    
    const rect = slider.getBoundingClientRect();
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    
    let value: number;
    switch (type) {
      case 'temp':
        value = this.tempMin + ratio * (this.tempMax - this.tempMin);
        this.params.temperature = value;
        break;
      case 'salinity':
        value = this.salinityMin + ratio * (this.salinityMax - this.salinityMin);
        this.params.salinity = value;
        break;
      case 'light':
        value = this.lightMin + ratio * (this.lightMax - this.lightMin);
        this.params.light = value;
        break;
    }
    
    this.updateSliderPosition(type, ratio);
    this.updateDisplayValues();
    this.onParamsChange({ ...this.params });
  }

  private updateSliderPosition(type: SliderType, ratio: number): void {
    const thumb = document.getElementById(`thumb-${type}`);
    if (thumb) {
      thumb.style.left = `${ratio * 100}%`;
    }
  }

  private updateSliderPositions(): void {
    const tempRatio = (this.params.temperature - this.tempMin) / (this.tempMax - this.tempMin);
    const salinityRatio = (this.params.salinity - this.salinityMin) / (this.salinityMax - this.salinityMin);
    const lightRatio = (this.params.light - this.lightMin) / (this.lightMax - this.lightMin);
    
    this.updateSliderPosition('temp', tempRatio);
    this.updateSliderPosition('salinity', salinityRatio);
    this.updateSliderPosition('light', lightRatio);
  }

  private updateDisplayValues(): void {
    const tempEl = document.getElementById('value-temp');
    const salinityEl = document.getElementById('value-salinity');
    const lightEl = document.getElementById('value-light');
    
    if (tempEl) tempEl.textContent = `${this.params.temperature.toFixed(1)}°C`;
    if (salinityEl) salinityEl.textContent = `${this.params.salinity.toFixed(1)} ppt`;
    if (lightEl) lightEl.textContent = this.params.light.toFixed(2);
  }

  private updateStatsDisplay(stats: StatsData): void {
    const tempEl = document.getElementById('stat-temp');
    const salinityEl = document.getElementById('stat-salinity');
    const lightEl = document.getElementById('stat-light');
    const coralEl = document.getElementById('stat-coral');
    const particlesEl = document.getElementById('stat-particles');
    
    if (tempEl) tempEl.textContent = stats.temperature.toFixed(1);
    if (salinityEl) salinityEl.textContent = stats.salinity.toFixed(1);
    if (lightEl) lightEl.textContent = stats.light.toFixed(2);
    if (coralEl) coralEl.textContent = stats.coralCount.toString();
    if (particlesEl) particlesEl.textContent = stats.particleCount.toString();
  }
}
