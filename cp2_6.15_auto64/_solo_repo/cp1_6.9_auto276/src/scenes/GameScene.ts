import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Collectible } from '../entities/Collectible';

interface WaterCurtain {
  x: number;
  y: number;
  width: number;
  height: number;
  graphics: Phaser.GameObjects.Graphics;
  body: Phaser.Physics.Arcade.Body | null;
  isIntermittent: boolean;
  phase: number;
  active: boolean;
}

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 450;
const TOTAL_COLLECTIBLES = 15;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms: Platform[] = [];
  private collectibles: Collectible[] = [];
  private waterCurtains: WaterCurtain[] = [];

  private score: number = 0;
  private elapsedTime: number = 0;
  private gameWon: boolean = false;
  private victoryTriggered: boolean = false;
  private victoryEntered: boolean = false;

  private victorySphere!: {
    graphics: Phaser.GameObjects.Graphics;
    core: Phaser.GameObjects.Graphics;
    x: number;
    y: number;
    radius: number;
  } | null;

  private scoreText!: Phaser.GameObjects.Text;
  private scoreBackground!: Phaser.GameObjects.Graphics;
  private timerText!: Phaser.GameObjects.Text;
  private timerBackground!: Phaser.GameObjects.Graphics;

  private scorePulseScale: number = 1;
  private scorePulseTarget: number = 1;

  private deathFlash: Phaser.GameObjects.Graphics | null = null;
  private deathFlashStart: number = 0;
  private isDeathFlashing: boolean = false;

  private victoryParticles: Array<{
    graphics: Phaser.GameObjects.Graphics;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    startTime: number;
    size: number;
  }> = [];

  private victoryStartTime: number = 0;
  private victoryTextShown: boolean = false;
  private victoryEndAnimationStart: number = 0;
  private victoryEndCollectibles: Array<{
    graphics: Phaser.GameObjects.Graphics;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    startTime: number;
  }> = [];

  private cursorBg: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('GameScene');
  }

  preload(): void {}

  create(): void {
    this.score = 0;
    this.elapsedTime = 0;
    this.gameWon = false;
    this.victoryTriggered = false;
    this.victoryEntered = false;
    this.victorySphere = null;
    this.platforms = [];
    this.collectibles = [];
    this.waterCurtains = [];
    this.victoryParticles = [];
    this.victoryTextShown = false;
    this.victoryEndCollectibles = [];

    this.createBackground();
    this.createPlatforms();
    this.createWaterCurtains();
    this.createCollectibles();
    this.createPlayer();
    this.setupCollisions();
    this.createUI();

    this.player.setOnJumpCallback(() => {
      this.playJumpSound();
    });

    this.events.on('shutdown', this.cleanup, this);
  }

  private cleanup(): void {
    if (this.cursorBg) {
      this.cursorBg.destroy();
      this.cursorBg = null;
    }
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    const gradient = bg.createGradientTexture(
      'bg-gradient',
      WORLD_WIDTH,
      WORLD_HEIGHT,
      0x1a1a4a,
      0x1a1a4a,
      0x18103a,
      0x150830
    );

    const bgImage = this.add.image(0, 0, 'bg-gradient').setOrigin(0, 0);
    bgImage.setDepth(-100);

    const ambient = this.add.graphics();
    ambient.setDepth(-99);
    ambient.fillStyle(0x4466aa, 0.06);
    ambient.fillCircle(200, 150, 120);
    ambient.fillStyle(0x6644aa, 0.06);
    ambient.fillCircle(600, 300, 140);
    ambient.fillStyle(0x4488cc, 0.04);
    ambient.fillCircle(400, 80, 100);

    this.cursorBg = bg;

    this.add.text(WORLD_WIDTH / 2, 20, '潮汐回响', {
      fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#aaccff',
      align: 'center'
    }).setOrigin(0.5, 0).setAlpha(0.5).setDepth(0);
  }

  private hslToHex(h: number, s: number, l: number): number {
    return Phaser.Display.Color.GetColor(
      Math.round(
        Phaser.Display.Color.HSLToColor(h / 360, s / 100, l / 100).r
      ),
      Math.round(
        Phaser.Display.Color.HSLToColor(h / 360, s / 100, l / 100).g
      ),
      Math.round(
        Phaser.Display.Color.HSLToColor(h / 360, s / 100, l / 100).b
      )
    );
  }

  private createPlatforms(): void {
    const platformData = [
      { x: 80, y: 380 },
      { x: 220, y: 340 },
      { x: 360, y: 300 },
      { x: 500, y: 260 },
      { x: 640, y: 220 },
      { x: 480, y: 180 },
      { x: 320, y: 160 },
      { x: 180, y: 200 },
      { x: 100, y: 260 },
      { x: 260, y: 120 },
      { x: 360, y: 80, width: 60 },
      { x: 440, y: 60, width: 60 },
      { x: 520, y: 40, width: 60 },
      { x: 600, y: 30, width: 60 },
      { x: 680, y: 30, width: 60 }
    ];

    const maxY = 400;
    const minY = 30;

    platformData.forEach((p, index) => {
      const t = (p.y - minY) / (maxY - minY);
      const hue = 180 + t * 60;
      const sat = 60 + t * 20;
      const light = 55 + (1 - t) * 10;
      const color = this.hslToHex(hue, sat, light);

      const amplitude = 30;
      const period = 1.5 + Math.random() * 1.0;
      const phase = Math.random() * Math.PI * 2;

      const platform = new Platform(
        this,
        p.x,
        p.y,
        p.width || 80,
        16,
        color,
        amplitude,
        period,
        phase
      );
      platform.setDepth(10);
      this.platforms.push(platform);
    });

    const floor = this.physics.add.staticGroup();
    const floorSprite = this.add.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT + 20,
      WORLD_WIDTH * 2,
      40,
      0x000000,
      0
    );
    floor.add(floorSprite);
  }

  private createWaterCurtains(): void {
    const curtainData = [
      { x: 300, y: 250, isIntermittent: true },
      { x: 450, y: 200, isIntermittent: false },
      { x: 580, y: 280, isIntermittent: true }
    ];

    curtainData.forEach((cd, index) => {
      const width = 30;
      const height = 200;

      const graphics = this.add.graphics();
      graphics.setDepth(5);

      let body: Phaser.Physics.Arcade.Body | null = null;

      const sprite = this.add.rectangle(cd.x, cd.y, width, height, 0x66aaff, 0);
      sprite.setData('owner', `curtain_${index}`);
      this.physics.add.existing(sprite, true);
      body = sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(width, height);

      const startPhase = Math.random() * 1000;

      this.waterCurtains.push({
        x: cd.x,
        y: cd.y,
        width,
        height,
        graphics,
        body,
        isIntermittent: cd.isIntermittent,
        phase: startPhase,
        active: true
      });

      sprite.name = `curtain_${index}`;
      this.waterCurtains[this.waterCurtains.length - 1].graphics.setData(
        'spriteRef',
        sprite
      );
    });
  }

  private updateWaterCurtains(time: number): void {
    this.waterCurtains.forEach((curtain) => {
      curtain.graphics.clear();

      let visible = true;
      if (curtain.isIntermittent) {
        const cycle = 2500;
        const t = (time + curtain.phase) % cycle;
        if (t > 1500) {
          visible = false;
        }
      }
      curtain.active = visible;

      const sprite = curtain.graphics.getData('spriteRef');
      if (sprite && sprite.body) {
        (sprite.body as Phaser.Physics.Arcade.Body).enable = visible;
      }

      if (!visible) return;

      const x = curtain.x;
      const y = curtain.y;
      const w = curtain.width;
      const h = curtain.height;

      const stripeCount = 5;
      for (let i = 0; i < stripeCount; i++) {
        const offset = ((time / 20 + i * (h / stripeCount)) % h) - h / 2;
        const alpha = 0.2 + Math.sin((time / 500) + i) * 0.1;

        curtain.graphics.fillStyle(0x77ccff, alpha);
        curtain.graphics.fillRect(x - w / 2 + 2, y - h / 2 + offset, 3, h * 0.3);
        curtain.graphics.fillStyle(0x99ddff, alpha * 0.7);
        curtain.graphics.fillRect(x - w / 2 + w - 5, y - h / 2 + offset + 20, 3, h * 0.25);
      }

      curtain.graphics.fillStyle(0x66bbff, 0.18);
      curtain.graphics.fillRect(x - w / 2, y - h / 2, w, h);

      curtain.graphics.lineStyle(1, 0xaaddff, 0.3);
      curtain.graphics.strokeRect(x - w / 2, y - h / 2, w, h);
    });
  }

  private createCollectibles(): void {
    const collectiblePositions = [
      { x: 110, y: 350 },
      { x: 250, y: 310 },
      { x: 390, y: 270 },
      { x: 530, y: 230 },
      { x: 670, y: 190 },
      { x: 510, y: 150 },
      { x: 350, y: 130 },
      { x: 210, y: 170 },
      { x: 130, y: 230 },
      { x: 290, y: 90 },
      { x: 160, y: 290 },
      { x: 420, y: 350 },
      { x: 600, y: 340 },
      { x: 550, y: 20 },
      { x: 680, y: 10 }
    ];

    collectiblePositions.forEach((pos) => {
      const c = new Collectible(this, pos.x, pos.y);
      c.setDepth(8);
      this.collectibles.push(c);
    });
  }

  private createPlayer(): void {
    this.player = new Player(this, 80, 340);
    this.player.setDepth(20);
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.platforms);

    this.physics.add.overlap(
      this.player,
      this.collectibles,
      (obj1, obj2) => {
        const c = obj2 as Collectible;
        this.onCollectibleOverlap(c);
      },
      (obj1, obj2) => {
        const c = obj2 as Collectible;
        return !c.isCollected;
      },
      this
    );

    this.waterCurtains.forEach((curtain) => {
      const sprite = curtain.graphics.getData('spriteRef');
      if (sprite) {
        this.physics.add.overlap(
          this.player,
          sprite,
          () => {
            if (curtain.active) {
              this.onWaterCurtainHit(curtain);
            }
          },
          undefined,
          this
        );
      }
    });
  }

  private onCollectibleOverlap(collectible: Collectible): void {
    if (collectible.isCollected || this.gameWon) return;

    collectible.collect(() => {});

    this.score++;
    this.updateScoreUI();
    this.triggerScorePulse();

    this.playCollectSound();

    if (this.score >= TOTAL_COLLECTIBLES && !this.victoryTriggered) {
      this.victoryTriggered = true;
      this.time.delayedCall(400, () => {
        this.triggerVictory();
      });
    }
  }

  private onWaterCurtainHit(curtain: WaterCurtain): void {
    if (this.gameWon) return;

    const player = this.player;
    const px = player.x;
    const cx = curtain.x;

    const pushDir = px < cx ? -1 : 1;
    player.setVelocityX(pushDir * 300);
    player.setVelocityY(-200);

    if (this.score > 0) {
      this.score--;
      this.updateScoreUI();
      this.triggerScorePulse();
    } else {
      player.applySlowdown(2000);
    }

    this.playHitSound();
  }

  private createUI(): void {
    this.scoreBackground = this.add.graphics();
    this.scoreBackground.setDepth(100);
    this.drawRoundedRect(this.scoreBackground, 16, 14, 150, 34, 8, 0x1a1a4a, 0.55);

    this.scoreText = this.add
      .text(28, 22, `水滴：${this.score}/${TOTAL_COLLECTIBLES}`, {
        fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '20px',
        color: '#ffffff'
      })
      .setShadow(2, 2, 'rgba(100, 180, 255, 0.6)', 4, true, true)
      .setDepth(101)
      .setOrigin(0, 0);

    this.timerBackground = this.add.graphics();
    this.timerBackground.setDepth(100);
    this.drawRoundedRect(this.timerBackground, 16, 54, 120, 30, 8, 0x1a1a4a, 0.55);

    this.timerText = this.add
      .text(28, 60, '0.0s', {
        fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '18px',
        color: '#ccddff'
      })
      .setShadow(1, 1, 'rgba(100, 180, 255, 0.4)', 2, true, true)
      .setDepth(101)
      .setOrigin(0, 0);
  }

  private drawRoundedRect(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: number,
    alpha: number
  ): void {
    g.clear();
    g.fillStyle(color, alpha);
    g.fillRoundedRect(x, y, w, h, r);
    g.lineStyle(1, 0x6699cc, 0.3);
    g.strokeRoundedRect(x, y, w, h, r);
  }

  private updateScoreUI(): void {
    this.scoreText.setText(`水滴：${this.score}/${TOTAL_COLLECTIBLES}`);
  }

  private triggerScorePulse(): void {
    this.scorePulseTarget = 1.5;
    this.scorePulseScale = 1.5;
  }

  private updateScorePulse(delta: number): void {
    if (this.scorePulseScale > 1.01) {
      const dt = delta / 1000;
      const lerp = 10;
      this.scorePulseScale += (1 - this.scorePulseScale) * Math.min(lerp * dt * 2, 1);
      this.scoreText.setScale(this.scorePulseScale);

      const flicker = Math.sin(this.time.now / 30) * 0.3 + 0.7;
      this.scoreText.setAlpha(flicker);
    } else {
      this.scoreText.setScale(1);
      this.scoreText.setAlpha(1);
      this.scorePulseScale = 1;
    }
  }

  private playJumpSound(): void {
    try {
      const synth = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (!synth || !synth.context) return;

      const ctx = synth.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(synth.masterGain || ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // ignore
    }
  }

  private playCollectSound(): void {
    try {
      const synth = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (!synth || !synth.context) return;

      const ctx = synth.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(synth.masterGain || ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // ignore
    }
  }

  private playHitSound(): void {
    try {
      const synth = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (!synth || !synth.context) return;

      const ctx = synth.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(synth.masterGain || ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // ignore
    }
  }

  private playVictorySound(): void {
    try {
      const synth = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (!synth || !synth.context) return;
      const ctx = synth.context;

      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const startT = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0.12, startT);
        gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.4);
        osc.connect(gain);
        gain.connect(synth.masterGain || ctx.destination);
        osc.start(startT);
        osc.stop(startT + 0.4);
      });
    } catch (e) {
      // ignore
    }
  }

  private checkFallDeath(): void {
    if (this.gameWon || this.isDeathFlashing) return;

    if (this.player.y > WORLD_HEIGHT + 60) {
      this.triggerDeath();
    }
  }

  private triggerDeath(): void {
    this.isDeathFlashing = true;
    this.deathFlashStart = this.time.now;

    this.deathFlash = this.add.graphics();
    this.deathFlash.setDepth(200);
    this.deathFlash.fillStyle(0x000044, 0.7);
    this.deathFlash.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private updateDeathFlash(): void {
    if (!this.isDeathFlashing || !this.deathFlash) return;

    const elapsed = this.time.now - this.deathFlashStart;

    if (elapsed >= 1000) {
      this.isDeathFlashing = false;
      this.deathFlash.destroy();
      this.deathFlash = null;
      this.respawnAll();
    } else {
      const t = elapsed / 1000;
      const alpha = 0.7 * Math.sin(Math.PI * t);
      this.deathFlash.clear();
      this.deathFlash.fillStyle(0x000044, alpha);
      this.deathFlash.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    }
  }

  private respawnAll(): void {
    this.player.respawn();
    this.score = 0;
    this.updateScoreUI();
    this.elapsedTime = 0;

    this.collectibles.forEach((c) => {
      c.resetCollectible();
    });
  }

  private triggerVictory(): void {
    const sphereX = WORLD_WIDTH / 2;
    const sphereY = WORLD_HEIGHT / 2;
    const radius = 80;

    const graphics = this.add.graphics();
    graphics.setDepth(50);

    const core = this.add.graphics();
    core.setDepth(51);

    this.victorySphere = {
      graphics,
      core,
      x: sphereX,
      y: sphereY,
      radius
    };

    this.playVictorySound();
  }

  private updateVictorySphere(time: number): void {
    if (!this.victorySphere) return;

    const { graphics, core, x, y, radius } = this.victorySphere;
    graphics.clear();
    core.clear();

    for (let i = 5; i >= 0; i--) {
      const r = radius + i * 8;
      const alpha = 0.05 + (5 - i) * 0.05;
      graphics.fillStyle(0x66ccff, alpha);
      graphics.fillCircle(x, y, r);
    }

    graphics.fillGradientStyle(
      0x88ddff, 0x66aadd,
      0x4488bb, 0x2266aa,
      0.7, 0.7, 0.7, 0.7
    );
    graphics.fillCircle(x, y, radius);

    const pulseScale = 1 + Math.sin(time / 200) * 0.05;
    graphics.fillCircle(x, y, radius * pulseScale);

    core.save();
    core.translateCanvas(x, y);
    core.rotateCanvas(time / 500);

    const coreRadius = radius * 0.4;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const cx = Math.cos(angle) * coreRadius * 0.5;
      const cy = Math.sin(angle) * coreRadius * 0.5;
      core.fillStyle(0xaaffff, 0.8);
      core.fillCircle(cx, cy, 6);
    }

    core.fillStyle(0xffffff, 0.9);
    core.fillCircle(0, 0, coreRadius * 0.3);

    core.restore();

    if (!this.victoryEntered) {
      this.checkVictorySphereEntry();
    }
  }

  private checkVictorySphereEntry(): void {
    if (!this.victorySphere || this.victoryEntered) return;

    const { x, y, radius } = this.victorySphere;
    const dx = this.player.x - x;
    const dy = this.player.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius + 10) {
      this.victoryEntered = true;
      this.gameWon = true;
      this.victoryStartTime = this.time.now;
      this.player.setVelocity(0, 0);
      this.player.body.enable = false;

      this.startVictoryEndAnimation();
    }
  }

  private startVictoryEndAnimation(): void {
    const collectibleCount = 25;
    const startX = this.player.x;
    const startY = this.player.y;

    for (let i = 0; i < collectibleCount; i++) {
      const angle = (i / collectibleCount) * Math.PI * 2 + Math.random() * 0.2;
      const distance = 200 + Math.random() * 300;
      const targetX = startX + Math.cos(angle) * distance;
      const targetY = startY + Math.sin(angle) * distance;

      const g = this.add.graphics();
      g.setDepth(60);

      this.victoryEndCollectibles.push({
        graphics: g,
        x: startX,
        y: startY,
        targetX,
        targetY,
        startTime: this.time.now + i * 30
      });
    }
  }

  private updateVictoryEndAnimation(time: number): void {
    if (!this.victoryEntered) return;

    this.victoryEndCollectibles.forEach((item, index) => {
      const delay = index * 30;
      const elapsed = time - item.startTime;
      if (elapsed < 0) return;

      const duration = 3000;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);
      const cx = item.x + (item.targetX - item.x) * eased;
      const cy = item.y + (item.targetY - item.y) * eased;

      const alpha = 1 - progress;
      const r = 10 * (1 - progress * 0.6);

      item.graphics.clear();
      if (alpha > 0) {
        item.graphics.fillStyle(0x88ddff, alpha * 0.4);
        item.graphics.fillCircle(cx, cy, r + 4);
        item.graphics.fillStyle(0xaaffff, alpha);
        item.graphics.fillCircle(cx, cy, r);
        item.graphics.fillStyle(0xffffff, alpha * 0.6);
        item.graphics.fillCircle(cx - r * 0.3, cy - r * 0.3, r * 0.3);
      }

      if (progress >= 1) {
        item.graphics.destroy();
        this.victoryEndCollectibles.splice(index, 1);
      }
    });

    const phase1End = this.victoryStartTime + 3000;
    const phase2End = this.victoryStartTime + 8000;

    if (time > phase1End && !this.victoryTextShown) {
      this.victoryTextShown = true;
      this.showVictoryText();
    }

    this.spawnVictoryParticles(time);
    this.updateVictoryParticles(time);
  }

  private showVictoryText(): void {
    const text = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 20, '海洋复苏', {
        fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(70);

    text.setShadow(0, 0, 'rgba(150, 220, 255, 0.8)', 15, true, true);

    let startTime = this.time.now;
    const animate = () => {
      const elapsed = this.time.now - startTime;
      const t = Math.min(elapsed / 2000, 1);
      const ease = 1 - Math.pow(1 - t, 2);
      text.setScale(0.5 + ease * 0.5);
      text.setAlpha(ease);

      const wobble = Math.sin(elapsed / 150) * 0.5;
      text.setY(WORLD_HEIGHT / 2 - 20 + wobble);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        const wobbleAnim = () => {
          const elapsed2 = this.time.now - startTime;
          const wobble2 = Math.sin(elapsed2 / 150) * 0.5;
          text.setY(WORLD_HEIGHT / 2 - 20 + wobble2);
          if (this.victoryEntered) {
            requestAnimationFrame(wobbleAnim);
          }
        };
        wobbleAnim();
      }
    };
    animate();
  }

  private spawnVictoryParticles(time: number): void {
    if (!this.victoryEntered) return;
    if (this.victoryParticles.length >= 80) return;

    const spawnRate = 3;
    for (let i = 0; i < spawnRate; i++) {
      const x = Math.random() * WORLD_WIDTH;
      const y = WORLD_HEIGHT + 10;
      const size = 2 + Math.random() * 4;
      const vx = (Math.random() - 0.5) * 50;
      const vy = -(100 + Math.random() * 100);
      const life = 1500 + Math.random() * 1500;

      const g = this.add.graphics();
      g.setDepth(65);

      this.victoryParticles.push({
        graphics: g,
        x,
        y,
        vx,
        vy,
        life,
        startTime: time,
        size
      });
    }
  }

  private updateVictoryParticles(time: number): void {
    for (let i = this.victoryParticles.length - 1; i >= 0; i--) {
      const p = this.victoryParticles[i];
      const elapsed = time - p.startTime;
      const progress = elapsed / p.life;

      if (progress >= 1) {
        p.graphics.destroy();
        this.victoryParticles.splice(i, 1);
        continue;
      }

      const dt = 1 / 60;
      p.vy += -10 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const alpha = 1 - progress;
      const colorMix = progress;

      p.graphics.clear();
      p.graphics.fillStyle(
        colorMix < 0.5
          ? 0x88ccff
          : Phaser.Display.Color.GetColor(
              Math.round(0x88 + (0xff - 0x88) * (colorMix - 0.5) * 2),
              Math.round(0xcc + (0xff - 0xcc) * (colorMix - 0.5) * 2),
              Math.round(0xff)
            ),
        alpha
      );
      p.graphics.fillCircle(p.x, p.y, p.size * (1 - progress * 0.4));
    }
  }

  update(time: number, delta: number): void {
    this.elapsedTime += delta;

    this.platforms.forEach((p) => p.update(time));

    if (!this.gameWon) {
      this.collectibles.forEach((c) => {
        if (!c.isCollected) c.update(time);
      });
      this.player.update(time, delta);
      this.checkFallDeath();
    }

    this.updateWaterCurtains(time);

    if (this.victoryTriggered && !this.gameWon) {
      this.updateVictorySphere(time);
    }

    if (this.victoryEntered) {
      this.updateVictorySphere(time);
      this.updateVictoryEndAnimation(time);
    }

    this.updateScorePulse(delta);
    this.updateDeathFlash();

    const seconds = (this.elapsedTime / 1000).toFixed(1);
    this.timerText.setText(`${seconds}s`);
  }
}
