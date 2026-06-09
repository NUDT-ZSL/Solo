import Phaser from 'phaser';

interface PlayerConfig {
  x: number;
  y: number;
}

export default class Player {
  scene: Phaser.Scene;
  sprite!: Phaser.Physics.Arcade.Sprite;
  container!: Phaser.GameObjects.Container;
  glow!: Phaser.GameObjects.Graphics;
  trail!: Phaser.GameObjects.Graphics;

  moveSpeed: number = 5;
  jumpForce: number = 18;
  gravity: number = 0.8;
  velocityY: number = 0;

  canDoubleJump: boolean = false;
  jumpsRemaining: number = 2;
  isOnGround: boolean = false;

  energy: number = 0;
  maxEnergy: number = 30;
  energyPerShard: number = 1;
  isImpactReady: boolean = false;
  isImpactActive: boolean = false;

  baseX: number;
  baseY: number;
  currentLane: number = 1;
  targetX: number;
  targetY: number;
  jumpProgress: number = 0;
  isJumping: boolean = false;

  shardParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  impactParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  trailPositions: { x: number; y: number; alpha: number }[] = [];

  onImpact?: () => void;
  onEnergyChange?: (energy: number, maxEnergy: number, ready: boolean) => void;
  onDeath?: () => void;

  constructor(scene: Phaser.Scene, config: PlayerConfig) {
    this.scene = scene;
    this.baseX = config.x;
    this.baseY = config.y;
    this.targetX = config.x;
    this.targetY = config.y;
    this.currentLane = 1;

    this.create();
  }

  create() {
    this.container = this.scene.add.container(this.baseX, this.baseY);
    this.container.setDepth(100);

    this.glow = this.scene.add.graphics();
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.container.add(this.glow);

    const bodyGraphics = this.scene.add.graphics();
    this.container.add(bodyGraphics);

    this.drawPlayer(bodyGraphics, this.glow);

    this.trail = this.scene.add.graphics();
    this.trail.setBlendMode(Phaser.BlendModes.ADD);
    this.trail.setDepth(99);

    this.sprite = this.scene.physics.add.sprite(this.baseX, this.baseY, '__EMPTY');
    this.sprite.setVisible(false);
    if (this.sprite.body) {
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setSize(30, 50);
      body.setOffset(-15, -25);
      body.allowGravity = false;
      body.immovable = true;
    }

    this.setupParticles();
  }

  drawPlayer(body: Phaser.GameObjects.Graphics, glow: Phaser.GameObjects.Graphics) {
    glow.clear();
    glow.lineStyle(0, 0x000000, 0);
    glow.fillStyle(0x4488ff, 0.25);
    glow.fillEllipse(0, 0, 80, 80);
    glow.fillStyle(0x66aaff, 0.15);
    glow.fillEllipse(0, 0, 120, 120);

    body.clear();
    body.fillStyle(0xffffff, 1);
    body.fillRoundedRect(-10, -25, 20, 40, 6);

    body.fillStyle(0xaaccff, 1);
    body.fillCircle(0, -28, 14);

    body.fillStyle(0xffffff, 1);
    body.fillCircle(-5, -30, 4);
    body.fillCircle(5, -30, 4);

    body.lineStyle(2, 0x66aaff, 0.8);
    body.strokeRoundedRect(-10, -25, 20, 40, 6);
  }

  setupParticles() {
    this.shardParticles = this.scene.add.particles(0, 0, undefined, {
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      lifespan: 400,
      quantity: 1,
      tint: [0xffdd44, 0xffaa22, 0xffff88],
      blendMode: 'ADD',
      active: false
    });

    this.impactParticles = this.scene.add.particles(0, 0, undefined, {
      speed: { min: 200, max: 600 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: 0,
      tint: [0xffdd44, 0xff8844, 0xffffaa, 0xffffff],
      blendMode: 'ADD',
      active: false
    });
  }

  update(time: number, delta: number) {
    const moveSmooth = 0.15;
    this.container.x += (this.targetX - this.container.x) * moveSmooth;

    if (this.isJumping) {
      this.jumpProgress += delta / 16;
      const t = this.jumpProgress / 45;
      if (t >= 1) {
        t;
        this.isJumping = false;
        this.targetY = this.baseY;
        this.container.y = this.baseY;
        this.isOnGround = true;
      } else {
        const arc = -Math.sin(t * Math.PI) * 120;
        this.container.y = this.baseY + arc;
      }
    }

    this.container.y += (this.targetY - this.container.y) * moveSmooth;
    this.sprite.setPosition(this.container.x, this.container.y);

    this.updateTrail();

    if (this.isImpactActive) {
      this.glow.fillStyle(0xffff88, 0.4);
      this.glow.fillEllipse(0, 0, 150 + Math.sin(time * 0.05) * 20, 150 + Math.sin(time * 0.05) * 20);
    }

    if (this.isImpactReady && !this.isImpactActive) {
      const pulse = 1 + Math.sin(time * 0.008) * 0.15;
      this.glow.scaleX = pulse;
      this.glow.scaleY = pulse;
    } else {
      this.glow.scaleX = 1;
      this.glow.scaleY = 1;
    }
  }

  updateTrail() {
    this.trail.clear();

    this.trailPositions.unshift({ x: this.container.x, y: this.container.y, alpha: 1 });
    if (this.trailPositions.length > 15) {
      this.trailPositions.pop();
    }

    for (let i = 0; i < this.trailPositions.length; i++) {
      const p = this.trailPositions[i];
      const alpha = (1 - i / this.trailPositions.length) * 0.5;
      const size = (1 - i / this.trailPositions.length) * 20;
      this.trail.fillStyle(0x66aaff, alpha * 0.3);
      this.trail.fillEllipse(p.x, p.y, size, size);
    }
  }

  moveLeft() {
    if (this.currentLane > 0) {
      this.currentLane--;
      this.updateTargetPosition();
    }
  }

  moveRight() {
    if (this.currentLane < 2) {
      this.currentLane++;
      this.updateTargetPosition();
    }
  }

  jump() {
    if (this.isOnGround || this.jumpsRemaining > 0) {
      if (this.isOnGround) {
        this.jumpsRemaining = 1;
      } else {
        this.jumpsRemaining--;
      }
      this.isJumping = true;
      this.jumpProgress = 0;
      this.isOnGround = false;
    }
  }

  updateTargetPosition() {
    const laneWidth = 120;
    this.targetX = this.baseX + (this.currentLane - 1) * laneWidth;
  }

  collectShard() {
    if (this.energy < this.maxEnergy) {
      this.energy += this.energyPerShard;
      if (this.energy >= this.maxEnergy) {
        this.energy = this.maxEnergy;
        this.isImpactReady = true;
      }
      if (this.onEnergyChange) {
        this.onEnergyChange(this.energy, this.maxEnergy, this.isImpactReady);
      }
    }

    this.shardParticles.emitParticleAt(this.container.x, this.container.y, 5);
  }

  tryImpact() {
    if (this.isImpactReady && !this.isImpactActive) {
      this.triggerImpact();
    }
  }

  triggerImpact() {
    this.isImpactActive = true;
    this.isImpactReady = false;
    this.energy = 0;

    if (this.onEnergyChange) {
      this.onEnergyChange(this.energy, this.maxEnergy, this.isImpactReady);
    }

    this.impactParticles.setPosition(this.container.x, this.container.y);
    this.impactParticles.active = true;
    this.impactParticles.emitParticleAt(0, 0, 80);

    this.scene.cameras.main.shake(300, 0.015);

    if (this.onImpact) {
      this.onImpact();
    }

    this.scene.time.delayedCall(1000, () => {
      this.isImpactActive = false;
    });
  }

  die() {
    this.scene.cameras.main.fadeOut(800, 255, 0, 0);
    if (this.onDeath) {
      this.onDeath();
    }
  }

  reset() {
    this.energy = 0;
    this.isImpactReady = false;
    this.isImpactActive = false;
    this.currentLane = 1;
    this.targetX = this.baseX;
    this.targetY = this.baseY;
    this.container.x = this.baseX;
    this.container.y = this.baseY;
    this.isJumping = false;
    this.isOnGround = true;
    this.jumpsRemaining = 2;
    this.trailPositions = [];

    if (this.onEnergyChange) {
      this.onEnergyChange(this.energy, this.maxEnergy, this.isImpactReady);
    }

    this.scene.cameras.main.resetFX();
  }

  setPosition(x: number, y: number) {
    this.baseX = x;
    this.baseY = y;
    this.container.setPosition(x, y);
    this.targetX = x;
    this.targetY = y;
    this.sprite.setPosition(x, y);
  }

  getBounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.container.x - 15,
      this.container.y - 30,
      30,
      60
    );
  }

  getJumpHeightRatio(): number {
    if (!this.isJumping) return 0;
    const t = this.jumpProgress / 45;
    return Math.sin(t * Math.PI);
  }
}
