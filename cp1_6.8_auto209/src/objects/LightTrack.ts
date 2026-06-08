import Phaser from 'phaser';

export type TrackZone = 'bluePurple' | 'cyanGreen' | 'warmYellow';

export interface LightTrackConfig {
  scene: Phaser.Scene;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  zone: TrackZone;
  thickness?: number;
  draggable?: boolean;
}

const ZONE_COLORS: Record<TrackZone, { start: number; end: number; glow: number; speedMult: number }> = {
  bluePurple: { start: 0x6633ff, end: 0xaa66ff, glow: 0x9944ff, speedMult: 0.6 },
  cyanGreen: { start: 0x00ccaa, end: 0x33ffcc, glow: 0x22ddbb, speedMult: 1.5 },
  warmYellow: { start: 0xffaa00, end: 0xffdd44, glow: 0xffcc22, speedMult: 0.4 },
};

export class LightTrack extends Phaser.GameObjects.Container {
  public startX: number;
  public startY: number;
  public endX: number;
  public endY: number;
  public zone: TrackZone;
  public draggable: boolean;
  public thickness: number;
  public speedMultiplier: number;

  private lineGraphic: Phaser.GameObjects.Graphics;
  private glowGraphic: Phaser.GameObjects.Graphics;
  private rippleGraphic: Phaser.GameObjects.Graphics;
  private hitArea: Phaser.GameObjects.Rectangle;
  private isDragging: boolean = false;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private ripples: Array<{ x: number; y: number; radius: number; alpha: number }> = [];
  private originalStartX: number;
  private originalStartY: number;
  private originalEndX: number;
  private originalEndY: number;
  private pulsePhase: number = 0;

  constructor(config: LightTrackConfig) {
    super(config.scene, 0, 0);

    this.startX = config.startX;
    this.startY = config.startY;
    this.endX = config.endX;
    this.endY = config.endY;
    this.originalStartX = config.startX;
    this.originalStartY = config.startY;
    this.originalEndX = config.endX;
    this.originalEndY = config.endY;
    this.zone = config.zone;
    this.thickness = config.thickness ?? 4;
    this.draggable = config.draggable ?? true;
    this.speedMultiplier = ZONE_COLORS[this.zone].speedMult;

    this.glowGraphic = new Phaser.GameObjects.Graphics(config.scene);
    this.lineGraphic = new Phaser.GameObjects.Graphics(config.scene);
    this.rippleGraphic = new Phaser.GameObjects.Graphics(config.scene);

    this.add([this.glowGraphic, this.lineGraphic, this.rippleGraphic]);

    const midX = (this.startX + this.endX) / 2;
    const midY = (this.startY + this.endY) / 2;
    const length = Phaser.Math.Distance.Between(this.startX, this.startY, this.endX, this.endY);
    const angle = Phaser.Math.Angle.Between(this.startX, this.startY, this.endX, this.endY);

    this.hitArea = new Phaser.GameObjects.Rectangle(
      config.scene,
      midX,
      midY,
      length + 20,
      this.thickness + 24,
      0x000000,
      0
    );
    this.hitArea.setRotation(angle);
    this.hitArea.setInteractive({ draggable: this.draggable });
    this.add(this.hitArea);

    this.scene.add.existing(this);

    this.setupDrag();
    this.draw();
  }

  private setupDrag(): void {
    if (!this.draggable) return;

    this.hitArea.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.dragOffsetX = 0;
      this.dragOffsetY = 0;
      this.addRipple(pointer.x, pointer.y);
    });

    this.hitArea.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      const dx = pointer.x - (this.startX + this.endX) / 2;
      const dy = pointer.y - (this.startY + this.endY) / 2;

      const angle = Phaser.Math.Angle.Between(this.startX, this.startY, this.endX, this.endY);
      const perpAngle = angle + Math.PI / 2;
      const perpDist = dx * Math.cos(perpAngle) + dy * Math.sin(perpAngle);

      const clampedDist = Phaser.Math.Clamp(perpDist, -80, 80);

      this.startX = this.originalStartX + Math.cos(perpAngle) * clampedDist;
      this.startY = this.originalStartY + Math.sin(perpAngle) * clampedDist;
      this.endX = this.originalEndX + Math.cos(perpAngle) * clampedDist;
      this.endY = this.originalEndY + Math.sin(perpAngle) * clampedDist;

      const midX = (this.startX + this.endX) / 2;
      const midY = (this.startY + this.endY) / 2;
      this.hitArea.setPosition(midX, midY);

      this.addRipple(pointer.x, pointer.y);
      this.draw();
    });

    this.hitArea.on('dragend', () => {
      this.isDragging = false;
    });
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({ x, y, radius: 0, alpha: 0.8 });
  }

  private draw(): void {
    this.lineGraphic.clear();
    this.glowGraphic.clear();

    const colors = ZONE_COLORS[this.zone];

    this.glowGraphic.lineStyle(this.thickness + 12, colors.glow, 0.15);
    this.glowGraphic.beginPath();
    this.glowGraphic.moveTo(this.startX, this.startY);
    this.glowGraphic.lineTo(this.endX, this.endY);
    this.glowGraphic.strokePath();

    this.glowGraphic.lineStyle(this.thickness + 6, colors.glow, 0.3);
    this.glowGraphic.beginPath();
    this.glowGraphic.moveTo(this.startX, this.startY);
    this.glowGraphic.lineTo(this.endX, this.endY);
    this.glowGraphic.strokePath();

    this.lineGraphic.lineStyle(this.thickness, colors.start, 1);
    this.lineGraphic.beginPath();
    this.lineGraphic.moveTo(this.startX, this.startY);
    this.lineGraphic.lineTo(this.endX, this.endY);
    this.lineGraphic.strokePath();
  }

  public update(delta: number, trackThickness: number): void {
    this.pulsePhase += delta * 0.003;
    this.thickness = trackThickness;
    this.draw();

    this.rippleGraphic.clear();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += delta * 0.15;
      r.alpha -= delta * 0.002;
      if (r.alpha <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }
      const colors = ZONE_COLORS[this.zone];
      this.rippleGraphic.lineStyle(2, colors.glow, r.alpha);
      this.rippleGraphic.strokeCircle(r.x, r.y, r.radius);
    }
  }

  public resetPosition(): void {
    this.startX = this.originalStartX;
    this.startY = this.originalStartY;
    this.endX = this.originalEndX;
    this.endY = this.originalEndY;
    const midX = (this.startX + this.endX) / 2;
    const midY = (this.startY + this.endY) / 2;
    this.hitArea.setPosition(midX, midY);
    this.draw();
  }

  public distanceToPoint(px: number, py: number): number {
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, this.startX, this.startY);
    let t = ((px - this.startX) * dx + (py - this.startY) * dy) / lenSq;
    t = Phaser.Math.Clamp(t, 0, 1);
    const projX = this.startX + t * dx;
    const projY = this.startY + t * dy;
    return Phaser.Math.Distance.Between(px, py, projX, projY);
  }

  public isPlayerOnTrack(px: number, py: number, threshold: number = 16): boolean {
    return this.distanceToPoint(px, py) < threshold;
  }
}
