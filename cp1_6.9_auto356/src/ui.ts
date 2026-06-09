type PaletteChangeCallback = (index: number) => void;
type ClearCallback = () => void;

export class UIController {
  container: HTMLElement;
  panel: HTMLElement;
  colorButtons: HTMLElement[] = [];
  clearButton: HTMLElement;
  palettes: string[][];
  activePalette: number = 0;
  private panelWidth: number = 0;
  private currentOffset: number = 0;
  private targetOffset: number = 0;
  private onPaletteChange: PaletteChangeCallback;
  private onClear: ClearCallback;

  constructor(
    palettes: string[][],
    onPaletteChange: PaletteChangeCallback,
    onClear: ClearCallback
  ) {
    this.palettes = palettes;
    this.onPaletteChange = onPaletteChange;
    this.onClear = onClear;

    this.container = document.getElementById('app')!;

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      top: 24px;
      left: 24px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 20px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: transform 0.3s ease-out;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      user-select: none;
    `;

    const colorRow = document.createElement('div');
    colorRow.style.cssText = `
      display: flex;
      gap: 12px;
      align-items: center;
    `;

    for (let i = 0; i < palettes.length; i++) {
      const btn = document.createElement('div');
      const color = palettes[i][0];
      btn.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: ${color};
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
      `;
      btn.dataset.palette = String(i);

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.15)';
      });
      btn.addEventListener('mouseleave', () => {
        if (i !== this.activePalette) {
          btn.style.transform = 'scale(1)';
        }
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActivePalette(i);
      });

      this.colorButtons.push(btn);
      colorRow.appendChild(btn);
    }

    this.clearButton = document.createElement('div');
    this.clearButton.textContent = '拂尘';
    this.clearButton.style.cssText = `
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 2px;
      font-weight: 500;
    `;

    this.clearButton.addEventListener('mouseenter', () => {
      this.clearButton.style.background = 'rgba(255, 255, 255, 0.15)';
      this.clearButton.style.transform = 'scale(1.05)';
      this.clearButton.style.color = 'rgba(255, 255, 255, 0.95)';
    });
    this.clearButton.addEventListener('mouseleave', () => {
      this.clearButton.style.background = 'transparent';
      this.clearButton.style.transform = 'scale(1)';
      this.clearButton.style.color = 'rgba(255, 255, 255, 0.7)';
    });
    this.clearButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onClear();
    });

    this.panel.appendChild(colorRow);
    this.panel.appendChild(this.clearButton);
    this.container.appendChild(this.panel);

    requestAnimationFrame(() => {
      this.panelWidth = this.panel.offsetWidth;
    });

    this.setActivePalette(0);
  }

  setActivePalette(index: number): void {
    this.activePalette = index;
    for (let i = 0; i < this.colorButtons.length; i++) {
      const btn = this.colorButtons[i];
      const color = this.palettes[i][0];
      if (i === index) {
        btn.style.boxShadow = `0 0 12px ${color}, 0 0 24px ${color}40`;
        btn.style.border = `2px solid rgba(255,255,255,0.6)`;
        btn.style.transform = 'scale(1.1)';
      } else {
        btn.style.boxShadow = 'none';
        btn.style.border = '2px solid transparent';
        btn.style.transform = 'scale(1)';
      }
    }
    this.onPaletteChange(index);
  }

  update(mouseX: number): void {
    const panelLeft = 24;
    const panelRight = panelLeft + this.panelWidth;

    const distanceToLeft = Math.abs(mouseX - panelLeft);
    const distanceToRight = Math.abs(mouseX - panelRight);
    const minDistance = Math.min(distanceToLeft, distanceToRight);

    if (minDistance < 20) {
      this.targetOffset = this.panelWidth - 10;
    } else {
      this.targetOffset = 0;
    }

    if (mouseX < this.panelWidth + 24 && mouseX > 0) {
      if (mouseX < panelLeft + 20) {
        this.targetOffset = this.panelWidth - 10;
      }
    }

    this.currentOffset += (this.targetOffset - this.currentOffset) * 0.1;
    this.panel.style.transform = `translateX(-${this.currentOffset}px)`;
  }
}
