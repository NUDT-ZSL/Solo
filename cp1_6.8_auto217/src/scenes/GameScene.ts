import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { Player } from '../entities/Player';
import { LightTrail } from '../entities/LightTrail';

interface LevelConfig {
  trailColor: number;
  glowColor: number;
  platformColor: number;
  platformCount: number;
  obstacleCount: number;
  orbCount: number;
  trailDuration: number;
}

const LEVEL_CONFIGS: LevelConfig[] = [
  { trailColor: 0x8b5cf6, glowColor: 0xa78bfa, platformColor: 0x6d28d9, platformCount: 6, obstacleCount: 1, orbCount: 3, trailDuration: 4000 },
  { trailColor: 0x06b6d4, glowColor: 0x67e8f9, platformColor: 0x0e7490, platformCount: 7, obstacleCount: 2, orbCount: 4, trailDuration: 3500 },
  { trailColor: 0xf59e0b, glowColor: 0xfcd34d, platformColor: 0xb45309, platformCount: 8, obstacleCount: 3, orbCount: 5, trailDuration: 3000 },
  { trailColor: 0xef4444, glowColor: 0xfca5a5, platformColor: 0xb91c1c, platformCount: 9, obstacleCount: 4, orbCount: 5, trailDuration: 2500 },
  { trailColor: 0x10b981, glowColor: 0x6ee7b7, platformColor: 0x047857, platformCount: 10, obstacleCount: 5, orbCount: 6, trailDuration: 2000 },
];

interface PlatformData {
  rect: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.StaticBody;
}

interface ObstacleData {
  container: Phaser.GameObjects.Container;
  type: 'prism' | 'pulse';
  angle: number;
  speed: number;
  baseY: number;
  amplitude: number;
  phase: number;
}

interface OrbData {
  circle: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  collected: boolean;
}

export class GameScene extends Phaser.Scene {
  private currentLevel: number = 1;
  private score: number = 0;
  private player!: Player;
  private lightTrail!: LightTrail;
  private platforms: PlatformData[] = [];
  private obstacles: ObstacleData[] = [];
  private orbs: OrbData[] = [];
  private exitPortalX: number = 0;
  private exitPortalY: number = 0;
  private exitPortalContainer!: Phaser.GameObjects.Container;
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
  private levelText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private controlPanel!: Phaser.GameObjects.Container;
  private sliderKnob!: Phaser.GameObjects.Circle;
  private trailDurationValue: number = 3000;
  private exitActive: boolean = false;
  private bgParticles: Phaser.GameObjects.Arc[] = [];
  private levelComplete: boolean = false;
  private hintCooldown: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { level?: number }): void {
    this.currentLevel = data.level ?? 1;
    this.score = 0;
    this.platforms = [];
    this.obstacles = [];
    this.orbs = [];
    this.exitActive = false;
    this.bgParticles = [];
    this.levelComplete = false;
    this.hintCooldown = 0;
  }

  create(): void {
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const config = this.getLevelConfig();
    this.trailDurationValue = config.trailDuration;

    this.createBackgroundEffects();
    this.createGround();
    this.createLevelPlatforms();
    this.createObstacles();
    this.createOrbs();
    this.createExitPortal();

    this.player = new Player(this, 100, GAME_HEIGHT - 120);
    this.player.setOnLightTrailLand(() => this.onLightTrailLand());

    this.lightTrail = new LightTrail(this, config.trailColor, config.glowColor);
    this.lightTrail.setDuration(this.trailDurationValue);

    this.setupCollisions();
    this.createUI();
  }

  private getLevelConfig(): LevelConfig {
    const idx = Math.min(this.currentLevel - 1, LEVEL_CONFIGS.length - 1);
    return LEVEL_CONFIGS[idx];
  }

  private createBackgroundEffects(): void {
    const config = this.getLevelConfig();
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const r = Phaser.Math.FloatBetween(0.5, 2);
      const circle = this.add.circle(x, y, r, config.trailColor, Phaser.Math.FloatBetween(0.1, 0.3));
      circle.setDepth(0);
      this.bgParticles.push(circle);
    }
  }

  private createGround(): void {
    this.groundGroup = this.physics.add.staticGroup();
    const groundY = GAME_HEIGHT - 8;
    const g = this.add.rectangle(GAME_WIDTH / 2, groundY, GAME_WIDTH, 16, 0x1e1b4b, 0.6);
    g.setDepth(5);
    const groundGlow = this.add.rectangle(GAME_WIDTH / 2, groundY - 2, GAME_WIDTH, 2, 0x8b5cf6, 0.15);
    groundGlow.setDepth(4);
    const gBody = this.physics.add.staticBody(0, groundY - 8, GAME_WIDTH, 16);
    this.groundGroup.add(gBody);
  }

  private createLevelPlatforms(): void {
    const config = this.getLevelConfig();
    this.platformGroup = this.physics.add.staticGroup();
    const segments = this.generatePlatformLayout(config.platformCount);

    segments.forEach(seg => {
      const rect = this.add.rectangle(seg.x, seg.y, seg.w, seg.h, config.platformColor, 0.85);
      rect.setDepth(5);

      const glow = this.add.rectangle(seg.x, seg.y - 2, seg.w + 6, 3, config.glowColor, 0.25);
      glow.setDepth(4);

      const body = this.physics.add.staticBody(seg.x - seg.w / 2, seg.y - seg.h / 2, seg.w, seg.h);
      this.platformGroup.add(body);

      this.platforms.push({ rect, glow, body });
    });
  }

  private generatePlatformLayout(count: number): { x: number; y: number; w: number; h: number }[] {
    const result: { x: number; y: number; w: number; h: number }[] = [];
    const minY = 140;
    const maxY = GAME_HEIGHT - 80;
    const stepY = (maxY - minY) / (count + 1);

    for (let i = 0; i < count; i++) {
      const w = Phaser.Math.Between(80, 200);
      const h = 12;
      const y = maxY - stepY * (i + 1) + Phaser.Math.Between(-15, 15);
      const xMin = 80 + w / 2;
      const xMax = GAME_WIDTH - 80 - w / 2;
      const x = Phaser.Math.Between(xMin, xMax);
      result.push({ x, y: Phaser.Math.Clamp(y, minY, maxY), w, h });
    }

    return result;
  }

  private createObstacles(): void {
    const config = this.getLevelConfig();

    for (let i = 0; i < config.obstacleCount; i++) {
      const type: 'prism' | 'pulse' = i % 2 === 0 ? 'prism' : 'pulse';
      const x = Phaser.Math.Between(250, GAME_WIDTH - 250);
      const y = Phaser.Math.Between(180, GAME_HEIGHT - 180);

      const container = this.add.container(x, y);
      container.setDepth(20);

      if (type === 'prism') {
        const tri = this.add.triangle(0, 0, 0, -20, 17, 12, -17, 12, config.trailColor, 0.4);
        tri.setStrokeStyle(1, config.glowColor, 0.7);
        container.add(tri);
      } else {
        const orb = this.add.circle(0, 0, 14, config.trailColor, 0.35);
        orb.setStrokeStyle(2, config.glowColor, 0.6);
        container.add(orb);
        const pulseRing = this.add.circle(0, 0, 22, config.glowColor, 0.1);
        container.add(pulseRing);
        this.tweens.add({
          targets: pulseRing,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 1200,
          repeat: -1,
          ease: 'Sine.easeOut',
        });
      }

      container.setSize(40, 40);

      this.obstacles.push({
        container,
        type,
        angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
        speed: type === 'prism' ? 0.02 : 0.015,
        baseY: y,
        amplitude: type === 'pulse' ? 60 : 0,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      });
    }
  }

  private createOrbs(): void {
    const config = this.getLevelConfig();
    for (let i = 0; i < config.orbCount; i++) {
      const x = Phaser.Math.Between(120, GAME_WIDTH - 120);
      const y = Phaser.Math.Between(120, GAME_HEIGHT - 120);
      const glow = this.add.circle(x, y, 14, config.glowColor, 0.2);
      glow.setDepth(15);
      const circle = this.add.circle(x, y, 7, config.trailColor, 0.9);
      circle.setDepth(16);

      this.tweens.add({
        targets: [circle, glow],
        y: y - 8,
        duration: 1200 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.orbs.push({ circle, glow, collected: false });
    }
  }

  private createExitPortal(): void {
    this.exitPortalX = GAME_WIDTH - 80;
    this.exitPortalY = 160;
    this.exitPortalContainer = this.add.container(this.exitPortalX, this.exitPortalY);
    this.exitPortalContainer.setDepth(30);

    const pillar = this.add.rectangle(0, 0, 20, 80, 0xfbbf24, 0.3);
    this.exitPortalContainer.add(pillar);

    const innerGlow = this.add.rectangle(0, 0, 10, 60, 0xfde68a, 0.5);
    this.exitPortalContainer.add(innerGlow);

    const topOrb = this.add.circle(0, -50, 10, 0xfbbf24, 0.7);
    this.exitPortalContainer.add(topOrb);

    this.tweens.add({
      targets: pillar,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: topOrb,
      y: -58,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.platformGroup);
    this.physics.add.collider(this.player, this.lightTrail.getGroup(), (_playerObj, _trailBody) => {
      this.player.onLandOnPlatform(true);
    });
  }

  private onLightTrailLand(): void {
    this.cameras.main.flash(80, 167, 139, 250, true);
    this.score += 5;
    this.updateScoreText();
  }

  private checkOrbCollection(): void {
    const px = this.player.x;
    const py = this.player.y;
    this.orbs.forEach(orb => {
      if (orb.collected) return;
      const dist = Phaser.Math.Distance.Between(px, py, orb.circle.x, orb.circle.y);
      if (dist < 30) {
        orb.collected = true;
        this.tweens.killTweensOf(orb.circle);
        this.tweens.killTweensOf(orb.glow);
        this.tweens.add({
          targets: [orb.circle, orb.glow],
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 300,
          onComplete: () => {
            orb.circle.destroy();
            orb.glow.destroy();
          },
        });
        this.score += 10;
        this.updateScoreText();
      }
    });
  }

  private checkObstacleCollision(): void {
    const px = this.player.x;
    const py = this.player.y;
    for (const obs of this.obstacles) {
      const dist = Phaser.Math.Distance.Between(px, py, obs.container.x, obs.container.y);
      if (dist < 28) {
        this.resetPlayerPosition();
        return;
      }
    }
  }

  private resetPlayerPosition(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.player.setPosition(100, GAME_HEIGHT - 120);
    this.cameras.main.shake(200, 0.01);
  }

  private checkExitPortal(): void {
    const collected = this.orbs.filter(o => o.collected).length;
    const total = this.orbs.length;
    this.exitActive = collected >= Math.ceil(total * 0.5);

    if (this.exitActive && !this.levelComplete) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.exitPortalX, this.exitPortalY
      );
      if (dist < 50) {
        this.onLevelComplete();
      }
    }
  }

  private onLevelComplete(): void {
    this.levelComplete = true;
    this.exitActive = false;
    this.cameras.main.flash(300, 251, 191, 36, true);

    this.spawnVictoryParticles();

    this.time.delayedCall(800, () => {
      if (this.currentLevel < LEVEL_CONFIGS.length) {
        this.scene.restart({ level: this.currentLevel + 1 });
      } else {
        this.scene.start('MenuScene');
      }
    });
  }

  private spawnVictoryParticles(): void {
    const texKey = 'victoryParticle';
    if (!this.textures.exists(texKey)) {
      const g = this.add.graphics();
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture(texKey, 8, 8);
      g.destroy();
    }

    const emitter = this.add.particles(this.exitPortalX, this.exitPortalY, texKey, {
      speed: { min: 100, max: 250 },
      lifespan: 800,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 30,
      blendMode: Phaser.BlendModes.ADD,
    });
    emitter.setDepth(50);
    this.time.delayedCall(1000, () => emitter.destroy());
  }

  private createUI(): void {
    const config = this.getLevelConfig();

    this.levelText = this.add.text(20, 16, `关卡 ${this.currentLevel}`, {
      fontSize: '20px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#c4b5fd',
      shadow: { offsetX: 0, offsetY: 0, color: '#8b5cf6', blur: 8, fill: true },
    });
    this.levelText.setDepth(200);

    this.scoreText = this.add.text(20, 44, `光球: 0 / ${config.orbCount}`, {
      fontSize: '16px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#94a3b8',
    });
    this.scoreText.setDepth(200);

    this.createControlPanel();
  }

  private createControlPanel(): void {
    const panelWidth = 220;
    const panelHeight = 110;
    const px = GAME_WIDTH - panelWidth - 16;
    const py = GAME_HEIGHT - panelHeight - 16;

    const panelBg = this.add.renderTexture(0, 0, panelWidth, panelHeight);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(0, 0, panelWidth, panelHeight, 10);
    g.lineStyle(1, 0xffffff, 0.12);
    g.strokeRoundedRect(0, 0, panelWidth, panelHeight, 10);
    panelBg.draw(g);
    g.destroy();

    const sliderLabel = this.add.text(15, 14, '光痕持续时间', {
      fontSize: '13px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#cbd5e1',
    });

    const sliderValueText = this.add.text(panelWidth - 50, 14, `${(this.trailDurationValue / 1000).toFixed(1)}s`, {
      fontSize: '13px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#a78bfa',
    });

    const sliderTrack = this.add.rectangle(15 + 85, 48, 160, 4, 0x475569, 0.5);
    sliderTrack.setOrigin(0.5, 0.5);

    const ratio = (this.trailDurationValue - 1000) / 7000;
    const knobX = 15 + 5 + ratio * 160;
    this.sliderKnob = this.add.circle(knobX, 48, 8, 0xa78bfa, 0.9);
    this.sliderKnob.setDepth(201);
    this.sliderKnob.setInteractive({ draggable: true });

    const sliderMinX = 15 + 5;
    const sliderMaxX = 15 + 165;

    this.sliderKnob.on('drag', (pointer: Phaser.Input.Pointer) => {
      const newX = Phaser.Math.Clamp(pointer.x - px, sliderMinX, sliderMaxX);
      this.sliderKnob.x = newX;
      const newRatio = (newX - sliderMinX) / (sliderMaxX - sliderMinX);
      this.trailDurationValue = 1000 + newRatio * 7000;
      sliderValueText.setText(`${(this.trailDurationValue / 1000).toFixed(1)}s`);
      this.lightTrail.setDuration(this.trailDurationValue);
    });

    const resetBtn = this.add.text(15, 70, '重置关卡', {
      fontSize: '14px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#f87171',
      backgroundColor: 'rgba(248,113,113,0.1)',
      padding: { x: 12, y: 6 },
    });
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on('pointerdown', () => {
      this.scene.restart({ level: this.currentLevel });
    });
    resetBtn.on('pointerover', () => resetBtn.setColor('#fca5a5'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#f87171'));

    this.controlPanel = this.add.container(px, py, [
      panelBg,
      sliderLabel,
      sliderValueText,
      sliderTrack,
      this.sliderKnob,
      resetBtn,
    ]);
    this.controlPanel.setDepth(200);
  }

  private updateScoreText(): void {
    const config = this.getLevelConfig();
    const collected = this.orbs.filter(o => o.collected).length;
    this.scoreText.setText(`光球: ${collected} / ${config.orbCount}  |  得分: ${this.score}`);
  }

  update(time: number, delta: number): void {
    if (!this.player || !this.player.active || this.levelComplete) return;

    this.player.update(time, delta);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const isMoving = Math.abs(body.velocity.x) > 10;
    const isGrounded = body.blocked.down || body.touching.down;

    if (isMoving && isGrounded) {
      this.lightTrail.spawnFromPosition(this.player.x + this.player.getRadius(), this.player.y + this.player.getRadius() * 2);
    }

    this.lightTrail.update(delta);

    this.obstacles.forEach(obs => {
      obs.angle += obs.speed * delta * 0.06;
      if (obs.type === 'prism') {
        obs.container.setRotation(obs.angle);
      } else {
        obs.container.y = obs.baseY + Math.sin(obs.angle + obs.phase) * obs.amplitude;
      }
    });

    this.checkOrbCollection();
    this.checkObstacleCollision();
    this.checkExitPortal();

    this.bgParticles.forEach(p => {
      p.y -= 0.15;
      if (p.y < -5) p.y = GAME_HEIGHT + 5;
    });

    if (this.hintCooldown <= 0) {
      const collected = this.orbs.filter(o => o.collected).length;
      const total = this.orbs.length;
      if (collected < Math.ceil(total * 0.5)) {
        this.hintCooldown = 5000;
      }
    } else {
      this.hintCooldown -= delta;
    }
  }
}
