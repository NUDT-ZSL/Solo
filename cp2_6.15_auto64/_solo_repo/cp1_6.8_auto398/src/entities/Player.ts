import Phaser from 'phaser';

export class Player extends Phaser.GameObjects.Container {
  private bodyCircle: Phaser.GameObjects.Arc;
  private glowCircle: Phaser.GameObjects.Arc;
  private innerGlow: Phaser.GameObjects.Arc;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private sceneRef: Phaser.Scene;

  public isGrounded: boolean = false;
  public isJumping: boolean = false;
  public isReleasingWave: boolean = false;
  public lightEnergy: number = 100;
  public maxLightEnergy: number = 100;
  public combo: number = 0;

  private jumpVelocity: number = -620;
  private playerSize: number = 18;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.sceneRef = scene;

    this.glowCircle = scene.add.circle(0, 0, this.playerSize + 10, 0xffcc00, 0.15);
    this.add(this.glowCircle);

    this.innerGlow = scene.add.circle(0, 0, this.playerSize + 4, 0xffdd33, 0.3);
    this.add(this.innerGlow);

    this.bodyCircle = scene.add.circle(0, 0, this.playerSize, 0xffcc00, 1);
    this.add(this.bodyCircle);

    scene.add.existing(this);

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.playerSize * 2, -this.playerSize, -this.playerSize);
    body.setOffset(-this.playerSize, -this.playerSize + this.playerSize);
    body.setBounce(0);
    body.setCollideWorldBounds(false);
    body.setAllowGravity(true);

    this.createTrail();
    this.createPulseAnimation();
  }

  private createTrail(): void {
    const trailKey = 'playerTrail';
    if (!this.sceneRef.textures.exists(trailKey)) {
      const g = this.sceneRef.add.graphics();
      g.fillStyle(0xffcc00, 0.8);
      g.fillCircle(4, 4, 4);
      g.generateTexture(trailKey, 8, 8);
      g.destroy();
    }

    this.trailEmitter = this.sceneRef.add.particles(0, 0, trailKey, {
      follow: this,
      followOffset: { x: -8, y: 0 },
      lifespan: { min: 200, max: 500 },
      speed: { min: 10, max: 40 },
      angle: { min: 150, max: 210 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.7, end: 0 },
      blendMode: 'ADD',
      frequency: 20,
      quantity: 2,
      tint: [0xffcc00, 0xffdd66, 0xffee88],
    });
  }

  private createPulseAnimation(): void {
    this.sceneRef.tweens.add({
      targets: this.glowCircle,
      radius: this.playerSize + 16,
      alpha: 0.25,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.sceneRef.tweens.add({
      targets: this.innerGlow,
      radius: this.playerSize + 8,
      alpha: 0.45,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  jump(): void {
    if (this.isGrounded && !this.isJumping) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocityY(this.jumpVelocity);
      this.isJumping = true;
      this.isGrounded = false;
      this.spawnJumpParticles();
    }
  }

  releaseLightWave(): boolean {
    if (this.lightEnergy >= 30 && !this.isReleasingWave) {
      this.lightEnergy -= 30;
      this.isReleasingWave = true;
      this.spawnWaveEffect();

      this.sceneRef.time.delayedCall(300, () => {
        this.isReleasingWave = false;
      });

      return true;
    }
    return false;
  }

  private spawnJumpParticles(): void {
    const key = 'jumpParticle';
    if (!this.sceneRef.textures.exists(key)) {
      const g = this.sceneRef.add.graphics();
      g.fillStyle(0xffcc00, 1);
      g.fillCircle(3, 3, 3);
      g.generateTexture(key, 6, 6);
      g.destroy();
    }

    const emitter = this.sceneRef.add.particles(this.x, this.y + this.playerSize, key, {
      speed: { min: 40, max: 120 },
      angle: { min: 220, max: 320 },
      lifespan: { min: 200, max: 400 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      blendMode: 'ADD',
      quantity: 12,
      tint: [0xffcc00, 0xffee88],
    });

    this.sceneRef.time.delayedCall(500, () => {
      emitter.stop();
      this.sceneRef.time.delayedCall(500, () => emitter.destroy());
    });
  }

  private spawnWaveEffect(): void {
    const waveGfx = this.sceneRef.add.graphics();
    let angle = 0;
    const maxAngle = 60;
    const range = 300;
    const cx = this.x;
    const cy = this.y;

    const updateWave = () => {
      waveGfx.clear();
      const progress = angle / maxAngle;
      const currentRange = range * progress;
      const currentAngle = angle;

      waveGfx.fillStyle(0xffcc00, 0.3 * (1 - progress));
      waveGfx.slice(cx, cy, currentRange, -currentAngle * Math.PI / 360, currentAngle * Math.PI / 360, false);
      waveGfx.fillPath();

      waveGfx.lineStyle(3, 0xffee88, 0.5 * (1 - progress));
      waveGfx.beginPath();
      waveGfx.arc(cx, cy, currentRange, -currentAngle * Math.PI / 360, currentAngle * Math.PI / 360, false);
      waveGfx.strokePath();

      angle += 4;
      if (angle <= maxAngle) {
        requestAnimationFrame(updateWave);
      } else {
        waveGfx.destroy();
      }
    };
    updateWave();
  }

  onLand(): void {
    this.isJumping = false;
    this.isGrounded = true;
    this.spawnLandParticles();
  }

  private spawnLandParticles(): void {
    const key = 'landParticle';
    if (!this.sceneRef.textures.exists(key)) {
      const g = this.sceneRef.add.graphics();
      g.fillStyle(0xffcc00, 1);
      g.fillCircle(2, 2, 2);
      g.generateTexture(key, 4, 4);
      g.destroy();
    }

    const emitter = this.sceneRef.add.particles(this.x, this.y + this.playerSize, key, {
      speed: { min: 30, max: 80 },
      angle: { min: 240, max: 300 },
      lifespan: { min: 150, max: 350 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      quantity: 8,
      tint: [0xffcc00, 0xffee88],
    });

    this.sceneRef.time.delayedCall(400, () => {
      emitter.stop();
      this.sceneRef.time.delayedCall(400, () => emitter.destroy());
    });
  }

  rechargeEnergy(amount: number): void {
    this.lightEnergy = Math.min(this.maxLightEnergy, this.lightEnergy + amount);
  }

  update(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) {
      if (this.isJumping) {
        this.onLand();
      } else {
        this.isGrounded = true;
      }
    }

    if (!this.isGrounded) {
      this.bodyCircle.setFillStyle(0xffdd66, 1);
      this.glowCircle.setFillStyle(0xffee88, 0.2);
    } else {
      this.bodyCircle.setFillStyle(0xffcc00, 1);
      this.glowCircle.setFillStyle(0xffcc00, 0.15);
    }

    if (this.lightEnergy < this.maxLightEnergy) {
      this.lightEnergy = Math.min(this.maxLightEnergy, this.lightEnergy + delta * 0.005);
    }
  }

  destroy(): void {
    if (this.trailEmitter) {
      this.trailEmitter.stop();
      this.trailEmitter.destroy();
    }
    super.destroy();
  }
}
