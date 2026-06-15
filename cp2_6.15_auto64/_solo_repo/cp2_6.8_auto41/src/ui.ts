import { LightsController, LIGHT_PRESETS } from './lights';
import { Bubble } from './lavaLamp';

interface UICallbacks {
  onTemperatureChange: (value: number) => void;
  onBubbleCountChange: (value: number) => void;
  onRefractionChange: (value: number) => void;
  onLightPresetChange: (index: number) => void;
  onResetView: () => void;
}

export class UIController {
  private container: HTMLElement;
  private panel: HTMLElement;
  private panelToggle: HTMLElement;
  private labelElement: HTMLElement | null = null;
  private callbacks: UICallbacks;
  private lights: LightsController;
  private selectedBubble: Bubble | null = null;
  private isPanelOpen = true;
  private isMobile = false;
  
  constructor(
    parent: HTMLElement,
    lights: LightsController,
    _lavaLamp: unknown,
    callbacks: UICallbacks
  ) {
    this.container = parent;
    this.lights = lights;
    this.callbacks = callbacks;
    
    this.panel = this.createPanel();
    this.panelToggle = this.createPanelToggle();
    this.container.appendChild(this.panel);
    this.container.appendChild(this.panelToggle);
    this.labelElement = this.createLabel();
    this.container.appendChild(this.labelElement);
    
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
  }
  
  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 390px;
      max-height: calc(100vh - 40px);
      background: rgba(20, 20, 40, 0.5);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 24px;
      overflow-y: auto;
      z-index: 50;
      transition: transform 0.3s ease, opacity 0.3s ease;
      box-sizing: border-box;
    `;
    
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #ffa94d;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    title.innerHTML = '<span>🌋</span> 熔岩灯控制台';
    panel.appendChild(title);
    
    this.createSlider(panel, '温度', 'temperature', 0, 100, 50, (v) => {
      this.callbacks.onTemperatureChange(v);
    }, '°C');
    
    this.createSlider(panel, '泡密度', 'bubbleCount', 5, 20, 10, (v) => {
      this.callbacks.onBubbleCountChange(Math.round(v));
    }, '个', true);
    
    this.createSlider(panel, '折射率', 'refraction', 1.3, 1.5, 1.4, (v) => {
      this.callbacks.onRefractionChange(v);
    }, '', false, 2);
    
    this.createLightPresets(panel);
    
    this.createResetButton(panel);
    
    const hint = document.createElement('div');
    hint.style.cssText = `
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.6;
    `;
    hint.innerHTML = `
      <div style="margin-bottom: 6px;"><strong>操作提示：</strong></div>
      <div>• 鼠标拖拽旋转视角</div>
      <div>• 滚轮缩放</div>
      <div>• 点击熔岩泡查看详情</div>
    `;
    panel.appendChild(hint);
    
    return panel;
  }
  
  private createSlider(
    parent: HTMLElement,
    label: string,
    id: string,
    min: number,
    max: number,
    defaultValue: number,
    onChange: (value: number) => void,
    unit: string = '',
    isInteger: boolean = false,
    decimals: number = 0
  ): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 20px;
    `;
    
    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    `;
    
    const labelText = document.createElement('span');
    labelText.style.color = 'rgba(255, 255, 255, 0.85)';
    labelText.textContent = label;
    
    const valueText = document.createElement('span');
    valueText.style.cssText = `
      color: #ffa94d;
      font-weight: 600;
      min-width: 50px;
      text-align: right;
      transition: color 0.3s ease;
    `;
    valueText.textContent = isInteger ? `${defaultValue}${unit}` : `${defaultValue.toFixed(decimals)}${unit}`;
    
    labelRow.appendChild(labelText);
    labelRow.appendChild(valueText);
    wrapper.appendChild(labelRow);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `slider-${id}`;
    slider.min = String(min);
    slider.max = String(max);
    slider.step = isInteger ? '1' : (decimals > 0 ? `0.0${decimals === 1 ? '' : '1'}` : '0.01');
    slider.value = String(defaultValue);
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      #slider-${id}::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffa94d, #ff6b35);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
        transition: all 0.2s ease;
      }
      #slider-${id}::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(255, 107, 53, 0.6);
      }
      #slider-${id}::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffa94d, #ff6b35);
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 8px rgba(255, 107, 53, 0.4);
      }
    `;
    document.head.appendChild(styleSheet);
    
    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      valueText.textContent = isInteger ? `${Math.round(value)}${unit}` : `${value.toFixed(decimals)}${unit}`;
      onChange(value);
    });
    
    wrapper.appendChild(slider);
    parent.appendChild(wrapper);
  }
  
  private createLightPresets(parent: HTMLElement): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 20px;
    `;
    
    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
      margin-bottom: 10px;
    `;
    label.textContent = '灯光颜色';
    wrapper.appendChild(label);
    
    const presetsRow = document.createElement('div');
    presetsRow.style.cssText = `
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    `;
    
    LIGHT_PRESETS.forEach((preset, index) => {
      const btn = document.createElement('button');
      btn.textContent = preset.name;
      btn.dataset.presetIndex = String(index);
      btn.style.cssText = `
        flex: 1;
        min-width: 60px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.85);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      `;
      
      const colorIndicator = document.createElement('span');
      colorIndicator.style.cssText = `
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${preset.point.getStyle()};
        margin-right: 6px;
        box-shadow: 0 0 8px ${preset.point.getStyle()};
      `;
      btn.insertBefore(colorIndicator, btn.firstChild);
      
      if (index === this.lights.currentPresetIndex) {
        btn.style.background = 'rgba(255, 169, 77, 0.2)';
        btn.style.borderColor = 'rgba(255, 169, 77, 0.5)';
        btn.style.color = '#ffa94d';
      }
      
      btn.addEventListener('mouseenter', () => {
        if (index !== this.lights.currentPresetIndex) {
          btn.style.transform = 'translateY(-2px)';
          btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
        btn.style.boxShadow = '';
      });
      
      btn.addEventListener('click', () => {
        presetsRow.querySelectorAll('button').forEach((b) => {
          b.style.background = 'rgba(255, 255, 255, 0.05)';
          b.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          b.style.color = 'rgba(255, 255, 255, 0.85)';
        });
        btn.style.background = 'rgba(255, 169, 77, 0.2)';
        btn.style.borderColor = 'rgba(255, 169, 77, 0.5)';
        btn.style.color = '#ffa94d';
        this.callbacks.onLightPresetChange(index);
      });
      
      presetsRow.appendChild(btn);
    });
    
    wrapper.appendChild(presetsRow);
    parent.appendChild(wrapper);
  }
  
  private createResetButton(parent: HTMLElement): void {
    const btn = document.createElement('button');
    btn.textContent = '🔄 重置视角';
    btn.style.cssText = `
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, rgba(255, 169, 77, 0.2), rgba(255, 107, 53, 0.2));
      color: #ffa94d;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 169, 77, 0.3);
    `;
    
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.3)';
      btn.style.background = 'linear-gradient(135deg, rgba(255, 169, 77, 0.3), rgba(255, 107, 53, 0.3))';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.boxShadow = '';
    });
    
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'translateY(0)';
    });
    
    btn.addEventListener('click', () => {
      this.callbacks.onResetView();
    });
    
    parent.appendChild(btn);
  }
  
  private createPanelToggle(): HTMLElement {
    const toggle = document.createElement('button');
    toggle.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(20, 20, 40, 0.6);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffa94d;
      font-size: 20px;
      cursor: pointer;
      z-index: 51;
      display: none;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;
    toggle.innerHTML = '⚙️';
    
    toggle.addEventListener('mouseenter', () => {
      toggle.style.transform = 'scale(1.1)';
    });
    
    toggle.addEventListener('mouseleave', () => {
      toggle.style.transform = '';
    });
    
    toggle.addEventListener('click', () => {
      this.togglePanel();
    });
    
    return toggle;
  }
  
  private createLabel(): HTMLElement {
    const label = document.createElement('div');
    label.className = 'bubble-label';
    label.style.display = 'none';
    return label;
  }
  
  private checkMobile(): void {
    const width = window.innerWidth;
    const wasMobile = this.isMobile;
    this.isMobile = width < 768;
    
    if (this.isMobile) {
      this.panelToggle.style.display = 'flex';
      this.applyMobileStyles();
      if (!wasMobile) {
        this.isPanelOpen = false;
        this.updatePanelPosition();
      }
    } else {
      this.panelToggle.style.display = 'none';
      this.applyDesktopStyles();
      if (wasMobile) {
        this.isPanelOpen = true;
        this.updatePanelPosition();
      }
    }
  }
  
  private applyMobileStyles(): void {
    this.panel.style.cssText = `
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      max-height: 60vh;
      background: rgba(20, 20, 40, 0.7);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 16px 16px 0 0;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: none;
      padding: 24px;
      padding-bottom: calc(24px + env(safe-area-inset-bottom, 0));
      overflow-y: auto;
      z-index: 50;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      box-sizing: border-box;
    `;
  }
  
  private applyDesktopStyles(): void {
    this.panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 390px;
      max-height: calc(100vh - 40px);
      background: rgba(20, 20, 40, 0.5);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 24px;
      overflow-y: auto;
      z-index: 50;
      transition: transform 0.3s ease, opacity 0.3s ease;
      box-sizing: border-box;
    `;
  }
  
  private updatePanelPosition(): void {
    if (this.isMobile) {
      if (this.isPanelOpen) {
        this.panel.style.transform = 'translateY(0)';
        this.panel.style.opacity = '1';
      } else {
        this.panel.style.transform = 'translateY(100%)';
        this.panel.style.opacity = '0';
      }
    } else {
      if (this.isPanelOpen) {
        this.panel.style.transform = 'translateX(0)';
        this.panel.style.opacity = '1';
      } else {
        this.panel.style.transform = 'translateX(calc(100% + 40px))';
        this.panel.style.opacity = '0';
      }
    }
  }
  
  private togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    this.updatePanelPosition();
  }
  
  public setSelectedBubble(bubble: Bubble | null): void {
    this.selectedBubble = bubble;
    if (!bubble && this.labelElement) {
      this.labelElement.style.display = 'none';
    }
  }
  
  public updateLabelPosition(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement
  ): void {
    if (!this.selectedBubble || !this.labelElement) return;
    
    const pos = this.selectedBubble.mesh.position.clone();
    pos.y += this.selectedBubble.radius + 0.3;
    pos.project(camera);
    
    const rect = domElement.getBoundingClientRect();
    const x = (pos.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-pos.y * 0.5 + 0.5) * rect.height + rect.top;
    
    if (pos.z < 1) {
      this.labelElement.style.display = 'block';
      this.labelElement.style.left = `${x}px`;
      this.labelElement.style.top = `${y}px`;
      
      const r = this.selectedBubble.radius.toFixed(2);
      const colorHex = '#' + this.selectedBubble.color.getHexString();
      
      this.labelElement.innerHTML = `
        <div class="label-title">熔岩泡 #${this.selectedBubble.id}</div>
        <div class="label-row">
          <span>半径:</span>
          <span>${r} 单位</span>
        </div>
        <div class="label-row">
          <span>颜色:</span>
          <span>${colorHex}<span class="label-color" style="background:${colorHex}"></span></span>
        </div>
      `;
    } else {
      this.labelElement.style.display = 'none';
    }
  }
}
