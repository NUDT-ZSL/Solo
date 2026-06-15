import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Prism } from '../objects/Prism';
import { LightTrack, TrackZone } from '../objects/LightTrack';

const GAME_W = 1280;
const GAME_H = 720;
const MAZE_COLS = 10;
const MAZE_ROWS = 6;
const MAZE_MARGIN_X = 80;
const MAZE_MARGIN_Y = 60;
const TIME_LIMIT = 90;

interface Cell {
  col: number;
  row: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private prisms: Prism[] = [];
  private tracks: LightTrack[] = [];
  private mazeGrid: Cell[][] = [];
  private cellW: number = 0;
  private cellH: number = 0;
  private mazeOriginX: number = 0;
  private mazeOriginY: number = 0;

  private timeLeft: number = TIME_LIMIT;
  private score: number = 0;
  private gameSpeed: number = 1;
  private trackThickness: number = 4;
  private isGameOver: boolean = false;
  private isGameWon: boolean = false;
  private exitX: number = 0;
  private exitY: number = 0;

  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private exitMarker!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;

  private controlPanel: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cellW = (GAME_W - MAZE_MARGIN_X * 2) / MAZE_COLS;
    this.cellH = (GAME_H - MAZE_MARGIN_Y * 2) / MAZE_ROWS;
    this.mazeOriginX = MAZE_MARGIN_X;
    this.mazeOriginY = MAZE_MARGIN_Y;

    this.isGameOver = false;
    this.isGameWon = false;
    this.timeLeft = TIME_LIMIT;
    this.score = 0;
    this.gameSpeed = 1;
    this.trackThickness = 4;
    this.prisms = [];
    this.tracks = [];

    this.drawBackground();
    this.generateMaze();
    this.createTracks();
    this.createPrisms();
    this.createPlayer();
    this.createExitMarker();
    this.createUI();
    this.createControlPanel();
  }

  private drawBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.fillStyle(0x000000, 1);
    this.bgGraphics.fillRect(0, 0, GAME_W, GAME_H);

    const gridAlpha = 0.04;
    this.bgGraphics.lineStyle(1, 0x334466, gridAlpha);
    for (let x = 0; x < GAME_W; x += 40) {
      this.bgGraphics.moveTo(x, 0);
      this.bgGraphics.lineTo(x, GAME_H);
    }
    for (let y = 0; y < GAME_H; y += 40) {
      this.bgGraphics.moveTo(0, y);
      this.bgGraphics.lineTo(GAME_W, y);
    }
  }

  private generateMaze(): void {
    this.mazeGrid = [];
    for (let r = 0; r < MAZE_ROWS; r++) {
      this.mazeGrid[r] = [];
      for (let c = 0; c < MAZE_COLS; c++) {
        this.mazeGrid[r][c] = {
          col: c,
          row: r,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        };
      }
    }

    const stack: Cell[] = [];
    const start = this.mazeGrid[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWallBetween(current, next);
        next.visited = true;
        stack.push(next);
      }
    }

    const extraRemovals = Math.floor(MAZE_COLS * MAZE_ROWS * 0.15);
    for (let i = 0; i < extraRemovals; i++) {
      const r = Math.floor(Math.random() * MAZE_ROWS);
      const c = Math.floor(Math.random() * MAZE_COLS);
      const cell = this.mazeGrid[r][c];
      const dirs = ['top', 'right', 'bottom', 'left'] as const;
      const dir = dirs[Math.floor(Math.random() * 4)];
      const nr = r + (dir === 'bottom' ? 1 : dir === 'top' ? -1 : 0);
      const nc = c + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
      if (nr >= 0 && nr < MAZE_ROWS && nc >= 0 && nc < MAZE_COLS) {
        this.removeWallBetween(cell, this.mazeGrid[nr][nc]);
      }
    }
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const neighbors: Cell[] = [];
    const { col, row } = cell;

    if (row > 0 && !this.mazeGrid[row - 1][col].visited) neighbors.push(this.mazeGrid[row - 1][col]);
    if (row < MAZE_ROWS - 1 && !this.mazeGrid[row + 1][col].visited) neighbors.push(this.mazeGrid[row + 1][col]);
    if (col > 0 && !this.mazeGrid[row][col - 1].visited) neighbors.push(this.mazeGrid[row][col - 1]);
    if (col < MAZE_COLS - 1 && !this.mazeGrid[row][col + 1].visited) neighbors.push(this.mazeGrid[row][col + 1]);

    return neighbors;
  }

  private removeWallBetween(a: Cell, b: Cell): void {
    const dc = b.col - a.col;
    const dr = b.row - a.row;

    if (dc === 1) { a.walls.right = false; b.walls.left = false; }
    else if (dc === -1) { a.walls.left = false; b.walls.right = false; }
    else if (dr === 1) { a.walls.bottom = false; b.walls.top = false; }
    else if (dr === -1) { a.walls.top = false; b.walls.bottom = false; }
  }

  private getZoneForCell(col: number, _row: number): TrackZone {
    const zoneIndex = Math.floor((col / MAZE_COLS) * 3);
    if (zoneIndex === 0) return 'bluePurple';
    if (zoneIndex === 1) return 'cyanGreen';
    return 'warmYellow';
  }

  private cellToPixel(col: number, row: number): { x: number; y: number } {
    return {
      x: this.mazeOriginX + col * this.cellW,
      y: this.mazeOriginY + row * this.cellH,
    };
  }

  private cellCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: this.mazeOriginX + col * this.cellW + this.cellW / 2,
      y: this.mazeOriginY + row * this.cellH + this.cellH / 2,
    };
  }

  private createTracks(): void {
    const wallDrawn = new Set<string>();

    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        const cell = this.mazeGrid[r][c];
        const p = this.cellToPixel(c, r);

        if (cell.walls.top) {
          const key = `h_${r}_${c}`;
          if (!wallDrawn.has(key)) {
            wallDrawn.add(key);
            const zone = this.getZoneForCell(c, r);
            const draggable = Math.random() < 0.35;
            this.tracks.push(new LightTrack({
              scene: this,
              startX: p.x,
              startY: p.y,
              endX: p.x + this.cellW,
              endY: p.y,
              zone,
              draggable,
            }));
          }
        }

        if (cell.walls.left) {
          const key = `v_${r}_${c}`;
          if (!wallDrawn.has(key)) {
            wallDrawn.add(key);
            const zone = this.getZoneForCell(c, r);
            const draggable = Math.random() < 0.35;
            this.tracks.push(new LightTrack({
              scene: this,
              startX: p.x,
              startY: p.y,
              endX: p.x,
              endY: p.y + this.cellH,
              zone,
              draggable,
            }));
          }
        }

        if (r === MAZE_ROWS - 1 && cell.walls.bottom) {
          const key = `h_${r + 1}_${c}`;
          if (!wallDrawn.has(key)) {
            wallDrawn.add(key);
            const zone = this.getZoneForCell(c, r);
            this.tracks.push(new LightTrack({
              scene: this,
              startX: p.x,
              startY: p.y + this.cellH,
              endX: p.x + this.cellW,
              endY: p.y + this.cellH,
              zone,
              draggable: false,
            }));
          }
        }

        if (c === MAZE_COLS - 1 && cell.walls.right) {
          const key = `v_${r}_${c + 1}`;
          if (!wallDrawn.has(key)) {
            wallDrawn.add(key);
            const zone = this.getZoneForCell(c, r);
            this.tracks.push(new LightTrack({
              scene: this,
              startX: p.x + this.cellW,
              startY: p.y,
              endX: p.x + this.cellW,
              endY: p.y + this.cellH,
              zone,
              draggable: false,
            }));
          }
        }
      }
    }
  }

  private createPrisms(): void {
    const count = Phaser.Math.Between(4, 7);
    const usedCells = new Set<string>();
    usedCells.add('0_0');
    usedCells.add(`${MAZE_COLS - 1}_${MAZE_ROWS - 1}`);

    for (let i = 0; i < count; i++) {
      let col: number, row: number, key: string;
      let attempts = 0;
      do {
        col = Math.floor(Math.random() * MAZE_COLS);
        row = Math.floor(Math.random() * MAZE_ROWS);
        key = `${col}_${row}`;
        attempts++;
      } while (usedCells.has(key) && attempts < 50);

      if (attempts >= 50) continue;
      usedCells.add(key);

      const center = this.cellCenter(col, row);
      this.prisms.push(new Prism({
        scene: this,
        x: center.x,
        y: center.y,
        size: Phaser.Math.Between(18, 28),
        rotationSpeed: Phaser.Math.FloatBetween(0.5, 2.5) * (Math.random() > 0.5 ? 1 : -1),
      }));
    }
  }

  private createPlayer(): void {
    const start = this.cellCenter(0, 0);
    this.player = new Player({
      scene: this,
      x: start.x,
      y: start.y,
    });
  }

  private createExitMarker(): void {
    const exitCell = this.cellCenter(MAZE_COLS - 1, MAZE_ROWS - 1);
    this.exitX = exitCell.x;
    this.exitY = exitCell.y;

    this.exitMarker = this.add.graphics();
  }

  private drawExitMarker(): void {
    this.exitMarker.clear();
    const pulse = 0.6 + 0.4 * Math.sin(this.time.now * 0.004);

    this.exitMarker.fillStyle(0x44ffaa, 0.08 * pulse);
    this.exitMarker.fillCircle(this.exitX, this.exitY, 30);
    this.exitMarker.fillStyle(0x44ffaa, 0.15 * pulse);
    this.exitMarker.fillCircle(this.exitX, this.exitY, 20);
    this.exitMarker.fillStyle(0x88ffcc, 0.3 * pulse);
    this.exitMarker.fillCircle(this.exitX, this.exitY, 10);

    this.exitMarker.lineStyle(2, 0x44ffaa, 0.5 * pulse);
    this.exitMarker.strokeCircle(this.exitX, this.exitY, 22 + 4 * Math.sin(this.time.now * 0.003));
  }

  private createUI(): void {
    this.timerText = this.add.text(20, 16, '', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: '22px',
      color: '#ccddff',
      fontStyle: 'bold',
    }).setDepth(100);

    this.scoreText = this.add.text(20, 46, '', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#99aacc',
    }).setDepth(100);

    this.statusText = this.add.text(GAME_W / 2, GAME_H / 2, '', {
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
  }

  private createControlPanel(): void {
    if (this.controlPanel) {
      this.controlPanel.remove();
    }

    const panel = document.createElement('div');
    panel.innerHTML = `
      <div style="margin-bottom:12px;">
        <label style="color:#aabbdd;font-size:12px;display:block;margin-bottom:4px;">光轨粗细</label>
        <input type="range" id="trackThicknessSlider" min="2" max="10" value="4" step="1"
          style="width:140px;accent-color:#6644cc;" />
      </div>
      <div style="margin-bottom:12px;">
        <label style="color:#aabbdd;font-size:12px;display:block;margin-bottom:4px;">游戏速度</label>
        <input type="range" id="gameSpeedSlider" min="0.5" max="2" value="1" step="0.1"
          style="width:140px;accent-color:#22aa88;" />
      </div>
      <button id="restartBtn"
        style="width:100%;padding:8px 0;background:rgba(100,60,180,0.4);color:#ccbbff;
        border:1px solid rgba(150,100,220,0.5);border-radius:6px;cursor:pointer;
        font-size:13px;backdrop-filter:blur(4px);">
        重新开始
      </button>
    `;
    panel.style.cssText = `
      position:fixed;bottom:20px;right:20px;width:180px;padding:16px;
      background:rgba(20,15,40,0.6);backdrop-filter:blur(12px);
      border:1px solid rgba(100,80,180,0.3);border-radius:12px;
      z-index:1000;font-family:"Segoe UI","Microsoft YaHei",sans-serif;
    `;
    document.body.appendChild(panel);
    this.controlPanel = panel;

    const thicknessSlider = document.getElementById('trackThicknessSlider') as HTMLInputElement;
    const speedSlider = document.getElementById('gameSpeedSlider') as HTMLInputElement;
    const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;

    thicknessSlider?.addEventListener('input', (e) => {
      this.trackThickness = parseFloat((e.target as HTMLInputElement).value);
    });

    speedSlider?.addEventListener('input', (e) => {
      this.gameSpeed = parseFloat((e.target as HTMLInputElement).value);
    });

    restartBtn?.addEventListener('click', () => {
      this.restartGame();
    });
  }

  private restartGame(): void {
    this.scene.restart();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver || this.isGameWon) return;

    const scaledDelta = delta * this.gameSpeed;

    this.timeLeft -= scaledDelta / 1000;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver('时间耗尽！');
      return;
    }

    this.player.update(scaledDelta);
    this.prisms.forEach(p => p.update(scaledDelta, this.gameSpeed));
    this.tracks.forEach(t => t.update(scaledDelta, this.trackThickness));
    this.drawExitMarker();

    this.checkTrackZones();
    this.checkPrismCollision();
    this.checkExitReached();

    this.score += Math.round(scaledDelta * 0.01);
    this.updateUI();
  }

  private checkTrackZones(): void {
    let closestDist = Infinity;
    let closestZone: TrackZone | null = null;

    for (const track of this.tracks) {
      const dist = track.distanceToPoint(this.player.x, this.player.y);
      if (dist < 20 && dist < closestDist) {
        closestDist = dist;
        closestZone = track.zone;
      }
    }

    if (closestZone !== this.player.currentZone) {
      this.player.currentZone = closestZone;
      if (closestZone) {
        const track = this.tracks.find(t => t.zone === closestZone);
        if (track) {
          this.player.setSpeedMultiplier(track.speedMultiplier);
        }
      } else {
        this.player.setSpeedMultiplier(1);
      }
    }
  }

  private checkPrismCollision(): void {
    for (const prism of this.prisms) {
      if (prism.checkCollision(this.player.x, this.player.y, 8)) {
        this.gameOver('被暗影棱镜吞噬！');
        return;
      }
    }
  }

  private checkExitReached(): void {
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitX, this.exitY);
    if (dist < 20) {
      this.isGameWon = true;
      this.player.triggerBurst();
      const bonus = Math.floor(this.timeLeft * 10);
      this.score += bonus;
      this.updateUI();

      this.time.delayedCall(2000, () => {
        this.statusText.setText(`通关！\n时间奖励 +${bonus}\n总分 ${this.score}`);
        this.statusText.setAlpha(1);
        this.tweens.add({
          targets: this.statusText,
          alpha: 1,
          duration: 500,
        });
      });
    }
  }

  private gameOver(reason: string): void {
    this.isGameOver = true;
    this.player.die();

    this.statusText.setText(`${reason}\n最终得分: ${this.score}`);
    this.statusText.setAlpha(0);
    this.tweens.add({
      targets: this.statusText,
      alpha: 1,
      duration: 600,
    });
  }

  private updateUI(): void {
    const seconds = Math.max(0, Math.ceil(this.timeLeft));
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.timerText.setText(`⏱ ${minutes}:${secs.toString().padStart(2, '0')}`);
    this.scoreText.setText(`★ ${this.score}`);

    if (this.timeLeft < 15) {
      this.timerText.setColor('#ff6644');
    } else if (this.timeLeft < 30) {
      this.timerText.setColor('#ffaa44');
    } else {
      this.timerText.setColor('#ccddff');
    }
  }

  shutdown(): void {
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
    }
  }
}
