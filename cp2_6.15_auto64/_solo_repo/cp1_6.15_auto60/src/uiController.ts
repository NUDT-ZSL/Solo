import { ColorTheme, colorThemes } from './particleSystem';

export interface UIConfig {
  particleCount: number;
  colorTheme: ColorTheme;
  spreadRadius: number;
  rotationSpeed: number;
}

export type UIChangeHandler = (config: UIConfig) => void;
export type ScreenshotHandler = () => void;

let currentConfig: UIConfig = {
  particleCount: 1500,
  colorTheme: 'nebula',
  spreadRadius: 2.5,
  rotationSpeed: 0.5
};

let changeHandler: UIChangeHandler | null = null;
let screenshotHandler: ScreenshotHandler | null = null;

function createSlider(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  id: string,
  onChange: (val: number) => void
): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'control-group';

  const header = document.createElement('div');
  header.className = 'control-header';

  const labelEl = document.createElement('span');
  labelEl.className = 'control-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'control-value';
  valueEl.id = `${id}-value`;
  valueEl.textContent = value.toFixed(step < 1 ? 1 : 0);
  valueEl.style.transition = 'opacity 0.2s ease';

  header.appendChild(labelEl);
  header.appendChild(valueEl);

  const sliderWrapper = document.createElement('div');
  sliderWrapper.className = 'slider-wrapper';

  const trackFill = document.createElement('div');
  trackFill.className = 'slider-track-fill';
  trackFill.id = `${id}-track-fill`;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);
  slider.className = 'custom-slider';
  slider.id = id;

  slider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    const percentage = ((val - min) / (max - min)) * 100;
    trackFill.style.width = `${percentage}%`;

    valueEl.style.opacity = '0';
    setTimeout(() => {
      valueEl.textContent = val.toFixed(step < 1 ? 1 : 0);
      valueEl.style.opacity = '1';
    }, 100);

    onChange(val);
  });

  const percentage = ((value - min) / (max - min)) * 100;
  trackFill.style.width = `${percentage}%`;

  sliderWrapper.appendChild(trackFill);
  sliderWrapper.appendChild(slider);

  wrapper.appendChild(header);
  wrapper.appendChild(sliderWrapper);

  return wrapper;
}

function createThemeSelector(onChange: (theme: ColorTheme) => void): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'control-group';

  const label = document.createElement('span');
  label.className = 'control-label';
  label.textContent = '颜色模式';
  wrapper.appendChild(label);

  const themeGrid = document.createElement('div');
  themeGrid.className = 'theme-grid';

  Object.entries(colorThemes).forEach(([key, theme]) => {
    const btn = document.createElement('button');
    btn.className = 'theme-btn';
    btn.dataset.theme = key;
    if (key === currentConfig.colorTheme) {
      btn.classList.add('active');
    }

    const gradient = document.createElement('div');
    gradient.className = 'theme-gradient';
    gradient.style.background = `linear-gradient(135deg, #${theme.center.getHexString()}, #${theme.edge.getHexString()})`;

    const name = document.createElement('span');
    name.className = 'theme-name';
    name.textContent = theme.name;

    btn.appendChild(gradient);
    btn.appendChild(name);

    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(key as ColorTheme);
    });

    themeGrid.appendChild(btn);
  });

  wrapper.appendChild(themeGrid);
  return wrapper;
}

function createScreenshotButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'screenshot-btn';
  btn.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  `;

  btn.addEventListener('click', () => {
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 200);

    if (screenshotHandler) {
      screenshotHandler();
    }
  });

  return btn;
}

function createMobileToggle(panel: HTMLDivElement): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.className = 'mobile-toggle';
  toggle.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
    </svg>
  `;

  toggle.addEventListener('click', () => {
    panel.classList.toggle('mobile-open');
  });

  return toggle;
}

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #0a0a0f;
      color: #fff;
    }

    #app {
      width: 100%;
      height: 100%;
      position: relative;
    }

    canvas {
      display: block;
    }

    .control-panel {
      position: fixed;
      top: 24px;
      left: 24px;
      width: 320px;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .panel-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 24px;
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .control-group {
      margin-bottom: 24px;
    }

    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .control-label {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
      display: block;
      margin-bottom: 10px;
    }

    .control-header .control-label {
      margin-bottom: 0;
    }

    .control-value {
      font-size: 13px;
      font-weight: 600;
      color: #06b6d4;
      min-width: 40px;
      text-align: right;
    }

    .slider-wrapper {
      position: relative;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }

    .slider-track-fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #06b6d4);
      border-radius: 3px;
      pointer-events: none;
    }

    .custom-slider {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      margin: 0;
    }

    .slider-wrapper::after {
      content: '';
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      pointer-events: none;
      transition: left 0.05s linear;
    }

    .theme-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .theme-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 2px solid transparent;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .theme-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .theme-btn.active {
      border-color: #06b6d4;
      background: rgba(6, 182, 212, 0.1);
    }

    .theme-gradient {
      width: 40px;
      height: 40px;
      border-radius: 8px;
    }

    .theme-name {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
    }

    .screenshot-btn {
      position: fixed;
      top: 24px;
      right: 24px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .screenshot-btn:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .mobile-toggle {
      display: none;
      position: fixed;
      top: 24px;
      left: 24px;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      z-index: 101;
    }

    .control-panel::-webkit-scrollbar {
      width: 6px;
    }

    .control-panel::-webkit-scrollbar-track {
      background: transparent;
    }

    .control-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
    }

    @media (max-width: 768px) {
      .mobile-toggle {
        display: flex;
      }

      .control-panel {
        top: auto;
        left: 0;
        bottom: 0;
        width: 100%;
        max-height: 60vh;
        border-radius: 20px 20px 0 0;
        transform: translateY(100%);
      }

      .control-panel.mobile-open {
        transform: translateY(0);
      }

      .screenshot-btn {
        top: 24px;
        right: 24px;
      }
    }
  `;
  document.head.appendChild(style);
}

export function initUI(handler: UIChangeHandler, screenshotCb: ScreenshotHandler): UIConfig {
  changeHandler = handler;
  screenshotHandler = screenshotCb;

  injectStyles();

  const app = document.getElementById('app')!;

  const panel = document.createElement('div');
  panel.className = 'control-panel';

  const title = document.createElement('h1');
  title.className = 'panel-title';
  title.textContent = '✨ 星云生成器';
  panel.appendChild(title);

  panel.appendChild(createSlider(
    '粒子数量',
    500, 5000, 100,
    currentConfig.particleCount,
    'particleCount',
    (val) => {
      currentConfig.particleCount = Math.round(val);
      if (changeHandler) changeHandler(currentConfig);
    }
  ));

  panel.appendChild(createThemeSelector((theme) => {
    currentConfig.colorTheme = theme;
    if (changeHandler) changeHandler(currentConfig);
  }));

  panel.appendChild(createSlider(
    '扩散半径',
    0.5, 5.0, 0.1,
    currentConfig.spreadRadius,
    'spreadRadius',
    (val) => {
      currentConfig.spreadRadius = val;
      if (changeHandler) changeHandler(currentConfig);
    }
  ));

  panel.appendChild(createSlider(
    '旋转速度',
    0, 2.0, 0.1,
    currentConfig.rotationSpeed,
    'rotationSpeed',
    (val) => {
      currentConfig.rotationSpeed = val;
      if (changeHandler) changeHandler(currentConfig);
    }
  ));

  app.appendChild(panel);
  app.appendChild(createMobileToggle(panel));
  app.appendChild(createScreenshotButton());

  return currentConfig;
}
