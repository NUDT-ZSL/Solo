import { LightBall, Point } from './LightBall';
import { MirrorManager } from './MirrorManager';

export interface GameState {
  energy: number;
  level: number;
  mazeSize: number;
  message: string;
  isGameOver: boolean;
  isWin: boolean;
  isFlashRed: boolean;
  isEdgeGlow: boolean;
  ballX: number;
  ballY: number;
  exitX: number;
  exitY: number;
  maze: number[][];
  isBallMoving: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private maze: number[][];
  private level: number;
  private mazeSize: number;
  private cellSize: number;
  private offsetX: number;
  private offsetY: number;
  private gridRows: number;
  private gridCols: number;

  private lightBall: LightBall;
  private mirrorManager: MirrorManager;

  private exitGridRow: number;
  private exitGridCol: number;
  private exitPixelX: number;
  private exitPixelY: number;

  private isDragging: boolean;
  private dragStartX: number;
  private dragStartY: number;
  private dragCurrentX: number;
  private dragCurrentY: number;

  private lastTime: number;
  private animFrameId: number;
  private running: boolean;
  private gameTime: number;

  private wallBounceCount: number;
  private particles: Particle[];

  private audioCtx: AudioContext | null;
  private lastCollisionSoundTime: number;

  private onStateChange: (state: GameState) => void;

  private flashRedTimer: number;
  private edgeGlowTimer: number;
  private exitHovered: boolean;

  private vortexAngle: number;
  private glowPhase: number;

  private mazeDirty: boolean;
  private noiseData: ImageData | null;

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.maze = [];
    this.level = 1;
    this.mazeSize = 5;
    this.cellSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.gridRows = 0;
    this.gridCols = 0;

    this.lightBall = new LightBall(0, 0, 8);
    this.mirrorManager = new MirrorManager();

    this.exitGridRow = 0;
    this.exitGridCol = 0;
    this.exitPixelX = 0;
    this.exitPixelY = 0;

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragCurrentX = 0;
    this.dragCurrentY = 0;

    this.lastTime = 0;
    this.animFrameId = 0;
    this.running = false;
    this.gameTime = 0;

    this.wallBounceCount = 0;
    this.particles = [];

    this.audioCtx = null;
    this.lastCollisionSoundTime = 0;

    this.onStateChange = onStateChange;

    this.flashRedTimer = 0;
    this.edgeGlowTimer = 0;
    this.exitHovered = false;

    this.vortexAngle = 0;
    this.glowPhase = 0;

    this.mazeDirty = true;
    this.noiseData = null;

    this.resize();
    this.generateMaze(this.mazeSize);
    this.setupInput();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx.scale(dpr, dpr);

    this.calculateLayout();
    this.mazeDirty = true;
  }

  private calculateLayout(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const gridSize = 2 * this.mazeSize + 1;
    this.gridRows = gridSize;
    this.gridCols = gridSize;

    const maxCellW = (w * 0.85) / gridSize;
    const maxCellH = (h * 0.85) / gridSize;
    this.cellSize = Math.floor(Math.min(maxCellW, maxCellH));

    const mazeW = this.cellSize * gridSize;
    const mazeH = this.cellSize * gridSize;
    this.offsetX = (w - mazeW) / 2;
    this.offsetY = (h - mazeH) / 2;
  }

  generateMaze(size: number): void {
    this.mazeSize = size;
    this.calculateLayout();

    const gridSize = 2 * size + 1;
    this.gridRows = gridSize;
    this.gridCols = gridSize;

    const grid: number[][] = [];
    for (let r = 0; r < gridSize; r++) {
      grid[r] = [];
      for (let c = 0; c < gridSize; c++) {
        grid[r][c] = 1;
      }
    }

    const visited: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      visited[r] = [];
      for (let c = 0; c < size; c++) {
        visited[r][c] = false;
      }
    }

    const stack: [number, number][] = [];
    const startR = 0;
    const startC = 0;
    visited[startR][startC] = true;
    grid[1][1] = 0;
    stack.push([startR, startC]);

    const dirs: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];
      const neighbors: [number, number][] = [];

      for (const [dr, dc] of dirs) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
          neighbors.push([nr, nc]);
        }
      }

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const [nr, nc] = neighbors[Math.floor(Math.random() * neighbors.length)];
        visited[nr][nc] = true;
        const wallR = 1 + cr * 2 + (nr - cr);
        const wallC = 1 + cc * 2 + (nc - cc);
        grid[wallR][wallC] = 0;
        grid[1 + nr * 2][1 + nc * 2] = 0;
        stack.push([nr, nc]);
      }
    }

    this.maze = grid;

    const deadEnds: [number, number, number][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r === 0 && c === 0) continue;
        const gr = 1 + r * 2;
        const gc = 1 + c * 2;
        let wallCount = 0;
        if (grid[gr - 1][gc] === 1) wallCount++;
        if (grid[gr + 1][gc] === 1) wallCount++;
        if (grid[gr][gc - 1] === 1) wallCount++;
        if (grid[gr][gc + 1] === 1) wallCount++;
        if (wallCount === 3) {
          const dist = r + c;
          deadEnds.push([r, c, dist]);
        }
      }
    }

    deadEnds.sort((a, b) => b[2] - a[2]);
    const exit = deadEnds.length > 0 ? deadEnds[0] : [size - 1, size - 1, 0];
    this.exitGridRow = 1 + exit[0] * 2;
    this.exitGridCol = 1 + exit[1] * 2;

    this.exitPixelX = this.offsetX + this.exitGridCol * this.cellSize + this.cellSize / 2;
    this.exitPixelY = this.offsetY + this.exitGridRow * this.cellSize + this.cellSize / 2;

    const startPixelX = this.offsetX + 1 * this.cellSize + this.cellSize / 2;
    const startPixelY = this.offsetY + 1 * this.cellSize + this.cellSize / 2;

    this.lightBall = new LightBall(startPixelX, startPixelY, Math.max(4, this.cellSize * 0.15));
    this.mirrorManager.clear();
    this.wallBounceCount = 0;
    this.particles = [];
    this.gameTime = 0;
    this.flashRedTimer = 0;
    this.edgeGlowTimer = 0;
    this.isDragging = false;
    this.mazeDirty = true;
    this.noiseData = null;

    this.generateNoiseTexture();
    this.cacheMazeToOffscreen();
    this.emitState();
  }

  private generateNoiseTexture(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    const imgData = tempCtx.createImageData(w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 30;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 15;
    }

    tempCtx.putImageData(imgData, 0, 0);
    this.noiseData = imgData;
  }

  private cacheMazeToOffscreen(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.offscreenCtx.clearRect(0, 0, w, h);

    const gradient = this.offscreenCtx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#0f0a24');
    gradient.addColorStop(1, '#1a0a2e');
    this.offscreenCtx.fillStyle = gradient;
    this.offscreenCtx.fillRect(0, 0, w, h);

    if (this.noiseData) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.noiseData.width;
      tempCanvas.height = this.noiseData.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(this.noiseData, 0, 0);
      this.offscreenCtx.drawImage(tempCanvas, 0, 0);
    }

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        if (this.maze[r][c] === 1) {
          const x = this.offsetX + c * this.cellSize;
          const y = this.offsetY + r * this.cellSize;

          this.offscreenCtx.fillStyle = 'rgba(30, 40, 80, 0.7)';
          this.offscreenCtx.fillRect(x, y, this.cellSize, this.cellSize);

          this.offscreenCtx.shadowColor = '#4a6cf7';
          this.offscreenCtx.shadowBlur = 6;
          this.offscreenCtx.strokeStyle = 'rgba(74, 108, 247, 0.3)';
          this.offscreenCtx.lineWidth = 1;
          this.offscreenCtx.strokeRect(x + 0.5, y + 0.5, this.cellSize - 1, this.cellSize - 1);
          this.offscreenCtx.shadowBlur = 0;
        }
      }
    }

    this.mazeDirty = false;
  }

  private setupInput(): void {
    const getPos = (e: MouseEvent | Touch): Point => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onStart = (pos: Point) => {
      if (this.lightBall.isMoving) return;
      const dx = pos.x - this.lightBall.x;
      const dy = pos.y - this.lightBall.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.lightBall.radius * 4) {
        this.isDragging = true;
        this.dragStartX = pos.x;
        this.dragStartY = pos.y;
        this.dragCurrentX = pos.x;
        this.dragCurrentY = pos.y;
      }
    };

    const onMove = (pos: Point) => {
      if (!this.isDragging) return;
      this.dragCurrentX = pos.x;
      this.dragCurrentY = pos.y;
    };

    const onEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;

      const dx = this.dragStartX - this.dragCurrentX;
      const dy = this.dragStartY - this.dragCurrentY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        const force = Math.min(dist * 3, 600);
        this.lightBall.launch(dx, dy, force);
        this.wallBounceCount = 0;
      }
    };

    this.canvas.addEventListener('mousedown', (e) => onStart(getPos(e)));
    this.canvas.addEventListener('mousemove', (e) => onMove(getPos(e)));
    this.canvas.addEventListener('mouseup', () => onEnd());
    this.canvas.addEventListener('mouseleave', () => {
      if (this.isDragging) onEnd();
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) onStart(getPos(e.touches[0]));
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) onMove(getPos(e.touches[0]));
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      onEnd();
    }, { passive: false });

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getPos(e);
      const dx = pos.x - this.exitPixelX;
      const dy = pos.y - this.exitPixelY;
      this.exitHovered = Math.sqrt(dx * dx + dy * dy) < this.cellSize;
    });
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.gameTime += dt * 1000;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.onStateChange.toString().length < 0) return;

    this.lightBall.update(dt);

    if (this.lightBall.isMoving) {
      this.mirrorManager.recordPosition(this.lightBall.x, this.lightBall.y, this.gameTime);
      this.checkWallCollision();
      this.checkExitReached();
    }

    this.mirrorManager.trySpawnPhantom(this.lightBall.x, this.lightBall.y, this.gameTime);
    this.mirrorManager.update(dt, this.gameTime);

    if (this.lightBall.isMoving && this.mirrorManager.checkCollisionWith(this.lightBall.x, this.lightBall.y, this.lightBall.radius)) {
      this.lightBall.drainEnergy(15);
      this.flashRedTimer = 0.5;
      this.edgeGlowTimer = 0.8;
      this.playCollisionSound(400, 0.15);
      this.spawnParticles(this.lightBall.x, this.lightBall.y, 10, '#a855f7');

      if (this.lightBall.energy <= 0) {
        this.lightBall.stop();
        this.emitState();
        return;
      }
    }

    this.updateParticles(dt);
    if (this.flashRedTimer > 0) this.flashRedTimer -= dt;
    if (this.edgeGlowTimer > 0) this.edgeGlowTimer -= dt;

    this.vortexAngle += dt * 2;
    this.glowPhase += dt * 3;

    this.emitState();
  }

  private checkWallCollision(): void {
    const ball = this.lightBall;
    const r = ball.radius;

    const getGridCell = (px: number, py: number): [number, number] => {
      const gc = Math.floor((px - this.offsetX) / this.cellSize);
      const gr = Math.floor((py - this.offsetY) / this.cellSize);
      return [gr, gc];
    };

    const isWall = (gr: number, gc: number): boolean => {
      if (gr < 0 || gr >= this.gridRows || gc < 0 || gc >= this.gridCols) return true;
      return this.maze[gr][gc] === 1;
    };

    const prevX = ball.x - ball.vx * (1 / 60);
    const prevY = ball.y - ball.vy * (1 / 60);

    const cellX = (px: number) => this.offsetX + Math.floor((px - this.offsetX) / this.cellSize) * this.cellSize;
    const cellY = (py: number) => this.offsetY + Math.floor((py - this.offsetY) / this.cellSize) * this.cellSize;

    const [gr, gc] = getGridCell(ball.x, ball.y);
    if (isWall(gr, gc)) {
      const [pgr, pgc] = getGridCell(prevX, prevY);

      const hitX = pgc !== gc;
      const hitY = pgr !== gr;

      if (hitX && !hitY) {
        ball.x = prevX;
        ball.reflect('x', this.wallBounceCount);
      } else if (hitY && !hitX) {
        ball.y = prevY;
        ball.reflect('y', this.wallBounceCount);
      } else {
        ball.x = prevX;
        ball.y = prevY;
        ball.reflect('x', this.wallBounceCount);
      }

      this.wallBounceCount++;
      this.playCollisionSound(800 + Math.random() * 200, 0.08);
      this.spawnParticles(ball.x, ball.y, 5, '#4a6cf7');
    }

    const checkPoints: [number, number][] = [
      [ball.x - r, ball.y],
      [ball.x + r, ball.y],
      [ball.x, ball.y - r],
      [ball.x, ball.y + r],
    ];

    for (const [px, py] of checkPoints) {
      const [cgr, cgc] = getGridCell(px, py);
      if (isWall(cgr, cgc)) {
        const cx = cellX(px);
        const cy = cellY(py);

        if (px === ball.x - r || px === ball.x + r) {
          if (ball.vx !== 0) {
            ball.x = px === ball.x - r
              ? cx + this.cellSize + r + 0.5
              : cx - r - 0.5;
            ball.reflect('x', this.wallBounceCount);
            this.wallBounceCount++;
            this.playCollisionSound(800 + Math.random() * 200, 0.08);
            this.spawnParticles(ball.x, ball.y, 5, '#4a6cf7');
          }
        }
        if (py === ball.y - r || py === ball.y + r) {
          if (ball.vy !== 0) {
            ball.y = py === ball.y - r
              ? cy + this.cellSize + r + 0.5
              : cy - r - 0.5;
            ball.reflect('y', this.wallBounceCount);
            this.wallBounceCount++;
            this.playCollisionSound(800 + Math.random() * 200, 0.08);
            this.spawnParticles(ball.x, ball.y, 5, '#4a6cf7');
          }
        }
        break;
      }
    }
  }

  private checkExitReached(): void {
    const dx = this.lightBall.x - this.exitPixelX;
    const dy = this.lightBall.y - this.exitPixelY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.cellSize * 0.6) {
      this.lightBall.stop();
      this.spawnParticles(this.exitPixelX, this.exitPixelY, 30, '#ffeaa7');
      this.playCollisionSound(600, 0.2);
      this.playCollisionSound(900, 0.15);

      if (this.level < 5) {
        this.level++;
        this.mazeSize = 5 + this.level - 1;
        this.generateMaze(this.mazeSize);
      } else {
        this.emitState();
      }
    }
  }

  private playCollisionSound(freq: number, duration: number): void {
    if (this.gameTime - this.lastCollisionSoundTime < 50) return;
    this.lastCollisionSoundTime = this.gameTime;

    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.audioCtx.currentTime + 0.02);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Audio not available
    }
  }

  private spawnParticles(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 1 + Math.random() * 3,
        color,
      });
    }
    if (this.particles.length > 200) {
      this.particles = this.particles.slice(-200);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    if (this.mazeDirty) {
      this.cacheMazeToOffscreen();
    }

    const dpr = window.devicePixelRatio || 1;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    this.ctx.restore();

    this.renderExit();
    this.renderPhantoms();
    this.renderTrail();
    this.renderParticles();
    this.renderLightBall();
    this.renderDragIndicator();
    this.renderEdgeGlow(w, h);
  }

  private renderExit(): void {
    const ctx = this.ctx;
    const cx = this.exitPixelX;
    const cy = this.exitPixelY;
    const baseR = this.cellSize * 0.35;

    ctx.save();

    for (let i = 3; i >= 0; i--) {
      const r = baseR + i * 3;
      const alpha = 0.15 + 0.1 * Math.sin(this.glowPhase + i * 0.5);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, `rgba(255, 234, 167, ${alpha})`);
      gradient.addColorStop(0.6, `rgba(255, 200, 100, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 234, 167, 0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const angle = this.vortexAngle + (i * Math.PI * 2) / 3;
      const spiralR = baseR * 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, spiralR, angle, angle + Math.PI * 0.8);
      ctx.stroke();
    }

    if (this.exitHovered) {
      const arrowAlpha = 0.5 + 0.5 * Math.sin(this.glowPhase * 2);
      ctx.fillStyle = `rgba(255, 234, 167, ${arrowAlpha})`;
      ctx.font = `${this.cellSize * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('▼', cx, cy - baseR - 5);
    }

    ctx.restore();
  }

  private renderPhantoms(): void {
    const ctx = this.ctx;

    for (const phantom of this.mirrorManager.phantoms) {
      ctx.save();
      const r = this.lightBall.radius * phantom.scale * 1.3;

      const gradient = ctx.createRadialGradient(phantom.x, phantom.y, 0, phantom.x, phantom.y, r * 2.5);
      gradient.addColorStop(0, `rgba(168, 85, 247, ${phantom.opacity})`);
      gradient.addColorStop(0.5, `rgba(168, 85, 247, ${phantom.opacity * 0.3})`);
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(phantom.x, phantom.y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(168, 85, 247, ${phantom.opacity + 0.1})`;
      ctx.beginPath();
      ctx.arc(phantom.x, phantom.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(200, 150, 255, ${phantom.opacity * 0.5})`;
      ctx.beginPath();
      ctx.arc(phantom.x, phantom.y, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderTrail(): void {
    const ctx = this.ctx;
    const trail = this.lightBall.trail;

    if (trail.length < 2) return;

    for (let i = 1; i < trail.length; i++) {
      const t = i / trail.length;
      const alpha = t * 0.4;
      const size = this.lightBall.radius * t * 0.6;

      ctx.fillStyle = `rgba(255, 234, 167, ${alpha})`;
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderLightBall(): void {
    const ctx = this.ctx;
    const ball = this.lightBall;
    const breathe = 1 + 0.08 * Math.sin(this.glowPhase * 1.5);
    const r = ball.radius * breathe;

    ctx.save();

    const glowR = r * 4;
    const glowGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, glowR);
    glowGradient.addColorStop(0, 'rgba(255, 234, 167, 0.25)');
    glowGradient.addColorStop(0.3, 'rgba(255, 234, 167, 0.08)');
    glowGradient.addColorStop(1, 'rgba(255, 234, 167, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    const ballGradient = ctx.createRadialGradient(ball.x - r * 0.3, ball.y - r * 0.3, 0, ball.x, ball.y, r);
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(0.4, '#ffeaa7');
    ballGradient.addColorStop(1, '#f0c060');
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderDragIndicator(): void {
    if (!this.isDragging) return;

    const ctx = this.ctx;
    const ball = this.lightBall;

    const dx = this.dragStartX - this.dragCurrentX;
    const dy = this.dragStartY - this.dragCurrentY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) return;

    const dirX = dx / dist;
    const dirY = dy / dist;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 234, 167, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(ball.x + dirX * dist * 0.8, ball.y + dirY * dist * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);

    const arrowX = ball.x + dirX * dist * 0.8;
    const arrowY = ball.y + dirY * dist * 0.8;
    const arrowSize = 8;
    const angle = Math.atan2(dirY, dirX);
    ctx.fillStyle = 'rgba(255, 234, 167, 0.6)';
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - arrowSize * Math.cos(angle - 0.4), arrowY - arrowSize * Math.sin(angle - 0.4));
    ctx.lineTo(arrowX - arrowSize * Math.cos(angle + 0.4), arrowY - arrowSize * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderEdgeGlow(w: number, h: number): void {
    if (this.edgeGlowTimer <= 0) return;

    const ctx = this.ctx;
    const alpha = Math.min(1, this.edgeGlowTimer / 0.4) * 0.3;

    const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0)');
    gradient.addColorStop(1, `rgba(168, 85, 247, ${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  nextLevel(): void {
    this.level++;
    this.mazeSize = Math.min(9, 5 + this.level - 1);
    this.generateMaze(this.mazeSize);
  }

  restart(): void {
    this.level = 1;
    this.mazeSize = 5;
    this.generateMaze(this.mazeSize);
  }

  private emitState(): void {
    this.onStateChange({
      energy: this.lightBall.energy,
      level: this.level,
      mazeSize: this.mazeSize,
      message: this.lightBall.energy <= 0 ? '能量耗尽！游戏结束' : '',
      isGameOver: this.lightBall.energy <= 0,
      isWin: this.level > 5,
      isFlashRed: this.flashRedTimer > 0,
      isEdgeGlow: this.edgeGlowTimer > 0,
      ballX: this.lightBall.x,
      ballY: this.lightBall.y,
      exitX: this.exitPixelX,
      exitY: this.exitPixelY,
      maze: this.maze,
      isBallMoving: this.lightBall.isMoving,
    });
  }

  getMazeData(): { maze: number[][]; gridRows: number; gridCols: number; exitRow: number; exitCol: number; ballGridRow: number; ballGridCol: number } {
    const ballGr = Math.floor((this.lightBall.y - this.offsetY) / this.cellSize);
    const ballGc = Math.floor((this.lightBall.x - this.offsetX) / this.cellSize);
    return {
      maze: this.maze,
      gridRows: this.gridRows,
      gridCols: this.gridCols,
      exitRow: this.exitGridRow,
      exitCol: this.exitGridCol,
      ballGridRow: ballGr,
      ballGridCol: ballGc,
    };
  }

  destroy(): void {
    this.stop();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
