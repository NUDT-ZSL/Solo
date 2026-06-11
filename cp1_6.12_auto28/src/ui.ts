import { ParticleSystem } from './particleSystem';
import { Controls } from './controls';

export interface UIConfig {
  particleCount: number;
  baseSize: number;
  speedFactor: number;
}

export class UI {
  private panel: HTMLElement;
  private particleSystem: ParticleSystem;
  private controls: Controls;
  private onConfigChange?: (config: UIConfig) => void;

  constructor(particleSystem: ParticleSystem, controls: Controls) {
    this.particleSystem = particleSystem;
    this.controls = controls;
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);
  }

  setOnConfigChange(callback: (config: UIConfig) => void): void {
    this.onConfigChange = callback;
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = '';

    Object.assign(panel.style, {
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '260px',
      padding: '20px',
      background: 'linear-gradient(135deg, rgba(12,12,35,0.88), rgba(20,15,40,0.82))',
      borderRadius: '12px',
      border: '1px solid rgba(180,180,220,0.25)',
      boxShadow: '0 4px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(80,60,120,0.08)',
      backdropFilter: 'blur(12px)',
      zIndex: '50',
      color: '#c8c8e0',
      fontFamily: "'Segoe UI', 'Consolas', monospace",
      fontSize: '13px',
      userSelect: 'none',
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '16px',
      fontWeight: '600',
      color: '#e0e0f0',
      marginBottom: '18px',
      textAlign: 'center',
      letterSpacing: '2px',
      textTransform: 'uppercase',
    });
    title.textContent = '⭐ StarForge';
    panel.appendChild(title);

    const countSlider = this.createSlider('粒子数量', 500, 10000, 5000, 100, (val) => {
      this.particleSystem.setParticleCount(val);
      this.notifyChange();
    });
    panel.appendChild(countSlider.container);

    const sizeSlider = this.createSlider('粒子大小 (px)', 2, 8, 4, 0.5, (val) => {
      this.particleSystem.setBaseSize(val);
      this.notifyChange();
    });
    panel.appendChild(sizeSlider.container);

    const speedSlider = this.createSlider('流动速度', 0, 2, 1.0, 0.1, (val) => {
      this.particleSystem.setSpeedFactor(val);
      this.notifyChange();
    });
    panel.appendChild(speedSlider.container);

    const separator = document.createElement('div');
    Object.assign(separator.style, {
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(180,180,220,0.2), transparent)',
      margin: '16px 0',
    });
    panel.appendChild(separator);

    const resetBtn = this.createButton('重置视角', () => {
      this.controls.resetView();
    });
    panel.appendChild(resetBtn);

    const exportBtn = this.createButton('导出 JSON', () => {
      this.exportConfig();
    });
    panel.appendChild(exportBtn);

    return panel;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    defaultValue: number,
    step: number,
    onChange: (val: number) => void,
  ): { container: HTMLElement; input: HTMLInputElement; valueDisplay: HTMLElement } {
    const container = document.createElement('div');
    Object.assign(container.style, {
      marginBottom: '14px',
    });

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = '#a0a0c0';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = String(defaultValue);
    Object.assign(valueDisplay.style, {
      color: '#d0b0ff',
      fontWeight: '600',
      fontSize: '13px',
      minWidth: '40px',
      textAlign: 'right',
    });

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueDisplay);
    container.appendChild(labelRow);

    const sliderWrap = document.createElement('div');
    Object.assign(sliderWrap.style, {
      position: 'relative',
      width: '100%',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
    });

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(defaultValue);

    Object.assign(input.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'linear-gradient(90deg, rgba(100,70,180,0.4), rgba(160,120,220,0.6))',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
    });

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueDisplay.textContent = Number.isInteger(val) ? String(val) : val.toFixed(1);
      onChange(val);
    });

    const style = document.createElement('style');
    style.textContent = `
      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: radial-gradient(circle, #d0b0ff 40%, #9070c0 100%);
        border: 2px solid rgba(200,180,255,0.5);
        box-shadow: 0 0 6px rgba(160,120,220,0.5);
        cursor: pointer;
      }
      #control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: radial-gradient(circle, #d0b0ff 40%, #9070c0 100%);
        border: 2px solid rgba(200,180,255,0.5);
        box-shadow: 0 0 6px rgba(160,120,220,0.5);
        cursor: pointer;
      }
      #control-panel input[type="range"]::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 2px;
        background: linear-gradient(90deg, rgba(100,70,180,0.4), rgba(160,120,220,0.6));
      }
      #control-panel input[type="range"]::-moz-range-track {
        height: 4px;
        border-radius: 2px;
        background: linear-gradient(90deg, rgba(100,70,180,0.4), rgba(160,120,220,0.6));
      }
    `;
    if (!document.querySelector('#starforge-slider-styles')) {
      style.id = 'starforge-slider-styles';
      document.head.appendChild(style);
    }

    sliderWrap.appendChild(input);
    container.appendChild(sliderWrap);

    return { container, input, valueDisplay };
  }

  private createButton(text: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = text;

    Object.assign(btn.style, {
      width: '100%',
      padding: '8px 0',
      marginTop: '8px',
      background: 'linear-gradient(135deg, rgba(80,60,140,0.4), rgba(50,40,100,0.3))',
      border: '1px solid rgba(180,180,220,0.2)',
      borderRadius: '6px',
      color: '#c0c0e0',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: "'Segoe UI', 'Consolas', monospace",
      letterSpacing: '1px',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'linear-gradient(135deg, rgba(100,80,160,0.5), rgba(70,55,120,0.4))';
      btn.style.borderColor = 'rgba(200,180,255,0.4)';
      btn.style.color = '#e0e0f8';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'linear-gradient(135deg, rgba(80,60,140,0.4), rgba(50,40,100,0.3))';
      btn.style.borderColor = 'rgba(180,180,220,0.2)';
      btn.style.color = '#c0c0e0';
    });
    btn.addEventListener('click', onClick);

    return btn;
  }

  private notifyChange(): void {
    if (this.onConfigChange) {
      this.onConfigChange({
        particleCount: this.particleSystem.getCount(),
        baseSize: this.particleSystem.getBaseSize(),
        speedFactor: this.particleSystem.getSpeedFactor(),
      });
    }
  }

  private exportConfig(): void {
    const config = this.particleSystem.exportConfig();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `starforge-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
