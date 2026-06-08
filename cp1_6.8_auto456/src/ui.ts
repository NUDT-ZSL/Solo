export interface UIState {
  craneSize: number;
  particleCount: number;
  onLaunch: (text: string) => void;
}

export function createControlPanel(state: UIState): void {
  const existing = document.getElementById('control-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'control-panel';
  panel.innerHTML = `
    <div class="panel-title">星语信笺</div>
    <div class="panel-field">
      <label class="panel-label">寄语</label>
      <input type="text" id="msg-input" class="panel-input" placeholder="写下一句话..." maxlength="50" />
    </div>
    <div class="panel-field">
      <label class="panel-label">纸鹤尺寸 <span id="size-val">${state.craneSize.toFixed(1)}</span></label>
      <input type="range" id="size-slider" class="panel-slider" min="0.5" max="2.0" step="0.1" value="${state.craneSize}" />
    </div>
    <div class="panel-field">
      <label class="panel-label">粒子数量 <span id="count-val">${state.particleCount}</span></label>
      <input type="range" id="count-slider" class="panel-slider" min="50" max="200" step="10" value="${state.particleCount}" />
    </div>
    <button id="launch-btn" class="panel-btn">发射 ✦</button>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #control-panel {
      position: fixed;
      left: 20px;
      bottom: 20px;
      width: 280px;
      padding: 24px 22px;
      background: rgba(15, 12, 40, 0.55);
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      border: 1px solid rgba(255, 215, 100, 0.12);
      border-radius: 18px;
      z-index: 100;
      font-family: 'Courier New', monospace;
      color: rgba(220, 210, 240, 0.9);
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    #control-panel:hover {
      border-color: rgba(255, 215, 100, 0.25);
    }
    .panel-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 4px;
      margin-bottom: 18px;
      color: rgba(255, 215, 130, 0.85);
      text-shadow: 0 0 20px rgba(255, 215, 100, 0.3);
    }
    .panel-field {
      margin-bottom: 14px;
    }
    .panel-label {
      display: block;
      font-size: 12px;
      margin-bottom: 6px;
      color: rgba(200, 190, 220, 0.7);
      letter-spacing: 1px;
    }
    .panel-input {
      width: 100%;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 215, 100, 0.15);
      border-radius: 10px;
      color: rgba(230, 225, 245, 0.9);
      font-family: 'Courier New', monospace;
      font-size: 14px;
      outline: none;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .panel-input:focus {
      border-color: rgba(255, 215, 100, 0.4);
      box-shadow: 0 0 12px rgba(255, 215, 100, 0.1);
    }
    .panel-input::placeholder {
      color: rgba(180, 170, 200, 0.4);
    }
    .panel-slider {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      outline: none;
    }
    .panel-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(255, 215, 100, 0.8);
      cursor: pointer;
      box-shadow: 0 0 8px rgba(255, 215, 100, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .panel-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 0 14px rgba(255, 215, 100, 0.6);
    }
    .panel-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(255, 215, 100, 0.8);
      cursor: pointer;
      border: none;
      box-shadow: 0 0 8px rgba(255, 215, 100, 0.4);
    }
    .panel-btn {
      width: 100%;
      padding: 12px 0;
      margin-top: 6px;
      background: linear-gradient(135deg, rgba(255, 200, 60, 0.25), rgba(255, 160, 40, 0.15));
      border: 1px solid rgba(255, 215, 100, 0.3);
      border-radius: 12px;
      color: rgba(255, 225, 140, 0.95);
      font-family: 'Courier New', monospace;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 3px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-shadow: 0 0 10px rgba(255, 215, 100, 0.3);
    }
    .panel-btn:hover {
      background: linear-gradient(135deg, rgba(255, 200, 60, 0.4), rgba(255, 160, 40, 0.25));
      border-color: rgba(255, 215, 100, 0.5);
      box-shadow: 0 0 24px rgba(255, 215, 100, 0.2), inset 0 0 12px rgba(255, 215, 100, 0.08);
      transform: translateY(-1px);
    }
    .panel-btn:active {
      transform: translateY(0);
      box-shadow: 0 0 12px rgba(255, 215, 100, 0.15);
    }
    @media (max-width: 600px) {
      #control-panel {
        left: 10px;
        right: 10px;
        bottom: 10px;
        width: auto;
        padding: 18px 16px;
      }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
  const sizeVal = document.getElementById('size-val') as HTMLSpanElement;
  const countSlider = document.getElementById('count-slider') as HTMLInputElement;
  const countVal = document.getElementById('count-val') as HTMLSpanElement;
  const msgInput = document.getElementById('msg-input') as HTMLInputElement;
  const launchBtn = document.getElementById('launch-btn') as HTMLButtonElement;

  sizeSlider.addEventListener('input', () => {
    state.craneSize = parseFloat(sizeSlider.value);
    sizeVal.textContent = state.craneSize.toFixed(1);
  });

  countSlider.addEventListener('input', () => {
    state.particleCount = parseInt(countSlider.value, 10);
    countVal.textContent = String(state.particleCount);
  });

  launchBtn.addEventListener('click', () => {
    const text = msgInput.value.trim();
    if (text) {
      state.onLaunch(text);
      msgInput.value = '';
    }
  });

  msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = msgInput.value.trim();
      if (text) {
        state.onLaunch(text);
        msgInput.value = '';
      }
    }
  });
}

export function getInputText(): string {
  const input = document.getElementById('msg-input') as HTMLInputElement;
  return input ? input.value.trim() : '';
}
