import type { Station, Line, Trend, CrowdLevel } from './stationData';
import {
  getStationsByLineIds,
  getCurrentFlow,
  getDensity,
  getHeatColorRgb,
  getCrowdLevel,
  getCrowdLevelText,
  getCrowdLevelColor,
  calculateTrend,
  getTrendArrow,
  getTrendColor,
} from './stationData';

interface MapRendererOptions {
  onStationHover?: (station: Station | null) => void;
  onStationClick?: (station: Station) => void;
}

const STATION_HIT_RADIUS = 14;
const HEAT_RADIUS = 60;
const HEAT_ALPHA = 0.7;
const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const STATION_NODE_RADIUS = 6;
const STATION_HOVER_RADIUS = 9;

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lines: Line[] = [];
  private stations: Station[] = [];
  private selectedLineIds: string[] = [];
  private currentHour: number = 8;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private infoWindow: HTMLDivElement | null = null;
  private hoveredStation: Station | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private needsRedraw = true;
  private onStationHover: ((station: Station | null) => void) | undefined;
  private onStationClick: ((station: Station) => void) | undefined;
  private transform = { scale: 1, offsetX: 0, offsetY: 0 };
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement, options: MapRendererOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }
    this.ctx = ctx;
    this.onStationHover = options.onStationHover;
    this.onStationClick = options.onStationClick;

    this.dpr = window.devicePixelRatio || 1;
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
    this.infoWindow.className = 'station-info-window';
    this.infoWindow.style.cssText = `
      position: absolute;
      display: none;
      width: 240px;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      padding: 16px;
      pointer-events: none;
      z-index: 100;
      transform: translateY(10px);
      opacity: 0;
      transition: transform 0.2s ease-out, opacity 0.2s ease-out;
      font-size: 14px;
      color: #333;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-sizing: border-box;
    `;

    const parent = this.canvas.parentElement;
    if (parent) {
      const pos = getComputedStyle(parent).position;
      if (pos === 'static') {
        parent.style.position = 'relative';
      }
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const station = this.findStationAtPoint(x, y);

    if (station !== this.hoveredStation) {
      this.hoveredStation = station;
      this.needsRedraw = true;

      if (this.onStationHover) {
        this.onStationHover(station);
      }

      if (station) {
        this.showInfoWindow(station, x, y);
      } else {
        this.hideInfoWindow();
      }
    } else if (station) {
      this.updateInfoWindowPosition(x, y);
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const station = this.findStationAtPoint(x, y);
    if (station && this.onStationClick) {
      this.onStationClick(station);
    }
  };

  private findStationAtPoint(x: number, y: number): Station | null {
    for (let i = this.stations.length - 1; i >= 0; i--) {
      const station = this.stations[i];
      const sx = this.transform.offsetX + station.x * this.transform.scale;
      const sy = this.transform.offsetY + station.y * this.transform.scale;
      const dx = x - sx;
      const dy = y - sy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= STATION_HIT_RADIUS * this.transform.scale) {
        return station;
      }
    }
    return null;
  }

  private showInfoWindow(station: Station, x: number, y: number): void {
    if (!this.infoWindow) return;

    const density = getDensity(station, this.currentHour);
    const flow = getCurrentFlow(station, this.currentHour);
    const crowdLevel = getCrowdLevel(density);
    const crowdText = getCrowdLevelText(crowdLevel);
    const crowdColor = getCrowdLevelColor(crowdLevel);
    const trend: Trend = calculateTrend(station, this.currentHour);
    const trendArrow = getTrendArrow(trend);
    const trendColor = getTrendColor(trend);
    const trendText = trend === 'up' ? '上升' : trend === 'down' ? '下降' : '稳定';

    this.infoWindow.innerHTML = `
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 12px; color: #1a1a1a;">${station.name}</div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #666; font-size: 13px;">当前客流量</span>
        <span style="font-weight: 500; color: #1a1a1a;">${flow.toLocaleString()} 人</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #666; font-size: 13px;">拥挤等级</span>
        <span style="font-weight: 500; color: ${crowdColor};">${crowdText}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #666; font-size: 13px;">客流趋势</span>
        <span style="font-weight: 500; color: ${trendColor};">${trendArrow} ${trendText}</span>
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

    const infoWidth = 240;
    const infoHeight = 110;
    const offset = 16;

    let posX = x + offset;
    let posY = y - infoHeight - offset;

    const rect = this.canvas.getBoundingClientRect();
    if (posX + infoWidth > rect.width) {
      posX = x - infoWidth - offset;
    }
    if (posY < 0) {
      posY = y + offset;
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

  private calculateTransform(): void {
    const canvasWidth = this.canvas.width / this.dpr;
    const canvasHeight = this.canvas.height / this.dpr;
    const padding = 60;

    if (this.stations.length === 0) {
      this.transform = { scale: 1, offsetX: 0, offsetY: 0 };
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const station of this.stations) {
      minX = Math.min(minX, station.x);
      maxX = Math.max(maxX, station.x);
      minY = Math.min(minY, station.y);
      maxY = Math.max(maxY, station.y);
    }

    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;

    const scaleX = (canvasWidth - padding * 2) / mapWidth;
    const scaleY = (canvasHeight - padding * 2) / mapHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (canvasWidth - mapWidth * scale) / 2 - minX * scale;
    const offsetY = (canvasHeight - mapHeight * scale) / 2 - minY * scale;

    this.transform = { scale, offsetX, offsetY };
  }

  private render(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

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
    const x = this.transform.offsetX + station.x * this.transform.scale;
    const y = this.transform.offsetY + station.y * this.transform.scale;
    const density = getDensity(station, this.currentHour);
    const radius = HEAT_RADIUS * this.transform.scale;

    const { r, g, b } = getHeatColorRgb(density);
    const alpha = HEAT_ALPHA;

    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawStationNodes(): void {
    for (const station of this.stations) {
      const isHovered = station === this.hoveredStation;
      const x = this.transform.offsetX + station.x * this.transform.scale;
      const y = this.transform.offsetY + station.y * this.transform.scale;
      const density = getDensity(station, this.currentHour);
      const color = getHeatColorRgb(density);
      const radius = (isHovered ? STATION_HOVER_RADIUS : STATION_NODE_RADIUS) * this.transform.scale;

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius + 2 * this.transform.scale, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      if (isHovered) {
        this.ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        this.ctx.lineWidth = 2 * this.transform.scale;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius + 6 * this.transform.scale, 0, Math.PI * 2);
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
    if (!this.offscreenCtx) return;

    const lineStations = this.stations.filter((s) => s.lineId === line.id);
    if (lineStations.length < 2) return;

    const isSelected =
      this.selectedLineIds.length === 0 || this.selectedLineIds.includes(line.id);

    this.offscreenCtx.strokeStyle = isSelected ? 'rgba(148, 163, 184, 0.6)' : 'rgba(148, 163, 184, 0.2)';
    this.offscreenCtx.lineWidth = (isSelected ? 4 : 2) * this.dpr;
    this.offscreenCtx.lineCap = 'round';
    this.offscreenCtx.lineJoin = 'round';

    this.offscreenCtx.beginPath();

    const first = lineStations[0];
    const fx = (this.transform.offsetX + first.x * this.transform.scale) * this.dpr;
    const fy = (this.transform.offsetY + first.y * this.transform.scale) * this.dpr;
    this.offscreenCtx.moveTo(fx, fy);

    for (let i = 1; i < lineStations.length; i++) {
      const station = lineStations[i];
      const sx = (this.transform.offsetX + station.x * this.transform.scale) * this.dpr;
      const sy = (this.transform.offsetY + station.y * this.transform.scale) * this.dpr;
      this.offscreenCtx.lineTo(sx, sy);
    }

    this.offscreenCtx.stroke();
  }

  public updateData(lines: Line[], selectedLineIds: string[], hour: number): void {
    this.lines = lines;
    this.selectedLineIds = selectedLineIds;
    this.currentHour = hour;
    this.stations = getStationsByLineIds(selectedLineIds.length > 0 ? selectedLineIds : lines.map((l) => l.id));

    this.calculateTransform();
    this.renderLinesToOffscreen();
    this.needsRedraw = true;
  }

  public setHour(hour: number): void {
    this.currentHour = hour;
    this.needsRedraw = true;
  }

  public setSelectedLineIds(ids: string[]): void {
    this.selectedLineIds = ids;
    this.stations = getStationsByLineIds(
      ids.length > 0 ? ids : this.lines.map((l) => l.id)
    );
    this.renderLinesToOffscreen();
    this.needsRedraw = true;
  }

  public setOnStationHover(callback: (station: Station | null) => void): void {
    this.onStationHover = callback;
  }

  public setOnStationClick(callback: (station: Station) => void): void {
    this.onStationClick = callback;
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = rect.width * this.dpr;
      this.offscreenCanvas.height = rect.height * this.dpr;
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    this.calculateTransform();
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
