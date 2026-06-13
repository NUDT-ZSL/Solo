import * as THREE from 'three';
import type {
  Intersection,
  StreetSegment,
  TrafficDataPoint,
  TrafficFrame,
  PlaybackSpeed,
} from './types';
import { validateIntersection, validateStreetSegment } from './types';
import { lerp, clamp } from './utils/easing';

export class TrafficDataSimulator {
  readonly GRID_SIZE = 8;
  readonly BLOCK_SPACING = 4;
  readonly PATH_STEP = 0.5;

  private intersections: Map<string, Intersection> = new Map();
  private segments: StreetSegment[] = [];
  private segmentMap: Map<string, StreetSegment> = new Map();
  private precomputedFrames: Map<number, TrafficFrame> = new Map();
  private currentHour: number = 8;
  private playbackSpeed: PlaybackSpeed = 'normal';
  private hourProgress: number = 0;

  constructor() {
    this.generateIntersections();
    this.generateStreetSegments();
    this.precomputeAllFrames();
  }

  private generateIntersections(): void {
    const halfSize = (this.GRID_SIZE - 1) * this.BLOCK_SPACING * 0.5;
    for (let gy = 0; gy < this.GRID_SIZE; gy++) {
      for (let gx = 0; gx < this.GRID_SIZE; gx++) {
        const id = `int_${gx}_${gy}`;
        const x = gx * this.BLOCK_SPACING - halfSize;
        const z = gy * this.BLOCK_SPACING - halfSize;
        const intersection: Intersection = {
          id,
          gridX: gx,
          gridY: gy,
          x,
          z,
          lat: 30.0 + gy * 0.01,
          lng: 120.0 + gx * 0.01,
        };
        if (!validateIntersection(intersection)) {
          throw new Error(`Invalid intersection generated: ${id}`);
        }
        this.intersections.set(id, intersection);
      }
    }
  }

  private generateStreetSegments(): void {
    for (let gy = 0; gy < this.GRID_SIZE; gy++) {
      for (let gx = 0; gx < this.GRID_SIZE; gx++) {
        const fromId = `int_${gx}_${gy}`;
        const from = this.intersections.get(fromId);
        if (!from) continue;

        if (gx < this.GRID_SIZE - 1) {
          const toId = `int_${gx + 1}_${gy}`;
          const to = this.intersections.get(toId);
          if (to) {
            const segment = this.createSegment(from, to, true);
            if (validateStreetSegment(segment)) {
              this.segments.push(segment);
              this.segmentMap.set(segment.id, segment);
            }
          }
        }

        if (gy < this.GRID_SIZE - 1) {
          const toId = `int_${gx}_${gy + 1}`;
          const to = this.intersections.get(toId);
          if (to) {
            const segment = this.createSegment(from, to, false);
            if (validateStreetSegment(segment)) {
              this.segments.push(segment);
              this.segmentMap.set(segment.id, segment);
            }
          }
        }
      }
    }
  }

  private createSegment(
    from: Intersection,
    to: Intersection,
    isHorizontal: boolean
  ): StreetSegment {
    const pathPoints: THREE.Vector3[] = [];
    const steps = Math.ceil(this.BLOCK_SPACING / this.PATH_STEP);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pathPoints.push(
        new THREE.Vector3(
          lerp(from.x, to.x, t),
          0.1,
          lerp(from.z, to.z, t)
        )
      );
    }

    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const length = Math.sqrt(dx * dx + dz * dz);

    return {
      id: `seg_${from.id}_${to.id}`,
      from: from.id,
      to: to.id,
      fromIntersection: from,
      toIntersection: to,
      pathPoints,
      isHorizontal,
      length,
    };
  }

  private generateHourlyPattern(hour: number): number {
    const morningPeak = Math.exp(-Math.pow(hour - 8, 2) / 4);
    const eveningPeak = Math.exp(-Math.pow(hour - 18, 2) / 4);
    const nightValley = hour >= 0 && hour <= 5 ? 0.2 : 1;
    return clamp(0.2 + (morningPeak * 0.7 + eveningPeak * 0.8) * nightValley, 0, 1);
  }

  private generateSpeedPattern(hour: number, flowIntensity: number): number {
    const baseSpeed = 80 - flowIntensity * 60;
    const rushHourPenalty =
      (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? -15 : 0;
    return clamp(baseSpeed + rushHourPenalty + Math.random() * 10, 5, 80);
  }

  private precomputeAllFrames(): void {
    for (let hour = 0; hour < 24; hour++) {
      const frame = this.generateFrame(hour);
      this.precomputedFrames.set(hour, frame);
    }
  }

  private generateFrame(hour: number): TrafficFrame {
    const data = new Map<string, TrafficDataPoint>();
    const pattern = this.generateHourlyPattern(hour);
    let totalFlow = 0;
    let totalSpeed = 0;
    let count = 0;

    for (const [id, int] of this.intersections) {
      const distFromCenter = Math.sqrt(
        Math.pow(int.gridX - (this.GRID_SIZE - 1) / 2, 2) +
          Math.pow(int.gridY - (this.GRID_SIZE - 1) / 2, 2)
      );
      const centerFactor = clamp(
        1 - distFromCenter / (this.GRID_SIZE * 0.7),
        0.3,
        1
      );
      const jitter = 0.7 + Math.random() * 0.6;
      const flow = Math.round(1000 * pattern * centerFactor * jitter);
      const speed = this.generateSpeedPattern(hour, flow / 1000);

      data.set(id, {
        intersectionId: id,
        flow: clamp(flow, 0, 1000),
        speed: clamp(speed, 0, 80),
      });

      totalFlow += flow;
      totalSpeed += speed;
      count++;
    }

    return {
      timestamp: Date.now(),
      hour,
      data,
      totalFlow,
      avgSpeed: count > 0 ? totalSpeed / count : 0,
    };
  }

  setHour(hour: number): void {
    this.currentHour = clamp(Math.round(hour), 0, 23);
    this.hourProgress = 0;
  }

  getHour(): number {
    return this.currentHour;
  }

  setPlaybackSpeed(speed: PlaybackSpeed): void {
    this.playbackSpeed = speed;
  }

  getPlaybackSpeed(): PlaybackSpeed {
    return this.playbackSpeed;
  }

  getInterpolatedFrame(transitionT: number, fromHour: number, toHour: number): TrafficFrame {
    const fromFrame = this.precomputedFrames.get(Math.round(fromHour))!;
    const toFrame = this.precomputedFrames.get(Math.round(toHour))!;

    const interpolatedData = new Map<string, TrafficDataPoint>();

    for (const [id, fromPoint] of fromFrame.data) {
      const toPoint = toFrame.data.get(id)!;
      interpolatedData.set(id, {
        intersectionId: id,
        flow: lerp(fromPoint.flow, toPoint.flow, transitionT),
        speed: lerp(fromPoint.speed, toPoint.speed, transitionT),
      });
    }

    return {
      timestamp: Date.now(),
      hour: lerp(fromHour, toHour, transitionT),
      data: interpolatedData,
      totalFlow: lerp(fromFrame.totalFlow, toFrame.totalFlow, transitionT),
      avgSpeed: lerp(fromFrame.avgSpeed, toFrame.avgSpeed, transitionT),
    };
  }

  getCurrentFrame(): TrafficFrame {
    const frame = this.precomputedFrames.get(this.currentHour);
    if (!frame) {
      throw new Error(`Frame not found for hour: ${this.currentHour}`);
    }
    return frame;
  }

  getFrameAtHour(hour: number): TrafficFrame {
    const h = clamp(Math.round(hour), 0, 23);
    const frame = this.precomputedFrames.get(h);
    if (!frame) {
      throw new Error(`Frame not found for hour: ${h}`);
    }
    return frame;
  }

  update(deltaTime: number): void {
    if (this.playbackSpeed === 'paused') return;

    const speedMultiplier = this.playbackSpeed === 'fast' ? 3 : 1;
    this.hourProgress += deltaTime * 0.05 * speedMultiplier;

    if (this.hourProgress >= 1) {
      this.hourProgress = 0;
      this.currentHour = (this.currentHour + 1) % 24;
    }
  }

  getIntersections(): Map<string, Intersection> {
    return this.intersections;
  }

  getIntersectionArray(): Intersection[] {
    return Array.from(this.intersections.values());
  }

  getSegments(): StreetSegment[] {
    return this.segments;
  }

  getSegmentById(id: string): StreetSegment | undefined {
    return this.segmentMap.get(id);
  }

  getRandomSegment(): StreetSegment {
    return this.segments[Math.floor(Math.random() * this.segments.length)];
  }

  getAdjacentSegments(segment: StreetSegment, atEnd: boolean): StreetSegment[] {
    const targetId = atEnd ? segment.to : segment.from;
    const result: StreetSegment[] = [];
    for (const seg of this.segments) {
      if (seg.id === segment.id) continue;
      if (seg.from === targetId || seg.to === targetId) {
        result.push(seg);
      }
    }
    return result;
  }

  getGridCenter(): { x: number; z: number } {
    const halfSize = (this.GRID_SIZE - 1) * this.BLOCK_SPACING * 0.5;
    return { x: 0, z: 0 };
    void halfSize;
  }

  getWorldBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const halfSize = (this.GRID_SIZE - 1) * this.BLOCK_SPACING * 0.5;
    return {
      minX: -halfSize - this.BLOCK_SPACING / 2,
      maxX: halfSize + this.BLOCK_SPACING / 2,
      minZ: -halfSize - this.BLOCK_SPACING / 2,
      maxZ: halfSize + this.BLOCK_SPACING / 2,
    };
  }
}
