import Phaser from 'phaser';
import {
  MAZE_CONFIG, PLAYER_CONFIG, COLOR_THEME, AUDIO_CONFIG, GAME_CONFIG,
} from '../config';

interface MazeCell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
  isPhantom: boolean;
  phantomActive: boolean;
  originalWall: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}

interface SoundEngine {
  ctx: AudioContext | null;
  playMove: () => void;
  playWallHit: () => void;
  playWin: () => void;
  playPhantomSwitch: () => void;
  resume: () => void;
}

export class GameScene extends Phaser.Scene {
  private maze: MazeCell[][] = [];
  private mazeCols: number = MAZE_CONFIG.cols;
  private mazeRows: number = MAZE_CONFIG.rows;
  private cellSize: number = MAZE_CONFIG.cellSize;
  private phantomInterval: number = MAZE_CONFIG.phantomInterval;
  private mazeOffsetX: number = 0;
  private mazeOffsetY: number = 0;

  private wallGraphics!: Phaser.GameObjects.Graphics;
  private phantomFlashOverlay!: Phaser.GameObjects.Graphics;
  private exitMarker!: Phaser.GameObjects.Graphics;

  private player!: Phaser.GameObjects.Arc;
  private playerGlow!: Phaser.GameObjects.Arc;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private targetX: number = 0;
  private targetY: number = 0;
  private isMoving: boolean = false;

  private timerText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private elapsedTime: number = 0;
  private currentLevel: number = 1;

  private controlPanel!: Phaser.GameObjects.Container;
  private phantomSpeedSlider!: Phaser.GameObjects.Container;
  private mazeSizeSlider!: Phaser.GameObjects.Container;
  private phantomSpeedValue: number = MAZE_CONFIG.phantomInterval;
  private mazeSizeValue: number = MAZE_CONFIG.cols;

  private phantomTimer!: Phaser.Time.TimerEvent;
  private phantomPhase: number = 0;

  private ripples: Array<{
    gfx: Phaser.GameObjects.Graphics;
    x: number; y: number;
    radius: number; maxRadius: number;
    alpha: number;
  }> = [];

  private soundEngine!: SoundEngine;

  private bgGraphics!: Phaser.GameObjects.Graphics;
  private timeElapsed: number = 0;
  private mazeContainer!: Phaser.GameObjects.Container;

  private isPaused: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.timeElapsed = 0;
    this.elapsedTime = 0;
    this.isMoving = false;
    this.phantomPhase = 0;
    this.ripples = [];
    this.isPaused = false;

    this.initSoundEngine();
    this.calculateLayout();
    this.createBackground();
    this.generateMaze();
    this.renderMaze();
    this.createPlayer();
    this.createTrailEmitter();
    this.createExitMarker();
    this.createPhantomFlashOverlay();
    this.createUI();
    this.createControlPanel();
    this.setupInput();
    this.startPhantomTimer();
    this.setupCamera();

    this.soundEngine.resume();
  }

  update(_time: number, delta: number): void {
    if (this.isPaused) return;
    this.timeElapsed += delta;
    this.elapsedTime += delta;
    this.updateTimerDisplay();
    this.updatePlayerMovement(delta);
    this.updateRipples();
    this.updatePlayerGlow();
    this.updateBackground();
    this.checkExitReached();
  }

  private calculateLayout(): void {
    const mazePixelW = this.mazeCols * this.cellSize;
    const mazePixelH = this.mazeRows * this.cellSize;
    this.mazeOffsetX = (GAME_CONFIG.width - mazePixelW) / 2;
    this.mazeOffsetY = (GAME_CONFIG.height - mazePixelH) / 2 + 15;
  }

  private createBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.updateBackground();
  }

  private updateBackground(): void {
    const g = this.bgGraphics;
    g.clear();
    g.fillGradientStyle(
      COLOR_THEME.bgTop, COLOR_THEME.bgTop,
      COLOR_THEME.bgBottom, COLOR_THEME.bgBottom, 1
    );
    g.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    const t = this.timeElapsed * 0.0003;
    g.lineStyle(1, COLOR_THEME.wallGlow, 0.02);
    for (let i = 0; i < 30; i++) {
      const y = (i * 25 + Math.sin(t + i * 0.3) * 10) % GAME_CONFIG.height;
      g.lineBetween(0, y, GAME_CONFIG.width, y);
    }
  }

  private generateMaze(): void {
    this.maze = [];
    for (let y = 0; y < this.mazeRows; y++) {
      this.maze[y] = [];
      for (let x = 0; x < this.mazeCols; x++) {
        this.maze[y][x] = {
          x, y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          isPhantom: false,
          phantomActive: true,
          originalWall: { top: true, right: true, bottom: true, left: true },
        };
      }
    }

    this.carveMaze(0, 0);

    const phantomCount = Math.floor(this.mazeCols * this.mazeRows * MAZE_CONFIG.phantomChangeRatio);
    const candidates: { x: number; y: number }[] = [];
    for (let y = 0; y < this.mazeRows; y++) {
      for (let x = 0; x < this.mazeCols; x++) {
        if (!(x === 0 && y === 0) && !(x === this.mazeCols - 1 && y === this.mazeRows - 1)) {
          candidates.push({ x, y });
        }
      }
    }
    Phaser.Utils.Array.Shuffle(candidates);
    for (let i = 0; i < Math.min(phantomCount, candidates.length); i++) {
      const c = candidates[i];
      const cell = this.maze[c.y][c.x];
      cell.isPhantom = true;
      cell.originalWall = { ...cell.walls };
    }
  }

  private carveMaze(startX: number, startY: number): void {
    const stack: MazeCell[] = [];
    const start = this.maze[startY][startX];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current.x, current.y);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Phaser.Math.Between(0, neighbors.length - 1)];
        this.removeWallBetween(current, next);
        next.visited = true;
        stack.push(next);
      }
    }
  }

  private getUnvisitedNeighbors(x: number, y: number): MazeCell[] {
    const neighbors: MazeCell[] = [];
    if (y > 0 && !this.maze[y - 1][x].visited) neighbors.push(this.maze[y - 1][x]);
    if (x < this.mazeCols - 1 && !this.maze[y][x + 1].visited) neighbors.push(this.maze[y][x + 1]);
    if (y < this.mazeRows - 1 && !this.maze[y + 1][x].visited) neighbors.push(this.maze[y + 1][x]);
    if (x > 0 && !this.maze[y][x - 1].visited) neighbors.push(this.maze[y][x - 1]);
    return neighbors;
  }

  private removeWallBetween(a: MazeCell, b: MazeCell): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 1) { a.walls.right = false; b.walls.left = false; }
    if (dx === -1) { a.walls.left = false; b.walls.right = false; }
    if (dy === 1) { a.walls.bottom = false; b.walls.top = false; }
    if (dy === -1) { a.walls.top = false; b.walls.bottom = false; }
  }

  private renderMaze(): void {
    if (this.mazeContainer) this.mazeContainer.destroy(true);
    this.mazeContainer = this.add.container(0, 0);

    this.wallGraphics = this.add.graphics();
    this.mazeContainer.add(this.wallGraphics);
    this.drawWalls();
  }

  private drawWalls(): void {
    const g = this.wallGraphics;
    g.clear();

    for (let y = 0; y < this.mazeRows; y++) {
      for (let x = 0; x < this.mazeCols; x++) {
        const cell = this.maze[y][x];
        const px = this.mazeOffsetX + x * this.cellSize;
        const py = this.mazeOffsetY + y * this.cellSize;
        const cs = this.cellSize;

        if (cell.isPhantom && !cell.phantomActive) {
          this.drawPhantomInactiveWalls(g, cell, px, py, cs);
        } else {
          this.drawActiveWalls(g, cell, px, py, cs, cell.isPhantom);
        }
      }
    }
  }

  private drawActiveWalls(
    g: Phaser.GameObjects.Graphics,
    cell: MazeCell, px: number, py: number, cs: number,
    isPhantom: boolean
  ): void {
    const color1 = isPhantom ? COLOR_THEME.wallSecondary : COLOR_THEME.wallPrimary;
    const alpha = isPhantom ? 0.9 : 1.0;
    g.lineStyle(3, color1, alpha);

    if (cell.walls.top) g.lineBetween(px, py, px + cs, py);
    if (cell.walls.right) g.lineBetween(px + cs, py, px + cs, py + cs);
    if (cell.walls.bottom) g.lineBetween(px, py + cs, px + cs, py + cs);
    if (cell.walls.left) g.lineBetween(px, py, px, py + cs);

    if (isPhantom) {
      g.lineStyle(6, COLOR_THEME.wallSecondary, 0.15);
      if (cell.walls.top) g.lineBetween(px, py, px + cs, py);
      if (cell.walls.right) g.lineBetween(px + cs, py, px + cs, py + cs);
      if (cell.walls.bottom) g.lineBetween(px, py + cs, px + cs, py + cs);
      if (cell.walls.left) g.lineBetween(px, py, px, py + cs);
    } else {
      g.lineStyle(6, COLOR_THEME.wallGlow, 0.2);
      if (cell.walls.top) g.lineBetween(px, py, px + cs, py);
      if (cell.walls.right) g.lineBetween(px + cs, py, px + cs, py + cs);
      if (cell.walls.bottom) g.lineBetween(px, py + cs, px + cs, py + cs);
      if (cell.walls.left) g.lineBetween(px, py, px, py + cs);
    }
  }

  private drawPhantomInactiveWalls(
    g: Phaser.GameObjects.Graphics,
    cell: MazeCell, px: number, py: number, cs: number
  ): void {
    g.lineStyle(1, COLOR_THEME.wallSecondary, 0.12);
    if (cell.originalWall.top) g.lineBetween(px, py, px + cs, py);
    if (cell.originalWall.right) g.lineBetween(px + cs, py, px + cs, py + cs);
    if (cell.originalWall.bottom) g.lineBetween(px, py + cs, px + cs, py + cs);
    if (cell.originalWall.left) g.lineBetween(px, py, px, py + cs);
  }

  private createPlayer(): void {
    const startPx = this.mazeOffsetX + 0.5 * this.cellSize;
    const startPy = this.mazeOffsetY + 0.5 * this.cellSize;

    this.playerGlow = this.add.circle(startPx, startPy, PLAYER_CONFIG.radius + 8, COLOR_THEME.playerGlow, 0.2);
    this.player = this.add.circle(startPx, startPy, PLAYER_CONFIG.radius, COLOR_THEME.playerCore, 1);

    this.targetX = this.player.x;
    this.targetY = this.player.y;

    this.tweens.add({
      targets: this.playerGlow,
      alpha: { from: 0.15, to: 0.35 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createTrailEmitter(): void {
    const trailGfx = this.add.graphics();
    trailGfx.fillStyle(COLOR_THEME.playerGlow, 1);
    trailGfx.fillCircle(5, 5, 5);
    trailGfx.generateTexture('trailParticle', 10, 10);
    trailGfx.destroy();

    this.trailEmitter = this.add.particles(this.player.x, this.player.y, 'trailParticle', {
      lifespan: PLAYER_CONFIG.trailLifespan,
      speed: { min: 5, max: 20 },
      quantity: PLAYER_CONFIG.trailQuantity,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });
  }

  private createExitMarker(): void {
    this.exitMarker = this.add.graphics();
    const ex = this.mazeOffsetX + (this.mazeCols - 1) * this.cellSize;
    const ey = this.mazeOffsetY + (this.mazeRows - 1) * this.cellSize;
    const cs = this.cellSize;

    this.exitMarker.fillStyle(COLOR_THEME.exitColor, 0.15);
    this.exitMarker.fillRect(ex + 4, ey + 4, cs - 8, cs - 8);
    this.exitMarker.lineStyle(2, COLOR_THEME.exitColor, 0.7);
    this.exitMarker.strokeRect(ex + 4, ey + 4, cs - 8, cs - 8);

    this.tweens.add({
      targets: this.exitMarker,
      alpha: { from: 0.5, to: 1.0 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createPhantomFlashOverlay(): void {
    this.phantomFlashOverlay = this.add.graphics();
    this.phantomFlashOverlay.setAlpha(0);
    this.phantomFlashOverlay.setDepth(100);
  }

  private triggerPhantomSwitch(): void {
    this.phantomPhase++;
    this.soundEngine.playPhantomSwitch();

    this.tweens.add({
      targets: this.phantomFlashOverlay,
      alpha: { from: 0, to: 0.3 },
      duration: 150,
      yoyo: true,
      onComplete: () => {
        this.phantomFlashOverlay.clear();
        this.phantomFlashOverlay.setAlpha(0);
      },
    });
    this.phantomFlashOverlay.clear();
    this.phantomFlashOverlay.fillGradientStyle(
      COLOR_THEME.phantomFlash, COLOR_THEME.phantomFlash,
      COLOR_THEME.wallSecondary, COLOR_THEME.wallSecondary, 0.6
    );
    this.phantomFlashOverlay.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    this.togglePhantomWalls();
    this.drawWalls();

    this.cameras.main.shake(200, 0.005);
  }

  private togglePhantomWalls(): void {
    for (let y = 0; y < this.mazeRows; y++) {
      for (let x = 0; x < this.mazeCols; x++) {
        const cell = this.maze[y][x];
        if (!cell.isPhantom) continue;

        cell.phantomActive = !cell.phantomActive;

        if (cell.phantomActive) {
          cell.walls = { ...cell.originalWall };
        } else {
          const directions = ['top', 'right', 'bottom', 'left'] as const;
          for (const dir of directions) {
            if (cell.originalWall[dir]) {
              const shouldToggle = Phaser.Math.Between(0, 1) === 0;
              if (shouldToggle) {
                cell.walls[dir] = !cell.walls[dir];
                this.syncNeighborWall(x, y, dir, cell.walls[dir]);
              }
            }
          }
        }
      }
    }
  }

  private syncNeighborWall(x: number, y: number, dir: string, state: boolean): void {
    const opposite: Record<string, string> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    const dx: Record<string, number> = { top: 0, bottom: 0, left: -1, right: 1 };
    const dy: Record<string, number> = { top: -1, bottom: 1, left: 0, right: 0 };

    const nx = x + dx[dir];
    const ny = y + dy[dir];
    if (ny >= 0 && ny < this.mazeRows && nx >= 0 && nx < this.mazeCols) {
      this.maze[ny][nx].walls[opposite[dir] as keyof typeof this.maze[0][0]['walls']] = state;
    }
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isControlPanelClick(pointer)) return;
      this.soundEngine.resume();
      this.setTarget(pointer.x, pointer.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown && !this.isControlPanelClick(pointer)) {
        this.setTarget(pointer.x, pointer.y);
      }
    });
  }

  private isControlPanelClick(pointer: Phaser.Input.Pointer): boolean {
    if (!this.controlPanel) return false;
    const panelBounds = this.controlPanel.getBounds();
    return panelBounds.contains(pointer.x, pointer.y);
  }

  private setTarget(worldX: number, worldY: number): void {
    this.targetX = Phaser.Math.Clamp(
      worldX,
      this.mazeOffsetX + PLAYER_CONFIG.radius,
      this.mazeOffsetX + this.mazeCols * this.cellSize - PLAYER_CONFIG.radius
    );
    this.targetY = Phaser.Math.Clamp(
      worldY,
      this.mazeOffsetY + PLAYER_CONFIG.radius,
      this.mazeOffsetY + this.mazeRows * this.cellSize - PLAYER_CONFIG.radius
    );
    this.isMoving = true;
    this.soundEngine.playMove();
  }

  private updatePlayerMovement(delta: number): void {
    if (!this.isMoving) {
      this.trailEmitter.emitting = false;
      return;
    }

    const dx = this.targetX - this.player.x;
    const dy = this.targetY - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      this.isMoving = false;
      this.player.x = this.targetX;
      this.player.y = this.targetY;
      this.trailEmitter.emitting = false;
      return;
    }

    const speed = PLAYER_CONFIG.speed * (delta / 1000);
    let moveX = (dx / dist) * speed;
    let moveY = (dy / dist) * speed;

    if (Math.abs(moveX) > Math.abs(dx)) moveX = dx;
    if (Math.abs(moveY) > Math.abs(dy)) moveY = dy;

    const nextX = this.player.x + moveX;
    const nextY = this.player.y + moveY;

    if (this.checkCollision(nextX, nextY)) {
      this.isMoving = false;
      this.soundEngine.playWallHit();
      this.createRipple(this.player.x, this.player.y);
      this.cameras.main.shake(80, 0.003);
      return;
    }

    this.player.x = nextX;
    this.player.y = nextY;
    this.playerGlow.x = nextX;
    this.playerGlow.y = nextY;

    this.trailEmitter.setPosition(nextX, nextY);
    this.trailEmitter.emitting = true;
  }

  private checkCollision(px: number, py: number): boolean {
    const r = PLAYER_CONFIG.radius;
    const cellX = Math.floor((px - this.mazeOffsetX) / this.cellSize);
    const cellY = Math.floor((py - this.mazeOffsetY) / this.cellSize);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = cellX + dx;
        const cy = cellY + dy;
        if (cy < 0 || cy >= this.mazeRows || cx < 0 || cx >= this.mazeCols) continue;

        const cell = this.maze[cy][cx];
        const wallLeft = this.mazeOffsetX + cx * this.cellSize;
        const wallTop = this.mazeOffsetY + cy * this.cellSize;
        const wallRight = wallLeft + this.cellSize;
        const wallBottom = wallTop + this.cellSize;

        if (cell.walls.top && this.circleIntersectsLine(px, py, r, wallLeft, wallTop, wallRight, wallTop)) return true;
        if (cell.walls.right && this.circleIntersectsLine(px, py, r, wallRight, wallTop, wallRight, wallBottom)) return true;
        if (cell.walls.bottom && this.circleIntersectsLine(px, py, r, wallLeft, wallBottom, wallRight, wallBottom)) return true;
        if (cell.walls.left && this.circleIntersectsLine(px, py, r, wallLeft, wallTop, wallLeft, wallBottom)) return true;
      }
    }

    if (px - r < this.mazeOffsetX) return true;
    if (px + r > this.mazeOffsetX + this.mazeCols * this.cellSize) return true;
    if (py - r < this.mazeOffsetY) return true;
    if (py + r > this.mazeOffsetY + this.mazeRows * this.cellSize) return true;

    return false;
  }

  private circleIntersectsLine(
    cx: number, cy: number, cr: number,
    x1: number, y1: number, x2: number, y2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const d = Math.sqrt((cx - x1) ** 2 + (cy - y1) ** 2);
      return d < cr;
    }
    let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nearX = x1 + t * dx;
    const nearY = y1 + t * dy;
    const d = Math.sqrt((cx - nearX) ** 2 + (cy - nearY) ** 2);
    return d < cr;
  }

  private createRipple(x: number, y: number): void {
    const gfx = this.add.graphics();
    gfx.setDepth(50);
    this.ripples.push({
      gfx, x, y,
      radius: PLAYER_CONFIG.radius,
      maxRadius: PLAYER_CONFIG.radius + 30,
      alpha: 0.8,
    });
  }

  private updateRipples(): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 1.5;
      r.alpha -= 0.03;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        r.gfx.destroy();
        this.ripples.splice(i, 1);
        continue;
      }

      r.gfx.clear();
      r.gfx.lineStyle(2, COLOR_THEME.rippleColor, r.alpha);
      r.gfx.strokeCircle(r.x, r.y, r.radius);
    }
  }

  private updatePlayerGlow(): void {
    this.playerGlow.x = this.player.x;
    this.playerGlow.y = this.player.y;
  }

  private createUI(): void {
    this.timerText = this.add.text(16, 16, '00:00', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: COLOR_THEME.textPrimary,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: COLOR_THEME.playerGlow,
        blur: 6, stroke: true, fill: true,
      },
    }).setDepth(200);

    this.levelText = this.add.text(16, 40, `层级 ${this.currentLevel}`, {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '14px',
      color: COLOR_THEME.textSecondary,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: COLOR_THEME.wallGlow,
        blur: 4, stroke: true, fill: true,
      },
    }).setDepth(200);
  }

  private updateTimerDisplay(): void {
    const totalSec = Math.floor(this.elapsedTime / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    this.timerText.setText(`${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`);
  }

  private createControlPanel(): void {
    const panelW = 180;
    const panelH = 160;
    const panelX = GAME_CONFIG.width - panelW - 12;
    const panelY = GAME_CONFIG.height - panelH - 12;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLOR_THEME.panelBg, COLOR_THEME.panelAlpha);
    panelBg.fillRoundedRect(0, 0, panelW, panelH, 10);
    panelBg.lineStyle(1, COLOR_THEME.wallSecondary, 0.3);
    panelBg.strokeRoundedRect(0, 0, panelW, panelH, 10);

    const resetBtn = this.createResetButton(panelW);
    this.phantomSpeedSlider = this.createSlider(
      '幻象速度', 10, 16, panelW - 20, this.phantomInterval / 1000,
      2, 10, 1, (val: number) => { this.phantomSpeedValue = val * 1000; this.restartPhantomTimer(); }
    );
    this.mazeSizeSlider = this.createSlider(
      '迷宫大小', 10, 82, panelW - 20, this.mazeCols,
      7, 25, 2, (val: number) => { this.mazeSizeValue = val; }
    );

    this.controlPanel = this.add.container(panelX, panelY, [
      panelBg,
      resetBtn,
      this.phantomSpeedSlider,
      this.mazeSizeSlider,
    ]);
    this.controlPanel.setDepth(300);
    this.controlPanel.setSize(panelW, panelH);
  }

  private createResetButton(panelW: number): Phaser.GameObjects.Container {
    const btnW = panelW - 20;
    const btnH = 30;
    const btnBg = this.add.graphics();
    btnBg.fillStyle(COLOR_THEME.wallPrimary, 0.4);
    btnBg.fillRoundedRect(0, 0, btnW, btnH, 6);
    btnBg.lineStyle(1, COLOR_THEME.wallSecondary, 0.5);
    btnBg.strokeRoundedRect(0, 0, btnW, btnH, 6);

    const label = this.add.text(btnW / 2, btnH / 2, '重置迷宫', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '13px',
      color: COLOR_THEME.textPrimary,
    }).setOrigin(0.5);

    const container = this.add.container(10, panelW > 100 ? 130 : 120, [btnBg, label]);
    container.setSize(btnW, btnH);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      this.resetMaze();
    });

    return container;
  }

  private createSlider(
    label: string, x: number, y: number, width: number,
    currentVal: number, minVal: number, maxVal: number, step: number,
    onChange: (val: number) => void
  ): Phaser.GameObjects.Container {
    const labelText = this.add.text(x, y, `${label}: ${currentVal}`, {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '12px',
      color: COLOR_THEME.textPrimary,
    });

    const trackY = y + 22;
    const trackH = 4;
    const track = this.add.graphics();
    track.fillStyle(COLOR_THEME.wallPrimary, 0.3);
    track.fillRoundedRect(x, trackY, width, trackH, 2);

    const ratio = (currentVal - minVal) / (maxVal - minVal);
    const thumbX = x + ratio * width;
    const thumb = this.add.graphics();
    thumb.fillStyle(COLOR_THEME.wallSecondary, 0.9);
    thumb.fillCircle(thumbX, trackY + trackH / 2, 7);
    thumb.lineStyle(1, COLOR_THEME.playerGlow, 0.5);
    thumb.strokeCircle(thumbX, trackY + trackH / 2, 7);

    const container = this.add.container(0, 0, [labelText, track, thumb]);

    const sliderZone = this.add.zone(x + width / 2, trackY + trackH / 2, width, 20);
    sliderZone.setInteractive({ draggable: true });

    sliderZone.on('drag', (pointer: Phaser.Input.Pointer) => {
      const localX = Phaser.Math.Clamp(pointer.x - container.x - x, 0, width);
      const newRatio = localX / width;
      let newVal = minVal + newRatio * (maxVal - minVal);
      newVal = Math.round(newVal / step) * step;
      newVal = Phaser.Math.Clamp(newVal, minVal, maxVal);

      const newRatioClamped = (newVal - minVal) / (maxVal - minVal);
      const newThumbX = x + newRatioClamped * width;

      thumb.clear();
      thumb.fillStyle(COLOR_THEME.wallSecondary, 0.9);
      thumb.fillCircle(newThumbX, trackY + trackH / 2, 7);
      thumb.lineStyle(1, COLOR_THEME.playerGlow, 0.5);
      thumb.strokeCircle(newThumbX, trackY + trackH / 2, 7);

      labelText.setText(`${label}: ${newVal}`);
      onChange(newVal);
    });

    container.add(sliderZone);
    return container;
  }

  private startPhantomTimer(): void {
    if (this.phantomTimer) this.phantomTimer.remove();
    this.phantomTimer = this.time.addEvent({
      delay: this.phantomSpeedValue,
      callback: () => {
        if (!this.isPaused) this.triggerPhantomSwitch();
      },
      loop: true,
    });
  }

  private restartPhantomTimer(): void {
    this.startPhantomTimer();
  }

  private resetMaze(): void {
    this.mazeCols = this.mazeSizeValue;
    this.mazeRows = Math.max(5, Math.floor(this.mazeCols * 0.7));
    this.cellSize = Math.min(
      Math.floor((GAME_CONFIG.width - 40) / this.mazeCols),
      Math.floor((GAME_CONFIG.height - 80) / this.mazeRows),
      50
    );
    this.calculateLayout();
    this.generateMaze();
    this.renderMaze();

    this.player.x = this.mazeOffsetX + 0.5 * this.cellSize;
    this.player.y = this.mazeOffsetY + 0.5 * this.cellSize;
    this.playerGlow.x = this.player.x;
    this.playerGlow.y = this.player.y;
    this.targetX = this.player.x;
    this.targetY = this.player.y;
    this.isMoving = false;

    this.exitMarker.destroy();
    this.createExitMarker();

    this.elapsedTime = 0;
    this.currentLevel++;
    this.levelText.setText(`层级 ${this.currentLevel}`);

    this.startPhantomTimer();
  }

  private checkExitReached(): void {
    const exitPx = this.mazeOffsetX + (this.mazeCols - 0.5) * this.cellSize;
    const exitPy = this.mazeOffsetY + (this.mazeRows - 0.5) * this.cellSize;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, exitPx, exitPy);

    if (dist < this.cellSize * 0.4) {
      this.isPaused = true;
      this.soundEngine.playWin();
      this.cameras.main.fadeOut(500, 0x0a, 0x06, 0x12);
      this.time.delayedCall(500, () => {
        this.scene.start('GameOverScene', {
          time: this.elapsedTime,
          level: this.currentLevel,
          phantomPhase: this.phantomPhase,
        });
      });
    }
  }

  private setupCamera(): void {
    this.cameras.main.fadeIn(400, 0x0a, 0x06, 0x12);
  }

  private initSoundEngine(): void {
    const engine: SoundEngine = {
      ctx: null,
      playMove: () => {},
      playWallHit: () => {},
      playWin: () => {},
      playPhantomSwitch: () => {},
      resume: () => {},
    };

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      engine.ctx = ctx;

      engine.resume = () => {
        if (ctx.state === 'suspended') ctx.resume();
      };

      const createTone = (freq: number, duration: number, type: OscillatorType = 'sine', vol: number = AUDIO_CONFIG.masterVolume) => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      };

      engine.playMove = () => {
        createTone(AUDIO_CONFIG.moveFreq, AUDIO_CONFIG.moveDuration, 'sine', 0.1);
      };

      engine.playWallHit = () => {
        createTone(AUDIO_CONFIG.wallHitFreq, AUDIO_CONFIG.wallHitDuration, 'square', 0.15);
        createTone(AUDIO_CONFIG.wallHitFreq * 0.8, AUDIO_CONFIG.wallHitDuration * 0.6, 'sawtooth', 0.08);
      };

      engine.playWin = () => {
        const now = ctx.currentTime;
        [523, 659, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0, now + i * 0.12);
          gain.gain.linearRampToValueAtTime(AUDIO_CONFIG.masterVolume, now + i * 0.12 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + AUDIO_CONFIG.winDuration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + AUDIO_CONFIG.winDuration);
        });
      };

      engine.playPhantomSwitch = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(AUDIO_CONFIG.phantomSwitchFreq, now);
        osc.frequency.exponentialRampToValueAtTime(AUDIO_CONFIG.phantomSwitchFreq * 0.5, now + AUDIO_CONFIG.phantomSwitchDuration);
        gain.gain.setValueAtTime(AUDIO_CONFIG.masterVolume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + AUDIO_CONFIG.phantomSwitchDuration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + AUDIO_CONFIG.phantomSwitchDuration);
      };
    } catch (_e) {
      // Web Audio API not available
    }

    this.soundEngine = engine;
  }
}
