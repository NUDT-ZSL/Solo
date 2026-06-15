import type {
  Vector2,
  MirrorData,
  PrismData,
  SensorData,
  GateData,
  RaySegment,
  RayResult,
  LightColor,
} from '../types';
import { GAME_WIDTH, GAME_HEIGHT, MAX_REFLECTIONS } from '../types';

export class RaySimulator {
  private mirrors: MirrorData[] = [];
  private prisms: PrismData[] = [];
  private sensors: SensorData[] = [];
  private gates: GateData[] = [];
  private activatedGates: Set<string> = new Set();

  setMirrors(mirrors: MirrorData[]): void {
    this.mirrors = mirrors;
  }

  setPrisms(prisms: PrismData[]): void {
    this.prisms = prisms;
  }

  setSensors(sensors: SensorData[]): void {
    this.sensors = sensors;
  }

  setGates(gates: GateData[]): void {
    this.gates = gates;
  }

  setActivatedGates(activatedGates: Set<string>): void {
    this.activatedGates = activatedGates;
  }

  traceRay(
    startX: number,
    startY: number,
    angleDeg: number,
    color: LightColor = 'yellow',
    maxBounces: number = MAX_REFLECTIONS
  ): RayResult {
    const segments: RaySegment[] = [];
    const hitSensors: { sensorId: number; color: LightColor }[] = [];
    let hitReceiver = false;

    let currentX = startX;
    let currentY = startY;
    let currentAngle = angleDeg;
    let currentColor = color;
    let bounces = 0;

    while (bounces <= maxBounces) {
      const dirX = Math.cos((currentAngle * Math.PI) / 180);
      const dirY = Math.sin((currentAngle * Math.PI) / 180);

      const hit = this.findClosestHit(
        currentX,
        currentY,
        dirX,
        dirY,
        currentColor
      );

      if (!hit) {
        const endX = currentX + dirX * 2000;
        const endY = currentY + dirY * 2000;
        segments.push({
          start: { x: currentX, y: currentY },
          end: { x: endX, y: endY },
          color: currentColor,
        });
        break;
      }

      segments.push({
        start: { x: currentX, y: currentY },
        end: { x: hit.point.x, y: hit.point.y },
        color: currentColor,
      });

      if (hit.type === 'sensor') {
        hitSensors.push({ sensorId: hit.id!, color: currentColor });
      }

      if (hit.type === 'receiver') {
        hitReceiver = true;
        break;
      }

      if (hit.type === 'boundary') {
        break;
      }

      if (hit.type === 'mirror') {
        const mirrorAngle = this.mirrors[hit.id!].angle;
        const normalAngle = mirrorAngle + 90;
        const incidentAngle = currentAngle;
        const reflectedAngle = 2 * normalAngle - incidentAngle;
        currentAngle = this.roundToTenth(reflectedAngle);
        currentX = hit.point.x;
        currentY = hit.point.y;
        bounces++;
      } else if (hit.type === 'prism') {
        if (currentColor === 'yellow') {
          const prismAngle = this.prisms[hit.id!].angle;
          const colors: LightColor[] = ['red', 'green', 'blue'];
          const baseAngle = prismAngle;
          
          for (let i = 0; i < colors.length; i++) {
            const dispersionAngle = baseAngle + (i - 1) * 12;
            const subResult = this.traceRay(
              hit.point.x,
              hit.point.y,
              dispersionAngle,
              colors[i],
              maxBounces - bounces - 1
            );
            segments.push(...subResult.segments);
            hitSensors.push(...subResult.hitSensors);
            if (subResult.hitReceiver) {
              hitReceiver = true;
            }
          }
          break;
        } else {
          const prismAngle = this.prisms[hit.id!].angle;
          const offset = currentColor === 'red' ? -8 : currentColor === 'green' ? 0 : 8;
          currentAngle = prismAngle + offset;
          currentX = hit.point.x;
          currentY = hit.point.y;
          bounces++;
        }
      } else if (hit.type === 'gate') {
        break;
      } else {
        break;
      }
    }

    return { segments, hitSensors, hitReceiver };
  }

  private findClosestHit(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    color: LightColor
  ): { type: string; point: Vector2; distance: number; id?: number } | null {
    const hits: { type: string; point: Vector2; distance: number; id?: number }[] = [];

    for (let i = 0; i < this.mirrors.length; i++) {
      const mirror = this.mirrors[i];
      const hit = this.rayMirrorIntersection(x, y, dirX, dirY, mirror);
      if (hit && hit.distance > 0.1) {
        hits.push({ type: 'mirror', point: hit.point, distance: hit.distance, id: i });
      }
    }

    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];
      const hit = this.rayPrismIntersection(x, y, dirX, dirY, prism);
      if (hit && hit.distance > 0.1) {
        hits.push({ type: 'prism', point: hit.point, distance: hit.distance, id: i });
      }
    }

    for (let i = 0; i < this.sensors.length; i++) {
      const sensor = this.sensors[i];
      const hit = this.rayCircleIntersection(
        x, y, dirX, dirY,
        sensor.x, sensor.y, sensor.radius || 20
      );
      if (hit && hit.distance > 0.1) {
        hits.push({ type: 'sensor', point: hit.point, distance: hit.distance, id: i });
      }
    }

    for (let i = 0; i < this.gates.length; i++) {
      const gate = this.gates[i];
      if (this.activatedGates.has(gate.id)) continue;
      const hit = this.rayRectIntersection(x, y, dirX, dirY, gate.x, gate.y, gate.width, gate.height);
      if (hit && hit.distance > 0.1) {
        hits.push({ type: 'gate', point: hit.point, distance: hit.distance, id: i });
      }
    }

    const boundaryHit = this.rayBoundaryIntersection(x, y, dirX, dirY);
    if (boundaryHit && boundaryHit.distance > 0.1) {
      hits.push({ type: 'boundary', point: boundaryHit.point, distance: boundaryHit.distance });
    }

    if (hits.length === 0) return null;

    hits.sort((a, b) => a.distance - b.distance);
    return hits[0];
  }

  private rayMirrorIntersection(
    rx: number, ry: number,
    dx: number, dy: number,
    mirror: MirrorData
  ): { point: Vector2; distance: number } | null {
    const angle = (mirror.angle * Math.PI) / 180;
    const halfWidth = (mirror.width || 80) / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const x1 = mirror.x - cos * halfWidth;
    const y1 = mirror.y - sin * halfWidth;
    const x2 = mirror.x + cos * halfWidth;
    const y2 = mirror.y + sin * halfWidth;

    return this.rayLineIntersection(rx, ry, dx, dy, x1, y1, x2, y2);
  }

  private rayLineIntersection(
    rx: number, ry: number,
    dx: number, dy: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): { point: Vector2; distance: number } | null {
    const x3 = rx;
    const y3 = ry;
    const x4 = rx + dx * 2000;
    const y4 = ry + dy * 2000;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0) {
      const px = x1 + t * (x2 - x1);
      const py = y1 + t * (y2 - y1);
      const distance = Math.sqrt((px - rx) ** 2 + (py - ry) ** 2);
      return { point: { x: px, y: py }, distance };
    }
    return null;
  }

  private rayPrismIntersection(
    rx: number, ry: number,
    dx: number, dy: number,
    prism: PrismData
  ): { point: Vector2; distance: number } | null {
    const size = prism.size || 50;
    const angle = (prism.angle * Math.PI) / 180;
    
    const points: Vector2[] = [];
    for (let i = 0; i < 3; i++) {
      const a = angle + (i * 2 * Math.PI) / 3 - Math.PI / 2;
      points.push({
        x: prism.x + Math.cos(a) * size,
        y: prism.y + Math.sin(a) * size,
      });
    }

    let closestHit: { point: Vector2; distance: number } | null = null;

    for (let i = 0; i < 3; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % 3];
      const hit = this.rayLineIntersection(rx, ry, dx, dy, p1.x, p1.y, p2.x, p2.y);
      if (hit && hit.distance > 0.1) {
        if (!closestHit || hit.distance < closestHit.distance) {
          closestHit = hit;
        }
      }
    }

    return closestHit;
  }

  private rayCircleIntersection(
    rx: number, ry: number,
    dx: number, dy: number,
    cx: number, cy: number,
    radius: number
  ): { point: Vector2; distance: number } | null {
    const fx = rx - cx;
    const fy = ry - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    let t = -1;
    if (t1 >= 0) t = t1;
    else if (t2 >= 0) t = t2;

    if (t < 0) return null;

    const px = rx + dx * t;
    const py = ry + dy * t;
    return { point: { x: px, y: py }, distance: t };
  }

  private rayRectIntersection(
    rx: number, ry: number,
    dx: number, dy: number,
    x: number, y: number,
    w: number, h: number
  ): { point: Vector2; distance: number } | null {
    const left = x - w / 2;
    const right = x + w / 2;
    const top = y - h / 2;
    const bottom = y + h / 2;

    let tmin = -Infinity;
    let tmax = Infinity;

    if (dx !== 0) {
      let t1 = (left - rx) / dx;
      let t2 = (right - rx) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    } else if (rx < left || rx > right) {
      return null;
    }

    if (dy !== 0) {
      let t1 = (top - ry) / dy;
      let t2 = (bottom - ry) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
    } else if (ry < top || ry > bottom) {
      return null;
    }

    if (tmin > tmax || tmax < 0) return null;

    const t = tmin >= 0 ? tmin : tmax;
    if (t < 0) return null;

    const px = rx + dx * t;
    const py = ry + dy * t;
    const distance = Math.sqrt((px - rx) ** 2 + (py - ry) ** 2);
    return { point: { x: px, y: py }, distance };
  }

  private rayBoundaryIntersection(
    x: number, y: number,
    dx: number, dy: number
  ): { point: Vector2; distance: number } | null {
    let minDist = Infinity;
    let hitPoint: Vector2 | null = null;

    if (dx > 0) {
      const t = (GAME_WIDTH - x) / dx;
      if (t > 0 && t < minDist) {
        minDist = t;
        hitPoint = { x: GAME_WIDTH, y: y + dy * t };
      }
    } else if (dx < 0) {
      const t = -x / dx;
      if (t > 0 && t < minDist) {
        minDist = t;
        hitPoint = { x: 0, y: y + dy * t };
      }
    }

    if (dy > 0) {
      const t = (GAME_HEIGHT - y) / dy;
      if (t > 0 && t < minDist) {
        minDist = t;
        hitPoint = { x: x + dx * t, y: GAME_HEIGHT };
      }
    } else if (dy < 0) {
      const t = -y / dy;
      if (t > 0 && t < minDist) {
        minDist = t;
        hitPoint = { x: x + dx * t, y: 0 };
      }
    }

    if (hitPoint) {
      const distance = Math.sqrt((hitPoint.x - x) ** 2 + (hitPoint.y - y) ** 2);
      return { point: hitPoint, distance };
    }
    return null;
  }

  private roundToTenth(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
