export interface ControlState {
  decayRate: number;
  particleSize: number;
  colorOffset: number;
}

export interface ControlPanelCallbacks {
  onDecayRateChange: (value: number) => void;
  onParticleSizeChange: (value: number) => void;
  onColorOffsetChange: (value: number) => void;
  onClear: () => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: ControlPanelCallbacks;
  private state: ControlState;

  private decaySlider: HTMLInputElement | null = null;
  private sizeSlider: HTMLInputElement | null = null;
  private hueSlider: HTMLInputElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;

  constructor(
    parent: HTMLElement,
    initialState: ControlState,
    callbacks: ControlPanelCallbacks
  ) {
    this.state = { ...initialState };
    this.callbacks = callbacks;
    this.container = this.createContainer(parent);
    this.buildUI();
    this.bindEvents();
  }

  private createContainer(parent: HTMLElement): HTMLElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed',
      left: '24px',
      bottom: '24px',
      zIndex: '1000',
      padding: '18px 20px',
      borderRadius: '12px',
      background: 'rgba(20, 25, 35, 0.3)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
      minWidth: '260px',
      color: '#e8eef5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
    parent.appendChild(el);
    return el;
  }

  private buildUI(): void {
    const title = document.createElement('div');
    title.textContent = '脉动记忆控制台';
    Object.assign(title.style, {
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '14px',
      opacity: '0.85',
      letterSpacing: '0.5px'
    });
    this.container.appendChild(title);

    this.decaySlider = this.createSlider(
      '衰减速度',
      this.state.decayRate * 100,
      0,
      20,
      0.1,
      '%'
    );
    this.sizeSlider = this.createSlider(
      '粒子大小',
      this.state.particleSize,
      1,
      10,
      0.5,
      'px'
    );
    this.hueSlider = this.createSlider(
      '颜色偏移',
      this.state.colorOffset,
      -30,
      30,
      1,
      '°'
    );

    const btnWrap = document.createElement('div');
    Object.assign(btnWrap.style, {
      marginTop: '18px',
      display: 'flex',
      justifyContent: 'center'
    });

    this.clearBtn = document.createElement('button');
    this.clearBtn.textContent = '清空画布';
    Object.assign(this.clearBtn.style, {
      padding: '8px 22px',
      fontSize: '13px',
      fontWeight: '500',
      color: '#fff',
      background: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s',
      boxShadow: '0 2px 12px rgba(255, 126, 95, 0.4)',
      outline: 'none',
      letterSpacing: '0.5px'
    });
    btnWrap.appendChild(this.clearBtn);
    this.container.appendChild(btnWrap);
  }

  private createSlider(
    labelText: string,
    value: number,
    min: number,
    max: number,
    step: number,
    suffix: string
  ): HTMLInputElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      marginBottom: '14px'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px',
      fontSize: '12px',
      opacity: '0.75'
    });

    const label = document.createElement('span');
    label.textContent = labelText;

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = `${value.toFixed(step < 1 ? 1 : 0)}${suffix}`;
    valueDisplay.dataset.suffix = suffix;
    valueDisplay.dataset.step = String(step);
    Object.assign(valueDisplay.style, {
      fontWeight: '600',
      fontVariantNumeric: 'tabular-nums',
      minWidth: '48px',
      textAlign: 'right'
    });

    header.appendChild(label);
    header.appendChild(valueDisplay);
    row.appendChild(header);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);

    this.applySliderStyle(input, value, min, max);

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      const s = parseFloat(input.step);
      valueDisplay.textContent = `${v.toFixed(s < 1 ? 1 : 0)}${suffix}`;
      this.applySliderStyle(input, v, min, max);
    });

    row.appendChild(input);
    this.container.appendChild(row);

    return input;
  }

  private applySliderStyle(
    input: HTMLInputElement,
    value: number,
    min: number,
    max: number
  ): void {
    const percent = ((value - min) / (max - min)) * 100;
    const startHue = 210;
    const endHue = 0;
    const hue = startHue + (endHue - startHue) * (percent / 100);

    Object.assign(input.style, {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      outline: 'none',
      cursor: 'pointer',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: `linear-gradient(to right, 
        hsl(${hue}, 85%, 60%) 0%, 
        hsl(${hue}, 85%, 60%) ${percent}%, 
        rgba(255,255,255,0.1) ${percent}%, 
        rgba(255,255,255,0.1) 100%)`,
      transition: 'background 0.2s ease'
    } as unknown as CSSStyleDeclaration);

    const styleId = 'pulse-memory-slider-style';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 1px 6px rgba(0,0,0,0.3);
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
          border: 2px solid rgba(255,255,255,0.8);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(0.9);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 1px 6px rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.8);
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  private bindEvents(): void {
    if (this.decaySlider) {
      this.decaySlider.addEventListener('input', (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value) / 100;
        this.state.decayRate = v;
        this.callbacks.onDecayRateChange(v);
      });
    }

    if (this.sizeSlider) {
      this.sizeSlider.addEventListener('input', (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        this.state.particleSize = v;
        this.callbacks.onParticleSizeChange(v);
      });
    }

    if (this.hueSlider) {
      this.hueSlider.addEventListener('input', (e) => {
        const v = parseFloat((e.target as HTMLInputElement).value);
        this.state.colorOffset = v;
        this.callbacks.onColorOffsetChange(v);
      });
    }

    if (this.clearBtn) {
      const btn = this.clearBtn;
      let pressed = false;

      btn.addEventListener('pointerdown', () => {
        pressed = true;
        btn.style.transform = 'translateY(2px)';
        btn.style.boxShadow = '0 1px 6px rgba(255, 126, 95, 0.3)';
      });

      btn.addEventListener('pointerup', () => {
        if (!pressed) return;
        pressed = false;
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 3px 14px rgba(255, 126, 95, 0.45)';
        setTimeout(() => {
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = '0 2px 12px rgba(255, 126, 95, 0.4)';
        }, 120);
      });

      btn.addEventListener('pointerleave', () => {
        if (pressed) {
          pressed = false;
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = '0 2px 12px rgba(255, 126, 95, 0.4)';
        }
      });

      btn.addEventListener('click', () => {
        this.callbacks.onClear();
      });
    }
  }

  public updateState(state: Partial<ControlState>): void {
    Object.assign(this.state, state);
  }

  public destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
