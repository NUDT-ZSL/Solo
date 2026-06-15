export interface PathPoint {
  x: number;
  y: number;
  hue: number;
  createdAt: number;
  pathId: number;
}

export interface PathData {
  id: number;
  points: PathPoint[];
  baseHue: number;
  createdAt: number;
  isFading: boolean;
  fadeStartTime: number;
}

export interface Ripple {
  startTime: number;
  maxRadius: number;
  duration: number;
}

export interface IntersectionNode {
  x: number;
  y: number;
  hue1: number;
  hue2: number;
  createdAt: number;
  ripples: Ripple[];
  lastRippleTime: number;
}

const TRAIL_FADE_TIME = 1200;
const GLOBAL_FADE_DURATION = 800;
const MAX_POINTS = 5000;
const MIN_POINT_DISTANCE = 5;
const NODE_BLINK_FREQ = 3;
const NODE_DIAMETER = 12;
const RIPPLE_MAX_RADIUS = 40;
const RIPPLE_DURATION = 600;
const NODE_LIFETIME = 2500;
const INTERSECTION_THRESHOLD = 8;

export class PathManager {
  private ctx: CanvasRenderingContext2D;
  private paths: Map<number, PathData> = new Map();
  private nodes: IntersectionNode[] = [];
  private currentPathId: number = -1;
  private nextPathId: number = 0;
  private totalPoints: number = 0;
  private pendingNodeChecks: Array<{ p1: PathPoint; p2: PathPoint }> = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  getPathCount(): number {
    return this.paths.size;
  }

  startPath(hue: number): void {
    const id = this.nextPathId++;
    this.currentPathId = id;
    this.paths.set(id, {
      id,
      points: [],
      baseHue: hue,
      createdAt: performance.now(),
      isFading: false,
      fadeStartTime: 0
    });
  }

  addPoint(worldX: number, worldY: number, hue: number, now: number): boolean {
    const path = this.paths.get(this.currentPathId);
    if (!path) return false;

    const last = path.points[path.points.length - 1];
    if (last) {
      const dx = worldX - last.x;
      const dy = worldY - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_POINT_DISTANCE) return false;
    }

    const point: PathPoint = {
      x: worldX,
      y: worldY,
      hue,
      createdAt: now,
      pathId: this.currentPathId
    };

    path.points.push(point);
    this.totalPoints++;

    if (last) {
      this.pendingNodeChecks.push({ p1: last, p2: point });
    }

    while (this.totalPoints > MAX_POINTS) {
      let removed = false;
      for (const [, p] of this.paths) {
        if (p.points.length > 2) {
          p.points.shift();
          this.totalPoints--;
          removed = true;
          break;
        }
      }
      if (!removed) break;
    }

    return true;
  }

  endPath(): void {
    this.currentPathId = -1;
  }

  clearAllAnimated(): void {
    const now = performance.now();
    for (const [, path] of this.paths) {
      if (!path.isFading) {
        path.isFading = true;
        path.fadeStartTime = now;
      }
    }
  }

  checkPendingIntersections(now: number): void {
    while (this.pendingNodeChecks.length > 0) {
      const seg = this.pendingNodeChecks.shift()!;
      this.checkSegmentIntersections(seg.p1, seg.p2, now);
    }
  }

  private checkSegmentIntersections(
    segP1: PathPoint,
    segP2: PathPoint,
    now: number
  ): void {
    const threshold = INTERSECTION_THRESHOLD;
    const segDx = segP2.x - segP1.x;
    const segDy = segP2.y - segP1.y;
    const segLenSq = segDx * segDx + segDy * segDy;
    if (segLenSq === 0) return;

    for (const [, path] of this.paths) {
      if (path.id === segP1.pathId) continue;
      const pts = path.points;
      for (let i = 0; i < pts.length - 1; i++) {
        const q1 = pts[i];
        const q2 = pts[i + 1];
        const pt = this.segSegClosest(segP1, segP2, q1, q2);
        if (pt.dist < threshold) {
          const hue1 = this.mixHue(segP1.hue, segP2.hue, 0.5);
          const hue2 = this.mixHue(q1.hue, q2.hue, 0.5);
          if (!this.hasNodeNear(pt.x, pt.y, threshold * 3)) {
            this.addNode(pt.x, pt.y, hue1, hue2, now);
          }
        }
      }
    }
  }

  private segSegClosest(
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
    d: { x: number; y: number }
  ): { x: number; y: number; dist: number } {
    const abx = b.x - a.x, aby = b.y - a.y;
    const cdx = d.x - c.x, cdy = d.y - c.y;
    const acx = c.x - a.x, acy = c.y - a.y;
    const denom = abx * cdy - aby * cdx;
    let s = 0, t = 0;
    if (Math.abs(denom) > 1e-10) {
      s = (acx * cdy - acy * cdx) / denom;
      t = (acx * aby - acy * abx) / denom;
      s = Math.max(0, Math.min(1, s));
      t = Math.max(0, Math.min(1, t));
    } else {
      const lenSq = abx * abx + aby * aby;
      s = lenSq > 0 ? Math.max(0, Math.min(1, (acx * abx + acy * aby) / lenSq)) : 0;
      t = 0;
    }
    const px = a.x + s * abx;
    const py = a.y + s * aby;
    const qx = c.x + t * cdx;
    const qy = c.y + t * cdy;
    const mx = (px + qx) / 2;
    const my = (py + qy) / 2;
    const dx = px - qx;
    const dy = py - qy;
    return { x: mx, y: my, dist: Math.sqrt(dx * dx + dy * dy) };
  }

  private hasNodeNear(x: number, y: number, r: number): boolean {
    const r2 = r * r;
    return this.nodes.some(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return dx * dx + dy * dy < r2;
    });
  }

  private addNode(x: number, y: number, h1: number, h2: number, now: number): void {
    const node: IntersectionNode = {
      x, y,
      hue1: h1, hue2: h2,
      createdAt: now,
      ripples: [{
        startTime: now,
        maxRadius: RIPPLE_MAX_RADIUS,
        duration: RIPPLE_DURATION
      }],
      lastRippleTime: now
    };
    this.nodes.push(node);
  }

  private mixHue(h1: number, h2: number, t: number): number {
    let diff = h2 - h1;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    let r = h1 + diff * t;
    if (r < 0) r += 360;
    if (r >= 360) r -= 360;
    return r;
  }

  exportSVG(canvasWidth: number, canvasHeight: number): string {
    const parts: string[] = [];
    parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">`);
    parts.push(`<rect width="100%" height="100%" fill="#0a0a1a"/>`);

    for (const [, path] of this.paths) {
      if (path.points.length < 2) continue;
      let d = '';
      path.points.forEach((pt, i) => {
        d += (i === 0 ? 'M' : 'L') + pt.x.toFixed(2) + ',' + pt.y.toFixed(2) + ' ';
      });
      const color = `hsl(${path.baseHue}, 95%, 65%)`;
      parts.push(`<path d="${d.trim()}" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }

    for (const node of this.nodes) {
      const h = this.mixHue(node.hue1, node.hue2, 0.5);
      const color = `hsl(${h}, 100%, 70%)`;
      parts.push(`<circle cx="${node.x.toFixed(2)}" cy="${node.y.toFixed(2)}" r="6" fill="${color}"/>`);
    }

    parts.push(`</svg>`);
    return parts.join('\n');
  }

  draw(
    now: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    const ctx = this.ctx;
    const fadePaths: number[] = [];

    for (const [id, path] of this.paths) {
      let pathAlpha = 1;
      if (path.isFading) {
        const elapsed = now - path.fadeStartTime;
        if (elapsed >= GLOBAL_FADE_DURATION) {
          fadePaths.push(id);
          continue;
        }
        pathAlpha = 1 - elapsed / GLOBAL_FADE_DURATION;
      }
      this.drawPath(path, now, pathAlpha, scale, offsetX, offsetY);
    }

    for (const id of fadePaths) {
      const p = this.paths.get(id);
      if (p) this.totalPoints -= p.points.length;
      this.paths.delete(id);
    }
    if (fadePaths.length) {
      this.totalPoints = Math.max(0, this.totalPoints);
    }

    this.checkPendingIntersections(now);
    this.drawNodes(now, scale, offsetX, offsetY);
  }

  private drawPath(
    path: PathData,
    now: number,
    pathAlpha: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    const ctx = this.ctx;
    const pts = path.points;
    if (pts.length < 2) return;

    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];

      const age0 = now - p0.createdAt;
      const age1 = now - p1.createdAt;
      const alpha0 = Math.max(0, 1 - age0 / TRAIL_FADE_TIME) * pathAlpha;
      const alpha1 = Math.max(0, 1 - age1 / TRAIL_FADE_TIME) * pathAlpha;

      if (alpha0 <= 0.02 && alpha1 <= 0.02) continue;

      const x0 = p0.x * scale + offsetX;
      const y0 = p0.y * scale + offsetY;
      const x1 = p1.x * scale + offsetX;
      const y1 = p1.y * scale + offsetY;

      const hue = (p0.hue + p1.hue) * 0.5;
      const alpha = (alpha0 + alpha1) * 0.5;
      const w = 4 * scale;

      ctx.save();
      ctx.globalAlpha = alpha * 0.25;
      ctx.strokeStyle = `hsl(${hue}, 100%, 75%)`;
      ctx.lineWidth = w * 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 25 * scale;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = `hsl(${hue}, 100%, 55%)`;
      ctx.shadowBlur = 18 * scale;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha * 0.95;
      ctx.strokeStyle = `hsl(${hue}, 100%, 92%)`;
      ctx.lineWidth = w * 0.35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawNodes(
    now: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    const ctx = this.ctx;
    const survivors: IntersectionNode[] = [];

    for (const node of this.nodes) {
      const age = now - node.createdAt;
      if (age > NODE_LIFETIME) continue;
      survivors.push(node);

      const x = node.x * scale + offsetX;
      const y = node.y * scale + offsetY;
      const h = this.mixHue(node.hue1, node.hue2, 0.5);
      const lifeRatio = 1 - age / NODE_LIFETIME;
      const blink = 0.5 + 0.5 * Math.sin(now * 0.001 * Math.PI * 2 * NODE_BLINK_FREQ);
      const brightness = 0.5 + 0.5 * blink;
      const r = (NODE_DIAMETER * 0.5) * scale * (0.85 + 0.3 * blink);
      const alpha = lifeRatio * brightness;

      const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
      grd.addColorStop(0, `hsla(${h}, 100%, 85%, ${alpha * 0.9})`);
      grd.addColorStop(0.35, `hsla(${h}, 100%, 65%, ${alpha * 0.5})`);
      grd.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${h}, 100%, 88%)`;
      ctx.shadowColor = `hsl(${h}, 100%, 65%)`;
      ctx.shadowBlur = 18 * scale;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const newRipples: Ripple[] = [];
      for (const ripple of node.ripples) {
        const elapsed = now - ripple.startTime;
        if (elapsed >= ripple.duration) continue;
        newRipples.push(ripple);
        const phase = elapsed / ripple.duration;
        const rad = ripple.maxRadius * phase * scale;
        const rAlpha = (1 - phase) * lifeRatio * 0.75;

        ctx.save();
        ctx.globalAlpha = rAlpha;
        ctx.strokeStyle = `hsl(${h}, 100%, 70%)`;
        ctx.lineWidth = (2 + (1 - phase) * 3) * scale;
        ctx.shadowColor = `hsl(${h}, 100%, 60%)`;
        ctx.shadowBlur = 15 * scale;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      node.ripples = newRipples;

      if (node.ripples.length < 3 && now - node.lastRippleTime > 200) {
        node.ripples.push({
          startTime: now,
          maxRadius: RIPPLE_MAX_RADIUS,
          duration: RIPPLE_DURATION
        });
        node.lastRippleTime = now;
      }
    }

    this.nodes = survivors;
  }
}
