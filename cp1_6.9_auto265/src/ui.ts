export interface WeaverStats {
  ribbonCount: number;
  uniqueColors: number;
}

export class UIController {
  private resetBtn: HTMLButtonElement;
  private ribbonCountEl: HTMLElement;
  private colorCountEl: HTMLElement;
  private hintEl: HTMLElement | null;

  private onResetCallback: () => void = () => {};

  private lastRibbon = -1;
  private lastColors = -1;

  private breatheStart = performance.now();
  private breatheRaf = 0;
  private btnBaseScale = 1;

  constructor() {
    const rb = document.getElementById('reset-btn');
    const rc = document.getElementById('ribbon-count');
    const cc = document.getElementById('color-count');
    if (!rb || !rc || !cc) {
      throw new Error('UI 元素缺失，请检查 index.html');
    }
    this.resetBtn = rb as HTMLButtonElement;
    this.ribbonCountEl = rc;
    this.colorCountEl = cc;
    this.hintEl = document.getElementById('hint');

    this.bindReset();
    this.startBreath();
  }

  onReset(cb: () => void): void {
    this.onResetCallback = cb;
  }

  update(stats: WeaverStats): void {
    if (stats.ribbonCount !== this.lastRibbon) {
      this.ribbonCountEl.textContent = String(stats.ribbonCount);
      this.lastRibbon = stats.ribbonCount;
      this.popAnim(this.ribbonCountEl);
      if (stats.ribbonCount > 0 && this.hintEl) {
        this.hintEl.style.transition = 'opacity 0.8s ease';
        this.hintEl.style.opacity = '0';
      } else if (stats.ribbonCount === 0 && this.hintEl) {
        this.hintEl.style.opacity = '0.55';
      }
    }
    if (stats.uniqueColors !== this.lastColors) {
      this.colorCountEl.textContent = String(stats.uniqueColors);
      this.lastColors = stats.uniqueColors;
      this.popAnim(this.colorCountEl);
    }
  }

  resetState(): void {
    this.lastRibbon = -1;
    this.lastColors = -1;
    this.update({ ribbonCount: 0, uniqueColors: 0 });
  }

  private bindReset(): void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    this.resetBtn.addEventListener('click', () => {
      this.resetBtn.animate(
        [
          { transform: `scale(${this.btnBaseScale})` },
          { transform: `scale(${this.btnBaseScale * 0.88})`, offset: 0.4 },
          { transform: `scale(${this.btnBaseScale})` },
        ],
        { duration: 220, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
      );
      this.onResetCallback();
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        this.flashRipple();
      }, 30);
    });
  }

  private flashRipple(): void {
    const ripple = document.createElement('span');
    Object.assign(ripple.style, {
      position: 'absolute',
      inset: '0',
      borderRadius: '50%',
      background: 'rgba(255, 248, 238, 0.45)',
      transform: 'scale(0.4)',
      opacity: '1',
      pointerEvents: 'none',
      transition: 'transform 0.45s ease-out, opacity 0.45s ease-out',
    });
    this.resetBtn.style.position = 'relative';
    this.resetBtn.style.overflow = 'hidden';
    this.resetBtn.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(2.2)';
      ripple.style.opacity = '0';
    });
    setTimeout(() => ripple.remove(), 500);
  }

  private popAnim(el: HTMLElement): void {
    el.animate(
      [
        { transform: 'scale(1)', color: '' },
        { transform: 'scale(1.18)', color: '#a0612a', offset: 0.4 },
        { transform: 'scale(1)', color: '' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' },
    );
  }

  private startBreath(): void {
    const tick = () => {
      const t = (performance.now() - this.breatheStart) / 1000;
      const phase = (t % 6) / 6;
      const s = 1 + 0.025 * Math.sin(phase * Math.PI * 2);
      this.btnBaseScale = s;
      if (!document.timeline || true) {
        this.resetBtn.style.transform = `scale(${s})`;
      }
      this.breatheRaf = requestAnimationFrame(tick);
    };
    this.breatheRaf = requestAnimationFrame(tick);
  }

  destroy(): void {
    if (this.breatheRaf) cancelAnimationFrame(this.breatheRaf);
  }
}
