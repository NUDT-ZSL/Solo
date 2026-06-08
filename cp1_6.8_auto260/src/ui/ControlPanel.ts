export interface ControlPanelCallbacks {
  onPulseFrequencyChange: (value: number) => void;
  onBeamWidthChange: (value: number) => void;
  onParticleDensityChange: (value: number) => void;
  onReset: () => void;
}

export class ControlPanel {
  container: HTMLDivElement;
  private callbacks: ControlPanelCallbacks;
  private sliders: Map<string, HTMLInputElement> = new Map();

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement('div');
    this.container.className = 'pulsar-control-panel';
    this.applyStyles();
    this.buildContent();
  }

  private applyStyles() {
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '280px',
      padding: '20px 24px',
      borderRadius: '16px',
      background: 'rgba(20, 10, 40, 0.55)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(120, 80, 200, 0.25)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
      color: '#c8b8e8',
      zIndex: '100',
      opacity: '0',
      transform: 'translateY(20px)',
      transition: 'opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    });

    requestAnimationFrame(() => {
      this.container.style.opacity = '1';
      this.container.style.transform = 'translateY(0)';
    });
  }

  private buildContent() {
    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: '600',
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      marginBottom: '16px',
      color: '#b8a0e8',
    });
    title.textContent = '脉冲参数';
    this.container.appendChild(title);

    this.addSlider('pulseFrequency', '脉冲频率', 0.2, 5.0, 1.0, 0.1, (v) =>
      this.callbacks.onPulseFrequencyChange(v)
    );
    this.addSlider('beamWidth', '波束宽度', 0.1, 1.0, 0.4, 0.05, (v) =>
      this.callbacks.onBeamWidthChange(v)
    );
    this.addSlider('particleDensity', '粒子密度', 0.2, 2.0, 1.0, 0.1, (v) =>
      this.callbacks.onParticleDensityChange(v)
    );

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      height: '1px',
      background: 'rgba(120, 80, 200, 0.2)',
      margin: '16px 0',
    });
    this.container.appendChild(divider);

    const resetBtn = document.createElement('button');
    Object.assign(resetBtn.style, {
      width: '100%',
      padding: '10px',
      borderRadius: '8px',
      border: '1px solid rgba(120, 80, 200, 0.3)',
      background: 'rgba(80, 40, 160, 0.2)',
      color: '#c8b8e8',
      fontSize: '13px',
      fontWeight: '500',
      letterSpacing: '1px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
    });
    resetBtn.textContent = '重置参数';
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(100, 60, 200, 0.4)';
      resetBtn.style.borderColor = 'rgba(140, 100, 240, 0.5)';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(80, 40, 160, 0.2)';
      resetBtn.style.borderColor = 'rgba(120, 80, 200, 0.3)';
    });
    resetBtn.addEventListener('click', () => {
      this.resetSliders();
      this.callbacks.onReset();
    });
    this.container.appendChild(resetBtn);
  }

  private addSlider(
    id: string,
    label: string,
    min: number,
    max: number,
    defaultValue: number,
    step: number,
    onChange: (value: number) => void
  ) {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      marginBottom: '14px',
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px',
    });

    const lbl = document.createElement('span');
    Object.assign(lbl.style, {
      fontSize: '12px',
      color: '#a090c8',
    });
    lbl.textContent = label;

    const val = document.createElement('span');
    Object.assign(val.style, {
      fontSize: '12px',
      color: '#d0c0f0',
      fontVariantNumeric: 'tabular-nums',
    });
    val.textContent = defaultValue.toFixed(1);

    header.appendChild(lbl);
    header.appendChild(val);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);

    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: `linear-gradient(to right, rgba(120,80,200,0.6), rgba(120,80,200,0.2))`,
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
    });

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      val.textContent = v.toFixed(1);
      onChange(v);
    });

    this.sliders.set(id, slider);
    wrapper.appendChild(header);
    wrapper.appendChild(slider);
    this.container.appendChild(wrapper);
  }

  private resetSliders() {
    const defaults: Record<string, number> = {
      pulseFrequency: 1.0,
      beamWidth: 0.4,
      particleDensity: 1.0,
    };
    for (const [id, slider] of this.sliders) {
      const def = defaults[id];
      if (def !== undefined) {
        slider.value = String(def);
        const header = slider.previousElementSibling as HTMLDivElement;
        if (header) {
          const valSpan = header.querySelector('span:last-child');
          if (valSpan) valSpan.textContent = def.toFixed(1);
        }
      }
    }
  }

  mount(parent: HTMLElement = document.body) {
    parent.appendChild(this.container);
  }

  unmount() {
    this.container.remove();
  }
}
