
import { GalaxyParams, DEFAULT_PARAMS } from './galaxy';

interface SliderConfig {
  key: keyof GalaxyParams;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'armCount', label: '螺旋臂数', min: 2, max: 6, step: 1, format: (v) => v.toFixed(0) },
  { key: 'armTightness', label: '旋臂紧密度', min: 0.5, max: 5.0, step: 0.1, format: (v) => v.toFixed(1) },
  { key: 'scatter', label: '粒子弥散度', min: 0.0, max: 1.0, step: 0.01, format: (v) => v.toFixed(2) },
  { key: 'thickness', label: '星系厚度', min: 0.0, max: 2.0, step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'rotationSpeed', label: '自转速度', min: 0.0, max: 1.0, step: 0.01, format: (v) => v.toFixed(2) },
];

export interface ControlsAPI {
  params: GalaxyParams;
  onChange: (callback: (params: GalaxyParams) => void) => void;
}

export function createControls(): ControlsAPI {
  const container = document.getElementById('controls') as HTMLDivElement;
  const panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;
  const params: GalaxyParams = { ...DEFAULT_PARAMS };
  const listeners: Array<(params: GalaxyParams) => void> = [];

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    container.classList.add('closed');
  } else {
    container.classList.remove('closed');
  }

  if (panelToggle) {
    panelToggle.addEventListener('click', () => {
      if (container.classList.contains('open')) {
        container.classList.remove('open');
        container.classList.add('closed');
      } else {
        container.classList.remove('closed');
        container.classList.add('open');
      }
    });
  }

  SLIDER_CONFIGS.forEach((config) => {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';

    const labelText = document.createElement('span');
    labelText.textContent = config.label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = config.format(params[config.key]);

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(params[config.key]);

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      params[config.key] = value;
      valueSpan.textContent = config.format(value);
      listeners.forEach((cb) => cb({ ...params }));
    });

    group.appendChild(labelRow);
    group.appendChild(slider);
    container.appendChild(group);
  });

  return {
    params,
    onChange: (callback) => {
      listeners.push(callback);
    },
  };
}
