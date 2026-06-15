export interface UIConfig {
  particleCount: number;
  tidalSpeed: number;
  connectionDistance: number;
  onParticleCountChange: (value: number) => void;
  onTidalSpeedChange: (value: number) => void;
  onConnectionDistanceChange: (value: number) => void;
  onReset: () => void;
}

export function createControlPanel(config: UIConfig): void {
  const container = document.getElementById('control-panel');
  if (!container) return;

  container.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = '潮汐织网';
  container.appendChild(title);

  const sliders: {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (v: number) => void;
    format: (v: number) => string;
  }[] = [
    {
      label: '粒子数量',
      min: 500,
      max: 3000,
      step: 100,
      value: config.particleCount,
      onChange: config.onParticleCountChange,
      format: (v) => String(v),
    },
    {
      label: '潮汐速度',
      min: 0.5,
      max: 2.0,
      step: 0.1,
      value: config.tidalSpeed,
      onChange: config.onTidalSpeedChange,
      format: (v) => v.toFixed(1),
    },
    {
      label: '连接距离',
      min: 2,
      max: 10,
      step: 0.5,
      value: config.connectionDistance,
      onChange: config.onConnectionDistanceChange,
      format: (v) => v.toFixed(1),
    },
  ];

  for (const s of sliders) {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';

    const labelText = document.createElement('span');
    labelText.textContent = s.label;

    const valueText = document.createElement('span');
    valueText.className = 'control-value';
    valueText.textContent = s.format(s.value);

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueText);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(s.min);
    input.max = String(s.max);
    input.step = String(s.step);
    input.value = String(s.value);

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valueText.textContent = s.format(v);
      s.onChange(v);
    });

    group.appendChild(labelRow);
    group.appendChild(input);
    container.appendChild(group);
  }

  const btnGroup = document.createElement('div');
  btnGroup.className = 'control-group';

  const btn = document.createElement('button');
  btn.className = 'btn-reset';
  btn.textContent = '重置布局';
  btn.addEventListener('click', () => {
    config.onReset();
  });

  btnGroup.appendChild(btn);
  container.appendChild(btnGroup);
}
