export interface UIControlsCallbacks {
  onRotationSpeedChange: (speed: number) => void;
  onThemeChange: (theme: string) => void;
  onResetCamera: () => void;
}

interface ThemeOption {
  key: string;
  label: string;
}

const themeOptions: ThemeOption[] = [
  { key: 'spring', label: '春 · 粉绿' },
  { key: 'summer', label: '夏 · 蓝金' },
  { key: 'autumn', label: '秋 · 橙紫' },
  { key: 'winter', label: '冬 · 冰蓝' }
];

export class UIControls {
  private container: HTMLElement;
  private callbacks: UIControlsCallbacks;
  private themeMenu: HTMLElement;
  private tooltip: HTMLElement;

  constructor(callbacks: UIControlsCallbacks) {
    this.callbacks = callbacks;

    this.container = document.createElement('div');
    this.container.id = 'controls';
    document.body.appendChild(this.container);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    document.body.appendChild(this.tooltip);

    this.createSpeedSlider();
    this.createThemeButton();
    this.createResetButton();

    this.themeMenu = this.createThemeMenu();
  }

  private createSpeedSlider(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'ctrl-slider';
    wrapper.title = '旋转速度';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '2';
    slider.step = '0.1';
    slider.value = '1';

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onRotationSpeedChange(value);
    });

    wrapper.appendChild(slider);
    this.addTooltip(wrapper, '旋转速度');
    this.container.appendChild(wrapper);
  }

  private createThemeButton(): void {
    const btn = document.createElement('button');
    btn.className = 'ctrl-btn';
    btn.innerHTML = '🎨';
    btn.title = '颜色主题';

    btn.addEventListener('click', () => {
      this.toggleThemeMenu();
    });

    this.addTooltip(btn, '颜色主题');
    this.container.appendChild(btn);
  }

  private createThemeMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'theme-menu';

    themeOptions.forEach(option => {
      const item = document.createElement('div');
      item.className = 'theme-item';
      item.textContent = option.label;
      item.addEventListener('click', () => {
        this.callbacks.onThemeChange(option.key);
        this.toggleThemeMenu(false);
      });
      menu.appendChild(item);
    });

    document.body.appendChild(menu);
    return menu;
  }

  private toggleThemeMenu(force?: boolean): void {
    const isVisible = this.themeMenu.classList.contains('visible');
    const shouldShow = force !== undefined ? force : !isVisible;

    if (shouldShow) {
      this.themeMenu.classList.add('visible');
    } else {
      this.themeMenu.classList.remove('visible');
    }
  }

  private createResetButton(): void {
    const btn = document.createElement('button');
    btn.className = 'ctrl-btn';
    btn.innerHTML = '⟲';
    btn.title = '重置视角';

    btn.addEventListener('click', () => {
      this.callbacks.onResetCamera();
    });

    this.addTooltip(btn, '重置视角');
    this.container.appendChild(btn);
  }

  private addTooltip(element: HTMLElement, text: string): void {
    element.addEventListener('mouseenter', () => {
      const rect = element.getBoundingClientRect();
      this.tooltip.textContent = text;
      this.tooltip.style.left = `${rect.left - 10}px`;
      this.tooltip.style.top = `${rect.top - 30}px`;
      this.tooltip.style.opacity = '1';
      this.tooltip.style.transform = 'translateX(-100%)';
    });

    element.addEventListener('mouseleave', () => {
      this.tooltip.style.opacity = '0';
    });
  }

  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.themeMenu && this.themeMenu.parentNode) {
      this.themeMenu.parentNode.removeChild(this.themeMenu);
    }
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
  }
}
