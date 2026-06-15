export interface UIConfig {
  lineWidth: number;
  glowIntensity: number;
  spiderSpeed: number;
}

export type UIUpdateCallback = (config: UIConfig) => void;
export type ResetCallback = () => void;

export class UIManager {
  private config: UIConfig;
  private onUpdate: UIUpdateCallback | null;
  private onReset: ResetCallback | null;

  private lineWidthSlider: HTMLInputElement;
  private glowIntensitySlider: HTMLInputElement;
  private spiderSpeedSlider: HTMLInputElement;
  private resetBtn: HTMLButtonElement;

  private lineWidthValue: HTMLElement;
  private glowIntensityValue: HTMLElement;
  private spiderSpeedValue: HTMLElement;

  constructor() {
    this.config = {
      lineWidth: 3,
      glowIntensity: 1.0,
      spiderSpeed: 40
    };

    this.onUpdate = null;
    this.onReset = null;

    const lineWidthEl: HTMLElement | null = document.getElementById('lineWidth');
    const glowIntensityEl: HTMLElement | null = document.getElementById('glowIntensity');
    const spiderSpeedEl: HTMLElement | null = document.getElementById('spiderSpeed');
    const resetBtnEl: HTMLElement | null = document.getElementById('resetBtn');

    const lineWidthValueEl: HTMLElement | null = document.getElementById('lineWidthValue');
    const glowIntensityValueEl: HTMLElement | null = document.getElementById('glowIntensityValue');
    const spiderSpeedValueEl: HTMLElement | null = document.getElementById('spiderSpeedValue');

    if (!lineWidthEl || !glowIntensityEl || !spiderSpeedEl || !resetBtnEl ||
        !lineWidthValueEl || !glowIntensityValueEl || !spiderSpeedValueEl) {
      throw new Error('UI elements not found');
    }

    this.lineWidthSlider = lineWidthEl as HTMLInputElement;
    this.glowIntensitySlider = glowIntensityEl as HTMLInputElement;
    this.spiderSpeedSlider = spiderSpeedEl as HTMLInputElement;
    this.resetBtn = resetBtnEl as HTMLButtonElement;

    this.lineWidthValue = lineWidthValueEl;
    this.glowIntensityValue = glowIntensityValueEl;
    this.spiderSpeedValue = spiderSpeedValueEl;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.lineWidthSlider.addEventListener('input', (): void => {
      this.config.lineWidth = parseFloat(this.lineWidthSlider.value);
      this.lineWidthValue.textContent = this.config.lineWidth.toFixed(1);
      this.notifyUpdate();
    });

    this.glowIntensitySlider.addEventListener('input', (): void => {
      this.config.glowIntensity = parseFloat(this.glowIntensitySlider.value);
      this.glowIntensityValue.textContent = this.config.glowIntensity.toFixed(1);
      this.notifyUpdate();
    });

    this.spiderSpeedSlider.addEventListener('input', (): void => {
      this.config.spiderSpeed = parseFloat(this.spiderSpeedSlider.value);
      this.spiderSpeedValue.textContent = this.config.spiderSpeed.toFixed(0);
      this.notifyUpdate();
    });

    this.resetBtn.addEventListener('click', (): void => {
      if (this.onReset) {
        this.onReset();
      }
    });
  }

  private notifyUpdate(): void {
    if (this.onUpdate) {
      this.onUpdate({ ...this.config });
    }
  }

  public setUpdateCallback(callback: UIUpdateCallback): void {
    this.onUpdate = callback;
  }

  public setResetCallback(callback: ResetCallback): void {
    this.onReset = callback;
  }

  public getConfig(): UIConfig {
    return { ...this.config };
  }

  public updateSpiderSpeedDisplay(speed: number): void {
    this.config.spiderSpeed = speed;
    this.spiderSpeedSlider.value = speed.toString();
    this.spiderSpeedValue.textContent = speed.toFixed(0);
  }
}
