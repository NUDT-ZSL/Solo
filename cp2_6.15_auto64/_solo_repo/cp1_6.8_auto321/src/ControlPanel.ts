import { TimeSystem } from './TimeSystem';
import { InteractionManager } from './InteractionManager';

export class ControlPanel {
  private container: HTMLDivElement;
  private timeSlider: HTMLInputElement;
  private modeButton: HTMLButtonElement;
  private resetButton: HTMLButtonElement;
  private timeLabel: HTMLSpanElement;
  private _onModeToggle: (() => void) | null = null;

  constructor(
    private timeSystem: TimeSystem,
    private interactionManager: InteractionManager
  ) {
    this.container = this._createContainer();
    this.timeSlider = this._createTimeSlider();
    this.modeButton = this._createModeButton();
    this.resetButton = this._createResetButton();
    this.timeLabel = this._createTimeLabel();

    const leftGroup = document.createElement('div');
    leftGroup.style.cssText = 'display:flex;align-items:center;gap:12px;flex:1;min-width:0;';
    leftGroup.appendChild(this.timeLabel);
    leftGroup.appendChild(this.timeSlider);

    const rightGroup = document.createElement('div');
    rightGroup.style.cssText = 'display:flex;align-items:center;gap:10px;';
    rightGroup.appendChild(this.modeButton);
    rightGroup.appendChild(this.resetButton);

    this.container.appendChild(leftGroup);
    this.container.appendChild(rightGroup);

    document.body.appendChild(this.container);
    this._bindEvents();
  }

  set onModeToggle(fn: () => void) {
    this._onModeToggle = fn;
  }

  update(): void {
    this.timeSlider.value = String(this.timeSystem.timeOfDay);
    const h = Math.floor(this.timeSystem.timeOfDay);
    const m = Math.floor((this.timeSystem.timeOfDay - h) * 60);
    this.timeLabel.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.modeButton.textContent = this.timeSystem.autoMode ? '自动模式' : '手动模式';
  }

  dispose(): void {
    this.container.remove();
  }

  private _createContainer(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 14px 28px;
      background: rgba(20, 10, 40, 0.55);
      backdrop-filter: blur(18px) saturate(1.4);
      -webkit-backdrop-filter: blur(18px) saturate(1.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      z-index: 100;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      user-select: none;
      min-width: 480px;
      max-width: 90vw;
      transition: opacity 0.4s ease, transform 0.4s ease;
    `;
    return div;
  }

  private _createTimeSlider(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '23.99';
    input.step = '0.01';
    input.value = String(this.timeSystem.timeOfDay);
    input.style.cssText = `
      flex: 1;
      min-width: 160px;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(90deg, #1a237e, #ff8a65, #ffd54f, #ff8a65, #1a237e);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #fff, #e0d0ff);
        box-shadow: 0 0 8px rgba(180, 160, 255, 0.6), 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 14px rgba(180, 160, 255, 0.8), 0 2px 8px rgba(0,0,0,0.4);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #fff, #e0d0ff);
        box-shadow: 0 0 8px rgba(180, 160, 255, 0.6), 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        border: none;
      }
    `;
    document.head.appendChild(style);
    return input;
  }

  private _createModeButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = this.timeSystem.autoMode ? '自动模式' : '手动模式';
    btn.style.cssText = `
      padding: 7px 18px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.07);
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s ease;
      letter-spacing: 0.5px;
      white-space: nowrap;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.14)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
      btn.style.transform = 'translateY(-1px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.07)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      btn.style.transform = 'translateY(0)';
    });
    return btn;
  }

  private _createResetButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '重置视角';
    btn.style.cssText = `
      padding: 7px 18px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.07);
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s ease;
      letter-spacing: 0.5px;
      white-space: nowrap;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.14)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
      btn.style.transform = 'translateY(-1px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.07)';
      btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      btn.style.transform = 'translateY(0)';
    });
    return btn;
  }

  private _createTimeLabel(): HTMLSpanElement {
    const span = document.createElement('span');
    span.style.cssText = `
      color: rgba(255, 255, 255, 0.75);
      font-size: 14px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      min-width: 44px;
      text-align: right;
    `;
    return span;
  }

  private _bindEvents(): void {
    let wasAutoMode = this.timeSystem.autoMode;

    this.timeSlider.addEventListener('input', () => {
      this.timeSystem.timeOfDay = parseFloat(this.timeSlider.value);
    });

    this.timeSlider.addEventListener('mousedown', () => {
      wasAutoMode = this.timeSystem.autoMode;
      this.timeSystem.autoMode = false;
      this.modeButton.textContent = '手动模式';
      this.interactionManager.autoRotate = false;
    });

    this.timeSlider.addEventListener('mouseup', () => {
      if (wasAutoMode) {
        this.timeSystem.autoMode = true;
        this.interactionManager.autoRotate = true;
        this.modeButton.textContent = '自动模式';
      }
    });

    this.modeButton.addEventListener('click', () => {
      this.timeSystem.autoMode = !this.timeSystem.autoMode;
      this.interactionManager.autoRotate = this.timeSystem.autoMode;
      this.modeButton.textContent = this.timeSystem.autoMode ? '自动模式' : '手动模式';
      if (this._onModeToggle) this._onModeToggle();
    });

    this.resetButton.addEventListener('click', () => {
      this.interactionManager.requestResetView();
    });
  }
}
