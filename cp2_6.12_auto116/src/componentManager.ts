import { LevelConfig } from './data/levels';

export interface MirrorState {
  id: string;
  x: number;
  y: number;
  angle: number;
  length: number;
  draggable: boolean;
}

export interface PrismState {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  draggable: boolean;
  refractiveIndex: number;
}

export interface ObstacleState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LightSourceState {
  x: number;
  y: number;
  angle: number;
}

export interface ReceiverState {
  x: number;
  y: number;
}

export interface ComponentState {
  mirrors: MirrorState[];
  prisms: PrismState[];
  obstacles: ObstacleState[];
  lightSource: LightSourceState;
  receiver: ReceiverState;
}

type DragType = 'mirror' | 'prism' | null;

export class ComponentManager {
  state: ComponentState;
  hoverId: string | null = null;
  dragInfo: { type: DragType; id: string; startAngle: number; startMouseAngle: number } | null = null;

  constructor() {
    this.state = {
      mirrors: [],
      prisms: [],
      obstacles: [],
      lightSource: { x: 0, y: 0, angle: 0 },
      receiver: { x: 0, y: 0 },
    };
  }

  loadLevel(level: LevelConfig): void {
    this.state = {
      mirrors: level.mirrors.map((m, i) => ({
        id: `mirror_${i}`,
        ...m,
      })),
      prisms: level.prisms.map((p, i) => ({
        id: `prism_${i}`,
        ...p,
      })),
      obstacles: level.obstacles.map((o, i) => ({
        id: `obstacle_${i}`,
        ...o,
      })),
      lightSource: { ...level.lightSource },
      receiver: { ...level.receiver },
    };
    this.hoverId = null;
    this.dragInfo = null;
  }

  private getMouseAngle(px: number, py: number, cx: number, cy: number): number {
    return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
  }

  private pointToMirrorDistance(px: number, py: number, m: MirrorState): number {
    const half = m.length / 2;
    const rad = (m.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const ax = m.x - cos * half;
    const ay = m.y - sin * half;
    const bx = m.x + cos * half;
    const by = m.y + sin * half;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  private pointInTriangle(px: number, py: number, p: PrismState): boolean {
    const s = p.size / 2;
    const rad = (p.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const base = [
      { x: 0, y: -s * 1.1547 },
      { x: s, y: s * 0.5774 },
      { x: -s, y: s * 0.5774 },
    ];
    const tri = base.map((v) => ({
      x: p.x + v.x * cos - v.y * sin,
      y: p.y + v.x * sin + v.y * cos,
    }));
    const sign = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) =>
      (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign({ x: px, y: py }, tri[0], tri[1]);
    const d2 = sign({ x: px, y: py }, tri[1], tri[2]);
    const d3 = sign({ x: px, y: py }, tri[2], tri[0]);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  handleMouseMove(px: number, py: number): boolean {
    if (this.dragInfo) {
      const currentMouseAngle = this.getMouseAngle(px, py, this.getDragCenterX(), this.getDragCenterY());
      const deltaAngle = currentMouseAngle - this.dragInfo.startMouseAngle;
      const newAngle = this.dragInfo.startAngle + deltaAngle;

      if (this.dragInfo.type === 'mirror') {
        const m = this.state.mirrors.find((x) => x.id === this.dragInfo!.id);
        if (m) m.angle = newAngle;
      } else if (this.dragInfo.type === 'prism') {
        const p = this.state.prisms.find((x) => x.id === this.dragInfo!.id);
        if (p) p.rotation = newAngle;
      }
      return true;
    }

    let found: { id: string; type: 'mirror' | 'prism' } | null = null;
    for (const m of this.state.mirrors) {
      if (!m.draggable) continue;
      if (this.pointToMirrorDistance(px, py, m) < 12) {
        found = { id: m.id, type: 'mirror' };
        break;
      }
    }
    if (!found) {
      for (const p of this.state.prisms) {
        if (!p.draggable) continue;
        if (this.pointInTriangle(px, py, p)) {
          found = { id: p.id, type: 'prism' };
          break;
        }
      }
    }
    const newHoverId = found ? found.id : null;
    if (newHoverId !== this.hoverId) {
      this.hoverId = newHoverId;
      return true;
    }
    return false;
  }

  private getDragCenterX(): number {
    if (!this.dragInfo) return 0;
    if (this.dragInfo.type === 'mirror') {
      return this.state.mirrors.find((m) => m.id === this.dragInfo!.id)?.x ?? 0;
    } else {
      return this.state.prisms.find((p) => p.id === this.dragInfo!.id)?.x ?? 0;
    }
  }

  private getDragCenterY(): number {
    if (!this.dragInfo) return 0;
    if (this.dragInfo.type === 'mirror') {
      return this.state.mirrors.find((m) => m.id === this.dragInfo!.id)?.y ?? 0;
    } else {
      return this.state.prisms.find((p) => p.id === this.dragInfo!.id)?.y ?? 0;
    }
  }

  handleMouseDown(px: number, py: number): boolean {
    for (const m of this.state.mirrors) {
      if (!m.draggable) continue;
      if (this.pointToMirrorDistance(px, py, m) < 12) {
        this.dragInfo = {
          type: 'mirror',
          id: m.id,
          startAngle: m.angle,
          startMouseAngle: this.getMouseAngle(px, py, m.x, m.y),
        };
        return true;
      }
    }
    for (const p of this.state.prisms) {
      if (!p.draggable) continue;
      if (this.pointInTriangle(px, py, p)) {
        this.dragInfo = {
          type: 'prism',
          id: p.id,
          startAngle: p.rotation,
          startMouseAngle: this.getMouseAngle(px, py, p.x, p.y),
        };
        return true;
      }
    }
    return false;
  }

  handleMouseUp(): boolean {
    if (this.dragInfo) {
      this.dragInfo = null;
      return true;
    }
    return false;
  }
}
