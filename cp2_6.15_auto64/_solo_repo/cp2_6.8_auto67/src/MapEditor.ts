import { TimeSimulator, SegmentRenderData, StationRenderData } from './TimeSimulator';

export interface Station {
  id: string;
  x: number;
  y: number;
  name: string;
  connectedLineIds: string[];
}

export interface LineSegment {
  id: string;
  lineId: string;
  stationAId: string;
  stationBId: string;
}

export interface MetroLine {
  id: string;
  name: string;
  color: string;
  passengerVolume: number;
  segmentIds: string[];
}

export type ToolMode = 'select' | 'addStation' | 'connect';

export const LINE_COLORS = [
  '#E53935',
  '#1E88E5',
  '#43A047',
  '#FB8C00',
  '#8E24AA'
];

const STATION_RADIUS = 8;
const DEFAULT_STATION_COLOR = '#6B7280';
const GLOW_COLOR = 'rgba(255, 152, 0, 0.4)';

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

export class MapEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timeSimulator: TimeSimulator;

  private stations: Map<string, Station> = new Map();
  private segments: Map<string, LineSegment> = new Map();
  private lines: Map<string, MetroLine> = new Map();

  private currentTool: ToolMode = 'select';
  private selectedStationId: string | null = null;
  private selectedSegmentId: string | null = null;
  private connectingFromId: string | null = null;
  private hoveredStationId: string | null = null;
  private hoveredSegmentId: string | null = null;
  private draggingStationId: string | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };

  private onDataChange: (() => void) | null = null;
  private onStationEdit: ((stationId: string) => void) | null = null;
  private onContextMenu: ((type: 'station' | 'segment', id: string, x: number, y: number) => void) | null = null;

  private segmentRenderCache: Map<string, SegmentRenderData> = new Map();
  private stationRenderCache: Map<string, StationRenderData> = new Map();
  private needsRender: boolean = true;

  constructor(canvas: HTMLCanvasElement, timeSimulator: TimeSimulator) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.timeSimulator = timeSimulator;

    this.setupCanvas();
    this.bindEvents();
    this.loop();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = 800 * dpr;
    this.canvas.height = 600 * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    this.canvas.addEventListener('click', this.handleClick);
  }

  setOnDataChange(callback: () => void): void {
    this.onDataChange = callback;
  }

  setOnStationEdit(callback: (stationId: string) => void): void {
    this.onStationEdit = callback;
  }

  setOnContextMenu(callback: (type: 'station' | 'segment', id: string, x: number, y: number) => void): void {
    this.onContextMenu = callback;
  }

  setTool(mode: ToolMode): void {
    this.currentTool = mode;
    this.connectingFromId = null;
    this.selectedStationId = null;
    this.selectedSegmentId = null;
    this.needsRender = true;
  }

  getTool(): ToolMode {
    return this.currentTool;
  }

  getStations(): Station[] {
    return Array.from(this.stations.values());
  }

  getSegments(): LineSegment[] {
    return Array.from(this.segments.values());
  }

  getLines(): MetroLine[] {
    return Array.from(this.lines.values());
  }

  getLine(lineId: string): MetroLine | undefined {
    return this.lines.get(lineId);
  }

  getStation(stationId: string): Station | undefined {
    return this.stations.get(stationId);
  }

  getSegment(segmentId: string): LineSegment | undefined {
    return this.segments.get(segmentId);
  }

  addLine(name?: string, color?: string): MetroLine {
    const usedColors = Array.from(this.lines.values()).map(l => l.color);
    const availableColor = LINE_COLORS.find(c => !usedColors.includes(c)) || LINE_COLORS[this.lines.size % LINE_COLORS.length];

    const line: MetroLine = {
      id: generateId('line'),
      name: name || `线路 ${this.lines.size + 1}`,
      color: color || availableColor,
      passengerVolume: 50,
      segmentIds: []
    };
    this.lines.set(line.id, line);
    this.notifyChange();
    return line;
  }

  updateLine(lineId: string, updates: Partial<MetroLine>): void {
    const line = this.lines.get(lineId);
    if (!line) return;
    Object.assign(line, updates);
    this.notifyChange();
  }

  deleteLine(lineId: string): void {
    const line = this.lines.get(lineId);
    if (!line) return;

    line.segmentIds.forEach(segId => {
      const seg = this.segments.get(segId);
      if (seg) {
        const stationA = this.stations.get(seg.stationAId);
        const stationB = this.stations.get(seg.stationBId);
        if (stationA) {
          stationA.connectedLineIds = stationA.connectedLineIds.filter(id => id !== lineId);
        }
        if (stationB) {
          stationB.connectedLineIds = stationB.connectedLineIds.filter(id => id !== lineId);
        }
        this.segments.delete(segId);
      }
    });

    this.lines.delete(lineId);
    this.notifyChange();
  }

  addStation(x: number, y: number, name?: string): Station {
    const station: Station = {
      id: generateId('station'),
      x,
      y,
      name: name || `站点${this.stations.size + 1}`,
      connectedLineIds: []
    };
    this.stations.set(station.id, station);
    this.notifyChange();
    return station;
  }

  updateStation(stationId: string, updates: Partial<Station>): void {
    const station = this.stations.get(stationId);
    if (!station) return;
    Object.assign(station, updates);
    this.notifyChange();
  }

  deleteStation(stationId: string): void {
    const station = this.stations.get(stationId);
    if (!station) return;

    const segmentsToDelete: string[] = [];
    this.segments.forEach((seg, segId) => {
      if (seg.stationAId === stationId || seg.stationBId === stationId) {
        segmentsToDelete.push(segId);
        const otherId = seg.stationAId === stationId ? seg.stationBId : seg.stationAId;
        const other = this.stations.get(otherId);
        if (other) {
          other.connectedLineIds = other.connectedLineIds.filter(id => id !== seg.lineId);
        }
        const line = this.lines.get(seg.lineId);
        if (line) {
          line.segmentIds = line.segmentIds.filter(id => id !== segId);
        }
      }
    });

    segmentsToDelete.forEach(id => this.segments.delete(id));
    this.stations.delete(stationId);

    if (this.selectedStationId === stationId) this.selectedStationId = null;
    if (this.connectingFromId === stationId) this.connectingFromId = null;
    if (this.hoveredStationId === stationId) this.hoveredStationId = null;

    this.notifyChange();
  }

  connectStations(stationAId: string, stationBId: string, lineId: string): LineSegment | null {
    if (stationAId === stationBId) return null;

    const line = this.lines.get(lineId);
    if (!line) return null;

    const exists = Array.from(this.segments.values()).some(
      s => s.lineId === lineId &&
        ((s.stationAId === stationAId && s.stationBId === stationBId) ||
         (s.stationAId === stationBId && s.stationBId === stationAId))
    );
    if (exists) return null;

    const segment: LineSegment = {
      id: generateId('segment'),
      lineId,
      stationAId,
      stationBId
    };
    this.segments.set(segment.id, segment);
    line.segmentIds.push(segment.id);

    const stationA = this.stations.get(stationAId);
    const stationB = this.stations.get(stationBId);
    if (stationA && !stationA.connectedLineIds.includes(lineId)) {
      stationA.connectedLineIds.push(lineId);
    }
    if (stationB && !stationB.connectedLineIds.includes(lineId)) {
      stationB.connectedLineIds.push(lineId);
    }

    this.notifyChange();
    return segment;
  }

  deleteSegment(segmentId: string): void {
    const seg = this.segments.get(segmentId);
    if (!seg) return;

    const line = this.lines.get(seg.lineId);
    if (line) {
      line.segmentIds = line.segmentIds.filter(id => id !== segmentId);
    }

    const otherSegsForA = Array.from(this.segments.values()).filter(
      s => s.id !== segmentId && (s.stationAId === seg.stationAId || s.stationBId === seg.stationAId) && s.lineId === seg.lineId
    );
    const otherSegsForB = Array.from(this.segments.values()).filter(
      s => s.id !== segmentId && (s.stationAId === seg.stationBId || s.stationBId === seg.stationBId) && s.lineId === seg.lineId
    );

    if (otherSegsForA.length === 0) {
      const stationA = this.stations.get(seg.stationAId);
      if (stationA) {
        stationA.connectedLineIds = stationA.connectedLineIds.filter(id => id !== seg.lineId);
      }
    }
    if (otherSegsForB.length === 0) {
      const stationB = this.stations.get(seg.stationBId);
      if (stationB) {
        stationB.connectedLineIds = stationB.connectedLineIds.filter(id => id !== seg.lineId);
      }
    }

    this.segments.delete(segmentId);

    if (this.selectedSegmentId === segmentId) this.selectedSegmentId = null;
    if (this.hoveredSegmentId === segmentId) this.hoveredSegmentId = null;

    this.notifyChange();
  }

  getSelectedLineIdForConnect(): string | null {
    if (this.lines.size === 0) return null;
    return this.lines.keys().next().value || null;
  }

  private notifyChange(): void {
    this.needsRender = true;
    if (this.onDataChange) {
      this.onDataChange();
    }
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private findStationAt(x: number, y: number): Station | null {
    for (const station of this.stations.values()) {
      const dx = station.x - x;
      const dy = station.y - y;
      if (dx * dx + dy * dy <= (STATION_RADIUS + 4) * (STATION_RADIUS + 4)) {
        return station;
      }
    }
    return null;
  }

  private findSegmentAt(x: number, y: number): LineSegment | null {
    for (const seg of this.segments.values()) {
      const a = this.stations.get(seg.stationAId);
      const b = this.stations.get(seg.stationBId);
      if (!a || !b) continue;

      const dist = this.pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y);
      if (dist <= 6) {
        return seg;
      }
    }
    return null;
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);
    this.mousePos = pos;

    if (e.button === 2) return;

    if (this.currentTool === 'select') {
      const station = this.findStationAt(pos.x, pos.y);
      if (station) {
        this.draggingStationId = station.id;
        this.selectedStationId = station.id;
        this.selectedSegmentId = null;
        this.dragOffset = { x: pos.x - station.x, y: pos.y - station.y };
        this.canvas.style.cursor = 'grabbing';
        this.needsRender = true;
        return;
      }

      const segment = this.findSegmentAt(pos.x, pos.y);
      if (segment) {
        this.selectedSegmentId = segment.id;
        this.selectedStationId = null;
        this.needsRender = true;
        return;
      }

      this.selectedStationId = null;
      this.selectedSegmentId = null;
      this.needsRender = true;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);
    this.mousePos = pos;

    if (this.draggingStationId) {
      const station = this.stations.get(this.draggingStationId);
      if (station) {
        station.x = Math.max(STATION_RADIUS, Math.min(800 - STATION_RADIUS, pos.x - this.dragOffset.x));
        station.y = Math.max(STATION_RADIUS, Math.min(600 - STATION_RADIUS, pos.y - this.dragOffset.y));
        this.needsRender = true;
      }
      return;
    }

    const station = this.findStationAt(pos.x, pos.y);
    const newHoveredStation = station ? station.id : null;

    const segment = !station ? this.findSegmentAt(pos.x, pos.y) : null;
    const newHoveredSegment = segment ? segment.id : null;

    if (newHoveredStation !== this.hoveredStationId || newHoveredSegment !== this.hoveredSegmentId) {
      this.hoveredStationId = newHoveredStation;
      this.hoveredSegmentId = newHoveredSegment;
      this.needsRender = true;
    }

    if (this.currentTool === 'addStation') {
      this.canvas.style.cursor = 'crosshair';
    } else if (this.currentTool === 'connect' && this.connectingFromId) {
      this.canvas.style.cursor = 'pointer';
    } else if (this.hoveredStationId) {
      this.canvas.style.cursor = this.currentTool === 'select' ? 'grab' : 'pointer';
    } else if (this.hoveredSegmentId) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  };

  private handleMouseUp = (): void => {
    if (this.draggingStationId) {
      this.draggingStationId = null;
      this.notifyChange();
    }
  };

  private handleMouseLeave = (): void => {
    this.hoveredStationId = null;
    this.hoveredSegmentId = null;
    this.draggingStationId = null;
    this.needsRender = true;
  };

  private handleClick = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);

    if (this.currentTool === 'addStation') {
      const existing = this.findStationAt(pos.x, pos.y);
      if (!existing) {
        this.addStation(pos.x, pos.y);
      }
      return;
    }

    if (this.currentTool === 'connect') {
      const station = this.findStationAt(pos.x, pos.y);
      if (!station) return;

      if (!this.connectingFromId) {
        this.connectingFromId = station.id;
        this.needsRender = true;
        return;
      }

      if (this.connectingFromId !== station.id) {
        const lineId = this.getSelectedLineIdForConnect();
        if (lineId) {
          this.connectStations(this.connectingFromId, station.id, lineId);
        }
      }
      this.connectingFromId = null;
      this.needsRender = true;
    }
  };

  private handleDoubleClick = (e: MouseEvent): void => {
    const pos = this.getCanvasPos(e);
    const station = this.findStationAt(pos.x, pos.y);
    if (station && this.onStationEdit) {
      this.onStationEdit(station.id);
    }
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    const pos = this.getCanvasPos(e);

    const station = this.findStationAt(pos.x, pos.y);
    if (station) {
      this.selectedStationId = station.id;
      this.selectedSegmentId = null;
      if (this.onContextMenu) {
        this.onContextMenu('station', station.id, e.clientX, e.clientY);
      }
      this.needsRender = true;
      return;
    }

    const segment = this.findSegmentAt(pos.x, pos.y);
    if (segment) {
      this.selectedSegmentId = segment.id;
      this.selectedStationId = null;
      if (this.onContextMenu) {
        this.onContextMenu('segment', segment.id, e.clientX, e.clientY);
      }
      this.needsRender = true;
    }
  };

  private recomputeRenderCache(): void {
    this.segmentRenderCache.clear();
    this.segments.forEach(seg => {
      const line = this.lines.get(seg.lineId);
      if (!line) return;
      const render = this.timeSimulator.computeSegmentRender({
        lineId: line.id,
        passengerVolume: line.passengerVolume
      });
      this.segmentRenderCache.set(seg.id, render);
    });

    this.stationRenderCache.clear();
    this.stations.forEach(station => {
      const volumes = station.connectedLineIds.map(lineId => {
        const line = this.lines.get(lineId);
        return line ? line.passengerVolume : 0;
      });
      const render = this.timeSimulator.computeStationRender(station.id, volumes);
      this.stationRenderCache.set(station.id, render);
    });
  }

  private draw = (): void => {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 800, 600);

    this.drawGrid();
    this.drawSegments();

    if (this.currentTool === 'connect' && this.connectingFromId) {
      this.drawConnectingLine();
    }

    this.drawStations();
  };

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= 800; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 0; y <= 600; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }
  }

  private drawSegments(): void {
    const ctx = this.ctx;

    this.segments.forEach(seg => {
      const a = this.stations.get(seg.stationAId);
      const b = this.stations.get(seg.stationBId);
      const line = this.lines.get(seg.lineId);
      if (!a || !b || !line) return;

      const render = this.segmentRenderCache.get(seg.id);
      const thickness = render ? render.thickness : 3;
      const opacity = render ? render.opacity : 1;

      const isHovered = this.hoveredSegmentId === seg.id;
      const isSelected = this.selectedSegmentId === seg.id;
      const glowActive = isHovered || isSelected;

      ctx.save();
      ctx.globalAlpha = opacity;

      if (glowActive) {
        ctx.shadowColor = GLOW_COLOR;
        ctx.shadowBlur = 8;
      }

      ctx.strokeStyle = line.color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      if (isSelected) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#FF9800';
        ctx.lineWidth = Math.max(thickness + 2, 5);
        ctx.globalCompositeOperation = 'destination-over';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();
    });
  }

  private drawConnectingLine(): void {
    const ctx = this.ctx;
    const fromStation = this.stations.get(this.connectingFromId!);
    if (!fromStation) return;

    ctx.save();
    ctx.strokeStyle = '#FF9800';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.7;
    ctx.shadowColor = GLOW_COLOR;
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(fromStation.x, fromStation.y);
    ctx.lineTo(this.mousePos.x, this.mousePos.y);
    ctx.stroke();

    ctx.restore();
  }

  private drawStations(): void {
    const ctx = this.ctx;

    this.stations.forEach(station => {
      const render = this.stationRenderCache.get(station.id);
      const isHovered = this.hoveredStationId === station.id;
      const isSelected = this.selectedStationId === station.id;
      const isConnecting = this.connectingFromId === station.id;
      const isDragging = this.draggingStationId === station.id;
      const glowActive = isHovered || isSelected || isConnecting || isDragging;

      const fillColor = render ? render.color : DEFAULT_STATION_COLOR;

      ctx.save();

      if (glowActive) {
        ctx.shadowColor = GLOW_COLOR;
        ctx.shadowBlur = 10;
      } else if (render && render.glowIntensity > 0.3) {
        ctx.shadowColor = 'rgba(255, 87, 34, 0.3)';
        ctx.shadowBlur = 4 + render.glowIntensity * 6;
      }

      const isTransfer = station.connectedLineIds.length > 1;
      const drawRadius = isTransfer ? STATION_RADIUS + 2 : STATION_RADIUS;

      if (isSelected || isConnecting) {
        ctx.beginPath();
        ctx.arc(station.x, station.y, drawRadius + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 152, 0, 0.25)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(station.x, station.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.lineWidth = isTransfer ? 2.5 : 1.5;
      ctx.strokeStyle = isTransfer ? '#FFD700' : '#FFFFFF';
      ctx.stroke();

      if (isTransfer) {
        ctx.beginPath();
        ctx.arc(station.x, station.y, drawRadius - 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (station.name) {
        ctx.font = '11px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#D0D0E0';
        ctx.shadowBlur = 0;
        ctx.fillText(station.name, station.x, station.y + drawRadius + 5);
      }

      ctx.restore();
    });
  }

  private loop = (): void => {
    if (this.needsRender || this.timeSimulator.getIsPlaying() || this.draggingStationId) {
      this.recomputeRenderCache();
      this.draw();
      this.needsRender = false;
    }
    requestAnimationFrame(this.loop);
  };

  markDirty(): void {
    this.needsRender = true;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.canvas.removeEventListener('click', this.handleClick);
  }
}
