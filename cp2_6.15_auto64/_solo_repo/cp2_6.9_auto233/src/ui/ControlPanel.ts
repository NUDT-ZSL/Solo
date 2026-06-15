import { EventBus } from '../events/EventBus';

export class ControlPanel {
  private intensitySlider: HTMLInputElement;
  private intensityValue: HTMLSpanElement;
  private colorSpeedSlider: HTMLInputElement;
  private colorSpeedValue: HTMLSpanElement;
  private panel: HTMLElement;

  constructor() {
    this.panel = document.getElementById('control-panel')!;
    this.intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    this.intensityValue = document.getElementById('intensity-value') as HTMLSpanElement;
    this.colorSpeedSlider = document.getElementById('color-speed-slider') as HTMLInputElement;
    this.colorSpeedValue = document.getElementById('color-speed-value') as HTMLSpanElement;

    this.bindEvents();
    this.showPanelWithDelay();
  }

  private bindEvents(): void {
    this.intensitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.intensityValue.textContent = value.toString();
      EventBus.emit('intensityChanged', value);
    });

    this.colorSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.colorSpeedValue.textContent = value.toFixed(1);
      EventBus.emit('colorSpeedChanged', value);
    });
  }

  private showPanelWithDelay(): void {
    setTimeout(() => {
      this.panel.classList.add('visible');
    }, 100);
  }

  getIntensity(): number {
    return parseFloat(this.intensitySlider.value);
  }

  getColorSpeed(): number {
    return parseFloat(this.colorSpeedSlider.value);
  }
}
