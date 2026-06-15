import Phaser from 'phaser';
import { Planet } from './Planet';

export class GravityWave {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private rippleGraphics: Phaser.GameObjects.Graphics;
  private trailPoints: { x: number; y: number; alpha: number }[] = [];
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private speed: number;
  private alive: boolean = true;
  private age: number = 0;
  private maxAge: number = 6000;
  private planets: Planet[];
  private deflectionAngle: number;
  private waveStrength: number;
  private ripples: { x: number; y: number; radius: number; alpha: number }[] = [];
  private onPortalHit: ((x: number, y: number) => void) | null = null;
  private onOutOfBounds: (() => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    dirX: number,
    dirY: number,
    strength: number,
    deflectionAngle: number,
    planets: Planet[],
  ) {
    this.scene = scene;
    this.x = startX;
    this.y = startY;
    this.waveStrength = strength;
    this.deflectionAngle = deflectionAngle;
    this.planets = planets;

    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    this.speed = 3 + strength * 2;
    this.vx = (dirX / len) * this.speed;
    this.vy = (dirY / len) * this.speed;

    this.graphics = scene.add.graphics();
    this.rippleGraphics = scene.add.graphics();

    this.ripples.push({ x: startX, y: startY, radius: 0, alpha: 0.6 });
  }

  setOnPortalHit(callback: (x: number, y: number) => void): void {
    this.onPortalHit = callback;
  }

  setOnOutOfBounds(callback: () => void): void {
    this.onOutOfBounds = callback;
  }

  update(delta: number, portalPositions: { x: number; y: number; radius: number }[]): void {
    if (!this.alive) return;

    this.age += delta;
    if (this.age > this.maxAge) {
      this.alive = false;
      return;
    }

    const dt = delta / 16.67;

    for (const planet of this.planets) {
      const deflection = planet.getDeflection(this.x, this.y, this.deflectionAngle);
      if (deflection.dx !== 0 || deflection.dy !== 0) {
        this.vx += deflection.dx * dt;
        this.vy += deflection.dy * dt;

        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > 0) {
          this.vx = (this.vx / currentSpeed) * this.speed;
          this.vy = (this.vy / currentSpeed) * this.speed;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, planet.x, planet.y);
        if (dist < planet.planetRadius + 4) {
          this.alive = false;
          this.ripples.push({ x: this.x, y: this.y, radius: 0, alpha: 0.8 });
          return;
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.trailPoints.push({ x: this.x, y: this.y, alpha: 1.0 });
    if (this.trailPoints.length > 80) {
      this.trailPoints.shift();
    }

    for (const portal of portalPositions) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, portal.x, portal.y);
      if (dist < portal.radius) {
        this.alive = false;
        if (this.onPortalHit) {
          this.onPortalHit(portal.x, portal.y);
        }
        return;
      }
    }

    const cam = this.scene.cameras.main;
    if (this.x < -50 || this.x > cam.width + 50 || this.y < -50 || this.y > cam.height + 50) {
      this.alive = false;
      if (this.onOutOfBounds) {
        this.onOutOfBounds();
      }
      return;
    }

    if (Math.random() < 0.15) {
      this.ripples.push({ x: this.x, y: this.y, radius: 0, alpha: 0.3 });
    }

    this.updateRipples(dt);
  }

  private updateRipples(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].radius += 1.2 * dt;
      this.ripples[i].alpha -= 0.012 * dt;
      if (this.ripples[i].alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  render(): void {
    this.graphics.clear();
    this.rippleGraphics.clear();

    for (let i = 1; i < this.trailPoints.length; i++) {
      const prev = this.trailPoints[i - 1];
      const curr = this.trailPoints[i];
      const t = i / this.trailPoints.length;
      const alpha = t * 0.8;

      const r = Math.floor(100 + t * 155);
      const g = Math.floor(80 + t * 175);
      const b = Math.floor(200 + t * 55);

      this.graphics.lineStyle(2 + t * 2, (r << 16) | (g << 8) | b, alpha);
      this.graphics.beginPath();
      this.graphics.moveTo(prev.x, prev.y);
      this.graphics.lineTo(curr.x, curr.y);
      this.graphics.strokePath();
    }

    if (this.alive && this.trailPoints.length > 0) {
      const last = this.trailPoints[this.trailPoints.length - 1];
      this.graphics.fillStyle(0xaaccff, 0.9);
      this.graphics.fillCircle(last.x, last.y, 4);
      this.graphics.fillStyle(0xffffff, 0.6);
      this.graphics.fillCircle(last.x, last.y, 2);
    }

    for (const ripple of this.ripples) {
      this.rippleGraphics.lineStyle(1, 0x6688ff, ripple.alpha);
      this.rippleGraphics.strokeCircle(ripple.x, ripple.y, ripple.radius);
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
