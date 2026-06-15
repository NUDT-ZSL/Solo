import Phaser from 'phaser';

export interface EnemyPathPoint {
  x: number;
  y: number;
}

export class Enemy extends Phaser.GameObjects.Container {
  private coreSprite!: Phaser.GameObjects.Graphics;
  private waveRings: Phaser.GameObjects.Graphics[] = [];
  private patrolPoints: EnemyPathPoint[];
  private currentTargetIndex: number = 0;
  private moveSpeed: number;
  private detectionRadius: number;
  private pulseTime: number = 0;
  private wavePhase: number = 0;
  private isPaused: boolean = false;
  private sceneRef: Phaser.Scene;
  private _hasDetectedPlayer: boolean = false;

  get hasDetectedPlayer(): boolean {
    return this._hasDetectedPlayer;
  }

  set hasDetectedPlayer(val: boolean) {
    this._hasDetectedPlayer = val;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    patrolPoints: EnemyPathPoint[],
    speed: number = 60,
    detectionRadius: number = 100
  ) {
    super(scene, x, y);
    this.sceneRef = scene;
    this.patrolPoints = patrolPoints;
    this.moveSpeed = speed;
    this.detectionRadius = detectionRadius;

    for (let i = 0; i < 3; i++) {
      const ring = new Phaser.GameObjects.Graphics(scene);
      this.waveRings.push(ring);
      this.add(ring);
    }

    this.coreSprite = new Phaser.GameObjects.Graphics(scene);
    this.add(this.coreSprite);

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(detectionRadius, -detectionRadius, -detectionRadius);
    body.setImmovable(true);

    scene.add.existing(this);

    this.moveToNextPoint();
  }

  private moveToNextPoint(): void {
    if (this.patrolPoints.length === 0) return;

    const target = this.patrolPoints[this.currentTargetIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = (dist / this.moveSpeed) * 1000;

    this.sceneRef.tweens.add({
      targets: this,
      x: target.x,
      y: target.y,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this.currentTargetIndex = (this.currentTargetIndex + 1) % this.patrolPoints.length;
        this.moveToNextPoint();
      },
    });
  }

  checkDetection(playerX: number, playerY: number, playerInShadow: boolean): boolean {
    if (playerInShadow) {
      this._hasDetectedPlayer = false;
      return false;
    }

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.detectionRadius) {
      this._hasDetectedPlayer = true;
      return true;
    }

    this._hasDetectedPlayer = false;
    return false;
  }

  pause(): void {
    this.isPaused = true;
    this.sceneRef.tweens.killTweensOf(this);
  }

  resume(): void {
    this.isPaused = false;
    this.moveToNextPoint();
  }

  update(delta: number): void {
    this.pulseTime += delta;
    this.wavePhase += delta * 0.003;

    this.coreSprite.clear();

    const coreAlpha = 0.6 + Math.sin(this.pulseTime * 0.005) * 0.2;
    this.coreSprite.fillStyle(0xff6633, coreAlpha * 0.5);
    this.coreSprite.fillCircle(0, 0, 8);
    this.coreSprite.fillStyle(0xffaa44, coreAlpha * 0.8);
    this.coreSprite.fillCircle(0, 0, 4);

    for (let i = 0; i < this.waveRings.length; i++) {
      const ring = this.waveRings[i];
      ring.clear();

      const phase = (this.wavePhase + i * 0.7) % 2.0;
      const ringRadius = phase * this.detectionRadius * 0.5;
      const ringAlpha = Math.max(0, 1 - phase / 2.0) * 0.3;

      ring.lineStyle(2, 0xff8844, ringAlpha);
      ring.strokeCircle(0, 0, ringRadius);
    }

    const detectionRingAlpha = 0.12 + Math.sin(this.pulseTime * 0.003) * 0.06;
    this.coreSprite.lineStyle(1, 0xff6633, detectionRingAlpha);
    this.coreSprite.strokeCircle(0, 0, this.detectionRadius);
  }

  destroy(fromScene?: boolean): void {
    this.sceneRef.tweens.killTweensOf(this);
    super.destroy(fromScene);
  }
}
