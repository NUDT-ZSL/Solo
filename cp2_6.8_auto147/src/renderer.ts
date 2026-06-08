import {
  Game,
  getSegmentColor,
  getHslGradient,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  SEGMENT_RADIUS
} from './game';

const BG_COLOR = '#1A0A2E';
const GRID_COLOR = '#2D4A5A';
const GRID_ALPHA = 0.15;

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(_canvas: HTMLCanvasElement) {
    const ctx = _canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
  }

  render(game: Game, now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBackground();
    this.drawGrid();
    this.drawFood(game, now);
    this.drawObstacles(game);
    this.drawTrails(game);
    this.drawSnake(game);
    this.drawParticles(game);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7
    );
    gradient.addColorStop(0, 'rgba(78, 205, 196, 0.03)');
    gradient.addColorStop(0.5, 'rgba(255, 107, 107, 0.02)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.globalAlpha = GRID_ALPHA;
    ctx.lineWidth = 1;

    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawFood(game: Game, now: number): void {
    if (!game.food) return;
    const ctx = this.ctx;
    const { x, y } = game.food.position;
    const pulse = 0.8 + Math.sin(now / 200) * 0.2;
    const radius = 10 * pulse;

    ctx.save();
    ctx.shadowColor = '#FFD93D';
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, '#FFD93D');
    gradient.addColorStop(1, 'rgba(255, 217, 61, 0.3)');

    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 - Math.PI / 4;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  private drawObstacles(game: Game): void {
    const ctx = this.ctx;
    for (const obs of game.obstacles) {
      const { x, y } = obs.position;
      const half = obs.size / 2;

      ctx.save();
      ctx.globalAlpha = obs.opacity;

      ctx.shadowColor = '#FF8C42';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#FF8C42';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - half, y - half, obs.size, obs.size);

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 107, 53, 0.35)';
      ctx.fillRect(x - half, y - half, obs.size, obs.size);

      ctx.fillStyle = 'rgba(255, 140, 66, 0.8)';
      ctx.fillRect(x - 4, y - 4, 8, 8);

      ctx.restore();
    }
  }

  private drawTrails(game: Game): void {
    const ctx = this.ctx;
    for (const trail of game.trails) {
      const alpha = trail.life / trail.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.shadowColor = trail.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = trail.color;
      ctx.beginPath();
      ctx.arc(trail.position.x, trail.position.y, SEGMENT_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSnake(game: Game): void {
    const ctx = this.ctx;
    const len = game.snake.length;
    if (len === 0) return;

    const opacity = game.gameState === 'gameover' ? 1 : (game.isBlinking ? game.blinkOpacity : 1);

    if (len > 1) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.lineWidth = SEGMENT_RADIUS * 1.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < len - 1; i++) {
        if (game.gameState === 'gameover' && i <= game.shatterIndex) continue;

        const from = game.snake[i].position;
        const to = game.snake[i + 1].position;
        const color = getHslGradient(i, len);

        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = 0; i < len; i++) {
      if (game.gameState === 'gameover' && i <= game.shatterIndex) continue;

      const seg = game.snake[i];
      const color = getSegmentColor(i, len);
      const hslColor = getHslGradient(i, len);

      ctx.save();
      ctx.globalAlpha = opacity;

      ctx.shadowColor = hslColor;
      ctx.shadowBlur = 12;

      const gradient = ctx.createRadialGradient(
        seg.position.x, seg.position.y, 0,
        seg.position.x, seg.position.y, SEGMENT_RADIUS
      );
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.4, color);
      gradient.addColorStop(1, color);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(seg.position.x, seg.position.y, SEGMENT_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      if (i === 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1A0A2E';
        let ex1 = 0, ey1 = 0, ex2 = 0, ey2 = 0;
        const eyeOffset = 3;
        switch (game.direction) {
          case 'right':
            ex1 = seg.position.x + eyeOffset; ey1 = seg.position.y - 3;
            ex2 = seg.position.x + eyeOffset; ey2 = seg.position.y + 3;
            break;
          case 'left':
            ex1 = seg.position.x - eyeOffset; ey1 = seg.position.y - 3;
            ex2 = seg.position.x - eyeOffset; ey2 = seg.position.y + 3;
            break;
          case 'up':
            ex1 = seg.position.x - 3; ey1 = seg.position.y - eyeOffset;
            ex2 = seg.position.x + 3; ey2 = seg.position.y - eyeOffset;
            break;
          case 'down':
            ex1 = seg.position.x - 3; ey1 = seg.position.y + eyeOffset;
            ex2 = seg.position.x + 3; ey2 = seg.position.y + eyeOffset;
            break;
        }
        ctx.beginPath();
        ctx.arc(ex1, ey1, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawParticles(game: Game): void {
    const ctx = this.ctx;
    for (const p of game.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
