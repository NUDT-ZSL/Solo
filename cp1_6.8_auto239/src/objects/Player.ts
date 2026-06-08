import Phaser from 'phaser';
import { LevelConfig } from '../utils/levelData';

interface Footprint {
  x: number;
  y: number;
  alpha: number;
  particles: Phaser.GameObjects.Arc[];
  createdAt: number;
}

export class Player {
  scene: Phaser.Scene;
  x: number;
  y: number;
  radius: number;
  colorTheme: LevelConfig['colorTheme'];
  ball: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  trailParticles: Phaser.GameObjects.Arc[];
  footprints: Footprint[];
  footprintDuration: number;
  moveSpeed: number;
  targetX: number | null;
  targetY: number | null;
  isMoving: boolean;
  isLongPressing: boolean;
  longPressTimer: Phaser.Time.TimerEvent | null;
  steps: number;
  rippleAlpha: number;
  rippleRadius: number;
  rippleActive: boolean;
  lastTrailTime: number;

  constructor(scene: Phaser.Scene, x: number, y: number, colorTheme: LevelConfig['colorTheme']) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.colorTheme = colorTheme;
    this.footprints = [];
    this.footprintDuration = 4000;
    this.moveSpeed = 200;
    this.targetX = null;
    this.targetY = null;
    this.isMoving = false;
    this.isLongPressing = false;
    this.longPressTimer = null;
    this.steps = 0;
    this.trailParticles = [];
    this.rippleAlpha = 0;
    this.rippleRadius = 0;
    this.rippleActive = false;
    this.lastTrailTime = 0;

    this.glow = scene.add.circle(x, y, this.radius * 3, colorTheme.glow, 0.15);
    this.glow.setDepth(5);

    this.ball = scene.add.circle(x, y, this.radius, colorTheme.main, 1);
    this.ball.setDepth(10);

    const innerHighlight = scene.add.circle(x - 3, y - 3, this.radius * 0.4, 0xffffff, 0.5);
    innerHighlight.setDepth(11);
  }

  moveTo(tx: number, ty: number) {
    this.targetX = tx;
    this.targetY = ty;
    this.isMoving = true;
    this.steps++;
    this.emitRipple();
  }

  emitRipple() {
    this.rippleAlpha = 0.6;
    this.rippleRadius = this.radius;
    this.rippleActive = true;
  }

  update(delta: number, wallRects: Phaser.Geom.Rectangle[]) {
    const dt = delta / 1000;

    if (this.isMoving && this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 3) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.isMoving = false;
        this.targetX = null;
        this.targetY = null;
      } else {
        const step = this.moveSpeed * dt;
        const nx = dx / dist;
        const ny = dy / dist;
        const newX = this.x + nx * step;
        const newY = this.y + ny * step;

        let blocked = false;
        for (const wall of wallRects) {
          const closestX = Phaser.Math.Clamp(newX, wall.x, wall.x + wall.width);
          const closestY = Phaser.Math.Clamp(newY, wall.y, wall.y + wall.height);
          const cdx = newX - closestX;
          const cdy = newY - closestY;
          if (cdx * cdx + cdy * cdy < this.radius * this.radius) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          this.x = newX;
          this.y = newY;
        } else {
          this.isMoving = false;
          this.targetX = null;
          this.targetY = null;
        }
      }
    }

    this.ball.setPosition(this.x, this.y);
    this.glow.setPosition(this.x, this.y);

    const now = this.scene.time.now;
    if (this.isMoving && now - this.lastTrailTime > 30) {
      this.lastTrailTime = now;
      this.spawnTrailParticle();
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.alpha -= 0.02;
      p.setScale(p.scale * 0.97);
      if (p.alpha <= 0) {
        p.destroy();
        this.trailParticles.splice(i, 1);
      }
    }

    if (this.rippleActive) {
      this.rippleRadius += 120 * dt;
      this.rippleAlpha -= 1.2 * dt;
      if (this.rippleAlpha <= 0) {
        this.rippleActive = false;
        this.rippleAlpha = 0;
      }
    }

    if (this.isLongPressing && now - this.lastTrailTime > 80) {
      this.lastTrailTime = now;
      this.spawnTrailParticle();
    }

    this.updateFootprints(now);
  }

  spawnTrailParticle() {
    const p = this.scene.add.circle(
      this.x + (Math.random() - 0.5) * 6,
      this.y + (Math.random() - 0.5) * 6,
      3 + Math.random() * 2,
      this.colorTheme.trail,
      0.8
    );
    p.setDepth(8);
    this.trailParticles.push(p);
  }

  placeFootprint() {
    const particles: Phaser.GameObjects.Arc[] = [];
    const count = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 30;
      const oy = (Math.random() - 0.5) * 14;
      const size = 2 + Math.random() * 3;
      const p = this.scene.add.circle(
        this.x + ox,
        this.y + oy,
        size,
        this.colorTheme.footprint,
        0.7 + Math.random() * 0.3
      );
      p.setDepth(6);
      particles.push(p);
    }
    this.footprints.push({
      x: this.x,
      y: this.y,
      alpha: 1,
      particles,
      createdAt: this.scene.time.now,
    });
  }

  updateFootprints(now: number) {
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const fp = this.footprints[i];
      const elapsed = now - fp.createdAt;
      fp.alpha = 1 - elapsed / this.footprintDuration;

      if (fp.alpha <= 0) {
        for (const p of fp.particles) {
          p.destroy();
        }
        this.footprints.splice(i, 1);
      } else {
        for (const p of fp.particles) {
          p.setAlpha(fp.alpha * 0.8);
        }
      }
    }
  }

  getFootprintRects(): Phaser.Geom.Rectangle[] {
    return this.footprints
      .filter(fp => fp.alpha > 0.2)
      .map(fp => new Phaser.Geom.Rectangle(fp.x - 18, fp.y - 10, 36, 20));
  }

  startLongPress() {
    this.isLongPressing = true;
    if (this.longPressTimer) {
      this.longPressTimer.remove();
    }
    this.longPressTimer = this.scene.time.addEvent({
      delay: 300,
      callback: () => {
        if (this.isLongPressing) {
          this.placeFootprint();
        }
      },
      loop: true,
    });
  }

  stopLongPress() {
    this.isLongPressing = false;
    if (this.longPressTimer) {
      this.longPressTimer.remove();
      this.longPressTimer = null;
    }
  }

  drawRipple(graphics: Phaser.GameObjects.Graphics) {
    if (this.rippleActive && this.rippleAlpha > 0) {
      graphics.lineStyle(2, this.colorTheme.main, this.rippleAlpha);
      graphics.strokeCircle(this.x, this.y, this.rippleRadius);
      graphics.lineStyle(1, this.colorTheme.glow, this.rippleAlpha * 0.5);
      graphics.strokeCircle(this.x, this.y, this.rippleRadius * 1.3);
    }
  }

  reset(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = null;
    this.targetY = null;
    this.isMoving = false;
    this.steps = 0;
    this.stopLongPress();
    for (const fp of this.footprints) {
      for (const p of fp.particles) {
        p.destroy();
      }
    }
    this.footprints = [];
    for (const p of this.trailParticles) {
      p.destroy();
    }
    this.trailParticles = [];
    this.ball.setPosition(x, y);
    this.glow.setPosition(x, y);
  }

  destroy() {
    this.stopLongPress();
    this.ball.destroy();
    this.glow.destroy();
    for (const fp of this.footprints) {
      for (const p of fp.particles) {
        p.destroy();
      }
    }
    for (const p of this.trailParticles) {
      p.destroy();
    }
  }
}
