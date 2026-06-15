import type { GalaxyParams, SelectedParticle } from './galaxy';

export interface ControlCallbacks {
  onParamsChange: (params: Partial<GalaxyParams>) => void;
}

export class Controls {
  private callbacks: ControlCallbacks;

  private particleCountInput: HTMLInputElement;
  private rotationSpeedInput: HTMLInputElement;
  private armWidthInput: HTMLInputElement;
  private colorPickerBtn: HTMLButtonElement;
  private colorPresets: NodeListOf<HTMLDivElement>;
  private colorPreview: HTMLElement;
  private colorHex: HTMLElement;
  private countValue: HTMLElement;
  private speedValue: HTMLElement;
  private armValue: HTMLElement;
  private particleInfoContent: HTMLElement;
  private nativeColorInput: HTMLInputElement | null = null;

  private currentColor: string = '#FC8181';

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;

    this.particleCountInput = document.getElementById('particleCount') as HTMLInputElement;
    this.rotationSpeedInput = document.getElementById('rotationSpeed') as HTMLInputElement;
    this.armWidthInput = document.getElementById('armWidth') as HTMLInputElement;
    this.colorPickerBtn = document.getElementById('colorPickerBtn') as HTMLButtonElement;
    this.colorPreview = document.getElementById('colorPreview') as HTMLElement;
    this.colorHex = document.getElementById('colorHex') as HTMLElement;
    this.countValue = document.getElementById('countValue') as HTMLElement;
    this.speedValue = document.getElementById('speedValue') as HTMLElement;
    this.armValue = document.getElementById('armValue') as HTMLElement;
    this.particleInfoContent = document.getElementById('particleInfoContent') as HTMLElement;
    this.colorPresets = document.querySelectorAll('.color-preset');

    this.bindEvents();
  }

  private bindEvents(): void {
    this.particleCountInput.addEventListener('input', () => {
      const value = parseInt(this.particleCountInput.value, 10);
      this.countValue.textContent = value.toString();
      this.callbacks.onParamsChange({ particleCount: value });
    });

    this.rotationSpeedInput.addEventListener('input', () => {
      const value = parseFloat(this.rotationSpeedInput.value);
      this.speedValue.textContent = value.toFixed(2);
      this.callbacks.onParamsChange({ rotationSpeed: value });
    });

    this.armWidthInput.addEventListener('input', () => {
      const value = parseFloat(this.armWidthInput.value);
      this.armValue.textContent = value.toFixed(1);
      this.callbacks.onParamsChange({ armWidth: value });
    });

    this.colorPresets.forEach((preset) => {
      preset.addEventListener('click', () => {
        const color = preset.getAttribute('data-color');
        if (color) {
          this.setColor(color);
        }
      });
    });

    this.colorPickerBtn.addEventListener('click', () => {
      this.openNativeColorPicker();
    });
  }

  private openNativeColorPicker(): void {
    if (!this.nativeColorInput) {
      this.nativeColorInput = document.createElement('input');
      this.nativeColorInput.type = 'color';
      this.nativeColorInput.value = this.currentColor;
      this.nativeColorInput.style.position = 'absolute';
      this.nativeColorInput.style.visibility = 'hidden';
      this.nativeColorInput.style.pointerEvents = 'none';
      document.body.appendChild(this.nativeColorInput);

      this.nativeColorInput.addEventListener('input', () => {
        if (this.nativeColorInput) {
          this.setColor(this.nativeColorInput.value);
        }
      });
    }

    this.nativeColorInput.value = this.currentColor;
    this.nativeColorInput.click();
  }

  private setColor(color: string): void {
    this.currentColor = color;
    this.colorPreview.style.background = color;
    this.colorHex.textContent = color.toUpperCase();

    this.colorPresets.forEach((preset) => {
      const presetColor = preset.getAttribute('data-color');
      if (presetColor && presetColor.toLowerCase() === color.toLowerCase()) {
        preset.classList.add('active');
      } else {
        preset.classList.remove('active');
      }
    });

    this.callbacks.onParamsChange({ outerColor: color });
  }

  public updateParticleInfo(particle: SelectedParticle | null): void {
    if (!particle) {
      this.particleInfoContent.innerHTML =
        '<p class="no-selection">点击星系中的粒子查看详情</p>';
      return;
    }

    const x = particle.position.x.toFixed(2);
    const y = particle.position.y.toFixed(2);
    const z = particle.position.z.toFixed(2);
    const hex = '#' + particle.color.getHexString().toUpperCase();

    this.particleInfoContent.innerHTML = `
      <div class="info-row">
        <span class="label">X 坐标</span>
        <span>${x}</span>
      </div>
      <div class="info-row">
        <span class="label">Y 坐标</span>
        <span>${y}</span>
      </div>
      <div class="info-row">
        <span class="label">Z 坐标</span>
        <span>${z}</span>
      </div>
      <div class="info-row">
        <span class="label">颜色</span>
        <span style="color: ${hex};">${hex}</span>
      </div>
    `;
  }
}
