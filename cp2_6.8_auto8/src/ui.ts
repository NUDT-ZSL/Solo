export interface UICallbacks {
  onRotationSpeedChange: (speed: number) => void;
  onReset: () => void;
  onToggleLabels: (show: boolean) => void;
  onToggleBondColor: (byElement: boolean) => void;
  onToggleAutoRotate: (enabled: boolean) => void;
}

export class UI {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private infoPanel: HTMLDivElement;
  private callbacks: UICallbacks;
  private autoRotateBtn: HTMLButtonElement;
  private labelsToggle: HTMLButtonElement;
  private bondColorToggle: HTMLButtonElement;
  private isAutoRotating: boolean = false;
  private showLabels: boolean = false;
  private bondByElement: boolean = true;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('app')!;
    this.panel = this.createPanel();
    this.infoPanel = this.createInfoPanel();
    this.autoRotateBtn = this.createAutoRotateButton();
    this.labelsToggle = this.createLabelsToggle();
    this.bondColorToggle = this.createBondColorToggle();
    this.createUI();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'absolute',
      top: '20px',
      left: '20px',
      width: '280px',
      padding: '24px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '16px',
      color: '#ffffff',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      zIndex: '100',
      userSelect: 'none'
    } as CSSStyleDeclaration);
    this.container.appendChild(panel);
    return panel;
  }

  private createInfoPanel(): HTMLDivElement {
    const info = document.createElement('div');
    Object.assign(info.style, {
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      padding: '16px 20px',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(15px)',
      WebkitBackdropFilter: 'blur(15px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      color: '#ffffff',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontSize: '13px',
      lineHeight: '1.8',
      display: 'none',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      zIndex: '100',
      minWidth: '200px'
    } as CSSStyleDeclaration);
    info.id = 'atom-info-panel';
    this.container.appendChild(info);
    return info;
  }

  private createTitle(text: string): HTMLHeadingElement {
    const title = document.createElement('h2');
    title.textContent = text;
    Object.assign(title.style, {
      margin: '0 0 8px 0',
      fontSize: '18px',
      fontWeight: '600',
      background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      letterSpacing: '0.5px'
    } as CSSStyleDeclaration);
    return title;
  }

  private createSubtitle(text: string): HTMLParagraphElement {
    const subtitle = document.createElement('p');
    subtitle.textContent = text;
    Object.assign(subtitle.style, {
      margin: '0 0 24px 0',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.5)',
      letterSpacing: '0.3px'
    } as CSSStyleDeclaration);
    return subtitle;
  }

  private createSectionLabel(text: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.textContent = text;
    Object.assign(label.style, {
      display: 'block',
      fontSize: '12px',
      marginBottom: '8px',
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
      letterSpacing: '0.3px'
    } as CSSStyleDeclaration);
    return label;
  }

  private createButton(text: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      width: '100%',
      padding: '10px 16px',
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))',
      color: '#ffffff',
      border: '1px solid rgba(167, 139, 250, 0.4)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.3s ease',
      marginBottom: '12px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      letterSpacing: '0.3px'
    } as CSSStyleDeclaration);

    btn.addEventListener('mouseenter', () => {
      Object.assign(btn.style, {
        transform: 'translateY(-2px)',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.5))',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)'
      } as CSSStyleDeclaration);
    });

    btn.addEventListener('mouseleave', () => {
      Object.assign(btn.style, {
        transform: 'translateY(0)',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))',
        boxShadow: 'none'
      } as CSSStyleDeclaration);
    });

    return btn;
  }

  private createAutoRotateButton(): HTMLButtonElement {
    const btn = this.createButton('▶ 自动旋转');
    return btn;
  }

  private createLabelsToggle(): HTMLButtonElement {
    const btn = this.createButton('👁 显示原子标签: 关');
    return btn;
  }

  private createBondColorToggle(): HTMLButtonElement {
    const btn = this.createButton('🎨 键着色: 按元素');
    return btn;
  }

  private createUI(): void {
    this.panel.appendChild(this.createTitle('🔬 分子可视化'));
    this.panel.appendChild(this.createSubtitle('3D Interactive Molecule Viewer'));

    this.panel.appendChild(this.createSectionLabel('旋转速度'));
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0';
    speedSlider.max = '5';
    speedSlider.step = '0.1';
    speedSlider.value = '1';
    Object.assign(speedSlider.style, {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      background: 'linear-gradient(to right, #8b5cf6, #3b82f6)',
      outline: 'none',
      WebkitAppearance: 'none',
      appearance: 'none',
      marginBottom: '24px',
      cursor: 'pointer'
    } as CSSStyleDeclaration);

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #a78bfa, #60a5fa);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
        transition: all 0.3s ease;
        border: 2px solid rgba(255, 255, 255, 0.8);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 16px rgba(139, 92, 246, 0.7);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #a78bfa, #60a5fa);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.8);
      }
    `;
    document.head.appendChild(styleSheet);

    const speedValue = document.createElement('span');
    speedValue.textContent = '1.0x';
    Object.assign(speedValue.style, {
      display: 'block',
      textAlign: 'right',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: '-18px',
      marginBottom: '24px'
    } as CSSStyleDeclaration);

    speedSlider.addEventListener('input', () => {
      const val = parseFloat(speedSlider.value);
      speedValue.textContent = val.toFixed(1) + 'x';
      this.callbacks.onRotationSpeedChange(val);
    });

    this.panel.appendChild(speedSlider);
    this.panel.appendChild(speedValue);

    const resetBtn = this.createButton('↻ 重置视角');
    resetBtn.addEventListener('click', () => this.callbacks.onReset());
    this.panel.appendChild(resetBtn);

    this.autoRotateBtn.addEventListener('click', () => {
      this.isAutoRotating = !this.isAutoRotating;
      this.autoRotateBtn.textContent = this.isAutoRotating ? '⏸ 停止旋转' : '▶ 自动旋转';
      this.callbacks.onToggleAutoRotate(this.isAutoRotating);
    });
    this.panel.appendChild(this.autoRotateBtn);

    this.labelsToggle.addEventListener('click', () => {
      this.showLabels = !this.showLabels;
      this.labelsToggle.textContent = this.showLabels ? '👁 显示原子标签: 开' : '👁 显示原子标签: 关';
      this.callbacks.onToggleLabels(this.showLabels);
    });
    this.panel.appendChild(this.labelsToggle);

    this.bondColorToggle.addEventListener('click', () => {
      this.bondByElement = !this.bondByElement;
      this.bondColorToggle.textContent = this.bondByElement ? '🎨 键着色: 按元素' : '🎨 键着色: 统一白色';
      this.callbacks.onToggleBondColor(this.bondByElement);
    });
    this.panel.appendChild(this.bondColorToggle);
  }

  public showAtomInfo(element: string, id: number, x: number, y: number, z: number): void {
    this.infoPanel.style.display = 'block';
    const colorMap: Record<string, string> = {
      C: '#808080',
      O: '#ff4444',
      N: '#4466ff',
      H: '#ffffff'
    };
    const color = colorMap[element] || '#ffffff';
    this.infoPanel.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: ${color}; box-shadow: 0 0 10px ${color};"></div>
        <span style="font-size: 16px; font-weight: 600;">${element} <span style="opacity: 0.6;">#${id}</span></span>
      </div>
      <div style="font-size: 12px; opacity: 0.8; font-family: 'Consolas', monospace;">
        <div>X: ${x.toFixed(3)}</div>
        <div>Y: ${y.toFixed(3)}</div>
        <div>Z: ${z.toFixed(3)}</div>
      </div>
    `;
  }

  public hideAtomInfo(): void {
    this.infoPanel.style.display = 'none';
  }

  public dispose(): void {
    if (this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
    }
    if (this.infoPanel.parentNode) {
      this.infoPanel.parentNode.removeChild(this.infoPanel);
    }
  }
}
