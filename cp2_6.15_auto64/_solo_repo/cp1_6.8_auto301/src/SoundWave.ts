import Phaser from 'phaser';

const MAX_BOUNCES = 2;
const BASE_SPEED = 500;
const BASE_LIFESPAN = 2000;

export class SoundWave extends Phaser.Physics.Arcade.Sprite {
  private bounceCount: number = 0;
  private maxBounces: number = MAX_BOUNCES;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private damage: number = 1;
  private lifespan: number = BASE_LIFESPAN;
  private spawnTime: number = 0;
  private trailTimer: Phaser.Time.TimerEvent | null = null;
  private sceneRef: Phaser.Scene;
  private wallGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private onHitCrystal: ((wave: SoundWave, crystal: Phaser.Physics.Arcade.Sprite) => void) | null = null;
  private onHitSpirit: ((wave: SoundWave, spirit: Phaser.Physics.Arcade.Sprite) => void) | null = null;
  private crystalGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private spiritGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private alive: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'soundwave');
    this.sceneRef = scene;
  }

  fire(dirX: number, dirY: number, bonusDamage: number = 0, bonusRange: number = 0): void {
    this.sceneRef.add.existing(this);
    this.sceneRef.physics.add.existing(this);

    this.damage = 1 + bonusDamage;
    this.lifespan = BASE_LIFESPAN + bonusRange * 300;
    this.maxBounces = MAX_BOUNCES;

    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const speed = BASE_SPEED + bonusRange * 80;
    this.velocityX = (dirX / len) * speed;
    this.velocityY = (dirY / len) * speed;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(this.velocityX, this.velocityY);
    body.setAllowGravity(false);
    body.setCircle(7, 1, 1);
    body.setBounce(1, 1);

    this.spawnTime = this.sceneRef.time.now;
    this.alive = true;

    this.setupTrail();

    this.sceneRef.physics.add.overlap(this, this.crystalGroup!, (obj, crystalObj) => {
      if (!this.alive) return;
      if (this.onHitCrystal) {
        this.onHitCrystal(this, crystalObj as Phaser.Physics.Arcade.Sprite);
      }
    });

    this.sceneRef.physics.add.overlap(this, this.spiritGroup!, (obj, spiritObj) => {
      if (!this.alive) return;
      if (this.onHitSpirit) {
        this.onHitSpirit(this, spiritObj as Phaser.Physics.Arcade.Sprite);
      }
    });

    this.sceneRef.physics.add.collider(this, this.wallGroup!, this.onWallHit, undefined, this);
  }

  private onWallHit = (waveObj: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile): void => {
    if (!this.alive) return;

    this.bounceCount++;
    if (this.bounceCount > this.maxBounces) {
      this.kill();
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const newVx = body.velocity.x;
    const newVy = body.velocity.y;
    this.velocityX = newVx;
    this.velocityY = newVy;

    this.sceneRef.tweens.add({
      targets: this,
      alpha: 0.6,
      duration: 50,
      yoyo: true,
    });
  };

  private setupTrail(): void {
    this.trailTimer = this.sceneRef.time.addEvent({
      delay: 40,
      callback: () => {
        if (!this.alive || !this.active) return;
        const trail = this.sceneRef.add.image(this.x, this.y, 'wave_trail');
        trail.setAlpha(0.6);
        trail.setDepth(5);
        this.sceneRef.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.3,
          duration: 300,
          onComplete: () => trail.destroy(),
        });
      },
      loop: true,
    });
  }

  update(time: number, delta: number): void {
    if (!this.alive || !this.active) return;

    if (time - this.spawnTime > this.lifespan) {
      this.kill();
      return;
    }

    if (this.bounceCount > this.maxBounces) {
      this.kill();
      return;
    }
  }

  kill(): void {
    if (!this.alive) return;
    this.alive = false;
    if (this.trailTimer) {
      this.trailTimer.destroy();
      this.trailTimer = null;
    }
    this.sceneRef.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.2,
      duration: 120,
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
        this.destroy();
      },
    });
  }

  getDamage(): number {
    return this.damage;
  }

  setWallGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.wallGroup = group;
  }

  setCrystalGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.crystalGroup = group;
  }

  setSpiritGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    this.spiritGroup = group;
  }

  setOnHitCrystal(cb: (wave: SoundWave, crystal: Phaser.Physics.Arcade.Sprite) => void): void {
    this.onHitCrystal = cb;
  }

  setOnHitSpirit(cb: (wave: SoundWave, spirit: Phaser.Physics.Arcade.Sprite) => void): void {
    this.onHitSpirit = cb;
  }

  isAlive(): boolean {
    return this.alive;
  }
}
