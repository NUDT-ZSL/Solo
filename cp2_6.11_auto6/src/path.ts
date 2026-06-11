export type AtmosphereType = 'forest' | 'ocean' | 'dusk' | 'volcano';

export interface AtmospherePreset {
  type: AtmosphereType;
  name: string;
  color: string;
  iconGlyph: 'note' | 'wave' | 'star' | 'lava';
}

export const ATMOSPHERE_PRESETS: Record<AtmosphereType, AtmospherePreset> = {
  forest: { type: 'forest', name: '森林', color: '#6BCB77', iconGlyph: 'note' },
  ocean: { type: 'ocean', name: '海洋', color: '#4A90D9', iconGlyph: 'wave' },
  dusk: { type: 'dusk', name: '暮色', color: '#FF8C42', iconGlyph: 'star' },
  volcano: { type: 'volcano', name: '火山', color: '#FF6B6B', iconGlyph: 'lava' }
};

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface AtmosphereSegment {
  startIndex: number;
  endIndex: number;
  atmosphere: AtmosphereType;
}

export interface PathMemoryData {
  version: string;
  name: string;
  author: string;
  createdAt: number;
  points: Point[];
  segments: AtmosphereSegment[];
  particleDensity: number;
  playbackSpeed: number;
}

const VERSION = '1.0';
const COORDINATE_PRECISION = 3;
const TIMESTAMP_PRECISION = 0;

function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

export class PathMemory {
  public name: string;
  public author: string;
  public createdAt: number;
  public particleDensity: number;
  public playbackSpeed: number;
  
  private points: Point[] = [];
  private segments: AtmosphereSegment[] = [];

  constructor(
    name: string = '未命名路径',
    author: string = '匿名作者',
    particleDensity: number = 80,
    playbackSpeed: number = 1.0
  ) {
    this.name = name;
    this.author = author;
    this.createdAt = Date.now();
    this.particleDensity = Math.max(30, Math.min(150, particleDensity));
    this.playbackSpeed = Math.max(0.5, Math.min(3.0, playbackSpeed));
  }

  addPoint(x: number, y: number, timestamp: number): void {
    const normalizedX = roundToPrecision(Math.max(0, Math.min(1, x)), COORDINATE_PRECISION);
    const normalizedY = roundToPrecision(Math.max(0, Math.min(1, y)), COORDINATE_PRECISION);
    const roundedTime = roundToPrecision(timestamp, TIMESTAMP_PRECISION);
    
    const lastPoint = this.points[this.points.length - 1];
    if (lastPoint && 
        Math.abs(lastPoint.x - normalizedX) < 0.001 && 
        Math.abs(lastPoint.y - normalizedY) < 0.001) {
      return;
    }
    
    this.points.push({ x: normalizedX, y: normalizedY, timestamp: roundedTime });
  }

  addSegment(startIndex: number, endIndex: number, atmosphere: AtmosphereType): boolean {
    if (startIndex < 0 || endIndex >= this.points.length || startIndex > endIndex) {
      return false;
    }
    if (!ATMOSPHERE_PRESETS[atmosphere]) {
      return false;
    }
    
    for (const seg of this.segments) {
      if ((startIndex >= seg.startIndex && startIndex <= seg.endIndex) ||
          (endIndex >= seg.startIndex && endIndex <= seg.endIndex) ||
          (startIndex <= seg.startIndex && endIndex >= seg.endIndex)) {
        return false;
      }
    }
    
    this.segments.push({ startIndex, endIndex, atmosphere });
    return true;
  }

  getPoints(): Point[] {
    return [...this.points];
  }

  getSegments(): AtmosphereSegment[] {
    return [...this.segments];
  }

  getPointCount(): number {
    return this.points.length;
  }

  getSegmentCount(): number {
    return this.segments.length;
  }

  getTotalDuration(): number {
    if (this.points.length < 2) return 0;
    return this.points[this.points.length - 1].timestamp - this.points[0].timestamp;
  }

  getAtmosphereAtTime(timestamp: number): AtmosphereType | null {
    const pointIndex = this.findPointIndexAtTime(timestamp);
    if (pointIndex < 0) return null;
    
    for (const seg of this.segments) {
      if (pointIndex >= seg.startIndex && pointIndex <= seg.endIndex) {
        return seg.atmosphere;
      }
    }
    return null;
  }

  getAtmosphereAtIndex(index: number): AtmosphereType | null {
    for (const seg of this.segments) {
      if (index >= seg.startIndex && index <= seg.endIndex) {
        return seg.atmosphere;
      }
    }
    return null;
  }

  findPointIndexAtTime(timestamp: number): number {
    if (this.points.length === 0) return -1;
    if (timestamp <= this.points[0].timestamp) return 0;
    if (timestamp >= this.points[this.points.length - 1].timestamp) return this.points.length - 1;
    
    let left = 0;
    let right = this.points.length - 1;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.points[mid].timestamp < timestamp) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return left;
  }

  getInterpolatedPointAtTime(timestamp: number): Point | null {
    if (this.points.length < 2) return null;
    
    const clampedTime = Math.max(
      this.points[0].timestamp,
      Math.min(this.points[this.points.length - 1].timestamp, timestamp)
    );
    
    const index = this.findPointIndexAtTime(clampedTime);
    if (index === 0) return { ...this.points[0] };
    if (index === this.points.length - 1) return { ...this.points[this.points.length - 1] };
    
    const p0 = this.points[index - 1];
    const p1 = this.points[index];
    
    const timeRange = p1.timestamp - p0.timestamp;
    if (timeRange === 0) return { ...p0 };
    
    const t = (clampedTime - p0.timestamp) / timeRange;
    
    return {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
      timestamp: clampedTime
    };
  }

  static validate(data: unknown): data is PathMemoryData {
    if (typeof data !== 'object' || data === null) return false;
    
    const d = data as Record<string, unknown>;
    
    if (typeof d.version !== 'string' || d.version !== VERSION) return false;
    if (typeof d.name !== 'string') return false;
    if (typeof d.author !== 'string') return false;
    if (typeof d.createdAt !== 'number' || d.createdAt <= 0) return false;
    
    if (!Array.isArray(d.points) || d.points.length < 2) return false;
    for (const p of d.points) {
      if (typeof p !== 'object' || p === null) return false;
      const point = p as Record<string, unknown>;
      if (typeof point.x !== 'number' || point.x < 0 || point.x > 1) return false;
      if (typeof point.y !== 'number' || point.y < 0 || point.y > 1) return false;
      if (typeof point.timestamp !== 'number' || point.timestamp < 0) return false;
    }
    
    if (!Array.isArray(d.segments)) return false;
    for (const s of d.segments) {
      if (typeof s !== 'object' || s === null) return false;
      const seg = s as Record<string, unknown>;
      if (typeof seg.startIndex !== 'number' || seg.startIndex < 0) return false;
      if (typeof seg.endIndex !== 'number' || seg.endIndex < seg.startIndex) return false;
      if (typeof seg.atmosphere !== 'string' || !ATMOSPHERE_PRESETS[seg.atmosphere as AtmosphereType]) return false;
    }
    
    if (typeof d.particleDensity !== 'number' || d.particleDensity < 30 || d.particleDensity > 150) return false;
    if (typeof d.playbackSpeed !== 'number' || d.playbackSpeed < 0.5 || d.playbackSpeed > 3) return false;
    
    return true;
  }

  serialize(): string {
    const data: PathMemoryData = {
      version: VERSION,
      name: this.name,
      author: this.author,
      createdAt: this.createdAt,
      points: this.points.map(p => ({
        x: roundToPrecision(p.x, COORDINATE_PRECISION),
        y: roundToPrecision(p.y, COORDINATE_PRECISION),
        timestamp: roundToPrecision(p.timestamp, TIMESTAMP_PRECISION)
      })),
      segments: this.segments,
      particleDensity: this.particleDensity,
      playbackSpeed: this.playbackSpeed
    };
    return JSON.stringify(data);
  }

  toJSON(): PathMemoryData {
    return JSON.parse(this.serialize());
  }

  static deserialize(json: string): PathMemory | null {
    try {
      const data = JSON.parse(json);
      if (!PathMemory.validate(data)) {
        return null;
      }
      
      const pathMemory = new PathMemory(
        data.name,
        data.author,
        data.particleDensity,
        data.playbackSpeed
      );
      pathMemory.createdAt = data.createdAt;
      pathMemory.points = [...data.points];
      pathMemory.segments = [...data.segments];
      
      return pathMemory;
    } catch {
      return null;
    }
  }

  static fromData(data: PathMemoryData): PathMemory | null {
    if (!PathMemory.validate(data)) return null;
    
    const pathMemory = new PathMemory(
      data.name,
      data.author,
      data.particleDensity,
      data.playbackSpeed
    );
    pathMemory.createdAt = data.createdAt;
    pathMemory.points = [...data.points];
    pathMemory.segments = [...data.segments];
    
    return pathMemory;
  }

  clear(): void {
    this.points = [];
    this.segments = [];
    this.createdAt = Date.now();
  }

  estimateFileSize(): number {
    return this.serialize().length;
  }
}

export function interpolatePathPoints(points: Point[], samplesPerSegment: number = 3): Point[] {
  if (points.length < 2) return [...points];
  
  const result: Point[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    result.push(p0);
    
    for (let s = 1; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      result.push({
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
        timestamp: p0.timestamp + (p1.timestamp - p0.timestamp) * t
      });
    }
  }
  
  result.push(points[points.length - 1]);
  return result;
}

export function catmullRomSmooth(points: Point[], alpha: number = 0.5): Point[] {
  if (points.length < 4) return [...points];
  
  const result: Point[] = [points[0]];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    const steps = 10;
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      
      const v0x = (p2.x - p0.x) * alpha;
      const v0y = (p2.y - p0.y) * alpha;
      const v1x = (p3.x - p1.x) * alpha;
      const v1y = (p3.y - p1.y) * alpha;
      
      const x = (2 * p1.x - 2 * p2.x + v0x + v1x) * t3 +
                (-3 * p1.x + 3 * p2.x - 2 * v0x - v1x) * t2 +
                v0x * t + p1.x;
      
      const y = (2 * p1.y - 2 * p2.y + v0y + v1y) * t3 +
                (-3 * p1.y + 3 * p2.y - 2 * v0y - v1y) * t2 +
                v0y * t + p1.y;
      
      const timestamp = p1.timestamp + (p2.timestamp - p1.timestamp) * t;
      
      result.push({ x, y, timestamp });
    }
  }
  
  return result;
}

export function douglasPeuckerSimplify(points: Point[], tolerance: number = 0.001): Point[] {
  if (points.length <= 2) return [...points];
  
  function getPerpendicularDistance(p: Point, start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) {
      return Math.sqrt((p.x - start.x) ** 2 + (p.y - start.y) ** 2);
    }
    
    const t = ((p.x - start.x) * dx + (p.y - start.y) * dy) / (len * len);
    
    if (t <= 0) return Math.sqrt((p.x - start.x) ** 2 + (p.y - start.y) ** 2);
    if (t >= 1) return Math.sqrt((p.x - end.x) ** 2 + (p.y - end.y) ** 2);
    
    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    
    return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
  }
  
  function simplifyRecursive(pts: Point[], startIdx: number, endIdx: number, tol: number, result: Point[]): void {
    let maxDist = 0;
    let maxIdx = 0;
    
    for (let i = startIdx + 1; i < endIdx; i++) {
      const dist = getPerpendicularDistance(pts[i], pts[startIdx], pts[endIdx]);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }
    
    if (maxDist > tol) {
      simplifyRecursive(pts, startIdx, maxIdx, tol, result);
      result.push(pts[maxIdx]);
      simplifyRecursive(pts, maxIdx, endIdx, tol, result);
    }
  }
  
  const result: Point[] = [points[0]];
  simplifyRecursive(points, 0, points.length - 1, tolerance, result);
  result.push(points[points.length - 1]);
  
  return result;
}
