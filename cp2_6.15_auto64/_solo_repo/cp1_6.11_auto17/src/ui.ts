export type MaterialType = 'water' | 'metal' | 'glass' | 'leaf';

export interface MaterialConfig {
  id: MaterialType;
  name: string;
  color: string;
  label: string;
  icon: string;
}

export const MATERIALS: Record<MaterialType, MaterialConfig> = {
  water: { id: 'water', name: 'water', color: '#4A90D9', label: '水面', icon: '💧' },
  metal: { id: 'metal', name: 'metal', color: '#C0C0C0', label: '金属', icon: '🔩' },
  glass: { id: 'glass', name: 'glass', color: '#B0E0E6', label: '玻璃', icon: '🔮' },
  leaf:  { id: 'leaf',  name: 'leaf',  color: '#228B22', label: '树叶', icon: '🍃' }
};

export interface UIEventMap {
  'material:change': MaterialType;
  'speed:change': number;
  'count:change': number;
  'scene:reset': void;
}

type EventCallback<T = any> = (data: T) => void;

export class EventEmitter<E extends Record<string, any>> {
  private listeners: Map<keyof E, Set<EventCallback>> = new Map();

  on<K extends keyof E>(event: K, callback: (data: E[K]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    return this;
  }

  off<K extends keyof E>(event: K, callback: (data: E[K]) => void): this {
    this.listeners.get(event)?.delete(callback as EventCallback);
    return this;
  }

  emit<K extends keyof E>(event: K, data: E[K]): this {
    this.listeners.get(event)?.forEach(cb => cb(data));
    return this;
  }
}

export interface UIControlParams {
  container: HTMLElement;
  initialMaterial: MaterialType;
  initialSpeed: number;
  initialCount: number;
  speedRange: [number, number];
  countRange: [number, number];
}

const GLOW_COLOR = '#e94560';
const GLOW_RADIUS_PX = 8;
const DESKTOP_PANEL_WIDTH = 220;
const MOBILE_BAR_HEIGHT = 80;
const MOBILE_ICON_SIZE = 32;
const DESKTOP_ICON_SIZE = 40;

export class UIController extends EventEmitter<UIEventMap> {
  private params: UIControlParams;
  private panel!: HTMLDivElement;
  private materialButtons: Map<MaterialType, HTMLButtonElement> = new Map();
  private materialLabels: Map<MaterialType, HTMLSpanElement> = new Map();
  private speedSlider!: HTMLInputElement;
  private countSlider!: HTMLInputElement;
  private speedValue!: HTMLSpanElement;
  private countValue!: HTMLSpanElement;
  private speedLabelEl!: HTMLSpanElement;
  private countLabelEl!: HTMLSpanElement;
  private speedGroupEl!: HTMLDivElement;
  private countGroupEl!: HTMLDivElement;
  private panelTitle!: HTMLHeadingElement;
  private resetBtn!: HTMLButtonElement;

  private mobilePopup: HTMLDivElement | null = null;
  private activePopup: 'speed' | 'count' | null = null;
  private currentLayout: 'desktop' | 'mobile' | null = null;

  constructor(params: UIControlParams) {
    super();
    this.params = params;
    this.injectGlobalStyles();
    this.build();
    this.bindEvents();
    this.setupResponsive();
  }

  private injectGlobalStyles(): void {
    const id = 'rain-tales-ui-styles';
    if (document.getElementById(id)) return;
    const css = `
      #control-panel * { box-sizing: border-box; }

      .mat-btn {
        position: relative;
        border: none;
        cursor: pointer;
        border-radius: 50%;
        padding: 0;
        outline: none;
        transition: all 0.2s ease-out;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mat-btn .inner {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        transition: all 0.2s ease-out;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1em;
      }
      .mat-btn.inactive {
        opacity: 0.5;
        transform: scale(1);
        filter: none;
      }
      .mat-btn.inactive:hover {
        opacity: 0.8;
      }
      .mat-btn.active {
        opacity: 1;
        transform: scale(1.1);
        filter: drop-shadow(0 0 ${GLOW_RADIUS_PX}px ${GLOW_COLOR})
                drop-shadow(0 0 ${GLOW_RADIUS_PX * 1.5}px ${GLOW_COLOR})
                drop-shadow(0 0 ${GLOW_RADIUS_PX * 2}px rgba(233,69,96,0.6));
      }
      .mat-btn.active .inner {
        box-shadow: 0 0 ${GLOW_RADIUS_PX}px ${GLOW_COLOR},
                    inset 0 0 4px rgba(255,255,255,0.4);
      }

      .custom-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
        transition: all 0.2s ease-out;
      }
      .custom-slider::-webkit-slider-runnable-track {
        height: 4px;
        background: linear-gradient(to right, ${GLOW_COLOR} var(--val,50%), rgba(255,255,255,0.15) var(--val,50%));
        border-radius: 2px;
      }
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${GLOW_COLOR};
        border: 2px solid #ffffff;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(233,69,96,0.6);
        transition: all 0.2s ease-out;
        margin-top: -6px;
      }
      .custom-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 8px rgba(233,69,96,0.9);
      }
      .custom-slider::-moz-range-track {
        height: 4px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px;
      }
      .custom-slider::-moz-range-progress {
        height: 4px;
        background: ${GLOW_COLOR};
        border-radius: 2px;
      }
      .custom-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${GLOW_COLOR};
        border: 2px solid #ffffff;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(233,69,96,0.6);
        transition: all 0.2s ease-out;
      }

      .popup-panel {
        position: fixed;
        background: rgba(0,0,0,0.92);
        border-radius: 12px;
        padding: 16px 18px;
        z-index: 9999;
        box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 20px rgba(233,69,96,0.2);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255,255,255,0.08);
        width: 280px;
        animation: popIn 0.2s ease-out;
      }
      @keyframes popIn {
        from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.96); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      }
      .popup-panel .popup-title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 12px;
        color: #fff;
        letter-spacing: 1px;
      }
      .popup-panel .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .popup-panel .popup-header span:first-child {
        color: rgba(255,255,255,0.85);
        font-size: 13px;
      }
      .popup-panel .popup-header span:last-child {
        color: ${GLOW_COLOR};
        font-family: monospace;
        font-weight: 700;
        font-size: 14px;
      }
      .popup-panel input.custom-slider { width: 100%; }

      .mobile-icon-btn {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease-out;
        color: #fff;
        font-size: 18px;
        padding: 0;
      }
      .mobile-icon-btn:hover {
        background: rgba(233,69,96,0.2);
        border-color: ${GLOW_COLOR};
        transform: scale(1.08);
      }

      @media (max-width: 768px) {
        #scene-container { right: 0 !important; bottom: ${MOBILE_BAR_HEIGHT}px !important; }
      }
    `;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  private build(): void {
    this.panel = document.createElement('div');
    this.panel.id = 'control-panel';
    Object.assign(this.panel.style, {
      position: 'fixed',
      top: '50%',
      right: '16px',
      transform: 'translateY(-50%)',
      width: `${DESKTOP_PANEL_WIDTH}px`,
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '12px',
      padding: '16px',
      zIndex: '100',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.2s ease-out',
      border: '1px solid rgba(255,255,255,0.06)'
    } as CSSStyleDeclaration);

    this.panelTitle = document.createElement('h2');
    this.panelTitle.textContent = '雨痕控制';
    Object.assign(this.panelTitle.style, {
      fontSize: '20px',
      color: '#ffffff',
      fontWeight: '600',
      margin: '0 0 4px 0',
      letterSpacing: '2px',
      textAlign: 'center'
    } as CSSStyleDeclaration);
    this.panel.appendChild(this.panelTitle);

    const materialRow = document.createElement('div');
    Object.assign(materialRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '6px'
    } as CSSStyleDeclaration);

    const matOrder: MaterialType[] = ['water', 'metal', 'glass', 'leaf'];
    matOrder.forEach(matType => {
      const config = MATERIALS[matType];
      const wrapper = document.createElement('div');
      Object.assign(wrapper.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        flex: '1'
      } as CSSStyleDeclaration);

      const btn = document.createElement('button');
      btn.className = 'mat-btn ' + (matType === this.params.initialMaterial ? 'active' : 'inactive');
      btn.dataset.material = matType;
      Object.assign(btn.style, {
        width: `${DESKTOP_ICON_SIZE}px`,
        height: `${DESKTOP_ICON_SIZE}px`,
        fontSize: `${DESKTOP_ICON_SIZE * 0.5}px`
      } as CSSStyleDeclaration);

      const inner = document.createElement('span');
      inner.className = 'inner';
      inner.style.background = config.color;
      inner.textContent = config.icon;
      btn.appendChild(inner);

      const label = document.createElement('span');
      label.textContent = config.label;
      Object.assign(label.style, {
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)',
        whiteSpace: 'nowrap'
      } as CSSStyleDeclaration);

      wrapper.appendChild(btn);
      wrapper.appendChild(label);
      materialRow.appendChild(wrapper);
      this.materialButtons.set(matType, btn);
      this.materialLabels.set(matType, label);
    });
    this.panel.appendChild(materialRow);

    this.speedGroupEl = this.createSliderGroup(
      '速度', '⚡',
      this.params.initialSpeed,
      this.params.speedRange,
      '0.1',
      (valSpan, slider) => {
        this.speedValue = valSpan;
        this.speedSlider = slider;
      },
      (span) => { this.speedLabelEl = span; }
    );
    this.panel.appendChild(this.speedGroupEl);

    this.countGroupEl = this.createSliderGroup(
      '数量', '💧',
      this.params.initialCount,
      this.params.countRange,
      '10',
      (valSpan, slider) => {
        this.countValue = valSpan;
        this.countSlider = slider;
      },
      (span) => { this.countLabelEl = span; }
    );
    this.panel.appendChild(this.countGroupEl);

    this.resetBtn = document.createElement('button');
    this.resetBtn.textContent = '重设场景';
    Object.assign(this.resetBtn.style, {
      padding: '10px 16px',
      backgroundColor: GLOW_COLOR,
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s ease-out',
      marginTop: '4px',
      letterSpacing: '1px'
    } as CSSStyleDeclaration);
    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.backgroundColor = '#ff5a75';
      this.resetBtn.style.transform = 'scale(1.02)';
      this.resetBtn.style.boxShadow = `0 0 12px rgba(233,69,96,0.6)`;
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.backgroundColor = GLOW_COLOR;
      this.resetBtn.style.transform = 'scale(1)';
      this.resetBtn.style.boxShadow = 'none';
    });
    this.panel.appendChild(this.resetBtn);

    this.params.container.appendChild(this.panel);
    this.updateSliderFill(this.speedSlider);
    this.updateSliderFill(this.countSlider);
  }

  private createSliderGroup(
    labelText: string,
    iconText: string,
    initialValue: number,
    range: [number, number],
    step: string,
    refs: (valueSpan: HTMLSpanElement, slider: HTMLInputElement) => void,
    labelRef?: (labelSpan: HTMLSpanElement) => void
  ): HTMLDivElement {
    const group = document.createElement('div');
    Object.assign(group.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    } as CSSStyleDeclaration);

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    } as CSSStyleDeclaration);

    const label = document.createElement('span');
    label.textContent = labelText;
    label.dataset.icon = iconText;
    Object.assign(label.style, {
      fontSize: '13px',
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500'
    } as CSSStyleDeclaration);
    if (labelRef) labelRef(label);

    const valueSpan = document.createElement('span');
    valueSpan.textContent = step === '0.1' ? initialValue.toFixed(1) : String(Math.round(initialValue));
    Object.assign(valueSpan.style, {
      fontSize: '12px',
      color: GLOW_COLOR,
      fontWeight: '700',
      fontFamily: 'monospace'
    } as CSSStyleDeclaration);

    header.appendChild(label);
    header.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(range[0]);
    slider.max = String(range[1]);
    slider.step = step;
    slider.value = String(initialValue);
    slider.className = 'custom-slider';

    slider.addEventListener('input', () => this.updateSliderFill(slider));

    group.appendChild(header);
    group.appendChild(slider);
    refs(valueSpan, slider);
    return group;
  }

  private updateSliderFill(slider: HTMLInputElement): void {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--val', `${pct}%`);
  }

  private bindEvents(): void {
    this.materialButtons.forEach((btn, matType) => {
      btn.addEventListener('click', () => {
        this.updateActiveMaterial(matType);
        this.emit('material:change', matType);
      });
    });

    this.speedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.speedValue.textContent = val.toFixed(1);
      this.emit('speed:change', val);
    });

    this.countSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.countValue.textContent = String(Math.round(val));
      this.emit('count:change', Math.round(val));
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetToDefaults();
      this.emit('scene:reset', undefined as any);
    });
  }

  private updateActiveMaterial(matType: MaterialType): void {
    this.params.initialMaterial = matType;
    this.materialButtons.forEach((btn, type) => {
      if (type === matType) {
        btn.classList.remove('inactive');
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
        btn.classList.add('inactive');
      }
    });
  }

  private resetToDefaults(): void {
    this.updateActiveMaterial('water');
    this.speedSlider.value = '1.0';
    this.updateSliderFill(this.speedSlider);
    this.speedValue.textContent = '1.0';
    this.countSlider.value = '300';
    this.updateSliderFill(this.countSlider);
    this.countValue.textContent = '300';
  }

  private setupResponsive(): void {
    const check = () => {
      if (window.innerWidth < 768) this.applyMobileLayout();
      else this.applyDesktopLayout();
    };
    check();
    window.addEventListener('resize', check);
  }

  private applyDesktopLayout(): void {
    if (this.currentLayout === 'desktop') return;
    this.currentLayout = 'desktop';
    this.closeMobilePopup();

    Object.assign(this.panel.style, {
      position: 'fixed',
      top: '50%',
      right: '16px',
      bottom: 'auto',
      left: 'auto',
      transform: 'translateY(-50%)',
      width: `${DESKTOP_PANEL_WIDTH}px`,
      height: 'auto',
      borderRadius: '12px',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: '16px',
      padding: '16px'
    } as CSSStyleDeclaration);

    this.panelTitle.style.display = 'block';

    this.materialButtons.forEach((btn) => {
      btn.style.width = `${DESKTOP_ICON_SIZE}px`;
      btn.style.height = `${DESKTOP_ICON_SIZE}px`;
      btn.style.fontSize = `${DESKTOP_ICON_SIZE * 0.5}px`;
    });
    this.materialLabels.forEach(lbl => {
      lbl.style.display = '';
      lbl.style.fontSize = '11px';
    });

    this.speedSlider.style.display = 'block';
    this.countSlider.style.display = 'block';
    this.speedLabelEl.textContent = '速度';
    this.speedLabelEl.style.cursor = 'default';
    this.speedLabelEl.onclick = null;
    this.countLabelEl.textContent = '数量';
    this.countLabelEl.style.cursor = 'default';
    this.countLabelEl.onclick = null;

    this.speedGroupEl.style.flexDirection = 'column';
    this.countGroupEl.style.flexDirection = 'column';
    this.speedGroupEl.style.alignItems = 'stretch';
    this.countGroupEl.style.alignItems = 'stretch';
    this.speedGroupEl.style.gap = '6px';
    this.countGroupEl.style.gap = '6px';

    Object.assign(this.resetBtn.style, {
      padding: '10px 16px',
      fontSize: '14px',
      marginTop: '4px',
      width: 'auto'
    } as CSSStyleDeclaration);
    this.resetBtn.textContent = '重设场景';
  }

  private applyMobileLayout(): void {
    if (this.currentLayout === 'mobile') return;
    this.currentLayout = 'mobile';
    this.closeMobilePopup();

    Object.assign(this.panel.style, {
      position: 'fixed',
      top: 'auto',
      right: '0',
      bottom: '0',
      left: '0',
      transform: 'none',
      width: '100%',
      height: `${MOBILE_BAR_HEIGHT}px`,
      borderRadius: '14px 14px 0 0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      gap: '4px',
      padding: '6px 12px'
    } as CSSStyleDeclaration);

    this.panelTitle.style.display = 'none';

    this.materialButtons.forEach((btn) => {
      btn.style.width = `${MOBILE_ICON_SIZE}px`;
      btn.style.height = `${MOBILE_ICON_SIZE}px`;
      btn.style.fontSize = `${MOBILE_ICON_SIZE * 0.5}px`;
    });
    this.materialLabels.forEach(lbl => {
      lbl.style.fontSize = '9px';
    });

    this.speedSlider.style.display = 'none';
    this.countSlider.style.display = 'none';

    this.speedLabelEl.textContent = '⚡';
    this.speedLabelEl.style.cursor = 'pointer';
    this.speedLabelEl.style.fontSize = '20px';
    this.speedLabelEl.onclick = (e: Event) => {
      e.stopPropagation();
      this.toggleMobilePopup('speed');
    };

    this.countLabelEl.textContent = '💧';
    this.countLabelEl.style.cursor = 'pointer';
    this.countLabelEl.style.fontSize = '20px';
    this.countLabelEl.onclick = (e: Event) => {
      e.stopPropagation();
      this.toggleMobilePopup('count');
    };

    this.speedGroupEl.style.flexDirection = 'row';
    this.speedGroupEl.style.alignItems = 'center';
    this.speedGroupEl.style.gap = '4px';
    this.countGroupEl.style.flexDirection = 'row';
    this.countGroupEl.style.alignItems = 'center';
    this.countGroupEl.style.gap = '4px';

    Object.assign(this.resetBtn.style, {
      padding: '6px 10px',
      fontSize: '11px',
      marginTop: '0',
      whiteSpace: 'nowrap'
    } as CSSStyleDeclaration);
    this.resetBtn.textContent = '重设';
  }

  private toggleMobilePopup(type: 'speed' | 'count'): void {
    if (this.activePopup === type) {
      this.closeMobilePopup();
      return;
    }
    this.closeMobilePopup();
    this.activePopup = type;

    const popup = document.createElement('div');
    popup.className = 'popup-panel';
    Object.assign(popup.style, {
      left: '50%',
      bottom: `${MOBILE_BAR_HEIGHT + 14}px`,
      transform: 'translateX(-50%)'
    } as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.className = 'popup-title';
    title.textContent = type === 'speed' ? '调节雨滴速度' : '调节雨滴数量';
    popup.appendChild(title);

    const header = document.createElement('div');
    header.className = 'popup-header';
    const label = document.createElement('span');
    label.textContent = type === 'speed' ? '速度' : '数量';
    const valueDisplay = document.createElement('span');
    header.appendChild(label);
    header.appendChild(valueDisplay);
    popup.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'custom-slider';
    if (type === 'speed') {
      slider.min = this.params.speedRange[0].toString();
      slider.max = this.params.speedRange[1].toString();
      slider.step = '0.1';
      slider.value = this.speedSlider.value;
      valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
    } else {
      slider.min = this.params.countRange[0].toString();
      slider.max = this.params.countRange[1].toString();
      slider.step = '10';
      slider.value = this.countSlider.value;
      valueDisplay.textContent = String(Math.round(parseFloat(slider.value)));
    }
    this.updateSliderFill(slider);

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderFill(slider);
      if (type === 'speed') {
        this.speedSlider.value = String(val);
        this.updateSliderFill(this.speedSlider);
        this.speedValue.textContent = val.toFixed(1);
        valueDisplay.textContent = val.toFixed(1);
        this.emit('speed:change', val);
      } else {
        const v = Math.round(val);
        this.countSlider.value = String(v);
        this.updateSliderFill(this.countSlider);
        this.countValue.textContent = String(v);
        valueDisplay.textContent = String(v);
        this.emit('count:change', v);
      }
    });

    popup.appendChild(slider);
    document.body.appendChild(popup);
    this.mobilePopup = popup;

    requestAnimationFrame(() => {
      const closeHandler = (ev: MouseEvent) => {
        if (!popup.contains(ev.target as Node)) {
          this.closeMobilePopup();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    });
  }

  private closeMobilePopup(): void {
    if (this.mobilePopup) {
      this.mobilePopup.remove();
      this.mobilePopup = null;
    }
    this.activePopup = null;
  }

  public updateSpeedDisplay(val: number): void {
    this.speedValue.textContent = val.toFixed(1);
    this.speedSlider.value = String(val);
    this.updateSliderFill(this.speedSlider);
  }

  public updateCountDisplay(val: number): void {
    this.countValue.textContent = String(val);
    this.countSlider.value = String(val);
    this.updateSliderFill(this.countSlider);
  }

  public updateMaterialDisplay(mat: MaterialType): void {
    this.updateActiveMaterial(mat);
  }
}
