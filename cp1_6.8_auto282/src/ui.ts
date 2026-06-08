export interface UICallbacks {
  onDensityChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onReset: () => void;
}

export function createUI(callbacks: UICallbacks): void {
  const panel = document.createElement('div');
  panel.id = 'stardust-panel';
  panel.innerHTML = `
    <div class="sp-title">星尘回廊</div>
    <div class="sp-control">
      <label>粒子密度</label>
      <input type="range" id="sp-density" min="10" max="100" value="60" />
      <span id="sp-density-val">60%</span>
    </div>
    <div class="sp-control">
      <label>飞行速度</label>
      <input type="range" id="sp-speed" min="10" max="200" value="100" />
      <span id="sp-speed-val">1.0x</span>
    </div>
    <button id="sp-reset">重置视角</button>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #stardust-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 18px 22px;
      background: rgba(10, 15, 40, 0.55);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(100, 120, 200, 0.2);
      border-radius: 14px;
      color: rgba(180, 200, 255, 0.9);
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      z-index: 100;
      min-width: 200px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(120, 140, 220, 0.1);
      user-select: none;
    }
    .sp-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 14px;
      letter-spacing: 2px;
      background: linear-gradient(90deg, rgba(100,160,255,0.9), rgba(200,120,220,0.9));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .sp-control {
      margin-bottom: 12px;
    }
    .sp-control label {
      display: block;
      margin-bottom: 5px;
      font-size: 12px;
      opacity: 0.7;
    }
    .sp-control input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      background: rgba(80, 100, 180, 0.3);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    }
    .sp-control input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(140, 170, 255, 0.85);
      border: 2px solid rgba(180, 200, 255, 0.4);
      cursor: pointer;
      box-shadow: 0 0 8px rgba(100, 140, 255, 0.4);
    }
    .sp-control input[type="range"]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: rgba(140, 170, 255, 0.85);
      border: 2px solid rgba(180, 200, 255, 0.4);
      cursor: pointer;
      box-shadow: 0 0 8px rgba(100, 140, 255, 0.4);
    }
    .sp-control span {
      font-size: 11px;
      opacity: 0.5;
      float: right;
      margin-top: -16px;
    }
    #sp-reset {
      width: 100%;
      padding: 8px 0;
      margin-top: 6px;
      background: rgba(80, 100, 200, 0.2);
      border: 1px solid rgba(100, 130, 220, 0.25);
      border-radius: 8px;
      color: rgba(170, 190, 255, 0.85);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
      letter-spacing: 1px;
    }
    #sp-reset:hover {
      background: rgba(80, 100, 200, 0.35);
      border-color: rgba(120, 150, 240, 0.4);
    }
    #sp-reset:active {
      transform: scale(0.97);
    }
    @media (max-width: 600px) {
      #stardust-panel {
        bottom: 10px;
        right: 10px;
        left: 10px;
        min-width: auto;
        padding: 14px 16px;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  const densitySlider = document.getElementById('sp-density') as HTMLInputElement;
  const densityVal = document.getElementById('sp-density-val') as HTMLSpanElement;
  const speedSlider = document.getElementById('sp-speed') as HTMLInputElement;
  const speedVal = document.getElementById('sp-speed-val') as HTMLSpanElement;
  const resetBtn = document.getElementById('sp-reset') as HTMLButtonElement;

  densitySlider.addEventListener('input', () => {
    const v = parseInt(densitySlider.value);
    densityVal.textContent = v + '%';
    callbacks.onDensityChange(v / 100);
  });

  speedSlider.addEventListener('input', () => {
    const v = parseInt(speedSlider.value);
    speedVal.textContent = (v / 100).toFixed(1) + 'x';
    callbacks.onSpeedChange(v / 100);
  });

  resetBtn.addEventListener('click', () => {
    callbacks.onReset();
  });
}
