import type { BubbleData } from './BubbleSystem';

export class InfoCard {
  private container: HTMLDivElement;
  private card: HTMLDivElement | null = null;
  private visible: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'info-card-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
    document.body.appendChild(this.container);
  }

  show(screenX: number, screenY: number, data: BubbleData): void {
    this.hide();

    this.card = document.createElement('div');
    this.card.style.cssText = `
      position: absolute;
      left: ${screenX}px;
      top: ${screenY}px;
      transform: translate(-50%, -120%);
      min-width: 220px;
      padding: 20px 24px;
      background: rgba(30, 10, 5, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 120, 40, 0.25);
      border-radius: 16px;
      color: #f0d0b0;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 80, 20, 0.15);
      pointer-events: auto;
      animation: infoCardIn 0.3s ease-out;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      color: #ffaa60;
      margin-bottom: 12px;
      letter-spacing: 1px;
    `;
    title.textContent = '🌋 气泡数据';
    this.card.appendChild(title);

    const rowStyle = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    `;
    const labelStyle = `
      color: #c09070;
      font-size: 13px;
    `;
    const valueStyle = `
      color: #ffcc80;
      font-weight: 600;
      font-size: 14px;
    `;

    const rows = [
      { label: '温度', value: `${data.temperature.toFixed(0)} °C` },
      { label: '压力', value: `${data.pressure.toFixed(2)} MPa` },
      { label: '破裂强度', value: `${data.burstStrength.toFixed(2)} kJ` },
    ];

    for (const row of rows) {
      const div = document.createElement('div');
      div.style.cssText = rowStyle;

      const label = document.createElement('span');
      label.style.cssText = labelStyle;
      label.textContent = row.label;

      const value = document.createElement('span');
      value.style.cssText = valueStyle;
      value.textContent = row.value;

      div.appendChild(label);
      div.appendChild(value);
      this.card.appendChild(div);
    }

    const style = document.createElement('style');
    style.textContent = `
      @keyframes infoCardIn {
        from { opacity: 0; transform: translate(-50%, -100%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -120%) scale(1); }
      }
    `;
    this.card.appendChild(style);

    this.container.appendChild(this.card);
    this.visible = true;

    const maxX = window.innerWidth - 240;
    const maxY = window.innerHeight - 200;
    const clampedX = Math.max(120, Math.min(screenX, maxX));
    const clampedY = Math.max(160, screenY);
    this.card.style.left = `${clampedX}px`;
    this.card.style.top = `${clampedY}px`;
  }

  hide(): void {
    if (this.card) {
      this.card.remove();
      this.card = null;
    }
    this.visible = false;
  }

  dispose(): void {
    this.hide();
    this.container.remove();
  }
}
