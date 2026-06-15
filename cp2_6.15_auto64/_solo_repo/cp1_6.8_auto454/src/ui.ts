import type { ParticleScene } from './scene';
import type { InteractionManager } from './interaction';
import {
  MIN_PARTICLES,
  MAX_PARTICLES,
  DEFAULT_PARTICLES,
  MIN_WAVE_AMP,
  MAX_WAVE_AMP,
  DEFAULT_WAVE_AMP,
  THEMES,
  type ThemeName,
} from './utils';

export class UIController {
  private panel: HTMLElement;
  private particleScene: ParticleScene;
  private interaction: InteractionManager;
  private collapsed = false;
  private toggleBtn: HTMLElement | null = null;

  constructor(particleScene: ParticleScene, interaction: InteractionManager) {
    this.particleScene = particleScene;
    this.interaction = interaction;
    this.panel = this.createPanel();
    document.getElementById('app')!.appendChild(this.panel);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'ctrl-panel';

    const style = document.createElement('style');
    style.textContent = this.getStyles();
    document.head.appendChild(style);

    const header = document.createElement('div');
    header.className = 'ctrl-header';

    const title = document.createElement('span');
    title.className = 'ctrl-title';
    title.textContent = '流光幻境';

    this.toggleBtn = document.createElement('button');
    this.toggleBtn.className = 'ctrl-toggle';
    this.toggleBtn.innerHTML = '◀';
    this.toggleBtn.addEventListener('click', () => this.toggle());

    header.appendChild(title);
    header.appendChild(this.toggleBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'ctrl-body';

    body.appendChild(this.createSlider(
      '粒子数量',
      MIN_PARTICLES,
      MAX_PARTICLES,
      DEFAULT_PARTICLES,
      100,
      (v) => this.particleScene.createParticles(v)
    ));

    body.appendChild(this.createSlider(
      '波浪幅度',
      MIN_WAVE_AMP,
      MAX_WAVE_AMP,
      DEFAULT_WAVE_AMP,
      0.1,
      (v) => this.particleScene.setWaveAmp(v)
    ));

    body.appendChild(this.createThemeSelector());

    body.appendChild(this.createResetButton());

    panel.appendChild(body);

    return panel;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onChange: (v: number) => void
  ): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl-row';

    const lbl = document.createElement('label');
    lbl.className = 'ctrl-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'ctrl-value';
    val.textContent = String(value);

    const top = document.createElement('div');
    top.className = 'ctrl-row-top';
    top.appendChild(lbl);
    top.appendChild(val);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.className = 'ctrl-slider';

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      val.textContent = step >= 1 ? String(Math.round(v)) : v.toFixed(1);
      onChange(v);
    });

    wrap.appendChild(top);
    wrap.appendChild(slider);

    return wrap;
  }

  private createThemeSelector(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl-row';

    const lbl = document.createElement('label');
    lbl.className = 'ctrl-label';
    lbl.textContent = '颜色主题';

    const btns = document.createElement('div');
    btns.className = 'ctrl-themes';

    const themeNames: ThemeName[] = ['phantom', 'aurora', 'lava', 'abyss'];

    themeNames.forEach((name) => {
      const theme = THEMES[name];
      const btn = document.createElement('button');
      btn.className = 'ctrl-theme-btn' + (name === 'phantom' ? ' active' : '');
      btn.dataset.theme = name;

      const dot = document.createElement('span');
      dot.className = 'ctrl-theme-dot';
      const c1 = theme.colors[0];
      const c2 = theme.colors[2];
      dot.style.background = `linear-gradient(135deg, #${c1.getHexString()}, #${c2.getHexString()})`;

      const txt = document.createElement('span');
      txt.textContent = theme.label;

      btn.appendChild(dot);
      btn.appendChild(txt);

      btn.addEventListener('click', () => {
        btns.querySelectorAll('.ctrl-theme-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.particleScene.setTheme(name);
      });

      btns.appendChild(btn);
    });

    wrap.appendChild(lbl);
    wrap.appendChild(btns);

    return wrap;
  }

  private createResetButton(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl-row ctrl-row-btn';

    const btn = document.createElement('button');
    btn.className = 'ctrl-reset-btn';
    btn.textContent = '重置视角';

    btn.addEventListener('click', () => {
      this.interaction.resetView();
      btn.classList.add('clicked');
      setTimeout(() => btn.classList.remove('clicked'), 300);
    });

    wrap.appendChild(btn);
    return wrap;
  }

  private toggle() {
    this.collapsed = !this.collapsed;
    const body = this.panel.querySelector('.ctrl-body') as HTMLElement;
    if (this.collapsed) {
      body.style.maxHeight = '0';
      body.style.opacity = '0';
      body.style.marginTop = '0';
      this.toggleBtn!.innerHTML = '▶';
    } else {
      body.style.maxHeight = '400px';
      body.style.opacity = '1';
      body.style.marginTop = '12px';
      this.toggleBtn!.innerHTML = '◀';
    }
  }

  private getStyles(): string {
    return `
      .ctrl-panel {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 100;
        min-width: 240px;
        background: rgba(10, 12, 30, 0.65);
        backdrop-filter: blur(20px) saturate(1.4);
        -webkit-backdrop-filter: blur(20px) saturate(1.4);
        border: 1px solid rgba(0, 229, 255, 0.12);
        border-radius: 16px;
        padding: 16px 18px;
        font-family: 'Noto Sans SC', sans-serif;
        color: rgba(220, 230, 255, 0.9);
        box-shadow:
          0 0 30px rgba(0, 229, 255, 0.06),
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.04);
        user-select: none;
        transition: transform 0.3s ease;
      }

      .ctrl-panel:hover {
        border-color: rgba(0, 229, 255, 0.22);
        box-shadow:
          0 0 40px rgba(0, 229, 255, 0.1),
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      .ctrl-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .ctrl-title {
        font-family: 'Orbitron', monospace;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.15em;
        color: #00e5ff;
        text-shadow: 0 0 12px rgba(0, 229, 255, 0.4);
      }

      .ctrl-toggle {
        background: none;
        border: none;
        color: rgba(0, 229, 255, 0.5);
        font-size: 11px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .ctrl-toggle:hover {
        color: #00e5ff;
        background: rgba(0, 229, 255, 0.08);
      }

      .ctrl-body {
        max-height: 400px;
        opacity: 1;
        overflow: hidden;
        transition: max-height 0.4s ease, opacity 0.3s ease, margin-top 0.3s ease;
        margin-top: 12px;
      }

      .ctrl-row {
        margin-bottom: 14px;
      }

      .ctrl-row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .ctrl-label {
        font-size: 12px;
        font-weight: 400;
        color: rgba(200, 210, 240, 0.7);
        letter-spacing: 0.05em;
      }

      .ctrl-value {
        font-family: 'Orbitron', monospace;
        font-size: 11px;
        color: #00e5ff;
        min-width: 40px;
        text-align: right;
      }

      .ctrl-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(0, 229, 255, 0.12);
        outline: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .ctrl-slider:hover {
        background: rgba(0, 229, 255, 0.2);
      }
      .ctrl-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #00e5ff;
        box-shadow: 0 0 10px rgba(0, 229, 255, 0.5), 0 0 3px rgba(0, 229, 255, 0.8);
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .ctrl-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 16px rgba(0, 229, 255, 0.7), 0 0 5px rgba(0, 229, 255, 1);
      }
      .ctrl-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #00e5ff;
        border: none;
        box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
        cursor: pointer;
      }

      .ctrl-themes {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 6px;
      }

      .ctrl-theme-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.03);
        color: rgba(200, 210, 240, 0.6);
        font-size: 11px;
        font-family: 'Noto Sans SC', sans-serif;
        cursor: pointer;
        transition: all 0.25s ease;
      }
      .ctrl-theme-btn:hover {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(220, 230, 255, 0.9);
        border-color: rgba(255, 255, 255, 0.15);
      }
      .ctrl-theme-btn.active {
        border-color: rgba(0, 229, 255, 0.5);
        background: rgba(0, 229, 255, 0.08);
        color: #00e5ff;
        box-shadow: 0 0 12px rgba(0, 229, 255, 0.15);
      }

      .ctrl-theme-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .ctrl-row-btn {
        margin-top: 4px;
        margin-bottom: 0;
      }

      .ctrl-reset-btn {
        width: 100%;
        padding: 8px 16px;
        border: 1px solid rgba(0, 229, 255, 0.2);
        border-radius: 20px;
        background: rgba(0, 229, 255, 0.06);
        color: rgba(0, 229, 255, 0.8);
        font-family: 'Noto Sans SC', sans-serif;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.25s ease;
        letter-spacing: 0.1em;
      }
      .ctrl-reset-btn:hover {
        background: rgba(0, 229, 255, 0.12);
        border-color: rgba(0, 229, 255, 0.4);
        color: #00e5ff;
        box-shadow: 0 0 16px rgba(0, 229, 255, 0.15);
      }
      .ctrl-reset-btn.clicked {
        transform: scale(0.95);
        background: rgba(0, 229, 255, 0.2);
      }

      @media (max-width: 600px) {
        .ctrl-panel {
          bottom: 12px;
          left: 12px;
          right: 12px;
          min-width: unset;
        }
      }
    `;
  }

  dispose() {
    this.panel.remove();
  }
}
