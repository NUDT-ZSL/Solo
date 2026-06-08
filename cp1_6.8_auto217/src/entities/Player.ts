import Phaser from 'phaser';

const PLAYER_RADIUS = 12;
const MOVE_SPEED = 280;
const JUMP_VELOCITY_MIN = -400;
const JUMP_VELOCITY_MAX = -700;
const JUMP_CHARGE_TIME = 500;
const TRAIL_SPAWN_INTERVAL = 30;
const PLAYER_TEXTURE_KEY = 'playerBallTexture';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private sceneRef: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private jumpChargeTime: number = 0;
  private isChargingJump: boolean = false;
  private isGrounded: boolean = false;
  private trailParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private glowCircle!: Phaser.GameObjects.Arc;
  private rippleEffects: Phaser.GameObjects.Arc[] = [];
  private onLightTrailLand: ((x: number, y: number) => void) | null = null;

  static ensureTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(PLAYER_TEXTURE_KEY)) return;
    const g = scene.add.graphics();
    g.fillStyle(0xa78bfa, 1);
    g.fillCircle(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_RADIUS);
    g.fillStyle(0xc4b5fd, 0.7);
    g.fillCircle(PLAYER_RADIUS - 3, PLAYER_RADIUS - 3, PLAYER_RADIUS * 0.4);
    g.generateTexture(PLAYER_TEXTURE_KEY, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    g.destroy();
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    Player.ensureTexture(scene);
    super(scene, x, y, PLAYER_TEXTURE_KEY);
    this.sceneRef = scene;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_RADIUS, 0, 0);
    body.setBounce(0.05);
    body.setCollideWorldBounds(true);
    this.setDepth(100);

    this.glowCircle = scene.add.circle(x, y, PLAYER_RADIUS + 8, 0x8b5cf6, 0.2);
    this.glowCircle.setDepth(99);

    this.createTrailEmitter();
    this.setupInput();
  }

  private createTrailEmitter(): void {
    const texKey = 'playerTrailParticle';
    if (!this.sceneRef.textures.exists(texKey)) {
      const g = this.sceneRef.add.graphics();
      g.fillStyle(0xa78bfa, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture(texKey, 8, 8);
      g.destroy();
    }

    this.trailParticles = this.sceneRef.add.particles(0, 0, texKey, {
      follow: this,
      followOffset: { x: 0, y: 0 },
      lifespan: 350,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      quantity: 1,
      frequency: TRAIL_SPAWN_INTERVAL,
    });
    this.trailParticles.setDepth(98);
  }

  private setupInput(): void {
    if (!this.sceneRef.input.keyboard) return;
    this.cursors = this.sceneRef.input.keyboard.createCursorKeys();
    this.spaceKey = this.sceneRef.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  setOnLightTrailLand(callback: (x: number, y: number) => void): void {
    this.onLightTrailLand = callback;
  }

  getIsGrounded(): boolean {
    return this.isGrounded;
  }

  getRadius(): number {
    return PLAYER_RADIUS;
  }

  update(_time: number, delta: number): void {
    if (!this.active) return;

    const body = this.body as Phaser.Physics.Arcade.Body;
    this.isGrounded = body.blocked.down || body.touching.down;

    if (!this.cursors) return;

    if (this.cursors.left.isDown) {
      body.setVelocityX(-MOVE_SPEED);
      this.trailParticles.emitting = true;
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(MOVE_SPEED);
      this.trailParticles.emitting = true;
    } else {
      body.setVelocityX(0);
      this.trailParticles.emitting = false;
    }

    if (this.spaceKey.isDown && this.isGrounded) {
      if (!this.isChargingJump) {
        this.isChargingJump = true;
        this.jumpChargeTime = 0;
      }
      this.jumpChargeTime += delta;
    }

    if (Phaser.Input.Keyboard.JustUp(this.spaceKey) && this.isChargingJump) {
      const chargeRatio = Math.min(this.jumpChargeTime / JUMP_CHARGE_TIME, 1);
      const jumpVelocity = JUMP_VELOCITY_MIN + (JUMP_VELOCITY_MAX - JUMP_VELOCITY_MIN) * chargeRatio;
      body.setVelocityY(jumpVelocity);
      this.isChargingJump = false;
      this.jumpChargeTime = 0;
      this.spawnJumpRipple();
    }

    this.glowCircle.setPosition(this.x + PLAYER_RADIUS, this.y + PLAYER_RADIUS);
    this.updateRipples(delta);
  }

  private spawnJumpRipple(): void {
    const ripple = this.sceneRef.add.circle(
      this.x + PLAYER_RADIUS,
      this.y + PLAYER_RADIUS * 2,
      5,
      0xc4b5fd,
      0.7
    );
    ripple.setStrokeStyle(2, 0xa78bfa, 0.9);
    ripple.setDepth(97);
    this.rippleEffects.push(ripple);
  }

  private updateRipples(delta: number): void {
    for (let i = this.rippleEffects.length - 1; i >= 0; i--) {
      const ripple = this.rippleEffects[i];
      const currentRadius = ripple.geom.radius;
      const newRadius = currentRadius + delta * 0.15;
      ripple.setRadius(newRadius);
      const newAlpha = ripple.alpha - delta * 0.002;
      ripple.setAlpha(Math.max(newAlpha, 0));
      if (ripple.alpha <= 0) {
        ripple.destroy();
        this.rippleEffects.splice(i, 1);
      }
    }
  }

  onLandOnPlatform(isLightTrail: boolean): void {
    if (isLightTrail && this.onLightTrailLand) {
      this.onLightTrailLand(this.x, this.y);
    }
  }

  destroy(fromScene?: boolean): void {
    this.glowCircle?.destroy();
    this.rippleEffects.forEach(r => r.destroy());
    this.trailParticles?.destroy();
    super.destroy(fromScene);
  }
}
