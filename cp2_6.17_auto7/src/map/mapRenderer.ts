import type { Station, Line, Point } from './stationData';
import { getHeatColor, getCrowdLevelText, getAllStations } from './stationData';

interface MapRendererOptions {
  onStationHover?: (station: Station | null) => void;
  onStationClick?: (station: Station) => void;
}

const STATION_HIT_RADIUS = 12;
const HEAT_RADIUS = 60;
const HEAT_ALPHA = 0.7;
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lines: Line[] = [];
  private stations: Station[] = [];
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private infoWindow: HTMLDivElement | null = null;
  private hoveredStation: Station | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private needsRedraw = true;
  private onStationHover: ((station: Station | null) => void) | undefined;
  private onStationClick: ((station: Station) => void) | undefined;

  constructor(canvas: HTMLCanvasElement, options: MapRendererOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }
    this.ctx = ctx;
    this.onStationHover = options.onStationHover;
    this.onStationClick = options.onStationClick;

    this.createOffscreenCanvas();
    this.createInfoWindow();
    this.bindEvents();
    this.startAnimationLoop();
  }

  private createOffscreenCanvas(): void {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    const ctx = this.offscreenCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get offscreen 2d context');
    }
    this.offscreenCtx = ctx;
  }

  private createInfoWindow(): void {
    this.infoWindow = document.createElement('div');
    this.infoWindow.style.position = 'absolute';
    this.infoWindow.style.display = 'none';
    this.infoWindow.style.width = '240px';
    this.infoWindow.style.backgroundColor = '#ffffff';
    this.infoWindow.style.borderRadius = '12px';
    this.infoWindow.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    this.infoWindow.style.padding = '16px';
    this.infoWindow.style.pointerEvents = 'none';
    this.infoWindow.style.zIndex = '100';
    this.infoWindow.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
    this.infoWindow.style.transform = 'translateY(10px)';
    this.infoWindow.style.opacity = '0';
    this.infoWindow.style.fontSize = '14px';
    this.infoWindow.style.color = '#333';

    const parent = this.canvas.parentElement;
    if (parent) {
      parent.style.position = parent.style.position || 'relative';
      parent.appendChild(this.infoWindow);
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('click', this.handleClick);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const station = this.findStationAtPoint(x, y);

    if (station !== this.hoveredStation) {
      this.hoveredStation = station;
      this.needsRedraw = true;

      if (this.onStationHover) {
        this.onStationHover(station);
      }

      if (station) {
        this.showInfoWindow(station, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        this.hideInfoWindow();
      }
    } else if (station) {
      this.updateInfoWindowPosition(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  private handleMouseLeave = (): void => {
    if (this.hoveredStation) {
      this.hoveredStation = null;
      this.needsRedraw = true;

      if (this.onStationHover) {
        this.onStationHover(null);
      }

      this.hideInfoWindow();
    }
  };

  private handleClick = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const station = this.findStationAtPoint(x, y);
    if (station && this.onStationClick) {
      this.onStationClick(station);
    }
  };

  private findStationAtPoint(x: number, y: number): Station | null {
    for (let i = this.stations.length - 1; i >= 0; i--) {
      const station = this.stations[i];
      const dx = x - station.position.x;
      const dy = y - station.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= STATION_HIT_RADIUS) {
        return station;
      }
    }
    return null;
  }

  private showInfoWindow(station: Station, x: number, y: number): void {
    if (!this.infoWindow) return;

    const trendArrow = this.getTrendArrow(station.trend);
    const trendColor = this.getTrendColor(station.trend);

    this.infoWindow.innerHTML = `
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px; color: #1a1a1a;">${station.name}</div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #666;">客流量</span>
        <span style="font-weight: 500;">${station.passengerFlow.toLocaleString()} 人</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #666;">拥挤等级</span>
        <span style="font-weight: 500; color: ${this.getCrowdLevelColor(station.crowdLevel)};">${getCrowdLevelText(station.crowdLevel)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #666;">趋势</span>
        <span style="font-weight: 500; color: ${trendColor};">${trendArrow} ${station.trend === 'up' ? '上升' : station.trend === 'down' ? '下降' : '稳定'}</span>
      </div>
    `;

    this.infoWindow.style.display = 'block';
    requestAnimationFrame(() => {
      if (this.infoWindow) {
        this.infoWindow.style.transform = 'translateY(0)';
        this.infoWindow.style.opacity = '1';
      }
    });

    this.updateInfoWindowPosition(x, y);
  }

  private updateInfoWindowPosition(x: number, y: number): void {
    if (!this.infoWindow) return;

    const infoWidth = 240 + 32;
    const infoHeight = 120;
    const offsetX = 16;
    const offsetY = 16;

    let posX = x + offsetX;
    let posY = y - infoHeight - offsetY;

    const rect = this.canvas.getBoundingClientRect();
    if (posX + infoWidth > rect.width) {
      posX = x - infoWidth - offsetX;
    }
    if (posY < 0) {
      posY = y + offsetY;
    }

    this.infoWindow.style.left = `${posX}px`;
    this.infoWindow.style.top = `${posY}px`;
  }

  private hideInfoWindow(): void {
    if (!this.infoWindow) return;

    this.infoWindow.style.transform = 'translateY(10px)';
    this.infoWindow.style.opacity = '0';

    setTimeout(() => {
      if (this.infoWindow && this.infoWindow.style.opacity === '0') {
        this.infoWindow.style.display = 'none';
      }
    }, 200);
  }

  private getTrendArrow(trend: string): string {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  }

  private getTrendColor(trend: string): string {
    switch (trend) {
      case 'up': return '#ef4444';
      case 'down': return '#22c55e';
      default: return '#6b7280';
    }
  }

  private getCrowdLevelColor(level: string): string {
    switch (level) {
      case 'loose': return '#22c55e';
      case 'normal': return '#eab308';
      case 'crowded': return '#f97316';
      case 'veryCrowded': return '#ef4444';
      default: return '#6b7280';
    }
  }

  private startAnimationLoop(): void {
    const loop = (timestamp: number) => {
      this.animationFrameId = requestAnimationFrame(loop);

      const delta = timestamp - this.lastFrameTime;
      if (delta >= FRAME_INTERVAL) {
        if (this.needsRedraw) {
          this.render();
          this.needsRedraw = false;
        }
        this.lastFrameTime = timestamp - (delta % FRAME_INTERVAL);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.offscreenCanvas && this.offscreenCtx) {
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }

    this.drawHeatMap();
    this.drawStationNodes();
  }

  private drawHeatMap(): void {
    for (const station of this.stations) {
      this.drawStationHeat(station);
    }
  }

  private drawStationHeat(station: Station): void {
    const { x, y } = station.position;
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, HEAT_RADIUS);

    const baseColor = getHeatColor(station.density);
    const rgbMatch = baseColor.match(/\d+/g);
    if (!rgbMatch) return;

    const [r, g, b] = rgbMatch;
    const alpha = HEAT_ALPHA;

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, HEAT_RADIUS, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawStationNodes(): void {
    for (const station of this.stations) {
      const isHovered = station === this.hoveredStation;
      const radius = isHovered ? 8 : 6;
      const { x, y } = station.position;

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = getHeatColor(station.density);
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      if (isHovered) {
        this.ctx.strokeStyle = getHeatColor(station.density);
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }
  }

  private renderLinesToOffscreen(): void {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;

    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

    for (const line of this.lines) {
      this.drawLineToOffscreen(line);
    }
  }

  private drawLineToOffscreen(line: Line): void {
    if (!this.offscreenCtx || line.stations.length < 2) return;

    this.offscreenCtx.strokeStyle = '#d1d5db';
    this.offscreenCtx.lineWidth = 4;
    this.offscreenCtx.lineCap = 'round';
    this.offscreenCtx.lineJoin = 'round';

    this.offscreenCtx.beginPath();
    this.offscreenCtx.moveTo(line.stations[0].position.x, line.stations[0].position.y);

    for (let i = 1; i < line.stations.length; i++) {
      this.offscreenCtx.lineTo(line.stations[i].position.x, line.stations[i].position.y);
    }

    this.offscreenCtx.stroke();
  }

  public updateStations(lines: Line[]): void {
    this.lines = lines;
    this.stations = getAllStations(lines);
    this.renderLinesToOffscreen();
    this.needsRedraw = true;
  }

  public setOnStationHover(callback: (station: Station | null) => void): void {
    this.onStationHover = callback;
  }

  public setOnStationClick(callback: (station: Station) => void): void {
    this.onStationClick = callback;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }

    this.renderLinesToOffscreen();
    this.needsRedraw = true;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('click', this.handleClick);

    if (this.infoWindow && this.infoWindow.parentElement) {
      this.infoWindow.parentElement.removeChild(this.infoWindow);
      this.infoWindow = null;
    }

    this.offscreenCanvas = null;
    this.offscreenCtx = null;
  }
}
