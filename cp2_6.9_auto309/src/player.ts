import { Maze, Cell } from './maze';

type Particle = {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
};

export class Player {
  private x!: number;
  private y!: number;
  private radius: number = 12;
  private speed: number = 2.5;
  private maze: Maze;
  private cellSize!: number;
  private offsetX!: number;
  private offsetY!: number;
  private keys: Set<string> = new Set();
  private trail: Particle[] = [];
  private steps: number = 0;
  private lastGridX: number = -1;
  private lastGridY: number = -1;
  private reachedExit: boolean = false;
  private startTime: number = 0;

  constructor(maze: Maze, cellSize: number, offsetX: number, offsetY: number) {
    this.maze = maze;
    this.cellSize = cellSize;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.startTime = performance.now();
    this.reset();
    this.setupInput();
  }

  public reset(cellSize?: number, offsetX?: number, offsetY?: number): void {
    if (cellSize !== undefined) this.cellSize = cellSize;
    if (offsetX !== undefined) this.offsetX = offsetX;
    if (offsetY !== undefined) this.offsetY = offsetY;

    const start = this.maze.getStart();
    this.x = this.offsetX + (start.col * 2 + 1) * this.cellSize + this.cellSize / 2;
    this.y = this.offsetY + (start.row * 2 + 1) * this.cellSize + this.cellSize / 2;
    this.trail = [];
    this.steps = 0;
    this.reachedExit = false;
    this.startTime = performance.now();
    this.lastGridX = Math.floor((this.x - this.offsetX) / this.cellSize);
    this.lastGridY = Math.floor((this.y - this.offsetY) / this.cellSize);
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        this.keys.add(e.key);
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.key);
    });
  }

  public update(): void {
    if (this.reachedExit) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.has('ArrowUp')) dy -= this.speed;
    if (this.keys.has('ArrowDown')) dy += this.speed;
    if (this.keys.has('ArrowLeft')) dx -= this.speed;
    if (this.keys.has('ArrowRight')) dx += this.speed;

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2);
      dx *= factor;
      dy *= factor;
    }

    if (dx !== 0) {
      this.moveX(dx);
    }
    if (dy !== 0) {
      this.moveY(dy);
    }

    const currentGridX = Math.floor((this.x - this.offsetX) / this.cellSize);
    const currentGridY = Math.floor((this.y - this.offsetY) / this.cellSize);
    if (currentGridX !== this.lastGridX || currentGridY !== this.lastGridY) {
      this.steps++;
      this.lastGridX = currentGridX;
      this.lastGridY = currentGridY;
    }

    this.addTrailParticle();
    this.updateTrail();
    this.checkExit();
  }

  private moveX(dx: number): void {
    const newX = this.x + dx;

    if (this.canMove(newX, this.y)) {
      this.x = newX;
    } else {
      const step = dx > 0 ? -0.5 : 0.5;
      let testX = newX;
      while (!this.canMove(testX, this.y)) {
        testX += step;
        if (Math.abs(testX - newX) > this.speed) break;
      }
      if (this.canMove(testX, this.y)) {
        this.x = testX;
      }
    }
  }

  private moveY(dy: number): void {
    const newY = this.y + dy;

    if (this.canMove(this.x, newY)) {
      this.y = newY;
    } else {
      const step = dy > 0 ? -0.5 : 0.5;
      let testY = newY;
      while (!this.canMove(this.x, testY)) {
        testY += step;
        if (Math.abs(testY - newY) > this.speed) break;
      }
      if (this.canMove(this.x, testY)) {
        this.y = testY;
      }
    }
  }

  private canMove(px: number, py: number): boolean {
    const grid = this.maze.getGrid();
    const directions = [
      { dx: -this.radius, dy: -this.radius },
      { dx: this.radius, dy: -this.radius },
      { dx: -this.radius, dy: this.radius },
      { dx: this.radius, dy: this.radius },
      { dx: 0, dy: -this.radius },
      { dx: 0, dy: this.radius },
      { dx: -this.radius, dy: 0 },
      { dx: this.radius, dy: 0 },
    ];

    for (const dir of directions) {
      const checkX = px + dir.dx;
      const checkY = py + dir.dy;

      const col = Math.floor((checkX - this.offsetX) / this.cellSize);
      const row = Math.floor((checkY - this.offsetY) / this.cellSize);

      if (this.maze.isWall(row, col)) {
        const wallLeft = this.offsetX + col * this.cellSize;
        const wallRight = wallLeft + this.cellSize;
        const wallTop = this.offsetY + row * this.cellSize;
        const wallBottom = wallTop + this.cellSize;

        const closestX = Math.max(wallLeft, Math.min(px, wallRight));
        const closestY = Math.max(wallTop, Math.min(py, wallBottom));

        const distX = px - closestX;
        const distY = py - closestY;
        const distSq = distX * distX + distY * distY;

        if (distSq < this.radius * this.radius) {
          return false;
        }
      }
    }

    return true;
  }

  private addTrailParticle(): void {
    this.trail.push({
      x: this.x,
      y: this.y,
      radius: 2 + Math.random() * 2,
      life: 80,
      maxLife: 80,
    });
  }

  private updateTrail(): void {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life--;
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1);
      }
    }
  }

  private checkExit(): void {
    const exit = this.maze.getExit();
    const exitX = this.offsetX + (exit.col * 2 + 1) * this.cellSize + this.cellSize / 2;
    const exitY = this.offsetY + (exit.row * 2 + 1) * this.cellSize + this.cellSize / 2;

    const dist = Math.sqrt((this.x - exitX) ** 2 + (this.y - exitY) ** 2);
    if (dist < this.cellSize * 0.5) {
      this.reachedExit = true;
    }
  }

  public hasReachedExit(): boolean {
    return this.reachedExit;
  }

  public getSteps(): number {
    return this.steps;
  }

  public getElapsedSeconds(): number {
    return Math.floor((performance.now() - this.startTime) / 1000);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawTrail(ctx);

    ctx.save();
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 3);
    gradient.addColorStop(0, 'rgba(0, 255, 204, 0.6)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 204, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 255, 204, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#00FFCC';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#00FFCC';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const alpha = p.life / p.maxLife;
      const colorProgress = 1 - alpha;

      const r = Math.floor(0 + (0 - 0) * colorProgress);
      const g = Math.floor(255 + (168 - 255) * colorProgress);
      const b = Math.floor(204 + (255 - 204) * colorProgress);

      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public setLayout(cellSize: number, offsetX: number, offsetY: number): void {
    const ratioX = (this.x - this.offsetX) / (this.cellSize || 1);
    const ratioY = (this.y - this.offsetY) / (this.cellSize || 1);
    this.cellSize = cellSize;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.x = this.offsetX + ratioX * this.cellSize;
    this.y = this.offsetY + ratioY * this.cellSize;
  }
}
