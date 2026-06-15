import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, GRAVITY, PLAYER_RADIUS, PLAYER_BOUNCE,
  CHARGE_RATE, MAX_CHARGE, MIN_JUMP_VELOCITY, MAX_JUMP_VELOCITY, HORIZONTAL_SPEED,
  PLATFORM_HEIGHT, BRICK_WIDTH, BRICK_GAP, PLATFORM_BASE_WIDTH,
  PLATFORM_MIN_WIDTH, PLATFORM_NARROW_START_LAYER, PLATFORM_NARROW_STEP,
  LAYER_SPACING, PLATFORMS_ABOVE, PLATFORMS_BELOW,
  OBSTACLE_PRISM_LENGTH, OBSTACLE_PRISM_SPEED_BASE,
  OBSTACLE_ORB_RADIUS, OBSTACLE_ORB_SPEED_BASE,
  OBSTACLE_START_LAYER, OBSTACLE_PRISM_INTERVAL, OBSTACLE_ORB_INTERVAL,
  MAX_PARTICLES, TRAIL_LIFESPAN, TRAIL_QUANTITY,
  RIPPLE_LIFESPAN, RIPPLE_SCALE_START, RIPPLE_SCALE_END,
  CAMERA_LERP,
  COLOR_BG_TOP, COLOR_BG_BOTTOM, COLOR_PLAYER, COLOR_PLAYER_GLOW,
  COLOR_PLATFORM_LOW, COLOR_PLATFORM_HIGH, COLOR_PRISM, COLOR_ORB,
  COLOR_UI_TEXT, DIFFICULTY_SPEED_SCALE,
} from '../config';

interface PlatformData {
  container: Phaser.GameObjects.Container;
  bricks: Phaser.GameObjects.Rectangle[];
  body: Phaser.Physics.Arcade.Sprite;
  layerIndex: number;
}

interface PrismData {
  graphics: Phaser.GameObjects.Graphics;
  cx: number;
  cy: number;
  angle: number;
  speed: number;
  length: number;
  hitSprite: Phaser.Physics.Arcade.Sprite;
  overlapRef: Phaser.Physics.Arcade.Collider;
}

interface OrbData {
  visual: Phaser.GameObjects.Arc;
  hitSprite: Phaser.Physics.Arcade.Sprite;
  overlapRef: Phaser.Physics.Arcade.Collider;
  baseY: number;
  range: number;
  time: number;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerGlow!: Phaser.GameObjects.Arc;
  private playerVisual!: Phaser.GameObjects.Arc;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bgGraphics!: Phaser.GameObjects.Graphics;

  private platforms: PlatformData[] = [];
  private prisms: PrismData[] = [];
  private orbs: OrbData[] = [];

  private isCharging: boolean = false;
  private chargeTime: number = 0;
  private chargeIndicator!: Phaser.GameObjects.Arc;

  private score: number = 0;
  private currentLayer: number = 0;
  private highestLayer: number = 0;
  private gameSpeedMultiplier: number = 1.0;

  private scoreText!: Phaser.GameObjects.Text;
  private layerText!: Phaser.GameObjects.Text;
  private controlPanel!: Phaser.GameObjects.Container;
  private speedKnob!: Phaser.GameObjects.Arc;

  private isGameOver: boolean = false;
  private hasWhiteTexture: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.score = 0;
    this.currentLayer = 0;
    this.highestLayer = 0;
    this.isCharging = false;
    this.chargeTime = 0;
    this.isGameOver = false;
    this.gameSpeedMultiplier = 1.0;
    this.platforms = [];
    this.prisms = [];
    this.orbs = [];

    this.ensureWhiteTexture();

    this.physics.world.gravity.y = GRAVITY;

    this.bgGraphics = this.add.graphics();
    this.drawBackground();

    this.createInitialPlatforms();
    this.createPlayer();
    this.createTrailEmitter();

    this.chargeIndicator = this.add.circle(0, 0, PLAYER_RADIUS + 4, 0x44aaff, 0)
      .setDepth(10);

    this.createUI();
    this.setupInput();

    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private ensureWhiteTexture(): void {
    if (!this.hasWhiteTexture) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('__white', 4, 4);
      g.destroy();
      this.hasWhiteTexture = true;
    }
  }

  private drawBackground(): void {
    this.bgGraphics.clear();
    const grad = this.bgGraphics.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, `#${COLOR_BG_TOP.toString(16).padStart(6, '0')}`);
    grad.addColorStop(1, `#${COLOR_BG_BOTTOM.toString(16).padStart(6, '0')}`);
    this.bgGraphics.fillStyle(grad, 1);
    this.bgGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.bgGraphics.setDepth(-10);
  }

  private getPlatformColor(layer: number): number {
    const t = Phaser.Math.Clamp(layer / 50, 0, 1);
    const r = Phaser.Math.Interpolation.Linear([(COLOR_PLATFORM_LOW >> 16) & 0xff, (COLOR_PLATFORM_HIGH >> 16) & 0xff], t);
    const g = Phaser.Math.Interpolation.Linear([(COLOR_PLATFORM_LOW >> 8) & 0xff, (COLOR_PLATFORM_HIGH >> 8) & 0xff], t);
    const b = Phaser.Math.Interpolation.Linear([COLOR_PLATFORM_LOW & 0xff, COLOR_PLATFORM_HIGH & 0xff], t);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private getPlatformWidth(layer: number): number {
    if (layer < PLATFORM_NARROW_START_LAYER) return PLATFORM_BASE_WIDTH;
    const narrowAmount = (layer - PLATFORM_NARROW_START_LAYER) * PLATFORM_NARROW_STEP;
    return Math.max(PLATFORM_MIN_WIDTH, Math.floor(PLATFORM_BASE_WIDTH - narrowAmount));
  }

  private createPlatform(layer: number, xPos?: number): void {
    const widthInBricks = this.getPlatformWidth(layer);
    const totalWidth = widthInBricks * BRICK_WIDTH + (widthInBricks - 1) * BRICK_GAP;
    const y = GAME_HEIGHT - layer * LAYER_SPACING;
    const x = xPos ?? Phaser.Math.Between(Math.floor(totalWidth / 2) + 10, GAME_WIDTH - Math.floor(totalWidth / 2) - 10);

    const container = this.add.container(x, y);
    const bricks: Phaser.GameObjects.Rectangle[] = [];
    const color = this.getPlatformColor(layer);

    for (let i = 0; i < widthInBricks; i++) {
      const bx = (i - (widthInBricks - 1) / 2) * (BRICK_WIDTH + BRICK_GAP);
      const brick = this.add.rectangle(bx, 0, BRICK_WIDTH, PLATFORM_HEIGHT, color)
        .setStrokeStyle(1, this.lightenColor(color, 0.3), 0.6);
      bricks.push(brick);
      container.add(brick);
    }

    const glowRect = this.add.rectangle(0, -2, totalWidth + 8, PLATFORM_HEIGHT + 6, color, 0.15);
    container.add(glowRect);
    container.sendToBack(glowRect);

    const body = this.physics.add.staticSprite(x, y, '__white');
    body.setDisplaySize(totalWidth, PLATFORM_HEIGHT);
    body.body.setSize(totalWidth, PLATFORM_HEIGHT);
    body.body.updateCenter();
    body.setVisible(false);
    body.setImmovable(true);
    body.refreshBody();

    this.physics.add.collider(this.player, body, this.onLandOnPlatform, undefined, this);

    const data: PlatformData = { container, bricks, body, layerIndex: layer };
    this.platforms.push(data);

    if (layer >= OBSTACLE_START_LAYER) {
      if (layer % OBSTACLE_PRISM_INTERVAL === 0) {
        this.createPrism(x, y - LAYER_SPACING / 2, layer);
      }
      if (layer % OBSTACLE_ORB_INTERVAL === 0) {
        this.createOrb(layer);
      }
    }
  }

  private createPrism(cx: number, cy: number, layer: number): void {
    const speedMult = 1 + (layer - OBSTACLE_START_LAYER) * DIFFICULTY_SPEED_SCALE;
    const speed = OBSTACLE_PRISM_SPEED_BASE * speedMult * this.gameSpeedMultiplier;
    const graphics = this.add.graphics().setDepth(5);

    const hitSprite = this.physics.add.staticSprite(cx, cy, '__white');
    hitSprite.setDisplaySize(OBSTACLE_PRISM_LENGTH * 0.5, 8);
    hitSprite.body.setSize(OBSTACLE_PRISM_LENGTH * 0.5, 8);
    hitSprite.setVisible(false);
    hitSprite.setImmovable(true);
    hitSprite.refreshBody();

    const overlapRef = this.physics.add.overlap(this.player, hitSprite, () => this.triggerGameOver(), undefined, this);

    const prism: PrismData = { graphics, cx, cy, angle: 0, speed, length: OBSTACLE_PRISM_LENGTH, hitSprite, overlapRef };
    this.prisms.push(prism);
  }

  private createOrb(layer: number): void {
    const y = GAME_HEIGHT - layer * LAYER_SPACING;
    const x = Phaser.Math.Between(40, GAME_WIDTH - 40);

    const visual = this.add.circle(x, y, OBSTACLE_ORB_RADIUS, COLOR_ORB, 0.9)
      .setStrokeStyle(2, 0xffcc66, 0.6)
      .setDepth(5);

    const hitSprite = this.physics.add.staticSprite(x, y, '__white');
    hitSprite.setDisplaySize(OBSTACLE_ORB_RADIUS * 2, OBSTACLE_ORB_RADIUS * 2);
    hitSprite.body.setCircle(OBSTACLE_ORB_RADIUS);
    hitSprite.setVisible(false);
    hitSprite.setImmovable(true);
    hitSprite.refreshBody();

    const overlapRef = this.physics.add.overlap(this.player, hitSprite, () => this.triggerGameOver(), undefined, this);

    const orb: OrbData = {
      visual,
      hitSprite,
      overlapRef,
      baseY: y,
      range: LAYER_SPACING * 0.5,
      time: 0,
    };
    this.orbs.push(orb);
  }

  private createInitialPlatforms(): void {
    this.createPlatform(0, GAME_WIDTH / 2);
    for (let i = 1; i <= PLATFORMS_ABOVE; i++) {
      this.createPlatform(i);
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - PLAYER_RADIUS - PLATFORM_HEIGHT / 2, '__white');
    this.player.setDisplaySize(PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    this.player.body.setCircle(PLAYER_RADIUS, 0, 0);
    this.player.setBounce(PLAYER_BOUNCE);
    this.player.setCollideWorldBounds(true);
    this.player.setVisible(false);
    this.player.setDepth(8);

    this.playerGlow = this.add.circle(
      this.player.x, this.player.y,
      PLAYER_RADIUS + 6, COLOR_PLAYER_GLOW, 0.2
    ).setDepth(7);

    this.playerVisual = this.add.circle(
      this.player.x, this.player.y,
      PLAYER_RADIUS, COLOR_PLAYER, 1.0
    ).setStrokeStyle(2, 0xffffff, 0.5).setDepth(8);
  }

  private createTrailEmitter(): void {
    const tex = this.make.graphics({ x: 0, y: 0 }, false);
    tex.fillStyle(COLOR_PLAYER, 0.8);
    tex.fillCircle(4, 4, 4);
    tex.generateTexture('trailParticle', 8, 8);
    tex.destroy();

    const particles = this.add.particles('trailParticle');
    this.trailEmitter = particles.createEmitter({
      follow: this.player,
      followOffset: { x: 0, y: PLAYER_RADIUS * 0.5 },
      lifespan: TRAIL_LIFESPAN,
      quantity: TRAIL_QUANTITY,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      maxParticles: MAX_PARTICLES,
    });
    particles.setDepth(6);
  }

  private createUI(): void {
    this.layerText = this.add.text(16, 16, '层: 0', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: `#${COLOR_UI_TEXT.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3,
    }).setDepth(20).setScrollFactor(0);

    this.scoreText = this.add.text(GAME_WIDTH / 2, 16, '得分: 0', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: `#${COLOR_UI_TEXT.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(20).setScrollFactor(0);

    this.createControlPanel();
  }

  private createControlPanel(): void {
    const panelW = 160;
    const panelH = 90;
    const px = GAME_WIDTH - panelW / 2 - 12;
    const py = GAME_HEIGHT - panelH / 2 - 16;

    const panelBg = this.add.rectangle(0, 0, panelW, panelH, 0x221144, 0.55)
      .setStrokeStyle(1, 0x5544aa, 0.4);

    const resetBtn = this.add.text(0, -18, '↻ 重置', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ccccff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerdown', () => {
      this.scene.restart();
    });

    this.add.text(0, 6, '速度', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaacc',
    }).setOrigin(0.5);

    const sliderTrack = this.add.rectangle(0, 24, 110, 6, 0x554488, 0.6);

    this.speedKnob = this.add.circle(-45, 24, 8, 0x9988dd, 0.9)
      .setStrokeStyle(1, 0xbbaaff, 0.6)
      .setInteractive({ draggable: true });

    this.input.setDraggable(this.speedKnob);
    this.speedKnob.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const minX = -45;
      const maxX = 45;
      const clamped = Phaser.Math.Clamp(dragX, minX, maxX);
      this.speedKnob.x = clamped;
      this.gameSpeedMultiplier = 0.5 + ((clamped - minX) / (maxX - minX)) * 1.0;
    });

    this.controlPanel = this.add.container(px, py, [panelBg, resetBtn, sliderTrack, this.speedKnob]);
    this.controlPanel.setDepth(25);
    this.controlPanel.setScrollFactor(0);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      if (this.isPointOnControlPanel(pointer)) return;
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body.touching.down || body.blocked.down) {
        this.isCharging = true;
        this.chargeTime = 0;
      }
    });

    this.input.on('pointerup', () => {
      if (!this.isCharging || this.isGameOver) return;
      this.releaseJump();
    });
  }

  private isPointOnControlPanel(pointer: Phaser.Input.Pointer): boolean {
    if (!this.controlPanel) return false;
    const bounds = this.controlPanel.getBounds();
    return bounds.contains(pointer.x, pointer.y);
  }

  private releaseJump(): void {
    const chargeRatio = Phaser.Math.Clamp(this.chargeTime, 0, MAX_CHARGE) / MAX_CHARGE;
    const jumpVelocity = Phaser.Math.Linear(MIN_JUMP_VELOCITY, MAX_JUMP_VELOCITY, chargeRatio);
    const hSpeed = HORIZONTAL_SPEED * chargeRatio;

    this.player.setVelocityY(jumpVelocity);

    const pointer = this.input.activePointer;
    if (pointer) {
      const dx = pointer.x - this.player.x;
      if (Math.abs(dx) > 10) {
        const dir = dx > 0 ? 1 : -1;
        this.player.setVelocityX(hSpeed * dir);
      }
    }

    this.spawnRipple(this.player.x, this.player.y);
    this.isCharging = false;
    this.chargeTime = 0;
  }

  private spawnRipple(x: number, y: number): void {
    const ripple = this.add.graphics().setDepth(9);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: RIPPLE_LIFESPAN,
      ease: 'Cubic.Out',
      onUpdate: (tween) => {
        const p = tween.getValue();
        const scale = Phaser.Math.Linear(RIPPLE_SCALE_START, RIPPLE_SCALE_END, p);
        const radius = PLAYER_RADIUS * scale;
        const alpha = 1 - p;
        ripple.clear();
        ripple.lineStyle(2, COLOR_PLAYER_GLOW, alpha * 0.6);
        ripple.strokeCircle(x, y, radius);
      },
      onComplete: () => {
        ripple.destroy();
      },
    });
  }

  private onLandOnPlatform = (_player: any, _platformBody: any): void => {
    if (this.isGameOver) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y < -50) return;

    const landed = this.platforms.find(p => {
      return p.body.active && Math.abs(p.body.y - (this.player.y + PLAYER_RADIUS)) < 20;
    });

    if (landed && landed.layerIndex > this.highestLayer) {
      this.highestLayer = landed.layerIndex;
      this.score += landed.layerIndex - this.currentLayer;
      this.currentLayer = landed.layerIndex;
      this.updateScoreDisplay();
    }
  };

  private updateScoreDisplay(): void {
    this.scoreText.setText(`得分: ${this.score}`);
    this.layerText.setText(`层: ${this.currentLayer}`);
  }

  private lightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * amount));
    const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * amount));
    const b = Math.min(255, (color & 0xff) + Math.floor(255 * amount));
    return (r << 16) | (g << 8) | b;
  }

  private generateNewPlatforms(): void {
    const playerLayer = Math.floor((GAME_HEIGHT - this.player.y) / LAYER_SPACING);
    const topNeeded = playerLayer + PLATFORMS_ABOVE;
    const bottomNeeded = playerLayer - PLATFORMS_BELOW;

    const existingTopLayer = this.platforms.length > 0
      ? Math.max(...this.platforms.map(p => p.layerIndex))
      : 0;

    for (let i = existingTopLayer + 1; i <= topNeeded; i++) {
      this.createPlatform(i);
    }

    this.platforms = this.platforms.filter(p => {
      if (p.layerIndex < bottomNeeded) {
        p.container.destroy();
        p.body.destroy();
        return false;
      }
      return true;
    });

    this.prisms = this.prisms.filter(p => {
      const camScroll = this.cameras.main.scrollY;
      const offScreen = p.cy - camScroll > GAME_HEIGHT + 200;
      if (offScreen) {
        p.graphics.destroy();
        p.hitSprite.destroy();
        p.overlapRef.destroy();
        return false;
      }
      return true;
    });

    this.orbs = this.orbs.filter(o => {
      const camScroll = this.cameras.main.scrollY;
      const offScreen = o.baseY - camScroll > GAME_HEIGHT + 200;
      if (offScreen) {
        o.visual.destroy();
        o.hitSprite.destroy();
        o.overlapRef.destroy();
        return false;
      }
      return true;
    });
  }

  private updateObstacles(delta: number): void {
    const dt = delta * 0.001 * this.gameSpeedMultiplier;

    this.prisms.forEach((prism) => {
      prism.angle += prism.speed * dt;
      const rad = Phaser.Math.DegToRad(prism.angle);

      prism.graphics.clear();

      prism.graphics.lineStyle(6, COLOR_PRISM, 0.2);
      prism.graphics.beginPath();
      prism.graphics.moveTo(
        prism.cx + Math.cos(rad) * prism.length / 2,
        prism.cy + Math.sin(rad) * prism.length / 2
      );
      prism.graphics.lineTo(
        prism.cx - Math.cos(rad) * prism.length / 2,
        prism.cy - Math.sin(rad) * prism.length / 2
      );
      prism.graphics.strokePath();

      prism.graphics.lineStyle(3, COLOR_PRISM, 0.9);
      prism.graphics.beginPath();
      prism.graphics.moveTo(
        prism.cx + Math.cos(rad) * prism.length / 2,
        prism.cy + Math.sin(rad) * prism.length / 2
      );
      prism.graphics.lineTo(
        prism.cx - Math.cos(rad) * prism.length / 2,
        prism.cy - Math.sin(rad) * prism.length / 2
      );
      prism.graphics.strokePath();

      prism.hitSprite.setPosition(prism.cx, prism.cy);
      prism.hitSprite.body.rotation = prism.angle;
      prism.hitSprite.refreshBody();
    });

    this.orbs.forEach((orb) => {
      orb.time += dt * 2;
      const offsetY = Math.sin(orb.time) * orb.range;
      const newY = orb.baseY + offsetY;
      orb.visual.y = newY;

      const pulse = 0.7 + Math.sin(this.time.now * 0.006) * 0.3;
      orb.visual.setAlpha(pulse);

      orb.hitSprite.setPosition(orb.visual.x, newY);
      orb.hitSprite.refreshBody();
    });
  }

  private updateCamera(): void {
    const targetY = this.player.y - GAME_HEIGHT * 0.4;
    const cam = this.cameras.main;
    cam.scrollY += (targetY - cam.scrollY) * CAMERA_LERP;
  }

  private triggerGameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isCharging = false;

    this.trailEmitter.stop();

    this.player.setVelocity(0, 0);
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;

    this.spawnDeathParticles();

    this.time.delayedCall(800, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('GameOverScene', { score: this.score, layer: this.currentLayer });
      });
    });
  }

  private spawnDeathParticles(): void {
    const tex = this.make.graphics({ x: 0, y: 0 }, false);
    tex.fillStyle(0xffffff, 1);
    tex.fillCircle(5, 5, 5);
    tex.generateTexture('deathParticle', 10, 10);
    tex.destroy();

    const particles = this.add.particles('deathParticle');
    particles.createEmitter({
      x: this.player.x,
      y: this.player.y,
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: { min: 300, max: 800 },
      quantity: 30,
      blendMode: Phaser.BlendModes.ADD,
      tint: [COLOR_PLAYER, COLOR_PLAYER_GLOW, 0xffffff],
      maxParticles: 50,
      emitting: false,
    }).explode(30, this.player.x, this.player.y);
    particles.setDepth(15);
  }

  private checkFallOff(): void {
    if (this.player.y > this.cameras.main.scrollY + GAME_HEIGHT + 100) {
      this.triggerGameOver();
    }
  }

  private updateCharging(delta: number): void {
    if (!this.isCharging) {
      this.chargeIndicator.setAlpha(0);
      return;
    }

    this.chargeTime += delta * 0.001 * CHARGE_RATE;
    const ratio = Phaser.Math.Clamp(this.chargeTime / MAX_CHARGE, 0, 1);
    this.chargeIndicator.setPosition(this.player.x, this.player.y);
    this.chargeIndicator.setRadius(PLAYER_RADIUS + 4 + ratio * 12);
    this.chargeIndicator.setAlpha(ratio * 0.5);
    this.chargeIndicator.setStrokeStyle(2, COLOR_PLAYER_GLOW, ratio * 0.8);
    this.chargeIndicator.setFillStyle(COLOR_PLAYER_GLOW, ratio * 0.15);

    if (this.chargeTime >= MAX_CHARGE) {
      this.releaseJump();
    }
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    this.playerVisual.setPosition(this.player.x, this.player.y);
    this.playerGlow.setPosition(this.player.x, this.player.y);
    this.playerGlow.setAlpha(0.15 + Math.sin(this.time.now * 0.004) * 0.08);

    this.updateCharging(delta);
    this.updateCamera();
    this.generateNewPlatforms();
    this.updateObstacles(delta);
    this.checkFallOff();

    const playerLayer = Math.max(0, Math.floor((GAME_HEIGHT - this.player.y) / LAYER_SPACING));
    if (playerLayer > this.currentLayer) {
      this.score += playerLayer - this.currentLayer;
      this.currentLayer = playerLayer;
      this.updateScoreDisplay();
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.x !== 0) {
      const friction = body.touching.down || body.blocked.down ? 0.92 : 0.985;
      this.player.setVelocityX(body.velocity.x * friction);
    }

    if (this.player.x < PLAYER_RADIUS) this.player.setX(PLAYER_RADIUS);
    if (this.player.x > GAME_WIDTH - PLAYER_RADIUS) this.player.setX(GAME_WIDTH - PLAYER_RADIUS);
  }
}
