import { Shape } from './editor';

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  onGround: boolean;
  flash: number;
}

const GRAVITY = 0.5;
const MOVE_SPEED = 4;
const JUMP_POWER = 10;
const PLAYER_RADIUS = 10;
const PORTAL_COOLDOWN = 0.5;

export class Playback {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  shapes: Shape[] = [];
  player: Player;
  keys: Set<string> = new Set();
  running: boolean = false;
  private startTime: number = 0;
  private portalCooldown: number = 0;
  onReset?: () => void;
  onFlash?: (color: 'red' | 'blue') => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.player = this.createPlayer();
  }

  private createPlayer(): Player {
    const wrap = this.canvas.parentElement!;
    const w = Math.max(800, wrap.clientWidth);
    return {
      x: w / 2,
      y: 30,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      onGround: false,
      flash: 0
    };
  }

  setShapes(shapes: Shape[]) {
    this.shapes = JSON.parse(JSON.stringify(shapes));
  }

  start() {
    this.running = true;
    this.shapes.forEach(s => {
      if (s.type === 'rect' && s.rect) {
        (s as any)._origY = s.rect.y;
        (s as any)._vy = 0;
      } else if (s.type === 'circle' && s.ellipse) {
        (s as any)._origY = s.ellipse.cy;
        (s as any)._vy = 0;
      } else if (s.type === 'triangle' && s.triangle) {
        (s as any)._origY = (s.triangle.p1.y + s.triangle.p2.y + s.triangle.p3.y) / 3;
        (s as any)._vy = 0;
      }
    });
    this.player = this.createPlayer();
    this.portalCooldown = 0;
    this.startTime = performance.now();
    this.bindKeys();
  }

  stop() {
    this.running = false;
    this.unbindKeys();
  }

  private keyDown = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
    }
    this.keys.add(e.key);
  };

  private keyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key);
  };

  private bindKeys() {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
  }

  private unbindKeys() {
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
  }

  resetPlayer() {
    this.player = this.createPlayer();
    this.player.flash = 0.5;
    this.portalCooldown = PORTAL_COOLDOWN;
  }

  private rectContainsCircle(r: { x: number; y: number; w: number; h: number }, cx: number, cy: number, cr: number): boolean {
    const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
    const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy <= cr * cr;
  }

  private ellipseContainsCircle(e: { cx: number; cy: number; rx: number; ry: number }, cx: number, cy: number, cr: number): boolean {
    const testX = cx, testY = cy;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const px = testX + Math.cos(angle) * cr;
      const py = testY + Math.sin(angle) * cr;
      const dx = (px - e.cx) / e.rx;
      const dy = (py - e.cy) / e.ry;
      if (dx * dx + dy * dy <= 1) return true;
    }
    const dx = (testX - e.cx) / e.rx;
    const dy = (testY - e.cy) / e.ry;
    return dx * dx + dy * dy <= 1;
  }

  private triangleContainsCircle(t: { p1: { x: number; y: number }; p2: { x: number; y: number }; p3: { x: number; y: number } }, cx: number, cy: number, cr: number): boolean {
    const sign = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
      (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
    const d1 = sign(cx, cy, t.p1.x, t.p1.y, t.p2.x, t.p2.y);
    const d2 = sign(cx, cy, t.p2.x, t.p2.y, t.p3.x, t.p3.y);
    const d3 = sign(cx, cy, t.p3.x, t.p3.y, t.p1.x, t.p1.y);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    if (!(hasNeg && hasPos)) return true;

    const distToSeg = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) return Math.hypot(cx - x1, cy - y1);
      let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(cx - (x1 + t * dx), cy - (y1 + t * dy));
    };
    if (distToSeg(t.p1.x, t.p1.y, t.p2.x, t.p2.y) <= cr) return true;
    if (distToSeg(t.p2.x, t.p2.y, t.p3.x, t.p3.y) <= cr) return true;
    if (distToSeg(t.p3.x, t.p3.y, t.p1.x, t.p1.y) <= cr) return true;
    return false;
  }

  private shapeContainsPlayer(s: Shape): boolean {
    if (s.rect) return this.rectContainsCircle(s.rect, this.player.x, this.player.y, this.player.radius);
    if (s.ellipse) return this.ellipseContainsCircle(s.ellipse, this.player.x, this.player.y, this.player.radius);
    if (s.triangle) return this.triangleContainsCircle(s.triangle, this.player.x, this.player.y, this.player.radius);
    return false;
  }

  private getShapeTop(s: Shape, px: number): number | null {
    if (s.rect) {
      if (px >= s.rect.x && px <= s.rect.x + s.rect.w) return s.rect.y;
      return null;
    }
    if (s.ellipse) {
      const dx = (px - s.ellipse.cx) / s.ellipse.rx;
      if (dx * dx <= 1) {
        const dy = Math.sqrt(1 - dx * dx);
        return s.ellipse.cy - dy * s.ellipse.ry;
      }
      return null;
    }
    if (s.triangle) {
      const { p1, p2, p3 } = s.triangle;
      const edges = [[p1, p2], [p2, p3], [p3, p1]];
      let minY = Infinity;
      for (const [a, b] of edges) {
        const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
        if (px >= minX && px <= maxX && Math.abs(a.x - b.x) > 0.01) {
          const t = (px - a.x) / (b.x - a.x);
          const y = a.y + t * (b.y - a.y);
          if (y < minY) minY = y;
        }
      }
      if (minY < Infinity) return minY;
      return null;
    }
    return null;
  }

  private getShapeCenter(s: Shape): { x: number; y: number } {
    if (s.rect) return { x: s.rect.x + s.rect.w / 2, y: s.rect.y + s.rect.h / 2 };
    if (s.ellipse) return { x: s.ellipse.cx, y: s.ellipse.cy };
    if (s.triangle) return { x: (s.triangle.p1.x + s.triangle.p2.x + s.triangle.p3.x) / 3, y: (s.triangle.p1.y + s.triangle.p2.y + s.triangle.p3.y) / 3 };
    return { x: 0, y: 0 };
  }

  step() {
    if (!this.running) return;

    if (this.portalCooldown > 0) this.portalCooldown -= 1 / 60;
    if (this.player.flash > 0) this.player.flash -= 1 / 60;

    if (this.keys.has('ArrowLeft')) this.player.vx = -MOVE_SPEED;
    else if (this.keys.has('ArrowRight')) this.player.vx = MOVE_SPEED;
    else this.player.vx = 0;

    if ((this.keys.has('ArrowUp') || this.keys.has(' ')) && this.player.onGround) {
      this.player.vy = -JUMP_POWER;
      this.player.onGround = false;
    }

    this.player.vy += GRAVITY;
    if (this.player.vy > 15) this.player.vy = 15;

    const prevY = this.player.y;

    this.player.x += this.player.vx;
    this.player.y += this.player.vy;

    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.width / dpr;
    const ch = this.canvas.height / dpr;
    if (this.player.x < this.player.radius) this.player.x = this.player.radius;
    if (this.player.x > cw - this.player.radius) this.player.x = cw - this.player.radius;

    if (this.player.y > ch + 100) {
      this.resetPlayer();
      this.onFlash?.('red');
      return;
    }

    this.shapes.forEach(s => {
      if (s.physics === 'dynamic') {
        (s as any)._vy = ((s as any)._vy || 0) + GRAVITY;
        if (s.rect) {
          s.rect.y += (s as any)._vy;
          if (s.rect.y + s.rect.h > ch) {
            s.rect.y = ch - s.rect.h;
            (s as any)._vy = 0;
          }
        } else if (s.ellipse) {
          s.ellipse.cy += (s as any)._vy;
          if (s.ellipse.cy + s.ellipse.ry > ch) {
            s.ellipse.cy = ch - s.ellipse.ry;
            (s as any)._vy = 0;
          }
        } else if (s.triangle) {
          const dy = (s as any)._vy;
          s.triangle.p1.y += dy; s.triangle.p2.y += dy; s.triangle.p3.y += dy;
          const maxY = Math.max(s.triangle.p1.y, s.triangle.p2.y, s.triangle.p3.y);
          if (maxY > ch) {
            const adj = ch - maxY;
            s.triangle.p1.y += adj; s.triangle.p2.y += adj; s.triangle.p3.y += adj;
            (s as any)._vy = 0;
          }
        }
      }
    });

    this.player.onGround = false;
    let landedY: number | null = null;

    if (this.player.vy >= 0) {
      for (const s of this.shapes) {
        if (s.physics === 'static' || s.physics === 'dynamic') {
          const top = this.getShapeTop(s, this.player.x);
          if (top !== null) {
            const prevBottom = prevY + this.player.radius;
            const currBottom = this.player.y + this.player.radius;
            if (prevBottom <= top + 2 && currBottom >= top) {
              if (landedY === null || top < landedY) landedY = top;
            }
          }
        }
      }
    }

    if (landedY !== null) {
      this.player.y = landedY - this.player.radius;
      this.player.vy = 0;
      this.player.onGround = true;
    }

    for (const s of this.shapes) {
      if (!this.shapeContainsPlayer(s)) continue;

      if (s.physics === 'trap') {
        this.onFlash?.('red');
        this.resetPlayer();
        return;
      }

      if (s.physics === 'portal-a' && this.portalCooldown <= 0) {
        const portalB = this.shapes.find(x => x.physics === 'portal-b');
        if (portalB) {
          const c = this.getShapeCenter(portalB);
          this.player.x = c.x;
          this.player.y = c.y;
          this.player.vy = 0;
          this.player.vx = 0;
          this.player.flash = 0.5;
          this.portalCooldown = PORTAL_COOLDOWN;
          this.onFlash?.('blue');
          return;
        }
      }

      if (s.physics === 'portal-b' && this.portalCooldown <= 0) {
        const portalA = this.shapes.find(x => x.physics === 'portal-a');
        if (portalA) {
          const c = this.getShapeCenter(portalA);
          this.player.x = c.x;
          this.player.y = c.y;
          this.player.vy = 0;
          this.player.vx = 0;
          this.player.flash = 0.5;
          this.portalCooldown = PORTAL_COOLDOWN;
          this.onFlash?.('blue');
          return;
        }
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.width / dpr;
    const ch = this.canvas.height / dpr;
    ctx.clearRect(0, 0, cw, ch);

    this.shapes.forEach(s => {
      let fill = '#D1D5DB';
      let stroke = '#4B5563';
      switch (s.physics) {
        case 'static': fill = '#6B7280'; break;
        case 'dynamic': fill = '#93C5FD'; break;
        case 'portal-a': fill = '#3B82F6'; break;
        case 'portal-b': fill = '#8B5CF6'; break;
        case 'trap': fill = 'rgba(239, 68, 68, 0.5)'; break;
      }
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;

      if (s.rect) {
        ctx.beginPath();
        ctx.rect(s.rect.x, s.rect.y, s.rect.w, s.rect.h);
        ctx.fill();
        ctx.stroke();
      } else if (s.ellipse) {
        ctx.beginPath();
        ctx.ellipse(s.ellipse.cx, s.ellipse.cy, s.ellipse.rx, s.ellipse.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (s.triangle) {
        ctx.beginPath();
        ctx.moveTo(s.triangle.p1.x, s.triangle.p1.y);
        ctx.lineTo(s.triangle.p2.x, s.triangle.p2.y);
        ctx.lineTo(s.triangle.p3.x, s.triangle.p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    });

    ctx.save();
    if (this.player.flash > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 30) * 0.3;
    }
    ctx.fillStyle = '#FCD34D';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const elapsed = (performance.now() - this.startTime) / 1000;
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px sans-serif';
    ctx.fillText(`游戏时间: ${elapsed.toFixed(1)}s · ← → 移动 · ↑ 跳跃`, 12, 24);
  }
}
