import { Player } from './player';
import { Maze, MAZE_WIDTH, MAZE_HEIGHT } from './maze';

export class UI {
  canvasWidth: number;
  canvasHeight: number;
  paused: boolean;
  showVictory: boolean;
  victoryTime: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.paused = false;
    this.showVictory = false;
    this.victoryTime = 0;
  }

  drawStatusPanel(ctx: CanvasRenderingContext2D, player: Player): void {
    const panelX = 16;
    const panelY = 16;
    const panelW = 180;
    const panelH = 100;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';

    ctx.fillText(`Pulses: ${player.pulseCount}`, panelX + 14, panelY + 26);
    ctx.fillText(`Steps: ${player.stepCount}`, panelX + 14, panelY + 48);
    ctx.fillText(`Fragments: ${player.fragmentCount}/10`, panelX + 14, panelY + 70);

    const fragBarW = 140;
    const fragBarH = 4;
    const fragBarX = panelX + 14;
    const fragBarY = panelY + 80;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(fragBarX, fragBarY, fragBarW, fragBarH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(fragBarX, fragBarY, fragBarW * (player.fragmentCount / 10), fragBarH);
  }

  drawButtons(ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number): { pauseHit: boolean; resetHit: boolean } {
    const btnSize = 40;
    const padding = 16;
    const pauseX = this.canvasWidth - btnSize - padding * 2 - btnSize;
    const resetX = this.canvasWidth - btnSize - padding;
    const btnY = padding;

    const pauseHover = this.isInRect(mouseX, mouseY, pauseX, btnY, btnSize, btnSize);
    const resetHover = this.isInRect(mouseX, mouseY, resetX, btnY, btnSize, btnSize);

    this.drawCircleButton(ctx, pauseX, btnY, btnSize, this.paused ? '▶' : '⏸', pauseHover);
    this.drawCircleButton(ctx, resetX, btnY, btnSize, '↺', resetHover);

    return {
      pauseHit: pauseHover,
      resetHit: resetHover,
    };
  }

  private drawCircleButton(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, label: string, hover: boolean): void {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size / 2;

    if (hover) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1.1, 1.1);
      ctx.translate(-cx, -cy);
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = hover ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);

    if (hover) {
      ctx.restore();
    }
  }

  drawExit(ctx: CanvasRenderingContext2D, maze: Maze, now: number): void {
    const elapsed = now % 1000;
    const phase = elapsed / 500;
    const alpha = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);

    ctx.beginPath();
    ctx.arc(maze.exitX, maze.exitY, maze.exitRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.3})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(maze.exitX, maze.exitY, maze.exitRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(maze.exitX, maze.exitY, maze.exitRadius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
    ctx.fill();
  }

  drawFragments(ctx: CanvasRenderingContext2D, maze: Maze, now: number): void {
    for (const frag of maze.fragments) {
      if (frag.collected) continue;

      const pulse = 0.5 + 0.5 * Math.sin(now / 400 + frag.x * 0.1);
      const size = 5 + pulse * 2;

      ctx.beginPath();
      ctx.arc(frag.x, frag.y, size + 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${pulse * 0.2})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(frag.x, frag.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${0.4 + pulse * 0.3})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(frag.x, frag.y, size * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.4})`;
      ctx.fill();
    }
  }

  drawMazeWalls(ctx: CanvasRenderingContext2D, maze: Maze): void {
    const segments = maze.getWallSegments();
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;

    for (const seg of segments) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
  }

  drawPauseOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', this.canvasWidth / 2, this.canvasHeight / 2);

    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Press P or click ▶ to resume', this.canvasWidth / 2, this.canvasHeight / 2 + 40);
  }

  drawVictory(ctx: CanvasRenderingContext2D, player: Player, now: number): void {
    const elapsed = now - this.victoryTime;
    const fadeIn = Math.min(elapsed / 1000, 1);

    ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * fadeIn})`;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = `rgba(255, 215, 0, ${fadeIn})`;
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ECHO FOUND', this.canvasWidth / 2, this.canvasHeight / 2 - 30);

    ctx.fillStyle = `rgba(255, 255, 255, ${fadeIn * 0.8})`;
    ctx.font = '16px monospace';
    ctx.fillText(`Pulses: ${player.pulseCount}  Steps: ${player.stepCount}  Fragments: ${player.fragmentCount}/10`, this.canvasWidth / 2, this.canvasHeight / 2 + 20);

    ctx.font = '14px monospace';
    ctx.fillStyle = `rgba(255, 255, 255, ${fadeIn * 0.5})`;
    ctx.fillText('Press R to play again', this.canvasWidth / 2, this.canvasHeight / 2 + 55);
  }

  drawInstructions(ctx: CanvasRenderingContext2D, now: number): void {
    const alpha = 0.4 + 0.2 * Math.sin(now / 800);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Arrow Keys / WASD: Move  |  Space: Emit Pulse  |  P: Pause  |  R: Reset', this.canvasWidth / 2, this.canvasHeight - 20);
  }

  isInRect(mx: number, my: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return mx >= rx && mx <= rx + rw && my >= ry && my <= ry + rh;
  }

  updateSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
