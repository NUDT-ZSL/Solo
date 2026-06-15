import { MazeGenerator, MazeData } from './MazeGenerator';
import { ShadowTentacle } from './ShadowTentacle';
import { LightSystem } from './LightSystem';

export interface PlayerState {
  x: number;
  y: number;
  radius: number;
  speed: number;
  isTeleporting: boolean;
  teleportTimer: number;
  haloPhase: number;
}

export interface GameState {
  score: number;
  orbCount: number;
  teleportCharges: number;
  isGameOver: boolean;
  isPaused: boolean;
}

export type GameStateCallback = (state: GameState) => void;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mazeGenerator: MazeGenerator;
  private mazeData: MazeData | null = null;
  private lightSystem: LightSystem | null = null;
  private tentacles: ShadowTentacle[] = [];
  private player: PlayerState;
  private keys: Set<string> = new Set();
  private animationId: number = 0;
  private lastTime: number = 0;
  private stateCallback: GameStateCallback | null = null;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private isRunning: boolean = false;
  private playerHaloParticles: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = [];
  private globalTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.mazeGenerator = new MazeGenerator(25, 18, 36);
    this.player = {
      x: 18,
      y: 18,
      radius: 8,
      speed: 120,
      isTeleporting: false,
      teleportTimer: 0,
      haloPhase: 0,
    };
  }

  onStateChange(callback: GameStateCallback): void {
    this.stateCallback = callback;
  }

  start(): void {
    this.generateLevel();
    this.isRunning = true;
    this.lastTime = performance.now();
    this.bindInput();
    this.gameLoop(this.lastTime);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.unbindInput();
  }

  reset(): void {
    this.generateLevel();
  }

  private generateLevel(): void {
    this.mazeData = this.mazeGenerator.generate();
    this.lightSystem = new LightSystem(this.mazeData.orbs);
    this.tentacles = this.mazeData.tentacles.map((t) => new ShadowTentacle(t));
    this.player.x = this.mazeData.cellSize / 2;
    this.player.y = this.mazeData.cellSize / 2;
    this.player.isTeleporting = false;
    this.player.teleportTimer = 0;
    this.playerHaloParticles = [];
    this.globalTime = 0;
    this.emitState();
  }

  private bindInput(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private unbindInput(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
    if (e.key === ' ' && this.lightSystem && !this.player.isTeleporting) {
      this.attemptTeleport();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private attemptTeleport(): void {
    if (!this.lightSystem || !this.mazeData) return;
    if (this.lightSystem.useTeleportCharge()) {
      this.player.isTeleporting = true;
      this.player.teleportTimer = 0.3;
      this.lightSystem.spawnTeleportParticles(this.player.x, this.player.y);

      const dir = this.getMovementDirection();
      let newX = this.player.x;
      let newY = this.player.y;

      for (let i = 0; i < 3; i++) {
        const testX = newX + dir.dx * this.mazeData.cellSize;
        const testY = newY + dir.dy * this.mazeData.cellSize;

        const tcx = Math.floor(testX / this.mazeData.cellSize);
        const tcy = Math.floor(testY / this.mazeData.cellSize);
        if (tcx >= 0 && tcx < this.mazeData.cols && tcy >= 0 && tcy < this.mazeData.rows) {
          newX = testX;
          newY = testY;
        } else {
          break;
        }
      }

      this.player.x = newX;
      this.player.y = newY;
      this.lightSystem.spawnTeleportParticles(this.player.x, this.player.y);
    }
  }

  private getMovementDirection(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
    return { dx, dy };
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.globalTime += dt;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    if (!this.mazeData || !this.lightSystem) return;

    this.updatePlayer(dt);
    this.lightSystem.update(dt);
    for (const tentacle of this.tentacles) {
      tentacle.update(dt);
    }
    this.updatePlayerHalo(dt);

    if (this.lightSystem.checkCollection(this.player.x, this.player.y, this.player.radius)) {
      this.emitState();
    }

    for (const tentacle of this.tentacles) {
      if (tentacle.checkCollision(this.player.x, this.player.y, this.player.radius)) {
        this.stateCallback?.({
          score: this.lightSystem.score,
          orbCount: this.lightSystem.collectedCount,
          teleportCharges: this.lightSystem.teleportCharges,
          isGameOver: true,
          isPaused: false,
        });
      }
    }

    const mazePixelW = this.mazeData.cols * this.mazeData.cellSize;
    const mazePixelH = this.mazeData.rows * this.mazeData.cellSize;
    const targetCamX = this.player.x - this.canvas.width / 2;
    const targetCamY = this.player.y - this.canvas.height / 2;
    this.cameraX += (targetCamX - this.cameraX) * 0.08;
    this.cameraY += (targetCamY - this.cameraY) * 0.08;
    this.cameraX = Math.max(0, Math.min(mazePixelW - this.canvas.width, this.cameraX));
    this.cameraY = Math.max(0, Math.min(mazePixelH - this.canvas.height, this.cameraY));
  }

  private updatePlayer(dt: number): void {
    if (!this.mazeData) return;

    if (this.player.isTeleporting) {
      this.player.teleportTimer -= dt;
      if (this.player.teleportTimer <= 0) {
        this.player.isTeleporting = false;
      }
      return;
    }

    const dir = this.getMovementDirection();
    if (dir.dx === 0 && dir.dy === 0) return;

    const moveX = dir.dx * this.player.speed * dt;
    const moveY = dir.dy * this.player.speed * dt;

    const newX = this.player.x + moveX;
    const cellX = Math.floor(newX / this.mazeData.cellSize);
    const cellY = Math.floor(this.player.y / this.mazeData.cellSize);
    if (cellX >= 0 && cellX < this.mazeData.cols && cellY >= 0 && cellY < this.mazeData.rows) {
      const currentCellX = Math.floor(this.player.x / this.mazeData.cellSize);
      if (this.mazeGenerator.canMoveBetween(this.player.x, this.player.y, newX, this.player.y)) {
        this.player.x = newX;
      }
    }

    const newY = this.player.y + moveY;
    const cellX2 = Math.floor(this.player.x / this.mazeData.cellSize);
    const cellY2 = Math.floor(newY / this.mazeData.cellSize);
    if (cellX2 >= 0 && cellX2 < this.mazeData.cols && cellY2 >= 0 && cellY2 < this.mazeData.rows) {
      if (this.mazeGenerator.canMoveBetween(this.player.x, this.player.y, this.player.x, newY)) {
        this.player.y = newY;
      }
    }

    this.player.haloPhase += dt * 3;
  }

  private updatePlayerHalo(dt: number): void {
    if (Math.random() < 0.3 && !this.player.isTeleporting) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.player.radius + Math.random() * 4;
      this.playerHaloParticles.push({
        x: this.player.x + Math.cos(angle) * dist,
        y: this.player.y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 0.4 + Math.random() * 0.3,
        size: 1 + Math.random() * 2,
      });
    }

    for (let i = this.playerHaloParticles.length - 1; i >= 0; i--) {
      const p = this.playerHaloParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.playerHaloParticles.splice(i, 1);
      }
    }
  }

  private render(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);

    this.renderMazeWalls();
    this.renderLightPaths();
    this.renderHaloParticles();
    if (this.lightSystem) this.lightSystem.render(ctx);
    for (const tentacle of this.tentacles) tentacle.render(ctx);
    this.renderPlayer();

    ctx.restore();
  }

  private renderMazeWalls(): void {
    if (!this.mazeData) return;
    const { ctx } = this;
    const { grid, cellSize, cols, rows } = this.mazeData;

    const visibleMinX = Math.max(0, Math.floor(this.cameraX / cellSize));
    const visibleMinY = Math.max(0, Math.floor(this.cameraY / cellSize));
    const visibleMaxX = Math.min(cols, Math.ceil((this.cameraX + this.canvas.width) / cellSize) + 1);
    const visibleMaxY = Math.min(rows, Math.ceil((this.cameraY + this.canvas.height) / cellSize) + 1);

    for (let y = visibleMinY; y < visibleMaxY; y++) {
      for (let x = visibleMinX; x < visibleMaxX; x++) {
        const cell = grid[y][x];
        const cx = x * cellSize;
        const cy = y * cellSize;

        const distToPlayer = Math.sqrt(
          (cx + cellSize / 2 - this.player.x) ** 2 +
          (cy + cellSize / 2 - this.player.y) ** 2
        );
        const brightness = Math.max(0.15, Math.min(1, 1 - distToPlayer / 300));

        const wallColor = `rgba(60, 20, 120, ${brightness * 0.5})`;
        ctx.strokeStyle = wallColor;
        ctx.lineWidth = 2;

        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + cellSize, cy);
          ctx.stroke();
        }
        if (cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(cx + cellSize, cy);
          ctx.lineTo(cx + cellSize, cy + cellSize);
          ctx.stroke();
        }
        if (cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(cx, cy + cellSize);
          ctx.lineTo(cx + cellSize, cy + cellSize);
          ctx.stroke();
        }
        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx, cy + cellSize);
          ctx.stroke();
        }
      }
    }
  }

  private renderLightPaths(): void {
    if (!this.mazeData) return;
    const { ctx } = this;
    const { grid, cellSize, cols, rows } = this.mazeData;

    const visibleMinX = Math.max(0, Math.floor(this.cameraX / cellSize));
    const visibleMinY = Math.max(0, Math.floor(this.cameraY / cellSize));
    const visibleMaxX = Math.min(cols, Math.ceil((this.cameraX + this.canvas.width) / cellSize) + 1);
    const visibleMaxY = Math.min(rows, Math.ceil((this.cameraY + this.canvas.height) / cellSize) + 1);

    for (let y = visibleMinY; y < visibleMaxY; y++) {
      for (let x = visibleMinX; x < visibleMaxX; x++) {
        const cell = grid[y][x];
        const cx = x * cellSize;
        const cy = y * cellSize;

        const t = (x + y) / (cols + rows);
        const r = Math.floor(60 * (1 - t) + 0 * t);
        const g = Math.floor(20 * (1 - t) + 200 * t);
        const b = Math.floor(200 * (1 - t) + 180 * t);

        const pulse = 0.5 + 0.5 * Math.sin(this.globalTime * 2 + x * 0.5 + y * 0.3);
        const alpha = 0.15 + 0.2 * pulse;

        if (!cell.walls.right && x < cols - 1) {
          const gradient = ctx.createLinearGradient(cx + cellSize / 2, cy + cellSize / 2, cx + cellSize + cellSize / 2, cy + cellSize / 2);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          gradient.addColorStop(1, `rgba(${r * 0.5}, ${g}, ${b}, ${alpha * 0.7})`);
          ctx.beginPath();
          ctx.moveTo(cx + cellSize / 2, cy + cellSize / 2);
          ctx.lineTo(cx + cellSize + cellSize / 2, cy + cellSize / 2);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (!cell.walls.bottom && y < rows - 1) {
          const gradient = ctx.createLinearGradient(cx + cellSize / 2, cy + cellSize / 2, cx + cellSize / 2, cy + cellSize + cellSize / 2);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          gradient.addColorStop(1, `rgba(${r}, ${g * 0.5}, ${b * 0.8}, ${alpha * 0.7})`);
          ctx.beginPath();
          ctx.moveTo(cx + cellSize / 2, cy + cellSize / 2);
          ctx.lineTo(cx + cellSize / 2, cy + cellSize + cellSize / 2);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  }

  private renderHaloParticles(): void {
    const { ctx } = this;
    for (const p of this.playerHaloParticles) {
      const alpha = p.life * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 180, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private renderPlayer(): void {
    const { ctx, player } = this;

    if (player.isTeleporting) {
      const flicker = Math.sin(this.globalTime * 40) > 0 ? 0.3 : 0.8;
      ctx.globalAlpha = flicker;
    }

    const glowSize = player.radius + 14 + Math.sin(player.haloPhase) * 4;
    const outerGlow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, glowSize);
    outerGlow.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
    outerGlow.addColorStop(0.5, 'rgba(80, 140, 255, 0.1)');
    outerGlow.addColorStop(1, 'rgba(60, 100, 255, 0)');

    ctx.beginPath();
    ctx.arc(player.x, player.y, glowSize, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    const coreGradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.radius);
    coreGradient.addColorStop(0, '#FFFFFF');
    coreGradient.addColorStop(0.4, '#88CCFF');
    coreGradient.addColorStop(0.8, '#4488FF');
    coreGradient.addColorStop(1, '#2255CC');

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private emitState(): void {
    if (!this.lightSystem) return;
    this.stateCallback?.({
      score: this.lightSystem.score,
      orbCount: this.lightSystem.collectedCount,
      teleportCharges: this.lightSystem.teleportCharges,
      isGameOver: false,
      isPaused: false,
    });
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
