export interface Dart {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: Array<{ x: number; y: number }>;
  active: boolean;
  hitSomething: boolean;
}

const GRAVITY = 500;
const FLIGHT_TIME = 0.45;
const MAX_TRAIL = 18;
const DART_RADIUS = 5;

export class DartController {
  private darts: Dart[] = [];
  private nextId = 0;

  launch(startX: number, startY: number, targetX: number, targetY: number): Dart {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const vx = dx / FLIGHT_TIME;
    const vy = (dy - 0.5 * GRAVITY * FLIGHT_TIME * FLIGHT_TIME) / FLIGHT_TIME;

    const dart: Dart = {
      id: this.nextId++,
      x: startX,
      y: startY,
      vx,
      vy,
      trail: [],
      active: true,
      hitSomething: false,
    };

    this.darts.push(dart);
    return dart;
  }

  update(dt: number, canvasW: number, canvasH: number) {
    for (const dart of this.darts) {
      if (!dart.active) continue;

      dart.trail.push({ x: dart.x, y: dart.y });
      if (dart.trail.length > MAX_TRAIL) dart.trail.shift();

      dart.x += dart.vx * dt;
      dart.vy += GRAVITY * dt;
      dart.y += dart.vy * dt;

      if (
        dart.y > canvasH + 60 ||
        dart.x < -60 ||
        dart.x > canvasW + 60 ||
        dart.y < -200
      ) {
        dart.active = false;
      }
    }

    this.darts = this.darts.filter(
      (d) => d.active || d.trail.length > 0
    );

    for (const dart of this.darts) {
      if (!dart.active && dart.trail.length > 0) {
        dart.trail.shift();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.lineCap = 'round';

    for (const dart of this.darts) {
      if (dart.trail.length > 1) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 1; i < dart.trail.length; i++) {
          const progress = i / dart.trail.length;
          const alpha = progress * 0.35;
          const width = 6 + 12 * progress;
          ctx.beginPath();
          ctx.moveTo(dart.trail[i - 1].x, dart.trail[i - 1].y);
          ctx.lineTo(dart.trail[i].x, dart.trail[i].y);
          ctx.strokeStyle = `rgba(255,100,20,${alpha})`;
          ctx.lineWidth = width;
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';

        for (let i = 1; i < dart.trail.length; i++) {
          const progress = i / dart.trail.length;
          const alpha = progress * 0.85;
          const width = 1 + 3 * progress;
          ctx.beginPath();
          ctx.moveTo(dart.trail[i - 1].x, dart.trail[i - 1].y);
          ctx.lineTo(dart.trail[i].x, dart.trail[i].y);
          ctx.strokeStyle = `rgba(255,200,80,${alpha})`;
          ctx.lineWidth = width;
          ctx.stroke();
        }
      }

      if (dart.active) {
        const grad = ctx.createRadialGradient(
          dart.x, dart.y, 0,
          dart.x, dart.y, 16
        );
        grad.addColorStop(0, 'rgba(255,240,200,0.9)');
        grad.addColorStop(0.3, 'rgba(255,180,60,0.5)');
        grad.addColorStop(1, 'rgba(255,100,20,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(dart.x, dart.y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(dart.x, dart.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  getActiveDarts(): Dart[] {
    return this.darts.filter((d) => d.active);
  }

  deactivateDart(id: number) {
    const dart = this.darts.find((d) => d.id === id);
    if (dart) {
      dart.active = false;
      dart.hitSomething = true;
    }
  }

  getDartRadius(): number {
    return DART_RADIUS;
  }

  clear() {
    this.darts = [];
    this.nextId = 0;
  }
}
