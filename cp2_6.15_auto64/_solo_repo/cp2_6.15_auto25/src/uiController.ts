import { COLOR_PALETTE } from './physicsEngine';

export interface UICallbacks {
  onGravityChange: (value: number) => void;
  onFrictionChange: (value: number) => void;
  onReset: () => void;
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
  onBallCreate: (x: number, y: number, radius: number, color: string) => void;
  onBallSelect: (ballId: string | null) => void;
  onTogglePause: () => void;
  getBallAtPosition: (x: number, y: number) => { id: string } | null;
}

export interface UIHandles {
  updateStats: (ballCount: number, kineticEnergy: number) => void;
  destroy: () => void;
}

export function createControlPanel(
  container: HTMLElement,
  callbacks: UICallbacks
): UIHandles {
  const panel = document.createElement('div');
  panel.className = 'control-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background: rgba(42, 42, 58, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 32px;
    box-sizing: border-box;
    z-index: 100;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const gravityGroup = document.createElement('div');
  gravityGroup.style.cssText = 'display: flex; align-items: center; gap: 12px;';

  const gravityLabel = document.createElement('span');
  gravityLabel.textContent = '重力';
  gravityLabel.style.cssText = 'color: #fff; font-size: 14px; white-space: nowrap;';

  const gravitySlider = document.createElement('input');
  gravitySlider.type = 'range';
  gravitySlider.min = '0';
  gravitySlider.max = '2';
  gravitySlider.step = '0.1';
  gravitySlider.value = '0.5';
  gravitySlider.className = 'custom-slider gravity-slider';
  gravitySlider.style.cssText = `
    width: 120px;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  `;

  const gravityValue = document.createElement('span');
  gravityValue.textContent = '0.5';
  gravityValue.style.cssText = 'color: #ffcc00; font-size: 13px; font-family: monospace; width: 30px;';

  gravityGroup.appendChild(gravityLabel);
  gravityGroup.appendChild(gravitySlider);
  gravityGroup.appendChild(gravityValue);

  const frictionGroup = document.createElement('div');
  frictionGroup.style.cssText = 'display: flex; align-items: center; gap: 12px;';

  const frictionLabel = document.createElement('span');
  frictionLabel.textContent = '摩擦力';
  frictionLabel.style.cssText = 'color: #fff; font-size: 14px; white-space: nowrap;';

  const frictionSlider = document.createElement('input');
  frictionSlider.type = 'range';
  frictionSlider.min = '0';
  frictionSlider.max = '0.1';
  frictionSlider.step = '0.001';
  frictionSlider.value = '0.01';
  frictionSlider.className = 'custom-slider friction-slider';
  frictionSlider.style.cssText = `
    width: 120px;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  `;

  const frictionValue = document.createElement('span');
  frictionValue.textContent = '0.010';
  frictionValue.style.cssText = 'color: #4dabf7; font-size: 13px; font-family: monospace; width: 45px;';

  frictionGroup.appendChild(frictionLabel);
  frictionGroup.appendChild(frictionSlider);
  frictionGroup.appendChild(frictionValue);

  const resetBtn = document.createElement('button');
  resetBtn.textContent = '重置';
  resetBtn.style.cssText = `
    padding: 8px 20px;
    background: #ff5555;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: transform 0.15s ease;
    font-weight: 500;
  `;

  resetBtn.addEventListener('mouseenter', () => {
    resetBtn.style.transform = 'scale(1.1)';
  });
  resetBtn.addEventListener('mouseleave', () => {
    resetBtn.style.transform = 'scale(1)';
  });
  resetBtn.addEventListener('mousedown', () => {
    resetBtn.style.transform = 'scale(0.95)';
    resetBtn.style.background = '#ff3333';
    setTimeout(() => {
      resetBtn.style.background = '#ff5555';
    }, 150);
  });
  resetBtn.addEventListener('mouseup', () => {
    resetBtn.style.transform = 'scale(1.1)';
  });

  resetBtn.addEventListener('click', () => {
    callbacks.onReset();
  });

  const statsContainer = document.createElement('div');
  statsContainer.style.cssText = `
    margin-left: auto;
    display: flex;
    gap: 24px;
    align-items: center;
  `;

  const ballCountEl = document.createElement('div');
  ballCountEl.style.cssText = 'color: #fff; font-family: monospace; font-size: 14px;';
  ballCountEl.innerHTML = '球数: <span style="color: #a9e34b;">0</span>';

  const energyEl = document.createElement('div');
  energyEl.style.cssText = 'color: #fff; font-family: monospace; font-size: 14px;';
  energyEl.innerHTML = '动能: <span style="color: #ffd43b;">0.00</span> J';

  statsContainer.appendChild(ballCountEl);
  statsContainer.appendChild(energyEl);

  panel.appendChild(gravityGroup);
  panel.appendChild(frictionGroup);
  panel.appendChild(resetBtn);
  panel.appendChild(statsContainer);

  container.appendChild(panel);

  let pendingGravity: number | null = null;
  let pendingFriction: number | null = null;
  let rafId: number | null = null;

  function scheduleUpdate() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (pendingGravity !== null) {
        callbacks.onGravityChange(pendingGravity);
        pendingGravity = null;
      }
      if (pendingFriction !== null) {
        callbacks.onFrictionChange(pendingFriction);
        pendingFriction = null;
      }
    });
  }

  gravitySlider.addEventListener('input', () => {
    const value = parseFloat(gravitySlider.value);
    gravityValue.textContent = value.toFixed(1);
    pendingGravity = value;
    scheduleUpdate();
  });

  frictionSlider.addEventListener('input', () => {
    const value = parseFloat(frictionSlider.value);
    frictionValue.textContent = value.toFixed(3);
    pendingFriction = value;
    scheduleUpdate();
  });

  const style = document.createElement('style');
  style.textContent = `
    .custom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: grab;
      transition: transform 0.15s ease;
    }
    .custom-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    .custom-slider:active::-webkit-slider-thumb {
      cursor: grabbing;
      transform: scale(1.2);
    }
    .custom-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: grab;
      border: none;
      transition: transform 0.15s ease;
    }
    .gravity-slider::-webkit-slider-thumb {
      background: #ffcc00;
      box-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
    }
    .gravity-slider::-moz-range-thumb {
      background: #ffcc00;
      box-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
    }
    .friction-slider::-webkit-slider-thumb {
      background: #4dabf7;
      box-shadow: 0 0 10px rgba(77, 171, 247, 0.5);
    }
    .friction-slider::-moz-range-thumb {
      background: #4dabf7;
      box-shadow: 0 0 10px rgba(77, 171, 247, 0.5);
    }
  `;
  document.head.appendChild(style);

  function handleKeyDown(e: KeyboardEvent) {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace'];
    if (keys.includes(e.key)) {
      e.preventDefault();
      callbacks.onKeyDown(e.key);
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (keys.includes(e.key)) {
      e.preventDefault();
      callbacks.onKeyUp(e.key);
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return {
    updateStats: (ballCount: number, kineticEnergy: number) => {
      const countSpan = ballCountEl.querySelector('span');
      if (countSpan) countSpan.textContent = String(ballCount);
      const energySpan = energyEl.querySelector('span');
      if (energySpan) energySpan.textContent = kineticEnergy.toFixed(2);
    },
    destroy: () => {
      panel.remove();
      style.remove();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    }
  };
}

export function createTitle(
  container: HTMLElement,
  callbacks: UICallbacks
): { destroy: () => void } {
  const title = document.createElement('div');
  title.textContent = '物理沙盒';
  title.style.cssText = `
    position: fixed;
    top: 20px;
    left: 24px;
    font-size: 24px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    cursor: pointer;
    z-index: 101;
    user-select: none;
    transition: transform 0.15s ease;
  `;

  title.addEventListener('mouseenter', () => {
    title.style.transform = 'scale(1.05)';
  });
  title.addEventListener('mouseleave', () => {
    title.style.transform = 'scale(1)';
  });
  title.addEventListener('mousedown', () => {
    title.style.transform = 'scale(0.95)';
  });
  title.addEventListener('mouseup', () => {
    title.style.transform = 'scale(1.05)';
  });
  title.addEventListener('click', () => {
    callbacks.onTogglePause();
  });

  container.appendChild(title);

  return {
    destroy: () => {
      title.remove();
    }
  };
}

export function createColorPicker(
  x: number,
  y: number,
  onSelect: (color: string) => void,
  onCancel: () => void
): { destroy: () => void } {
  const picker = document.createElement('div');
  picker.className = 'color-picker';
  picker.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: rgba(42, 42, 58, 0.95);
    backdrop-filter: blur(8px);
    border-radius: 12px;
    padding: 12px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    z-index: 200;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;

  COLOR_PALETTE.forEach(color => {
    const swatch = document.createElement('div');
    swatch.style.cssText = `
      width: 32px;
      height: 32px;
      background: ${color};
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    `;
    swatch.addEventListener('mouseenter', () => {
      swatch.style.transform = 'scale(1.15)';
      swatch.style.boxShadow = `0 0 12px ${color}`;
    });
    swatch.addEventListener('mouseleave', () => {
      swatch.style.transform = 'scale(1)';
      swatch.style.boxShadow = 'none';
    });
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(color);
    });
    picker.appendChild(swatch);
  });

  document.body.appendChild(picker);

  const rect = picker.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 10;
  const maxY = window.innerHeight - rect.height - 70;
  if (x > maxX) picker.style.left = `${maxX}px`;
  if (y > maxY) picker.style.top = `${maxY}px`;

  function handleClickOutside(e: MouseEvent) {
    if (!picker.contains(e.target as Node)) {
      onCancel();
    }
  }

  setTimeout(() => {
    document.addEventListener('mousedown', handleClickOutside);
  }, 0);

  return {
    destroy: () => {
      picker.remove();
      document.removeEventListener('mousedown', handleClickOutside);
    }
  };
}
