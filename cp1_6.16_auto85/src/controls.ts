export interface ControlParams {
  particleSize: number;
  speed: number;
  colorStart: string;
  colorEnd: string;
  rotationMode: 'none' | 'slow' | 'fast';
}

export type ControlChangeHandler = (params: Partial<ControlParams>) => void;

export class ControlPanel {
  private container: HTMLElement;
  private params: ControlParams;
  private onChangeHandler: ControlChangeHandler | null = null;

  private sizeSlider!: HTMLInputElement;
  private sizeValueDisplay!: HTMLSpanElement;
  private speedSlider!: HTMLInputElement;
  private speedValueDisplay!: HTMLSpanElement;
  private colorStartPicker!: HTMLInputElement;
  private colorStartPreview!: HTMLDivElement;
  private colorEndPicker!: HTMLInputElement;
  private colorEndPreview!: HTMLDivElement;
  private rotationSelect!: HTMLSelectElement;

  constructor(parentElement: HTMLElement) {
    this.params = {
      particleSize: 0.05,
      speed: 0.001,
      colorStart: '#4A90D9',
      colorEnd: '#9B59B6',
      rotationMode: 'slow'
    };

    this.container = document.createElement('div');
    this.setupStyles();
    this.createControls();
    parentElement.appendChild(this.container);

    requestAnimationFrame(() => {
      this.container.style.transform = 'translateX(0)';
      this.container.style.opacity = '1';
    });
  }

  private setupStyles(): void {
    this.container.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 240px;
      background: rgba(30, 30, 46, 0.85);
      border-radius: 12px;
      padding: 20px;
      color: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 1000;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transform: translateX(60px);
      opacity: 0;
      transition: transform 0.5s ease-out, opacity 0.5s ease-out;
    `;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    displayPrecision: number
  ): { slider: HTMLInputElement; valueDisplay: HTMLSpanElement; wrapper: HTMLDivElement } {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '12px';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.color = '#CCCCCC';

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = defaultValue.toFixed(displayPrecision);
    valueDisplay.style.color = '#FFFFFF';
    valueDisplay.style.fontWeight = '500';

    labelRow.appendChild(labelElement);
    labelRow.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = defaultValue.toString();

    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #2D2D44;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4A90D9, #9B59B6);
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 10px rgba(155, 89, 182, 0.5);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4A90D9, #9B59B6);
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
    `;
    document.head.appendChild(styleSheet);

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);

    return { slider, valueDisplay, wrapper };
  }

  private createColorPicker(
    label: string,
    defaultValue: string
  ): { picker: HTMLInputElement; preview: HTMLDivElement; wrapper: HTMLDivElement } {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '12px';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.color = '#CCCCCC';

    const previewContainer = document.createElement('div');
    previewContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const preview = document.createElement('div');
    preview.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: ${defaultValue};
      border: 2px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;
    preview.addEventListener('mouseenter', () => {
      preview.style.transform = 'scale(1.1)';
      preview.style.boxShadow = `0 0 12px ${defaultValue}`;
    });
    preview.addEventListener('mouseleave', () => {
      preview.style.transform = 'scale(1)';
      preview.style.boxShadow = 'none';
    });

    const hexLabel = document.createElement('span');
    hexLabel.textContent = defaultValue.toUpperCase();
    hexLabel.style.cssText = `
      font-size: 12px;
      color: #888888;
      font-family: monospace;
    `;

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = defaultValue;
    picker.style.cssText = `
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 0;
      height: 0;
    `;

    preview.addEventListener('click', () => {
      picker.click();
    });

    previewContainer.appendChild(preview);
    previewContainer.appendChild(hexLabel);
    labelRow.appendChild(labelElement);
    labelRow.appendChild(previewContainer);
    wrapper.appendChild(labelRow);
    wrapper.appendChild(picker);

    return { picker, preview, wrapper };
  }

  private createSelect(
    label: string,
    options: { value: string; label: string }[],
    defaultValue: string
  ): { select: HTMLSelectElement; wrapper: HTMLDivElement } {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '12px';

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.cssText = `
      display: block;
      margin-bottom: 8px;
      color: #CCCCCC;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      background: #2D2D44;
      color: #FFFFFF;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    `;
    select.addEventListener('focus', () => {
      select.style.borderColor = '#9B59B6';
      select.style.boxShadow = '0 0 0 2px rgba(155, 89, 182, 0.2)';
    });
    select.addEventListener('blur', () => {
      select.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      select.style.boxShadow = 'none';
    });

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === defaultValue) {
        option.selected = true;
      }
      option.style.background = '#2D2D44';
      select.appendChild(option);
    });

    wrapper.appendChild(labelElement);
    wrapper.appendChild(select);

    return { select, wrapper };
  }

  private createControls(): void {
    const title = document.createElement('div');
    title.textContent = '🎛 控制面板';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #4A90D9, #9B59B6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    `;
    this.container.appendChild(title);

    const sizeControl = this.createSlider('粒子大小', 0.01, 0.15, 0.005, this.params.particleSize, 3);
    this.sizeSlider = sizeControl.slider;
    this.sizeValueDisplay = sizeControl.valueDisplay;
    this.container.appendChild(sizeControl.wrapper);

    this.sizeSlider.addEventListener('input', () => {
      const value = parseFloat(this.sizeSlider.value);
      this.params.particleSize = value;
      this.sizeValueDisplay.textContent = value.toFixed(3);
      this.notifyChange({ particleSize: value });
    });

    const speedControl = this.createSlider('运动速度', 0, 0.002, 0.0001, this.params.speed, 4);
    this.speedSlider = speedControl.slider;
    this.speedValueDisplay = speedControl.valueDisplay;
    this.container.appendChild(speedControl.wrapper);

    this.speedSlider.addEventListener('input', () => {
      const value = parseFloat(this.speedSlider.value);
      this.params.speed = value;
      this.speedValueDisplay.textContent = value.toFixed(4);
      this.notifyChange({ speed: value });
    });

    const colorStartControl = this.createColorPicker('起始颜色', this.params.colorStart);
    this.colorStartPicker = colorStartControl.picker;
    this.colorStartPreview = colorStartControl.preview;
    this.container.appendChild(colorStartControl.wrapper);

    this.colorStartPicker.addEventListener('input', () => {
      const value = this.colorStartPicker.value;
      this.params.colorStart = value;
      this.colorStartPreview.style.background = value;
      const hexLabel = this.colorStartPreview.nextElementSibling as HTMLSpanElement;
      if (hexLabel) hexLabel.textContent = value.toUpperCase();
      this.notifyChange({ colorStart: value });
    });

    const colorEndControl = this.createColorPicker('结束颜色', this.params.colorEnd);
    this.colorEndPicker = colorEndControl.picker;
    this.colorEndPreview = colorEndControl.preview;
    this.container.appendChild(colorEndControl.wrapper);

    this.colorEndPicker.addEventListener('input', () => {
      const value = this.colorEndPicker.value;
      this.params.colorEnd = value;
      this.colorEndPreview.style.background = value;
      const hexLabel = this.colorEndPreview.nextElementSibling as HTMLSpanElement;
      if (hexLabel) hexLabel.textContent = value.toUpperCase();
      this.notifyChange({ colorEnd: value });
    });

    const rotationControl = this.createSelect(
      '旋转模式',
      [
        { value: 'none', label: '无自转' },
        { value: 'slow', label: '慢速自转' },
        { value: 'fast', label: '快速自转' }
      ],
      this.params.rotationMode
    );
    this.rotationSelect = rotationControl.select;
    this.container.appendChild(rotationControl.wrapper);

    this.rotationSelect.addEventListener('change', () => {
      const value = this.rotationSelect.value as ControlParams['rotationMode'];
      this.params.rotationMode = value;
      this.notifyChange({ rotationMode: value });
    });

    const footer = document.createElement('div');
    footer.textContent = '拖拽旋转 · 滚轮缩放';
    footer.style.cssText = `
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 12px;
      color: #666666;
      text-align: center;
    `;
    this.container.appendChild(footer);
  }

  public onChange(handler: ControlChangeHandler): void {
    this.onChangeHandler = handler;
  }

  private notifyChange(params: Partial<ControlParams>): void {
    if (this.onChangeHandler) {
      this.onChangeHandler(params);
    }
  }

  public getParams(): ControlParams {
    return { ...this.params };
  }
}
