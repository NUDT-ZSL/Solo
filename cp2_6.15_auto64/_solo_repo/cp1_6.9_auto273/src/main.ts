import { Beacon } from './beacon';
import { Connection } from './connection';
import { Nebula } from './nebula';

const MAX_BEACONS = 30;
const MAX_CONNECTIONS = 40;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private beacons: Beacon[] = [];
  private connections: Connection[] = [];
  private nebula: Nebula;

  private selectedBeacon: Beacon | null = null;
  private draggingBeacon: Beacon | null = null;
  private connectingFrom: Beacon | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isShiftDown: boolean = false;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private lastClickTime: number = 0;
  private clickPosition: { x: number; y: number } | null = null;

  private colorPickerContainer: HTMLElement;
  private colorPickerCanvas: HTMLCanvasElement;
  private colorPickerCtx: CanvasRenderingContext2D;
  private hueAngle: number = 0;
  private brightnessValue: number = 90;
  private hueDragging: boolean = false;
  private brightnessDragging: boolean = false;
  private colorPickerSize: number = 120;
  private showColorPicker: boolean = false;

  private lastTime: number = 0;
  private animationId: number = 0;

  private infoBeaconCount: HTMLElement;
  private infoConnectionCount: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.colorPickerContainer = document.getElementById('colorPicker')!;
    this.infoBeaconCount = document.getElementById('beaconCount')!;
    this.infoConnectionCount = document.getElementById('connectionCount')!;

    this.colorPickerCanvas = document.createElement('canvas');
    this.colorPickerCanvas.width = this.colorPickerSize;
    this.colorPickerCanvas.height = this.colorPickerSize;
    this.colorPickerCtx = this.colorPickerCanvas.getContext('2d')!;
    this.colorPickerContainer.appendChild(this.colorPickerCanvas);

    this.resize();
    this.nebula = new Nebula(this.width, this.height);

    this.bindEvents();
    this.drawColorPicker();
    this.start();
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    if (this.nebula) {
      this.nebula.resize(this.width, this.height);
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.isShiftDown = true;
      if (e.key === 'Escape') {
        this.deselectAll();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.isShiftDown = false;
    });

    this.colorPickerCanvas.addEventListener('mousedown', (e) => this.onColorPickerMouseDown(e));
    this.colorPickerCanvas.addEventListener('mousemove', (e) => this.onColorPickerMouseMove(e));
    window.addEventListener('mouseup', () => {
      this.hueDragging = false;
      this.brightnessDragging = false;
    });
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    const time = performance.now();

    this.clickPosition = pos;

    const beacon = this.findBeaconAt(pos.x, pos.y, time);

    if (beacon) {
      if (this.isShiftDown || e.shiftKey) {
        this.connectingFrom = beacon;
      } else {
        this.draggingBeacon = beacon;
        this.dragOffsetX = pos.x - beacon.x;
        this.dragOffsetY = pos.y - beacon.y;
        this.selectBeacon(beacon);
      }
    } else {
      this.deselectBeacon();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    const time = performance.now();

    if (this.draggingBeacon) {
      this.draggingBeacon.x = Math.max(20, Math.min(this.width - 20, pos.x - this.dragOffsetX));
      this.draggingBeacon.y = Math.max(20, Math.min(this.height - 20, pos.y - this.dragOffsetY));
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    const time = performance.now();

    if (this.connectingFrom) {
      const target = this.findBeaconAt(pos.x, pos.y, time);
      if (target && target !== this.connectingFrom) {
        this.createConnection(this.connectingFrom, target);
      }
      this.connectingFrom = null;
    }

    if (this.draggingBeacon && this.clickPosition) {
      const dx = pos.x - this.clickPosition.x;
      const dy = pos.y - this.clickPosition.y;
      if (dx * dx + dy * dy < 9) {
        const timeSinceLastClick = time - this.lastClickTime;
        if (timeSinceLastClick < 300) {
          // handled by dblclick
        }
        this.lastClickTime = time;
      }
    }

    this.draggingBeacon = null;
    this.clickPosition = null;
  }

  private onDoubleClick(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    const time = performance.now();
    const existing = this.findBeaconAt(pos.x, pos.y, time);
    if (!existing) {
      this.createBeacon(pos.x, pos.y);
    }
  }

  private findBeaconAt(x: number, y: number, time: number): Beacon | null {
    for (let i = this.beacons.length - 1; i >= 0; i--) {
      if (this.beacons[i].contains(x, y, time)) {
        return this.beacons[i];
      }
    }
    return null;
  }

  private createBeacon(x: number, y: number): void {
    if (this.beacons.length >= MAX_BEACONS) return;
    const beacon = new Beacon(x, y);
    this.beacons.push(beacon);
    this.updateInfo();
  }

  private createConnection(a: Beacon, b: Beacon): void {
    if (this.connections.length >= MAX_CONNECTIONS) return;
    const exists = this.connections.some(c =>
      (c.beaconA === a && c.beaconB === b) ||
      (c.beaconA === b && c.beaconB === a)
    );
    if (exists) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx * dx + dy * dy > 250 * 250) return;
    const conn = new Connection(a, b);
    this.connections.push(conn);
    this.updateInfo();
  }

  private selectBeacon(beacon: Beacon): void {
    this.deselectBeacon();
    beacon.selected = true;
    this.selectedBeacon = beacon;
    this.hueAngle = beacon.hue;
    this.brightnessValue = beacon.brightness;
    this.showColorPicker = true;
    this.colorPickerContainer.style.display = 'block';
    this.drawColorPicker();
  }

  private deselectBeacon(): void {
    if (this.selectedBeacon) {
      this.selectedBeacon.selected = false;
      this.selectedBeacon = null;
    }
    this.showColorPicker = false;
    this.colorPickerContainer.style.display = 'none';
  }

  private deselectAll(): void {
    this.deselectBeacon();
    this.connectingFrom = null;
    this.draggingBeacon = null;
  }

  private onColorPickerMouseDown(e: MouseEvent): void {
    if (!this.selectedBeacon) return;
    const pos = this.getColorPickerPos(e);
    const center = this.colorPickerSize / 2;
    const dx = pos.x - center;
    const dy = pos.y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const outerRadius = center - 4;
    const innerRadius = 28;

    if (dist > innerRadius && dist < outerRadius + 10) {
      this.hueDragging = true;
      this.updateHueFromPos(pos);
    } else if (dist <= innerRadius + 6) {
      this.brightnessDragging = true;
      this.updateBrightnessFromPos(pos);
    }
  }

  private onColorPickerMouseMove(e: MouseEvent): void {
    const pos = this.getColorPickerPos(e);
    if (this.hueDragging) {
      this.updateHueFromPos(pos);
    } else if (this.brightnessDragging) {
      this.updateBrightnessFromPos(pos);
    }
  }

  private getColorPickerPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.colorPickerCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private updateHueFromPos(pos: { x: number; y: number }): void {
    const center = this.colorPickerSize / 2;
    const dx = pos.x - center;
    const dy = pos.y - center;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    this.hueAngle = angle;
    if (this.selectedBeacon) {
      this.selectedBeacon.hue = this.hueAngle;
    }
    this.drawColorPicker();
  }

  private updateBrightnessFromPos(pos: { x: number; y: number }): void {
    const center = this.colorPickerSize / 2;
    const dx = pos.x - center;
    const dy = pos.y - center;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const innerRadius = 28;
    const brightness = Math.max(10, Math.min(100, (dist / innerRadius) * 100));
    this.brightnessValue = brightness;
    if (this.selectedBeacon) {
      this.selectedBeacon.brightness = this.brightnessValue;
    }
    this.drawColorPicker();
  }

  private drawColorPicker(): void {
    const ctx = this.colorPickerCtx;
    const size = this.colorPickerSize;
    const center = size / 2;
    const outerRadius = center - 4;
    const innerRadius = 28;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 0.5) * Math.PI / 180;
      const endAngle = (angle + 1.5) * Math.PI / 180;
      const gradient = ctx.createRadialGradient(center, center, innerRadius, center, center, outerRadius);
      gradient.addColorStop(0, `hsl(${angle}, 80%, 60%)`);
      gradient.addColorStop(1, `hsl(${angle}, 80%, 50%)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, outerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    const hueRad = this.hueAngle * Math.PI / 180;
    const hueX = center + Math.cos(hueRad) * (innerRadius + (outerRadius - innerRadius) / 2);
    const hueY = center + Math.sin(hueRad) * (innerRadius + (outerRadius - innerRadius) / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(hueX, hueY, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `hsl(${this.hueAngle}, 80%, 55%)`;
    ctx.fill();
    ctx.shadowBlur = 0;

    const brightnessRadius = (this.brightnessValue / 100) * innerRadius;
    const currentColor = `hsl(${this.hueAngle}, 80%, ${this.brightnessValue}%)`;
    const bgGradient = ctx.createRadialGradient(center, center, 0, center, center, innerRadius);
    bgGradient.addColorStop(0, `hsl(${this.hueAngle}, 80%, 15%)`);
    bgGradient.addColorStop(1, `hsl(${this.hueAngle}, 80%, 45%)`);
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(center, center, innerRadius - 1, 0, Math.PI * 2);
    ctx.fill();

    const ringAngle = -Math.PI / 2;
    const ringEnd = ringAngle + (this.brightnessValue / 100) * Math.PI * 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(center, center, innerRadius - 6, ringAngle, ringEnd);
    ctx.stroke();

    const brightAngle = ringEnd;
    const brightX = center + Math.cos(brightAngle) * (innerRadius - 6);
    const brightY = center + Math.sin(brightAngle) * (innerRadius - 6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(brightX, brightY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = currentColor;
    ctx.beginPath();
    ctx.arc(center, center, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private updateInfo(): void {
    this.infoBeaconCount.textContent = this.beacons.length.toString();
    this.infoConnectionCount.textContent = this.connections.filter(c => c.isConnected() || !c.isBurstComplete()).length.toString();
  }

  private start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    const now = performance.now();
    const deltaTime = Math.min(50, now - this.lastTime);
    this.lastTime = now;

    this.update(deltaTime, now);
    this.render(now);

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(deltaTime: number, time: number): void {
    this.nebula.update(deltaTime, time);

    for (const beacon of this.beacons) {
      beacon.update(time);
    }

    for (const conn of this.connections) {
      conn.update(deltaTime, time);
    }

    const beforeCount = this.connections.length;
    this.connections = this.connections.filter(c => !c.isBurstComplete());
    if (this.connections.length !== beforeCount) {
      this.updateInfo();
    }
  }

  private render(time: number): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.nebula.render(this.ctx);

    for (const conn of this.connections) {
      conn.render(this.ctx, time);
    }

    if (this.connectingFrom) {
      this.renderPreviewLine(time);
    }

    for (const beacon of this.beacons) {
      beacon.render(this.ctx, time);
    }
  }

  private renderPreviewLine(time: number): void {
    if (!this.connectingFrom) return;
    const ax = this.connectingFrom.x;
    const ay = this.connectingFrom.y;
    const bx = this.mouseX;
    const by = this.mouseY;
    const dx = bx - ax;
    const dy = by - ay;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const tooFar = distance > 250;

    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    this.ctx.setLineDash([6, 6]);
    this.ctx.lineWidth = 2;
    const rgb = this.connectingFrom.getColorRgb();
    this.ctx.strokeStyle = tooFar
      ? `rgba(255, 80, 80, 0.6)`
      : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
    this.ctx.shadowColor = tooFar
      ? `rgba(255, 80, 80, 0.8)`
      : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(ax, ay);
    this.ctx.lineTo(bx, by);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
