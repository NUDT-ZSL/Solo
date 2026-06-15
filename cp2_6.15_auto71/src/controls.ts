import type { CurrentMode, Season } from './ocean';

export interface ControlCallbacks {
  onModeChange: (mode: CurrentMode) => void;
  onSeasonChange: (season: Season) => void;
  onRateChange: (rate: number) => void;
}

const SEASON_NAMES = ['春', '夏', '秋', '冬'];

export function createControlPanel(callbacks: ControlCallbacks): HTMLElement {
  const panel = document.createElement('div');
  panel.id = 'control-panel';
  panel.innerHTML = `
    <style>
      #control-panel {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 280px;
        background: rgba(26, 26, 46, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-radius: 12px;
        padding: 16px;
        z-index: 10;
        color: #e0e0e0;
        font-size: 14px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.06);
        user-select: none;
      }
      .panel-title {
        font-size: 18px;
        font-weight: 700;
        color: #4fc3f7;
        margin-bottom: 16px;
        letter-spacing: 1px;
      }
      .control-group {
        margin-bottom: 14px;
      }
      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 13px;
        color: #b0bec5;
      }
      .control-value {
        color: #4fc3f7;
        font-weight: 600;
      }
      .custom-select {
        width: 100%;
        padding: 8px 12px;
        background: rgba(13, 27, 42, 0.9);
        color: #e0e0e0;
        border: 1px solid rgba(79, 195, 247, 0.2);
        border-radius: 8px;
        font-size: 13px;
        outline: none;
        cursor: pointer;
        transition: border-color 0.2s, transform 0.2s;
        -webkit-appearance: none;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234fc3f7' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 10px center;
      }
      .custom-select:hover {
        border-color: rgba(79, 195, 247, 0.5);
        transform: translateY(-2px);
      }
      .custom-select:focus {
        border-color: #4fc3f7;
      }
      .custom-select option {
        background: #1a1a2e;
        color: #e0e0e0;
      }
      .custom-slider {
        width: 100%;
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        background: rgba(79, 195, 247, 0.15);
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #4fc3f7;
        cursor: pointer;
        border: 2px solid #0d1b2a;
        box-shadow: 0 2px 6px rgba(79, 195, 247, 0.4);
        transition: transform 0.2s;
      }
      .custom-slider::-webkit-slider-thumb:hover {
        transform: translateY(-2px);
      }
      .custom-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #4fc3f7;
        cursor: pointer;
        border: 2px solid #0d1b2a;
        box-shadow: 0 2px 6px rgba(79, 195, 247, 0.4);
      }
      .stats {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 12px;
        color: #78909c;
      }
      .stats-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .stats-value {
        color: #4fc3f7;
      }
      .hint {
        margin-top: 12px;
        padding: 10px;
        background: rgba(79, 195, 247, 0.08);
        border-radius: 8px;
        font-size: 11px;
        color: #78909c;
        line-height: 1.5;
      }
    </style>
    <div class="panel-title">🌊 洋流模拟控制</div>
    <div class="control-group">
      <div class="control-label">
        <span>洋流模式</span>
      </div>
      <select id="current-mode" class="custom-select">
        <option value="north_pacific">北太平洋环流</option>
        <option value="south_atlantic">南大西洋环流</option>
        <option value="indian_monsoon">印度洋季风环流</option>
      </select>
    </div>
    <div class="control-group">
      <div class="control-label">
        <span>季节偏移</span>
        <span id="season-value" class="control-value">春</span>
      </div>
      <input type="range" id="season-slider" class="custom-slider" min="0" max="3" step="1" value="0" />
    </div>
    <div class="control-group">
      <div class="control-label">
        <span>粒子释放速率</span>
        <span id="rate-value" class="control-value">5 个/秒</span>
      </div>
      <input type="range" id="rate-slider" class="custom-slider" min="1" max="10" step="1" value="5" />
    </div>
    <div class="stats">
      <div class="stats-row">
        <span>粒子数量</span>
        <span id="particle-count" class="stats-value">0</span>
      </div>
      <div class="stats-row">
        <span>帧率</span>
        <span id="fps-display" class="stats-value">0 FPS</span>
      </div>
    </div>
    <div class="hint">
      💡 点击海域释放漂浮物粒子<br/>
      🖱️ 拖拽旋转视角 · 滚轮缩放<br/>
      粒子碰撞岛屿会堆积并闪烁
    </div>
  `;

  const modeSelect = panel.querySelector('#current-mode') as HTMLSelectElement;
  const seasonSlider = panel.querySelector('#season-slider') as HTMLInputElement;
  const seasonValue = panel.querySelector('#season-value') as HTMLSpanElement;
  const rateSlider = panel.querySelector('#rate-slider') as HTMLInputElement;
  const rateValue = panel.querySelector('#rate-value') as HTMLSpanElement;

  modeSelect.addEventListener('change', () => {
    callbacks.onModeChange(modeSelect.value as CurrentMode);
  });

  seasonSlider.addEventListener('input', () => {
    const season = parseInt(seasonSlider.value) as Season;
    seasonValue.textContent = SEASON_NAMES[season];
    callbacks.onSeasonChange(season);
  });

  rateSlider.addEventListener('input', () => {
    const rate = parseInt(rateSlider.value);
    rateValue.textContent = `${rate} 个/秒`;
    callbacks.onRateChange(rate);
  });

  return panel;
}

export function updateStats(particleCount: number, fps: number): void {
  const countEl = document.getElementById('particle-count');
  const fpsEl = document.getElementById('fps-display');
  if (countEl) countEl.textContent = `${particleCount}`;
  if (fpsEl) fpsEl.textContent = `${Math.round(fps)} FPS`;
}
