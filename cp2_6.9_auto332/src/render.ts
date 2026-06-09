import { Maze, CELL_PIXEL, cellToPixel } from './maze';
import { Enemy } from './enemy';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface PlayerRenderState {
  x: number;
  y: number;
  animProgress: number;
  animFromX: number;
  animFromY: number;
  animToX: number;
  animToY: number;
  shield: boolean;
}

export interface RenderData {
  maze: Maze;
  player: PlayerRenderState;
  enemies: Enemy[];
  particles: Particle[];
  beatPulse: number;
  exitBlink: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    this.ctx.fillStyle = '#0A0E1A';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(data: RenderData) {
    this.clear();
    this.drawMaze(data.maze, data.exitBlink);
    this.drawChests(data.maze);
    this.drawExitArrow(data.maze, data.exitBlink);
    this.drawEnemies(data.enemies, data.beatPulse);
    this.drawPlayer(data.player);
    this.drawParticles(data.particles);
  }

  private drawMaze(maze: Maze, _exitBlink: number) {
    const ctx = this.ctx;
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.grid[y][x];
        const px = x * CELL_PIXEL;
        const py = y * CELL_PIXEL;
        if (cell.type === 'wall') {
          ctx.fillStyle = '#6B7B8D';
          ctx.fillRect(px, py, CELL_PIXEL, CELL_PIXEL);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(px, py + CELL_PIXEL - 3, CELL_PIXEL, 3);
          ctx.fillRect(px + CELL_PIXEL - 3, py, 3, CELL_PIXEL);
        } else {
          ctx.fillStyle = '#1B2A49';
          ctx.fillRect(px, py, CELL_PIXEL, CELL_PIXEL);
          ctx.strokeStyle = 'rgba(58, 90, 122, 0.15)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, CELL_PIXEL - 1, CELL_PIXEL - 1);
        }
      }
    }
  }

  private drawChests(maze: Maze) {
    const ctx = this.ctx;
    for (const chest of maze.chests) {
      if (chest.collected) continue;
      const { px, py } = cellToPixel(chest.x, chest.y);
      const w = 22, h = 16;
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(px - w / 2, py - h / 2, w, h);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(px - w / 2 + 2, py - h / 2 + 2, w - 4, h - 6);
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(px - 3, py - 2, 6, 6);
      ctx.strokeStyle = '#6B4F00';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - w / 2, py - h / 2, w, h);
    }
  }

  private drawExitArrow(maze: Maze, blink: number) {
    const ctx = this.ctx;
    const { px, py } = cellToPixel(maze.exit.x, maze.exit.y);
    const alpha = 0.5 + 0.5 * Math.abs(Math.sin(blink * 4));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(px, py - 12);
    ctx.lineTo(px + 10, py + 8);
    ctx.lineTo(px - 10, py + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(px - 4, py + 6, 8, 6);
    ctx.restore();
  }

  private drawEnemies(enemies: Enemy[], beatPulse: number) {
    const ctx = this.ctx;
    for (const e of enemies) {
      if (e.state === 'dead') continue;
      const { px, py } = cellToPixel(e.x, e.y);
      let flash = false;
      if (e.flashTimer > 0) {
        flash = Math.floor(e.flashTimer * 20) % 2 === 0;
      }
      if (e.canCounter && Math.floor(e.counterTimer * 15) % 2 === 0) {
        flash = true;
      }
      const pulse = 1 + 0.1 * beatPulse;
      const rx = 14 * pulse;
      const ry = 10 * pulse;
      ctx.save();
      ctx.shadowColor = '#FF3333';
      ctx.shadowBlur = 15 + 10 * beatPulse;
      ctx.fillStyle = flash ? '#FFFFFF' : (e.canCounter ? '#FFD700' : '#FF3333');
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#220000';
      ctx.beginPath();
      ctx.arc(px - 4, py - 2, 2, 0, Math.PI * 2);
      ctx.arc(px + 4, py - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      if (e.state === 'attack' || e.canCounter) {
        ctx.strokeStyle = e.canCounter ? '#FFD700' : '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, rx + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawPlayer(p: PlayerRenderState) {
    const ctx = this.ctx;
    let px: number, py: number;
    if (p.animProgress >= 0 && p.animProgress < 1) {
      const t = easeOut(p.animProgress);
      const { px: fx, py: fy } = cellToPixel(p.animFromX, p.animFromY);
      const { px: tx, py: ty } = cellToPixel(p.animToX, p.animToY);
      px = fx + (tx - fx) * t;
      py = fy + (ty - fy) * t;
    } else {
      const pos = cellToPixel(p.x, p.y);
      px = pos.px;
      py = pos.py;
    }
    ctx.save();
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.moveTo(px, py - 14);
    ctx.lineTo(px + 12, py + 10);
    ctx.lineTo(px - 12, py + 10);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1B2A49';
    ctx.beginPath();
    ctx.arc(px, py + 1, 3, 0, Math.PI * 2);
    ctx.fill();
    if (p.shield) {
      ctx.strokeStyle = '#8AC8FF';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#8AC8FF';
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawParticles(particles: Particle[]) {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawReadyScreen(beatPulse: number) {
    this.clear();
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    ctx.save();
    ctx.fillStyle = '#8AC8FF';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#8AC8FF';
    ctx.shadowBlur = 20 + 10 * beatPulse;
    ctx.fillText('节奏迷窟', cx, cy - 40);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#E0E4F0';
    ctx.shadowBlur = 0;
    ctx.fillText('跟随鼓点，穿越迷窟', cx, cy + 10);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#FFD700';
    ctx.globalAlpha = 0.5 + 0.5 * beatPulse;
    ctx.fillText('按 空格键 开始游戏', cx, cy + 60);
    ctx.restore();
  }
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function spawnPickupParticles(x: number, y: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const { px, py } = cellToPixel(x, y);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 60 + Math.random() * 80;
    particles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      maxLife: 1.0,
      color: i % 2 === 0 ? '#FFD700' : '#FFA500',
      size: 3 + Math.random() * 3
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= dt;
  }
  return particles.filter(p => p.life > 0);
}
