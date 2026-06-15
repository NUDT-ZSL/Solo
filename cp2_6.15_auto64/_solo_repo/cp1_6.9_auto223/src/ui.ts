import { KaleidoscopeCore } from './kaleidoscopeCore';

export type SymmetryMode = 6 | 8 | 12;

export interface UIOptions {
  container: HTMLElement;
  kaleidoscope: KaleidoscopeCore;
  initialSymmetry?: SymmetryMode;
  onSymmetryChange?: (mode: SymmetryMode) => void;
}

export class UIManager {
  private container: HTMLElement;
  private kaleidoscope: KaleidoscopeCore;
  private currentSymmetry: SymmetryMode;
  private onSymmetryChange?: (mode: SymmetryMode) => void;

  private panel!: HTMLDivElement;
  private buttons: Map<SymmetryMode, HTMLButtonElement> = new Map();

  constructor(options: UIOptions) {
    this.container = options.container;
    this.kaleidoscope = options.kaleidoscope;
    this.currentSymmetry = options.initialSymmetry ?? 6;
    this.onSymmetryChange = options.onSymmetryChange;

    this.buildPanel();
  }

  private buildPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'glass-panel';

    const label = document.createElement('div');
    label.className = 'panel-label';
    label.textContent = '对称模式';
    this.panel.appendChild(label);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';
    this.panel.appendChild(btnGroup);

    const modes: { mode: SymmetryMode; label: string }[] = [
      { mode: 6, label: '6 重' },
      { mode: 8, label: '8 重' },
      { mode: 12, label: '12 重' }
    ];

    modes.forEach(({ mode, label }) => {
      const btn = document.createElement('button');
      btn.className = 'symmetry-btn';
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.mode = String(mode);

      btn.addEventListener('click', () => this.handleSymmetryClick(mode));

      this.buttons.set(mode, btn);
      btnGroup.appendChild(btn);
    });

    this.updateActiveButton();
    this.kaleidoscope.setSymmetry(this.currentSymmetry);
    this.container.appendChild(this.panel);
  }

  private handleSymmetryClick(mode: SymmetryMode): void {
    if (mode === this.currentSymmetry) return;
    this.currentSymmetry = mode;
    this.kaleidoscope.setSymmetry(mode);
    this.updateActiveButton();

    if (this.onSymmetryChange) {
      this.onSymmetryChange(mode);
    }
  }

  private updateActiveButton(): void {
    this.buttons.forEach((btn, mode) => {
      if (mode === this.currentSymmetry) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public getCurrentSymmetry(): SymmetryMode {
    return this.currentSymmetry;
  }

  public dispose(): void {
    this.buttons.forEach(btn => {
      const clone = btn.cloneNode(true) as HTMLButtonElement;
      btn.parentNode?.replaceChild(clone, btn);
    });
    this.buttons.clear();
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
  }
}
