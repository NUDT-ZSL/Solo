import { EnvironmentParams, GrowthSpeed } from './plant';

export type ViewPreset = 'top' | 'side' | 'reset';

export interface UIControllerParams {
  onEnvironmentChange: (params: EnvironmentParams) => void;
  onSpeedChange: (speed: GrowthSpeed) => void;
  onViewChange: (view: ViewPreset) => void;
  onReset: () => void;
  onSnapshot: () => void;
}

export class UIController {
  private onEnvironmentChange: (params: EnvironmentParams) => void;
  private onSpeedChange: (speed: GrowthSpeed) => void;
  private onViewChange: (view: ViewPreset) => void;
  private onReset: () => void;
  private onSnapshot: () => void;

  private lightSlider: HTMLInputElement;
  private waterSlider: HTMLInputElement;
  private tempSlider: HTMLInputElement;
  private lightValue: HTMLElement;
  private waterValue: HTMLElement;
  private tempValue: HTMLElement;
  private speedGroup: HTMLElement;
  private viewTop: HTMLButtonElement;
  private viewSide: HTMLButtonElement;
  private viewReset: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private btnSnapshot: HTMLButtonElement;
  private mobileToggle: HTMLButtonElement;
  private mobileClose: HTMLButtonElement;
  private controlPanel: HTMLElement;
  private stageIndicator: HTMLElement;
  private stageLabel: HTMLElement;

  constructor(params: UIControllerParams) {
    this.onEnvironmentChange = params.onEnvironmentChange;
    this.onSpeedChange = params.onSpeedChange;
    this.onViewChange = params.onViewChange;
    this.onReset = params.onReset;
    this.onSnapshot = params.onSnapshot;

    this.lightSlider = document.getElementById('light-slider') as HTMLInputElement;
    this.waterSlider = document.getElementById('water-slider') as HTMLInputElement;
    this.tempSlider = document.getElementById('temp-slider') as HTMLInputElement;
    this.lightValue = document.getElementById('light-value') as HTMLElement;
    this.waterValue = document.getElementById('water-value') as HTMLElement;
    this.tempValue = document.getElementById('temp-value') as HTMLElement;
    this.speedGroup = document.getElementById('speed-group') as HTMLElement;
    this.viewTop = document.getElementById('view-top') as HTMLButtonElement;
    this.viewSide = document.getElementById('view-side') as HTMLButtonElement;
    this.viewReset = document.getElementById('view-reset') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.btnSnapshot = document.getElementById('btn-snapshot') as HTMLButtonElement;
    this.mobileToggle = document.getElementById('mobile-toggle') as HTMLButtonElement;
    this.mobileClose = document.getElementById('mobile-close') as HTMLButtonElement;
    this.controlPanel = document.getElementById('control-panel') as HTMLElement;
    this.stageIndicator = document.getElementById('stage-indicator') as HTMLElement;
    this.stageLabel = document.getElementById('stage-label') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.lightSlider.addEventListener('input', () => {
      const value = Number(this.lightSlider.value);
      this.lightValue.textContent = String(value);
      this.onEnvironmentChange({
        light: value,
        water: Number(this.waterSlider.value),
        temperature: Number(this.tempSlider.value)
      });
    });

    this.waterSlider.addEventListener('input', () => {
      const value = Number(this.waterSlider.value);
      this.waterValue.textContent = String(value);
      this.onEnvironmentChange({
        light: Number(this.lightSlider.value),
        water: value,
        temperature: Number(this.tempSlider.value)
      });
    });

    this.tempSlider.addEventListener('input', () => {
      const value = Number(this.tempSlider.value);
      this.tempValue.textContent = String(value);
      this.onEnvironmentChange({
        light: Number(this.lightSlider.value),
        water: Number(this.waterSlider.value),
        temperature: value
      });
    });

    this.speedGroup.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.btn') as HTMLButtonElement;
      if (!button) return;
      const speed = button.dataset.speed as GrowthSpeed;
      if (!speed) return;
      const buttons = this.speedGroup.querySelectorAll('.btn');
      buttons.forEach((btn: Element) => btn.classList.remove('active'));
      button.classList.add('active');
      this.onSpeedChange(speed);
    });

    this.viewTop.addEventListener('click', () => {
      this.onViewChange('top');
    });

    this.viewSide.addEventListener('click', () => {
      this.onViewChange('side');
    });

    this.viewReset.addEventListener('click', () => {
      this.onViewChange('reset');
    });

    this.btnReset.addEventListener('click', () => {
      this.onReset();
    });

    this.btnSnapshot.addEventListener('click', () => {
      this.onSnapshot();
    });

    this.mobileToggle.addEventListener('click', () => {
      this.controlPanel.classList.toggle('open');
    });

    this.mobileClose.addEventListener('click', () => {
      this.controlPanel.classList.remove('open');
    });
  }

  public updateStage(stage: number, stageName: string): void {
    const dots = this.stageIndicator.querySelectorAll('.stage-dot');
    dots.forEach((dot: Element, index: number) => {
      if (index <= stage) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
    this.stageLabel.textContent = stageName;
  }

  public static takeSnapshot(canvas: HTMLCanvasElement): void {
    const dataURL = canvas.toDataURL('image/png');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `plant-snapshot-${timestamp}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
