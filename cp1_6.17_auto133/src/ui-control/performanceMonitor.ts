import EventBus from '../EventBus';

export class PerformanceMonitor {
  private eventBus: EventBus;
  private container: HTMLDivElement;
  private fpsLabel: HTMLSpanElement;
  private lightCountLabel: HTMLSpanElement;
  private triangleCountLabel: HTMLSpanElement;
  private frameTimes: number[] = [];
  private lastTime: number = performance.now();
  private lastStatsUpdate: number = 0;
  private externalLightCount: number = 0;
  private externalTriangleCount: number = 0;
  private getLightCountCallback: (() => number) | null = null;
  private getTriangleCountCallback: (() => number) | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 200;
      font-family: 'Courier New', 'Monaco', monospace;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 140px;
    `;

    const fpsRow = document.createElement('div');
    fpsRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    const fpsIcon = document.createElement('span');
    fpsIcon.textContent = '⚡';
    fpsIcon.style.fontSize = '12px';
    this.fpsLabel = document.createElement('span');
    this.fpsLabel.style.cssText = `
      font-size: 14px;
      font-weight: 700;
      color: #00FF00;
    `;
    fpsRow.appendChild(fpsIcon);
    fpsRow.appendChild(this.fpsLabel);

    const lightRow = document.createElement('div');
    lightRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    const lightIcon = document.createElement('span');
    lightIcon.textContent = '💡';
    lightIcon.style.fontSize = '12px';
    this.lightCountLabel = document.createElement('span');
    this.lightCountLabel.style.cssText = `
      font-size: 12px;
      color: #333;
    `;
    lightRow.appendChild(lightIcon);
    lightRow.appendChild(this.lightCountLabel);

    const triRow = document.createElement('div');
    triRow.style.cssText = 'display: flex; align-items: center; gap: 6px;';
    const triIcon = document.createElement('span');
    triIcon.textContent = '🔺';
    triIcon.style.fontSize = '12px';
    this.triangleCountLabel = document.createElement('span');
    this.triangleCountLabel.style.cssText = `
      font-size: 12px;
      color: #333;
    `;
    triRow.appendChild(triIcon);
    triRow.appendChild(this.triangleCountLabel);

    this.container.appendChild(fpsRow);
    this.container.appendChild(lightRow);
    this.container.appendChild(triRow);

    document.getElementById('app')?.appendChild(this.container);

    this.eventBus.on('GET_STATS_RESPONSE', (data) => {
      this.externalLightCount = data.lightCount;
      this.externalTriangleCount = data.triangleCount;
    });

    this.updateLabels(60, 0, 0);
  }

  public setLightCountGetter(callback: () => number): void {
    this.getLightCountCallback = callback;
  }

  public setTriangleCountGetter(callback: () => number): void {
    this.getTriangleCountCallback = callback;
  }

  public update(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > 60) this.frameTimes.shift();

    if (now - this.lastStatsUpdate >= 1000) {
      this.lastStatsUpdate = now;
      const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const fps = Math.round(1000 / avgDelta);
      const lightCount = this.getLightCountCallback ? this.getLightCountCallback() : this.externalLightCount;
      const triCount = this.getTriangleCountCallback ? this.getTriangleCountCallback() : this.externalTriangleCount;
      this.updateLabels(fps, lightCount, triCount);
    }
  }

  private updateLabels(fps: number, lights: number, triangles: number): void {
    this.fpsLabel.textContent = `${fps} FPS`;
    if (fps >= 55) {
      this.fpsLabel.style.color = '#00FF00';
    } else if (fps >= 30) {
      this.fpsLabel.style.color = '#FFD700';
    } else {
      this.fpsLabel.style.color = '#FF4444';
    }
    this.lightCountLabel.textContent = `${lights} 灯光`;
    this.triangleCountLabel.textContent = `${triangles.toLocaleString()} 三角面`;
  }

  public dispose(): void {
    this.container.remove();
  }
}

export default PerformanceMonitor;
