import type { MeteorConfig } from './particleSystem';

type ConfigUpdateCallback = (config: Partial<MeteorConfig>) => void;
type BurstTriggerCallback = () => void;

export class UIControls {
  private densitySlider: HTMLInputElement;
  private directionSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;

  private densityValue: HTMLElement;
  private directionValue: HTMLElement;
  private speedValue: HTMLElement;

  private controlPanel: HTMLElement;
  private burstIndicator: HTMLElement;
  private divider: HTMLElement;

  private onConfigUpdate: ConfigUpdateCallback;
  private onBurstTrigger: BurstTriggerCallback;

  private currentDensity: number;
  private currentDirection: number;
  private currentSpeed: number;

  constructor(
    onConfigUpdate: ConfigUpdateCallback,
    onBurstTrigger: BurstTriggerCallback
  ) {
    this.onConfigUpdate = onConfigUpdate;
    this.onBurstTrigger = onBurstTrigger;

    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.directionSlider = document.getElementById('direction-slider') as HTMLInputElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;

    this.densityValue = document.getElementById('density-value') as HTMLElement;
    this.directionValue = document.getElementById('direction-value') as HTMLElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;

    this.controlPanel = document.getElementById('control-panel') as HTMLElement;
    this.burstIndicator = document.getElementById('burst-indicator') as HTMLElement;
    this.divider = document.querySelector('.divider') as HTMLElement;

    this.currentDensity = parseInt(this.densitySlider.value, 10);
    this.currentDirection = parseInt(this.directionSlider.value, 10);
    this.currentSpeed = parseInt(this.speedSlider.value, 10);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.densitySlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.currentDensity = value;
      this.densityValue.textContent = value.toString();
      this.onConfigUpdate({ density: value });
    });

    this.directionSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.currentDirection = value;
      this.directionValue.textContent = `${value}°`;
      this.onConfigUpdate({ direction: value });
    });

    this.speedSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.currentSpeed = value;
      this.speedValue.textContent = value.toString();
      this.onConfigUpdate({ speed: value });
    });

    this.controlPanel.addEventListener('mouseenter', () => {
      this.divider.classList.add('divider-hover');
    });

    this.controlPanel.addEventListener('mouseleave', () => {
      this.divider.classList.remove('divider-hover');
    });

    document.addEventListener('click', (e) => {
      const target = e.target as Node;
      if (!this.controlPanel.contains(target)) {
        console.debug(`[UIControls] 面板外点击触发爆发, density=${this.currentDensity}`);
        this.triggerBurstFeedback();
        this.onBurstTrigger();
      }
    });
  }

  private triggerBurstFeedback(): void {
    this.burstIndicator.classList.add('active');
    setTimeout(() => {
      this.burstIndicator.classList.remove('active');
    }, 1200);
  }

  public getConfig(): MeteorConfig {
    return {
      density: this.currentDensity,
      direction: this.currentDirection,
      speed: this.currentSpeed
    };
  }
}
