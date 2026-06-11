export type AtmosphereType = 'forest' | 'ocean' | 'dusk' | 'volcano';

export interface PathPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface AtmosphereSegment {
  startIndex: number;
  endIndex: number;
  atmosphere: AtmosphereType;
  length?: number;
}

export interface PathMemoryData {
  version: string;
  name: string;
  author: string;
  createdAt: string;
  points: PathPoint[];
  segments: AtmosphereSegment[];
  particleDensity: number;
  playbackSpeed: number;
  totalLength: number;
}

export interface AtmosphereConfig {
  type: AtmosphereType;
  name: string;
  color: string;
  glowColor: string;
  iconType: string;
  description: string;
}

export const ATMOSPHERE_CONFIGS: Record<AtmosphereType, AtmosphereConfig> = {
  forest: {
    type: 'forest',
    name: '森林',
    color: '#6BCB77',
    glowColor: 'rgba(107, 203, 119, 0.6)',
    iconType: 'note',
    description: '鸟鸣音符'
  },
  ocean: {
    type: 'ocean',
    name: '海洋',
    color: '#4A90D9',
    glowColor: 'rgba(74, 144, 217, 0.6)',
    iconType: 'wave',
    description: '波浪符号'
  },
  dusk: {
    type: 'dusk',
    name: '暮色',
    color: '#FF8C42',
    glowColor: 'rgba(255, 140, 66, 0.6)',
    iconType: 'star',
    description: '星光点'
  },
  volcano: {
    type: 'volcano',
    name: '火山',
    color: '#FF6B6B',
    glowColor: 'rgba(255, 107, 107, 0.6)',
    iconType: 'lava',
    description: '熔岩粒子'
  }
};

export const DEFAULT_PARTICLE_DENSITY = 80;
export const DEFAULT_PLAYBACK_SPEED = 1;
export const MIN_PARTICLE_DENSITY = 30;
export const MAX_PARTICLE_DENSITY = 150;
export const MIN_PLAYBACK_SPEED = 0.5;
export const MAX_PLAYBACK_SPEED = 3;
export const CURRENT_VERSION = '1.0.0';
export const MAX_FILE_SIZE = 500 * 1024;
export const MIN_POINT_DISTANCE = 0.003;
export const TAIL_DELAY_MS = 300;

export class PathMemory {
  public points: PathPoint[] = [];
  public segments: AtmosphereSegment[] = [];
  public name: string = '未命名路径';
  public author: string = '';
  public particleDensity: number = DEFAULT_PARTICLE_DENSITY;
  public playbackSpeed: number = DEFAULT_PLAYBACK_SPEED;
  public totalLength: number = 0;

  private startTime: number = 0;
  private segmentLengths: Map<number, number> = new Map();

  public startNewPath(): void {
    this.points = [];
    this.segments = [];
    this.totalLength = 0;
    this.segmentLengths.clear();
    this.startTime = performance.now();
  }

  public addPoint(x: number, y: number): void {
    const now = performance.now();
    const timestamp = now - this.startTime;
    
    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_POINT_DISTANCE) return;
      this.totalLength += dist;
    }

    this.points.push({ x, y, timestamp });
  }

  public addAtmosphereSegment(atmosphere: AtmosphereType): void {
    if (this.points.length < 2) return;

    const lastSegment = this.segments[this.segments.length - 1];
    const startIndex = lastSegment ? lastSegment.endIndex : 0;
    const endIndex = this.points.length - 1;

    if (startIndex >= endIndex) return;

    const length = this.calculateSegmentLength(startIndex, endIndex);

    if (lastSegment && lastSegment.startIndex === startIndex) {
      lastSegment.atmosphere = atmosphere;
      lastSegment.endIndex = endIndex;
      lastSegment.length = length;
    } else {
      this.segments.push({
        startIndex,
        endIndex,
        atmosphere,
        length
      });
    }
  }

  private calculateSegmentLength(startIndex: number, endIndex: number): number {
    let length = 0;
    for (let i = startIndex + 1; i <= endIndex && i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  public getSegmentLength(segmentIndex: number): number {
    const segment = this.segments[segmentIndex];
    if (!segment) return 0;
    if (segment.length !== undefined) return segment.length;
    const length = this.calculateSegmentLength(segment.startIndex, segment.endIndex);
    segment.length = length;
    return length;
  }

  public getParticleCountForSegment(segmentIndex: number, density: number): number {
    const segLength = this.getSegmentLength(segmentIndex);
    if (segLength === 0 || this.totalLength === 0) return 5;
    
    const ratio = segLength / this.totalLength;
    const baseCount = Math.max(3, Math.floor(density * 0.15));
    const count = Math.floor(baseCount + ratio * density * 0.85);
    
    return Math.min(Math.max(3, count), MAX_PARTICLE_DENSITY);
  }

  public getAtmosphereAtPoint(pointIndex: number): AtmosphereType | null {
    for (const segment of this.segments) {
      if (pointIndex >= segment.startIndex && pointIndex <= segment.endIndex) {
        return segment.atmosphere;
      }
    }
    return null;
  }

  public getTotalDuration(): number {
    if (this.points.length === 0) return 0;
    return this.points[this.points.length - 1].timestamp;
  }

  public getPointAtProgress(progress: number): PathPoint | null {
    if (this.points.length === 0) return null;
    if (progress <= 0) return { ...this.points[0] };
    if (progress >= 1) return { ...this.points[this.points.length - 1] };

    const totalDuration = this.getTotalDuration();
    const targetTime = progress * totalDuration;

    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].timestamp >= targetTime) {
        const prev = this.points[i - 1];
        const curr = this.points[i];
        const segmentDuration = curr.timestamp - prev.timestamp;
        const t = segmentDuration > 0 ? (targetTime - prev.timestamp) / segmentDuration : 0;
        
        return {
          x: prev.x + (curr.x - prev.x) * t,
          y: prev.y + (curr.y - prev.y) * t,
          timestamp: targetTime
        };
      }
    }

    return { ...this.points[this.points.length - 1] };
  }

  public getPointsUpToProgress(progress: number): PathPoint[] {
    if (this.points.length === 0) return [];
    if (progress <= 0) return [];
    if (progress >= 1) return [...this.points];

    const totalDuration = this.getTotalDuration();
    const targetTime = progress * totalDuration;
    const result: PathPoint[] = [];

    for (let i = 0; i < this.points.length; i++) {
      if (this.points[i].timestamp <= targetTime) {
        result.push(this.points[i]);
      } else {
        if (i > 0) {
          const prev = this.points[i - 1];
          const curr = this.points[i];
          const segmentDuration = curr.timestamp - prev.timestamp;
          const t = segmentDuration > 0 ? (targetTime - prev.timestamp) / segmentDuration : 0;
          
          result.push({
            x: prev.x + (curr.x - prev.x) * t,
            y: prev.y + (curr.y - prev.y) * t,
            timestamp: targetTime
          });
        }
        break;
      }
    }

    return result;
  }

  public getLastSegmentEnd(): number {
    if (this.segments.length === 0) return 0;
    return this.segments[this.segments.length - 1].endIndex;
  }

  public hasUnsegmentedPoints(): boolean {
    const lastEnd = this.getLastSegmentEnd();
    return this.points.length > lastEnd + 1;
  }

  private simplifyPoints(points: PathPoint[], tolerance: number): PathPoint[] {
    if (points.length <= 2) return points;
    
    const result: PathPoint[] = [points[0]];
    let lastKept = points[0];
    
    for (let i = 1; i < points.length - 1; i++) {
      const dx = points[i].x - lastKept.x;
      const dy = points[i].y - lastKept.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist >= tolerance) {
        result.push(points[i]);
        lastKept = points[i];
      }
    }
    
    result.push(points[points.length - 1]);
    return result;
  }

  private remapSegmentIndices(
    segments: AtmosphereSegment[], 
    originalPoints: PathPoint[],
    simplifiedPoints: PathPoint[]
  ): AtmosphereSegment[] {
    return segments.map(seg => {
      const originalStart = originalPoints[seg.startIndex];
      const originalEnd = originalPoints[seg.endIndex];
      
      let newStart = 0;
      let newEnd = simplifiedPoints.length - 1;
      let minDistStart = Infinity;
      let minDistEnd = Infinity;
      
      for (let i = 0; i < simplifiedPoints.length; i++) {
        const ds = Math.sqrt(
          Math.pow(simplifiedPoints[i].x - originalStart.x, 2) +
          Math.pow(simplifiedPoints[i].y - originalStart.y, 2)
        );
        const de = Math.sqrt(
          Math.pow(simplifiedPoints[i].x - originalEnd.x, 2) +
          Math.pow(simplifiedPoints[i].y - originalEnd.y, 2)
        );
        if (ds < minDistStart) { minDistStart = ds; newStart = i; }
        if (de < minDistEnd) { minDistEnd = de; newEnd = i; }
      }
      
      if (newStart >= newEnd) newEnd = Math.min(newStart + 1, simplifiedPoints.length - 1);
      
      return {
        ...seg,
        startIndex: newStart,
        endIndex: newEnd
      };
    });
  }

  public serialize(): string {
    let finalPoints = [...this.points];
    let finalSegments = [...this.segments];
    let finalLength = this.totalLength;

    const baseData: PathMemoryData = {
      version: CURRENT_VERSION,
      name: this.name,
      author: this.author,
      createdAt: new Date().toISOString(),
      points: finalPoints.map(p => ({
        x: Math.round(p.x * 10000) / 10000,
        y: Math.round(p.y * 10000) / 10000,
        timestamp: Math.round(p.timestamp)
      })),
      segments: finalSegments.map(s => ({ ...s, length: undefined })),
      particleDensity: this.particleDensity,
      playbackSpeed: this.playbackSpeed,
      totalLength: Math.round(finalLength * 10000) / 10000
    };

    let jsonStr = JSON.stringify(baseData);
    let currentSize = jsonStr.length;

    if (currentSize > MAX_FILE_SIZE && finalPoints.length > 100) {
      const toleranceSteps = [0.004, 0.005, 0.006, 0.008, 0.01, 0.015, 0.02];
      
      for (const tolerance of toleranceSteps) {
        const simplified = this.simplifyPoints(finalPoints, tolerance);
        if (simplified.length < 10) break;
        
        const remappedSegments = this.remapSegmentIndices(finalSegments, finalPoints, simplified);
        
        const testData: PathMemoryData = {
          ...baseData,
          points: simplified.map(p => ({
            x: Math.round(p.x * 10000) / 10000,
            y: Math.round(p.y * 10000) / 10000,
            timestamp: Math.round(p.timestamp)
          })),
          segments: remappedSegments.map(s => ({ ...s, length: undefined }))
        };
        
        jsonStr = JSON.stringify(testData);
        currentSize = jsonStr.length;
        finalPoints = simplified;
        finalSegments = remappedSegments;
        
        if (currentSize <= MAX_FILE_SIZE) break;
      }
    }

    return jsonStr;
  }

  public static deserialize(json: string): PathMemory {
    const data = JSON.parse(json) as PathMemoryData;
    if (!PathMemory.validate(data)) {
      throw new Error('Invalid path memory file');
    }

    const memory = new PathMemory();
    memory.name = data.name || '未命名路径';
    memory.author = data.author || '';
    memory.points = data.points || [];
    memory.segments = data.segments || [];
    memory.particleDensity = data.particleDensity ?? DEFAULT_PARTICLE_DENSITY;
    memory.playbackSpeed = data.playbackSpeed ?? DEFAULT_PLAYBACK_SPEED;
    memory.totalLength = data.totalLength || memory.calculateTotalLengthFromPoints();
    
    return memory;
  }

  private calculateTotalLengthFromPoints(): number {
    let length = 0;
    for (let i = 1; i < this.points.length; i++) {
      const dx = this.points[i].x - this.points[i - 1].x;
      const dy = this.points[i].y - this.points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  public static validate(data: PathMemoryData): boolean {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.points)) return false;
    if (!Array.isArray(data.segments)) return false;
    
    for (const point of data.points) {
      if (typeof point.x !== 'number' || typeof point.y !== 'number') return false;
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return false;
      if (typeof point.timestamp !== 'number') return false;
    }

    const validTypes: AtmosphereType[] = ['forest', 'ocean', 'dusk', 'volcano'];
    for (const seg of data.segments) {
      if (typeof seg.startIndex !== 'number' || typeof seg.endIndex !== 'number') return false;
      if (!validTypes.includes(seg.atmosphere)) return false;
      if (seg.startIndex < 0 || seg.endIndex >= data.points.length) return false;
      if (seg.startIndex >= seg.endIndex) return false;
    }

    if (typeof data.particleDensity === 'number') {
      if (data.particleDensity < MIN_PARTICLE_DENSITY || data.particleDensity > MAX_PARTICLE_DENSITY) {
        return false;
      }
    }
    if (typeof data.playbackSpeed === 'number') {
      if (data.playbackSpeed < MIN_PLAYBACK_SPEED || data.playbackSpeed > MAX_PLAYBACK_SPEED) {
        return false;
      }
    }

    return true;
  }

  public isEmpty(): boolean {
    return this.points.length < 2;
  }

  public getEstimatedFileSize(): number {
    return this.serialize().length;
  }

  public getFileSizeStatus(): { size: number; ok: boolean; percentage: number } {
    const size = this.getEstimatedFileSize();
    return {
      size,
      ok: size <= MAX_FILE_SIZE,
      percentage: Math.min(100, Math.round((size / MAX_FILE_SIZE) * 100))
    };
  }
}
