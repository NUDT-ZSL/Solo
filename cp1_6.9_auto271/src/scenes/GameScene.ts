import Phaser from 'phaser';

interface Fragment {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  body: Phaser.Physics.Arcade.Body;
  mass: number;
  trail: Phaser.GameObjects.Graphics[];
  trailTimer: number;
  flashTimer: number;
  isCollected: boolean;
  collisionFlash: Phaser.GameObjects.Graphics | null;
  attractLine: Phaser.GameObjects.Graphics | null;
}

interface Obstacle {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  body: Phaser.Physics.Arcade.Body;
  baseX: number;
  baseY: number;
  phase: number;
  amplitudeX: number;
  amplitudeY: number;
  speed: number;
}

export class GameScene extends Phaser.Scene {
  private island!: Phaser.GameObjects.Container;
  private islandGraphics!: Phaser.GameObjects.Graphics;
  private islandGlow!: Phaser.GameObjects.Graphics;
  private islandAngle: number = 0;

  private poleRingGraphics!: Phaser.GameObjects.Graphics;
  private poleRingTimer: number = 0;
  private poleRingActive: boolean = false;
  private currentPole: 'N' | 'S' = 'N';

  private fragments: Fragment[] = [];
  private obstacles: Obstacle[] = [];

  private receiverGraphics!: Phaser.GameObjects.Graphics;
  private receiverGlow!: Phaser.GameObjects.Graphics;
  private receiverRadius: number = 1.2 * 60;
  private receiverPulseTimer: number = 0;
  private isReceiverPulsing: boolean = false;

  private centerX: number = 0;
  private centerY: number = 0;

  private level: number = 1;
  private fragmentsCount: number = 30;
  private collectedCount: number = 0;
  private isLevelComplete: boolean = false;
  private isPlayingWinAnimation: boolean = false;
  private winAnimationTimer: number = 0;
  private winSphere: Phaser.GameObjects.Graphics | null = null;
  private winSphereAngle: number = 0;
  private winParticles: Particle[] = [];

  private keyboardLeft!: Phaser.Input.Keyboard.Key;
  private keyboardRight!: Phaser.Input.Keyboard.Key;
  private uiScene: any = null;

  private collectAnimQueue: Fragment[] = [];
  private collectAnimTimer: number = 0;

  private static readonly PIXELS_PER_UNIT = 60;
  private static readonly BASE_RECEIVER_RADIUS = 1.2;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.centerX = this.scale.width / 2;
    this.centerY = this.scale.height / 2;

    this.createBackground();
    this.createIsland();
    this.createReceiver();
    this.createPoleRing();
    this.createFragments();
    this.createObstacles();

    this.keyboardLeft = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyboardRight = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

    this.uiScene = this.scene.get('UIScene');
    this.scene.launch('UIScene');

    this.uiScene.events.on('ui-ready', () => {
      this.uiScene.updateLevel(this.level);
      this.uiScene.updateProgress(0);
      this.uiScene.updatePoleIndicator(this.currentPole);
    }, this);

    this.events.once('shutdown', () => {
      this.cleanupLevel();
    });
  }

  private createBackground(): void {
    const graphics = this.add.graphics();
    const width = this.scale.width;
    const height = this.scale.height;

    const topColor = new Phaser.Display.Color(45, 27, 105);
    const bottomColor = new Phaser.Display.Color(10, 10, 46);

    const steps = 100;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(topColor, bottomColor, steps, i);
      graphics
        .fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1)
        .fillRect(0, (height / steps) * i, width, (height / steps) + 1);
    }

    const starCount = 120;
    for (let i = 0; i < starCount; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.9);
      graphics
        .fillStyle(0xffffff, alpha)
        .fillCircle(x, y, size);
    }

    graphics.setDepth(-2);
  }

  private createIsland(): void {
    this.island = this.add.container(this.centerX, this.centerY);
    this.island.setDepth(5);

    this.islandGlow = this.add.graphics();
    this.island.add(this.islandGlow);

    this.islandGraphics = this.add.graphics();
    this.island.add(this.islandGraphics);

    this.drawIsland();
  }

  private drawIsland(): void {
    const size = 140;
    const vertices: Phaser.Math.Vector2[] = [];
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const radiusVariation = 0.85 + Math.sin(i * 2.3) * 0.15;
      const r = size * radiusVariation;
      vertices.push(new Phaser.Math.Vector2(
        Math.cos(angle) * r,
        Math.sin(angle) * r
      ));
    }

    this.islandGlow.clear();
    this.islandGlow
      .lineStyle(6, 0x4488ff, 0.35)
      .beginPath();
    vertices.forEach((v, i) => {
      if (i === 0) this.islandGlow.moveTo(v.x, v.y);
      else this.islandGlow.lineTo(v.x, v.y);
    });
    this.islandGlow.closePath().strokePath();

    this.islandGlow
      .lineStyle(3, 0x88ccff, 0.25)
      .beginPath();
    vertices.forEach((v, i) => {
      const inward = v.clone().normalize().scale(-10);
      const pv = v.clone().add(inward);
      if (i === 0) this.islandGlow.moveTo(pv.x, pv.y);
      else this.islandGlow.lineTo(pv.x, pv.y);
    });
    this.islandGlow.closePath().strokePath();

    this.islandGraphics.clear();
    this.islandGraphics
      .fillStyle(0x3a3a4a, 1)
      .beginPath();
    vertices.forEach((v, i) => {
      if (i === 0) this.islandGraphics.moveTo(v.x, v.y);
      else this.islandGraphics.lineTo(v.x, v.y);
    });
    this.islandGraphics.closePath().fillPath();

    this.islandGraphics
      .fillStyle(0x4a4a5a, 0.6)
      .beginPath();
    vertices.forEach((v, i) => {
      const inward = v.clone().normalize().scale(-25);
      const pv = v.clone().add(inward);
      if (i === 0) this.islandGraphics.moveTo(pv.x, pv.y);
      else this.islandGraphics.lineTo(pv.x, pv.y);
    });
    this.islandGraphics.closePath().fillPath();

    this.islandGraphics
      .lineStyle(2, 0x5a5a6a, 0.8)
      .beginPath();
    vertices.forEach((v, i) => {
      if (i === 0) this.islandGraphics.moveTo(v.x, v.y);
      else this.islandGraphics.lineTo(v.x, v.y);
    });
    this.islandGraphics.closePath().strokePath();
  }

  private createReceiver(): void {
    const baseRadius = GameScene.BASE_RECEIVER_RADIUS * GameScene.PIXELS_PER_UNIT;
    const shrinkFactor = 1 - (this.level - 1) * 0.05;
    this.receiverRadius = baseRadius * shrinkFactor;

    this.receiverGlow = this.add.graphics({ x: this.centerX, y: this.centerY }).setDepth(8);
    this.receiverGraphics = this.add.graphics({ x: this.centerX, y: this.centerY }).setDepth(9);

    this.drawReceiver();
  }

  private drawReceiver(): void {
    this.receiverGlow.clear();
    for (let i = 5; i >= 1; i--) {
      const r = this.receiverRadius + i * 6;
      const alpha = 0.06 * i;
      this.receiverGlow
        .fillStyle(0xffffff, alpha)
        .fillCircle(0, 0, r);
    }

    this.receiverGraphics.clear();
    this.receiverGraphics
      .fillStyle(0xffffff, 0.15)
      .fillCircle(0, 0, this.receiverRadius);

    this.receiverGraphics
      .lineStyle(3, 0xffffff, 0.7)
      .strokeCircle(0, 0, this.receiverRadius);

    this.receiverGraphics
      .lineStyle(1, 0xffffff, 0.4)
      .strokeCircle(0, 0, this.receiverRadius * 0.7);

    this.receiverGraphics
      .lineStyle(1, 0xffffff, 0.25)
      .strokeCircle(0, 0, this.receiverRadius * 0.4);
  }

  private createPoleRing(): void {
    this.poleRingGraphics = this.add.graphics({ x: this.centerX, y: this.centerY }).setDepth(20);
  }

  private createFragments(): void {
    this.fragmentsCount = 30 + (this.level - 1) * 5;
    for (let i = 0; i < this.fragmentsCount; i++) {
      this.createFragment();
    }
  }

  private createFragment(): Fragment {
    const minR = 4 * GameScene.PIXELS_PER_UNIT;
    const maxR = 6 * GameScene.PIXELS_PER_UNIT;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(minR, maxR);
    const x = this.centerX + Math.cos(angle) * distance;
    const y = this.centerY + Math.sin(angle) * distance;

    const container = this.add.container(x, y).setDepth(10);
    const graphics = this.add.graphics();
    container.add(graphics);

    const vertexCount = Phaser.Math.Between(3, 6);
    const verts: Phaser.Math.Vector2[] = [];
    const avgSize = Phaser.Math.FloatBetween(8, 16);
    for (let i = 0; i < vertexCount; i++) {
      const va = (i / vertexCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      const vr = avgSize * Phaser.Math.FloatBetween(0.6, 1.3);
      verts.push(new Phaser.Math.Vector2(Math.cos(va) * vr, Math.sin(va) * vr));
    }

    const lightColor = new Phaser.Display.Color(200, 205, 215);
    const darkColor = new Phaser.Display.Color(70, 75, 85);
    const steps = 20;
    for (let si = 0; si < steps; si++) {
      const t = si / steps;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(lightColor, darkColor, steps, si);
      const offsetX = -avgSize + (t * avgSize * 2);
      graphics
        .fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 0.95)
        .beginPath();
      const clipStart = offsetX;
      const clipEnd = offsetX + (avgSize * 2 / steps) + 0.5;
      let started = false;
      for (let vi = 0; vi < verts.length; vi++) {
        const v = verts[vi];
        if (v.x >= clipStart - 1 && v.x <= clipEnd + 1) {
          if (!started) {
            graphics.moveTo(v.x, v.y);
            started = true;
          } else {
            graphics.lineTo(v.x, v.y);
          }
        }
      }
      if (started) graphics.closePath().fillPath();
    }

    graphics
      .lineStyle(1, 0x2a2a35, 0.9)
      .beginPath();
    verts.forEach((v, i) => {
      if (i === 0) graphics.moveTo(v.x, v.y);
      else graphics.lineTo(v.x, v.y);
    });
    graphics.closePath().strokePath();

    const bbox = this.getPolygonBounds(verts);
    const w = bbox.maxX - bbox.minX;
    const h = bbox.maxY - bbox.minY;
    this.physics.add.existing(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setCircle(Math.max(w, h) * 0.55, -w * 0.5 + verts[0].x, -h * 0.5 + verts[0].y);
    body.setCollideWorldBounds(false);
    body.setBounce(0.95, 0.95);
    body.setFriction(0, 0);

    const mass = Phaser.Math.FloatBetween(0.5, 2.0);
    body.mass = mass;

    const initVx = Phaser.Math.FloatBetween(-30, 30);
    const initVy = Phaser.Math.FloatBetween(-30, 30);
    body.setVelocity(initVx, initVy);

    container.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

    const fragment: Fragment = {
      container,
      graphics,
      body,
      mass,
      trail: [],
      trailTimer: 0,
      flashTimer: 0,
      isCollected: false,
      collisionFlash: null,
      attractLine: null
    };

    this.fragments.push(fragment);
    return fragment;
  }

  private getPolygonBounds(verts: Phaser.Math.Vector2[]): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    verts.forEach(v => {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    });
    return { minX, maxX, minY, maxY };
  }

  private createObstacles(): void {
    const count = Math.floor((this.level - 1) * 1.5);
    for (let i = 0; i < count; i++) {
      this.createObstacle();
    }
  }

  private createObstacle(): Obstacle {
    const minR = 2.5 * GameScene.PIXELS_PER_UNIT;
    const maxR = 3.5 * GameScene.PIXELS_PER_UNIT;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const distance = Phaser.Math.FloatBetween(minR, maxR);
    const baseX = this.centerX + Math.cos(angle) * distance;
    const baseY = this.centerY + Math.sin(angle) * distance;

    const container = this.add.container(baseX, baseY).setDepth(7);
    const graphics = this.add.graphics();
    container.add(graphics);

    const radius = 0.25 * GameScene.PIXELS_PER_UNIT;
    graphics
      .fillStyle(0x1a0a2a, 0.9)
      .fillCircle(0, 0, radius);

    graphics
      .lineStyle(2, 0x6622aa, 0.85)
      .strokeCircle(0, 0, radius);

    graphics
      .fillStyle(0x331155, 0.6)
      .fillCircle(-radius * 0.3, -radius * 0.3, radius * 0.4);

    this.physics.add.existing(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setCircle(radius, -radius, -radius);
    body.setImmovable(true);

    const obstacle: Obstacle = {
      container,
      graphics,
      body,
      baseX,
      baseY,
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      amplitudeX: Phaser.Math.FloatBetween(40, 80),
      amplitudeY: Phaser.Math.FloatBetween(30, 70),
      speed: 0.8 * GameScene.PIXELS_PER_UNIT / 60
    };

    this.obstacles.push(obstacle);
    return obstacle;
  }

  private switchPole(newPole: 'N' | 'S'): void {
    if (this.currentPole === newPole || this.isPlayingWinAnimation) return;
    this.currentPole = newPole;
    this.poleRingActive = true;
    this.poleRingTimer = 0;

    if (this.uiScene) {
      this.uiScene.updatePoleIndicator(newPole);
    }
  }

  private updatePoleRing(dt: number): void {
    if (!this.poleRingActive) return;
    this.poleRingTimer += dt;
    const duration = 0.3;
    const progress = Math.min(1, this.poleRingTimer / duration);

    const color = this.currentPole === 'N' ? 0x4488ff : 0xff4466;
    const innerColor = this.currentPole === 'N' ? 0xaaccff : 0xffaacc;

    this.poleRingGraphics.clear();

    const maxRadius = 220;
    const radius = 40 + progress * maxRadius;
    const alpha = (1 - progress) * 0.65;

    for (let i = 3; i >= 0; i--) {
      const r = radius - i * 12;
      const a = alpha * (1 - i * 0.18);
      if (r > 0) {
        this.poleRingGraphics
          .lineStyle(3, i === 0 ? innerColor : color, a)
          .strokeCircle(0, 0, r);
      }
    }

    const gradientRadius = 50 * (1 - progress * 0.5);
    for (let i = 10; i >= 1; i--) {
      const r = (gradientRadius / 10) * i;
      const a = (1 - progress) * 0.12 * (11 - i);
      this.poleRingGraphics
        .fillStyle(i > 5 ? innerColor : color, a)
        .fillCircle(0, 0, r);
    }

    if (progress >= 1) {
      this.poleRingActive = false;
      this.poleRingGraphics.clear();
    }
  }

  private updateMagneticForce(dt: number): void {
    const poleSign = this.currentPole === 'N' ? 1 : -1;
    const magneticStrength = 180000;
    const minDistanceSq = (GameScene.PIXELS_PER_UNIT * 0.5) ** 2;
    const maxForce = 2500;

    for (let i = 0; i < this.fragments.length; i++) {
      const f = this.fragments[i];
      if (f.isCollected) continue;

      const dx = this.centerX - f.container.x;
      const dy = this.centerY - f.container.y;
      const distanceSq = dx * dx + dy * dy;
      const dSq = Math.max(minDistanceSq, distanceSq);
      const distance = Math.sqrt(dSq);

      let forceMag = (magneticStrength * poleSign) / dSq;
      forceMag = Phaser.Math.Clamp(forceMag, -maxForce, maxForce);

      const invD = 1 / distance;
      const fx = forceMag * (dx * invD);
      const fy = forceMag * (dy * invD);

      f.body.velocity.x += (fx / f.mass) * dt;
      f.body.velocity.y += (fy / f.mass) * dt;

      const speedLimit = 420;
      const vSq = f.body.velocity.x ** 2 + f.body.velocity.y ** 2;
      if (vSq > speedLimit * speedLimit) {
        const s = speedLimit / Math.sqrt(vSq);
        f.body.velocity.x *= s;
        f.body.velocity.y *= s;
      }
    }
  }

  private checkFragmentCollisions(): void {
    for (let i = 0; i < this.fragments.length; i++) {
      const a = this.fragments[i];
      if (a.isCollected) continue;

      for (let j = i + 1; j < this.fragments.length; j++) {
        const b = this.fragments[j];
        if (b.isCollected) continue;

        const dx = b.container.x - a.container.x;
        const dy = b.container.y - a.container.y;
        const distSq = dx * dx + dy * dy;
        const ar = (a.body as any).radius || 12;
        const br = (b.body as any).radius || 12;
        const minDist = ar + br;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          const totalMass = a.mass + b.mass;
          a.container.x -= nx * overlap * (b.mass / totalMass);
          a.container.y -= ny * overlap * (b.mass / totalMass);
          b.container.x += nx * overlap * (a.mass / totalMass);
          b.container.y += ny * overlap * (a.mass / totalMass);

          const dvx = a.body.velocity.x - b.body.velocity.x;
          const dvy = a.body.velocity.y - b.body.velocity.y;
          const dvDotN = dvx * nx + dvy * ny;

          if (dvDotN > 0) {
            const restitution = 0.9;
            const impulse = (-(1 + restitution) * dvDotN) / (1 / a.mass + 1 / b.mass);

            a.body.velocity.x += (impulse / a.mass) * nx;
            a.body.velocity.y += (impulse / a.mass) * ny;
            b.body.velocity.x -= (impulse / b.mass) * nx;
            b.body.velocity.y -= (impulse / b.mass) * ny;

            this.triggerCollisionFlash(a, b);
          }
        }
      }
    }
  }

  private triggerCollisionFlash(a: Fragment, b: Fragment): void {
    const mx = (a.container.x + b.container.x) * 0.5;
    const my = (a.container.y + b.container.y) * 0.5;

    [a, b].forEach(f => {
      if (!f.collisionFlash) {
        f.collisionFlash = this.add.graphics().setDepth(12);
      }
      f.collisionFlash.clear();
      const r = ((f.body as any).radius || 12) * 1.8;
      f.collisionFlash
        .x = f.container.x;
      f.collisionFlash.y = f.container.y;
      for (let i = 4; i >= 1; i--) {
        f.collisionFlash
          .fillStyle(0xffffee, 0.18 * i)
          .fillCircle(0, 0, r * (i / 4));
      }
      f.flashTimer = 0.1;
    });
  }

  private updateFlashes(dt: number): void {
    for (const f of this.fragments) {
      if (f.flashTimer > 0) {
        f.flashTimer -= dt;
        const t = Math.max(0, f.flashTimer / 0.1);
        if (f.collisionFlash) {
          f.collisionFlash.clear();
          const r = ((f.body as any).radius || 12) * 1.8;
          for (let i = 4; i >= 1; i--) {
            f.collisionFlash
              .fillStyle(0xffffee, 0.18 * i * t)
              .fillCircle(0, 0, r * (i / 4));
          }
          f.collisionFlash.x = f.container.x;
          f.collisionFlash.y = f.container.y;
        }
        if (f.flashTimer <= 0 && f.collisionFlash) {
          f.collisionFlash.clear();
        }
      }
    }
  }

  private checkObstacleCollisions(): void {
    for (const o of this.obstacles) {
      const or = (o.body as any).radius || (0.25 * GameScene.PIXELS_PER_UNIT);
      for (const f of this.fragments) {
        if (f.isCollected) continue;

        const dx = f.container.x - o.container.x;
        const dy = f.container.y - o.container.y;
        const distSq = dx * dx + dy * dy;
        const fr = (f.body as any).radius || 12;
        const minDist = or + fr;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;

          f.container.x += nx * overlap;
          f.container.y += ny * overlap;

          f.body.velocity.x *= 0.7;
          f.body.velocity.y *= 0.7;

          const vn = f.body.velocity.x * nx + f.body.velocity.y * ny;
          if (vn < 0) {
            f.body.velocity.x -= 2 * vn * nx;
            f.body.velocity.y -= 2 * vn * ny;
          }
        }
      }
    }
  }

  private updateObstacles(time: number): void {
    for (const o of this.obstacles) {
      const t = time * 0.001 * o.speed + o.phase;
      o.container.x = o.baseX + Math.sin(t) * o.amplitudeX;
      o.container.y = o.baseY + Math.sin(t * 1.3) * o.amplitudeY;
    }
  }

  private updateFragmentRotation(): void {
    for (const f of this.fragments) {
      if (f.isCollected) continue;
      const speed = Math.sqrt(f.body.velocity.x ** 2 + f.body.velocity.y ** 2);
      const rotSpeed = speed * 0.003;
      f.container.rotation += rotSpeed * (1 / 60);
    }
  }

  private updateTrails(dt: number): void {
    for (const f of this.fragments) {
      if (f.isCollected) continue;
      f.trailTimer += dt;
      if (f.trailTimer >= 1 / 60) {
        f.trailTimer = 0;
        const g = this.add.graphics().setDepth(9);
        const alpha = 0.35;
        const r = ((f.body as any).radius || 10) * 0.55;
        g.x = f.container.x;
        g.y = f.container.y;
        g
          .fillStyle(0xbbbbcc, alpha)
          .fillCircle(0, 0, r);
        f.trail.push(g);
      }

      const maxLife = 0.5;
      const fadePerFrame = dt / maxLife;
      for (let ti = f.trail.length - 1; ti >= 0; ti--) {
        const t = f.trail[ti];
        const currentAlpha = (t as any)._trailAlpha !== undefined ? (t as any)._trailAlpha : 1;
        const newAlpha = currentAlpha - fadePerFrame;
        if (newAlpha <= 0) {
          t.destroy();
          f.trail.splice(ti, 1);
        } else {
          (t as any)._trailAlpha = newAlpha;
          t.setAlpha(newAlpha * 0.6);
        }
      }
    }
  }

  private updateAttractLines(): void {
    for (const f of this.fragments) {
      if (f.isCollected) {
        if (f.attractLine) {
          f.attractLine.destroy();
          f.attractLine = null;
        }
        continue;
      }

      const dx = this.centerX - f.container.x;
      const dy = this.centerY - f.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = this.receiverRadius + 2.5 * GameScene.PIXELS_PER_UNIT;

      if (dist < threshold) {
        if (!f.attractLine) {
          f.attractLine = this.add.graphics().setDepth(11);
        }
        f.attractLine.clear();

        const nx = dx / dist;
        const ny = dy / dist;
        const lineStartDist = Math.max(0, dist - 2 * GameScene.PIXELS_PER_UNIT);
        const sx = f.container.x + nx * lineStartDist;
        const sy = f.container.y + ny * lineStartDist;
        const ex = f.container.x + nx * dist * 0.92;
        const ey = f.container.y + ny * dist * 0.92;

        const proximity = 1 - Math.max(0, (dist - this.receiverRadius) / (2.5 * GameScene.PIXELS_PER_UNIT));
        const alpha = 0.35 + proximity * 0.55;

        f.attractLine
          .lineStyle(1.5, 0xffffff, alpha)
          .beginPath()
          .moveTo(sx - this.centerX, sy - this.centerY);

        const segments = 8;
        for (let si = 1; si <= segments; si++) {
          const t = si / segments;
          const px = sx + (ex - sx) * t + Math.sin(t * Math.PI * 2 + dist * 0.01) * 1.5;
          const py = sy + (ey - sy) * t;
          f.attractLine.lineTo(px - this.centerX, py - this.centerY);
        }
        f.attractLine.strokePath();

        f.attractLine.x = this.centerX;
        f.attractLine.y = this.centerY;
      } else {
        if (f.attractLine) {
          f.attractLine.destroy();
          f.attractLine = null;
        }
      }
    }
  }

  private checkCollection(): void {
    if (this.isLevelComplete) return;

    for (const f of this.fragments) {
      if (f.isCollected) continue;
      const dx = f.container.x - this.centerX;
      const dy = f.container.y - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.receiverRadius) {
        f.isCollected = true;
        f.body.setEnable(false);
        if (f.attractLine) {
          f.attractLine.destroy();
          f.attractLine = null;
        }
        this.collectAnimQueue.push(f);
        this.collectedCount++;
        this.updateProgressUI();

        if (this.collectedCount / this.fragmentsCount >= 0.8) {
          this.triggerLevelComplete();
        }
      }
    }
  }

  private updateProgressUI(): void {
    const percent = (this.collectedCount / this.fragmentsCount) * 100;
    if (this.uiScene) {
      this.uiScene.updateProgress(percent);
    }
  }

  private triggerLevelComplete(): void {
    this.isLevelComplete = true;
    this.isReceiverPulsing = true;
    this.receiverPulseTimer = 0;
  }

  private updateReceiverPulse(dt: number): void {
    if (!this.isReceiverPulsing) return;
    this.receiverPulseTimer += dt;
    const freq = 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.receiverPulseTimer * Math.PI * 2 * freq);

    this.receiverGraphics.clear();
    const baseAlpha = 0.15 + pulse * 0.35;
    const lineAlpha = 0.5 + pulse * 0.5;
    this.receiverGraphics
      .fillStyle(0xffffff, baseAlpha)
      .fillCircle(0, 0, this.receiverRadius);

    this.receiverGraphics
      .lineStyle(3 + pulse * 2, 0xffffff, lineAlpha)
      .strokeCircle(0, 0, this.receiverRadius);

    this.receiverGraphics
      .lineStyle(1.5, 0xffffff, lineAlpha * 0.7)
      .strokeCircle(0, 0, this.receiverRadius * 0.7);

    this.receiverGraphics
      .lineStyle(1, 0xffffff, lineAlpha * 0.45)
      .strokeCircle(0, 0, this.receiverRadius * 0.4);

    if (!this.isPlayingWinAnimation) {
      this.collectAnimTimer += dt;
      if (this.collectAnimTimer > 0.08 && this.collectAnimQueue.length > 0) {
        this.collectAnimTimer = 0;
        const f = this.collectAnimQueue.shift()!;
        this.tweens.add({
          targets: f.container,
          x: this.centerX,
          y: this.centerY,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 350,
          ease: 'Cubic.In',
          onComplete: () => {
            if (f.collisionFlash) f.collisionFlash.destroy();
            for (const tg of f.trail) tg.destroy();
            f.graphics.destroy();
            f.container.destroy();
          }
        });
      }

      if (this.collectAnimQueue.length === 0) {
        const allCollected = this.fragments.every(f => f.isCollected || f.container.scaleX <= 0.01);
        if (allCollected) {
          this.startWinAnimation();
        }
      }
    }
  }

  private startWinAnimation(): void {
    this.isPlayingWinAnimation = true;
    this.winAnimationTimer = 0;
    this.winSphereAngle = 0;

    this.winSphere = this.add.graphics({ x: this.centerX, y: this.centerY }).setDepth(50);
  }

  private updateWinAnimation(dt: number): void {
    if (!this.isPlayingWinAnimation) return;
    this.winAnimationTimer += dt;
    this.winSphereAngle += dt * 4;

    if (this.winSphere) {
      this.winSphere.clear();
      const phase = Math.min(1, this.winAnimationTimer / 0.7);
      const r = this.receiverRadius * 0.3 * (0.3 + phase * 0.7);

      for (let i = 8; i >= 1; i--) {
        const ir = r + Math.sin(this.winSphereAngle + i * 0.3) * 3;
        const c = Phaser.Display.Color.HSVToRGB((this.winSphereAngle * 0.1 + i * 0.12) % 1, 0.85, 1);
        this.winSphere
          .fillStyle(c.color, 0.08 * i * (1 - Math.max(0, (this.winAnimationTimer - 1.2) / 0.8)))
          .fillCircle(0, 0, ir * (i / 8));
      }

      const innerColor = Phaser.Display.Color.HSVToRGB((this.winSphereAngle * 0.15) % 1, 1, 1);
      this.winSphere
        .fillStyle(innerColor.color, 0.9 * (1 - Math.max(0, (this.winAnimationTimer - 1.2) / 0.8)))
        .fillCircle(0, 0, r * 0.5);
    }

    if (this.winAnimationTimer >= 1.0 && this.winParticles.length === 0) {
      this.spawnWinParticles();
    }

    this.updateWinParticles(dt);

    if (this.winAnimationTimer >= 2.0) {
      this.nextLevel();
    }
  }

  private spawnWinParticles(): void {
    const count = 80;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.1, 0.1);
      const speed = Phaser.Math.FloatBetween(120, 280);
      const hue = (i / count) % 1;
      const color = Phaser.Display.Color.HSVToRGB(hue, 1, 1);
      this.winParticles.push({
        x: this.centerX,
        y: this.centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: Phaser.Math.FloatBetween(3, 8),
        color: color.color
      });
    }

    for (let i = 0; i < 40; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(40, 120);
      const hue = Phaser.Math.FloatBetween(0, 1);
      const color = Phaser.Display.Color.HSVToRGB(hue, 0.9, 1);
      this.winParticles.push({
        x: this.centerX,
        y: this.centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: Phaser.Math.FloatBetween(2, 5),
        color: color.color
      });
    }
  }

  private updateWinParticles(dt: number): void {
    const pg = this.add.graphics().setDepth(49);
    for (let i = this.winParticles.length - 1; i >= 0; i--) {
      const p = this.winParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt * 1.1;

      if (p.life <= 0) {
        this.winParticles.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, p.life / p.maxLife);
      const sr = p.size * (0.5 + alpha * 0.5);
      pg
        .fillStyle(p.color, alpha * 0.9)
        .fillCircle(p.x, p.y, sr);

      pg
        .fillStyle(p.color, alpha * 0.35)
        .fillCircle(p.x, p.y, sr * 1.8);
    }

    this.time.delayedCall(16, () => pg.destroy());
  }

  private nextLevel(): void {
    if (this.level >= 5) {
      this.cleanupLevel();
      this.level = 1;
    } else {
      this.cleanupLevel();
      this.level++;
    }
    this.setupLevel();
  }

  private cleanupLevel(): void {
    for (const f of this.fragments) {
      if (f.collisionFlash) f.collisionFlash.destroy();
      for (const tg of f.trail) tg.destroy();
      if (f.attractLine) f.attractLine.destroy();
      f.graphics.destroy();
      f.container.destroy();
    }
    this.fragments = [];

    for (const o of this.obstacles) {
      o.graphics.destroy();
      o.container.destroy();
    }
    this.obstacles = [];

    if (this.winSphere) {
      this.winSphere.destroy();
      this.winSphere = null;
    }
    this.winParticles = [];

    this.poleRingGraphics.clear();
  }

  private setupLevel(): void {
    this.collectedCount = 0;
    this.isLevelComplete = false;
    this.isPlayingWinAnimation = false;
    this.isReceiverPulsing = false;
    this.winAnimationTimer = 0;
    this.poleRingActive = false;
    this.poleRingTimer = 0;
    this.collectAnimQueue = [];
    this.collectAnimTimer = 0;
    this.currentPole = 'N';

    this.createReceiver();
    this.createFragments();
    this.createObstacles();

    if (this.uiScene) {
      this.uiScene.updateLevel(this.level);
      this.uiScene.updateProgress(0);
      this.uiScene.updatePoleIndicator(this.currentPole);
    }
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 30);

    if (Phaser.Input.Keyboard.JustDown(this.keyboardLeft)) {
      this.switchPole('N');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyboardRight)) {
      this.switchPole('S');
    }

    this.islandAngle += 0.02 * dt * 60;
    this.island.setRotation(this.islandAngle);

    this.updatePoleRing(dt);

    if (!this.isPlayingWinAnimation) {
      this.updateMagneticForce(dt);
      this.updateObstacles(time);
      this.checkFragmentCollisions();
      this.checkObstacleCollisions();
      this.updateFragmentRotation();
      this.updateTrails(dt);
      this.updateAttractLines();
      this.updateFlashes(dt);
      this.checkCollection();
    }

    this.updateReceiverPulse(dt);
    this.updateWinAnimation(dt);
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}
