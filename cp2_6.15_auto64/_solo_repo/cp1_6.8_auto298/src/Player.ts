import Phaser from 'phaser';

const MOVE_SPEED = 280;
const ACCEL = 1800;
const DECEL = 2200;
const TRAIL_INTERVAL = 30;
const TRAIL_LIFETIME = 400;
const GLOW_RADIUS = 18;
const CORE_RADIUS = 6;

interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  birth: number;
}

export class Player {
  scene: Phaser.Scene;
  x: number;
  y: number;
  cellRow: number;
  cellCol: number;
  targetX: number;
  targetY: number;
  targetRow: number;
  targetCol: number;
  isMoving: boolean;
  velocityX: number;
  velocityY: number;
  glow: Phaser.GameObjects.Arc;
  core: Phaser.GameObjects.Arc;
  outerGlow: Phaser.GameObjects.Arc;
  trailParticles: TrailParticle[];
  trailGraphics: Phaser.GameObjects.Graphics;
  lastTrailTime: number;
  onReachTarget: (() => void) | null;
  cellSize: number;
  offsetX: number;
  offsetY: number;
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  stepCount: number;
  private inputDir: { x: number; y: number };

  constructor(scene: Phaser.Scene, startRow: number, startCol: number, cellSize: number, offsetX: number, offsetY: number) {
    this.scene = scene;
    this.cellSize = cellSize;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.cellRow = startRow;
    this.cellCol = startCol;
    this.x = offsetX + startCol * cellSize + cellSize / 2;
    this.y = offsetY + startRow * cellSize + cellSize / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetRow = startRow;
    this.targetCol = startCol;
    this.isMoving = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.stepCount = 0;
    this.trailParticles = [];
    this.lastTrailTime = 0;
    this.onReachTarget = null;
    this.inputDir = { x: 0, y: 0 };

    this.outerGlow = scene.add.circle(this.x, this.y, GLOW_RADIUS * 2, 0x4488ff, 0.08);
    this.glow = scene.add.circle(this.x, this.y, GLOW_RADIUS, 0x88bbff, 0.25);
    this.core = scene.add.circle(this.x, this.y, CORE_RADIUS, 0xffffff, 1.0);

    this.trailGraphics = scene.add.graphics();

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    scene.tweens.add({
      targets: this.outerGlow,
      alpha: 0.15,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  getPixelPos(row: number, col: number): { x: number; y: number } {
    return {
      x: this.offsetX + col * this.cellSize + this.cellSize / 2,
      y: this.offsetY + row * this.cellSize + this.cellSize / 2,
    };
  }

  tryMove(dRow: number, dCol: number, canPass: (fromRow: number, fromCol: number, toRow: number, toCol: number) => boolean): void {
    if (this.isMoving) return;
    const newRow = this.cellRow + dRow;
    const newCol = this.cellCol + dCol;
    if (!canPass(this.cellRow, this.cellCol, newRow, newCol)) return;

    this.isMoving = true;
    this.targetRow = newRow;
    this.targetCol = newCol;
    const pos = this.getPixelPos(newRow, newCol);
    this.targetX = pos.x;
    this.targetY = pos.y;
    this.stepCount++;
  }

  update(time: number, delta: number, canPass: (fromRow: number, fromCol: number, toRow: number, toCol: number) => boolean): void {
    const dt = delta / 1000;

    this.readInput();

    if (this.isMoving) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.cellRow = this.targetRow;
        this.cellCol = this.targetCol;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isMoving = false;
        if (this.onReachTarget) this.onReachTarget();

        if (this.inputDir.x !== 0 || this.inputDir.y !== 0) {
          let dRow = 0;
          let dCol = 0;
          if (this.inputDir.y < 0) dRow = -1;
          else if (this.inputDir.y > 0) dRow = 1;
          else if (this.inputDir.x < 0) dCol = -1;
          else if (this.inputDir.x > 0) dCol = 1;
          this.tryMove(dRow, dCol, canPass);
        }
      } else {
        const dirX = dx / dist;
        const dirY = dy / dist;
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);

        if (dist < this.cellSize * 0.3) {
          const newSpeed = Math.max(currentSpeed - DECEL * dt, MOVE_SPEED * 0.3);
          this.velocityX = dirX * newSpeed;
          this.velocityY = dirY * newSpeed;
        } else {
          const newSpeed = Math.min(currentSpeed + ACCEL * dt, MOVE_SPEED);
          this.velocityX = dirX * newSpeed;
          this.velocityY = dirY * newSpeed;
        }

        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        const newDx = this.targetX - this.x;
        const newDy = this.targetY - this.y;
        if (newDx * dx < 0 || newDy * dy < 0) {
          this.x = this.targetX;
          this.y = this.targetY;
        }
      }
    }

    this.outerGlow.setPosition(this.x, this.y);
    this.glow.setPosition(this.x, this.y);
    this.core.setPosition(this.x, this.y);

    if (time - this.lastTrailTime > TRAIL_INTERVAL) {
      this.trailParticles.push({
        x: this.x,
        y: this.y,
        alpha: 0.6,
        birth: time,
      });
      this.lastTrailTime = time;
    }

    this.updateTrail(time);
  }

  private readInput(): void {
    this.inputDir.x = 0;
    this.inputDir.y = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) this.inputDir.x = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) this.inputDir.x = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) this.inputDir.y = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) this.inputDir.y = 1;
  }

  updateTrail(time: number): void {
    this.trailGraphics.clear();
    this.trailParticles = this.trailParticles.filter(p => {
      const age = time - p.birth;
      if (age > TRAIL_LIFETIME) return false;
      const t = age / TRAIL_LIFETIME;
      const alpha = (1 - t) * 0.5;
      const radius = CORE_RADIUS * (1 - t * 0.5);
      this.trailGraphics.fillStyle(0x88bbff, alpha);
      this.trailGraphics.fillCircle(p.x, p.y, radius);
      return true;
    });
  }

  setTouchTarget(dRow: number, dCol: number, canPass: (fromRow: number, fromCol: number, toRow: number, toCol: number) => boolean): void {
    this.tryMove(dRow, dCol, canPass);
  }

  destroy(): void {
    this.outerGlow.destroy();
    this.glow.destroy();
    this.core.destroy();
    this.trailGraphics.destroy();
  }
}
