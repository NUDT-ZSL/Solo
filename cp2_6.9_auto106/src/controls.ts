import { PALETTE, RGB } from './watercolor';

export interface ControlCallbacks {
  onColorSelect: (color: RGB) => void;
  onDiffusionSpeedChange: (speed: number) => void;
  onOpacityChange: (opacity: number) => void;
  onPaperIntensityChange: (intensity: number) => void;
  onClear: () => void;
  onSave: () => void;
}

export class Controls {
  private selectedColorIndex: number = 0;
  private callbacks: ControlCallbacks;

  private paletteEl: HTMLElement;
  private diffusionSlider: HTMLInputElement;
  private diffusionValue: HTMLElement;
  private opacitySlider: HTMLInputElement;
  private opacityValue: HTMLElement;
  private paperSlider: HTMLInputElement;
  private paperValue: HTMLElement;
  private clearBtn: HTMLButtonElement;
  private saveBtn: HTMLButtonElement;

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;

    this.paletteEl = document.getElementById('palette') as HTMLElement;
    this.diffusionSlider = document.getElementById('diffusion-speed') as HTMLInputElement;
    this.diffusionValue = document.getElementById('diffusion-value') as HTMLElement;
    this.opacitySlider = document.getElementById('opacity') as HTMLInputElement;
    this.opacityValue = document.getElementById('opacity-value') as HTMLElement;
    this.paperSlider = document.getElementById('paper-intensity') as HTMLInputElement;
    this.paperValue = document.getElementById('paper-value') as HTMLElement;
    this.clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    this.saveBtn = document.getElementById('save-btn') as HTMLButtonElement;

    this.buildPalette();
    this.bindEvents();
  }

  private buildPalette(): void {
    this.paletteEl.innerHTML = '';
    PALETTE.forEach((color, index) => {
      const div = document.createElement('div');
      div.className = 'palette-color';
      if (index === this.selectedColorIndex) {
        div.classList.add('selected');
      }
      div.style.background = color.hex;
      div.title = color.name;
      div.dataset.index = String(index);
      div.addEventListener('click', () => this.selectColor(index));
      this.paletteEl.appendChild(div);
    });
  }

  private selectColor(index: number): void {
    this.selectedColorIndex = index;
    const colors = this.paletteEl.querySelectorAll('.palette-color');
    colors.forEach((el, i) => {
      if (i === index) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
    this.callbacks.onColorSelect(PALETTE[index].rgb);
  }

  getSelectedColor(): RGB {
    return PALETTE[this.selectedColorIndex].rgb;
  }

  private bindEvents(): void {
    this.diffusionSlider.addEventListener('input', () => {
      const value = parseFloat(this.diffusionSlider.value);
      this.diffusionValue.textContent = `${value.toFixed(1)}x`;
      this.callbacks.onDiffusionSpeedChange(value);
    });

    this.opacitySlider.addEventListener('input', () => {
      const value = parseFloat(this.opacitySlider.value);
      this.opacityValue.textContent = value.toFixed(2);
      this.callbacks.onOpacityChange(value);
    });

    this.paperSlider.addEventListener('input', () => {
      const value = parseInt(this.paperSlider.value, 10);
      this.paperValue.textContent = `${value}%`;
      this.callbacks.onPaperIntensityChange(value / 100);
    });

    this.clearBtn.addEventListener('click', () => {
      this.callbacks.onClear();
    });

    this.saveBtn.addEventListener('click', () => {
      this.callbacks.onSave();
    });
  }
}
