import Phaser from 'phaser';

export class Star extends Phaser.GameObjects.Container {
  private starImage: Phaser.GameObjects.Image;
  private glowRing: Phaser.GameObjects.Arc;
  private energy: number = 100;
  private maxEnergy: number = 100;
  private energyRegenRate: number = 8;
  private energyCostPerPixel: number = 0.08;
  private maxLineLength: number = 350;
  private maxCurvature: number = 0.3;
  private isDragging: boolean = false;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private dragCurrent: Phaser.Math.Vector2 | null = null;
  private gravityLine: Phaser.GameObjects.Graphics | null = null;
  private lineParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  public onGravityLineCreated?: (points: Phaser.Math.Vector2[]) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.starImage = scene.add.image(0, 0, 'star');
    this.add(this.starImage);

    this.glowRing = scene.add.circle(0, 0, 40, 0x6a3fcf, 0.15);
    this.add(this.glowRing);

    this.startPulse();
    this.setupInput();
  }

  private startPulse(): void {
    this.pulseTween = this.scene.tweens.add({
      targets: this.glowRing,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private setupInput(): void {
    this.starImage.setInteractive({ draggable: true });

    this.starImage.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      if (this.energy < 10) return;
      this.isDragging = true;
      this.dragStart = new Phaser.Math.Vector2(this.x, this.y);
      this.dragCurrent = new Phaser.Math.Vector2(pointer.x, pointer.y);
      this.gravityLine = this.scene.add.graphics();
    });

    this.starImage.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.gravityLine) return;

      this.dragCurrent = new Phaser.Math.Vector2(pointer.x, pointer.y);

      const points = this.calculateGravityLinePoints();
      if (!points) return;

      this.gravityLine.clear();
      this.drawGravityLine(points);
    });

    this.starImage.on('dragend', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.gravityLine) return;

      this.dragCurrent = new Phaser.Math.Vector2(pointer.x, pointer.y);
      const points = this.calculateGravityLinePoints();

      this.gravityLine.destroy();
      this.gravityLine = null;
      this.isDragging = false;

      if (points && points.length > 2) {
        const lineLength = this.calculateLineLength(points);
        const cost = lineLength * this.energyCostPerPixel;
        if (this.energy >= cost) {
          this.energy -= cost;
          if (this.onGravityLineCreated) {
            this.onGravityLineCreated(points);
          }
        }
      }

      this.dragStart = null;
      this.dragCurrent = null;
    });
  }

  private calculateGravityLinePoints(): Phaser.Math.Vector2[] | null {
    if (!this.dragStart || !this.dragCurrent) return null;

    const dx = this.dragCurrent.x - this.dragStart.x;
    const dy = this.dragCurrent.y - this.dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) return null;

    const clampedDist = Math.min(dist, this.maxLineLength);
    const ratio = clampedDist / dist;
    const endX = this.dragStart.x + dx * ratio;
    const endY = this.dragStart.y + dy * ratio;

    const numPoints = Math.max(8, Math.floor(clampedDist / 8));
    const points: Phaser.Math.Vector2[] = [];

    const perpX = -dy / dist;
    const perpY = dx / dist;
    const curvature = Math.sin(clampedDist / this.maxLineLength * Math.PI) * this.maxCurvature * clampedDist * 0.4;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const baseX = this.dragStart.x + (endX - this.dragStart.x) * t;
      const baseY = this.dragStart.y + (endY - this.dragStart.y) * t;
      const bulge = Math.sin(t * Math.PI) * curvature;
      points.push(new Phaser.Math.Vector2(baseX + perpX * bulge, baseY + perpY * bulge));
    }

    return points;
  }

  private drawGravityLine(points: Phaser.Math.Vector2[]): void {
    if (!this.gravityLine || points.length < 2) return;

    this.gravityLine.lineStyle(3, 0x8b5cf6, 0.6);
    this.gravityLine.beginPath();
    this.gravityLine.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      this.gravityLine.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    this.gravityLine.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    this.gravityLine.strokePath();

    this.gravityLine.lineStyle(1, 0xc8b8ff, 0.4);
    this.gravityLine.beginPath();
    this.gravityLine.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.gravityLine.lineTo(points[i].x, points[i].y);
    }
    this.gravityLine.strokePath();

    const endPt = points[points.length - 1];
    this.gravityLine.fillStyle(0xc8b8ff, 0.5);
    this.gravityLine.fillCircle(endPt.x, endPt.y, 6);
    this.gravityLine.fillStyle(0xffffff, 0.7);
    this.gravityLine.fillCircle(endPt.x, endPt.y, 3);
  }

  private calculateLineLength(points: Phaser.Math.Vector2[]): number {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += Phaser.Math.Distance.BetweenPoints(points[i - 1], points[i]);
    }
    return len;
  }

  public update(delta: number): void {
    const dt = delta / 1000;
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * dt);
    }

    if (this.energy < 10) {
      this.starImage.setTint(0x666666);
    } else {
      this.starImage.clearTint();
    }
  }

  public getEnergy(): number {
    return this.energy;
  }

  public getMaxEnergy(): number {
    return this.maxEnergy;
  }

  public getEnergyPercent(): number {
    return this.energy / this.maxEnergy;
  }

  public setEnergyRegenRate(rate: number): void {
    this.energyRegenRate = rate;
  }

  public setMaxLineLength(len: number): void {
    this.maxLineLength = len;
  }

  public getIsDragging(): boolean {
    return this.isDragging;
  }

  public destroy(fromScene?: boolean): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    if (this.gravityLine) {
      this.gravityLine.destroy();
    }
    super.destroy(fromScene);
  }
}
