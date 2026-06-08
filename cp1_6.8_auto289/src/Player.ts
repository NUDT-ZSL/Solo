import Phaser from 'phaser';

const PLAYER_SPEED = 160;
const DASH_SPEED = 450;
const DASH_DURATION = 180;
const DASH_COOLDOWN = 3000;

export class Player extends Phaser.GameObjects.Container {
  private bodySprite!: Phaser.GameObjects.Graphics;
  private glowSprite!: Phaser.GameObjects.Graphics;
  private trailParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private isDashing: boolean = false;
  private dashTimer: number = 0;
  private dashCooldownTimer: number = 0;
  private dashDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private facingDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 1);
  private isInShadow: boolean = false;
  private velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private sceneRef: Phaser.Scene;
  private _lostFragment: boolean = false;

  get dashCooldownProgress(): number {
    if (this.dashCooldownTimer <= 0) return 1;
    return 1 - this.dashCooldownTimer / DASH_COOLDOWN;
  }

  get isDashReady(): boolean {
    return this.dashCooldownTimer <= 0 && !this.isDashing;
  }

  get inShadow(): boolean {
    return this.isInShadow;
  }

  set inShadow(val: boolean) {
    this.isInShadow = val;
  }

  get facing(): Phaser.Math.Vector2 {
    return this.facingDirection;
  }

  get lostFragment(): boolean {
    return this._lostFragment;
  }

  set lostFragment(val: boolean) {
    this._lostFragment = val;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.sceneRef = scene;

    this.glowSprite = new Phaser.GameObjects.Graphics(scene);
    this.drawGlow();
    this.add(this.glowSprite);

    this.bodySprite = new Phaser.GameObjects.Graphics(scene);
    this.drawBody();
    this.add(this.bodySprite);

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 28);
    body.setOffset(-10, -14);
    body.setCollideWorldBounds(true);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.spaceKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.eKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.createTrailParticles();

    scene.add.existing(this);
  }

  private drawBody(): void {
    this.bodySprite.clear();
    this.bodySprite.fillStyle(0x0a0a0a, 0.85);
    this.bodySprite.fillRoundedRect(-8, -14, 16, 28, 4);
    this.bodySprite.fillStyle(0x0a0a0a, 0.9);
    this.bodySprite.fillCircle(0, -18, 7);
    this.bodySprite.lineStyle(1.5, 0x4488ff, 0.4);
    this.bodySprite.strokeRoundedRect(-8, -14, 16, 28, 4);
    this.bodySprite.strokeCircle(0, -18, 7);
  }

  private drawGlow(): void {
    this.glowSprite.clear();
    this.glowSprite.fillStyle(0x4466cc, 0.06);
    this.glowSprite.fillCircle(0, -2, 30);
    this.glowSprite.fillStyle(0x4466cc, 0.03);
    this.glowSprite.fillCircle(0, -2, 45);
  }

  private createTrailParticles(): void {
    const gfx = this.sceneRef.add.graphics();
    gfx.fillStyle(0x4466cc, 0.8);
    gfx.fillCircle(3, 3, 3);
    gfx.generateTexture('trailParticle', 6, 6);
    gfx.destroy();

    this.trailParticles = this.sceneRef.add.particles(this.x, this.y, 'trailParticle', {
      speed: { min: 5, max: 15 },
      lifespan: 500,
      quantity: 1,
      frequency: 60,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      follow: this,
      emitting: false,
    });
  }

  update(delta: number): void {
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
      if (this.dashCooldownTimer < 0) this.dashCooldownTimer = 0;
    }

    if (this.isDashing) {
      this.dashTimer -= delta;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    this.handleInput();

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.isDashing) {
      body.setVelocity(
        this.dashDirection.x * DASH_SPEED,
        this.dashDirection.y * DASH_SPEED
      );
    } else {
      body.setVelocity(this.velocity.x, this.velocity.y);
    }

    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (speed > 10 || this.isDashing) {
      this.trailParticles.emitting = true;
    } else {
      this.trailParticles.emitting = false;
    }

    this.updateVisuals();
  }

  private handleInput(): void {
    if (this.isDashing) return;

    this.velocity.set(0, 0);

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx -= 1;
    if (this.cursors.right.isDown) dx += 1;
    if (this.cursors.up.isDown) dy -= 1;
    if (this.cursors.down.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.facingDirection.set(dx, dy);
      this.velocity.set(dx * PLAYER_SPEED, dy * PLAYER_SPEED);
    }

    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.isDashReady) {
      this.startDash();
    }
  }

  private startDash(): void {
    this.isDashing = true;
    this.dashTimer = DASH_DURATION;
    this.dashCooldownTimer = DASH_COOLDOWN;

    if (this.velocity.x === 0 && this.velocity.y === 0) {
      this.dashDirection.set(this.facingDirection.x, this.facingDirection.y);
    } else {
      const len = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      this.dashDirection.set(this.velocity.x / len, this.velocity.y / len);
    }
  }

  private updateVisuals(): void {
    this.glowSprite.clear();
    if (this.isInShadow) {
      this.glowSprite.fillStyle(0x4466cc, 0.12);
      this.glowSprite.fillCircle(0, -2, 35);
      this.glowSprite.fillStyle(0x4466cc, 0.06);
      this.glowSprite.fillCircle(0, -2, 50);
      this.setAlpha(0.6);
    } else {
      this.glowSprite.fillStyle(0x4466cc, 0.06);
      this.glowSprite.fillCircle(0, -2, 30);
      this.glowSprite.fillStyle(0x4466cc, 0.03);
      this.glowSprite.fillCircle(0, -2, 45);
      this.setAlpha(0.9);
    }

    if (this.isDashing) {
      this.setAlpha(0.35);
    }
  }

  isInteracting(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.spaceKey);
  }

  respawnAt(x: number, y: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.isDashing = false;
    this.dashTimer = 0;
    this.velocity.set(0, 0);
    this.setPosition(x, y);

    this.sceneRef.tweens.add({
      targets: this,
      alpha: 0.1,
      duration: 100,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.setAlpha(0.9);
      },
    });
  }

  destroy(fromScene?: boolean): void {
    this.trailParticles.destroy();
    super.destroy(fromScene);
  }
}
