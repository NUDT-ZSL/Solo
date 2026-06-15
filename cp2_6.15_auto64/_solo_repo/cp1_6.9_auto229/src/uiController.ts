import type { ConstellationMode } from './starSystem';

export type ModeChangeCallback = (mode: ConstellationMode) => void;

export class UIController {
  private buttons: HTMLButtonElement[] = [];
  private currentMode: ConstellationMode = 'random';
  private onModeChange: ModeChangeCallback | null = null;
  private hoveredStarId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private isNearParticle: boolean = false;

  public init(canvas: HTMLCanvasElement, onModeChange: ModeChangeCallback): void {
    this.canvas = canvas;
    this.onModeChange = onModeChange;
    this.setupButtons();
    this.setupCursorStyles();
  }

  private setupButtons(): void {
    const btnEls = document.querySelectorAll<HTMLButtonElement>('.mode-btn');
    btnEls.forEach(btn => {
      this.buttons.push(btn);
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as ConstellationMode;
        if (mode && mode !== this.currentMode) {
          this.setActiveMode(mode);
          this.onModeChange?.(mode);
        }
      });
    });
  }

  private setupCursorStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      body {
        cursor: default;
      }
      body.cursor-crosshair {
        cursor: crosshair;
      }
    `;
    document.head.appendChild(style);
  }

  public setActiveMode(mode: ConstellationMode): void {
    this.currentMode = mode;
    this.buttons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public getCurrentMode(): ConstellationMode {
    return this.currentMode;
  }

  public setNearParticle(isNear: boolean): void {
    if (this.isNearParticle !== isNear) {
      this.isNearParticle = isNear;
      document.body.classList.toggle('cursor-crosshair', isNear);
    }
  }

  public setHoveredStar(starId: number | null): void {
    this.hoveredStarId = starId;
    this.setNearParticle(starId !== null);
  }

  public getHoveredStar(): number | null {
    return this.hoveredStarId;
  }

  public triggerClickFeedback(_starId: number): void {
    if (!this.canvas) return;
    this.canvas.animate(
      [
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.25)' },
        { filter: 'brightness(1)' }
      ],
      {
        duration: 220,
        easing: 'ease-out'
      }
    );
  }

  public triggerHoverFeedback(): void {
  }

  public dispose(): void {
    this.buttons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode?.replaceChild(newBtn, btn);
    });
    this.buttons = [];
    document.body.classList.remove('cursor-crosshair');
  }
}
