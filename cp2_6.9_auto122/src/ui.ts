import { Planet } from './solarSystem';

export interface UIState {
  gravityMass: number;
  speedMultiplier: number;
  showParams: boolean;
}

export class UI {
  private fpsElement: HTMLElement;
  private simTimeElement: HTMLElement;
  private gravityWarning: HTMLElement;
  private massSlider: HTMLInputElement;
  private massValue: HTMLElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private showParamsCheckbox: HTMLInputElement;
  private orbitParamsDiv: HTMLElement;
  private resetBtn: HTMLElement;

  public state: UIState = {
    gravityMass: 5,
    speedMultiplier: 1,
    showParams: false
  };

  public onMassChange?: (mass: number) => void;
  public onSpeedChange?: (speed: number) => void;
  public onShowParamsChange?: (show: boolean) => void;
  public onReset?: () => void;

  constructor() {
    this.fpsElement = document.getElementById('fps-counter')!;
    this.simTimeElement = document.getElementById('sim-time')!;
    this.gravityWarning = document.getElementById('gravity-warning')!;
    this.massSlider = document.getElementById('mass-slider') as HTMLInputElement;
    this.massValue = document.getElementById('mass-value')!;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;
    this.showParamsCheckbox = document.getElementById('show-params') as HTMLInputElement;
    this.orbitParamsDiv = document.getElementById('orbit-params')!;
    this.resetBtn = document.getElementById('reset-btn')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.massSlider.addEventListener('input', () => {
      const value = parseFloat(this.massSlider.value);
      this.state.gravityMass = value;
      this.massValue.textContent = value.toFixed(1);
      this.onMassChange?.(value);
    });

    this.speedSlider.addEventListener('input', () => {
      const value = parseFloat(this.speedSlider.value);
      this.state.speedMultiplier = value;
      this.speedValue.textContent = value.toFixed(1);
      this.onSpeedChange?.(value);
    });

    this.showParamsCheckbox.addEventListener('change', () => {
      this.state.showParams = this.showParamsCheckbox.checked;
      this.orbitParamsDiv.style.display = this.state.showParams ? 'block' : 'none';
      this.onShowParamsChange?.(this.state.showParams);
    });

    this.resetBtn.addEventListener('click', () => {
      this.onReset?.();
    });
  }

  public updateFPS(fps: number): void {
    this.fpsElement.textContent = `FPS: ${fps.toFixed(0)}`;
  }

  public updateSimTime(years: number): void {
    this.simTimeElement.textContent = `时间: ${years.toFixed(1)} 年`;
  }

  public showGravityWarning(show: boolean): void {
    this.gravityWarning.style.display = show ? 'flex' : 'none';
  }

  public updateOrbitParams(planets: Planet[]): void {
    if (!this.state.showParams) return;

    let html = '';
    for (const planet of planets) {
      const deg = planet.getPrecessionDegrees().toFixed(1);
      const sma = planet.currentSemiMajorAxis.toFixed(2);
      const per = planet.orbitalPeriod.toFixed(2);
      html += `
        <div class="param-line">
          <span>${planet.config.name} 进动角</span>
          <span>${deg}°</span>
        </div>
        <div class="param-line">
          <span>  半长轴/周期</span>
          <span>${sma} / ${per}</span>
        </div>
      `;
    }
    this.orbitParamsDiv.innerHTML = html;
  }
}
