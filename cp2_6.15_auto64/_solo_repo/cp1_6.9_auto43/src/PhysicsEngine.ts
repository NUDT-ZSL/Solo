import type { DarkMatter, QuantumNode, BezierPoint, PulseRing, Particle, GameStateRef } from './types';

export function cubicBezier(points: BezierPoint[], t: number): { x: number; y: number } {
  if (points.length < 4) return { x: points[0]?.x ?? 0, y: points[0]?.y ?? 0 };
  const clampedT = Math.max(0, Math.min(1, t));
  const mt = 1 - clampedT;
  const x =
    mt * mt * mt * points[0].x +
    3 * mt * mt * clampedT * points[1].x +
    3 * mt * clampedT * clampedT * points[2].x +
    clampedT * clampedT * clampedT * points[3].x;
  const y =
    mt * mt * mt * points[0].y +
    3 * mt * mt * clampedT * points[1].y +
    3 * mt * clampedT * clampedT * points[2].y +
    clampedT * clampedT * clampedT * points[3].y;
  return { x, y };
}

export function bezierLengthApprox(points: BezierPoint[], steps = 50): number {
  if (points.length < 4) return 0;
  let len = 0;
  let prev = cubicBezier(points, 0);
  for (let i = 1; i <= steps; i++) {
    const cur = cubicBezier(points, i / steps);
    len += Math.hypot(cur.x - prev.x, cur.y - prev.y);
    prev = cur;
  }
  return len;
}

export function generateRandomBezierPath(
  w: number,
  h: number,
  margin: number
): BezierPoint[] {
  const startX = margin + Math.random() * (w - margin * 2);
  const startY = margin + Math.random() * (h - margin * 2);
  const endX = margin + Math.random() * (w - margin * 2);
  const endY = margin + Math.random() * (h - margin * 2);
  const cp1x = margin + Math.random() * (w - margin * 2);
  const cp1y = margin + Math.random() * (h - margin * 2);
  const cp2x = margin + Math.random() * (w - margin * 2);
  const cp2y = margin + Math.random() * (h - margin * 2);
  return [
    { x: startX, y: startY },
    { x: cp1x, y: cp1y },
    { x: cp2x, y: cp2y },
    { x: endX, y: endY }
  ];
}

export function generateReverseBezierPath(prev: BezierPoint[]): BezierPoint[] {
  return [
    prev[3],
    { x: prev[3].x + (prev[2].x - prev[3].x) + (Math.random() - 0.5) * 100,
      y: prev[3].y + (prev[2].y - prev[3].y) + (Math.random() - 0.5) * 100 },
    { x: prev[0].x + (prev[1].x - prev[0].x) + (Math.random() - 0.5) * 100,
      y: prev[0].y + (prev[1].y - prev[0].y) + (Math.random() - 0.5) * 100 },
    prev[0]
  ];
}

export class PhysicsEngine {
  updateDarkMatter(dm: DarkMatter, dt: number, w: number, h: number): void {
    dm.rotation += dm.rotationSpeed * dt;

    const pathLen = bezierLengthApprox(dm.bezierPath);
    if (pathLen > 0) {
      dm.pathProgress += (dm.speed * dt) / pathLen;
    }

    if (dm.pathProgress >= 1) {
      dm.pathProgress = 0;
      dm.bezierPath = generateReverseBezierPath(dm.bezierPath);
    }

    const pos = cubicBezier(dm.bezierPath, dm.pathProgress);
    dm.x = pos.x;
    dm.y = pos.y;

    dm.knockbackX *= dm.knockbackDecay;
    dm.knockbackY *= dm.knockbackDecay;
    if (Math.abs(dm.knockbackX) < 0.1) dm.knockbackX = 0;
    if (Math.abs(dm.knockbackY) < 0.1) dm.knockbackY = 0;
  }

  updateNode(node: QuantumNode, dt: number): void {
    node.swingPhase += (Math.PI * 2 * dt) / node.swingPeriod;
    if (!node.isTop) {
      node.x = node.baseX + Math.sin(node.swingPhase) * node.swingAmplitude;
    }
    node.y = node.baseY;

    if (node.brightTimer > 0) {
      node.brightTimer -= dt;
      if (node.brightTimer <= 0) {
        node.brightTimer = 0;
      }
    }
    const targetAlpha = node.brightTimer > 0 ? 1.0 : 0.3;
    node.alpha += (targetAlpha - node.alpha) * Math.min(1, dt * 10);

    for (let i = node.pulseRings.length - 1; i >= 0; i--) {
      const r = node.pulseRings[i];
      r.life -= dt;
      const t = 1 - r.life / r.maxLife;
      r.radius = 10 + (r.maxRadius - 10) * t;
      r.alpha = 0.9 * (1 - t);
      if (r.life <= 0) {
        node.pulseRings.splice(i, 1);
      }
    }
  }

  checkFiberNearDarkMatter(
    particles: Particle[],
    darkMatters: DarkMatter[]
  ): { near: boolean; collisionIndex: number; collisionPoint: { x: number; y: number } | null } {
    let near = false;
    let collisionIndex = -1;
    let collisionPoint: { x: number; y: number } | null = null;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      for (const dm of darkMatters) {
        const dx = p.x - (dm.x + dm.knockbackX);
        const dy = p.y - (dm.y + dm.knockbackY);
        const dist = Math.hypot(dx, dy);
        const warningDist = dm.radius + 10;
        if (dist < warningDist) {
          near = true;
        }
        if (dist < dm.radius + p.radius) {
          if (collisionIndex === -1 || i < collisionIndex) {
            collisionIndex = i;
            collisionPoint = { x: p.x, y: p.y };
          }
        }
      }
    }

    return { near, collisionIndex, collisionPoint };
  }

  checkFiberHitsTopNode(particles: Particle[], node: QuantumNode): boolean {
    if (particles.length === 0) return false;
    const last = particles[particles.length - 1];
    const dx = last.x - node.x;
    const dy = last.y - node.y;
    return Math.hypot(dx, dy) < node.radius + last.radius + 5;
  }

  checkFiberStartsAtBottomNode(startX: number, startY: number, node: QuantumNode): boolean {
    const dx = startX - node.x;
    const dy = startY - node.y;
    return Math.hypot(dx, dy) < node.radius + 20;
  }

  applyPulseRingKnockback(
    rings: PulseRing[],
    darkMatters: DarkMatter[]
  ): void {
    for (const ring of rings) {
      for (const dm of darkMatters) {
        if (ring.hitDarkMatters.has(dm.id)) continue;
        const dx = (dm.x + dm.knockbackX) - ring.x;
        const dy = (dm.y + dm.knockbackY) - ring.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= ring.radius + dm.radius && dist >= ring.radius - 30) {
          ring.hitDarkMatters.add(dm.id);
          const ang = Math.atan2(dy, dx);
          const knockback = 30;
          dm.knockbackX = Math.cos(ang) * knockback;
          dm.knockbackY = Math.sin(ang) * knockback;
        }
      }
    }
  }

  createPulseRing(node: QuantumNode, hue: number): void {
    node.pulseRings.push({
      x: node.x,
      y: node.y,
      radius: 10,
      maxRadius: 120,
      alpha: 0.9,
      life: 1.5,
      maxLife: 1.5,
      hue,
      hitDarkMatters: new Set<number>()
    });
    node.brightTimer = 3;
  }

  generateDarkMatters(
    count: number,
    baseSpeed: number,
    speedMultiplier: number,
    w: number,
    h: number
  ): DarkMatter[] {
    const matters: DarkMatter[] = [];
    const margin = 100;
    for (let i = 0; i < count; i++) {
      const radius = 30 + Math.random() * 30;
      const path = generateRandomBezierPath(w, h, margin);
      const startPos = cubicBezier(path, 0);
      const rotSpeed = ((5 + Math.random() * 10) * Math.PI / 180) * (Math.random() < 0.5 ? 1 : -1);
      matters.push({
        id: i,
        x: startPos.x,
        y: startPos.y,
        radius,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: rotSpeed,
        bezierPath: path,
        pathProgress: 0,
        speed: (baseSpeed + Math.random() * 20) * speedMultiplier,
        knockbackX: 0,
        knockbackY: 0,
        knockbackDecay: 0.92
      });
    }
    return matters;
  }

  calculateFiberLength(particles: Particle[]): number {
    let len = 0;
    for (let i = 1; i < particles.length; i++) {
      len += Math.hypot(
        particles[i].x - particles[i - 1].x,
        particles[i].y - particles[i - 1].y
      );
    }
    return len;
  }

  calculateSpacingBySpeed(speed: number): number {
    const minSpacing = 2;
    const maxSpacing = 8;
    const t = Math.min(1, speed / 600);
    return minSpacing + (maxSpacing - minSpacing) * t;
  }

  computeLastMouseSpeed(
    curX: number, curY: number,
    lastX: number, lastY: number,
    dt: number
  ): number {
    if (dt <= 0) return 0;
    return Math.hypot(curX - lastX, curY - lastY) / dt;
  }
}
