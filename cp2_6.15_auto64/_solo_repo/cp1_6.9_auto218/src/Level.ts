import Phaser from 'phaser';
import { Player } from './Player';
import { Platform, MovableBox, Ground } from './Platform';
import { ResonancePoint } from './ResonancePoint';

interface LevelData {
  playerStart: { x: number; y: number };
  platforms: { x: number; y: number; w: number; h: number }[];
  boxes: { x: number; y: number; size: number }[];
  resonancePoints: { x: number; y: number }[];
  portal: { x: number; y: number };
}

const LEVELS: LevelData[] = [
  {
    playerStart: { x: 80, y: 520 },
    platforms: [
      { x: 220, y: 460, w: 120, h: 18 },
      { x: 420, y: 390, w: 140, h: 18 },
      { x: 620, y: 300, w: 110, h: 18 },
      { x: 300, y: 220, w: 100, h: 18 }
    ],
    boxes: [
      { x: 500, y: 540, size: 48 }
    ],
    resonancePoints: [
      { x: 260, y: 420 },
      { x: 490, y: 350 },
      { x: 340, y: 180 },
      { x: 670, y: 260 }
    ],
    portal: { x: 740, y: 250 }
  },
  {
    playerStart: { x: 60, y: 520 },
    platforms: [
      { x: 160, y: 470, w: 90, h: 16 },
      { x: 330, y: 400, w: 100, h: 16 },
      { x: 520, y: 460, w: 110, h: 16 },
      { x: 680, y: 370, w: 90, h: 16 },
      { x: 450, y: 270, w: 140, h: 16 },
      { x: 180, y: 220, w: 110, h: 16 },
      { x: 60, y: 340, w: 90, h: 16 }
    ],
    boxes: [
      { x: 240, y: 540, size: 44 },
      { x: 580, y: 540, size: 44 }
    ],
    resonancePoints: [
      { x: 190, y: 430 },
      { x: 570, y: 420 },
      { x: 720, y: 330 },
      { x: 520, y: 230 },
      { x: 230, y: 180 }
    ],
    portal: { x: 100, y: 300 }
  },
  {
    playerStart: { x: 70, y: 540 },
    platforms: [
      { x: 200, y: 500, w: 80, h: 14 },
      { x: 350, y: 450, w: 80, h: 14 },
      { x: 500, y: 400, w: 80, h: 14 },
      { x: 650, y: 350, w: 90, h: 14 },
      { x: 500, y: 260, w: 100, h: 14 },
      { x: 320, y: 210, w: 110, h: 14 },
      { x: 140, y: 280, w: 100, h: 14 },
      { x: 80, y: 160, w: 100, h: 14 },
      { x: 400, y: 100, w: 120, h: 14 },
      { x: 660, y: 180, w: 100, h: 14 }
    ],
    boxes: [
      { x: 290, y: 540, size: 42 },
      { x: 590, y: 540, size: 42 }
    ],
    resonancePoints: [
      { x: 230, y: 460 },
      { x: 530, y: 360 },
      { x: 690, y: 310 },
      { x: 180, y: 240 },
      { x: 700, y: 140 }
    ],
    portal: { x: 460, y: 60 }
  }
];

export class LevelScene extends Phaser.Scene {
  private player!: Player;
  private platforms: Phaser.GameObjects.Group;
  private movableBoxes: MovableBox[] = [];
  private resonancePoints: ResonancePoint[] = [];
  private ground!: Ground;
  private backgroundFissure!: Phaser.GameObjects.Graphics;
  private fissureRotation: number = 0;
  private fissureTime: number = 0;
  private portal!: Phaser.GameObjects.Container;
  private portalActive: boolean = false;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private currentLevel: number = 0;
  private transitioning: boolean = false;
  private flashOverlay!: Phaser.GameObjects.Rectangle;
  private cameraShakeTime: number = 0;
  private breakParticles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private worldWidth: number = 800;
  private worldHeight: number = 600;

  constructor() {
    super('LevelScene');
    this.platforms = {} as Phaser.GameObjects.Group;
  }

  create(): void {
    this.worldWidth = this.scale.width;
    this.worldHeight = this.scale.height;

    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.createBackground();
    this.platforms = this.add.group();
    this.loadLevel(this.currentLevel);
    this.createProgressBar();
    this.createFlashOverlay();
  }

  private createBackground(): void {
    const w = this.worldWidth;
    const h = this.worldHeight;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x18181f, 0x121218, 0x08080c, 0x050508, 1, 1, 1, 1);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(-10);

    this.backgroundFissure = this.add.graphics();
    this.backgroundFissure.setDepth(-5);
    this.drawFissurePattern(0);

    this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        this.fissureTime += 0.012;
        this.fissureRotation = Math.sin(this.fissureTime * 0.25) * 0.06 + this.fissureTime * 0.015;
        this.drawFissurePattern(this.fissureRotation);
      }
    });
  }

  private drawFissurePattern(rot: number): void {
    const g = this.backgroundFissure;
    const w = this.worldWidth;
    const h = this.worldHeight;
    const cx = w / 2;
    const cy = h / 2;
    g.clear();

    g.lineStyle(1, 0x2a2a35, 0.55);
    for (let layer = 0; layer < 2; layer++) {
      const r = rot * (layer === 0 ? 1 : -1.3) + layer * 0.7;
      for (let ray = 0; ray < 14; ray++) {
        const baseAngle = (ray / 14) * Math.PI * 2 + r;
        const startR = 120 + layer * 80;
        const endR = 520 + layer * 40;
        const segs = 7;
        g.beginPath();
        let started = false;
        let prevX = 0, prevY = 0;
        for (let s = 0; s <= segs; s++) {
          const t = s / segs;
          const dist = startR + (endR - startR) * t;
          const wobble = Math.sin(t * 7 + ray + layer * 3.1) * (18 + t * 28);
          const ang = baseAngle + wobble * 0.004 + Math.sin(t * 4 + ray) * 0.05;
          const x = cx + Math.cos(ang) * dist;
          const y = cy + Math.sin(ang) * dist;
          if (!started) {
            g.moveTo(x, y);
            started = true;
          } else {
            g.lineTo(x, y);
          }
          prevX = x; prevY = y;
        }
        g.strokePath();

        if (ray % 3 === 0) {
          g.lineStyle(1, 0x3a3a4a, 0.3);
          const branchStart = 0.35 + (ray % 5) * 0.08;
          const bx = cx + Math.cos(baseAngle + 0.02) * (startR + (endR - startR) * branchStart);
          const by = cy + Math.sin(baseAngle + 0.02) * (startR + (endR - startR) * branchStart);
          const branchAng = baseAngle + (ray % 2 === 0 ? 0.6 : -0.6);
          const branchLen = 90 + (ray % 4) * 40;
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(bx + Math.cos(branchAng) * branchLen, by + Math.sin(branchAng) * branchLen);
          g.strokePath();
          g.lineStyle(1, 0x2a2a35, 0.55);
        }
      }
    }

    g.lineStyle(1.2, 0x44445a, 0.2);
    for (let i = 0; i < 4; i++) {
      const rr = 140 + i * 95;
      g.beginPath();
      const steps = 72;
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * Math.PI * 2 + rot * (i % 2 === 0 ? 0.5 : -0.4);
        const wob = Math.sin(a * 5 + i) * 10 + Math.sin(a * 9 + i * 1.7) * 5;
        const rad = rr + wob;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad;
        if (s === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }
  }

  private loadLevel(index: number): void {
    const data = LEVELS[index % LEVELS.length];

    this.movableBoxes.forEach(b => b.destroy());
    this.movableBoxes = [];
    this.resonancePoints.forEach(r => r.destroy());
    this.resonancePoints = [];
    this.platforms.clear(true, true);
    this.breakParticles.forEach(p => p.destroy());
    this.breakParticles = [];
    if (this.portal) this.portal.destroy();
    if (this.ground) this.ground.destroy();
    if (this.player) this.player.destroy();

    this.ground = new Ground(this, this.worldWidth / 2, this.worldHeight - 28, this.worldWidth + 40, 56);
    this.platforms.add(this.ground);

    data.platforms.forEach(p => {
      const plat = new Platform(this, p.x + p.w / 2, p.y + p.h / 2, p.w, p.h);
      this.platforms.add(plat);
    });

    data.boxes.forEach(b => {
      const box = new MovableBox(this, b.x, b.y, b.size);
      this.movableBoxes.push(box);
    });

    data.resonancePoints.forEach(rp => {
      const point = new ResonancePoint(this, rp.x, rp.y);
      this.resonancePoints.push(point);
    });

    this.player = new Player(this, data.playerStart.x, data.playerStart.y);
    this.setupCollisions();

    this.createPortal(data.portal.x, data.portal.y);
    this.portalActive = false;
    this.transitioning = false;
    this.updateProgressUI();
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);
    this.movableBoxes.forEach(box => {
      this.physics.add.collider(box, this.platforms);
      this.physics.add.collider(box, this.movableBoxes.filter(b => b !== box));
      this.physics.add.collider(
        this.player,
        box,
        (_p, _b) => {
          const player = _p as Player;
          const b = _b as MovableBox;
          const px = player.x;
          const bx = b.x;
          const halfPW = player.displayWidth / 2;
          const halfBW = b.displayWidth / 2;
          const touchingRight = bx - halfBW - (px + halfPW);
          const touchingLeft = (px - halfPW) - (bx + halfBW);
          if (Math.abs(touchingRight) < 4) {
            player.setTouchingBox(b, 'right');
          } else if (Math.abs(touchingLeft) < 4) {
            player.setTouchingBox(b, 'left');
          }
        },
        () => {
          return true;
        }
      );
    });

    this.physics.add.overlap(this.player, this.portal as unknown as Phaser.Physics.Arcade.Sprite, () => {
      if (this.portalActive && !this.transitioning) {
        this.startPortalTransition();
      }
    });
  }

  private createPortal(x: number, y: number): void {
    this.portal = this.add.container(x, y);
    const w = 46;
    const h = 74;
    const key = `portal_${Phaser.Math.Between(0, 9999)}`;
    const g = this.add.graphics();

    g.fillGradientStyle(0x405070, 0x304060, 0x506090, 0x203050, 1, 1, 1, 1);
    g.fillRoundedRect(0, 0, w, h, 10);
    g.lineStyle(2, 0x99bbff, 0.6);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, 9);
    g.lineStyle(1, 0xccddff, 0.3);
    g.strokeRoundedRect(4, 4, w - 8, h - 8, 7);
    for (let i = 0; i < 3; i++) {
      g.lineStyle(0.6, 0x88aaff, 0.25);
      g.beginPath();
      const sx = w * 0.3, sy = 12 + i * 22;
      const ex = w * 0.7, ey = 28 + i * 22;
      const cx1 = w * 0.7, cy1 = 14 + i * 22;
      const cx2 = w * 0.3, cy2 = 24 + i * 22;
      g.moveTo(sx, sy);
      const steps = 12;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const it = 1 - t;
        const x = it * it * it * sx + 3 * it * it * t * cx1 + 3 * it * t * t * cx2 + t * t * t * ex;
        const y = it * it * it * sy + 3 * it * it * t * cy1 + 3 * it * t * t * cy2 + t * t * t * ey;
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    g.generateTexture(key, w, h);
    g.destroy();

    const frame = this.add.image(0, 0, key);
    frame.setOrigin(0.5);
    this.portal.add(frame);

    const innerKey = `portalInner_${Phaser.Math.Between(0, 9999)}`;
    const ig = this.add.graphics();
    ig.fillStyle(0xaaccff, 0.25);
    ig.fillRoundedRect(2, 2, w - 4, h - 4, 8);
    ig.generateTexture(innerKey, w, h);
    ig.destroy();
    const inner = this.add.image(0, 0, innerKey);
    inner.setOrigin(0.5);
    inner.setAlpha(0.5);
    this.portal.add(inner);

    this.tweens.add({
      targets: inner,
      alpha: { from: 0.35, to: 0.75 },
      scale: { from: 0.9, to: 1.05 },
      duration: 1800,
      ease: 'Sine.easeInOut',
      repeat: -1,
      yoyo: true
    });

    const portalBody = this.physics.add.staticImage(x, y, key);
    portalBody.setSize(w * 0.8, h * 0.85);
    portalBody.setVisible(false);
    (this.portal as any).bodyRef = portalBody;
  }

  private createProgressBar(): void {
    const barX = this.worldWidth - 230;
    const barY = this.worldHeight - 36;
    const barW = 200;
    const barH = 4;

    this.progressBar = this.add.graphics();
    this.progressBar.lineStyle(1, 0x505060, 0.8);
    this.progressBar.strokeRoundedRect(barX - 2, barY - 2, barW + 4, barH + 4, 2);
    this.progressBar.fillStyle(0x30303a, 0.8);
    this.progressBar.fillRoundedRect(barX, barY, barW, barH, 1);
    this.progressBar.setDepth(100);

    this.progressFill = this.add.graphics();
    this.progressFill.setDepth(101);
  }

  private updateProgressUI(): void {
    if (!this.progressFill) return;
    const total = this.resonancePoints.length;
    const lit = this.resonancePoints.filter(r => r.isLit).length;
    const ratio = total === 0 ? 0 : lit / total;

    const barX = this.worldWidth - 230;
    const barY = this.worldHeight - 36;
    const barW = 200;
    const barH = 4;
    const fillW = barW * ratio;

    this.progressFill.clear();
    if (fillW > 0) {
      this.progressFill.fillGradientStyle(0xffd870, 0xff9850, 0xb888ff, 0x8868ff, 1, 1, 1, 1);
      this.progressFill.fillRoundedRect(barX, barY, fillW, barH, 1);

      this.progressFill.lineStyle(1, 0xffffff, 0.5);
      this.progressFill.strokeRoundedRect(barX + 0.5, barY + 0.5, Math.max(1, fillW - 1), barH - 1, 1);
    }

    if (lit === total && total > 0) {
      this.activatePortal();
    }
  }

  private activatePortal(): void {
    if (this.portalActive) return;
    this.portalActive = true;

    if (this.portal) {
      this.portal.each((child: any) => {
        if (child.preFX) {
          try { child.preFX.addGlow(0xaaccff, 0.8, 18); } catch {}
        }
      });

      this.tweens.add({
        targets: this.portal,
        scale: { from: 1, to: 1.1 },
        duration: 700,
        ease: 'Sine.easeInOut',
        repeat: -1,
        yoyo: true
      });
    }

    this.cameraShakeTime = 0.35;
  }

  private createFlashOverlay(): void {
    this.flashOverlay = this.add.rectangle(
      this.worldWidth / 2,
      this.worldHeight / 2,
      this.worldWidth * 1.5,
      this.worldHeight * 1.5,
      0xffffff,
      0
    );
    this.flashOverlay.setDepth(200);
  }

  private startPortalTransition(): void {
    this.transitioning = true;

    this.tweens.add({
      targets: this.flashOverlay,
      alpha: { from: 0, to: 0.9 },
      duration: 150,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.cameras.main.setZoom(1.25);
        this.tweens.add({
          targets: this.flashOverlay,
          alpha: { from: 0.9, to: 0 },
          duration: 150,
          ease: 'Cubic.easeIn'
        });
        this.tweens.add({
          targets: this.cameras.main,
          zoom: 1,
          duration: 300,
          ease: 'Cubic.easeOut'
        });

        this.time.delayedCall(120, () => {
          this.doLevelBreak();
        });
      }
    });
  }

  private doLevelBreak(): void {
    const colors = [0xffd870, 0xff9850, 0xb888ff, 0x8868ff, 0x66ccff, 0xff88cc];
    const bKey = `break_${Phaser.Math.Between(0, 9999)}`;
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRect(0, 0, 6, 6);
    bg.generateTexture(bKey, 6, 6);
    bg.destroy();

    for (let i = 0; i < 3; i++) {
      const emitter = this.add.particles(
        this.worldWidth / 2 + Phaser.Math.FloatBetween(-100, 100),
        this.worldHeight / 2 + Phaser.Math.FloatBetween(-80, 80),
        bKey,
        {
          lifespan: 900,
          speed: { min: 80, max: 300 },
          scale: { start: 0.6, end: 0 },
          alpha: { start: 0.95, end: 0 },
          quantity: 25,
          angle: { min: 0, max: 360 },
          blendMode: 'ADD',
          tint: colors
        }
      );
      this.breakParticles.push(emitter);
    }

    this.cameras.main.shake(400, 0.008);

    this.time.delayedCall(600, () => {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (this.cameraShakeTime > 0) {
      this.cameraShakeTime -= delta / 1000;
      if (this.cameraShakeTime <= 0) {
        this.cameras.main.shake(300, 0.003);
      }
    }

    if (this.player) {
      (this.player as any).update(time, delta);
      this.player.setTouchingBox(null, 'left');
      this.player.setTouchingBox(null, 'right');
    }

    this.movableBoxes.forEach(box => (box as any).update(time, delta));

    this.resonancePoints.forEach(rp => {
      if ((rp as any).preUpdate) (rp as any).preUpdate(time, delta);
    });

    if (this.player && this.player.consumeInteractRequest()) {
      let activated = false;
      for (const rp of this.resonancePoints) {
        if (rp.tryActivate(this.player)) {
          activated = true;
          this.cameras.main.shake(120, 0.004);
          this.updateProgressUI();
          break;
        }
      }
    }
  }
}
