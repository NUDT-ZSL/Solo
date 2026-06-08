import { ParticleSystem } from './ParticleSystem';
import { InteractionHandler } from './InteractionHandler';

export class ControlPanel {
  private particleSystem: ParticleSystem;
  private interactionHandler: InteractionHandler;
  private constellationLabel: HTMLElement;

  constructor(
    particleSystem: ParticleSystem,
    interactionHandler: InteractionHandler
  ) {
    this.particleSystem = particleSystem;
    this.interactionHandler = interactionHandler;
    this.constellationLabel = null!;
    this.render();
  }

  private render(): void {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = `
      <div class="cp-title">星轨控制</div>
      <div class="cp-group">
        <label>粒子密度 <span id="cp-density-val">3000</span></label>
        <input type="range" id="cp-density" min="1000" max="5000" step="100" value="3000" />
      </div>
      <div class="cp-group">
        <label>光带速度 <span id="cp-speed-val">1.0</span></label>
        <input type="range" id="cp-speed" min="0.2" max="3.0" step="0.1" value="1.0" />
      </div>
      <div class="cp-group">
        <label>当前星座：<span id="cp-constellation-name">${this.particleSystem.getCurrentConstellationName()}</span></label>
      </div>
      <div class="cp-buttons">
        <button id="cp-switch">星座切换</button>
        <button id="cp-reset">重置视角</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 220px;
        padding: 18px 20px;
        background: rgba(10, 10, 40, 0.55);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(100, 120, 200, 0.2);
        border-radius: 14px;
        color: #c0c8e8;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        z-index: 100;
        user-select: none;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 0 30px rgba(60, 80, 160, 0.05);
      }
      .cp-title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 14px;
        color: #d8ddf5;
        letter-spacing: 2px;
      }
      .cp-group {
        margin-bottom: 12px;
      }
      .cp-group label {
        display: block;
        margin-bottom: 5px;
        font-size: 12px;
        color: #99a2c4;
      }
      .cp-group label span {
        color: #b8c0e8;
        font-weight: 500;
      }
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(80, 100, 180, 0.3);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: rgba(140, 160, 240, 0.8);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(100, 130, 220, 0.5);
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: rgba(140, 160, 240, 0.8);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(100, 130, 220, 0.5);
      }
      .cp-buttons {
        display: flex;
        gap: 8px;
        margin-top: 14px;
      }
      .cp-buttons button {
        flex: 1;
        padding: 7px 0;
        background: rgba(60, 80, 160, 0.25);
        border: 1px solid rgba(100, 120, 200, 0.25);
        border-radius: 8px;
        color: #b0b8e0;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }
      .cp-buttons button:hover {
        background: rgba(80, 100, 200, 0.35);
        border-color: rgba(120, 140, 220, 0.4);
        color: #d0d8f0;
      }
      .cp-buttons button:active {
        transform: scale(0.96);
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);

    this.constellationLabel = document.getElementById(
      'cp-constellation-name'
    )!;

    const densitySlider = document.getElementById(
      'cp-density'
    ) as HTMLInputElement;
    const densityVal = document.getElementById('cp-density-val')!;
    densitySlider.addEventListener('input', () => {
      const v = parseInt(densitySlider.value, 10);
      densityVal.textContent = String(v);
      this.particleSystem.setParticleDensity(v);
    });

    const speedSlider = document.getElementById('cp-speed') as HTMLInputElement;
    const speedVal = document.getElementById('cp-speed-val')!;
    speedSlider.addEventListener('input', () => {
      const v = parseFloat(speedSlider.value);
      speedVal.textContent = v.toFixed(1);
      this.particleSystem.setLightBandSpeed(v);
    });

    const switchBtn = document.getElementById('cp-switch')!;
    switchBtn.addEventListener('click', () => {
      this.particleSystem.switchConstellation();
      this.constellationLabel.textContent =
        this.particleSystem.getCurrentConstellationName();
    });

    const resetBtn = document.getElementById('cp-reset')!;
    resetBtn.addEventListener('click', () => {
      this.interactionHandler.resetView();
    });
  }
}
