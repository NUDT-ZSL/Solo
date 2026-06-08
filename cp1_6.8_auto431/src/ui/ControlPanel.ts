export interface ControlPanelCallbacks {
  onDensityChange: (value: number) => void;
  onFlowSpeedChange: (value: number) => void;
  onBeamIntensityChange: (value: number) => void;
  onResetView: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private callbacks: ControlPanelCallbacks;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = this.createPanel();
    document.body.appendChild(this.container);
    this.applyResponsive();
    window.addEventListener('resize', () => this.applyResponsive());
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = '';

    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      padding: '20px 24px',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      zIndex: '100',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: 'rgba(255, 255, 255, 0.9)',
      minWidth: '220px',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      userSelect: 'none',
    });

    const title = document.createElement('div');
    title.textContent = '☁ 控制面板';
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '16px',
      letterSpacing: '1px',
      textAlign: 'center' as string,
      color: 'rgba(255, 255, 255, 0.95)',
      textShadow: '0 0 10px rgba(200, 210, 255, 0.5)',
    });
    panel.appendChild(title);

    const densitySlider = this.createSlider('云层密度', 2000, 8000, 5000, 100, (v) => {
      this.callbacks.onDensityChange(v);
    });
    panel.appendChild(densitySlider.container);

    const flowSlider = this.createSlider('流动速度', 0.1, 2.0, 0.8, 0.1, (v) => {
      this.callbacks.onFlowSpeedChange(v);
    });
    panel.appendChild(flowSlider.container);

    const beamSlider = this.createSlider('光束强度', 0.2, 1.0, 0.6, 0.05, (v) => {
      this.callbacks.onBeamIntensityChange(v);
    });
    panel.appendChild(beamSlider.container);

    const resetBtn = this.createButton('重置视角', () => {
      this.callbacks.onResetView();
    });
    panel.appendChild(resetBtn);

    return panel;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    defaultVal: number,
    step: number,
    onChange: (value: number) => void
  ): { container: HTMLDivElement; input: HTMLInputElement } {
    const container = document.createElement('div');
    Object.assign(container.style, {
      marginBottom: '14px',
      transition: 'transform 0.2s ease',
    });

    container.addEventListener('mouseenter', () => {
      container.style.transform = 'translateY(-2px)';
    });
    container.addEventListener('mouseleave', () => {
      container.style.transform = 'translateY(0)';
    });

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px',
      fontSize: '12px',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    Object.assign(labelEl.style, {
      color: 'rgba(255, 255, 255, 0.75)',
    });

    const valueEl = document.createElement('span');
    valueEl.textContent = String(defaultVal);
    Object.assign(valueEl.style, {
      color: 'rgba(200, 210, 255, 0.9)',
      fontWeight: '500',
      minWidth: '36px',
      textAlign: 'right' as string,
    });

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    container.appendChild(labelRow);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(defaultVal);

    Object.assign(input.style, {
      width: '100%',
      height: '4px',
      appearance: 'none' as string,
      WebkitAppearance: 'none',
      background: 'rgba(255, 255, 255, 0.12)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
      transition: 'background 0.2s ease',
    });

    const style = document.createElement('style');
    style.textContent = `
      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(200, 210, 255, 0.9);
        box-shadow: 0 0 8px rgba(200, 210, 255, 0.5), 0 0 2px rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      #control-panel input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(200, 210, 255, 0.7), 0 0 4px rgba(255, 255, 255, 0.5);
      }
      #control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(200, 210, 255, 0.9);
        box-shadow: 0 0 8px rgba(200, 210, 255, 0.5);
        cursor: pointer;
        border: none;
      }
    `;
    if (!document.querySelector('#control-panel-styles')) {
      style.id = 'control-panel-styles';
      document.head.appendChild(style);
    }

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueEl.textContent = step < 1 ? val.toFixed(1 + (step < 0.1 ? 1 : 0)) : String(Math.round(val));
      onChange(val);
    });

    container.appendChild(input);

    return { container, input };
  }

  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      width: '100%',
      padding: '8px 0',
      marginTop: '8px',
      background: 'rgba(200, 210, 255, 0.12)',
      border: '1px solid rgba(200, 210, 255, 0.2)',
      borderRadius: '8px',
      color: 'rgba(200, 210, 255, 0.9)',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      letterSpacing: '1px',
      outline: 'none',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(200, 210, 255, 0.22)';
      btn.style.boxShadow = '0 0 12px rgba(200, 210, 255, 0.25)';
      btn.style.transform = 'translateY(-1px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(200, 210, 255, 0.12)';
      btn.style.boxShadow = 'none';
      btn.style.transform = 'translateY(0)';
    });
    btn.addEventListener('click', onClick);

    return btn;
  }

  private applyResponsive() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      Object.assign(this.container.style, {
        bottom: '12px',
        right: '12px',
        padding: '14px 16px',
        minWidth: '180px',
        fontSize: '11px',
      });
    } else {
      Object.assign(this.container.style, {
        bottom: '24px',
        right: '24px',
        padding: '20px 24px',
        minWidth: '220px',
        fontSize: '',
      });
    }
  }
}
