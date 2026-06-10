import {
  EnergyBall, PathSegment, HexCell, IntersectionNode,
  COLORS, ENERGY_BALL_SPEED, TRAIL_LENGTH,
} from './types';
import { Grid } from './Grid';
import { EffectManager } from './EffectManager';

export class Pendulum {
  balls: EnergyBall[] = [];
  private ballIdCounter = 0;
  private grid: Grid;
  private effectManager: EffectManager;

  constructor(grid: Grid, effectManager: EffectManager) {
    this.grid = grid;
    this.effectManager = effectManager;
  }

  createBall(fromCell: HexCell, toCell: HexCell, path: PathSegment, isMain: boolean = true): EnergyBall {
    const ball: EnergyBall = {
      id: this.ballIdCounter++,
      x: fromCell.x,
      y: fromCell.y,
      pathIndex: this.grid.paths.indexOf(path),
      pathProgress: 0,
      isMain,
      color: isMain ? COLORS.energyBallMain : COLORS.energyBallSub,
      trail: [],
      active: true,
      currentCell: fromCell,
      waitingAtIntersection: false,
      intersectionCell: null,
    };

    if (!isMain && this.balls.filter(b => !b.isMain && b.active).length >= 1) {
      return ball;
    }

    if (this.balls.filter(b => b.active).length >= 2) {
      return ball;
    }

    this.balls.push(ball);
    return ball;
  }

  splitBall(fromCell: HexCell, toCell: HexCell, path: PathSegment): EnergyBall | null {
    const existingSub = this.balls.filter(b => !b.isMain && b.active);
    if (existingSub.length >= 1) return null;

    const totalActive = this.balls.filter(b => b.active);
    if (totalActive.length >= 2) return null;

    return this.createBall(fromCell, toCell, path, false);
  }

  update(dt: number, currentTime: number, onBallArrive: (ball: EnergyBall, cell: HexCell) => void) {
    for (const ball of this.balls) {
      if (!ball.active) continue;

      if (ball.waitingAtIntersection) continue;

      const path = this.grid.paths[ball.pathIndex];
      if (!path) {
        ball.active = false;
        continue;
      }

      const pathLen = this.grid.getPathLength(path);
      const gridSize = this.grid.hexSize;
      const speed = ENERGY_BALL_SPEED * gridSize;
      const progressStep = (speed * dt) / Math.max(1, pathLen);

      ball.pathProgress += progressStep;

      if (ball.pathProgress >= 1) {
        ball.pathProgress = 1;
        const toCell = path.toCell;
        ball.x = toCell.x;
        ball.y = toCell.y;
        ball.currentCell = toCell;
        ball.active = false;
        onBallArrive(ball, toCell);
        continue;
      }

      const pos = this.grid.getPointOnPath(path, ball.pathProgress);
      ball.x = pos.x;
      ball.y = pos.y;

      ball.trail.push({ x: pos.x, y: pos.y, alpha: 1 });
      if (ball.trail.length > TRAIL_LENGTH) {
        ball.trail.shift();
      }

      for (let i = 0; i < ball.trail.length; i++) {
        ball.trail[i].alpha = (i + 1) / ball.trail.length;
      }

      this.effectManager.addTrailParticle(ball.x, ball.y, ball.color);

      for (const node of path.intersections) {
        if (node.chosenDirection !== null) continue;
        const dx = ball.x - node.x;
        const dy = ball.y - node.y;
        if (dx * dx + dy * dy < 10 * 10) {
          ball.waitingAtIntersection = true;
          ball.intersectionCell = ball.currentCell;
          break;
        }
      }
    }

    this.balls = this.balls.filter(b => b.active || b.trail.length > 0);

    for (const ball of this.balls) {
      if (!ball.active) {
        for (const t of ball.trail) {
          t.alpha -= dt * 3;
        }
        ball.trail = ball.trail.filter(t => t.alpha > 0);
      }
    }
  }

  resolveIntersection(ball: EnergyBall, direction: 'A' | 'B') {
    if (!ball.waitingAtIntersection) return;

    const path = this.grid.paths[ball.pathIndex];
    if (!path) return;

    for (const node of path.intersections) {
      if (node.chosenDirection !== null) continue;
      const dx = ball.x - node.x;
      const dy = ball.y - node.y;
      if (dx * dx + dy * dy < 15 * 15) {
        node.chosenDirection = direction;
        ball.waitingAtIntersection = false;

        if (direction === 'B') {
          const newPath = node.pathB;
          const currentProgress = ball.pathProgress;
          ball.pathIndex = this.grid.paths.indexOf(newPath);
          ball.pathProgress = 0;

          if (newPath.fromCell !== ball.currentCell && newPath.toCell !== ball.currentCell) {
            const fromDist = Math.hypot(ball.x - newPath.fromCell.x, ball.y - newPath.fromCell.y);
            const toDist = Math.hypot(ball.x - newPath.toCell.x, ball.y - newPath.toCell.y);
            if (fromDist < toDist) {
              ball.currentCell = newPath.fromCell;
            } else {
              ball.currentCell = newPath.toCell;
            }
          }
        }
        break;
      }
    }
  }

  checkBallCollision(): { ball1: EnergyBall; ball2: EnergyBall } | null {
    const activeBalls = this.balls.filter(b => b.active);
    if (activeBalls.length < 2) return null;

    for (let i = 0; i < activeBalls.length; i++) {
      for (let j = i + 1; j < activeBalls.length; j++) {
        const a = activeBalls[i];
        const b = activeBalls[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.grid.hexSize * 0.8) {
          return { ball1: a, ball2: b };
        }
      }
    }
    return null;
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const ball of this.balls) {
      if (ball.trail.length > 0) {
        for (let i = 0; i < ball.trail.length - 1; i++) {
          const t = ball.trail[i];
          ctx.beginPath();
          ctx.arc(t.x, t.y, 3 * t.alpha, 0, Math.PI * 2);
          ctx.fillStyle = ball.color;
          ctx.globalAlpha = t.alpha * 0.6;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (ball.active) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, 12);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.3, ball.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 15;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();

        ctx.restore();
      }
    }
  }

  clear() {
    this.balls = [];
    this.ballIdCounter = 0;
  }

  getActiveBallCount(): number {
    return this.balls.filter(b => b.active).length;
  }
}
