import Phaser from 'phaser';

export class Platform extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setImmovable(true);
    this.body?.setSize(width, height);
    this.displayWidth = width;
    this.displayHeight = height;

    this.createPlatformTexture(width, height);
  }

  private createPlatformTexture(width: number, height: number): void {
    const key = `platform_${width}_${height}_${Phaser.Math.Between(0, 9999)}`;
    const gfx = this.scene.add.graphics();

    gfx.fillGradientStyle(0x3a3a42, 0x2a2a32, 0x2a2a32, 0x1a1a22, 1, 1, 1, 1);
    gfx.fillRect(0, 0, width, height);

    gfx.lineStyle(1, 0x7a7a8a, 0.4);
    for (let i = 0; i < 6; i++) {
      const x1 = Phaser.Math.Between(5, width - 5);
      const y1 = Phaser.Math.Between(2, height - 2);
      const segs = Phaser.Math.Between(2, 4);
      gfx.beginPath();
      gfx.moveTo(x1, y1);
      let cx = x1, cy = y1;
      for (let s = 0; s < segs; s++) {
        cx += Phaser.Math.Between(-25, 25);
        cy += Phaser.Math.Between(-8, 8);
        cx = Phaser.Math.Clamp(cx, 2, width - 2);
        cy = Phaser.Math.Clamp(cy, 2, height - 2);
        gfx.lineTo(cx, cy);
      }
      gfx.strokePath();
    }

    gfx.lineStyle(1.5, 0xaabbff, 0.55);
    gfx.strokeRect(0.5, 0.5, width - 1, height - 1);

    gfx.lineStyle(0.8, 0xccddff, 0.25);
    gfx.strokeRect(1.5, 1.5, width - 3, height - 3);

    gfx.generateTexture(key, width, height);
    gfx.destroy();

    this.setTexture(key);

    this.preFX?.addGlow(0xaabbff, 0.15, 6);
  }
}

export class MovableBox extends Phaser.Physics.Arcade.Sprite {
  private pushParticles: Phaser.GameObjects.Particles.ParticleEmitter;
  private lastVX: number = 0;
  private textureKey: string;

  constructor(scene: Phaser.Scene, x: number, y: number, size: number = 48) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, false);

    this.setImmovable(false);
    this.setPushable(true);
    this.setDrag(800, 0);
    this.setFriction(1, 0);
    this.setMaxVelocity(260, 600);
    this.body?.setSize(size, size);
    this.displayWidth = size;
    this.displayHeight = size;
    this.textureKey = `mbox_${size}_${Phaser.Math.Between(0, 9999)}`;

    this.createBoxTexture(size);
    this.pushParticles = this.createPushParticles();
    this.pushParticles.stop();
  }

  private createBoxTexture(size: number): void {
    const gfx = this.scene.add.graphics();

    gfx.fillGradientStyle(0x5848a8, 0x383078, 0x383078, 0x282058, 1, 1, 1, 1);
    gfx.fillRect(0, 0, size, size);

    gfx.lineStyle(1, 0xbbaaff, 0.35);
    for (let i = 0; i < 5; i++) {
      const x1 = Phaser.Math.Between(4, size - 4);
      const y1 = Phaser.Math.Between(4, size - 4);
      const segs = Phaser.Math.Between(2, 3);
      gfx.beginPath();
      gfx.moveTo(x1, y1);
      let cx = x1, cy = y1;
      for (let s = 0; s < segs; s++) {
        cx += Phaser.Math.Between(-18, 18);
        cy += Phaser.Math.Between(-10, 10);
        cx = Phaser.Math.Clamp(cx, 2, size - 2);
        cy = Phaser.Math.Clamp(cy, 2, size - 2);
        gfx.lineTo(cx, cy);
      }
      gfx.strokePath();
    }

    gfx.lineStyle(2, 0xbbccff, 0.7);
    gfx.strokeRect(1, 1, size - 2, size - 2);

    gfx.generateTexture(this.textureKey, size, size);
    gfx.destroy();

    this.setTexture(this.textureKey);

    this.preFX?.addGlow(0x99aaff, 0.35, 10);
  }

  private createPushParticles(): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.scene.add.particles(0, 0, this.textureKey, {
      lifespan: 400,
      speed: { min: 30, max: 90 },
      scale: { start: 0.08, end: 0 },
      alpha: { start: 0.9, end: 0 },
      quantity: 0,
      blendMode: 'ADD',
      tint: [0xbbaaff, 0x99aaff, 0xccddff]
    });
  }

  update(_time: number, delta: number): void {
    const curVX = this.body?.velocity.x ?? 0;
    const speed = Math.abs(curVX);

    if (speed > 15) {
      const facing = curVX > 0 ? -1 : 1;
      this.pushParticles.setPosition(
        this.x + facing * (this.displayWidth / 2),
        this.y + Phaser.Math.Between(-this.displayHeight / 2 + 6, this.displayHeight / 2 - 6)
      );
      this.pushParticles.emitParticle(1);
    }

    if (this.lastVX !== 0 && curVX === 0) {
      const spring = this.lastVX * 0.3;
      this.setVelocityX(spring);
    }
    this.lastVX = curVX;
  }

  applyPush(direction: number, playerSpeed: number): void {
    const target = direction * playerSpeed * 0.6;
    const cur = this.body?.velocity.x ?? 0;
    const blended = Phaser.Math.Linear(cur, target, 0.18);
    this.setVelocityX(blended);
  }
}

export class Ground extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y, '');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.setImmovable(true);
    this.body?.setSize(width, height);
    this.displayWidth = width;
    this.displayHeight = height;

    const key = `ground_${width}_${height}`;
    const gfx = scene.add.graphics();
    gfx.fillStyle(0x40404a, 0.55);
    gfx.fillRect(0, 0, width, height);
    gfx.lineStyle(1, 0x707078, 0.4);
    for (let i = 0; i < width; i += 40) {
      gfx.beginPath();
      gfx.moveTo(i, 0);
      gfx.lineTo(i + 20, height);
      gfx.strokePath();
    }
    gfx.generateTexture(key, width, height);
    gfx.destroy();

    this.setTexture(key);
    this.setAlpha(0.75);
  }
}
