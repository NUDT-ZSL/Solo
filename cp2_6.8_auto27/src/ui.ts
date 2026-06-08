import { PlanetInfo } from './solarsystem';

export interface UICallbacks {
  onSpeedChange: (multiplier: number) => void;
  onToggleOrbits: (visible: boolean) => void;
  onResetView: () => void;
  onPlanetClick: (event: MouseEvent) => void;
}

interface UIElements {
  controlPanel: HTMLDivElement;
  infoPanel: HTMLDivElement;
  speedSlider: HTMLInputElement;
  speedValue: HTMLSpanElement;
  orbitButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
}

let elements: UIElements | null = null;
let orbitsVisible = true;

function createControlPanel(cb: UICallbacks): UIElements {
  const panel = document.createElement('div');
  panel.id = 'control-panel';
  Object.assign(panel.style, {
    position: 'fixed',
    top: '20px',
    left: '20px',
    padding: '20px',
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    minWidth: '260px',
    zIndex: '100',
    userSelect: 'none'
  } as unknown as CSSStyleDeclaration);

  const title = document.createElement('div');
  title.textContent = '太阳系控制面板';
  Object.assign(title.style, {
  fontSize: '16px',
  fontWeight: '600',
  marginBottom: '16px',
  letterSpacing: '0.5px'
  } as CSSStyleDeclaration);
  panel.appendChild(title);

  const speedLabel = document.createElement('div');
  speedLabel.textContent = '公转速度';
  Object.assign(speedLabel.style, {
  fontSize: '13px',
  color: 'rgba(255, 255, 255, 0.8)',
  marginBottom: '8px'
  } as CSSStyleDeclaration);
  panel.appendChild(speedLabel);

  const sliderContainer = document.createElement('div');
  Object.assign(sliderContainer.style, {
  position: 'relative',
  height: '32px',
  marginBottom: '4px'
  } as CSSStyleDeclaration);

  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.min = '0.5';
  speedSlider.max = '2.0';
  speedSlider.step = '0.1';
  speedSlider.value = '1.0';
  Object.assign(speedSlider.style, {
    width: '100%',
    height: '6px',
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer',
    marginTop: '10px'
  } as unknown as CSSStyleDeclaration);

  const sliderStyle = document.createElement('style');
  sliderStyle.textContent = `
    #control-panel input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #60a5fa;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
      transition: transform 0.15s ease;
    }
    #control-panel input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }
    #control-panel input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      border: 2px solid #60a5fa;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
    }
  `;
  document.head.appendChild(sliderStyle);

  sliderContainer.appendChild(speedSlider);
  panel.appendChild(sliderContainer);

  const speedValue = document.createElement('span');
  speedValue.textContent = '1.0x';
  Object.assign(speedValue.style, {
  display: 'block',
  textAlign: 'right',
  fontSize: '13px',
  color: '#60a5fa',
  fontWeight: '600',
  marginTop: '6px',
  marginBottom: '16px'
  } as CSSStyleDeclaration);
  panel.appendChild(speedValue);

  const buttonStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: '500',
  color: '#ffffff',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'inherit',
  marginBottom: '10px'
  } as CSSStyleDeclaration;

  const orbitButton = document.createElement('button');
  orbitButton.textContent = '隐藏轨道';
  Object.assign(orbitButton.style, buttonStyle);
  orbitButton.addEventListener('mouseenter', () => {
    orbitButton.style.background = 'rgba(255, 255, 255, 0.18)';
  });
  orbitButton.addEventListener('mouseleave', () => {
  orbitButton.style.background = 'rgba(255, 255, 255, 0.1)';
  });
  panel.appendChild(orbitButton);

  const resetButton = document.createElement('button');
  resetButton.textContent = '重置视角';
  Object.assign(resetButton.style, buttonStyle);
  resetButton.style.marginBottom = '0px';
  resetButton.addEventListener('mouseenter', () => {
  resetButton.style.background = 'rgba(255, 255, 255, 0.18)';
  });
  resetButton.addEventListener('mouseleave', () => {
  resetButton.style.background = 'rgba(255, 255, 255, 0.1)';
  });
  panel.appendChild(resetButton);

  const infoPanel = document.createElement('div');
  infoPanel.id = 'planet-info-panel';
  Object.assign(infoPanel.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '300px',
    padding: '20px',
    borderRadius: '14px',
    background: 'rgba(17, 17, 17, 0.85)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    display: 'none',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    zIndex: '100',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
  } as unknown as CSSStyleDeclaration);

  speedSlider.addEventListener('input', () => {
  const value = parseFloat(speedSlider.value);
  speedValue.textContent = value.toFixed(1) + 'x';
  cb.onSpeedChange(value);
  });

  orbitButton.addEventListener('click', () => {
  orbitsVisible = !orbitsVisible;
  orbitButton.textContent = orbitsVisible ? '隐藏轨道' : '显示轨道';
  cb.onToggleOrbits(orbitsVisible);
  });

  resetButton.addEventListener('click', () => {
  cb.onResetView();
  });

  document.addEventListener('click', (e) => {
    if (!infoPanel.contains(e.target as Node)) {
      const target = e.target as HTMLElement;
      if (!panel.contains(target)) {
        hideInfoPanel();
      }
    }
  }, true);

  return {
  controlPanel: panel,
  infoPanel,
  speedSlider,
  speedValue,
  orbitButton,
  resetButton
  };
}

export function showInfoPanel(info: PlanetInfo, screenX: number, screenY: number): void {
  if (!elements) return;
  const panel = elements.infoPanel;

  panel.innerHTML = '';

  const header = document.createElement('div');
  Object.assign(header.style, {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '14px'
  } as CSSStyleDeclaration);

  const colorDot = document.createElement('div');
  Object.assign(colorDot.style, {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: info.colorHex,
  marginRight: '10px',
  boxShadow: `0 0 12px ${info.colorHex}`
  } as CSSStyleDeclaration);
  header.appendChild(colorDot);

  const nameWrap = document.createElement('div');
  const nameCn = document.createElement('div');
  nameCn.textContent = info.name;
  Object.assign(nameCn.style, {
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.2'
  } as CSSStyleDeclaration);
  const nameEn = document.createElement('div');
  nameEn.textContent = info.nameEn;
  Object.assign(nameEn.style, {
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.5)',
  marginTop: '2px'
  } as CSSStyleDeclaration);
  nameWrap.appendChild(nameCn);
  nameWrap.appendChild(nameEn);
  header.appendChild(nameWrap);
  panel.appendChild(header);

  const items: [string, string][] = [
  ['公转周期', `${info.orbitalPeriod.toLocaleString()} 天`],
  ['距太阳距离', `${info.distanceAU} AU`],
  ['相对大小', `${info.radius.toFixed(1)} 单位`],
  ['代表色', info.colorHex.toUpperCase()]
  ];

  for (const [label, value] of items) {
    const row = document.createElement('div');
  Object.assign(row.style, {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  fontSize: '13px'
  } as CSSStyleDeclaration);

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  Object.assign(labelEl.style, {
  color: 'rgba(255, 255, 255, 0.6)'
  } as CSSStyleDeclaration);

  const valueEl = document.createElement('span');
  valueEl.textContent = value;
  Object.assign(valueEl.style, {
  fontWeight: '500'
  } as CSSStyleDeclaration);

  row.appendChild(labelEl);
  row.appendChild(valueEl);
  panel.appendChild(row);
  }

  const maxX = Math.min(screenX, window.innerWidth - 320);
  const maxY = Math.min(screenY, window.innerHeight - 260);
  panel.style.left = `${maxX + 20}px`;
  panel.style.top = `${Math.max(20, maxY)}px`;
  panel.style.right = 'auto';

  panel.style.display = 'block';
  requestAnimationFrame(() => {
  panel.style.opacity = '1';
  });
}

export function hideInfoPanel(): void {
  if (!elements) return;
  elements.infoPanel.style.opacity = '0';
  setTimeout(() => {
  if (elements) {
  elements.infoPanel.style.display = 'none';
  }
  }, 300);
}

export function initUI(cb: UICallbacks): void {
  elements = createControlPanel(cb);
  document.body.appendChild(elements.controlPanel);
  document.body.appendChild(elements.infoPanel);
}
