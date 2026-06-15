import type { EnemyInstance, Position, BezierPath } from '../types';
import { ENEMY_CONFIGS } from '../types';

export interface EditorEnemy extends EnemyInstance {
  isSelected: boolean;
  isAnimating?: boolean;
  animationProgress?: number;
  animationStartPos?: Position;
  animationEndPos?: Position;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private gridSize: number = 10;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.prerenderGrid();
  }

  private prerenderGrid(): void {
    const ctx = this.offscreenCtx;
    ctx.fillStyle = '#0a1929';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  render(enemies: EditorEnemy[], currentTime: number): void {
    const ctx = this.ctx;

    ctx.drawImage(this.offscreenCanvas, 0, 0);

    ctx.strokeStyle = '#444443';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, this.width, this.height);

    enemies.forEach(enemy => {
      this.renderPath(enemy.path, enemy.initialPosition);
    });

    enemies.forEach(enemy => {
      this.renderEnemy(enemy, currentTime);
    });
  }

  private evaluateBezier(points: [Position, Position, Position], t: number): Position {
    const mt = 1 - t;
    return {
      x: mt * mt * points[0].x + 2 * mt * t * points[1].x + t * t * points[2].x,
      y: mt * mt * points[0].y + 2 * mt * t * points[1].y + t * t * points[2].y
    };
  }

  private renderPath(path: BezierPath, startPos: Position): void {
    const ctx = this.ctx;
    const controlPoints: [Position, Position, Position] = [
      startPos,
      path.controlPoints[1],
      path.controlPoints[2]
    ];

    ctx.strokeStyle = 'rgba(0, 230, 118, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(controlPoints[0].x, controlPoints[0].y);
    ctx.bezierCurveTo(
      controlPoints[1].x, controlPoints[1].y,
      controlPoints[2].x, controlPoints[2].y,
      controlPoints[2].x, controlPoints[2].y
    );
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0, 230, 118, 0.7)';
    controlPoints.forEach((p, i) => {
      if (i === 0) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderEnemy(enemy: EditorEnemy, currentTime: number): void {
    const ctx = this.ctx;
    const config = ENEMY_CONFIGS[enemy.type];

    let x = enemy.initialPosition.x;
    let y = enemy.initialPosition.y;

    if (enemy.isAnimating && enemy.animationStartPos && enemy.animationEndPos) {
      const t = enemy.animationProgress || 0;
      x = enemy.animationStartPos.x + (enemy.animationEndPos.x - enemy.animationStartPos.x) * t;
      y = enemy.animationStartPos.y + (enemy.animationEndPos.y - enemy.animationStartPos.y) * t;
    }

    ctx.save();
    ctx.translate(x, y);

    if (enemy.isSelected) {
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-config.width / 2 - 4, -config.height / 2 - 4, config.width + 8, config.height + 8);
      ctx.setLineDash([]);
    }

    if (enemy.type === 'boss') {
      const time = Date.now() / 1000;
      const pulse = 1 + Math.sin(time * 4) * 0.15;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, config.width * pulse);
      gradient.addColorStop(0, 'rgba(123, 31, 162, 0.6)');
      gradient.addColorStop(1, 'rgba(123, 31, 162, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(-config.width * pulse, -config.height * pulse, config.width * 2 * pulse, config.height * 2 * pulse);
    }

    if (enemy.type === 'elite') {
      const time = Date.now() / 1000;
      ctx.rotate(time * 3);
      ctx.strokeStyle = '#ffab40';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, config.width * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.rotate(-time * 3);
    }

    ctx.fillStyle = config.color;
    ctx.fillRect(-config.width / 2, -config.height / 2, config.width, config.height);

    const timeSinceSpawn = currentTime - enemy.spawnTime;
    if (timeSinceSpawn >= 0) {
      const t = Math.min(1, timeSinceSpawn / enemy.path.duration);
      const p = this.evaluateBezier([enemy.initialPosition, enemy.path.controlPoints[1], enemy.path.controlPoints[2]], t);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = config.color;
      ctx.fillRect(p.x - x - config.width / 4, p.y - y - config.height / 4, config.width / 2, config.height / 2);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  getMousePos(e: React.MouseEvent<HTMLCanvasElement>): Position {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  hitTest(pos: Position, enemies: EditorEnemy[]): EditorEnemy | null {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const config = ENEMY_CONFIGS[enemy.type];
      const halfW = config.width / 2;
      const halfH = config.height / 2;

      if (
        pos.x >= enemy.initialPosition.x - halfW &&
        pos.x <= enemy.initialPosition.x + halfW &&
        pos.y >= enemy.initialPosition.y - halfH &&
        pos.y <= enemy.initialPosition.y + halfH
      ) {
        return enemy;
      }
    }
    return null;
  }

  hitPathControl(pos: Position, enemy: EditorEnemy): number | null {
    const controlPoints = [
      enemy.initialPosition,
      enemy.path.controlPoints[1],
      enemy.path.controlPoints[2]
    ];

    for (let i = 1; i < controlPoints.length; i++) {
      const cp = controlPoints[i];
      const dx = pos.x - cp.x;
      const dy = pos.y - cp.y;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        return i;
      }
    }
    return null;
  }
}
