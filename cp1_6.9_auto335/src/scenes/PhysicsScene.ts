import Phaser from 'phaser';
import { GameData } from '../main';
import { Direction, Repairable } from '../types/GameTypes';
import { createGearTexture, createArrowTexture, createWoodTexture, createShardTexture } from '../utils/TextureFactory';
import { ParticleManager } from '../utils/ParticleManager';
import { TrailRenderer } from '../utils/TrailRenderer';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const JUMP_HEIGHT = 60;
const JUMP_DURATION = 300;
const GEAR_RADIUS = 10;
const AFTERIMAGE_INTERVAL = 200;
const FPS_SAMPLE_INTERVAL = 500;

export class PhysicsScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Image;
  private playerGlow!: Phaser.GameObjects.Arc;
  private playerPlatform!: { x: number; y: number };
  private isJumping: boolean = false;
  private arrowButtons: Map<Direction, Phaser.GameObjects.Image> = new Map();

  private gearGroups: Phaser.GameObjects.Image[][] = [];
  private pendulum!: {
    pivot: Phaser.GameObjects.Arc;
    rod: Phaser.GameObjects.Line;
    bob: Phaser.GameObjects.Image;
    angle: number;
    angularVel: number;
  };
  private spring!: {
    body: Phaser.GameObjects.Rectangle;
    coils: Phaser.GameObjects.Graphics;
    hits: number;
    repaired: boolean;
  };

  private repairables: Repairable[] = [];

  private particleManager!: ParticleManager;
  private trailRenderer!: TrailRenderer;
  private lastAfterimageTime: number = 0;

  private platforms: { x: number; y: number; w: number; h: number }[] = [];
  private currentPlatformIndex: number = 0;

  private lastFpsSample: number = 0;
  private frameCount: number = 0;

  private highlightTimer: number = 0;

  constructor() {
    super({ key: 'PhysicsScene' });
  }

  preload(): void {
    this.load.on('complete', () => {
      this.createTextures();
    });
  }

  private createTextures(): void {
    createGearTexture(this, 'playerGear', 10, 12, 0xffd700, 0xfff8dc);
    createGearTexture(this, 'gearLarge', 20, 16, 0x8d6e63, 0xbcaaa4);
    createGearTexture(this, 'gearMedium', 15, 14, 0x8d6e63, 0xbcaaa4);
    createGearTexture(this, 'gearSmall', 12, 12, 0x8d6e63, 0xbcaaa4);
    createArrowTexture(this, 'arrowUp', 'up', 0xffffff);
    createArrowTexture(this, 'arrowDown', 'down', 0xffffff);
    createArrowTexture(this, 'arrowLeft', 'left', 0xffffff);
    createArrowTexture(this, 'arrowRight', 'right', 0xffffff);
    createWoodTexture(this, 'woodFloor', WORLD_WIDTH, 120);
    createShardTexture(this, 'goldShard');
  }

  create(): void {
    GameData.reset();

    this.cameras.main.setBackgroundColor('#3E2723');

    this.particleManager = new ParticleManager(this);
    this.trailRenderer = new TrailRenderer(this);

    this.createBackground();
    this.createPlatforms();
    this.createMechanisms();
    this.createPlayer();
    this.createArrowButtons();
    this.createInputHandlers();

    this.scale.on('resize', this.onResize, this);
    this.events.on('resize', this.onResize, this);
  }

  private createBackground(): void {
    const wood = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT - 40, 'woodFloor');
    wood.setAlpha(0.3);
    wood.setDepth(0);
    wood.setDisplaySize(WORLD_WIDTH, 80);

    const border = this.add.graphics();
    border.lineStyle(4, 0x5d4037, 0.8);
    border.strokeRoundedRect(20, 20, WORLD_WIDTH - 40, WORLD_HEIGHT - 40, 8);
    border.setDepth(0);

    this.particleManager.createDustParticles(WORLD_WIDTH, WORLD_HEIGHT);
  }

  private createPlatforms(): void {
    this.platforms = [
      { x: 200, y: 480, w: 160, h: 16 },
      { x: 400, y: 400, w: 160, h: 16 },
      { x: 600, y: 320, w: 160, h: 16 },
      { x: 300, y: 240, w: 140, h: 16 },
      { x: 550, y: 160, w: 140, h: 16 }
    ];

    this.platforms.forEach((p, i) => {
      const graphics = this.add.graphics();
      graphics.fillStyle(0x6d4c41, 1);
      graphics.fillRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 4);
      graphics.lineStyle(2, 0x8d6e63, 0.8);
      graphics.strokeRoundedRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 4);
      graphics.setDepth(2);
      graphics.setData('index', i);
    });
  }

  private createMechanisms(): void {
    this.createGearGroups();
    this.createPendulum();
    this.createSpring();
  }

  private createGearGroups(): void {
    const groupPositions = [
      { cx: 150, cy: 150 },
      { cx: 400, cy: 80 },
      { cx: 650, cy: 450 }
    ];

    groupPositions.forEach((gp, gi) => {
      const gears: Phaser.GameObjects.Image[] = [];
      const offsets = [
        { dx: 0, dy: 0, size: 'large', dir: 1 },
        { dx: 40, dy: -35, size: 'medium', dir: -1 },
        { dx: -40, dy: -35, size: 'small', dir: -1 },
        { dx: 0, dy: -70, size: 'small', dir: 1 }
      ];

      offsets.forEach((off, oi) => {
        const key = `gear${off.size.charAt(0).toUpperCase() + off.size.slice(1)}`;
        const gear = this.add.image(gp.cx + off.dx, gp.cy + off.dy, key);
        gear.setDepth(2);
        gear.setData('groupIndex', gi);
        gear.setData('rotDir', off.dir);
        gear.setData('rotSpeed', 0.5 + oi * 0.3);
        gear.setData('baseAngle', Math.random() * Math.PI * 2);
        gears.push(gear);
      });

      this.gearGroups.push(gears);
      this.repairables.push({
        id: `gears_${gi}`,
        type: 'gear',
        repaired: false,
        repairCount: 0,
        requiredHits: 1,
        x: gp.cx,
        y: gp.cy
      });
    });
  }

  private createPendulum(): void {
    const pivotX = 100;
    const pivotY = 300;
    const rodLength = 100;

    const pivot = this.add.circle(pivotX, pivotY, 6, 0x5d4037);
    pivot.setStrokeStyle(2, 0x8d6e63);
    pivot.setDepth(2);

    const bobX = pivotX;
    const bobY = pivotY + rodLength;

    const rod = this.add.line(0, 0, pivotX, pivotY, bobX, bobY, 0x8d6e63, 1);
    rod.setLineWidth(3);
    rod.setDepth(1);
    rod.setOrigin(0, 0);

    const bob = this.add.image(bobX, bobY, 'gearLarge');
    bob.setScale(0.8);
    bob.setDepth(2);

    this.pendulum = {
      pivot,
      rod,
      bob,
      angle: 0.3,
      angularVel: 0
    };

    this.repairables.push({
      id: 'pendulum_0',
      type: 'pendulum',
      repaired: false,
      repairCount: 0,
      requiredHits: 1,
      x: bobX,
      y: bobY
    });
  }

  private createSpring(): void {
    const cx = 700;
    const cy = 200;

    const body = this.add.rectangle(cx, cy, 40, 60, 0x6d4c41);
    body.setStrokeStyle(2, 0x8d6e63);
    body.setDepth(2);

    const coils = this.add.graphics();
    this.drawSpringCoils(coils, cx, cy, 0.5);
    coils.setDepth(3);

    this.spring = {
      body,
      coils,
      hits: 0,
      repaired: false
    };

    this.repairables.push({
      id: 'spring_0',
      type: 'spring',
      repaired: false,
      repairCount: 0,
      requiredHits: 3,
      x: cx,
      y: cy
    });
  }

  private drawSpringCoils(g: Phaser.GameObjects.Graphics, cx: number, cy: number, health: number): void {
    g.clear();
    const color = health < 0.33 ? 0xe53935 : health < 0.66 ? 0xffa726 : 0x43a047;
    g.lineStyle(2, color, 1);

    const amplitude = 12;
    const segH = 10;
    const startY = cy - 25;

    g.beginPath();
    for (let i = 0; i <= 5; i++) {
      const y = startY + i * segH;
      const x = cx + (i % 2 === 0 ? -amplitude : amplitude);
      if (i === 0) {
        g.moveTo(cx, y);
      } else {
        g.lineTo(x, y);
      }
    }
    g.lineTo(cx, startY + 5 * segH + 5);
    g.strokePath();
  }

  private createPlayer(): void {
    const startPlat = this.platforms[0];
    this.playerPlatform = { x: startPlat.x, y: startPlat.y - startPlat.h / 2 - GEAR_RADIUS };
    this.currentPlatformIndex = 0;

    this.player = this.add.container(this.playerPlatform.x, this.playerPlatform.y);
    this.player.setDepth(6);

    this.playerGlow = this.add.circle(0, 0, 20, 0xffd700, 0.2);
    this.playerGlow.setDepth(5);

    this.playerSprite = this.add.image(0, 0, 'playerGear');
    this.playerSprite.setDepth(7);

    this.player.add([this.playerGlow, this.playerSprite]);
  }

  private createArrowButtons(): void {
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    const offsets: Record<Direction, { dx: number; dy: number }> = {
      up: { dx: 0, dy: -50 },
      down: { dx: 0, dy: 50 },
      left: { dx: -50, dy: 0 },
      right: { dx: 50, dy: 0 }
    };
    const keys: Record<Direction, string> = {
      up: 'arrowUp',
      down: 'arrowDown',
      left: 'arrowLeft',
      right: 'arrowRight'
    };

    dirs.forEach(d => {
      const off = offsets[d];
      const btn = this.add.image(
        this.player.x + off.dx,
        this.player.y + off.dy,
        keys[d]
      );
      btn.setDepth(10);
      btn.setInteractive({ useHandCursor: true });
      btn.setAlpha(0.6);

      btn.on('pointerover', () => btn.setAlpha(1));
      btn.on('pointerout', () => btn.setAlpha(0.6));
      btn.on('pointerdown', () => {
        btn.setScale(0.9);
        this.onArrowClick(d);
      });
      btn.on('pointerup', () => btn.setScale(1));

      this.arrowButtons.set(d, btn);
    });
  }

  private updateArrowPositions(): void {
    const offsets: Record<Direction, { dx: number; dy: number }> = {
      up: { dx: 0, dy: -50 },
      down: { dx: 0, dy: 50 },
      left: { dx: -50, dy: 0 },
      right: { dx: 50, dy: 0 }
    };

    this.arrowButtons.forEach((btn, dir) => {
      const off = offsets[dir];
      btn.setPosition(this.player.x + off.dx, this.player.y + off.dy);
    });
  }

  private onArrowClick(direction: Direction): void {
    if (this.isJumping) return;

    const dirVec: Record<Direction, { dx: number; dy: number }> = {
      up: { dx: 0, dy: -1 },
      down: { dx: 0, dy: 1 },
      left: { dx: -1, dy: 0 },
      right: { dx: 1, dy: 0 }
    };

    const v = dirVec[direction];
    const targetPlat = this.findTargetPlatform(v.dx, v.dy);

    if (targetPlat) {
      this.jumpTo(targetPlat);
    } else {
      this.bumpDirection(v.dx, v.dy);
    }
  }

  private findTargetPlatform(dx: number, dy: number): { x: number; y: number; w: number; h: number } | null {
    const current = this.platforms[this.currentPlatformIndex];
    let bestMatch: { x: number; y: number; w: number; h: number } | null = null;
    let bestScore = Infinity;

    this.platforms.forEach((p, i) => {
      if (i === this.currentPlatformIndex) return;

      const sameRow = dy === 0;
      const sameCol = dx === 0;

      let valid = false;
      if (dx > 0 && p.x > current.x + 30) valid = true;
      if (dx < 0 && p.x < current.x - 30) valid = true;
      if (dy > 0 && p.y > current.y + 30) valid = true;
      if (dy < 0 && p.y < current.y - 30) valid = true;

      if (sameRow && Math.abs(p.y - current.y) > 80) valid = false;
      if (sameCol && Math.abs(p.x - current.x) > 120) valid = false;

      if (!valid) return;

      const dist = Math.hypot(p.x - current.x, p.y - current.y);
      if (dist < bestScore) {
        bestScore = dist;
        bestMatch = p;
      }
    });

    return bestMatch;
  }

  private jumpTo(target: { x: number; y: number; w: number; h: number }): void {
    this.isJumping = true;
    const startX = this.player.x;
    const startY = this.player.y;
    const endX = target.x;
    const endY = target.y - target.h / 2 - GEAR_RADIUS;
    const jumpDur = JUMP_DURATION / Math.max(0.5, Math.abs(GameData.timeScale));

    this.particleManager.createJumpTrail(startX, startY);

    const jumpTween = this.tweens.add({
      targets: this.player,
      x: endX,
      duration: jumpDur,
      ease: 'Quad.Out',
      yoyo: false,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const progress = tween.getValue() ?? 0;
        const arcHeight = JUMP_HEIGHT * 4 * progress * (1 - progress);
        const baseY = startY + (endY - startY) * progress;
        this.player.y = baseY - arcHeight;
        this.playerSprite.angle += 6 * Math.sign(GameData.timeScale || 1);
        this.updateArrowPositions();
        this.checkCollisions();
      },
      onComplete: () => {
        this.isJumping = false;
        this.player.setPosition(endX, endY);
        this.playerPlatform = { x: endX, y: endY };
        this.currentPlatformIndex = this.platforms.indexOf(target);
        this.particleManager.createJumpTrail(endX, endY);
        this.updateArrowPositions();
        this.checkCollisions();
      }
    });
  }

  private bumpDirection(dx: number, dy: number): void {
    const bumpDist = 15;
    const startX = this.player.x;
    const startY = this.player.y;

    this.tweens.add({
      targets: this.player,
      x: startX + dx * bumpDist,
      y: startY + dy * bumpDist,
      duration: 150,
      ease: 'Cubic.Out',
      yoyo: true,
      onUpdate: () => this.updateArrowPositions()
    });
  }

  private createInputHandlers(): void {
    this.input.keyboard!.on('keydown-Q', () => this.changeTimeScale(1));
    this.input.keyboard!.on('keydown-E', () => this.changeTimeScale(-1));

    this.input.keyboard!.on('keydown-W', () => this.onArrowClick('up'));
    this.input.keyboard!.on('keydown-S', () => this.onArrowClick('down'));
    this.input.keyboard!.on('keydown-A', () => this.onArrowClick('left'));
    this.input.keyboard!.on('keydown-D', () => this.onArrowClick('right'));
    this.input.keyboard!.on('keydown-UP', () => this.onArrowClick('up'));
    this.input.keyboard!.on('keydown-DOWN', () => this.onArrowClick('down'));
    this.input.keyboard!.on('keydown-LEFT', () => this.onArrowClick('left'));
    this.input.keyboard!.on('keydown-RIGHT', () => this.onArrowClick('right'));
  }

  private changeTimeScale(delta: number): void {
    const newScale = Phaser.Math.Clamp(GameData.timeScale + delta, -2, 2);
    if (newScale === GameData.timeScale || newScale === 0) {
      const adj = delta > 0 ? (GameData.timeScale === 0 ? 1 : 0) : (GameData.timeScale === 0 ? -1 : 0);
      if (adj === 0) return;
      GameData.timeScale = adj;
    } else {
      GameData.timeScale = newScale;
    }

    if (GameData.timeScale === 0) {
      GameData.timeScale = delta > 0 ? 1 : -1;
    }

    const isAccel = GameData.timeScale > 0;
    this.particleManager.createTimeShiftVignette(isAccel, () => {});

    if (GameData.timeScale === -2) {
      this.trailRenderer.start();
    } else {
      this.trailRenderer.stop();
    }

    this.events.emit('timeScaleChanged', GameData.timeScale);
  }

  private checkCollisions(): void {
    const px = this.player.x;
    const py = this.player.y;
    const pr = GEAR_RADIUS;

    this.repairables.forEach((r) => {
      if (r.repaired) return;

      const dist = Math.hypot(r.x - px, r.y - py);
      const hitRadius = r.type === 'gear' ? 50 : r.type === 'pendulum' ? 35 : 40;

      if (dist < hitRadius + pr) {
        this.handleRepairHit(r);
      }
    });
  }

  private handleRepairHit(r: Repairable): void {
    if (r.type === 'spring' && GameData.timeScale !== 2) {
      return;
    }

    r.repairCount++;
    const progress = r.repairCount / r.requiredHits;

    if (r.type === 'spring') {
      this.spring.hits = r.repairCount;
      this.drawSpringCoils(this.spring.coils, this.spring.body.x, this.spring.body.y, progress);
      this.spring.body.setScale(1 + (r.repairCount / r.requiredHits) * 0.1);
    }

    if (r.repairCount >= r.requiredHits) {
      r.repaired = true;
      this.particleManager.createRepairPulse(r.x, r.y);
      for (let i = 0; i < 3; i++) {
        this.particleManager.createGoldShard(
          r.x + (Math.random() - 0.5) * 20,
          r.y + (Math.random() - 0.5) * 20,
          'goldShard'
        );
      }
      GameData.repairedTargets++;
      GameData.repairProgress = (GameData.repairedTargets / GameData.totalTargets) * 100;
      this.events.emit('progressChanged', GameData.repairProgress);

      if (r.type === 'gear') {
        this.markGearsRepaired(r);
      } else if (r.type === 'pendulum') {
        this.pendulum.bob.setTint(0x43a047);
      } else if (r.type === 'spring') {
        this.spring.body.setStrokeStyle(3, 0x43a047);
      }
    }
  }

  private markGearsRepaired(r: Repairable): void {
    const idx = this.repairables.indexOf(r);
    if (idx < 3) {
      this.gearGroups[idx].forEach((g) => {
        g.setTint(0x43a047);
      });
    }
  }

  private onResize(): void {
    this.cameras.main.setSize(WORLD_WIDTH, WORLD_HEIGHT);
  }

  update(time: number, deltaMs: number): void {
    const baseDelta = 1 / 60;
    const scaledDelta = baseDelta * Math.abs(GameData.timeScale);
    const dirSign = Math.sign(GameData.timeScale) || 1;

    this.frameCount++;
    if (time - this.lastFpsSample > FPS_SAMPLE_INTERVAL) {
      const fps = (this.frameCount * 1000) / (time - this.lastFpsSample);
      GameData.fps = fps;
      this.particleManager.setFpsLow(fps < 50);
      this.frameCount = 0;
      this.lastFpsSample = time;
    }

    this.highlightTimer += deltaMs / 1000;
    this.updateHighlights();
    this.updateGearRotations(scaledDelta, dirSign);
    this.updatePendulum(scaledDelta, dirSign);

    if (GameData.timeScale === -2 && time - this.lastAfterimageTime > AFTERIMAGE_INTERVAL) {
      this.particleManager.createAfterimage(this.player.x, this.player.y, 'playerGear');
      this.trailRenderer.addPoint(this.player.x, this.player.y);
      this.lastAfterimageTime = time;
    }
    this.trailRenderer.update();

    if (!this.isJumping) {
      this.playerSprite.angle += 1 * dirSign;
    }
  }

  private updateHighlights(): void {
    const highlightAngle = (this.highlightTimer / 4) * Math.PI * 2;
    const hlColor = new Phaser.Display.Color(255, 255, 255, 60);

    this.gearGroups.forEach((group) => {
      group.forEach((gear) => {
        const gi = gear.getData('groupIndex');
        const rep = this.repairables[gi];
        if (rep && rep.repaired) {
          gear.clearTint();
          gear.setTint(0x43a047);
          return;
        }

        const intensity = 0.3 + 0.2 * Math.sin(highlightAngle + (gear.x + gear.y) * 0.01);
        const tint = Phaser.Display.Color.GetColor(
          Math.floor(141 + 114 * intensity),
          Math.floor(110 + 100 * intensity),
          Math.floor(99 + 80 * intensity)
        );
        gear.setTint(tint);
      });
    });
  }

  private updateGearRotations(delta: number, dirSign: number): void {
    this.gearGroups.forEach((group, gi) => {
      const rep = this.repairables[gi];
      const speedMult = rep && rep.repaired ? 1.5 : 1;

      group.forEach((gear) => {
        const baseSpeed = gear.getData('rotSpeed');
        const rotDir = gear.getData('rotDir');
        gear.angle += baseSpeed * rotDir * dirSign * speedMult * delta * 60;
      });
    });
  }

  private updatePendulum(delta: number, dirSign: number): void {
    if (!this.pendulum) return;

    const rep = this.repairables.find((r) => r.type === 'pendulum');
    const freqMult = rep && rep.repaired ? 1 : 0.7;

    const length = 100;
    const gravity = 980;
    const omega = Math.sqrt(gravity / length) * freqMult;

    const { angle, angularVel } = this.pendulum;
    const angularAcc = -Math.pow(omega, 2) * Math.sin(angle);
    const newAngularVel = angularVel + angularAcc * delta * dirSign;
    let newAngle = angle + newAngularVel * delta * dirSign;

    const dampedVel = newAngularVel * 0.998;
    this.pendulum.angle = newAngle;
    this.pendulum.angularVel = dampedVel;

    const bobX = this.pendulum.pivot.x + length * Math.sin(newAngle);
    const bobY = this.pendulum.pivot.y + length * Math.cos(newAngle);

    this.pendulum.bob.setPosition(bobX, bobY);
    this.pendulum.bob.angle += 2 * dirSign;
    this.pendulum.rod.setTo(
      this.pendulum.pivot.x,
      this.pendulum.pivot.y,
      bobX,
      bobY
    );

    if (rep) {
      rep.x = bobX;
      rep.y = bobY;
    }
  }
}
