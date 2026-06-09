export interface UICallbacks {
  onReset: () => void;
  onSpeedToggle: () => void;
}

export class UIManager {
  private controlBar: HTMLElement;
  private resetBtn: HTMLElement;
  private speedBtn: HTMLElement;
  private waveCountEl: HTMLElement;
  private cursorEl: HTMLElement;
  private fadeTimer: number | null;
  private callbacks: UICallbacks;
  private isFaded: boolean;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.fadeTimer = null;
    this.isFaded = false;

    const controlBar = document.getElementById('control-bar');
    const resetBtn = document.getElementById('reset-btn');
    const speedBtn = document.getElementById('speed-btn');
    const waveCountEl = document.getElementById('wave-count');
    const cursorEl = document.getElementById('custom-cursor');

    if (!controlBar || !resetBtn || !speedBtn || !waveCountEl || !cursorEl) {
      throw new Error('UI 元素未找到');
    }

    this.controlBar = controlBar;
    this.resetBtn = resetBtn;
    this.speedBtn = speedBtn;
    this.waveCountEl = waveCountEl;
    this.cursorEl = cursorEl;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onReset();
    });

    this.speedBtn.addEventListener('click', () => {
      this.callbacks.onSpeedToggle();
    });

    this.controlBar.addEventListener('mouseenter', () => {
      this.cancelFade();
      this.show();
    });

    this.controlBar.addEventListener('mouseleave', () => {
      this.scheduleFade();
    });

    document.addEventListener('mousemove', (e) => {
      this.updateCursor(e.clientX, e.clientY);
      if (e.clientY <= 60) {
        this.cancelFade();
        this.show();
      } else if (!this.controlBar.matches(':hover')) {
        if (this.fadeTimer === null && !this.isFaded) {
          this.scheduleFade();
        }
      }
    });
  }

  private scheduleFade(): void {
    this.cancelFade();
    this.fadeTimer = window.setTimeout(() => {
      this.fade();
    }, 500);
  }

  private cancelFade(): void {
    if (this.fadeTimer !== null) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private fade(): void {
    this.controlBar.classList.add('faded');
    this.isFaded = true;
  }

  private show(): void {
    this.controlBar.classList.remove('faded');
    this.isFaded = false;
  }

  public updateWaveCount(count: number): void {
    this.waveCountEl.textContent = String(count);
  }

  public updateSpeedButton(isFast: boolean): void {
    this.speedBtn.textContent = isFast ? '速度: 2x' : '速度: 1x';
  }

  private updateCursor(x: number, y: number): void {
    this.cursorEl.style.left = `${x}px`;
    this.cursorEl.style.top = `${y}px`;
  }
}
