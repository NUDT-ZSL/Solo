import type { PointCloudRenderer, RenderMode } from './pointCloudRenderer';

export interface ControlState {
  pointSize: number;
  depthOffset: number;
  saturation: number;
  renderMode: RenderMode;
}

export class Controls {
  private container: HTMLElement;
  private renderer: PointCloudRenderer;
  private onFileUpload: (file: File) => void;
  
  private panel: HTMLElement;
  private uploadArea: HTMLElement;
  private statusBar: HTMLElement;
  
  private state: ControlState = {
    pointSize: 3,
    depthOffset: 0,
    saturation: 1,
    renderMode: 'original',
  };

  constructor(
    container: HTMLElement,
    renderer: PointCloudRenderer,
    onFileUpload: (file: File) => void
  ) {
    this.container = container;
    this.renderer = renderer;
    this.onFileUpload = onFileUpload;
    
    this.injectGlobalStyles();
    
    this.panel = this.createPanel();
    this.uploadArea = this.createUploadArea();
    this.statusBar = this.createStatusBar();
    
    this.panel.appendChild(this.uploadArea);
    this.panel.appendChild(this.createControls());
    this.panel.appendChild(this.createRenderModeSelector());
    this.panel.appendChild(this.createExportButton());
    
    this.container.appendChild(this.panel);
    this.container.appendChild(this.statusBar);
    
    this.setupMobileLayout();
    this.bindRendererEvents();
  }

  private injectGlobalStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes uploadBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }
      @keyframes fpsBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      .control-panel input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.1);
        outline: none;
        cursor: pointer;
      }
      
      .control-panel input[type="range"]::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 2px;
        background: transparent;
      }
      
      .control-panel input[type="range"]::-moz-range-track {
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.1);
      }
      
      .control-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #5B8DEF;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(91, 141, 239, 0.6), inset 0 0 4px rgba(255, 255, 255, 0.3);
        border: 2px solid rgba(255, 255, 255, 0.2);
        margin-top: -6px;
        transition: box-shadow 0.2s ease, transform 0.2s ease;
      }
      
      .control-panel input[type="range"]::-webkit-slider-thumb:hover {
        box-shadow: 0 0 14px rgba(91, 141, 239, 0.9), inset 0 0 6px rgba(255, 255, 255, 0.4);
        transform: scale(1.15);
      }
      
      .control-panel input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #5B8DEF;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 0 8px rgba(91, 141, 239, 0.6), inset 0 0 4px rgba(255, 255, 255, 0.3);
        transition: box-shadow 0.2s ease, transform 0.2s ease;
      }
      
      .control-panel input[type="range"]::-moz-range-thumb:hover {
        box-shadow: 0 0 14px rgba(91, 141, 239, 0.9), inset 0 0 6px rgba(255, 255, 255, 0.4);
        transform: scale(1.15);
      }
      
      .control-panel input[type="range"]:focus {
        outline: none;
      }
      
      .control-panel input[type="range"]:focus::-webkit-slider-thumb {
        box-shadow: 0 0 16px rgba(91, 141, 239, 1), inset 0 0 6px rgba(255, 255, 255, 0.4);
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    panel.style.cssText = `
      position: fixed;
      left: 20px;
      top: 20px;
      width: 280px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 16px;
      padding: 20px;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
    `;
    
    panel.addEventListener('scroll', () => {
      panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.35)';
    });
    
    return panel;
  }

  private createUploadArea(): HTMLElement {
    const area = document.createElement('div');
    area.className = 'upload-area';
    area.innerHTML = `
      <div class="upload-icon" style="font-size: 32px; margin-bottom: 8px; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">📁</div>
      <div class="upload-title" style="font-size: 14px; font-weight: 500; margin-bottom: 4px; color: #e6edf3;">拖拽深度图到此处</div>
      <div class="upload-subtitle" style="font-size: 12px; color: #8b949e;">或点击选择文件 (PNG/JPEG)</div>
    `;
    area.style.cssText = `
      border: 2px dashed rgba(91, 141, 239, 0.5);
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      margin-bottom: 20px;
      background: rgba(91, 141, 239, 0.05);
    `;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg';
    input.style.display = 'none';
    
    area.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFile(files[0]);
      }
    });
    
    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.style.transform = 'scale(1.05)';
      area.style.borderColor = 'rgba(91, 141, 239, 0.9)';
      area.style.background = 'rgba(91, 141, 239, 0.15)';
      area.style.boxShadow = '0 0 24px rgba(91, 141, 239, 0.2)';
    });
    
    area.addEventListener('dragleave', () => {
      area.style.transform = 'scale(1)';
      area.style.borderColor = 'rgba(91, 141, 239, 0.5)';
      area.style.background = 'rgba(91, 141, 239, 0.05)';
      area.style.boxShadow = 'none';
    });
    
    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.style.transform = 'scale(1)';
      area.style.borderColor = 'rgba(91, 141, 239, 0.5)';
      area.style.background = 'rgba(91, 141, 239, 0.05)';
      area.style.boxShadow = 'none';
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFile(files[0]);
      }
    });
    
    area.appendChild(input);
    return area;
  }

  private handleFile(file: File): void {
    const icon = this.uploadArea.querySelector('.upload-icon') as HTMLElement;
    if (icon) {
      icon.style.animation = 'none';
      icon.offsetHeight;
      icon.style.animation = 'uploadBounce 0.5s ease';
    }
    
    this.onFileUpload(file);
  }

  private createControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'sliders-section';
    controls.style.cssText = `
      margin-bottom: 20px;
    `;
    
    controls.appendChild(this.createSlider(
      'pointSize',
      '点大小',
      1, 6, 0.5, 3,
      (val) => `${val} px`
    ));
    
    controls.appendChild(this.createSlider(
      'depthOffset',
      '深度偏移',
      -0.5, 0.5, 0.02, 0,
      (val) => `${(val * 100).toFixed(0)}%`
    ));
    
    controls.appendChild(this.createSlider(
      'saturation',
      '颜色饱和度',
      0, 2, 0.1, 1,
      (val) => `${(val * 100).toFixed(0)}%`
    ));
    
    return controls;
  }

  private createSlider(
    key: keyof ControlState,
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    formatValue: (val: number) => string
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';
    wrapper.style.cssText = `
      margin-bottom: 18px;
    `;
    
    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 13px;
    `;
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = '#e6edf3';
    
    const valueEl = document.createElement('span');
    valueEl.className = 'slider-value';
    valueEl.textContent = formatValue(defaultValue);
    valueEl.style.cssText = `
      color: #5B8DEF;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      min-width: 48px;
      text-align: right;
    `;
    
    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    
    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      position: relative;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.1);
    `;
    
    const sliderFill = document.createElement('div');
    const initialPercent = ((defaultValue - min) / (max - min)) * 100;
    sliderFill.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      border-radius: 2px;
      background: linear-gradient(90deg, #5B8DEF, #7aa7f5);
      width: ${initialPercent}%;
      transition: width 0.1s ease;
    `;
    sliderContainer.appendChild(sliderFill);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(defaultValue);
    slider.style.cssText = `
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
      height: 16px;
      background: transparent;
      margin: 0;
    `;
    
    sliderContainer.appendChild(slider);
    
    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      (this.state as any)[key] = value;
      valueEl.textContent = formatValue(value);
      
      const percent = ((value - min) / (max - min)) * 100;
      sliderFill.style.width = `${percent}%`;
      
      if (key === 'pointSize') {
        this.renderer.setPointSize(value);
      } else if (key === 'depthOffset') {
        this.renderer.setDepthOffset(value);
      } else if (key === 'saturation') {
        this.renderer.setSaturation(value);
      }
    });
    
    wrapper.appendChild(labelRow);
    wrapper.appendChild(sliderContainer);
    
    return wrapper;
  }

  private createRenderModeSelector(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'render-mode-section';
    section.style.cssText = `
      margin-bottom: 22px;
    `;
    
    const label = document.createElement('div');
    label.textContent = '渲染模式';
    label.style.cssText = `
      font-size: 13px;
      margin-bottom: 10px;
      color: #e6edf3;
    `;
    
    const modes: { key: RenderMode; label: string }[] = [
      { key: 'solid', label: '纯色' },
      { key: 'depth', label: '深度' },
      { key: 'original', label: '原色' },
    ];
    
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = `
      display: flex;
      gap: 4px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      padding: 4px;
    `;
    
    modes.forEach((mode) => {
      const btn = document.createElement('button');
      btn.textContent = mode.label;
      btn.dataset.mode = mode.key;
      btn.style.cssText = `
        flex: 1;
        padding: 9px 6px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #8b949e;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: inherit;
        position: relative;
        overflow: hidden;
      `;
      
      if (mode.key === this.state.renderMode) {
        btn.style.background = '#5B8DEF';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 2px 10px rgba(91, 141, 239, 0.4)';
      }
      
      btn.addEventListener('mouseenter', () => {
        if (mode.key !== this.state.renderMode) {
          btn.style.background = 'rgba(91, 141, 239, 0.15)';
          btn.style.color = '#c9d1d9';
          btn.style.transform = 'scale(1.03)';
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        if (mode.key !== this.state.renderMode) {
          btn.style.background = 'transparent';
          btn.style.color = '#8b949e';
          btn.style.transform = 'scale(1)';
        }
      });
      
      btn.addEventListener('click', (e) => {
        this.createRipple(btn, e as MouseEvent);
        
        this.state.renderMode = mode.key;
        this.renderer.setRenderMode(mode.key);
        
        btnGroup.querySelectorAll('button').forEach((b) => {
          const btnEl = b as HTMLElement;
          if (btnEl.dataset.mode !== mode.key) {
            btnEl.style.background = 'transparent';
            btnEl.style.color = '#8b949e';
            btnEl.style.boxShadow = 'none';
            btnEl.style.transform = 'scale(1)';
          }
        });
        
        btn.style.background = '#5B8DEF';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 2px 10px rgba(91, 141, 239, 0.4)';
        btn.style.transform = 'scale(1)';
      });
      
      btnGroup.appendChild(btn);
    });
    
    section.appendChild(label);
    section.appendChild(btnGroup);
    
    return section;
  }

  private createExportButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'export-btn';
    btn.innerHTML = `
      <span style="margin-right: 6px; display: inline-block;">⬇</span>
      导出 PLY 文件
    `;
    btn.style.cssText = `
      width: 100%;
      padding: 13px 16px;
      background: linear-gradient(135deg, #5B8DEF 0%, #4a7de0 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: inherit;
      box-shadow: 0 4px 14px rgba(91, 141, 239, 0.35);
      position: relative;
      overflow: hidden;
    `;
    
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px) scale(1.02)';
      btn.style.boxShadow = '0 6px 24px rgba(91, 141, 239, 0.55)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0) scale(1)';
      btn.style.boxShadow = '0 4px 14px rgba(91, 141, 239, 0.35)';
    });
    
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'translateY(0) scale(0.98)';
    });
    
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'translateY(-2px) scale(1.02)';
    });
    
    btn.addEventListener('click', (e) => {
      this.createRipple(btn, e as MouseEvent);
      this.onExportClick?.();
    });
    
    return btn;
  }

  private createRipple(element: HTMLElement, e: MouseEvent): void {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.45);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out forwards;
      pointer-events: none;
      z-index: 1;
    `;
    
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
  }

  private createStatusBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'status-bar';
    bar.innerHTML = `
      <span class="status-points">顶点数: 0</span>
      <span style="width: 1px; height: 16px; background: rgba(255,255,255,0.15);"></span>
      <span class="status-fps">FPS: --</span>
    `;
    bar.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 10px 24px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 24px;
      font-size: 13px;
      color: #8b949e;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-variant-numeric: tabular-nums;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    `;
    
    return bar;
  }

  private bindRendererEvents(): void {
    this.renderer.setOnFpsUpdate((fps) => {
      const fpsEl = this.statusBar.querySelector('.status-fps') as HTMLElement | null;
      if (fpsEl) {
        fpsEl.textContent = `FPS: ${fps}`;
        if (fps < 30) {
          fpsEl.style.color = '#ff6b6b';
          fpsEl.style.animation = 'fpsBlink 1s infinite';
        } else {
          fpsEl.style.color = '#3fb950';
          fpsEl.style.animation = 'none';
        }
      }
    });
    
    this.renderer.setOnPointCountUpdate((count) => {
      const pointsEl = this.statusBar.querySelector('.status-points') as HTMLElement | null;
      if (pointsEl) {
        pointsEl.textContent = `顶点数: ${count.toLocaleString()}`;
      }
    });
  }

  private setupMobileLayout(): void {
    const checkMobile = () => {
      if (window.innerWidth <= 768) {
        this.panel.style.position = 'fixed';
        this.panel.style.left = '50%';
        this.panel.style.transform = 'translateX(-50%)';
        this.panel.style.top = 'auto';
        this.panel.style.bottom = '60px';
        this.panel.style.width = 'calc(100% - 32px)';
        this.panel.style.maxHeight = '55vh';
        this.panel.style.padding = '16px';
      } else {
        this.panel.style.position = 'fixed';
        this.panel.style.left = '20px';
        this.panel.style.transform = 'none';
        this.panel.style.top = '20px';
        this.panel.style.width = '280px';
        this.panel.style.maxHeight = 'calc(100vh - 40px)';
        this.panel.style.bottom = 'auto';
        this.panel.style.padding = '20px';
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
  }

  public onExportClick: (() => void) | null = null;

  public getState(): ControlState {
    return { ...this.state };
  }
}
