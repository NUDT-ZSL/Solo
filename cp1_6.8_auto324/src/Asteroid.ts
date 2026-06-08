import Phaser from 'phaser';

export enum AsteroidState {
  Idle = 'idle',
  Flying = 'flying',
  Captured = 'captured',
  Destroyed = 'destroyed',
}

export class Asteroid extends Phaser.GameObjects.Container {
  private asteroidBody: Phaser.GameObjects.Image;
  private trail: Phaser.GameObjects.Graphics;
  private asteroidState: AsteroidState = AsteroidState.Idle;
  private path: Phaser.Math.Vector2[] = [];
  private pathIndex: number = 0;
  private speed: number = 180;
  private trailPoints: { x: number; y: number; alpha: number }[] = [];
  private rotationSpeed: number = 0;
  private velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

  public onHitGate?: (asteroid: Asteroid, gateIndex: number) => void;
  public onCapturedByBlackhole?: (asteroid: Asteroid) => void;
  public onCollectFragment?: (asteroid: Asteroid, fragmentIndex: number) => void;
  public onOutOfBounds?: (asteroid: Asteroid) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.asteroidBody = scene.add.image(0, 0, 'asteroid');
    this.add(this.asteroidBody);

    this.trail = scene.add.graphics();
    scene.add.existing(this.trail);

    this.rotationSpeed = Phaser.Math.FloatBetween(-2, 2);
    this.asteroidBody.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

    this.scene.physics.add.existing(this as unknown as Phaser.Physics.Arcade.Image, false);
    const physBody = (this as unknown as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;
    physBody.setCircle(20, 4, 4);
    physBody.setImmovable(false);
    physBody.setBounce(0, 0);
  }

  public launchAlongPath(points: Phaser.Math.Vector2[]): void {
    if (points.length < 2) return;

    this.path = points;
    this.pathIndex = 0;
    this.asteroidState = AsteroidState.Flying;

    const physBody = (this as unknown as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;
    physBody.setVelocity(0, 0);

    const dir = new Phaser.Math.Vector2(
      points[1].x - points[0].x,
      points[1].y - points[0].y
    ).normalize();

    this.velocity = dir.scale(this.speed);
    physBody.setVelocity(this.velocity.x, this.velocity.y);
  }

  public applyInterference(offsetX: number, offsetY: number): void {
    if (this.asteroidState !== AsteroidState.Flying) return;
    const physBody = (this as unknown as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;
    physBody.setVelocity(
      physBody.velocity.x + offsetX,
      physBody.velocity.y + offsetY
    );
  }

  public pullToward(x: number, y: number, strength: number): void {
    if (this.asteroidState !== AsteroidState.Flying) return;

    const dx = x - this.x;
    const dy = y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.asteroidState = AsteroidState.Captured;
      const physBody = (this as unknown as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;
      physBody.setVelocity(0, 0);

      this.scene.tweens.add({
        targets: this,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          this.asteroidState = AsteroidState.Destroyed;
          if (this.onCapturedByBlackhole) {
            this.onCapturedByBlackhole(this);
          }
        },
      });
      return;
    }

    const force = strength / (dist * 0.1);
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    const physBody = (this as unknown as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;
    physBody.setVelocity(
      physBody.velocity.x + fx,
      physBody.velocity.y + fy
    );
  }

  public update(delta: number): void {
    const dt = delta / 1000;

    if (this.asteroidState === AsteroidState.Flying) {
      this.asteroidBody.rotation += this.rotationSpeed * dt;

      const physBody = (this as unknown as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;
      const speed = Math.sqrt(
        physBody.velocity.x * physBody.velocity.x +
        physBody.velocity.y * physBody.velocity.y
      );
      if (speed > 0) {
        const clampedSpeed = Math.min(speed, 400);
        const ratio = clampedSpeed / speed;
        physBody.setVelocity(
          physBody.velocity.x * ratio,
          physBody.velocity.y * ratio
        );
      }

      this.trailPoints.push({ x: this.x, y: this.y, alpha: 1 });
      if (this.trailPoints.length > 30) {
        this.trailPoints.shift();
      }

      const bounds = this.scene.physics.world.bounds;
      const margin = 80;
      if (
        this.x < bounds.x - margin ||
        this.x > bounds.right + margin ||
        this.y < bounds.y - margin ||
        this.y > bounds.bottom + margin
      ) {
        this.asteroidState = AsteroidState.Destroyed;
        if (this.onOutOfBounds) {
          this.onOutOfBounds(this);
        }
      }
    }

    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      this.trailPoints[i].alpha -= dt * 2;
      if (this.trailPoints[i].alpha <= 0) {
        this.trailPoints.splice(i, 1);
      }
    }

    this.drawTrail();
  }

  private drawTrail(): void {
    this.trail.clear();
    if (this.trailPoints.length < 2) return;

    for (let i = 1; i < this.trailPoints.length; i++) {
      const p = this.trailPoints[i];
      const pp = this.trailPoints[i - 1];
      const alpha = p.alpha * 0.5;
      this.trail.lineStyle(2, 0x8b5cf6, alpha);
      this.trail.beginPath();
      this.trail.moveTo(pp.x, pp.y);
      this.trail.lineTo(p.x, p.y);
      this.trail.strokePath();
    }
  }

  public getState(): AsteroidState {
    return this.asteroidState;
  }

  public isFlying(): boolean {
    return this.asteroidState === AsteroidState.Flying;
  }

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.asteroidState = AsteroidState.Idle;
    this.path = [];
    this.pathIndex = 0;
    this.trailPoints = [];
    this.trail.clear();
    this.setScale(1);
    this.setAlpha(1);

    const physBody = (this as unknown as Phaser.Physics.Arcade.Image).body as Phaser.Physics.Arcade.Body;
    physBody.setVelocity(0, 0);
  }

  public destroy(fromScene?: boolean): void {
    if (this.trail) {
      this.trail.destroy();
    }
    super.destroy(fromScene);
  }
}
