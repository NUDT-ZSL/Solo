import * as THREE from 'three';

export interface ColorTheme {
  name: string;
  center: string;
  edge: string;
  preview: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  { name: '暖金冷蓝', center: '#ffcc00', edge: '#0066ff', preview: 'linear-gradient(135deg, #ffcc00, #0066ff)' },
  { name: '赤焰冰青', center: '#ff4444', edge: '#00cccc', preview: 'linear-gradient(135deg, #ff4444, #00cccc)' },
  { name: '橙暮紫夜', center: '#ff8800', edge: '#8800ff', preview: 'linear-gradient(135deg, #ff8800, #8800ff)' },
  { name: '粉霞翠影', center: '#ff66aa', edge: '#00ff88', preview: 'linear-gradient(135deg, #ff66aa, #00ff88)' },
  { name: '银白深蓝', center: '#eeeeff', edge: '#0033cc', preview: 'linear-gradient(135deg, #eeeeff, #0033cc)' },
];

export interface ControlPanelCallbacks {
  onSpeedChange: (speed: number) => void;
  onColorChange: (center: THREE.Color, edge: THREE.Color) => void;
  onReset: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private sourceCountEl: HTMLSpanElement;
  private speedSlider: HTMLInputElement;
  private speedValueEl: HTMLSpanElement;
  private callbacks: ControlPanelCallbacks;
  private currentThemeIndex: number;
  private themeButtons: HTMLButtonElement[];

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.currentThemeIndex = 0;
    this.themeButtons = [];

    this.container = document.createElement('div');
    this.container.id = 'control-panel';
    Object.assign(this.container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '260px',
      padding: '20px',
      borderRadius: '16px',
      background: 'rgba(255, 255, 255, 0.06)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      color: '#ccc',
      fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      fontSize: '13px',
      zIndex: '1000',
      userSelect: 'none',
      transition: 'opacity 0.3s ease',
    });

    const title = this.createLabel('幻境回响', { fontSize: '15px', fontWeight: '600', color: '#eee', marginBottom: '16px', letterSpacing: '2px' });
    this.container.appendChild(title);

    const sourceRow = document.createElement('div');
    Object.assign(sourceRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' });
    sourceRow.appendChild(this.createLabel('声波源数量'));
    this.sourceCountEl = document.createElement('span');
    Object.assign(this.sourceCountEl.style, { color: '#fff', fontWeight: '600', fontSize: '16px', minWidth: '24px', textAlign: 'right' });
    this.sourceCountEl.textContent = '0';
    sourceRow.appendChild(this.sourceCountEl);
    this.container.appendChild(sourceRow);

    const speedRow = document.createElement('div');
    Object.assign(speedRow.style, { marginBottom: '14px' });
    const speedHeader = document.createElement('div');
    Object.assign(speedHeader.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' });
    speedHeader.appendChild(this.createLabel('波纹速度'));
    this.speedValueEl = document.createElement('span');
    Object.assign(this.speedValueEl.style, { color: '#aaa', fontSize: '12px' });
    this.speedValueEl.textContent = '1.0';
    speedHeader.appendChild(this.speedValueEl);
    speedRow.appendChild(speedHeader);

    this.speedSlider = document.createElement('input');
    this.speedSlider.type = 'range';
    this.speedSlider.min = '0.5';
    this.speedSlider.max = '2.0';
    this.speedSlider.step = '0.1';
    this.speedSlider.value = '1.0';
    Object.assign(this.speedSlider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'rgba(255,255,255,0.15)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
    });
    this.speedSlider.addEventListener('input', this.onSpeedInput);
    speedRow.appendChild(this.speedSlider);
    this.container.appendChild(speedRow);

    const colorRow = document.createElement('div');
    Object.assign(colorRow.style, { marginBottom: '16px' });
    colorRow.appendChild(this.createLabel('波纹颜色'));
    const themeContainer = document.createElement('div');
    Object.assign(themeContainer.style, { display: 'flex', gap: '8px', marginTop: '8px' });

    COLOR_THEMES.forEach((theme, index) => {
      const btn = document.createElement('button');
      btn.title = theme.name;
      Object.assign(btn.style, {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: theme.preview,
        border: index === 0 ? '2px solid rgba(255,255,255,0.8)' : '2px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease, transform 0.2s ease',
        padding: '0',
        outline: 'none',
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.15)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('click', () => this.selectTheme(index));
      themeContainer.appendChild(btn);
      this.themeButtons.push(btn);
    });

    colorRow.appendChild(themeContainer);
    this.container.appendChild(colorRow);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置';
    Object.assign(resetBtn.style, {
      width: '100%',
      padding: '8px 0',
      borderRadius: '8px',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      color: '#ccc',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'background 0.2s ease, color 0.2s ease',
      outline: 'none',
    });
    resetBtn.addEventListener('mouseenter', () => {
      resetBtn.style.background = 'rgba(255, 80, 80, 0.2)';
      resetBtn.style.color = '#ff8888';
    });
    resetBtn.addEventListener('mouseleave', () => {
      resetBtn.style.background = 'rgba(255, 255, 255, 0.08)';
      resetBtn.style.color = '#ccc';
    });
    resetBtn.addEventListener('click', () => this.callbacks.onReset());
    this.container.appendChild(resetBtn);

    document.body.appendChild(this.container);

    this.injectSliderStyles();
    this.applyTheme(0);
  }

  private createLabel(text: string, overrides: Partial<CSSStyleDeclaration> = {}): HTMLDivElement {
    const el = document.createElement('div');
    el.textContent = text;
    const base: Partial<CSSStyleDeclaration> = { fontSize: '12px', color: '#999', letterSpacing: '0.5px' };
    Object.assign(el.style, base, overrides);
    return el;
  }

  private onSpeedInput = (): void => {
    const speed = parseFloat(this.speedSlider.value);
    this.speedValueEl.textContent = speed.toFixed(1);
    this.callbacks.onSpeedChange(speed);
  };

  private selectTheme(index: number): void {
    this.currentThemeIndex = index;
    this.applyTheme(index);

    this.themeButtons.forEach((btn, i) => {
      btn.style.borderColor = i === index ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)';
    });

    const theme = COLOR_THEMES[index];
    this.callbacks.onColorChange(
      new THREE.Color(theme.center),
      new THREE.Color(theme.edge)
    );
  }

  private applyTheme(index: number): void {
    const theme = COLOR_THEMES[index];
    this.container.style.border = `1px solid ${theme.center}33`;
    this.container.style.boxShadow = `0 8px 32px ${theme.edge}22`;
  }

  updateSourceCount(count: number): void {
    this.sourceCountEl.textContent = String(count);
  }

  setSpeed(speed: number): void {
    this.speedSlider.value = String(speed);
    this.speedValueEl.textContent = speed.toFixed(1);
  }

  private injectSliderStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        box-shadow: 0 0 6px rgba(255,255,255,0.3);
      }
      #control-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 6px rgba(255,255,255,0.3);
      }
    `;
    document.head.appendChild(style);
  }

  dispose(): void {
    this.speedSlider.removeEventListener('input', this.onSpeedInput);
    document.body.removeChild(this.container);
  }
}
