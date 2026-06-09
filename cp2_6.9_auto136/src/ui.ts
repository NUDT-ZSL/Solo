import { FULL_PALETTE } from './pixel';

export interface UIEvents {
  onColorSelect: (color: string) => void;
  onAudioToggle: () => void;
  onClear: () => void;
}

export class UIManager {
  private toolbar: HTMLElement;
  private paletteContainer: HTMLElement;
  private audioToggleBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private spectrumContainer: HTMLElement;
  private spectrumBars: HTMLElement[] = [];
  private selectedColor: string = FULL_PALETTE[0];
  private events: UIEvents;
  private manualMode: boolean = false;

  constructor(events: UIEvents) {
    this.events = events;

    const toolbar = document.getElementById('toolbar');
    const paletteContainer = document.getElementById('palette');
    const audioToggleBtn = document.getElementById('audio-toggle');
    const clearBtn = document.getElementById('clear-btn');
    const spectrumContainer = document.getElementById('spectrum');

    if (!toolbar || !paletteContainer || !audioToggleBtn || !clearBtn || !spectrumContainer) {
      throw new Error('UI 元素未找到');
    }

    this.toolbar = toolbar;
    this.paletteContainer = paletteContainer;
    this.audioToggleBtn = audioToggleBtn as HTMLButtonElement;
    this.clearBtn = clearBtn as HTMLButtonElement;
    this.spectrumContainer = spectrumContainer;

    this.initPalette();
    this.initSpectrum();
    this.bindEvents();

    setTimeout(() => {
      this.toolbar.classList.add('visible');
    }, 300);
  }

  private initPalette(): void {
    FULL_PALETTE.forEach((color, index) => {
      const dot = document.createElement('div');
      dot.className = 'color-dot';
      dot.style.backgroundColor = color;
      dot.dataset.color = color;
      if (index === 0) {
        dot.classList.add('selected');
      }
      dot.addEventListener('click', () => {
        this.selectColor(color, dot);
      });
      this.paletteContainer.appendChild(dot);
    });
  }

  private initSpectrum(): void {
    const barCount = 64;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'spectrum-bar';
      bar.style.height = '2px';
      this.spectrumContainer.appendChild(bar);
      this.spectrumBars.push(bar);
    }
  }

  private bindEvents(): void {
    this.audioToggleBtn.addEventListener('click', () => {
      this.events.onAudioToggle();
    });

    this.clearBtn.addEventListener('click', () => {
      this.events.onClear();
    });
  }

  private selectColor(color: string, dot: HTMLElement): void {
    this.selectedColor = color;
    this.manualMode = true;

    const dots = this.paletteContainer.querySelectorAll('.color-dot');
    dots.forEach((d) => d.classList.remove('selected'));
    dot.classList.add('selected');

    this.events.onColorSelect(color);
  }

  public getSelectedColor(): string | null {
    return this.manualMode ? this.selectedColor : null;
  }

  public setAudioState(active: boolean): void {
    if (active) {
      this.audioToggleBtn.classList.add('on');
      this.audioToggleBtn.textContent = '音频开启';
      this.spectrumContainer.classList.add('visible');
    } else {
      this.audioToggleBtn.classList.remove('on');
      this.audioToggleBtn.textContent = '音频关闭';
      this.spectrumContainer.classList.remove('visible');
    }
  }

  public updateSpectrum(values: number[]): void {
    if (values.length === 0) return;

    const step = values.length / this.spectrumBars.length;
    for (let i = 0; i < this.spectrumBars.length; i++) {
      const idx = Math.floor(i * step);
      const val = values[idx] || 0;
      const height = Math.max(2, val * 40);
      this.spectrumBars[i].style.height = height + 'px';
    }
  }

  public triggerFlash(): void {
    const overlay = document.getElementById('flash-overlay');
    if (!overlay) return;

    overlay.classList.add('active');
    setTimeout(() => {
      overlay.classList.remove('active');
    }, 200);
  }
}
