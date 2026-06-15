import { ParticleSystem } from './particleSystem';
import { Controls } from './controls';

export interface UIConfig {
  particleCount: number;
  baseSize: number;
  speedFactor: number;
}

export class UI {
  private panel!: HTMLElement;
  private particleSystem: ParticleSystem;
  private controls: Controls;
  private onConfigChange?: (config: UIConfig) => void;

  constructor(particleSystem: ParticleSystem, controls: Controls) {
    this.particleSystem = particleSystem;
    this.controls = controls;

    const mount = (): void => {
      this.injectSliderStyles();
      this.panel = this.createPanel();
      this.bindPanelEvents();
      (document.body || document.documentElement).appendChild(this.panel);
    };

    const safeMount = (): void => {
      if (typeof this.bindPanelEvents === 'function') {
        mount();
      } else {
        queueMicrotask(safeMount);
      }
    };

    if (document.body) {
      safeMount();
    } else {
      document.addEventListener('DOMContentLoaded', () => safeMount(), { once: true });
    }
  }

  setOnConfigChange(callback: (config: UIConfig) => void): void {
    this.onConfigChange = callback;
  }

  private injectSliderStyles(): void {
    if (document.getElementById('starforge-slider-styles')) return;
    const style = document.createElement('style');
    style.id = 'starforge-slider-styles';
    style.textContent = `
      #control-panel .sf-slider,
      #control-panel input[type="range"].sf-slider {
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg, #6a4ec4 0%, #b295ff 45%, #e6d8ff 100%);
        outline: none !important;
        border: none !important;
        cursor: pointer;
        box-shadow: inset 0 0 6px rgba(40, 20, 80, 0.6),
                    0 0 8px rgba(140, 100, 220, 0.18);
        position: relative;
        padding: 0;
        margin: 0;
      }
      #control-panel .sf-slider::-webkit-slider-runnable-track {
        -webkit-appearance: none;
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg, #6a4ec4 0%, #b295ff 45%, #e6d8ff 100%);
        border: 1px solid rgba(200, 180, 255, 0.08);
        box-shadow: inset 0 0 6px rgba(40, 20, 80, 0.6);
      }
      #control-panel .sf-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #f0e6ff, #c7aaff 45%, #8763d9 85%);
        border: 2px solid rgba(220, 200, 255, 0.65);
        box-shadow: 0 0 0 3px rgba(140, 100, 220, 0.12),
                    0 2px 6px rgba(0, 0, 0, 0.35),
                    0 0 10px rgba(180, 140, 255, 0.45);
        cursor: pointer;
        transition: transform 0.14s ease, box-shadow 0.14s ease;
        margin-top: -6px;
      }
      #control-panel .sf-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 0 4px rgba(160, 120, 240, 0.2),
                    0 2px 8px rgba(0, 0, 0, 0.4),
                    0 0 14px rgba(200, 160, 255, 0.65);
      }
      #control-panel .sf-slider::-moz-range-track {
        -moz-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 999px;
        background: linear-gradient(90deg, #6a4ec4 0%, #b295ff 45%, #e6d8ff 100%);
        border: 1px solid rgba(200, 180, 255, 0.08);
        box-shadow: inset 0 0 6px rgba(40, 20, 80, 0.6);
      }
      #control-panel .sf-slider::-moz-range-thumb {
        -moz-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #f0e6ff, #c7aaff 45%, #8763d9 85%);
        border: 2px solid rgba(220, 200, 255, 0.65);
        box-shadow: 0 0 0 3px rgba(140, 100, 220, 0.12),
                    0 2px 6px rgba(0, 0, 0, 0.35),
                    0 0 10px rgba(180, 140, 255, 0.45);
        cursor: pointer;
        transition: transform 0.14s ease, box-shadow 0.14s ease;
      }
      #control-panel .sf-slider::-moz-range-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 0 4px rgba(160, 120, 240, 0.2),
                    0 2px 8px rgba(0, 0, 0, 0.4),
                    0 0 14px rgba(200, 160, 255, 0.65);
      }
      #control-panel .sf-slider::-moz-focus-outer {
        border: 0;
      }
      #control-panel .sf-slider::-ms-track {
        width: 100%;
        height: 6px;
        cursor: pointer;
        background: transparent;
        border-color: transparent;
        color: transparent;
        border-width: 6px 0;
      }
      #control-panel .sf-slider::-ms-fill-lower {
        background: linear-gradient(90deg, #6a4ec4 0%, #b295ff 60%);
        border-radius: 999px;
        border: 1px solid rgba(200, 180, 255, 0.08);
        box-shadow: inset 0 0 6px rgba(40, 20, 80, 0.6);
      }
      #control-panel .sf-slider::-ms-fill-upper {
        background: linear-gradient(90deg, #b295ff 0%, #e6d8ff 100%);
        border-radius: 999px;
        border: 1px solid rgba(200, 180, 255, 0.08);
        box-shadow: inset 0 0 6px rgba(40, 20, 80, 0.6);
      }
      #control-panel .sf-slider::-ms-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #f0e6ff, #c7aaff 45%, #8763d9 85%);
        border: 2px solid rgba(220, 200, 255, 0.65);
        box-shadow: 0 0 0 3px rgba(140, 100, 220, 0.12),
                    0 2px 6px rgba(0, 0, 0, 0.35),
                    0 0 10px rgba(180, 140, 255, 0.45);
        cursor: pointer;
        margin-top: 0;
      }
      #control-panel .sf-slider::-ms-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 0 4px rgba(160, 120, 240, 0.2),
                    0 2px 8px rgba(0, 0, 0, 0.4),
                    0 0 14px rgba(200, 160, 255, 0.65);
      }
      #control-panel .sf-slider:focus,
      #control-panel .sf-slider::-webkit-slider-runnable-track:focus,
      #control-panel .sf-slider::-moz-range-track:focus,
      #control-panel .sf-slider::-ms-track:focus {
        outline: none !important;
      }
      #control-panel .sf-btn {
        transition: all 0.22s cubic-bezier(.2,.8,.2,1);
      }
      #control-panel .sf-btn:hover {
        transform: translateY(-1px);
      }
      #control-panel .sf-btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';

    Object.assign(panel.style, {
      position: 'absolute',
      top: '22px',
      right: '22px',
      width: '272px',
      padding: '22px 20px 18px',
      background: 'linear-gradient(155deg, rgba(16,14,44,0.92) 0%, rgba(26,20,58,0.86) 50%, rgba(18,14,40,0.9) 100%)',
      borderRadius: '14px',
      border: '1px solid rgba(200, 200, 240, 0.28)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.55), inset 0 0 28px rgba(90,60,160,0.08), 0 0 0 1px rgba(255,255,255,0.02)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      zIndex: '50',
      color: '#c8c8e0',
      fontFamily: "'Segoe UI', 'Segoe UI Symbol', 'Consolas', monospace",
      fontSize: '13px',
      userSelect: 'none',
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '17px',
      fontWeight: '700',
      color: '#ece6ff',
      marginBottom: '18px',
      textAlign: 'center',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      textShadow: '0 0 14px rgba(160,120,230,0.55)',
    });
    title.innerHTML = '&#10022; StarForge';
    panel.appendChild(title);

    const countSlider = this.createSlider(
      '粒子总数', 500, 10000, 5000, 100,
      (val) => {
        this.particleSystem.setParticleCount(val);
        this.notify();
      },
      (v) => String(v),
    );
    panel.appendChild(countSlider);

    const sizeSlider = this.createSlider(
      '粒子大小 (px)', 2, 8, 4, 0.5,
      (val) => {
        this.particleSystem.setBaseSize(val);
        this.notify();
      },
      (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
    );
    panel.appendChild(sizeSlider);

    const speedSlider = this.createSlider(
      '流动速度', 0, 2, 1.0, 0.1,
      (val) => {
        this.particleSystem.setSpeedFactor(val);
        this.notify();
      },
      (v) => v.toFixed(1),
    );
    panel.appendChild(speedSlider);

    const separator = document.createElement('div');
    Object.assign(separator.style, {
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, rgba(190,180,230,0.28) 50%, transparent 100%)',
      margin: '20px 4px 14px',
    });
    panel.appendChild(separator);

    panel.appendChild(this.createButton('重置视角', 'reset-view'));
    panel.appendChild(this.createButton('导出 JSON', 'export-json'));

    return panel;
  }

  private bindPanelEvents(): void {
    if (!this.panel) return;

    this.panel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest<HTMLButtonElement>('button[data-action]');
      if (!btn || !this.panel.contains(btn)) return;

      e.preventDefault();
      e.stopPropagation();

      const action = btn.getAttribute('data-action');
      try {
        if (action === 'reset-view') {
          this.controls.resetView();
        } else if (action === 'export-json') {
          this.exportConfig();
        }
      } catch (err) {
        console.error('[StarForge UI] action failed:', action, err);
      }
    });
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    defaultValue: number,
    step: number,
    onChange: (val: number) => void,
    format: (v: number) => string,
  ): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '15px';

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
      padding: '0 2px',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = '#a8a4c8';
    labelEl.style.letterSpacing = '0.5px';
    labelEl.style.fontSize = '12.5px';

    const valueEl = document.createElement('span');
    valueEl.textContent = format(defaultValue);
    Object.assign(valueEl.style, {
      color: '#d8c2ff',
      fontWeight: '700',
      fontSize: '13px',
      minWidth: '48px',
      textAlign: 'right',
      textShadow: '0 0 8px rgba(180,140,240,0.35)',
      fontVariantNumeric: 'tabular-nums',
    });

    header.appendChild(labelEl);
    header.appendChild(valueEl);
    wrap.appendChild(header);

    const track = document.createElement('div');
    Object.assign(track.style, {
      position: 'relative',
      width: '100%',
      height: '22px',
      display: 'flex',
      alignItems: 'center',
    });

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(defaultValue);
    input.className = 'sf-slider';

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueEl.textContent = format(val);
      onChange(val);
    });

    track.appendChild(input);
    wrap.appendChild(track);
    return wrap;
  }

  private createButton(text: string, action: string): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'sf-btn';
    btn.textContent = text;
    btn.setAttribute('data-action', action);
    btn.type = 'button';

    Object.assign(btn.style, {
      width: '100%',
      padding: '9px 0',
      marginTop: '8px',
      background: 'linear-gradient(135deg, rgba(90,65,165,0.45) 0%, rgba(58,45,125,0.32) 100%)',
      border: '1px solid rgba(200,190,240,0.22)',
      borderRadius: '8px',
      color: '#d2cced',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      fontFamily: "'Segoe UI', 'Consolas', monospace",
      letterSpacing: '1.5px',
      boxShadow: 'inset 0 0 10px rgba(100,70,180,0.1), 0 2px 10px rgba(0,0,0,0.25)',
      backdropFilter: 'blur(4px)',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'linear-gradient(135deg, rgba(115,85,195,0.58) 0%, rgba(78,60,155,0.42) 100%)';
      btn.style.borderColor = 'rgba(215,200,255,0.42)';
      btn.style.color = '#f0eaff';
      btn.style.boxShadow = 'inset 0 0 14px rgba(120,90,200,0.18), 0 4px 16px rgba(0,0,0,0.32), 0 0 14px rgba(150,110,230,0.25)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'linear-gradient(135deg, rgba(90,65,165,0.45) 0%, rgba(58,45,125,0.32) 100%)';
      btn.style.borderColor = 'rgba(200,190,240,0.22)';
      btn.style.color = '#d2cced';
      btn.style.boxShadow = 'inset 0 0 10px rgba(100,70,180,0.1), 0 2px 10px rgba(0,0,0,0.25)';
    });

    return btn;
  }

  private notify(): void {
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
