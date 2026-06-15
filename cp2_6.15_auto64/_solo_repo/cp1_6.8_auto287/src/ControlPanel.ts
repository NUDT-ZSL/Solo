import { Medium } from './Medium';
import { LightBeam } from './LightBeam';

export interface ControlPanelConfig {
  refractionIndex: number;
  sourceAngle: number;
  dispersionStrength: number;
  onRefractionChange: (value: number) => void;
  onAngleChange: (value: number) => void;
  onDispersionChange: (value: number) => void;
  onReset: () => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private selectedMedium: Medium | null = null;
  private config: ControlPanelConfig;
  private sliders: Map<string, HTMLInputElement> = new Map();
  private valueDisplays: Map<string, HTMLElement> = new Map();

  constructor(config: ControlPanelConfig) {
    this.config = config;
    this.container = document.body;

    this.panel = this.createPanel();
    this.container.appendChild(this.panel);

    this.createSlider('refraction', '折射率', 1.0, 2.5, 0.01, config.refractionIndex, (v) => {
      config.onRefractionChange(v);
    });
    this.createSlider('angle', '光源角度', -45, 45, 0.5, config.sourceAngle, (v) => {
      config.onAngleChange(v);
    });
    this.createSlider('dispersion', '色散强度', 0, 1, 0.01, config.dispersionStrength, (v) => {
      config.onDispersionChange(v);
    });

    this.createResetButton();
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = '';

    Object.assign(panel.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '280px',
      padding: '20px',
      background: 'rgba(20, 25, 40, 0.55)',
      backdropFilter: 'blur(20px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      color: '#e0e8f0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: '13px',
      zIndex: '100',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      userSelect: 'none',
    });

    const title = document.createElement('div');
    title.textContent = '光影折射 · 控制台';
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '16px',
      color: '#c8d8e8',
      letterSpacing: '1px',
      textAlign: 'center' as const,
      paddingBottom: '12px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    });
    panel.appendChild(title);

    return panel;
  }

  private createSlider(
    id: string,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (value: number) => void
  ): void {
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

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    Object.assign(labelEl.style, {
      color: '#a0b0c0',
      fontSize: '12px',
    });

    const valueEl = document.createElement('span');
    valueEl.textContent = value.toFixed(2);
    Object.assign(valueEl.style, {
      color: '#e0f0ff',
      fontSize: '12px',
      fontWeight: '600',
      fontFamily: 'monospace',
    });
    this.valueDisplays.set(id, valueEl);

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    this.sliders.set(id, slider);

    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none' as string,
      WebkitAppearance: 'none',
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
    });

    const updateSliderStyle = (val: number) => {
      const pct = ((val - min) / (max - min)) * 100;
      slider.style.background = `linear-gradient(to right, rgba(100,180,255,0.6) 0%, rgba(100,180,255,0.6) ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`;
    };
    updateSliderStyle(value);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueEl.textContent = v.toFixed(2);
      updateSliderStyle(v);
      onChange(v);
    });

    wrapper.appendChild(header);
    wrapper.appendChild(slider);
    this.panel.appendChild(wrapper);
  }

  private createResetButton(): void {
    const btn = document.createElement('button');
    btn.textContent = '重置';
    Object.assign(btn.style, {
      width: '100%',
      padding: '8px 0',
      marginTop: '6px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: '#b0c4d8',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      letterSpacing: '1px',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(100, 180, 255, 0.15)';
      btn.style.borderColor = 'rgba(100, 180, 255, 0.3)';
      btn.style.color = '#e0f0ff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.05)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      btn.style.color = '#b0c4d8';
    });

    btn.addEventListener('click', () => {
      this.config.onReset();
      this.resetSliders();
    });

    this.panel.appendChild(btn);
  }

  private resetSliders(): void {
    const refSlider = this.sliders.get('refraction');
    const angSlider = this.sliders.get('angle');
    const dispSlider = this.sliders.get('dispersion');

    if (refSlider) {
      refSlider.value = '1.52';
      const display = this.valueDisplays.get('refraction');
      if (display) display.textContent = '1.52';
    }
    if (angSlider) {
      angSlider.value = '0';
      const display = this.valueDisplays.get('angle');
      if (display) display.textContent = '0.00';
    }
    if (dispSlider) {
      dispSlider.value = '0.5';
      const display = this.valueDisplays.get('dispersion');
      if (display) display.textContent = '0.50';
    }
  }

  updateFromMedium(medium: Medium | null): void {
    this.selectedMedium = medium;
    if (medium) {
      const slider = this.sliders.get('refraction');
      if (slider) {
        slider.value = String(medium.refractionIndex);
        const display = this.valueDisplays.get('refraction');
        if (display) display.textContent = medium.refractionIndex.toFixed(2);
      }
    }
  }

  dispose(): void {
    this.panel.remove();
  }
}
