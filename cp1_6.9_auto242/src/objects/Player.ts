import Phaser from 'phaser';

export const COLORS = {
  INK_BLACK: 0x1a1a1a,
  PIT_BLUE: 0x2a4a7f,
  GOLD_INK: 0xffd700,
  GOLD_GLOW: 0xffec8b
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private baseColor: Phaser.Display.Color;
  private targetColor: Phaser.Display.Color;
  private colorTween: Phaser.Tweens.Tween | null = null;
  public energy: number = 0;
  public readonly maxEnergy: number = 5;
  public isJumping: boolean = false;
  public isDashing: boolean = false;
  public isInvincible: boolean = false;
  public speedMultiplier: number = 1.0;
  private slowdownTimer: number = 0;
  public dashCooldown: number = 0;
  public onGround: boolean = false;
  private trailParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sceneRef: Phaser.Scene;
  private squishTween: Phaser.Tweens.Tween | null = null;
  private wobble: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    this.sceneRef = scene;
    this.baseColor = Phaser.Display.Color.IntegerToColor(COLORS.INK_BLACK);
    this.targetColor = this.baseColor.clone();

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setBodySize(36, 36);
    this.setOffset(6, 6);
    this.setBounce(0.1);
    this.setCollideWorldBounds(true);
    this.name = 'player';

    this.createTrail();
  }

  private createTrail(): void {
    this.trailParticles = this.sceneRef.add.particles(0, 0, 'player', {
      lifespan: 300,
      speed: { min: 80, max: 120 },
      angle: { min: 160, max: 200 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.6, end: 0 },
      quantity: 1,
      frequency: 40,
      blendMode: 'NORMAL',
      tint: this.baseColor.color,
      follow: this,
      followOffset: { x: -10, y: 0 }
    });
  }

  public jump(): void {
    if (!this.isJumping && this.onGround) {
      this.setVelocityY(-720);
      this.isJumping = true;
      this.onGround = false;
      this.playSquishAnim(true);
      this.sceneRef.sound.play('jump', { volume: 0.3 });
    }
  }

  public dash(): void {
    if (!this.isDashing && this.dashCooldown <= 0) {
      this.isDashing = true;
      this.isInvincible = true;
      this.setVelocityX(600);
      this.playSquishAnim(false);
      this.sceneRef.sound.play('dash', { volume: 0.25 });

      this.sceneRef.time.delayedCall(250, () => {
        this.isDashing = false;
        this.isInvincible = false;
      });

      this.dashCooldown = 800;
    }
  }

  private playSquishAnim(isJump: boolean): void {
    if (this.squishTween) {
      this.squishTween.remove();
    }
    const sx = isJump ? { start: 1, mid: 1.3, end: 1 };
    const sy = isJump ? { start: 1, mid: 0.7, end: 1 } : { start: 1, mid: 0.8, end: 1 };
    this.squishTween = this.sceneRef.tweens.add({
      targets: this,
      scaleX: { from: sx.start, to: sx.end },
      duration: 200,
      ease: 'Sine.easeOut',
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const v = tween.getValue();
        this.scaleX = sx.start + (sx.mid - sx.start) * 2 * (1 - Math.abs(v - 0.5) * 2;
        this.scaleY = sy.start + (sy.mid - sy.start) * 2 * (1 - Math.abs(v - 0.5) * 2;
      }
    });
  }

  public releaseInkBlast(): boolean {
    if (this.energy >= this.maxEnergy) {
      this.energy = 0;
      return true;
    }
    return false;
  }

  public hitObstacle(): void {
    if (this.isInvincible) return;
    this.applySlowdown(0.8, 1000);
    this.spawnSplashParticles();
    this.sceneRef.cameras.main.shake(120, 0.006);
    this.sceneRef.sound.play('splash', { volume: 0.4 });
  }

  private spawnSplashParticles(): void {
    const count = Phaser.Math.Between(3, 5);
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(20, 40);
      const tx = this.x + Math.cos(angle) * dist;
      const ty = this.y + Math.sin(angle) * dist;
      const g = this.sceneRef.add.circle(tx, ty, Phaser.Math.Between(4, 8), COLORS.INK_BLACK, 0.8);
      this.sceneRef.tweens.add({
        targets: g,
        scale: { from: 0.2, to: 1.5 },
        alpha: { from: 0.9, to: 0 },
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => { g.destroy(); }
      });
    }
  }

  public fallIntoPit(): void {
    const pitColor = Phaser.Display.Color.IntegerToColor(COLORS.PIT_BLUE);
    this.mixColor(pitColor);
    this.applySlowdown(0.7, 1500);
    this.sceneRef.sound.play('pitfall', { volume: 0.35 });
  }

  private mixColor(target: Phaser.Display.Color): void {
    this.targetColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      this.baseColor, target, 2, 1,
      new Phaser.Display.Color(0, 0, 0)
    );
    if (this.colorTween) {
      this.colorTween.remove();
    }
    const startColor = this.baseColor.clone();
    const endColor = this.targetColor.clone();
    this.colorTween = this.sceneRef.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 500,
      ease: 'Cubic.easeInOut',
      onUpdate: (tween) => {
        const v = tween.getValue();
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          startColor, endColor, 100, v * 100, new Phaser.Display.Color(0, 0, 0)
        );
        const intColor = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
        this.setTint(intColor);
        if (this.trailParticles) {
          this.trailParticles.setTint(intColor);
        }
      },
      onComplete: () => {
        this.baseColor = endColor.clone();
      }
    });
  }

  public collectInkDot(): boolean {
    if (this.energy < this.maxEnergy) {
      this.energy++;
      this.sceneRef.sound.play('collect', { volume: 0.5 });
      return true;
    }
    return false;
  }

  public applySlowdown(mult: number, duration: number): void {
    const newMult = Math.min(this.speedMultiplier, mult);
    this.speedMultiplier = newMult;
    this.slowdownTimer = Math.max(this.slowdownTimer, duration);
  }

  public update(time: number, delta: number): void {
    if (this.slowdownTimer > 0) {
      this.slowdownTimer -= delta;
      if (this.slowdownTimer <= 0) {
        this.slowdownTimer = 0;
        this.speedMultiplier = 1.0;
      }
    }

    if (this.dashCooldown > 0) {
      this.dashCooldown -= delta;
    }

    this.wobble += delta * 0.01;
    if (this.trailParticles) {
      const baseScale = 1 + Math.sin(this.wobble) * 0.08;
      this.scaleX = baseScale;
      this.scaleY = 2 - baseScale;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const touchingDown = body.touching.down;
    const blockedDown = body.blocked.down;
    const onGroundNow = touchingDown || blockedDown;
    if (onGroundNow && !this.onGround) {
      if (this.isJumping) {
        this.isJumping = false;
      }
    }
    this.onGround = onGroundNow;
  }

  public getEnergyPercent(): number {
    return this.energy / this.maxEnergy;
  }

  public getCurrentColor(): number {
    return Phaser.Display.Color.GetColor(this.baseColor.r, this.baseColor.g, this.baseColor.b);
  }
}
