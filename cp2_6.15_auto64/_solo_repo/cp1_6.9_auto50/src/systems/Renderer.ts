import { MazeData } from './MazeGenerator';
import { PathManager } from './PathManager';

export interface ShadowMonster {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  targetGridX: number;
  targetGridY: number;
  moveProgress: number;
  moveStartX: number;
  moveStartY: number;
  lastMoveTime: number;
  opacity: number;
  fadingOut: boolean;
  fadeStartTime: number;
  moving: boolean;
  moveTargetX: number;
  moveTargetY: number;
}

export interface PlayerState {
  gridX: number;
  gridY: number;
  displayX: number;
  displayY: number;
  moving: boolean;
  moveStartX: number;
  moveStartY: number;
  moveTargetX: number;
  moveTargetY: number;
  moveProgress: number;
  moveStartTime: number;
  moveDuration: number;
}

export interface RenderContext {
  maze: MazeData;
  pathManager: PathManager;
  player: PlayerState;
  monsters: ShadowMonster[];
  discoveredExits: Set<string>;
  flashAlpha: number;
  now: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export class Renderer {
  private staticLayer: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;
  private mazeHash: string = '';

  private initializeStaticLayer(width: number, height: number): void {
    if (!this.staticLayer || this.staticLayer.width !== width || this.staticLayer.height !== height) {
      this.staticLayer = document.createElement('canvas');
      this.staticLayer.width = width;
      this.staticLayer.height = height;
      this.staticCtx = this.staticLayer.getContext('2d');
    }
  }

  private computeMazeHash(maze: MazeData, cellSize: number, offsetX: number, offsetY: number): string {
    return `${maze.width}x${maze.height}|${cellSize}|${offsetX}|${offsetY}|${maze.exits.length}|${maze.exits.map(e => `${e.x},${e.y}`).join(';')}`;
  }

  private drawStaticLayer(ctx: RenderContext): void {
    if (!this.staticCtx) return;
    const sctx = this.staticCtx;
    const { maze, cellSize, offsetX, offsetY } = ctx;

    sctx.clearRect(0, 0, this.staticLayer!.width, this.staticLayer!.height);

    sctx.strokeStyle = '#00BFFF';
    sctx.lineWidth = 2;
    sctx.lineCap = 'round';
    sctx.lineJoin = 'round';

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.cells[y][x];
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;

        if (cell.walls.top) {
          sctx.beginPath();
          sctx.moveTo(px, py);
          sctx.lineTo(px + cellSize, py);
          sctx.stroke();
        }
        if (cell.walls.right) {
          sctx.beginPath();
          sctx.moveTo(px + cellSize, py);
          sctx.lineTo(px + cellSize, py + cellSize);
          sctx.stroke();
        }
        if (cell.walls.bottom) {
          sctx.beginPath();
          sctx.moveTo(px, py + cellSize);
          sctx.lineTo(px + cellSize, py + cellSize);
          sctx.stroke();
        }
        if (cell.walls.left) {
          sctx.beginPath();
          sctx.moveTo(px, py);
          sctx.lineTo(px, py + cellSize);
          sctx.stroke();
        }
      }
    }
  }

  private drawExits(ctx: RenderContext, canvasCtx: CanvasRenderingContext2D): void {
    const { maze, discoveredExits, cellSize, offsetX, offsetY, now } = ctx;

    for (const exit of maze.exits) {
      const key = `${exit.x},${exit.y}`;
      const px = offsetX + exit.x * cellSize;
      const py = offsetY + exit.y * cellSize;
      const padding = cellSize * 0.15;
      const innerSize = cellSize - padding * 2;

      if (discoveredExits.has(key)) {
        const cycle = (now % 500) / 500;
        const alpha = 0.3 + Math.abs(Math.sin(cycle * Math.PI * 2)) * 0.7;
        canvasCtx.save();
        canvasCtx.shadowColor = '#00FF00';
        canvasCtx.shadowBlur = 15;
        canvasCtx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
        canvasCtx.lineWidth = 3;
        canvasCtx.strokeRect(px + padding, py + padding, innerSize, innerSize);
        canvasCtx.fillStyle = `rgba(0, 255, 0, ${alpha * 0.3})`;
        canvasCtx.fillRect(px + padding, py + padding, innerSize, innerSize);
        canvasCtx.restore();
      } else {
        canvasCtx.fillStyle = 'rgba(128, 128, 128, 0.2)';
        canvasCtx.fillRect(px + padding, py + padding, innerSize, innerSize);
      }
    }
  }

  private drawPath(ctx: RenderContext, canvasCtx: CanvasRenderingContext2D): void {
    const { pathManager, now } = ctx;
    const points = pathManager.getVisiblePoints(now);

    if (points.length < 2) {
      for (const pt of points) {
        canvasCtx.save();
        canvasCtx.globalAlpha = pt.opacity;
        canvasCtx.shadowColor = `hsl(${pt.hue}, 100%, 50%)`;
        canvasCtx.shadowBlur = 8;
        canvasCtx.fillStyle = `hsl(${pt.hue}, 100%, 60%)`;
        canvasCtx.beginPath();
        canvasCtx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.restore();
      }
      return;
    }

    canvasCtx.lineWidth = 6;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const avgAlpha = (p1.opacity + p2.opacity) / 2;
      const avgHue = (p1.hue + p2.hue) / 2;

      canvasCtx.save();
      canvasCtx.globalAlpha = avgAlpha;
      canvasCtx.shadowColor = `hsl(${avgHue}, 100%, 50%)`;
      canvasCtx.shadowBlur = 10;
      canvasCtx.strokeStyle = `hsl(${avgHue}, 100%, 60%)`;
      canvasCtx.beginPath();
      canvasCtx.moveTo(p1.x, p1.y);
      canvasCtx.lineTo(p2.x, p2.y);
      canvasCtx.stroke();
      canvasCtx.restore();
    }

    for (const pt of points) {
      canvasCtx.save();
      canvasCtx.globalAlpha = pt.opacity;
      canvasCtx.shadowColor = `hsl(${pt.hue}, 100%, 50%)`;
      canvasCtx.shadowBlur = 8;
      canvasCtx.fillStyle = `hsl(${pt.hue}, 100%, 70%)`;
      canvasCtx.beginPath();
      canvasCtx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      canvasCtx.fill();
      canvasCtx.restore();
    }
  }

  private drawPlayer(ctx: RenderContext, canvasCtx: CanvasRenderingContext2D): void {
    const { player } = ctx;
    canvasCtx.save();
    canvasCtx.shadowColor = '#FFFFFF';
    canvasCtx.shadowBlur = 20;
    canvasCtx.globalAlpha = 0.9;
    canvasCtx.fillStyle = '#FFFFFF';
    canvasCtx.beginPath();
    canvasCtx.arc(player.displayX, player.displayY, 6, 0, Math.PI * 2);
    canvasCtx.fill();

    canvasCtx.globalAlpha = 0.3;
    canvasCtx.beginPath();
    canvasCtx.arc(player.displayX, player.displayY, 14, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.restore();
  }

  private drawMonsters(ctx: RenderContext, canvasCtx: CanvasRenderingContext2D): void {
    const { monsters, now } = ctx;

    for (const monster of monsters) {
      let opacity = monster.opacity;
      if (monster.fadingOut) {
        const elapsed = now - monster.fadeStartTime;
        opacity = Math.max(0, monster.opacity * (1 - elapsed / 2000));
      }

      canvasCtx.save();
      canvasCtx.globalAlpha = opacity * 0.9;

      const gradient = canvasCtx.createRadialGradient(
        monster.x, monster.y, 0,
        monster.x, monster.y, 16
      );
      gradient.addColorStop(0, 'rgba(26, 26, 46, 0.9)');
      gradient.addColorStop(0.6, 'rgba(40, 20, 60, 0.5)');
      gradient.addColorStop(1, 'rgba(60, 30, 80, 0)');

      canvasCtx.fillStyle = gradient;
      canvasCtx.beginPath();
      canvasCtx.arc(monster.x, monster.y, 16, 0, Math.PI * 2);
      canvasCtx.fill();

      canvasCtx.fillStyle = '#1A1A2E';
      canvasCtx.beginPath();
      canvasCtx.arc(monster.x, monster.y, 10, 0, Math.PI * 2);
      canvasCtx.fill();

      canvasCtx.fillStyle = 'rgba(80, 40, 100, 0.7)';
      const eyeOffset = 3;
      canvasCtx.beginPath();
      canvasCtx.arc(monster.x - eyeOffset, monster.y - 2, 1.5, 0, Math.PI * 2);
      canvasCtx.arc(monster.x + eyeOffset, monster.y - 2, 1.5, 0, Math.PI * 2);
      canvasCtx.fill();

      canvasCtx.restore();
    }
  }

  private drawFlash(ctx: RenderContext, canvasCtx: CanvasRenderingContext2D): void {
    if (ctx.flashAlpha > 0.001) {
      canvasCtx.save();
      canvasCtx.globalAlpha = ctx.flashAlpha;
      canvasCtx.fillStyle = '#FFFFFF';
      canvasCtx.fillRect(0, 0, this.staticLayer!.width, this.staticLayer!.height);
      canvasCtx.restore();
    }
  }

  public render(ctx: RenderContext, canvasCtx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    this.initializeStaticLayer(canvasWidth, canvasHeight);

    const hash = this.computeMazeHash(ctx.maze, ctx.cellSize, ctx.offsetX, ctx.offsetY);
    if (hash !== this.mazeHash) {
      this.drawStaticLayer(ctx);
      this.mazeHash = hash;
    }

    canvasCtx.fillStyle = '#000000';
    canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (this.staticLayer) {
      canvasCtx.drawImage(this.staticLayer, 0, 0);
    }

    this.drawExits(ctx, canvasCtx);
    this.drawPath(ctx, canvasCtx);
    this.drawMonsters(ctx, canvasCtx);
    this.drawPlayer(ctx, canvasCtx);
    this.drawFlash(ctx, canvasCtx);
  }

  public resetStaticCache(): void {
    this.mazeHash = '';
  }
}
