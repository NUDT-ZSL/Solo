import { GameState, BubbleColor, BUBBLE_RADIUS, ROWS, COLS, HEX_VERT_SPACING, HEX_HORIZ_SPACING } from './GameEngine';

const COLOR_MAP: Record<BubbleColor, { fill: string; glow: string; border: string }> = {
  red: { fill: '#ff4466', glow: 'rgba(255, 68, 102, 0.55)', border: 'rgba(255, 120, 140, 0.85)' },
  blue: { fill: '#4488ff', glow: 'rgba(68, 136, 255, 0.55)', border: 'rgba(120, 170, 255, 0.85)' },
  green: { fill: '#44dd66', glow: 'rgba(68, 221, 102, 0.55)', border: 'rgba(120, 240, 140, 0.85)' },
  yellow: { fill: '#ffcc22', glow: 'rgba(255, 204, 34, 0.55)', border: 'rgba(255, 220, 100, 0.85)' },
  purple: { fill: '#aa44ff', glow: 'rgba(170, 68, 255, 0.55)', border: 'rgba(190, 120, 255, 0.85)' },
  orange: { fill: '#ff8822', glow: 'rgba(255, 136, 34, 0.55)', border: 'rgba(255, 160, 80, 0.85)' },
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
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  getFPS(): number {
    return this.fps;
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  getScale(): number {
    return this.scale;
  }

  tickFPS(): void {
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

    const time = Date.now() * 0.001;
    ctx.save();
    for (let i = 0; i < 80; i++) {
      const seed = i * 137.508;
      const x = ((seed * 7.31) % w);
      const y = ((seed * 3.97) % h);
      const alpha = 0.3 + 0.3 * Math.sin(time + seed * 0.1);
      const size = 0.5 + ((seed * 7) % 1.5);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
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
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = c.fill;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const hlX = x - radius * 0.35;
    const hlY = y - radius * 0.35;
    ctx.beginPath();
    ctx.arc(hlX, hlY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    ctx.restore();
  }

  drawGrid(state: GameState): void {
    const r = BUBBLE_RADIUS * state.modifiers.sizeMultiplier;
    for (let row = 0; row < ROWS; row++) {
      const cc = row % 2 === 0 ? COLS : COLS - 1;
      for (let col = 0; col < cc; col++) {
        const bubble = state.grid[row]?.[col];
        if (bubble) {
          this.drawBubble(bubble.x, bubble.y, bubble.color, r);
        }
      }
    }
  }

  drawLauncher(state: GameState): void {
    const ctx = this.ctx;
    const launcherX = (COLS * HEX_HORIZ_SPACING) / 2;
    const launcherY = ROWS * HEX_VERT_SPACING + BUBBLE_RADIUS;
    const angleRad = (state.launcherAngle * Math.PI) / 180;
    const r = BUBBLE_RADIUS * state.modifiers.sizeMultiplier;

    ctx.save();
    ctx.translate(launcherX, launcherY);

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.drawBubble(0, 0, state.projectileColor, r);

    ctx.rotate(angleRad);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.6);
    ctx.lineTo(-7, -r * 0.6);
    ctx.lineTo(7, -r * 0.6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    ctx.restore();
  }

  drawAimLine(state: GameState, points: Array<{ x: number; y: number }>): void {
    if (!state.aimLineVisible || points.length < 2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
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
    const r = BUBBLE_RADIUS * state.modifiers.sizeMultiplier;
    this.drawBubble(state.projectileX, state.projectileY, state.projectileColor, r);
  }

  drawNextBubble(state: GameState): void {
    const ctx = this.ctx;
    const gw = COLS * HEX_HORIZ_SPACING;
    const x = gw - BUBBLE_RADIUS * 2.2;
    const y = ROWS * HEX_VERT_SPACING + BUBBLE_RADIUS;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', x, y - BUBBLE_RADIUS - 6);
    ctx.restore();
    this.drawBubble(x, y, state.nextBubbleColor, BUBBLE_RADIUS * 0.75);
  }

  drawFPSDisplay(): void {
    this.tickFPS();
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.fps.toString().padStart(2, ' ')} FPS`, this.canvas.width - 10, 22);
    ctx.restore();
  }

  drawReplayOverlay(timestamp: number, totalDuration: number): void {
    const ctx = this.ctx;
    ctx.save();
    const boxW = 190;
    const boxH = 44;
    const boxX = this.canvas.width - boxW - 16;
    const boxY = this.canvas.height - boxH - 16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    const ts = (timestamp / 1000).toFixed(1);
    const td = (totalDuration / 1000).toFixed(1);
    ctx.fillText(`${ts}s / ${td}s`, boxX + boxW / 2, boxY + boxH / 2 + 5);
    ctx.restore();
  }

  render(state: GameState, aimPoints: Array<{ x: number; y: number }>, hideHUD: boolean = false): void {
    this.clear();
    this.drawBackground();
    this.drawGrid(state);
    this.drawProjectile(state);
    this.drawLauncher(state);
    this.drawAimLine(state, aimPoints);
    if (!hideHUD) {
      this.drawNextBubble(state);
      this.drawFPSDisplay();
    } else {
      this.drawFPSDisplay();
    }
  }
}
