export interface UIParams {
  auroraSpeed: number;
  crystalOpacity: number;
  particleCount: number;
}

export interface UICallbacks {
  onAuroraSpeedChange: (speed: number) => void;
  onCrystalOpacityChange: (opacity: number) => void;
  onParticleCountChange: (count: number) => void;
  onReset: () => void;
}

export class UI {
  fpsElement: HTMLElement;
  crystalCountElement: HTMLElement;
  auroraSpeedInput: HTMLInputElement;
  auroraSpeedValue: HTMLElement;
  crystalOpacityInput: HTMLInputElement;
  crystalOpacityValue: HTMLElement;
  particleCountInput: HTMLInputElement;
  particleCountValue: HTMLElement;
  resetButton: HTMLButtonElement;
  statusPanel: HTMLElement;
  controlPanel: HTMLElement;
  callbacks: UICallbacks;
  fpsFrames: number;
  fpsLastTime: number;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.fpsFrames = 0;
    this.fpsLastTime = performance.now();

    this.fpsElement = document.getElementById('fps-value')!;
    this.crystalCountElement = document.getElementById('crystal-count')!;
    this.auroraSpeedInput = document.getElementById('aurora-speed') as HTMLInputElement;
    this.auroraSpeedValue = document.getElementById('speed-value')!;
    this.crystalOpacityInput = document.getElementById('crystal-opacity') as HTMLInputElement;
    this.crystalOpacityValue = document.getElementById('opacity-value')!;
    this.particleCountInput = document.getElementById('particle-count') as HTMLInputElement;
    this.particleCountValue = document.getElementById('particle-value')!;
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;
    this.statusPanel = document.getElementById('status-panel')!;
    this.controlPanel = document.getElementById('control-panel')!;

    this.bindEvents();
  }

  bindEvents(): void {
    this.auroraSpeedInput.addEventListener('input', () => {
      const value = parseFloat(this.auroraSpeedInput.value);
      this.auroraSpeedValue.textContent = value.toFixed(1) + 'x';
      this.callbacks.onAuroraSpeedChange(value);
    });

    this.crystalOpacityInput.addEventListener('input', () => {
      const value = parseFloat(this.crystalOpacityInput.value);
      this.crystalOpacityValue.textContent = value.toFixed(2);
      this.callbacks.onCrystalOpacityChange(value);
    });

    this.particleCountInput.addEventListener('input', () => {
      const value = parseInt(this.particleCountInput.value);
      this.particleCountValue.textContent = value.toString();
      this.callbacks.onParticleCountChange(value);
    });

    this.resetButton.addEventListener('click', () => {
      this.auroraSpeedInput.value = '1.0';
      this.auroraSpeedValue.textContent = '1.0x';
      this.crystalOpacityInput.value = '0.4';
      this.crystalOpacityValue.textContent = '0.40';
      this.particleCountInput.value = '25';
      this.particleCountValue.textContent = '25';
      this.callbacks.onReset();
    });
  }

  updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    const elapsed = now - this.fpsLastTime;

    if (elapsed >= 500) {
      const fps = Math.round((this.fpsFrames * 1000) / elapsed);
      this.fpsElement.textContent = fps.toString();
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  updateCrystalCount(count: number): void {
    this.crystalCountElement.textContent = count.toString();
  }

  updateAuroraColor(color: { r: number; g: number; b: number }): void {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    this.controlPanel.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
    this.statusPanel.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
  }

  getParams(): UIParams {
    return {
      auroraSpeed: parseFloat(this.auroraSpeedInput.value),
      crystalOpacity: parseFloat(this.crystalOpacityInput.value),
      particleCount: parseInt(this.particleCountInput.value)
    };
  }
}
