import Phaser from 'phaser';

export type Polarity = 'positive' | 'negative';
export type PlayerState = 'normal' | 'slowed';

export class Player {
  public scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  public body: Phaser.Physics.Arcade.Body;
  public polarity: Polarity = 'positive';
  public state: PlayerState = 'normal';

  public beetleBody!: Phaser.GameObjects.Graphics;
  public leftEye!: Phaser.GameObjects.Graphics;
  public rightEye!: Phaser.GameObjects.Graphics;
  public pulseRing!: Phaser.GameObjects.Arc;

  public readonly radius = 18;
  public readonly normalSpeed = 200;
  public slowedUntil = 0;
  public pulseUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.container = scene.add.container(x, y);

    this.createBeetleGraphics();

    scene.physics.world.enable(this.container);
    this.body = this.container.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(this.radius);
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(0.2, 0.2);
    this.body.setFriction(0.8, 0.8);
    this.body.setMaxVelocity(this.normalSpeed, this.normalSpeed);
    this.body.setDrag(100, 100);
  }

  private createBeetleGraphics(): void {
    this.beetleBody = this.scene.add.graphics();
    this.drawBeetleBody();

    this.leftEye = this.scene.add.graphics();
    this.rightEye = this.scene.add.graphics();
    this.drawEyes();

    this.pulseRing = this.scene.add.arc(0, 0, this.radius + 8, 0, 360, false, 0x4488ff, 0);
    this.pulseRing.setStrokeStyle(2, 0x4488ff, 0);

    this.container.add([this.pulseRing, this.beetleBody, this.leftEye, this.rightEye]);
  }

  private drawBeetleBody(): void {
    const g = this.beetleBody;
    g.clear();

    const r = this.radius;
    const hexPoints: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Phaser.Math.DegToRad(60 * i)) - Math.PI / 2;
      hexPoints.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }

    const fillGradient = (graphics: Phaser.GameObjects.Graphics, points: Phaser.Types.Math.Vector2Like[]): void => {
      graphics.fillGradientStyle(0x8a7a5a, 0x5a4a2a, 0x6a5a3a, 0x3a2a0a, 1, 1, 1, 1);
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        graphics.lineTo(points[i].x, points[i].y);
      }
      graphics.closePath();
      graphics.fillPath();
    };

    fillGradient(g, hexPoints);

    g.lineStyle(2, 0xb0a070, 0.9);
    g.strokePoints(hexPoints, true);

    g.lineStyle(1, 0xd0c090, 0.4);
    g.beginPath();
    g.moveTo(hexPoints[0].x * 0.7, hexPoints[0].y * 0.7);
    g.lineTo(hexPoints[2].x * 0.7, hexPoints[2].y * 0.7);
    g.moveTo(hexPoints[1].x * 0.7, hexPoints[1].y * 0.7);
    g.lineTo(hexPoints[4].x * 0.7, hexPoints[4].y * 0.7);
    g.strokePath();

    for (let i = 0; i < 6; i += 2) {
      const angle = (Phaser.Math.DegToRad(60 * i)) - Math.PI / 2;
      g.lineStyle(2, 0x6a5a3a, 1);
      g.beginPath();
      g.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      g.lineTo(Math.cos(angle) * (r + 6), Math.sin(angle) * (r + 6));
      g.strokePath();
    }
  }

  private drawEyes(): void {
    const color = this.polarity === 'positive' ? 0x4488ff : 0xff4444;
    const glowColor = this.polarity === 'positive' ? 0x66aaff : 0xff6666;

    for (const eye of [this.leftEye, this.rightEye]) {
      eye.clear();
    }

    this.leftEye.fillStyle(glowColor, 0.5);
    this.leftEye.fillCircle(-6, -5, 4);
    this.leftEye.fillStyle(color, 1);
    this.leftEye.fillCircle(-6, -5, 3);

    this.rightEye.fillStyle(glowColor, 0.5);
    this.rightEye.fillCircle(6, -5, 4);
    this.rightEye.fillStyle(color, 1);
    this.rightEye.fillCircle(6, -5, 3);
  }

  public togglePolarity(): void {
    this.polarity = this.polarity === 'positive' ? 'negative' : 'positive';
    this.drawEyes();
    this.triggerPulse();
  }

  public triggerPulse(): void {
    this.pulseUntil = this.scene.time.now + 200;
    const color = this.polarity === 'positive' ? 0x4488ff : 0xff4444;
    this.pulseRing.setStrokeStyle(3, color, 1);
    this.pulseRing.setRadius(this.radius + 8);

    this.scene.tweens.add({
      targets: this.pulseRing,
      radius: this.radius + 30,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.pulseRing.setStrokeStyle(0, 0, 0);
      }
    });
  }

  public applySlow(durationMs: number): void {
    this.state = 'slowed';
    this.slowedUntil = this.scene.time.now + durationMs;
  }

  public update(time: number, delta: number): void {
    void delta;

    if (this.state === 'slowed' && time > this.slowedUntil) {
      this.state = 'normal';
    }

    const speedMultiplier = this.state === 'slowed' ? 0.5 : 1;
    this.body.setMaxVelocity(
      this.normalSpeed * speedMultiplier,
      this.normalSpeed * speedMultiplier
    );
  }

  public move(dx: number, dy: number): void {
    const speed = this.normalSpeed * (this.state === 'slowed' ? 0.5 : 1);
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 0) {
      this.body.setVelocity(
        (dx / magnitude) * speed,
        (dy / magnitude) * speed
      );
    }
  }

  public get x(): number {
    return this.container.x;
  }

  public get y(): number {
    return this.container.y;
  }

  public setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
