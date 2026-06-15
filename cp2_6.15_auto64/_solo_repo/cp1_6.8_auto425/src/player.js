import { Level } from './level.js';

const MOVE_DURATION = 0.12;

export class Player {
  constructor(startX, startY) {
    this.gridX = startX;
    this.gridY = startY;
    this.renderX = startX;
    this.renderY = startY;
    this.targetX = startX;
    this.targetY = startY;
    this.moving = false;
    this.moveProgress = 0;
    this.fromX = startX;
    this.fromY = startY;
    this.facing = 'down';
    this.bobTimer = 0;
    this.steps = 0;
    this.onStepComplete = null;
  }

  reset(x, y) {
    this.gridX = x;
    this.gridY = y;
    this.renderX = x;
    this.renderY = y;
    this.targetX = x;
    this.targetY = y;
    this.moving = false;
    this.moveProgress = 0;
    this.fromX = x;
    this.fromY = y;
    this.steps = 0;
    this.bobTimer = 0;
  }

  tryMove(dx, dy, level) {
    if (this.moving) return false;

    const nx = this.gridX + dx;
    const ny = this.gridY + dy;

    if (dx < 0) this.facing = 'left';
    else if (dx > 0) this.facing = 'right';
    else if (dy < 0) this.facing = 'up';
    else if (dy > 0) this.facing = 'down';

    if (level.isWall(nx, ny)) return false;

    this.fromX = this.gridX;
    this.fromY = this.gridY;
    this.targetX = nx;
    this.targetY = ny;
    this.gridX = nx;
    this.gridY = ny;
    this.moving = true;
    this.moveProgress = 0;
    this.steps++;

    return true;
  }

  update(dt, level, effects) {
    this.bobTimer += dt;

    if (this.moving) {
      this.moveProgress += dt / MOVE_DURATION;
      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.moving = false;
        this.renderX = this.targetX;
        this.renderY = this.targetY;

        const result = level.tryActivate(this.gridX, this.gridY);
        if (result) {
          if (result.success) {
            const elem = Level.ELEMENTS[result.element];
            const px = this.gridX * Level.TILE_SIZE;
            const py = this.gridY * Level.TILE_SIZE;
            effects.spawnBlockParticles(px, py, elem.color, 12);
            effects.spawnGlow(px, py, elem.glow);
            effects.playElementSound(result.element);
            if (result.allActivated) {
              effects.playPortalSound();
            }
          } else {
            effects.playErrorSound();
          }
        }

        if (!result && level.portalOpen && level.isPortalPos(this.gridX, this.gridY)) {
          if (this.onStepComplete) this.onStepComplete('portal');
        }
      } else {
        const t = this._easeOut(this.moveProgress);
        this.renderX = this.fromX + (this.targetX - this.fromX) * t;
        this.renderY = this.fromY + (this.targetY - this.fromY) * t;
      }
    }
  }

  _easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }

  draw(ctx) {
    const TS = Level.TILE_SIZE;
    const px = this.renderX * TS;
    const py = this.renderY * TS;
    const bob = Math.sin(this.bobTimer * 5) * 1.5;

    ctx.imageSmoothingEnabled = false;

    const cx = px + TS / 2;
    const cy = py + TS / 2 + bob;

    ctx.fillStyle = '#3322aa';
    ctx.fillRect(cx - 6, cy - 8, 12, 4);

    ctx.fillStyle = '#ffddaa';
    ctx.fillRect(cx - 5, cy - 4, 10, 6);

    ctx.fillStyle = '#2a1a66';
    ctx.fillRect(cx - 6, cy + 2, 5, 6);
    ctx.fillRect(cx + 1, cy + 2, 5, 6);

    ctx.fillStyle = '#ffddaa';
    ctx.fillRect(cx - 4, cy + 8, 3, 3);
    ctx.fillRect(cx + 1, cy + 8, 3, 3);

    ctx.fillStyle = '#ff6644';
    ctx.fillRect(cx - 4, cy - 12, 8, 4);
    ctx.fillRect(cx - 3, cy - 14, 6, 3);
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(cx, cy - 16, 3, 4);

    ctx.fillStyle = '#222244';
    if (this.facing === 'left') {
      ctx.fillRect(cx - 4, cy - 2, 2, 2);
    } else if (this.facing === 'right') {
      ctx.fillRect(cx + 2, cy - 2, 2, 2);
    } else {
      ctx.fillRect(cx - 3, cy - 2, 2, 2);
      ctx.fillRect(cx + 1, cy - 2, 2, 2);
    }

    ctx.fillStyle = 'rgba(100, 80, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}
