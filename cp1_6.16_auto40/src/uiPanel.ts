import { PipeType, PIPE_CONFIG, hexToString, depthToString, diameterToString } from './utils';
import type { PipeMeshData } from './pipeSystem';

export interface UIPanelCallbacks {
  onTogglePipe: (type: PipeType, visible: boolean) => void;
  onSearch: (id: string) => boolean;
  onOpacityChange: (opacity: number) => void;
}

export class UIPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private infoLabel: HTMLElement;
  private searchInput: HTMLInputElement;

  private pipeToggles: Map<PipeType, { button: HTMLElement; active: boolean }> = new Map();
  private callbacks: UIPanelCallbacks;

  private labelVisible: boolean = false;

  constructor(container: HTMLElement, callbacks: UIPanelCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.panel = this.createPanel();
    this.infoLabel = this.createInfoLabel();
    this.searchInput = this.createSearchInput();

    this.container.appendChild(this.panel);
    this.container.appendChild(this.infoLabel);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(26, 26, 46, 0.85);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border-radius: 12px;
      padding: 20px;
      color: white;
      font-size: 14px;
      z-index: 100;
      min-width: 220px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const title = document.createElement('div');
    title.textContent = '管线控制面板';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;
    panel.appendChild(title);

    const toggleSection = document.createElement('div');
    toggleSection.style.marginBottom = '16px';

    const toggleTitle = document.createElement('div');
    toggleTitle.textContent = '管线显示';
    toggleTitle.style.cssText = `
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 10px;
    `;
    toggleSection.appendChild(toggleTitle);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    `;

    const types: PipeType[] = ['water', 'drainage', 'gas', 'power'];
    types.forEach(type => {
      const button = this.createToggleButton(type);
      buttonContainer.appendChild(button);
    });

    toggleSection.appendChild(buttonContainer);
    panel.appendChild(toggleSection);

    const searchSection = document.createElement('div');
    const searchTitle = document.createElement('div');
    searchTitle.textContent = '管线搜索';
    searchTitle.style.cssText = `
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 10px;
    `;
    searchSection.appendChild(searchTitle);

    const searchWrapper = document.createElement('div');
    searchWrapper.style.position = 'relative';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '输入管线编号 (如 W-001)';
    input.style.cssText = `
      width: 100%;
      padding: 10px 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 13px;
      outline: none;
      transition: border-color 0.3s;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = 'rgba(52, 152, 219, 0.8)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
    });
    searchWrapper.appendChild(input);
    this.searchInput = input;

    const searchBtn = document.createElement('button');
    searchBtn.textContent = '搜索';
    searchBtn.style.cssText = `
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      padding: 6px 12px;
      background: rgba(52, 152, 219, 0.9);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.3s;
    `;
    searchBtn.addEventListener('click', () => this.handleSearch());
    searchBtn.addEventListener('mouseenter', () => {
      searchBtn.style.background = 'rgba(52, 152, 219, 1)';
    });
    searchBtn.addEventListener('mouseleave', () => {
      searchBtn.style.background = 'rgba(52, 152, 219, 0.9)';
    });
    searchWrapper.appendChild(searchBtn);

    searchSection.appendChild(searchWrapper);

    const searchHint = document.createElement('div');
    searchHint.textContent = '示例: W-001, D-002, G-003, P-004';
    searchHint.style.cssText = `
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 8px;
    `;
    searchSection.appendChild(searchHint);

    panel.appendChild(searchSection);

    const opacitySection = document.createElement('div');
    opacitySection.style.marginTop = '16px';
    opacitySection.style.paddingTop = '16px';
    opacitySection.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';

    const opacityTitle = document.createElement('div');
    opacityTitle.textContent = '管线透明度';
    opacityTitle.style.cssText = `
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const opacityValue = document.createElement('span');
    opacityValue.textContent = '100%';
    opacityValue.style.cssText = `
      font-size: 12px;
      color: rgba(52, 152, 219, 0.9);
      font-weight: 500;
    `;
    opacityTitle.appendChild(opacityValue);
    opacitySection.appendChild(opacityTitle);

    const sliderWrapper = document.createElement('div');
    sliderWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '1';
    opacitySlider.step = '0.01';
    opacitySlider.value = '1';
    opacitySlider.style.cssText = `
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.2);
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
    `;

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3498DB;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(52, 152, 219, 0.5);
        transition: transform 0.2s;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3498DB;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(52, 152, 219, 0.5);
      }
    `;
    panel.appendChild(sliderStyle);

    opacitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      opacityValue.textContent = `${Math.round(value * 100)}%`;
      this.callbacks.onOpacityChange(value);
    });

    sliderWrapper.appendChild(opacitySlider);
    opacitySection.appendChild(sliderWrapper);

    panel.appendChild(opacitySection);

    return panel;
  }

  private createToggleButton(type: PipeType): HTMLElement {
    const config = PIPE_CONFIG[type];
    const colorHex = hexToString(config.color);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    `;

    const button = document.createElement('div');
    button.style.cssText = `
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: ${colorHex};
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px ${colorHex}40;
      opacity: 1;
      transform: scale(1);
    `;

    const label = document.createElement('span');
    label.textContent = config.label;
    label.style.cssText = `
      font-size: 11px;
      color: rgba(255, 255, 255, 0.8);
    `;

    wrapper.appendChild(button);
    wrapper.appendChild(label);

    this.pipeToggles.set(type, { button, active: true });

    wrapper.addEventListener('click', () => {
      this.togglePipe(type);
    });

    wrapper.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
    });
    wrapper.addEventListener('mouseleave', () => {
      const toggleData = this.pipeToggles.get(type);
      if (toggleData && toggleData.active) {
        button.style.transform = 'scale(1.15)';
      } else {
        button.style.transform = 'scale(1)';
      }
    });

    button.style.transform = 'scale(1.15)';

    return wrapper;
  }

  private togglePipe(type: PipeType): void {
    const toggleData = this.pipeToggles.get(type);
    if (!toggleData) return;

    toggleData.active = !toggleData.active;

    if (toggleData.active) {
      toggleData.button.style.opacity = '1';
      toggleData.button.style.transform = 'scale(1.15)';
    } else {
      toggleData.button.style.opacity = '0.3';
      toggleData.button.style.transform = 'scale(0.9)';
    }

    this.callbacks.onTogglePipe(type, toggleData.active);
  }

  private createInfoLabel(): HTMLElement {
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      background: #FFFFFF;
      color: #333;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2);
      pointer-events: none;
      z-index: 200;
      opacity: 0;
      transition: opacity 0.2s ease;
      white-space: nowrap;
      line-height: 1.6;
    `;
    return label;
  }

  private createSearchInput(): HTMLInputElement {
    return this.searchInput;
  }

  private handleSearch(): void {
    const value = this.searchInput.value.trim();
    if (!value) return;

    const found = this.callbacks.onSearch(value);
    if (!found) {
      this.searchInput.style.borderColor = 'rgba(231, 76, 60, 0.8)';
      setTimeout(() => {
        this.searchInput.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      }, 1000);
    }
  }

  public showLabel(pipe: PipeMeshData, screenX: number, screenY: number): void {
    const config = PIPE_CONFIG[pipe.data.type];
    const colorHex = hexToString(config.color);

    const content = `
      <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${colorHex};"></span>
        ${config.label}
      </div>
      <div style="font-size: 13px; color: #666;">编号: ${pipe.data.id}</div>
      <div style="font-size: 13px; color: #666;">埋深: ${depthToString(pipe.data.depth)}</div>
      <div style="font-size: 13px; color: #666;">管径: ${diameterToString(pipe.data.diameter)}</div>
    `;

    this.infoLabel.innerHTML = content;
    this.infoLabel.style.left = `${screenX + 15}px`;
    this.infoLabel.style.top = `${screenY + 15}px`;

    if (!this.labelVisible) {
      this.labelVisible = true;
      this.infoLabel.style.opacity = '1';
    }
  }

  public hideLabel(): void {
    if (this.labelVisible) {
      this.labelVisible = false;
      this.infoLabel.style.opacity = '0';
    }
  }

  public updateLabelPosition(screenX: number, screenY: number): void {
    if (this.labelVisible) {
      this.infoLabel.style.left = `${screenX + 15}px`;
      this.infoLabel.style.top = `${screenY + 15}px`;
    }
  }

  public isPanelHovered(clientX: number, clientY: number): boolean {
    const panelRect = this.panel.getBoundingClientRect();
    return (
      clientX >= panelRect.left &&
      clientX <= panelRect.right &&
      clientY >= panelRect.top &&
      clientY <= panelRect.bottom
    );
  }
}
