import { Mirror, Vec2 } from './types';

export class MirrorSystem {
  private mirrors: Mirror[] = [];
  private draggingMirror: Mirror | null = null;
  private dragStartAngle: number = 0;
  private mirrorStartAngle: number = 0;
  private readonly STIFFNESS = 0.18;
  private readonly DAMPING = 0.72;
  private readonly HIT_RADIUS = 25;

  loadMirrors(mirrors: Mirror[]): void {
    this.mirrors = mirrors.map(m => ({
      ...m,
      targetAngle: m.angle,
      angularVelocity: 0,
      isDragging: false,
      isHighlighted: false,
      glowIntensity: 0,
      vertices: this.computeVertices(m),
    }));
  }

  getMirrors(): Mirror[] {
    return this.mirrors;
  }

  update(dt: number): void {
    for (const mirror of this.mirrors) {
      if (mirror.isAutoRotating && !mirror.isDragging) {
        mirror.angle += mirror.autoRotateSpeed * dt;
        mirror.targetAngle = mirror.angle;
      } else if (!mirror.isDragging) {
        const diff = mirror.targetAngle - mirror.angle;
        const force = diff * this.STIFFNESS;
        mirror.angularVelocity = (mirror.angularVelocity + force) * this.DAMPING;
        mirror.angle += mirror.angularVelocity;
      }

      const targetGlow = mirror.isDragging ? 1.0 : (mirror.isHighlighted ? 0.7 : 0.0);
      mirror.glowIntensity += (targetGlow - mirror.glowIntensity) * 0.1;

      mirror.vertices = this.computeVertices(mirror);
    }
  }

  handleMouseDown(gamePos: Vec2): boolean {
    let closestMirror: Mirror | null = null;
    let closestDist = this.HIT_RADIUS;

    for (const mirror of this.mirrors) {
      if (mirror.isAutoRotating) continue;
      const dist = this.pointToMirrorDistance(gamePos, mirror);
      if (dist < closestDist) {
        closestDist = dist;
        closestMirror = mirror;
      }
    }

    if (closestMirror) {
      this.draggingMirror = closestMirror;
      closestMirror.isDragging = true;
      this.dragStartAngle = Math.atan2(
        gamePos.y - closestMirror.center.y,
        gamePos.x - closestMirror.center.x
      );
      this.mirrorStartAngle = closestMirror.angle;
      return true;
    }
    return false;
  }

  handleMouseMove(gamePos: Vec2): void {
    if (!this.draggingMirror) return;
    const currentAngle = Math.atan2(
      gamePos.y - this.draggingMirror.center.y,
      gamePos.x - this.draggingMirror.center.x
    );
    const delta = currentAngle - this.dragStartAngle;
    this.draggingMirror.targetAngle = this.mirrorStartAngle + delta;
    this.draggingMirror.angle = this.draggingMirror.targetAngle;
  }

  handleMouseUp(): boolean {
    if (this.draggingMirror) {
      this.draggingMirror.isDragging = false;
      const delta = this.draggingMirror.targetAngle - this.mirrorStartAngle;
      this.draggingMirror.angularVelocity = delta * 0.05;
      this.draggingMirror = null;
      return Math.abs(delta) > 0.02;
    }
    return false;
  }

  getMirrorEndpoints(mirror: Mirror): { start: Vec2; end: Vec2 } {
    const halfLen = mirror.length / 2;
    const dx = Math.cos(mirror.angle) * halfLen;
    const dy = Math.sin(mirror.angle) * halfLen;
    return {
      start: { x: mirror.center.x - dx, y: mirror.center.y - dy },
      end: { x: mirror.center.x + dx, y: mirror.center.y + dy },
    };
  }

  getMirrorNormal(mirror: Mirror): Vec2 {
    return {
      x: -Math.sin(mirror.angle),
      y: Math.cos(mirror.angle),
    };
  }

  setHighlight(mirrorId: string | null): void {
    for (const m of this.mirrors) {
      m.isHighlighted = m.id === mirrorId;
    }
  }

  clearHighlights(): void {
    for (const m of this.mirrors) {
      m.isHighlighted = false;
    }
  }

  private computeVertices(mirror: Mirror): Vec2[] {
    const halfLen = mirror.length / 2;
    const halfThick = mirror.thickness / 2;
    const cos = Math.cos(mirror.angle);
    const sin = Math.sin(mirror.angle);
    const alongX = cos * halfLen;
    const alongY = sin * halfLen;
    const perpX = -sin * halfThick;
    const perpY = cos * halfThick;

    return [
      { x: mirror.center.x - alongX - perpX, y: mirror.center.y - alongY - perpY },
      { x: mirror.center.x + alongX - perpX, y: mirror.center.y + alongY - perpY },
      { x: mirror.center.x + alongX + perpX, y: mirror.center.y + alongY + perpY },
      { x: mirror.center.x - alongX + perpX, y: mirror.center.y - alongY + perpY },
    ];
  }

  private pointToMirrorDistance(point: Vec2, mirror: Mirror): number {
    const { start, end } = this.getMirrorEndpoints(mirror);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    return Math.hypot(point.x - projX, point.y - projY);
  }
}
