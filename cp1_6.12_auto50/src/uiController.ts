import type { PlanetData } from './starSystem';

export interface UICallbacks {
  onPlanetSelect: (index: number) => void;
  onSpeedChange: (speed: number) => void;
  onTrailsToggle: (visible: boolean) => void;
  onResetView: () => void;
}

export function createUIController(planets: PlanetData[], callbacks: UICallbacks): {
  updatePlanetDropdown: () => void;
} {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('App container not found');
  }

  const style = document.createElement('style');
  style.textContent = `
    .control-panel {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 280px;
      background: rgba(10, 10, 30, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      color: white;
      font-size: 14px;
      font-family: monospace;
      z-index: 10;
      border: 1px solid rgba(100, 150, 255, 0.2);
    }
    .control-panel h2 {
      font-size: 16px;
      margin-bottom: 16px;
      color: #88ccff;
      text-shadow: 0 0 8px rgba(100, 150, 255, 0.5);
      border-bottom: 1px solid rgba(100, 150, 255, 0.2);
      padding-bottom: 8px;
    }
    .control-group {
      margin-bottom: 16px;
    }
    .control-group label {
      display: block;
      margin-bottom: 8px;
      color: #aaccff;
    }
    .control-group select,
    .control-group input[type="range"] {
      width: 100%;
      padding: 6px 10px;
      background: rgba(30, 40, 70, 0.8);
      border: 1px solid rgba(100, 150, 255, 0.3);
      border-radius: 6px;
      color: white;
      font-family: monospace;
      font-size: 13px;
      outline: none;
    }
    .control-group select:focus,
    .control-group input[type="range"]:focus {
      border-color: rgba(100, 150, 255, 0.6);
    }
    .control-group select option {
      background: #1a1a3a;
      color: white;
    }
    .control-group input[type="range"] {
      padding: 0;
      height: 6px;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
    }
    .control-group input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #66aaff;
      cursor: pointer;
      box-shadow: 0 0 8px rgba(100, 150, 255, 0.6);
    }
    .control-group input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #66aaff;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 8px rgba(100, 150, 255, 0.6);
    }
    .toggle-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .toggle-switch {
      position: relative;
      width: 44px;
      height: 22px;
      background: rgba(30, 40, 70, 0.8);
      border-radius: 11px;
      cursor: pointer;
      border: 1px solid rgba(100, 150, 255, 0.3);
      transition: background 0.3s ease;
    }
    .toggle-switch.active {
      background: rgba(100, 150, 255, 0.4);
    }
    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #666;
      transition: all 0.3s ease;
    }
    .toggle-switch.active::after {
      left: 24px;
      background: #66aaff;
      box-shadow: 0 0 8px rgba(100, 150, 255, 0.6);
    }
    .btn {
      width: 100%;
      padding: 10px 16px;
      background: rgba(60, 100, 180, 0.4);
      border: 1px solid rgba(100, 150, 255, 0.4);
      border-radius: 6px;
      color: white;
      font-family: monospace;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .btn:hover {
      background: rgba(80, 130, 220, 0.6);
      border-color: rgba(100, 150, 255, 0.7);
      box-shadow: 0 0 12px rgba(100, 150, 255, 0.3);
    }
    .speed-value {
      display: inline-block;
      color: #66ff66;
      margin-left: 8px;
    }
    .drawer-toggle {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: rgba(10, 10, 30, 0.9);
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(100, 150, 255, 0.3);
      color: #88ccff;
      font-family: monospace;
      font-size: 14px;
      cursor: pointer;
      z-index: 11;
      border-radius: 12px 12px 0 0;
      align-items: center;
      justify-content: center;
    }
    @media (max-width: 768px) {
      .control-panel {
        position: fixed;
        top: auto;
        bottom: 50px;
        right: 10px;
        left: 10px;
        width: auto;
        max-height: 60vh;
        overflow-y: auto;
        display: none;
      }
      .control-panel.open {
        display: block;
      }
      .drawer-toggle {
        display: flex;
      }
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'control-panel';
  panel.innerHTML = `
    <h2>⚙ Control Panel</h2>
    <div class="control-group">
      <label for="planet-select">🌍 Select Planet</label>
      <select id="planet-select">
        <option value="-1">-- Select a planet --</option>
        ${planets.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}
      </select>
    </div>
    <div class="control-group">
      <label>🚀 Orbit Speed: <span class="speed-value" id="speed-value">1.0x</span></label>
      <input type="range" id="speed-slider" min="0.5" max="3" step="0.1" value="1">
    </div>
    <div class="control-group">
      <div class="toggle-container">
        <label for="trails-toggle" style="margin:0;">✨ Show Trails</label>
        <div class="toggle-switch active" id="trails-toggle"></div>
      </div>
    </div>
    <div class="control-group">
      <button class="btn" id="reset-view">🎯 Reset View</button>
    </div>
  `;
  container.appendChild(panel);

  const drawerToggle = document.createElement('div');
  drawerToggle.className = 'drawer-toggle';
  drawerToggle.textContent = '☰ Open Controls';
  container.appendChild(drawerToggle);

  const planetSelect = panel.querySelector('#planet-select') as HTMLSelectElement;
  const speedSlider = panel.querySelector('#speed-slider') as HTMLInputElement;
  const speedValue = panel.querySelector('#speed-value') as HTMLSpanElement;
  const trailsToggle = panel.querySelector('#trails-toggle') as HTMLDivElement;
  const resetBtn = panel.querySelector('#reset-view') as HTMLButtonElement;

  let trailsVisible = true;

  planetSelect.addEventListener('change', (e) => {
    const value = parseInt((e.target as HTMLSelectElement).value, 10);
    callbacks.onPlanetSelect(value);
  });

  speedSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    speedValue.textContent = `${value.toFixed(1)}x`;
    callbacks.onSpeedChange(value);
  });

  trailsToggle.addEventListener('click', () => {
    trailsVisible = !trailsVisible;
    trailsToggle.classList.toggle('active', trailsVisible);
    callbacks.onTrailsToggle(trailsVisible);
  });

  resetBtn.addEventListener('click', () => {
    planetSelect.value = '-1';
    callbacks.onResetView();
  });

  drawerToggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    drawerToggle.textContent = panel.classList.contains('open') ? '▼ Close Controls' : '☰ Open Controls';
  });

  const updatePlanetDropdown = () => {
    const selectedIndex = planets.findIndex(p => p.selected);
    planetSelect.value = selectedIndex >= 0 ? String(selectedIndex) : '-1';
  };

  return { updatePlanetDropdown };
}
