import { ControlParams } from '../utils/rayUtils';

export class ControlPanel {
  private container: HTMLElement;
  private params: ControlParams;
  private onParamsChange: (params: ControlParams) => void;
  private onReset: () => void;

  constructor(
    parent: HTMLElement,
    initialParams: ControlParams,
    onParamsChange: (params: ControlParams) => void,
    onReset: () => void
  ) {
    this.params = { ...initialParams };
    this.onParamsChange = onParamsChange;
    this.onReset = onReset;

    this.container = document.createElement('div');
    this.container.className = 'control-panel';
    this.container.innerHTML = this.buildHTML();
    parent.appendChild(this.container);

    this.bindEvents();
  }

  private buildHTML(): string {
    return `
      <div class="control-panel__group">
        <label class="control-panel__label">
          <span>光线粗细</span>
          <span class="control-panel__value" id="lineWidthValue">${this.params.lineWidth}</span>
        </label>
        <input
          type="range"
          id="lineWidthSlider"
          class="control-panel__slider"
          min="1"
          max="10"
          step="0.5"
          value="${this.params.lineWidth}"
        />
      </div>
      <div class="control-panel__group">
        <label class="control-panel__label">
          <span>粒子扩散速度</span>
          <span class="control-panel__value" id="spreadSpeedValue">${this.params.particleSpreadSpeed.toFixed(1)}</span>
        </label>
        <input
          type="range"
          id="spreadSpeedSlider"
          class="control-panel__slider"
          min="0.1"
          max="3.0"
          step="0.1"
          value="${this.params.particleSpreadSpeed}"
        />
      </div>
      <button id="resetBtn" class="control-panel__btn">重置画布</button>
    `;
  }

  private bindEvents(): void {
    const lineWidthSlider = this.container.querySelector('#lineWidthSlider') as HTMLInputElement;
    const lineWidthValue = this.container.querySelector('#lineWidthValue') as HTMLSpanElement;
    const spreadSpeedSlider = this.container.querySelector('#spreadSpeedSlider') as HTMLInputElement;
    const spreadSpeedValue = this.container.querySelector('#spreadSpeedValue') as HTMLSpanElement;
    const resetBtn = this.container.querySelector('#resetBtn') as HTMLButtonElement;

    lineWidthSlider.addEventListener('input', () => {
      this.params.lineWidth = parseFloat(lineWidthSlider.value);
      lineWidthValue.textContent = this.params.lineWidth.toString();
      this.onParamsChange({ ...this.params });
    });

    spreadSpeedSlider.addEventListener('input', () => {
      this.params.particleSpreadSpeed = parseFloat(spreadSpeedSlider.value);
      spreadSpeedValue.textContent = this.params.particleSpreadSpeed.toFixed(1);
      this.onParamsChange({ ...this.params });
    });

    resetBtn.addEventListener('click', () => {
      this.onReset();
    });
  }
}
