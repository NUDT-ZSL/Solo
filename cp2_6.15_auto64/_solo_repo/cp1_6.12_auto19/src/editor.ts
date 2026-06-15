export type GradientType = 'linear' | 'radial';

export interface GradientState {
  color1: string;
  color2: string;
  angle: number;
  type: GradientType;
}

type Listener = (state: GradientState) => void;

export interface EditorMountOptions {
  container: HTMLElement;
  panel?: HTMLElement | null;
  toggle?: HTMLElement | null;
}

export class GradientEditor {
  private container: HTMLElement;
  private panel: HTMLElement | null = null;
  private toggle: HTMLElement | null = null;
  private state: GradientState;
  private listeners: Set<Listener> = new Set();
  private activeColorField: 'color1' | 'color2' | null = null;

  constructor(mount: HTMLElement | EditorMountOptions, initialState?: Partial<GradientState>) {
    if (mount instanceof HTMLElement) {
      this.container = mount;
    } else {
      this.container = mount.container;
      this.panel = mount.panel ?? null;
      this.toggle = mount.toggle ?? null;
    }
    this.state = {
      color1: initialState?.color1 ?? '#6366f1',
      color2: initialState?.color2 ?? '#00d4ff',
      angle: initialState?.angle ?? 135,
      type: initialState?.type ?? 'linear'
    };
    this.render();
    this.bindEvents();
    this.bindMobileToggle();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="editor-section">
        <div class="section-label">起始色</div>
        <div class="color-input-group" data-field="color1">
          <div class="color-swatch-wrapper">
            <div class="color-swatch" style="background: ${this.state.color1}"></div>
            <input type="color" class="native-color-input" value="${this.state.color1}" />
          </div>
          <div class="color-info">
            <div class="color-tag">主色</div>
            <div class="color-value">${this.state.color1.toUpperCase()}</div>
          </div>
        </div>
        <div class="color-input-group" data-field="color2">
          <div class="color-swatch-wrapper">
            <div class="color-swatch" style="background: ${this.state.color2}"></div>
            <input type="color" class="native-color-input" value="${this.state.color2}" />
          </div>
          <div class="color-info">
            <div class="color-tag">次色</div>
            <div class="color-value">${this.state.color2.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div class="editor-section">
        <div class="section-label">渐变角度</div>
        <div class="slider-container">
          <div class="slider-header">
            <span class="section-label" style="margin-bottom: 0">方向</span>
            <span class="slider-value">${this.state.angle}°</span>
          </div>
          <div class="slider-track">
            <div class="slider-fill" style="width: ${(this.state.angle / 360) * 100}%"></div>
            <div class="slider-thumb" style="left: ${(this.state.angle / 360) * 100}%"></div>
            <input type="range" class="native-range" min="0" max="360" value="${this.state.angle}" />
          </div>
        </div>
      </div>

      <div class="editor-section">
        <div class="section-label">渐变类型</div>
        <div class="type-switch">
          <button class="type-btn ${this.state.type === 'linear' ? 'active' : ''}" data-type="linear">
            <svg class="type-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="20" x2="20" y2="4" />
              <line x1="8" y1="4" x2="20" y2="4" stroke-opacity="0.3" />
              <line x1="4" y1="16" x2="16" y2="16" stroke-opacity="0.3" />
            </svg>
            线性
          </button>
          <button class="type-btn ${this.state.type === 'radial' ? 'active' : ''}" data-type="radial">
            <svg class="type-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="4" stroke-opacity="0.4" />
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
            </svg>
            径向
          </button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const nativeInputs = this.container.querySelectorAll('.native-color-input');
    nativeInputs.forEach((input) => {
      const el = input as HTMLInputElement;
      const group = el.closest('.color-input-group');
      const field = group?.getAttribute('data-field') as 'color1' | 'color2';

      el.addEventListener('input', () => {
        this.updateState({ [field]: el.value });
      });

      el.addEventListener('focus', () => {
        this.activeColorField = field;
        this.updateActiveState();
      });

      el.addEventListener('blur', () => {
        if (this.activeColorField === field) {
          this.activeColorField = null;
          this.updateActiveState();
        }
      });
    });

    const rangeInput = this.container.querySelector('.native-range') as HTMLInputElement | null;
    if (rangeInput) {
      rangeInput.addEventListener('input', () => {
        this.updateState({ angle: Number(rangeInput.value) });
      });
    }

    const typeBtns = this.container.querySelectorAll('.type-btn');
    typeBtns.forEach((btn) => {
      const el = btn as HTMLButtonElement;
      el.addEventListener('click', () => {
        const type = el.getAttribute('data-type') as GradientType;
        this.updateState({ type });
      });
    });
  }

  private bindMobileToggle(): void {
    if (!this.toggle || !this.panel) return;

    this.toggle.setAttribute('role', 'button');
    this.toggle.setAttribute('aria-expanded', 'false');
    this.toggle.setAttribute('aria-label', '展开/折叠编辑面板');

    const closePanel = (): void => {
      this.panel?.classList.remove('open');
      this.toggle?.setAttribute('aria-expanded', 'false');
    };

    this.toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.panel) return;
      const isOpen = this.panel.classList.toggle('open');
      this.toggle?.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanel();
    });

    document.addEventListener('click', (e) => {
      if (!this.panel) return;
      const target = e.target as Node;
      if (this.panel.contains(target) || (this.toggle && this.toggle.contains(target))) return;
      if (window.innerWidth <= 768) closePanel();
    });

    this.container.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        const timer = window.setTimeout(() => closePanel(), 300);
        const cleanup = () => {
          window.clearTimeout(timer);
          document.removeEventListener('click', cleanup, true);
        };
        document.addEventListener('click', cleanup, true);
      }
    });
  }

  private updateActiveState(): void {
    const groups = this.container.querySelectorAll('.color-input-group');
    groups.forEach((group) => {
      const g = group as HTMLElement;
      const field = g.getAttribute('data-field');
      if (field === this.activeColorField) {
        g.classList.add('active');
      } else {
        g.classList.remove('active');
      }
    });
  }

  private updateState(partial: Partial<GradientState>): void {
    const prev = { ...this.state };
    this.state = { ...this.state, ...partial };

    const colorSwatches = this.container.querySelectorAll('.color-swatch');
    const colorValues = this.container.querySelectorAll('.color-value');
    const nativeInputs = this.container.querySelectorAll('.native-color-input');

    if (partial.color1 !== undefined) {
      (colorSwatches[0] as HTMLElement).style.background = this.state.color1;
      (colorValues[0] as HTMLElement).textContent = this.state.color1.toUpperCase();
      (nativeInputs[0] as HTMLInputElement).value = this.state.color1;
    }
    if (partial.color2 !== undefined) {
      (colorSwatches[1] as HTMLElement).style.background = this.state.color2;
      (colorValues[1] as HTMLElement).textContent = this.state.color2.toUpperCase();
      (nativeInputs[1] as HTMLInputElement).value = this.state.color2;
    }

    if (partial.angle !== undefined) {
      const sliderFill = this.container.querySelector('.slider-fill') as HTMLElement | null;
      const sliderThumb = this.container.querySelector('.slider-thumb') as HTMLElement | null;
      const sliderValue = this.container.querySelector('.slider-value') as HTMLElement | null;
      const range = this.container.querySelector('.native-range') as HTMLInputElement | null;
      const pct = (this.state.angle / 360) * 100;
      if (sliderFill) sliderFill.style.width = `${pct}%`;
      if (sliderThumb) sliderThumb.style.left = `${pct}%`;
      if (sliderValue) sliderValue.textContent = `${this.state.angle}°`;
      if (range) range.value = String(this.state.angle);
    }

    if (partial.type !== undefined) {
      const typeBtns = this.container.querySelectorAll('.type-btn');
      typeBtns.forEach((btn) => {
        const b = btn as HTMLButtonElement;
        const t = b.getAttribute('data-type');
        if (t === this.state.type) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    }

    if (JSON.stringify(prev) !== JSON.stringify(this.state)) {
      this.emit();
    }
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  getState(): GradientState {
    return { ...this.state };
  }

  setState(newState: Partial<GradientState>): void {
    this.updateState(newState);
  }

  applyPalette(stored: GradientState): void {
    this.updateState({
      color1: stored.color1,
      color2: stored.color2,
      angle: stored.angle,
      type: stored.type
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  static generateCSS(state: GradientState): string {
    if (state.type === 'radial') {
      return `radial-gradient(circle, ${state.color1} 0%, ${state.color2} 100%)`;
    }
    return `linear-gradient(${state.angle}deg, ${state.color1} 0%, ${state.color2} 100%)`;
  }

  static toBackgroundCSS(state: GradientState): string {
    return `background: ${GradientEditor.generateCSS(state)};`;
  }
}
