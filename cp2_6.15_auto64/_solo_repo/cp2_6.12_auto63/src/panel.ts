export interface PanelCallbacks {
  onParamChange: (params: PanelParams) => void;
  onGrow: () => void;
  onPause: () => void;
  onSnapshot: () => void;
  onPresetChange: (preset: string) => void;
}

export interface PanelParams {
  iterations: number;
  trunkLength: number;
  branchAngle: number;
  decayFactor: number;
  leafDensity: number;
}

const PRESETS: { name: string; params: PanelParams }[] = [
  { name: '毕达哥拉斯树', params: { iterations: 5, trunkLength: 20, branchAngle: 30, decayFactor: 0.75, leafDensity: 0.5 } },
  { name: '龙形曲线', params: { iterations: 7, trunkLength: 25, branchAngle: 45, decayFactor: 0.7, leafDensity: 0.8 } },
  { name: '科赫雪花', params: { iterations: 6, trunkLength: 28, branchAngle: 20, decayFactor: 0.85, leafDensity: 0.6 } },
  { name: '蕨类植物', params: { iterations: 4, trunkLength: 15, branchAngle: 55, decayFactor: 0.65, leafDensity: 0.9 } },
  { name: '灌木', params: { iterations: 3, trunkLength: 22, branchAngle: 35, decayFactor: 0.8, leafDensity: 0.1 } },
  { name: '仙人掌', params: { iterations: 8, trunkLength: 18, branchAngle: 25, decayFactor: 0.72, leafDensity: 0.7 } },
];

const DEFAULT_PARAMS: PanelParams = PRESETS[0].params;

export function createPanel(container: HTMLElement, callbacks: PanelCallbacks): { updateState: (isGrowing: boolean) => void } {
  const panel = document.createElement('div');
  panel.className = 'cyber-panel';
  panel.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-right: 1px solid rgba(0, 255, 136, 0.2);
    padding: 24px 20px;
    box-sizing: border-box;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
    transition: transform 0.3s ease, opacity 0.3s ease;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    font-family: monospace;
    font-size: 16px;
    color: #00ff88;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
    border-bottom: 1px solid rgba(0, 255, 136, 0.3);
    padding-bottom: 12px;
    margin-bottom: 4px;
  `;
  title.textContent = '◈ L-SYSTEM 控制台';
  panel.appendChild(title);

  const params = { ...DEFAULT_PARAMS };

  const sliders: { key: keyof PanelParams; label: string; min: number; max: number; step: number; unit?: string }[] = [
    { key: 'iterations', label: '迭代次数', min: 3, max: 8, step: 1 },
    { key: 'trunkLength', label: '主干长度', min: 10, max: 30, step: 1, unit: '' },
    { key: 'branchAngle', label: '分支角度', min: 10, max: 60, step: 1, unit: '°' },
    { key: 'decayFactor', label: '衰减系数', min: 0.6, max: 0.9, step: 0.01 },
    { key: 'leafDensity', label: '叶密度', min: 0, max: 1, step: 0.1 },
  ];

  const valueDisplays: Record<string, HTMLElement> = {};

  sliders.forEach(({ key, label, min, max, step, unit }) => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

    const labelEl = document.createElement('label');
    labelEl.style.cssText = `
      font-family: monospace;
      font-size: 12px;
      color: #0088ff;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(params[key]);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      background: rgba(0, 136, 255, 0.2);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
      transition: background 0.2s ease;
    `;

    const sliderStyle = document.createElement('style');
    const sliderId = `slider-${key}-${Math.random().toString(36).slice(2, 8)}`;
    slider.id = sliderId;
    sliderStyle.textContent = `
      #${sliderId}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: #00ff88;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
        transition: all 0.2s ease;
      }
      #${sliderId}::-webkit-slider-thumb:hover {
        background: #0088ff;
        box-shadow: 0 0 16px rgba(0, 136, 255, 0.9);
        transform: scale(1.2);
      }
      #${sliderId}::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: #00ff88;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
        transition: all 0.2s ease;
      }
      #${sliderId}::-moz-range-thumb:hover {
        background: #0088ff;
        box-shadow: 0 0 16px rgba(0, 136, 255, 0.9);
        transform: scale(1.2);
      }
      #${sliderId}:hover {
        background: rgba(0, 255, 136, 0.3);
      }
    `;
    document.head.appendChild(sliderStyle);

    slider.addEventListener('mouseenter', () => {
      slider.style.background = 'rgba(0, 255, 136, 0.3)';
    });
    slider.addEventListener('mouseleave', () => {
      slider.style.background = 'rgba(0, 136, 255, 0.2)';
    });

    const valueDisplay = document.createElement('div');
    valueDisplay.style.cssText = `
      font-family: monospace;
      font-size: 12px;
      color: #00ff88;
      text-shadow: 0 0 6px rgba(0, 255, 136, 0.6);
      text-align: right;
    `;
    valueDisplay.textContent = `${params[key]}${unit || ''}`;
    valueDisplays[key] = valueDisplay;

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      (params as any)[key] = val;
      valueDisplay.textContent = `${val}${unit || ''}`;
      callbacks.onParamChange({ ...params });
    });

    wrapper.appendChild(slider);
    wrapper.appendChild(valueDisplay);
    panel.appendChild(wrapper);
  });

  const presetWrapper = document.createElement('div');
  presetWrapper.style.cssText = 'display: flex; flex-direction: column; gap: 6px; margin-top: 8px;';

  const presetLabel = document.createElement('label');
  presetLabel.style.cssText = `
    font-family: monospace;
    font-size: 12px;
    color: #0088ff;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;
  presetLabel.textContent = '预设方案';
  presetWrapper.appendChild(presetLabel);

  const presetSelect = document.createElement('select');
  presetSelect.style.cssText = `
    width: 100%;
    padding: 10px 12px;
    background: rgba(0, 255, 136, 0.05);
    border: 1px solid rgba(0, 255, 136, 0.4);
    color: #00ff88;
    font-family: monospace;
    font-size: 12px;
    cursor: pointer;
    outline: none;
    transition: all 0.2s ease;
    border-radius: 0;
  `;

  PRESETS.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = preset.name;
    option.textContent = `▸ ${preset.name}`;
    option.style.cssText = 'background: #0a0a0f; color: #00ff88;';
    presetSelect.appendChild(option);
  });

  presetSelect.addEventListener('mouseenter', () => {
    presetSelect.style.borderColor = '#0088ff';
    presetSelect.style.boxShadow = '0 0 12px rgba(0, 136, 255, 0.4)';
  });
  presetSelect.addEventListener('mouseleave', () => {
    presetSelect.style.borderColor = 'rgba(0, 255, 136, 0.4)';
    presetSelect.style.boxShadow = 'none';
  });
  presetSelect.addEventListener('focus', () => {
    presetSelect.style.borderColor = '#00ff88';
    presetSelect.style.boxShadow = '0 0 12px rgba(0, 255, 136, 0.4)';
  });

  presetSelect.addEventListener('change', () => {
    const selected = PRESETS.find(p => p.name === presetSelect.value);
    if (selected) {
      Object.assign(params, selected.params);
      sliders.forEach(({ key, unit }) => {
        const slider = panel.querySelector(`#slider-${key}`) as HTMLInputElement;
        if (slider) slider.value = String(params[key]);
        if (valueDisplays[key]) valueDisplays[key].textContent = `${params[key]}${unit || ''}`;
      });
      callbacks.onParamChange({ ...params });
      callbacks.onPresetChange(presetSelect.value);
    }
  });

  presetWrapper.appendChild(presetSelect);
  panel.appendChild(presetWrapper);

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 136, 255, 0.2);
  `;

  const createButton = (text: string, primary: boolean, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width: 100%;
      padding: 12px 16px;
      background: ${primary ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 136, 255, 0.1)'};
      border: 1px solid ${primary ? '#00ff88' : '#0088ff'};
      color: ${primary ? '#00ff88' : '#0088ff'};
      font-family: monospace;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-shadow: 0 0 8px ${primary ? 'rgba(0, 255, 136, 0.5)' : 'rgba(0, 136, 255, 0.5)'};
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = primary ? 'rgba(0, 255, 136, 0.3)' : 'rgba(0, 136, 255, 0.25)';
      btn.style.boxShadow = `0 0 20px ${primary ? 'rgba(0, 255, 136, 0.5)' : 'rgba(0, 136, 255, 0.5)'}`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = primary ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 136, 255, 0.1)';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('click', onClick);

    return btn;
  };

  const growBtn = createButton('▶ 生长', true, () => callbacks.onGrow());
  const pauseBtn = createButton('⏸ 暂停', false, () => callbacks.onPause());
  const snapshotBtn = createButton('◉ 快照', false, () => callbacks.onSnapshot());

  buttonContainer.appendChild(growBtn);
  buttonContainer.appendChild(pauseBtn);
  buttonContainer.appendChild(snapshotBtn);
  panel.appendChild(buttonContainer);

  const mobileToggle = document.createElement('button');
  mobileToggle.textContent = '☰';
  mobileToggle.style.cssText = `
    display: none;
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: rgba(0, 255, 136, 0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid #00ff88;
    color: #00ff88;
    font-size: 22px;
    cursor: pointer;
    z-index: 1001;
    transition: all 0.2s ease;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
    align-items: center;
    justify-content: center;
  `;

  mobileToggle.addEventListener('mouseenter', () => {
    mobileToggle.style.background = 'rgba(0, 255, 136, 0.35)';
    mobileToggle.style.boxShadow = '0 0 30px rgba(0, 255, 136, 0.6)';
    mobileToggle.style.transform = 'scale(1.05)';
  });
  mobileToggle.addEventListener('mouseleave', () => {
    mobileToggle.style.background = 'rgba(0, 255, 136, 0.2)';
    mobileToggle.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.4)';
    mobileToggle.style.transform = 'scale(1)';
  });

  let panelOverlay: HTMLElement | null = null;

  const handleResize = () => {
    if (window.innerWidth < 768) {
      panel.style.display = 'none';
      mobileToggle.style.display = 'flex';
    } else {
      panel.style.display = 'flex';
      mobileToggle.style.display = 'none';
      if (panelOverlay) {
        panelOverlay.remove();
        panelOverlay = null;
      }
    }
  };

  mobileToggle.addEventListener('click', () => {
    if (panelOverlay) {
      panelOverlay.remove();
      panelOverlay = null;
      return;
    }

    panelOverlay = document.createElement('div');
    panelOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1002;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      animation: fadeIn 0.2s ease;
    `;

    const panelClone = panel.cloneNode(true) as HTMLElement;
    panelClone.style.cssText = `
      width: 100%;
      max-width: 320px;
      max-height: 90vh;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 255, 136, 0.3);
      padding: 24px 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
      position: relative;
      animation: slideUp 0.25s ease;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      background: transparent;
      border: 1px solid #0088ff;
      color: #0088ff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: monospace;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(0, 136, 255, 0.2)';
      closeBtn.style.color = '#00ff88';
      closeBtn.style.borderColor = '#00ff88';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'transparent';
      closeBtn.style.color = '#0088ff';
      closeBtn.style.borderColor = '#0088ff';
    });
    closeBtn.addEventListener('click', () => {
      if (panelOverlay) {
        panelOverlay.remove();
        panelOverlay = null;
      }
    });
    panelClone.appendChild(closeBtn);

    const clonedSliders = panelClone.querySelectorAll('input[type="range"]');
    const clonedSelect = panelClone.querySelector('select');
    const clonedButtons = panelClone.querySelectorAll('button');

    clonedSliders.forEach((s, i) => {
      const sliderEl = s as HTMLInputElement;
      const origSlider = panel.querySelectorAll('input[type="range"]')[i] as HTMLInputElement;
      sliderEl.value = origSlider.value;
      sliderEl.addEventListener('input', () => {
        origSlider.value = sliderEl.value;
        origSlider.dispatchEvent(new Event('input'));
      });
    });

    if (clonedSelect) {
      const origSelect = panel.querySelector('select') as HTMLSelectElement;
      (clonedSelect as HTMLSelectElement).value = origSelect.value;
      clonedSelect.addEventListener('change', () => {
        origSelect.value = (clonedSelect as HTMLSelectElement).value;
        origSelect.dispatchEvent(new Event('change'));
        if (panelOverlay) {
          panelOverlay.remove();
          panelOverlay = null;
        }
      });
    }

    clonedButtons.forEach((b) => {
      const btn = b as HTMLButtonElement;
      if (btn.textContent?.includes('生长')) {
        btn.addEventListener('click', () => {
          growBtn.click();
          if (panelOverlay) { panelOverlay.remove(); panelOverlay = null; }
        });
      } else if (btn.textContent?.includes('暂停')) {
        btn.addEventListener('click', () => {
          pauseBtn.click();
          if (panelOverlay) { panelOverlay.remove(); panelOverlay = null; }
        });
      } else if (btn.textContent?.includes('快照')) {
        btn.addEventListener('click', () => {
          snapshotBtn.click();
          if (panelOverlay) { panelOverlay.remove(); panelOverlay = null; }
        });
      }
    });

    panelOverlay.appendChild(panelClone);
    panelOverlay.addEventListener('click', (e) => {
      if (e.target === panelOverlay && panelOverlay) {
        panelOverlay.remove();
        panelOverlay = null;
      }
    });
    document.body.appendChild(panelOverlay);
  });

  const animStyle = document.createElement('style');
  animStyle.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(animStyle);

  window.addEventListener('resize', handleResize);
  handleResize();

  container.appendChild(panel);
  container.appendChild(mobileToggle);

  const updateState = (isGrowing: boolean) => {
    growBtn.disabled = isGrowing;
    pauseBtn.disabled = !isGrowing;
    growBtn.style.opacity = isGrowing ?