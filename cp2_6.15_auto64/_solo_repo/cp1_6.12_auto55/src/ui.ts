import { ParticleCloth, ThemeName, DensityLevel, THEMES } from './particleCloth';

export interface UIHandlers {
  onElasticityChange: (v: number) => void;
  onDampingChange: (v: number) => void;
  onDensityChange: (v: DensityLevel) => void;
  onThemeChange: (v: ThemeName) => void;
}

export class UIPanel {
  cloth: ParticleCloth;
  handlers: UIHandlers;
  container: HTMLElement;
  root: HTMLElement;
  fpsEl: HTMLElement | null = null;
  valueEls: Record<string, HTMLElement> = {};
  themeBtns: Record<ThemeName, HTMLButtonElement | null> = { fire: null, cold: null, jungle: null };
  densityBtns: Record<DensityLevel, HTMLButtonElement | null> = { sparse: null, medium: null, dense: null };
  styleEl: HTMLStyleElement;

  constructor(cloth: ParticleCloth, container: HTMLElement, handlers: UIHandlers) {
    this.cloth = cloth;
    this.handlers = handlers;
    this.container = container;
    this.root = container;
    this.styleEl = document.createElement('style');
    document.head.appendChild(this.styleEl);
    this.render();
    this.applyThemeColors(this.cloth.theme);
  }

  applyThemeColors(theme: ThemeName) {
    const t = THEMES[theme];
    this.styleEl.textContent = `
      :root {
        --accent: ${t.accent};
        --accent-glow: ${t.accentGlow};
        --slider-fill: ${t.accent};
      }
    `;
  }

  createSliderGroup(
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    format: (v: number) => string,
    onChange: (v: number) => void,
  ): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'control-group';
    const labelRow = document.createElement('div');
    labelRow.className = 'label-row';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'value';
    valueEl.textContent = format(value);
    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    this.valueEls[key] = valueEl;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('input', e => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      valueEl.textContent = format(v);
      onChange(v);
    });

    group.appendChild(labelRow);
    group.appendChild(input);
    return group;
  }

  render() {
    const frag = document.createDocumentFragment();

    const title = document.createElement('h1');
    title.textContent = 'AuraFabric';
    frag.appendChild(title);

    const lbl1 = document.createElement('div');
    lbl1.className = 'section-label';
    lbl1.textContent = '物理参数';
    frag.appendChild(lbl1);

    frag.appendChild(this.createSliderGroup(
      'elasticity',
      '弹性系数',
      0.1, 1.0, 0.1, 0.5,
      v => v.toFixed(1),
      v => this.handlers.onElasticityChange(v),
    ));

    frag.appendChild(this.createSliderGroup(
      'damping',
      '阻尼系数',
      0.5, 1.0, 0.01, 0.85,
      v => v.toFixed(2),
      v => this.handlers.onDampingChange(v),
    ));

    const lbl2 = document.createElement('div');
    lbl2.className = 'section-label';
    lbl2.textContent = '粒子';
    frag.appendChild(lbl2);

    const densityGroup = document.createElement('div');
    densityGroup.className = 'control-group';
    const densityLabel = document.createElement('div');
    densityLabel.className = 'section-label';
    densityLabel.style.marginBottom = '8px';
    densityLabel.textContent = '排列密度';
    densityGroup.appendChild(densityLabel);
    const densityBtns = document.createElement('div');
    densityBtns.className = 'density-buttons';
    (['sparse', 'medium', 'dense'] as DensityLevel[]).forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'density-btn';
      btn.textContent = d === 'sparse' ? '稀疏' : d === 'medium' ? '中等' : '密集';
      if (d === this.cloth.densityLevel) btn.classList.add('active');
      btn.addEventListener('click', () => {
        Object.entries(this.densityBtns).forEach(([, b]) => b?.classList.remove('active'));
        btn.classList.add('active');
        this.handlers.onDensityChange(d);
      });
      this.densityBtns[d] = btn;
      densityBtns.appendChild(btn);
    });
    densityGroup.appendChild(densityBtns);
    frag.appendChild(densityGroup);

    const lbl3 = document.createElement('div');
    lbl3.className = 'section-label';
    lbl3.textContent = '视觉主题';
    frag.appendChild(lbl3);

    const themeGroup = document.createElement('div');
    themeGroup.className = 'theme-buttons';
    const themes: { key: ThemeName; label: string; color: string }[] = [
      { key: 'fire', label: '火之舞', color: 'linear-gradient(135deg,#ffcc55,#ff3322)' },
      { key: 'cold', label: '冷夜', color: 'linear-gradient(135deg,#88ddff,#6633cc)' },
      { key: 'jungle', label: '丛林', color: 'linear-gradient(135deg,#ccff66,#22aa44)' },
    ];
    themes.forEach(th => {
      const btn = document.createElement('button');
      btn.className = 'theme-btn';
      if (th.key === this.cloth.theme) btn.classList.add('active');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = th.color;
      const lbl = document.createElement('span');
      lbl.textContent = th.label;
      btn.appendChild(sw);
      btn.appendChild(lbl);
      btn.addEventListener('click', () => {
        Object.entries(this.themeBtns).forEach(([, b]) => b?.classList.remove('active'));
        btn.classList.add('active');
        this.applyThemeColors(th.key);
        this.handlers.onThemeChange(th.key);
      });
      this.themeBtns[th.key] = btn;
      themeGroup.appendChild(btn);
    });
    frag.appendChild(themeGroup);

    const fps = document.createElement('div');
    fps.className = 'fps-display';
    fps.textContent = '-- FPS';
    this.fpsEl = fps;
    frag.appendChild(fps);

    this.root.innerHTML = '';
    this.root.appendChild(frag);
  }

  updateFPS(fps: number) {
    if (this.fpsEl) this.fpsEl.textContent = `${Math.round(fps)} FPS`;
  }
}
