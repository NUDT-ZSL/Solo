export interface UIPanelData {
  x: number;
  y: number;
  speed: number;
  density: number;
}

export class UIPanel {
  private container: HTMLDivElement;
  private coordXEl: HTMLSpanElement;
  private coordYEl: HTMLSpanElement;
  private speedEl: HTMLSpanElement;
  private densityBarEl: HTMLDivElement;
  private densityFillEl: HTMLDivElement;
  private densityValueEl: HTMLSpanElement;

  constructor() {
    this.container = document.createElement('div');
    this.applyStyles();

    const title = document.createElement('div');
    title.textContent = 'NebulaDrift';
    title.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #facc15; letter-spacing: 1px; text-shadow: 0 0 10px rgba(250, 204, 21, 0.5);';

    const coordsGroup = document.createElement('div');
    coordsGroup.style.cssText = 'margin-bottom: 14px;';
    const coordsLabel = document.createElement('div');
    coordsLabel.textContent = 'COORDINATES';
    coordsLabel.style.cssText = 'font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 6px; letter-spacing: 1.5px;';
    const coordsRow = document.createElement('div');
    coordsRow.style.cssText = 'display: flex; gap: 16px; font-family: "Courier New", monospace;';
    const xLabel = document.createElement('span');
    xLabel.textContent = 'X:';
    xLabel.style.cssText = 'color: rgba(255,255,255,0.6);';
    this.coordXEl = document.createElement('span');
    this.coordXEl.style.cssText = 'color: #fff; min-width: 40px; display: inline-block; transition: color 0.2s ease;';
    const yLabel = document.createElement('span');
    yLabel.textContent = 'Y:';
    yLabel.style.cssText = 'color: rgba(255,255,255,0.6);';
    this.coordYEl = document.createElement('span');
    this.coordYEl.style.cssText = 'color: #fff; min-width: 40px; display: inline-block; transition: color 0.2s ease;';
    coordsRow.appendChild(xLabel);
    coordsRow.appendChild(this.coordXEl);
    coordsRow.appendChild(yLabel);
    coordsRow.appendChild(this.coordYEl);
    coordsGroup.appendChild(coordsLabel);
    coordsGroup.appendChild(coordsRow);

    const speedGroup = document.createElement('div');
    speedGroup.style.cssText = 'margin-bottom: 14px;';
    const speedLabel = document.createElement('div');
    speedLabel.textContent = 'SPEED';
    speedLabel.style.cssText = 'font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 6px; letter-spacing: 1.5px;';
    const speedRow = document.createElement('div');
    speedRow.style.cssText = 'display: flex; align-items: baseline; gap: 6px;';
    this.speedEl = document.createElement('span');
    this.speedEl.style.cssText = 'color: #f97316; font-size: 20px; font-weight: 700; font-family: "Courier New", monospace; text-shadow: 0 0 8px rgba(249, 115, 22, 0.6); transition: all 0.2s ease;';
    const speedUnit = document.createElement('span');
    speedUnit.textContent = '/ 100';
    speedUnit.style.cssText = 'color: rgba(255,255,255,0.4); font-size: 12px;';
    speedRow.appendChild(this.speedEl);
    speedRow.appendChild(speedUnit);
    speedGroup.appendChild(speedLabel);
    speedGroup.appendChild(speedRow);

    const densityGroup = document.createElement('div');
    const densityLabel = document.createElement('div');
    densityLabel.textContent = 'NEBULA DENSITY';
    densityLabel.style.cssText = 'font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 6px; letter-spacing: 1.5px;';
    this.densityBarEl = document.createElement('div');
    this.densityBarEl.style.cssText = 'width: 100%; height: 10px; border-radius: 5px; background: rgba(255,255,255,0.05); overflow: hidden; position: relative;';
    this.densityFillEl = document.createElement('div');
    this.densityFillEl.style.cssText = 'height: 100%; width: 0%; border-radius: 5px; transition: width 0.2s ease, background 0.3s ease, box-shadow 0.3s ease;';
    this.densityValueEl = document.createElement('span');
    this.densityValueEl.style.cssText = 'position: absolute; right: 0; top: -16px; font-size: 11px; color: rgba(255,255,255,0.7); font-family: "Courier New", monospace; transition: color 0.2s ease;';
    this.densityBarEl.appendChild(this.densityFillEl);
    this.densityBarEl.appendChild(this.densityValueEl);
    densityGroup.appendChild(densityLabel);
    densityGroup.appendChild(this.densityBarEl);

    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: rgba(255,255,255,0.4); line-height: 1.8;';
    hint.innerHTML = '<span style="color: #facc15;">W</span> Accelerate &nbsp; <span style="color: #facc15;">S</span> Decelerate<br><span style="color: #facc15;">A</span> Turn Left &nbsp; <span style="color: #facc15;">D</span> Turn Right';

    this.container.appendChild(title);
    this.container.appendChild(coordsGroup);
    this.container.appendChild(speedGroup);
    this.container.appendChild(densityGroup);
    this.container.appendChild(hint);

    document.body.appendChild(this.container);
    this.setupResize();
  }

  private applyStyles(): void {
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 260px;
      background: rgba(10, 10, 30, 0.8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      color: #ffffff;
      font-size: 14px;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(112, 26, 117, 0.1);
      transition: all 0.2s ease;
      user-select: none;
    `;

    this.container.addEventListener('mouseenter', () => {
      this.container.style.background = 'rgba(10, 10, 30, 0.9)';
      this.container.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 60px rgba(112, 26, 117, 0.2)';
      this.container.style.transform = 'scale(1.01)';
      this.container.style.borderColor = 'rgba(250, 204, 21, 0.3)';
    });

    this.container.addEventListener('mouseleave', () => {
      this.container.style.background = 'rgba(10, 10, 30, 0.8)';
      this.container.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(112, 26, 117, 0.1)';
      this.container.style.transform = 'scale(1)';
      this.container.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    });
  }

  private setupResize(): void {
    const handleResize = () => {
      this.container.style.top = '20px';
      this.container.style.right = '20px';
    };
    window.addEventListener('resize', handleResize);
  }

  private getDensityGradient(density: number): string {
    const d = Math.max(0, Math.min(1, density));
    if (d < 0.2) {
      return 'linear-gradient(90deg, rgba(10,10,46,0.2), rgba(30,10,80,0.4), rgba(59,7,100,0.6))';
    } else if (d < 0.5) {
      return 'linear-gradient(90deg, rgba(30,10,80,0.3), rgba(59,7,100,0.6), rgba(88,28,135,0.8))';
    } else if (d < 0.8) {
      return 'linear-gradient(90deg, rgba(59,7,100,0.4), rgba(88,28,135,0.7), rgba(112,26,117,0.9))';
    } else {
      return 'linear-gradient(90deg, rgba(88,28,135,0.5), rgba(112,26,117,0.8), rgba(147,51,234,1))';
    }
  }

  private getDensityGlow(density: number): string {
    const d = Math.max(0, Math.min(1, density));
    const intensity = 0.3 + d * 0.7;
    if (d < 0.5) {
      return `0 0 ${8 + d * 8}px rgba(88, 28, 135, ${intensity})`;
    } else {
      return `0 0 ${12 + d * 16}px rgba(147, 51, 234, ${intensity})`;
    }
  }

  public update(data: UIPanelData): void {
    this.coordXEl.textContent = Math.round(data.x).toString();
    this.coordYEl.textContent = Math.round(data.y).toString();
    this.speedEl.textContent = data.speed.toString();

    if (data.speed > 50) {
      this.speedEl.style.color = '#facc15';
      this.speedEl.style.textShadow = '0 0 12px rgba(250, 204, 21, 0.8)';
    } else if (data.speed > 20) {
      this.speedEl.style.color = '#f97316';
      this.speedEl.style.textShadow = '0 0 8px rgba(249, 115, 22, 0.6)';
    } else {
      this.speedEl.style.color = '#9ca3af';
      this.speedEl.style.textShadow = 'none';
    }

    const densityPercent = Math.round(data.density * 100);
    this.densityFillEl.style.width = `${densityPercent}%`;
    this.densityFillEl.style.background = this.getDensityGradient(data.density);
    this.densityFillEl.style.boxShadow = this.getDensityGlow(data.density);
    this.densityValueEl.textContent = `${densityPercent}%`;

    if (data.density > 0.7) {
      this.densityValueEl.style.color = '#a855f7';
    } else if (data.density > 0.4) {
      this.densityValueEl.style.color = '#c084fc';
    } else {
      this.densityValueEl.style.color = 'rgba(255,255,255,0.7)';
    }
  }
}
