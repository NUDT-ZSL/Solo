import { eventBus, Events, FractalParams, ToastMessage } from './EventBus';

const DEBOUNCE_MS = 300;
const MIN_ITER = 64;
const MAX_ITER = 512;

const COLOR_MAP_LABELS: Record<string, string> = {
  flame: '🔥 火焰',
  ocean: '🌊 海洋',
  camo: '🌿 迷彩',
  neon: '✨ 霓虹',
};

export class ControlPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private drawerHandle: HTMLElement | null = null;
  private isExpanded = true;
  private isMobile = false;

  private params: FractalParams = {
    cReal: -0.5,
    cImag: 0.0,
    maxIterations: 128,
    colorMap: 'flame',
  };

  private debounceTimers: Record<string, number | null> = {
    cReal: null,
    cImag: null,
  };

  private calculating = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.checkMobile();
    this.render();
    this.bindEvents();
    this.setupEventBusListeners();
    window.addEventListener('resize', this.onResize);
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private onResize = (): void => {
    const wasMobile = this.isMobile;
    this.checkMobile();
    if (wasMobile !== this.isMobile) {
      this.render();
      this.bindEvents();
    }
  };

  private setupEventBusListeners(): void {
    eventBus.on<boolean>(Events.FRACTAL_CALCULATING, (calc) => {
      this.calculating = calc;
      this.updateCalculatingState();
    });

    eventBus.on<ToastMessage>(Events.SHOW_TOAST, (msg) => {
      this.showToast(msg.message, msg.type, msg.duration);
    });
  }

  private updateCalculatingState(): void {
    const statusEl = this.panel.querySelector('.ff-status-dot');
    const statusText = this.panel.querySelector('.ff-status-text');
    if (statusEl) {
      statusEl.classList.toggle('ff-calculating', this.calculating);
    }
    if (statusText) {
      (statusText as HTMLElement).textContent = this.calculating ? '计算中...' : '就绪';
    }
  }

  private render(): void {
    this.container.innerHTML = '';

    if (this.isMobile) {
      this.renderMobile();
    } else {
      this.renderDesktop();
    }
  }

  private renderDesktop(): void {
    this.panel = document.createElement('aside');
    this.panel.className = 'ff-control-panel ff-desktop';
    this.panel.innerHTML = this.getPanelContent();
    this.container.appendChild(this.panel);
    this.isExpanded = true;
  }

  private renderMobile(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'ff-mobile-drawer';

    this.drawerHandle = document.createElement('button');
    this.drawerHandle.className = 'ff-drawer-handle';
    this.drawerHandle.innerHTML = `
      <span class="ff-drawer-icon">⚙️</span>
      <span class="ff-drawer-title">参数控制</span>
      <span class="ff-drawer-arrow">▲</span>
    `;

    this.panel = document.createElement('div');
    this.panel.className = 'ff-control-panel ff-mobile';
    this.panel.innerHTML = this.getPanelContent();
    this.panel.style.display = 'none';

    wrapper.appendChild(this.drawerHandle);
    wrapper.appendChild(this.panel);
    this.container.appendChild(wrapper);
  }

  private getPanelContent(): string {
    const iterPercent =
      ((this.params.maxIterations - MIN_ITER) / (MAX_ITER - MIN_ITER)) * 100;

    return `
      <div class="ff-panel-header">
        <h2 class="ff-panel-title">FractalForge</h2>
        <div class="ff-status">
          <span class="ff-status-dot ${this.calculating ? 'ff-calculating' : ''}"></span>
          <span class="ff-status-text">${this.calculating ? '计算中...' : '就绪'}</span>
        </div>
      </div>

      <div class="ff-panel-body">
        <div class="ff-section">
          <h3 class="ff-section-title">复数参数 c</h3>
          <div class="ff-input-row">
            <div class="ff-input-group">
              <label class="ff-input-label">实部 (Re)</label>
              <input
                type="text"
                class="ff-number-input"
                data-param="cReal"
                value="${this.params.cReal}"
              />
            </div>
            <div class="ff-input-group">
              <label class="ff-input-label">虚部 (Im)</label>
              <input
                type="text"
                class="ff-number-input"
                data-param="cImag"
                value="${this.params.cImag}"
              />
            </div>
          </div>
          <p class="ff-input-hint">Julia 集参数，实时生效</p>
        </div>

        <div class="ff-section">
          <h3 class="ff-section-title">最大迭代次数</h3>
          <div class="ff-slider-group">
            <input
              type="range"
              class="ff-slider"
              min="${MIN_ITER}"
              max="${MAX_ITER}"
              value="${this.params.maxIterations}"
              step="1"
            />
            <div class="ff-slider-value">${this.params.maxIterations}</div>
          </div>
          <div class="ff-slider-track">
            <div class="ff-slider-fill" style="width: ${iterPercent}%"></div>
          </div>
          <div class="ff-slider-labels">
            <span>${MIN_ITER}</span>
            <span>${MAX_ITER}</span>
          </div>
        </div>

        <div class="ff-section">
          <h3 class="ff-section-title">颜色映射</h3>
          <select class="ff-select" data-param="colorMap">
            ${Object.entries(COLOR_MAP_LABELS)
              .map(
                ([key, label]) =>
                  `<option value="${key}" ${
                    this.params.colorMap === key ? 'selected' : ''
                  }>${label}</option>`
              )
              .join('')}
          </select>
        </div>

        <div class="ff-section ff-actions">
          <button class="ff-reset-btn" type="button">
            重置视角
          </button>
        </div>
      </div>

      <div class="ff-panel-footer">
        <span class="ff-version">v0.1.0</span>
      </div>

      <div class="ff-toast-container"></div>
    `;
  }

  private bindEvents(): void {
    const numberInputs = this.panel.querySelectorAll<HTMLInputElement>(
      '.ff-number-input'
    );
    numberInputs.forEach((input) => {
      input.addEventListener('input', this.onNumberInput);
      input.addEventListener('blur', this.onNumberBlur);
      input.addEventListener('keydown', this.onNumberKeyDown);
    });

    const slider = this.panel.querySelector<HTMLInputElement>('.ff-slider');
    if (slider) {
      slider.addEventListener('input', this.onSliderInput);
      slider.addEventListener('change', this.onSliderChange);
    }

    const select = this.panel.querySelector<HTMLSelectElement>('.ff-select');
    if (select) {
      select.addEventListener('change', this.onSelectChange);
    }

    const resetBtn = this.panel.querySelector<HTMLButtonElement>('.ff-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', this.onResetClick);
    }

    if (this.drawerHandle && this.isMobile) {
      this.drawerHandle.addEventListener('click', this.toggleDrawer);
    }
  }

  private onNumberInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const param = input.dataset.param as keyof FractalParams;
    const value = input.value;

    if (!this.validateNumber(value)) {
      input.classList.add('ff-input-error');
    } else {
      input.classList.remove('ff-input-error');
    }

    if (this.debounceTimers[param]) {
      clearTimeout(this.debounceTimers[param]!);
    }

    this.debounceTimers[param] = window.setTimeout(() => {
      if (this.validateNumber(value)) {
        const num = parseFloat(value);
        (this.params as Record<string, number>)[param] = num;
        this.emitParams();
      } else {
        this.showToast('请输入有效的数字', 'error');
      }
    }, DEBOUNCE_MS);
  };

  private onNumberBlur = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const param = input.dataset.param as keyof FractalParams;
    const value = input.value;

    if (!this.validateNumber(value)) {
      input.classList.add('ff-input-error');
      this.showToast('请输入有效的数字', 'error');
      input.value = String(this.params[param as 'cReal' | 'cImag']);
      input.classList.remove('ff-input-error');
    }
  };

  private onNumberKeyDown = (e: KeyboardEvent): void => {
    const allowed = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Enter',
      '-',
      '.',
      'e',
      'E',
    ];
    if (
      allowed.includes(e.key) ||
      (e.key >= '0' && e.key <= '9') ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    e.preventDefault();
    const input = e.target as HTMLInputElement;
    input.classList.add('ff-input-error');
    setTimeout(() => input.classList.remove('ff-input-error'), 300);
  };

  private validateNumber(value: string): boolean {
    if (value === '' || value === '-' || value === '.') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }

  private onSliderInput = (e: Event): void => {
    const slider = e.target as HTMLInputElement;
    const value = parseInt(slider.value, 10);
    this.params.maxIterations = value;

    const valueEl = this.panel.querySelector('.ff-slider-value');
    if (valueEl) valueEl.textContent = String(value);

    const fill = this.panel.querySelector('.ff-slider-fill');
    if (fill) {
      const percent = ((value - MIN_ITER) / (MAX_ITER - MIN_ITER)) * 100;
      (fill as HTMLElement).style.width = `${percent}%`;
    }
  };

  private onSliderChange = (): void => {
    this.emitParams();
  };

  private onSelectChange = (e: Event): void => {
    const select = e.target as HTMLSelectElement;
    this.params.colorMap = select.value as FractalParams['colorMap'];
    this.emitParams();
    this.animateSelectChange();
  };

  private animateSelectChange(): void {
    const select = this.panel.querySelector('.ff-select');
    if (select) {
      select.classList.add('ff-fade-out');
      setTimeout(() => {
        select.classList.remove('ff-fade-out');
        select.classList.add('ff-fade-in');
        setTimeout(() => select.classList.remove('ff-fade-in'), 300);
      }, 150);
    }
  }

  private onResetClick = (): void => {
    eventBus.emit(Events.RESET_VIEW);
  };

  private toggleDrawer = (): void => {
    this.isExpanded = !this.isExpanded;
    if (this.panel) {
      if (this.isExpanded) {
        this.panel.style.display = 'block';
        requestAnimationFrame(() => {
          this.panel.classList.add('ff-drawer-open');
          this.panel.classList.remove('ff-drawer-closed');
        });
      } else {
        this.panel.classList.add('ff-drawer-closed');
        this.panel.classList.remove('ff-drawer-open');
        setTimeout(() => {
          if (!this.isExpanded) {
            this.panel.style.display = 'none';
          }
        }, 300);
      }
    }
    if (this.drawerHandle) {
      const arrow = this.drawerHandle.querySelector('.ff-drawer-arrow');
      if (arrow) {
        (arrow as HTMLElement).style.transform = this.isExpanded
          ? 'rotate(180deg)'
          : 'rotate(0deg)';
      }
    }
  };

  private emitParams(): void {
    eventBus.emit(Events.PARAMS_UPDATED, { ...this.params });
  }

  private showToast(
    message: string,
    type: 'info' | 'error' | 'success' = 'info',
    duration = 2500
  ): void {
    const container = this.panel.querySelector('.ff-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `ff-toast ff-toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('ff-toast-show');
    });

    setTimeout(() => {
      toast.classList.remove('ff-toast-show');
      toast.classList.add('ff-toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  setParams(params: FractalParams): void {
    this.params = { ...params };
    this.render();
    this.bindEvents();
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    Object.values(this.debounceTimers).forEach((t) => {
      if (t) clearTimeout(t);
    });
    this.container.innerHTML = '';
  }
}
