import Phaser from 'phaser';
import { generateMaze, MazeData, DoorInfo } from './mazeData';
import { Player } from './Player';
import { Door } from './Door';

const BG_COLOR_TOP = 0x000011;
const BG_COLOR_BOTTOM = 0x000833;
const GRID_COLOR = 0x00ccff;
const GRID_ALPHA = 0.18;
const SWITCH_COLOR = 0x00ff66;
const END_COLOR = 0xffcc00;
const UI_DEPTH = 100;
const GAME_DEPTH = 10;

export class GameScene extends Phaser.Scene {
  mazeData!: MazeData;
  player!: Player;
  doors: Door[] = [];
  cellSize!: number;
  offsetX!: number;
  offsetY!: number;
  level: number;
  steps: number;
  levelText!: Phaser.GameObjects.Text;
  stepsText!: Phaser.GameObjects.Text;
  resetBtn!: Phaser.GameObjects.Container;
  mazeGraphics!: Phaser.GameObjects.Graphics;
  switchGraphics: Phaser.GameObjects.Graphics[] = [];
  endGraphics!: Phaser.GameObjects.Graphics;
  endGlow!: Phaser.GameObjects.Arc;
  bgGraphics!: Phaser.GameObjects.Graphics;
  touchStartX: number;
  touchStartY: number;
  openDoorIds: Set<number>;
  won: boolean;
  winOverlay: Phaser.GameObjects.Container | null;
  switchGlows: Phaser.GameObjects.Arc[];

  constructor() {
    super({ key: 'GameScene' });
    this.level = 1;
    this.steps = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.openDoorIds = new Set();
    this.won = false;
    this.winOverlay = null;
    this.switchGlows = [];
  }

  create(): void {
    this.openDoorIds = new Set();
    this.won = false;
    this.winOverlay = null;

    this.mazeData = generateMaze(this.level);
    this.steps = 0;

    this.calculateLayout();
    this.drawBackground();
    this.drawMazeGrid();
    this.createDoors();
    this.drawSwitches();
    this.drawEndPoint();
    this.createPlayer();
    this.createUI();
    this.setupTouch();
  }

  calculateLayout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const padding = 40;
    const availW = w - padding * 2;
    const availH = h - padding * 2 - 60;
    this.cellSize = Math.floor(Math.min(availW / this.mazeData.cols, availH / this.mazeData.rows));
    this.cellSize = Math.max(this.cellSize, 30);
    const mazeW = this.cellSize * this.mazeData.cols;
    const mazeH = this.cellSize * this.mazeData.rows;
    this.offsetX = Math.floor((w - mazeW) / 2);
    this.offsetY = Math.floor((h - mazeH) / 2) + 20;
  }

  drawBackground(): void {
    if (this.bgGraphics) this.bgGraphics.destroy();
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0);
    const w = this.scale.width;
    const h = this.scale.height;
    const steps = 64;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r1 = (BG_COLOR_TOP >> 16) & 0xff;
      const g1 = (BG_COLOR_TOP >> 8) & 0xff;
      const b1 = BG_COLOR_TOP & 0xff;
      const r2 = (BG_COLOR_BOTTOM >> 16) & 0xff;
      const g2 = (BG_COLOR_BOTTOM >> 8) & 0xff;
      const b2 = BG_COLOR_BOTTOM & 0xff;
      const r = Math.floor(r1 + (r2 - r1) * t);
      const g = Math.floor(g1 + (g2 - g1) * t);
      const b = Math.floor(b1 + (b2 - b1) * t);
      const color = (r << 16) | (g << 8) | b;
      this.bgGraphics.fillStyle(color, 1);
      const y1 = Math.floor(h * (i / steps));
      const y2 = Math.floor(h * ((i + 1) / steps)) + 1;
      this.bgGraphics.fillRect(0, y1, w, y2 - y1);
    }
  }

  drawMazeGrid(): void {
    if (this.mazeGraphics) this.mazeGraphics.destroy();
    this.mazeGraphics = this.add.graphics();
    this.mazeGraphics.setDepth(GAME_DEPTH);

    const { rows, cols, cells } = this.mazeData;
    const cs = this.cellSize;
    const ox = this.offsetX;
    const oy = this.offsetY;

    this.mazeGraphics.lineStyle(1, GRID_COLOR, GRID_ALPHA * 0.5);
    for (let r = 0; r <= rows; r++) {
      this.mazeGraphics.beginPath();
      this.mazeGraphics.moveTo(ox, oy + r * cs);
      this.mazeGraphics.lineTo(ox + cols * cs, oy + r * cs);
      this.mazeGraphics.strokePath();
    }
    for (let c = 0; c <= cols; c++) {
      this.mazeGraphics.beginPath();
      this.mazeGraphics.moveTo(ox + c * cs, oy);
      this.mazeGraphics.moveTo(ox + c * cs, oy);
      this.mazeGraphics.lineTo(ox + c * cs, oy + rows * cs);
      this.mazeGraphics.strokePath();
    }

    this.mazeGraphics.lineStyle(2, GRID_COLOR, GRID_ALPHA * 1.5);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        const x = ox + c * cs;
        const y = oy + r * cs;
        if (cell.walls.top) {
          if (!this.isDoorWall(r, c, 'top')) {
            this.mazeGraphics.beginPath();
            this.mazeGraphics.moveTo(x, y);
            this.mazeGraphics.lineTo(x + cs, y);
            this.mazeGraphics.strokePath();
          }
        }
        if (cell.walls.left) {
          if (!this.isDoorWall(r, c, 'left')) {
            this.mazeGraphics.beginPath();
            this.mazeGraphics.moveTo(x, y);
            this.mazeGraphics.lineTo(x, y + cs);
            this.mazeGraphics.strokePath();
          }
        }
        if (r === rows - 1 && cell.walls.bottom) {
          if (!this.isDoorWall(r, c, 'bottom')) {
            this.mazeGraphics.beginPath();
            this.mazeGraphics.moveTo(x, y + cs);
            this.mazeGraphics.lineTo(x + cs, y + cs);
            this.mazeGraphics.strokePath();
          }
        }
        if (c === cols - 1 && cell.walls.right) {
          if (!this.isDoorWall(r, c, 'right')) {
            this.mazeGraphics.beginPath();
            this.mazeGraphics.moveTo(x + cs, y);
            this.mazeGraphics.lineTo(x + cs, y + cs);
            this.mazeGraphics.strokePath();
          }
        }
      }
    }
  }

  isDoorWall(r: number, c: number, side: 'top' | 'right' | 'bottom' | 'left'): boolean {
    return this.mazeData.doors.some(d => d.row === r && d.col === c && d.side === side);
  }

  createDoors(): void {
    this.doors.forEach(d => d.destroy());
    this.doors = [];
    for (const d of this.mazeData.doors) {
      const door = new Door(this, d.id, d.row, d.col, d.side, this.cellSize, this.offsetX, this.offsetY);
      door.graphics.setDepth(GAME_DEPTH + 2);
      door.glowGraphics.setDepth(GAME_DEPTH + 1);
      this.doors.push(door);
    }
  }

  drawSwitches(): void {
    this.switchGraphics.forEach(g => g.destroy());
    this.switchGlows.forEach(g => g.destroy());
    this.switchGraphics = [];
    this.switchGlows = [];

    const { cells, rows, cols } = this.mazeData;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (cells[r][c].hasSwitch) {
          const cx = this.offsetX + c * this.cellSize + this.cellSize / 2;
          const cy = this.offsetY + r * this.cellSize + this.cellSize / 2;

          const glow = this.add.circle(cx, cy, 12, SWITCH_COLOR, 0.2);
          glow.setDepth(GAME_DEPTH + 1);
          this.switchGlows.push(glow);

          const g = this.add.graphics();
          g.setDepth(GAME_DEPTH + 2);
          g.fillStyle(SWITCH_COLOR, 0.9);
          g.fillCircle(cx, cy, 5);
          this.switchGraphics.push(g);

          this.tweens.add({
            targets: glow,
            alpha: 0.4,
            scale: 1.3,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      }
    }
  }

  drawEndPoint(): void {
    if (this.endGraphics) this.endGraphics.destroy();
    if (this.endGlow) this.endGlow.destroy();

    const cx = this.offsetX + this.mazeData.endCol * this.cellSize + this.cellSize / 2;
    const cy = this.offsetY + this.mazeData.endRow * this.cellSize + this.cellSize / 2;

    this.endGlow = this.add.circle(cx, cy, 16, END_COLOR, 0.15);
    this.endGlow.setDepth(GAME_DEPTH + 1);

    this.endGraphics = this.add.graphics();
    this.endGraphics.setDepth(GAME_DEPTH + 2);
    this.endGraphics.fillStyle(END_COLOR, 0.9);
    this.endGraphics.fillCircle(cx, cy, 6);

    this.tweens.add({
      targets: this.endGlow,
      alpha: 0.4,
      scale: 1.5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createPlayer(): void {
    if (this.player) this.player.destroy();
    this.player = new Player(
      this,
      this.mazeData.startRow,
      this.mazeData.startCol,
      this.cellSize,
      this.offsetX,
      this.offsetY
    );
    this.player.onReachTarget = () => {
      this.onPlayerReachCell();
    };
  }

  createUI(): void {
    if (this.levelText) this.levelText.destroy();
    if (this.stepsText) this.stepsText.destroy();
    if (this.resetBtn) this.resetBtn.destroy();

    this.levelText = this.add.text(16, 12, `关卡 ${this.level}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#88ddff',
      fontStyle: 'bold',
    }).setDepth(UI_DEPTH);

    this.stepsText = this.add.text(16, 36, `步数 ${this.steps}`, {
      fontSize: '15px',
      fontFamily: 'Arial, sans-serif',
      color: '#66aacc',
    }).setDepth(UI_DEPTH);

    this.createResetButton();
  }

  createResetButton(): void {
    const w = 72;
    const h = 36;
    const btnX = this.scale.width - 20 - w;
    const btnY = this.scale.height - 20 - h;

    const bg = this.add.graphics();
    bg.fillStyle(0x2255aa, 0.35);
    bg.fillRoundedRect(0, 0, w, h, 10);
    bg.lineStyle(1, 0x4488cc, 0.4);
    bg.strokeRoundedRect(0, 0, w, h, 10);
    bg.setDepth(UI_DEPTH);

    const label = this.add.text(w / 2, h / 2, '重置', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaccee',
    }).setOrigin(0.5).setDepth(UI_DEPTH);

    this.resetBtn = this.add.container(btnX, btnY, [bg, label]);
    this.resetBtn.setDepth(UI_DEPTH);
    this.resetBtn.setSize(w, h);
    this.resetBtn.setInteractive({ useHandCursor: true });

    this.resetBtn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x3366bb, 0.5);
      bg.fillRoundedRect(0, 0, w, h, 10);
      bg.lineStyle(1, 0x66aaff, 0.6);
      bg.strokeRoundedRect(0, 0, w, h, 10);
    });

    this.resetBtn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x2255aa, 0.35);
      bg.fillRoundedRect(0, 0, w, h, 10);
      bg.lineStyle(1, 0x4488cc, 0.4);
      bg.strokeRoundedRect(0, 0, w, h, 10);
    });

    this.resetBtn.on('pointerdown', () => {
      this.resetLevel();
    });
  }

  resetLevel(): void {
    this.scene.restart();
  }

  canPass(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const { rows, cols, cells } = this.mazeData;
    if (toRow < 0 || toRow >= rows || toCol < 0 || toCol >= cols) return false;
    if (fromRow < 0 || fromRow >= rows || fromCol < 0 || fromCol >= cols) return false;

    const dRow = toRow - fromRow;
    const dCol = toCol - fromCol;

    let side: 'top' | 'right' | 'bottom' | 'left';
    if (dRow === -1) side = 'top';
    else if (dRow === 1) side = 'bottom';
    else if (dCol === -1) side = 'left';
    else side = 'right';

    if (cells[fromRow][fromCol].walls[side]) {
      const isDoor = this.mazeData.doors.some(
        d => d.row === fromRow && d.col === fromCol && d.side === side && !this.openDoorIds.has(d.id)
      );
      if (!isDoor) return false;

      const oppSide = side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : side === 'left' ? 'right' : 'left';
      const isDoorFromOther = this.mazeData.doors.some(
        d => d.row === toRow && d.col === toCol && d.side === oppSide && !this.openDoorIds.has(d.id)
      );
      if (isDoorFromOther) return false;
    }

    return true;
  }

  onPlayerReachCell(): void {
    if (this.won) return;
    this.steps = this.player.stepCount;
    this.stepsText.setText(`步数 ${this.steps}`);

    const { cellRow, cellCol } = this.player;
    const cell = this.mazeData.cells[cellRow][cellCol];

    if (cell.hasSwitch && cell.switchDoorId >= 0 && !this.openDoorIds.has(cell.switchDoorId)) {
      this.openDoorIds.add(cell.switchDoorId);
      const door = this.doors.find(d => d.id === cell.switchDoorId);
      if (door) {
        door.open();
      }

      const switchIdx = this.mazeData.switches.findIndex(s => s.doorId === cell.switchDoorId);
      if (switchIdx >= 0 && this.switchGraphics[switchIdx]) {
        this.tweens.add({
          targets: this.switchGraphics[switchIdx],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.switchGraphics[switchIdx].destroy();
          },
        });
        if (this.switchGlows[switchIdx]) {
          this.tweens.add({
            targets: this.switchGlows[switchIdx],
            alpha: 0,
            duration: 300,
          });
        }
      }
    }

    if (cell.isEnd) {
      this.onLevelComplete();
    }
  }

  onLevelComplete(): void {
    this.won = true;

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    overlay.setDepth(UI_DEPTH + 10);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 400 });

    const title = this.add.text(cx, cy - 40, '关卡完成!', {
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffcc00',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(UI_DEPTH + 11).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 400, delay: 200 });

    const stepsInfo = this.add.text(cx, cy + 10, `步数: ${this.steps}`, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#88ddff',
    }).setOrigin(0.5).setDepth(UI_DEPTH + 11).setAlpha(0);
    this.tweens.add({ targets: stepsInfo, alpha: 1, duration: 400, delay: 400 });

    const nextBtn = this.add.text(cx, cy + 60, '下一关 →', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#00ff88',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(UI_DEPTH + 11).setAlpha(0);
    this.tweens.add({ targets: nextBtn, alpha: 1, duration: 400, delay: 600 });

    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on('pointerover', () => { nextBtn.setColor('#44ffaa'); });
    nextBtn.on('pointerout', () => { nextBtn.setColor('#00ff88'); });
    nextBtn.on('pointerdown', () => {
      this.level++;
      this.scene.restart();
    });

    this.winOverlay = this.add.container(0, 0);
  }

  setupTouch(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.won) return;
      this.touchStartX = pointer.x;
      this.touchStartY = pointer.y;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.won) return;
      const dx = pointer.x - this.touchStartX;
      const dy = pointer.y - this.touchStartY;
      const minSwipe = 20;
      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

      let dRow = 0;
      let dCol = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        dCol = dx > 0 ? 1 : -1;
      } else {
        dRow = dy > 0 ? 1 : -1;
      }
      this.player.setTouchTarget(dRow, dCol, this.canPass.bind(this));
    });
  }

  update(time: number, delta: number): void {
    if (this.won) return;
    this.player.update(time, delta, this.canPass.bind(this));
  }
}
