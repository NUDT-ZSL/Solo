export type MaterialType = 'water' | 'metal' | 'glass' | 'leaf';

export interface MaterialConfig {
  id: MaterialType;
  name: string;
  color: string;
  label: string;
}

export const MATERIALS: Record<MaterialType, MaterialConfig> = {
  water: { id: 'water', name: 'water', color: '#4A90D9', label: '水面' },
  metal: { id: 'metal', name: 'metal', color: '#C0C0C0', label: '金属' },
  glass: { id: 'glass', name: 'glass', color: '#B0E0E6', label: '玻璃' },
  leaf: { id: 'leaf', name: 'leaf', color: '#228B22', label: '树叶' }
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

export class UIController extends EventEmitter<UIEventMap> {
  private params: UIControlParams;
  private panel!: HTMLDivElement;
  private materialButtons: Map<MaterialType, HTMLButtonElement> = new Map();
  private speedSlider!: HTMLInputElement;
  private countSlider!: HTMLInputElement;
  private speedValue!: HTMLSpanElement;
  private countValue!: HTMLSpanElement;
  private resetBtn!: HTMLButtonElement;
  private mobilePopup!: HTMLDivElement | null;
  private speedIconBtn!: HTMLButtonElement | null;
  private countIconBtn!: HTMLButtonElement | null;
  private activePopup: 'speed' | 'count' | null = null;

  constructor(params: UIControlParams) {
    super();
    this.params = params;
    this.build();
    this.bindEvents();
    this.setupResponsive();
  }

  private build(): void {
    this.panel = document.createElement('div');
    this.panel.id = 'control-panel';
    Object.assign(this.panel.style, {
      position: 'fixed',
      top: '50%',
      right: '16px',
      transform: 'translateY(-50%)',
      width: '220px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '12px',
      padding: '16px',
      zIndex: '100',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backdropFilter: 'blur(8px)',
      transition: 'all 0.2s ease-out'
    } as CSSStyleDeclaration);

    const title = document.createElement('h2');
    title.textContent = '雨痕控制';
    Object.assign(title.style, {
      fontSize: '20px',
      color: '#ffffff',
      fontWeight: '600',
      margin: '0 0 4px 0',
      letterSpacing: '2px',
      textAlign: 'center'
    } as CSSStyleDeclaration);
    this.panel.appendChild(title);

    const materialRow = document.createElement('div');
    Object.assign(materialRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '8px'
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
      btn.dataset.material = matType;
      Object.assign(btn.style, {
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: config.color,
        transition: 'all 0.2s ease-out',
        opacity: matType === this.params.initialMaterial ? '1' : '0.5',
        transform: matType === this.params.initialMaterial ? 'scale(1.1)' : 'scale(1)',
        boxShadow: matType === this.params.initialMaterial
          ? `0 0 8px 2px #e94560, 0 0 16px 4px rgba(233,69,96,0.5)`
          : 'none',
        outline: 'none',
        padding: '0'
      } as CSSStyleDeclaration);

      btn.addEventListener('mouseenter', () => {
        if (btn.dataset.material !== this.params.initialMaterial) {
          btn.style.opacity = '0.8';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (btn.dataset.material !== this.params.initialMaterial) {
          btn.style.opacity = '0.5';
        }
      });

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
    });
    this.panel.appendChild(materialRow);

    const speedGroup = this.createSliderGroup(
      '速度',
      this.params.initialSpeed,
      this.params.speedRange,
      (val, valSpan, slider) => {
        this.speedSlider = slider;
        this.speedValue = valSpan;
      }
    );
    this.panel.appendChild(speedGroup);

    const countGroup = this.createSliderGroup(
      '数量',
      this.params.initialCount,
      this.params.countRange,
      (val, valSpan, slider) => {
        this.countSlider = slider;
        this.countValue = valSpan;
      }
    );
    this.panel.appendChild(countGroup);

    this.resetBtn = document.createElement('button');
    this.resetBtn.textContent = '重设场景';
    Object.assign(this.resetBtn.style, {
      padding: '10px 16px',
      backgroundColor: '#e94560',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease-out',
      marginTop: '4px'
    } as CSSStyleDeclaration);
    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.backgroundColor = '#ff5a75';
      this.resetBtn.style.transform = 'scale(1.02)';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.backgroundColor = '#e94560';
      this.resetBtn.style.transform = 'scale(1)';
    });
    this.panel.appendChild(this.resetBtn);

    this.injectSliderStyles();
    this.params.container.appendChild(this.panel);
  }

  private createSliderGroup(
    labelText: string,
    initialValue: number,
    range: [number, number],
    refs: (value: number, valueSpan: HTMLSpanElement, slider: HTMLInputElement) => void
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
    Object.assign(label.style, {
      fontSize: '13px',
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500'
    } as CSSStyleDeclaration);

    const valueSpan = document.createElement('span');
    valueSpan.textContent = initialValue.toFixed(1);
    Object.assign(valueSpan.style, {
      fontSize: '12px',
      color: '#e94560',
      fontWeight: '600',
      fontFamily: 'monospace'
    } as CSSStyleDeclaration);

    header.appendChild(label);
    header.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(range[0]);
    slider.max = String(range[1]);
    slider.step = labelText === '速度' ? '0.1' : '10';
    slider.value = String(initialValue);
    slider.className = 'custom-slider';

    group.appendChild(header);
    group.appendChild(slider);
    refs(initialValue, valueSpan, slider);
    return group;
  }

  private injectSliderStyles(): void {
    const styleId = 'rain-slider-styles';
    if (document.getElementById(styleId)) return;

    const css = `
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
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #e94560;
        border: 2px solid #ffffff;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(233,69,96,0.6);
        transition: all 0.2s ease-out;
      }
      .custom-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 8px rgba(233,69,96,0.8);
      }
      .custom-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #e94560;
        border: 2px solid #ffffff;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(233,69,96,0.6);
        transition: all 0.2s ease-out;
      }
      .popup-panel {
        position: fixed;
        background: rgba(0,0,0,0.9);
        border-radius: 12px;
        padding: 16px;
        z-index: 200;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        backdrop-filter: blur(12px);
      }
    `;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
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
      const config = MATERIALS[type];
      if (type === matType) {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1.1)';
        btn.style.boxShadow = `0 0 8px 2px #e94560, 0 0 16px 4px rgba(233,69,96,0.5)`;
      } else {
        btn.style.opacity = '0.5';
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = 'none';
      }
    });
  }

  private resetToDefaults(): void {
    this.updateActiveMaterial('water');
    this.speedSlider.value = '1.0';
    this.speedValue.textContent = '1.0';
    this.countSlider.value = '300';
    this.countValue.textContent = '300';
  }

  private setupResponsive(): void {
    const checkViewport = () => {
      if (window.innerWidth < 768) {
        this.switchToMobileLayout();
      } else {
        this.switchToDesktopLayout();
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
  }

  private switchToMobileLayout(): void {
    if (this.panel.dataset.layout === 'mobile') return;
    this.panel.dataset.layout = 'mobile';

    this.removeMobileAdditions();

    Object.assign(this.panel.style, {
      top: 'auto',
      right: '0',
      bottom: '0',
      left: '0',
      transform: 'none',
      width: '100%',
      height: '80px',
      borderRadius: '12px 12px 0 0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      gap: '8px',
      padding: '8px 12px'
    } as CSSStyleDeclaration);

    const title = this.panel.querySelector('h2');
    if (title) (title as HTMLElement).style.display = 'none';

    const sliders = this.panel.querySelectorAll('input[type="range"]');
    sliders.forEach(s => (s as HTMLElement).style.display = 'none');

    const groups = this.panel.querySelectorAll('div[style*="column"]');
    groups.forEach(g => {
      const el = g as HTMLElement;
      const header = el.firstElementChild as HTMLElement;
      if (header) {
        const label = header.querySelector('span:first-child');
        if (label) {
          const iconChar = (label.textContent === '速度') ? '⚡' : '💧';
          (label as HTMLElement).textContent = iconChar;
          Object.assign((label as HTMLElement).style, {
            fontSize: '18px',
            cursor: 'pointer'
          } as CSSStyleDeclaration);
        }
      }
      Object.assign(el.style, {
        flexDirection: 'row',
        alignItems: 'center',
        gap: '4px'
      } as CSSStyleDeclaration);
    });

    this.materialButtons.forEach((btn) => {
      Object.assign(btn.style, {
        width: '32px',
        height: '32px'
      } as CSSStyleDeclaration);
    });

    const materialLabels = this.panel.querySelectorAll('div > div > span:last-child');
    materialLabels.forEach(l => (l as HTMLElement).style.fontSize = '9px');

    Object.assign(this.resetBtn.style, {
      padding: '6px 10px',
      fontSize: '11px',
      marginTop: '0'
    } as CSSStyleDeclaration);

    this.setupMobilePopupTriggers();
  }

  private setupMobilePopupTriggers(): void {
    const groups = this.panel.querySelectorAll('div[style*="flex-direction: row"]');
    groups.forEach((groupEl, idx) => {
      if (idx >= 2) return;
      const group = groupEl as HTMLElement;
      const header = group.querySelector('div') as HTMLElement;
      const iconLabel = header?.querySelector('span:first-child') as HTMLElement;
      if (iconLabel) {
        iconLabel.style.cursor = 'pointer';
        iconLabel.onclick = (e) => {
          e.stopPropagation();
          this.toggleMobilePopup(idx === 0 ? 'speed' : 'count');
        };
      }
      this[`${idx === 0 ? 'speedIconBtn' : 'countIconBtn'}`] = {} as HTMLButtonElement;
    });
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
      bottom: '100px',
      transform: 'translateX(-50%)',
      width: '280px'
    } as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.textContent = type === 'speed' ? '调节速度' : '调节数量';
    Object.assign(title.style, {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '12px',
      color: '#ffffff'
    } as CSSStyleDeclaration);
    popup.appendChild(title);

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px'
    } as CSSStyleDeclaration);
    const valueDisplay = document.createElement('span');
    Object.assign(valueDisplay.style, {
      color: '#e94560',
      fontFamily: 'monospace',
      fontWeight: '600'
    } as CSSStyleDeclaration);
    const lbl = document.createElement('span');
    lbl.textContent = type === 'speed' ? '速度' : '数量';
    header.appendChild(lbl);
    header.appendChild(valueDisplay);
    popup.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
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
    slider.className = 'custom-slider';
    slider.style.width = '100%';
    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (type === 'speed') {
        this.speedSlider.value = String(val);
        this.speedValue.textContent = val.toFixed(1);
        valueDisplay.textContent = val.toFixed(1);
        this.emit('speed:change', val);
      } else {
        const v = Math.round(val);
        this.countSlider.value = String(v);
        this.countValue.textContent = String(v);
        valueDisplay.textContent = String(v);
        this.emit('count:change', v);
      }
    });
    popup.appendChild(slider);
    document.body.appendChild(popup);
    this.mobilePopup = popup;

    setTimeout(() => {
      const closeHandler = (e: MouseEvent) => {
        if (!popup.contains(e.target as Node)) {
          this.closeMobilePopup();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 10);
  }

  private closeMobilePopup(): void {
    if (this.mobilePopup) {
      this.mobilePopup.remove();
      this.mobilePopup = null;
    }
    this.activePopup = null;
  }

  private removeMobileAdditions(): void {
    if (this.mobilePopup) {
      this.mobilePopup.remove();
      this.mobilePopup = null;
    }
    this.activePopup = null;
  }

  private switchToDesktopLayout(): void {
    if (this.panel.dataset.layout === 'desktop') return;
    this.panel.dataset.layout = 'desktop';
    this.removeMobileAdditions();

    Object.assign(this.panel.style, {
      position: 'fixed',
      top: '50%',
      right: '16px',
      bottom: 'auto',
      left: 'auto',
      transform: 'translateY(-50%)',
      width: '220px',
      height: 'auto',
      borderRadius: '12px',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: '16px',
      padding: '16px'
    } as CSSStyleDeclaration);

    const title = this.panel.querySelector('h2');
    if (title) (title as HTMLElement).style.display = 'block';

    const sliders = this.panel.querySelectorAll('input[type="range"]');
    sliders.forEach(s => (s as HTMLElement).style.display = 'block');

    window.location.reload();
  }

  public updateSpeedDisplay(val: number): void {
    this.speedValue.textContent = val.toFixed(1);
    this.speedSlider.value = String(val);
  }

  public updateCountDisplay(val: number): void {
    this.countValue.textContent = String(val);
    this.countSlider.value = String(val);
  }

  public updateMaterialDisplay(mat: MaterialType): void {
    this.updateActiveMaterial(mat);
  }
}
