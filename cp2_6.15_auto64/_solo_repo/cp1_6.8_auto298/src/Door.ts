import Phaser from 'phaser';

export class Door {
  scene: Phaser.Scene;
  id: number;
  row: number;
  col: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  isOpen: boolean;
  graphics: Phaser.GameObjects.Graphics;
  glowGraphics: Phaser.GameObjects.Graphics;
  cellSize: number;
  offsetX: number;
  offsetY: number;
  pulseTween: Phaser.Tweens.Tween | null;

  constructor(scene: Phaser.Scene, id: number, row: number, col: number, side: 'top' | 'right' | 'bottom' | 'left', cellSize: number, offsetX: number, offsetY: number) {
    this.scene = scene;
    this.id = id;
    this.row = row;
    this.col = col;
    this.side = side;
    this.isOpen = false;
    this.cellSize = cellSize;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.pulseTween = null;

    this.glowGraphics = scene.add.graphics();
    this.graphics = scene.add.graphics();

    this.draw();
    this.startPulse();
  }

  private getLineCoords(): { x1: number; y1: number; x2: number; y2: number } {
    const x = this.offsetX + this.col * this.cellSize;
    const y = this.offsetY + this.row * this.cellSize;
    switch (this.side) {
      case 'top': return { x1: x, y1: y, x2: x + this.cellSize, y2: y };
      case 'bottom': return { x1: x, y1: y + this.cellSize, x2: x + this.cellSize, y2: y + this.cellSize };
      case 'left': return { x1: x, y1: y, x2: x, y2: y + this.cellSize };
      case 'right': return { x1: x + this.cellSize, y1: y, x2: x + this.cellSize, y2: y + this.cellSize };
    }
  }

  draw(): void {
    this.graphics.clear();
    this.glowGraphics.clear();
    if (this.isOpen) return;

    const line = this.getLineCoords();
    const color = this.isOpen ? 0x00ff88 : 0xff3355;

    this.glowGraphics.lineStyle(10, color, 0.15);
    this.glowGraphics.beginPath();
    this.glowGraphics.moveTo(line.x1, line.y1);
    this.glowGraphics.lineTo(line.x2, line.y2);
    this.glowGraphics.strokePath();

    this.graphics.lineStyle(4, color, 0.9);
    this.graphics.beginPath();
    this.graphics.moveTo(line.x1, line.y1);
    this.graphics.lineTo(line.x2, line.y2);
    this.graphics.strokePath();
  }

  startPulse(): void {
    if (this.pulseTween) this.pulseTween.stop();
    this.pulseTween = this.scene.tweens.add({
      targets: { val: 0.15 },
      val: 0.35,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (_tween: Phaser.Tweens.Tween, target: { val: number }) => {
        if (this.isOpen) return;
        this.glowGraphics.clear();
        const line = this.getLineCoords();
        this.glowGraphics.lineStyle(10, 0xff3355, target.val);
        this.glowGraphics.beginPath();
        this.glowGraphics.moveTo(line.x1, line.y1);
        this.glowGraphics.lineTo(line.x2, line.y2);
        this.glowGraphics.strokePath();
      },
    });
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }

    const line = this.getLineCoords();

    this.glowGraphics.clear();
    this.glowGraphics.lineStyle(14, 0x00ff88, 0.5);
    this.glowGraphics.beginPath();
    this.glowGraphics.moveTo(line.x1, line.y1);
    this.glowGraphics.lineTo(line.x2, line.y2);
    this.glowGraphics.strokePath();

    this.graphics.clear();
    this.graphics.lineStyle(4, 0x00ff88, 1.0);
    this.graphics.beginPath();
    this.graphics.moveTo(line.x1, line.y1);
    this.graphics.lineTo(line.x2, line.y2);
    this.graphics.strokePath();

    this.scene.tweens.add({
      targets: { alpha: 1.0 },
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onUpdate: (_tween: Phaser.Tweens.Tween, target: { alpha: number }) => {
        this.graphics.clear();
        this.glowGraphics.clear();
        if (target.alpha <= 0) return;

        this.glowGraphics.lineStyle(14, 0x00ff88, target.alpha * 0.4);
        this.glowGraphics.beginPath();
        this.glowGraphics.moveTo(line.x1, line.y1);
        this.glowGraphics.lineTo(line.x2, line.y2);
        this.glowGraphics.strokePath();

        this.graphics.lineStyle(4, 0x00ff88, target.alpha);
        this.graphics.beginPath();
        this.graphics.moveTo(line.x1, line.y1);
        this.graphics.lineTo(line.x2, line.y2);
        this.graphics.strokePath();
      },
      onComplete: () => {
        this.graphics.clear();
        this.glowGraphics.clear();
      },
    });
  }

  destroy(): void {
    if (this.pulseTween) this.pulseTween.stop();
    this.graphics.destroy();
    this.glowGraphics.destroy();
  }
}
