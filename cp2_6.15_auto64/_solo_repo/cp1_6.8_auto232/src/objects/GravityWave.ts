import Phaser from 'phaser';
import {
  WAVE_BASE_SPEED,
  WAVE_RADIUS,
  PLANET_INFLUENCE_RANGE,
  COLORS,
  PlanetConfig,
  PortalConfig,
} from '../config';

interface PlanetState {
  x: number;
  y: number;
  radius: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export class GravityWave {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private strength: number;
  private deflectionMultiplier: number;
  private alive: boolean = true;
  private age: number = 0;
  private maxAge: number = 8000;
  private trail: TrailPoint[] = [];
  private maxTrailLength: number = 80;
  private graphics: Phaser.GameObjects.Graphics;
  private rippleGraphics: Phaser.GameObjects.Graphics;
  private ripples: { x: number; y: number; radius: number; alpha: number }[] = [];
  private deflectedBy: Set<number> = new Set();

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    strength: number,
    deflectionMultiplier: number
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.strength = strength;
    this.deflectionMultiplier = deflectionMultiplier;

    const speed = WAVE_BASE_SPEED * (0.5 + strength * 0.5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.graphics = scene.add.graphics();
    this.rippleGraphics = scene.add.graphics();

    this.addRipple(x, y);
  }

  private addRipple(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      this.ripples.push({
        x,
        y,
        radius: WAVE_RADIUS + i * 5,
        alpha: 0.8 - i * 0.2,
      });
    }
  }

  update(
    delta: number,
    planets: PlanetState[],
    portals: PortalConfig[]
  ): { hitPortal: boolean; portalIndex: number } {
    if (!this.alive) return { hitPortal: false, portalIndex: -1 };

    this.age += delta;
    if (this.age > this.maxAge) {
      this.alive = false;
      return { hitPortal: false, portalIndex: -1 };
    }

    const dt = delta / 1000;

    for (let i = 0; i < planets.length; i++) {
      if (this.deflectedBy.has(i)) continue;

      const planet = planets[i];
      const dx = planet.x - this.x;
      const dy = planet.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < planet.radius + WAVE_RADIUS) {
        this.deflectedBy.add(i);
        this.addRipple(this.x, this.y);

        const currentAngle = Math.atan2(this.vy, this.vx);
        const toPlanetAngle = Math.atan2(dy, dx);
        const cross = this.vx * dy - this.vy * dx;
        const deflectDir = cross > 0 ? -1 : 1;

        const deflectAngle = deflectDir * 0.4 * this.deflectionMultiplier;
        const newAngle = currentAngle + deflectAngle;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;

        const pushDist = planet.radius + WAVE_RADIUS + 5;
        this.x = planet.x - Math.cos(toPlanetAngle) * pushDist;
        this.y = planet.y - Math.sin(toPlanetAngle) * pushDist;
      } else if (dist < PLANET_INFLUENCE_RANGE) {
        const influence = 1 - dist / PLANET_INFLUENCE_RANGE;
        const force = influence * 50 * this.deflectionMultiplier;
        this.vx += (dx / dist) * force * dt;
        this.vy += (dy / dist) * force * dt;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.trail.unshift({ x: this.x, y: this.y, age: 0 });
    for (const tp of this.trail) tp.age += delta;
    while (this.trail.length > this.maxTrailLength) this.trail.pop();

    for (let pi = 0; pi < portals.length; pi++) {
      const portal = portals[pi];
      const dx = portal.x - this.x;
      const dy = portal.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < portal.radius + WAVE_RADIUS) {
        this.alive = false;
        return { hitPortal: true, portalIndex: pi };
      }
    }

    if (
      this.x < -50 ||
      this.x > 1400 ||
      this.y < -50 ||
      this.y > 800
    ) {
      this.alive = false;
      return { hitPortal: false, portalIndex: -1 };
    }

    this.updateRipples(delta);
    this.draw();

    return { hitPortal: false, portalIndex: -1 };
  }

  private updateRipples(delta: number): void {
    for (const r of this.ripples) {
      r.radius += delta * 0.08;
      r.alpha -= delta * 0.002;
    }
    this.ripples = this.ripples.filter((r) => r.alpha > 0);
  }

  private draw(): void {
    this.graphics.clear();
    this.rippleGraphics.clear();

    this.graphics.setBlendMode(Phaser.BlendModes.ADD);
    this.rippleGraphics.setBlendMode(Phaser.BlendModes.ADD);

    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const p1 = this.trail[i];
        const p2 = this.trail[i + 1];
        const alpha = Math.max(0, 1 - i / this.trail.length);
        const lineW = Math.max(0.5, 3 - i * 0.03);

        this.graphics.lineStyle(lineW, COLORS.waveColor, alpha * 0.8);
        this.graphics.beginPath();
        this.graphics.moveTo(p1.x, p1.y);
        this.graphics.lineTo(p2.x, p2.y);
        this.graphics.strokePath();
      }
    }

    this.graphics.fillStyle(COLORS.waveGlow, 0.9);
    this.graphics.fillCircle(this.x, this.y, WAVE_RADIUS);

    this.graphics.fillStyle(0xffffff, 0.7);
    this.graphics.fillCircle(this.x, this.y, WAVE_RADIUS * 0.5);

    this.graphics.lineStyle(2, COLORS.waveColor, 0.3);
    this.graphics.strokeCircle(this.x, this.y, WAVE_RADIUS * 2.5);

    for (const r of this.ripples) {
      this.rippleGraphics.lineStyle(1.5, COLORS.waveColor, r.alpha * 0.5);
      this.rippleGraphics.strokeCircle(r.x, r.y, r.radius);
    }
  }

  isAlive(): boolean {
    return this.alive;
  }

  destroy(): void {
    this.graphics.destroy();
    this.rippleGraphics.destroy();
  }
}
