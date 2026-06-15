export interface SandParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  inTop: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

export interface HourglassConfig {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  neckWidth: number;
  rotation: number;
}

export interface MouseState {
  x: number;
  y: number;
  isOverTop: boolean;
  isDown: boolean;
}

const GRAVITY = 0.15;
const MAX_PARTICLES = 8000;
const PARTICLE_RADIUS = 1.5;
const PARTICLE_COLOR = '#D4A017';
const BASE_FLOW_SPEED = 20;
const MAX_MOUSE_BOOST = 30;
const FRICTION = 0.98;

export class SandSimulator {
  particles: SandParticle[] = [];
  hourglass: HourglassConfig;
  baseFlowSpeed: number;
  mouseBoostActive: boolean = false;
  private mouseTarget: { x: number; y: number } | null = null;

  constructor(hourglass: HourglassConfig, baseSpeed: number = BASE_FLOW_SPEED) {
    this.hourglass = hourglass;
    this.baseFlowSpeed = baseSpeed;
  }

  setBaseFlowSpeed(speed: number) {
    this.baseFlowSpeed = speed;
  }

  setHourglass(config: HourglassConfig) {
    this.hourglass = config;
  }

  initParticles(count: number = 5000) {
    this.particles = [];
    const { centerX, centerY, width, height } = this.hourglass;
    const topY = centerY - height / 2;
    const bottomY = centerY - 10;
    const leftX = centerX - width / 2 + 20;
    const rightX = centerX + width / 2 - 20;

    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const x = leftX + Math.random() * (rightX - leftX);
      const y = topY + 20 + Math.random() * (bottomY - topY - 40);
      this.particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        radius: PARTICLE_RADIUS,
        color: PARTICLE_COLOR,
        inTop: true,
        trail: []
      });
    }
  }

  setMouseState(mouse: MouseState) {
    this.mouseBoostActive = mouse.isOverTop;
    if (mouse.isOverTop) {
      this.mouseTarget = { x: mouse.x, y: mouse.y };
    } else {
      this.mouseTarget = null;
    }
  }

  private isInsideTopHalf(x: number, y: number): boolean {
    const { centerX, centerY, width, height, rotation } = this.hourglass;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const dx = x - centerX;
    const dy = y - centerY;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    if (localY > 0) return false;

    const progress = Math.abs(localY) / (height / 2);
    const halfWidth = (width / 2) * progress + this.hourglass.neckWidth / 2;
    return Math.abs(localX) < halfWidth - PARTICLE_RADIUS;
  }

  private isInsideBottomHalf(x: number, y: number): boolean {
    const { centerX, centerY, width, height, rotation } = this.hourglass;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const dx = x - centerX;
    const dy = y - centerY;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    if (localY < 0) return false;

    const progress = localY / (height / 2);
    const halfWidth = (width / 2) * progress + this.hourglass.neckWidth / 2;
    return Math.abs(localX) < halfWidth - PARTICLE_RADIUS;
  }

  private isAtNeck(x: number, y: number): boolean {
    const { centerX, centerY, rotation, neckWidth } = this.hourglass;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const dx = x - centerX;
    const dy = y - centerY;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    return Math.abs(localY) < 8 && Math.abs(localX) < neckWidth / 2;
  }

  getNeckPosition(): { x: number; y: number } {
    const { centerX, centerY, rotation } = this.hourglass;
    const localX = 0;
    const localY = 0;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    return {
      x: centerX + localX * cos - localY * sin,
      y: centerY + localX * sin + localY * cos
    };
  }

  private clampToTop(p: SandParticle) {
    const { centerX, centerY, width, height, rotation } = this.hourglass;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const progress = Math.abs(localY) / (height / 2);
    const halfWidth = (width / 2) * progress + this.hourglass.neckWidth / 2;

    if (Math.abs(localX) > halfWidth - p.radius) {
      const sign = localX > 0 ? 1 : -1;
      const newLocalX = sign * (halfWidth - p.radius - 0.5);
      const cosR = Math.cos(-rotation);
      const sinR = Math.sin(-rotation);
      p.x = centerX + newLocalX * cosR - localY * sinR;
      p.y = centerY + newLocalX * sinR + localY * cosR;
      p.vx *= -0.3;
    }
  }

  private clampToBottom(p: SandParticle) {
    const { centerX, centerY, width, height, rotation } = this.hourglass;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const progress = localY / (height / 2);
    const halfWidth = (width / 2) * progress + this.hourglass.neckWidth / 2;

    if (Math.abs(localX) > halfWidth - p.radius) {
      const sign = localX > 0 ? 1 : -1;
      const newLocalX = sign * (halfWidth - p.radius - 0.5);
      const cosR = Math.cos(-rotation);
      const sinR = Math.sin(-rotation);
      p.x = centerX + newLocalX * cosR - localY * sinR;
      p.y = centerY + newLocalX * sinR + localY * cosR;
      p.vx *= -0.3;
    }

    const maxLocalY = height / 2 - p.radius - 5;
    if (localY > maxLocalY) {
      const cosR = Math.cos(-rotation);
      const sinR = Math.sin(-rotation);
      p.y = centerY + localX * sinR + maxLocalY * cosR;
      p.vy *= -0.2;
      if (Math.abs(p.vy) < 0.5) p.vy = 0;
    }
  }

  update(dt: number) {
    const neck = this.getNeckPosition();
    const gravityDir = {
      x: Math.sin(this.hourglass.rotation) * GRAVITY,
      y: Math.cos(this.hourglass.rotation) * GRAVITY
    };

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.trail.length > 0) {
        for (let t = p.trail.length - 1; t >= 0; t--) {
          p.trail[t].alpha -= dt * 5;
          if (p.trail[t].alpha <= 0) p.trail.splice(t, 1);
        }
      }

      if (Math.random() < 0.1 && (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1)) {
        p.trail.push({ x: p.x, y: p.y, alpha: 0.3 });
        if (p.trail.length > 3) p.trail.shift();
      }

      p.vx += gravityDir.x;
      p.vy += gravityDir.y;

      if (this.mouseBoostActive && this.mouseTarget && p.inTop) {
        const dx = this.mouseTarget.x - p.x;
        const dy = this.mouseTarget.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 150) {
          const force = (1 - dist / 150) * (MAX_MOUSE_BOOST / 60);
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      if (p.inTop) {
        const dx = neck.x - p.x;
        const dy = neck.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const flowForce = (this.baseFlowSpeed / 60) * 0.1;
          p.vx += (dx / dist) * flowForce;
          p.vy += (dy / dist) * flowForce;
        }
      }

      p.vx *= FRICTION;
      p.vy *= FRICTION;

      const maxSpeed = 8;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      p.x += p.vx;
      p.y += p.vy;

      if (p.inTop) {
        if (this.isAtNeck(p.x, p.y)) {
          p.inTop = false;
        } else {
          this.clampToTop(p);
        }
      } else {
        this.clampToBottom(p);
      }
    }

    if (this.particles.length > MAX_PARTICLES) {
      const neckPos = this.getNeckPosition();
      this.particles.sort((a, b) => {
        const da = (a.x - neckPos.x) ** 2 + (a.y - neckPos.y) ** 2;
        const db = (b.x - neckPos.x) ** 2 + (b.y - neckPos.y) ** 2;
        return db - da;
      });
      this.particles.length = MAX_PARTICLES;
    }
  }

  removeParticles(count: number): number {
    const removable = this.particles.filter(p => !p.inTop);
    const toRemove = Math.min(count, removable.length);
    for (let i = 0; i < toRemove; i++) {
      const idx = this.particles.indexOf(removable[i]);
      if (idx > -1) this.particles.splice(idx, 1);
    }
    return toRemove;
  }

  getBottomSandRatio(): number {
    const { centerX, centerY, height, rotation } = this.hourglass;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    let bottomCount = 0;
    let minLocalY = Infinity;
    const bottomParticles: SandParticle[] = [];

    for (const p of this.particles) {
      if (!p.inTop) {
        bottomCount++;
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const localY = dx * sin + dy * cos;
        if (localY < minLocalY) minLocalY = localY;
        bottomParticles.push(p);
      }
    }

    if (bottomCount < 100) return 0;

    const maxLocalY = height / 2 - 10;
    let avgY = 0;
    for (const p of bottomParticles) {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      avgY += dx * sin + dy * cos;
    }
    avgY /= bottomParticles.length;

    const fillHeight = maxLocalY - minLocalY;
    const totalHeight = height / 2;
    return Math.min(1, fillHeight / (totalHeight * 0.9));
  }

  getTotalParticles(): number {
    return this.particles.length;
  }

  getBottomParticles(): SandParticle[] {
    return this.particles.filter(p => !p.inTop);
  }
}
