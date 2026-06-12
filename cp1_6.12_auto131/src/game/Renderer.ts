import { GameState, BubbleColor, BUBBLE_RADIUS, ROWS, COLS, HEX_ROW_HEIGHT } from './GameEngine';

const COLOR_MAP: Record<BubbleColor, { fill: string; glow: string }> = {
  red: { fill: '#ff4466', glow: '#ff446688' },
  blue: { fill: '#4488ff', glow: '#4488ff88' },
  green: { fill: '#44dd66', glow: '#44dd6688' },
  yellow: { fill: '#ffcc22', glow: '#ffcc2288' },
  purple: { fill: '#aa44ff', glow: '#aa44ff88' },
  orange: { fill: '#ff8822', glow: '#ff882288' },
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fps: number = 60;
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private scale: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  getFPS(): number {
    return this.fps;
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  clear(): void {
    const { width, height } = this.canvas;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.restore();
  }

  drawBackground(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0b0b1a');
    gradient.addColorStop(1, '#1a1a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    this.drawStars();
  }

  private drawStars(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = Date.now() * 0.001;

    ctx.save();
    for (let i = 0; i < 60; i++) {
      const seed = i * 137.508;
      const x = ((seed * 7.31) % w);
      const y = ((seed * 3.97) % h);
      const alpha = 0.3 + 0.3 * Math.sin(time + seed);
      const size = 0.5 + (seed % 1.5);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBubble(x: number, y: number, color: BubbleColor, radius: number = BUBBLE_RADIUS): void {
    const ctx = this.ctx;
    const c = COLOR_MAP[color];

    ctx.save();

    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = c.fill;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = c.glow;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const hlX = x - radius * 0.3;
    const hlY = y - radius * 0.3;
    ctx.beginPath();
    ctx.arc(hlX, hlY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    ctx.restore();
  }

  drawGrid(state: GameState): void {
    for (let r = 0; r < ROWS; r++) {
      const cc = r % 2 === 0 ? COLS : COLS - 1;
      for (let c = 0; c < cc; c++) {
        const bubble = state.grid[r]?.[c];
        if (bubble) {
          this.drawBubble(bubble.x, bubble.y, bubble.color);
        }
      }
    }
  }

  drawLauncher(state: GameState): void {
    const ctx = this.ctx;
    const launcherX = (COLS * BUBBLE_RADIUS * 2) / 2;
    const launcherY = ROWS * HEX_ROW_HEIGHT + BUBBLE_RADIUS;
    const angleRad = (state.launcherAngle * Math.PI) / 180;

    ctx.save();
    ctx.translate(launcherX, launcherY);

    ctx.beginPath();
    ctx.arc(0, 0, BUBBLE_RADIUS * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.drawBubble(0, 0, state.projectileColor, BUBBLE_RADIUS);

    ctx.rotate(angleRad);
    ctx.beginPath();
    ctx.moveTo(0, -BUBBLE_RADIUS * 1.5);
    ctx.lineTo(-8, -BUBBLE_RADIUS * 0.5);
    ctx.lineTo(8, -BUBBLE_RADIUS * 0.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();

    ctx.restore();
  }

  drawAimLine(state: GameState, points: { x: number; y: number }[]): void {
    if (!state.aimLineVisible || points.length < 2) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawProjectile(state: GameState): void {
    if (!state.shooting) return;
    this.drawBubble(state.projectileX, state.projectileY, state.projectileColor);
  }

  drawNextBubble(state: GameState): void {
    const ctx = this.ctx;
    const gridWidth = COLS * BUBBLE_RADIUS * 2;
    const x = gridWidth - BUBBLE_RADIUS * 2;
    const y = ROWS * HEX_ROW_HEIGHT + BUBBLE_RADIUS;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', x, y - BUBBLE_RADIUS - 4);
    ctx.restore();

    this.drawBubble(x, y, state.nextBubbleColor, BUBBLE_RADIUS * 0.7);
  }

  drawFPS(): void {
    const ctx = this.ctx;
    this.updateFPS();
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.fps} FPS`, this.canvas.width - 10, 20);
    ctx.restore();
  }

  drawReplayOverlay(timestamp: number, totalDuration: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const boxW = 180;
    const boxH = 40;
    const boxX = this.canvas.width - boxW - 16;
    const boxY = this.canvas.height - boxH - 16;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    const ts = (timestamp / 1000).toFixed(1);
    const td = (totalDuration / 1000).toFixed(1);
    ctx.fillText(`${ts}s / ${td}s`, boxX + boxW / 2, boxY + boxH / 2 + 4);
    ctx.restore();
  }

  render(state: GameState, aimPoints: { x: number; y: number }[]): void {
    this.clear();
    this.drawBackground();
    this.drawGrid(state);
    this.drawProjectile(state);
    this.drawLauncher(state);
    this.drawAimLine(state, aimPoints);
    this.drawNextBubble(state);
    this.drawFPS();
  }
}
