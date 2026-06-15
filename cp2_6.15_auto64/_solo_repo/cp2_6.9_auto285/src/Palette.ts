export class Palette {
  private container: HTMLElement;
  private buttons: HTMLButtonElement[] = [];
  private currentColor: string;
  private onColorChange: (color: string) => void;

  private presetColors: string[] = [
    '#FF3366',
    '#00FF66',
    '#0066FF',
    '#FFCC00',
    '#FF00FF',
    '#00FFFF'
  ];

  constructor(containerId: string, onColorChange: (color: string) => void) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Palette container #${containerId} not found`);
    this.container = el;
    this.onColorChange = onColorChange;
    this.currentColor = this.presetColors[0];
    this.build();
  }

  private build(): void {
    this.presetColors.forEach((color, index) => {
      const btn = document.createElement('button');
      btn.className = 'color-btn';
      btn.style.background = color;
      btn.dataset.color = color;
      btn.title = color;
      btn.addEventListener('click', () => this.selectColor(btn, color));
      this.container.appendChild(btn);
      this.buttons.push(btn);
      if (index === 0) {
        btn.classList.add('active');
      }
    });

    const rainbowBtn = document.createElement('button');
    rainbowBtn.className = 'color-btn rainbow';
    rainbowBtn.title = '自定义颜色';
    rainbowBtn.addEventListener('click', () => this.openColorPicker(rainbowBtn));
    this.container.appendChild(rainbowBtn);
    this.buttons.push(rainbowBtn);
  }

  private selectColor(btn: HTMLButtonElement, color: string): void {
    this.buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.currentColor = color;
    this.onColorChange(color);
  }

  private openColorPicker(rainbowBtn: HTMLButtonElement): void {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = this.currentColor;
    input.addEventListener('input', (e) => {
      const color = (e.target as HTMLInputElement).value;
      this.buttons.forEach(b => b.classList.remove('active'));
      rainbowBtn.classList.add('active');
      this.currentColor = color;
      this.onColorChange(color);
    });
    input.click();
  }

  public getColor(): string {
    return this.currentColor;
  }
}
