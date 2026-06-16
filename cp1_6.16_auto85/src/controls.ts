export interface ControlParams {
  particleSize: number;
  speed: number;
  colorStart: string;
  colorEnd: string;
  rotationMode: 'none' | 'slow' | 'fast';
}

export type ControlChangeHandler = (params: Partial<ControlParams>) => void;

/**
 * 控制面板UI类
 * 使用纯DOM创建右侧悬浮控制面板，包含粒子大小、运动速度、颜色选择器、旋转模式等控件
 * 所有控件变化通过回调函数通知外部模块
 *
 * 动画效果：
 *  - 页面加载时面板从右侧60px处滑入到目标位置（translateX: 60px → 0）
 *  - 滑块数值变化有0.2秒过渡动画
 *  - 颜色预览块hover时有缩放和发光效果
 */
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
    // 初始化默认参数值
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

    // 触发滑入动画
    // 使用 setTimeout 确保DOM元素已挂载且初始样式已应用，然后再修改样式触发过渡
    // 比 requestAnimationFrame 更可靠，避免某些浏览器下一帧时机不一致的问题
    this.playSlideInAnimation();
  }

  /**
   * 设置控制面板的基础样式
   * 关键点：
   *  - 初始状态 transform: translateX(60px)，即向右偏移60px作为动画起点
   *  - transition 属性设置 transform 和 opacity 的过渡，时长0.5秒，ease-out缓动
   *  - 当后续修改 transform 为 translateX(0) 时，会自动触发平滑过渡动画
   */
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
      /* 初始状态：向右偏移60px + 全透明，用于滑入动画 */
      transform: translateX(60px);
      opacity: 0;
      /* 过渡动画：transform 和 opacity 各0.5秒 ease-out 缓动 */
      /* ease-out: 开始快，结束慢，符合元素从外部滑入的物理直觉 */
      transition: transform 0.5s ease-out, opacity 0.5s ease-out;
    `;
  }

  /**
   * 播放滑入动画
   * 通过设置一个小延迟后修改transform和opacity，触发CSS过渡
   * 延迟是必要的，确保浏览器先应用初始样式，再应用目标样式
   */
  private playSlideInAnimation(): void {
    // 等待下一帧再修改，确保初始状态已被浏览器渲染
    // 双重 rAF 确保在所有浏览器中都能正确触发过渡
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.container.style.transform = 'translateX(0)';
        this.container.style.opacity = '1';
      });
    });
  }

  /**
   * 创建滑块控件
   * @param label 标签文字
   * @param min 最小值
   * @param max 最大值
   * @param step 步长
   * @param defaultValue 默认值
   * @param displayPrecision 显示的小数位数
   * @returns 包含slider元素、value显示元素、wrapper容器的对象
   */
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

    // 滑块轨道样式
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #2D2D44;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
      /* 滑块0.2秒过渡动画，数值变化时有平滑视觉反馈 */
      transition: all 0.2s ease;
    `;

    // 滑块拇指（拖动按钮）样式
    // 通过注入style标签实现伪元素样式（内联style无法设置伪元素）
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

  /**
   * 创建颜色选择器控件
   * 包含：色块预览 + hex色值显示 + 隐藏的原生color input
   * 点击色块时触发原生颜色选择器
   * @param label 标签文字
   * @param defaultValue 默认颜色值
   */
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

    // 色块预览：20x20px圆角方块，点击弹出颜色选择器
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
    // hover时放大并发光，提供交互反馈
    preview.addEventListener('mouseenter', () => {
      preview.style.transform = 'scale(1.1)';
      preview.style.boxShadow = `0 0 12px ${defaultValue}`;
    });
    preview.addEventListener('mouseleave', () => {
      preview.style.transform = 'scale(1)';
      preview.style.boxShadow = 'none';
    });

    // 色值文本显示（hex格式，12px monospace字体）
    const hexLabel = document.createElement('span');
    hexLabel.textContent = defaultValue.toUpperCase();
    hexLabel.style.cssText = `
      font-size: 12px;
      color: #888888;
      font-family: monospace;
    `;

    // 原生color input（隐藏，通过点击色块触发）
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

    // 点击色块时触发原生颜色选择器
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

  /**
   * 创建下拉选择框
   * @param label 标签文字
   * @param options 选项数组 {value, label}
   * @param defaultValue 默认选中值
   */
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
      /* 边框和阴影的0.2秒过渡，聚焦时的平滑视觉反馈 */
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    `;
    // 聚焦时边框变色 + 外发光
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

  /**
   * 创建所有控件并组装到面板中
   * 控件顺序：标题 → 粒子大小滑块 → 运动速度滑块 → 起始颜色 → 结束颜色 → 旋转模式 → 提示文字
   */
  private createControls(): void {
    // 面板标题（渐变色文字）
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

    // 粒子大小滑块（范围0.01~0.15，步长0.005）
    const sizeControl = this.createSlider('粒子大小', 0.01, 0.15, 0.005, this.params.particleSize, 3);
    this.sizeSlider = sizeControl.slider;
    this.sizeValueDisplay = sizeControl.valueDisplay;
    this.container.appendChild(sizeControl.wrapper);

    // 监听粒子大小变化
    this.sizeSlider.addEventListener('input', () => {
      const value = parseFloat(this.sizeSlider.value);
      this.params.particleSize = value;
      this.sizeValueDisplay.textContent = value.toFixed(3);
      this.notifyChange({ particleSize: value });
    });

    // 运动速度滑块（范围0~0.002，步长0.0001）
    const speedControl = this.createSlider('运动速度', 0, 0.002, 0.0001, this.params.speed, 4);
    this.speedSlider = speedControl.slider;
    this.speedValueDisplay = speedControl.valueDisplay;
    this.container.appendChild(speedControl.wrapper);

    // 监听运动速度变化
    this.speedSlider.addEventListener('input', () => {
      const value = parseFloat(this.speedSlider.value);
      this.params.speed = value;
      this.speedValueDisplay.textContent = value.toFixed(4);
      this.notifyChange({ speed: value });
    });

    // 起始颜色选择器
    const colorStartControl = this.createColorPicker('起始颜色', this.params.colorStart);
    this.colorStartPicker = colorStartControl.picker;
    this.colorStartPreview = colorStartControl.preview;
    this.container.appendChild(colorStartControl.wrapper);

    // 监听起始颜色变化
    this.colorStartPicker.addEventListener('input', () => {
      const value = this.colorStartPicker.value;
      this.params.colorStart = value;
      this.colorStartPreview.style.background = value;
      const hexLabel = this.colorStartPreview.nextElementSibling as HTMLSpanElement;
      if (hexLabel) hexLabel.textContent = value.toUpperCase();
      this.notifyChange({ colorStart: value });
    });

    // 结束颜色选择器
    const colorEndControl = this.createColorPicker('结束颜色', this.params.colorEnd);
    this.colorEndPicker = colorEndControl.picker;
    this.colorEndPreview = colorEndControl.preview;
    this.container.appendChild(colorEndControl.wrapper);

    // 监听结束颜色变化
    this.colorEndPicker.addEventListener('input', () => {
      const value = this.colorEndPicker.value;
      this.params.colorEnd = value;
      this.colorEndPreview.style.background = value;
      const hexLabel = this.colorEndPreview.nextElementSibling as HTMLSpanElement;
      if (hexLabel) hexLabel.textContent = value.toUpperCase();
      this.notifyChange({ colorEnd: value });
    });

    // 旋转模式下拉选择
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

    // 监听旋转模式变化
    this.rotationSelect.addEventListener('change', () => {
      const value = this.rotationSelect.value as ControlParams['rotationMode'];
      this.params.rotationMode = value;
      this.notifyChange({ rotationMode: value });
    });

    // 底部提示文字
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

  /**
   * 注册参数变化回调函数
   * @param handler 变化回调，接收变化的参数部分
   */
  public onChange(handler: ControlChangeHandler): void {
    this.onChangeHandler = handler;
  }

  /**
   * 触发参数变化通知
   * @param params 变化的参数（部分）
   */
  private notifyChange(params: Partial<ControlParams>): void {
    if (this.onChangeHandler) {
      this.onChangeHandler(params);
    }
  }

  /**
   * 获取当前全部参数
   * @returns 当前参数的副本
   */
  public getParams(): ControlParams {
    return { ...this.params };
  }
}
