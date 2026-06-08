export interface KiteState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tilt: number;
  targetTilt: number;
  isDashing: boolean;
  dashTimer: number;
  energy: number;
  maxEnergy: number;
  invincible: boolean;
  invincibleTimer: number;
  bobPhase: number;
  width: number;
  height: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dash: boolean;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
}

const ACCELERATION = 1800;
const FRICTION = 0.92;
const MAX_SPEED = 500;
const DASH_SPEED = 1200;
const DASH_DURATION = 0.5;
const DASH_ENERGY_COST = 100;
const BOB_AMPLITUDE = 8;
const BOB_SPEED = 3;
const TILT_LERP = 0.12;
const INVINCIBLE_DURATION = 1.0;
const TRAIL_MAX = 20;

export class KiteController {
  state: KiteState;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = this.createInitialState();
  }

  private createInitialState(): KiteState {
    return {
      x: this.canvasWidth * 0.2,
      y: this.canvasHeight * 0.5,
      vx: 0,
      vy: 0,
      tilt: 0,
      targetTilt: 0,
      isDashing: false,
      dashTimer: 0,
      energy: 0,
      maxEnergy: 100,
      invincible: false,
      invincibleTimer: 0,
      bobPhase: 0,
      width: 64,
      height: 48,
      trail: [],
    };
  }

  reset(): void {
    this.state = this.createInitialState();
  }

  resize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  addEnergy(amount: number): void {
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + amount);
  }

  update(dt: number, input: InputState): void {
    const s = this.state;

    if (s.invincible) {
      s.invincibleTimer -= dt;
      if (s.invincibleTimer <= 0) {
        s.invincible = false;
      }
    }

    if (s.isDashing) {
      s.dashTimer -= dt;
      if (s.dashTimer <= 0) {
        s.isDashing = false;
        s.vx *= 0.3;
        s.vy *= 0.3;
      } else {
        s.vx = DASH_SPEED;
        s.vy = 0;
        s.targetTilt = -0.15;
        this.updateTrail(s);
        this.updatePosition(s, dt);
        return;
      }
    }

    if (input.dash && s.energy >= DASH_ENERGY_COST && !s.isDashing) {
      s.isDashing = true;
      s.dashTimer = DASH_DURATION;
      s.energy -= DASH_ENERGY_COST;
      s.vx = DASH_SPEED;
      s.vy = 0;
      s.targetTilt = -0.15;
      this.updateTrail(s);
      this.updatePosition(s, dt);
      return;
    }

    let ax = 0;
    let ay = 0;

    if (input.mouseDown) {
      const dx = input.mouseX - s.x;
      const dy = input.mouseY - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        ax = (dx / dist) * ACCELERATION;
        ay = (dy / dist) * ACCELERATION;
      }
    } else {
      if (input.up) ay -= ACCELERATION;
      if (input.down) ay += ACCELERATION;
      if (input.left) ax -= ACCELERATION;
      if (input.right) ax += ACCELERATION;
    }

    s.vx += ax * dt;
    s.vy += ay * dt;
    s.vx *= FRICTION;
    s.vy *= FRICTION;

    const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (speed > MAX_SPEED) {
      s.vx = (s.vx / speed) * MAX_SPEED;
      s.vy = (s.vy / speed) * MAX_SPEED;
    }

    if (Math.abs(s.vx) > 10) {
      s.targetTilt = (s.vy / MAX_SPEED) * 0.5 + (s.vx > 0 ? -0.05 : 0.1);
    } else {
      s.targetTilt *= 0.9;
    }
    s.tilt += (s.targetTilt - s.tilt) * TILT_LERP;

    s.bobPhase += BOB_SPEED * dt;

    this.updateTrail(s);
    this.updatePosition(s, dt);
  }

  private updateTrail(s: KiteState): void {
    s.trail.unshift({ x: s.x - s.width * 0.3, y: s.y, alpha: 1 });
    if (s.trail.length > TRAIL_MAX) {
      s.trail.pop();
    }
    for (let i = 0; i < s.trail.length; i++) {
      s.trail[i].alpha = 1 - i / TRAIL_MAX;
    }
  }

  private updatePosition(s: KiteState, dt: number): void {
    const bobOffset = Math.sin(s.bobPhase) * BOB_AMPLITUDE;
    s.x += s.vx * dt;
    s.y += s.vy * dt + bobOffset * dt * 0.5;

    const margin = 20;
    s.x = Math.max(margin, Math.min(this.canvasWidth - margin, s.x));
    s.y = Math.max(margin, Math.min(this.canvasHeight - margin, s.y));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.state;

    this.drawTrail(ctx, s);

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.tilt);

    if (s.invincible && Math.floor(s.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (s.isDashing) {
      ctx.shadowColor = '#c0392b';
      ctx.shadowBlur = 30;
    }

    this.drawKiteBody(ctx, s);

    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D, s: KiteState): void {
    if (s.trail.length < 2) return;
    ctx.save();
    for (let i = 1; i < s.trail.length; i++) {
      const p = s.trail[i];
      const prev = s.trail[i - 1];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = `rgba(192, 57, 43, ${p.alpha * 0.4})`;
      ctx.lineWidth = 2 * p.alpha;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawKiteBody(ctx: CanvasRenderingContext2D, s: KiteState): void {
    const w = s.width;
    const h = s.height;

    ctx.beginPath();
    ctx.moveTo(w * 0.5, 0);
    ctx.bezierCurveTo(w * 0.5, -h * 0.1, w * 0.1, -h * 0.3, -w * 0.1, -h * 0.15);
    ctx.bezierCurveTo(-w * 0.2, -h * 0.05, -w * 0.3, 0, -w * 0.3, 0);
    ctx.bezierCurveTo(-w * 0.3, 0, -w * 0.2, h * 0.05, -w * 0.1, h * 0.15);
    ctx.bezierCurveTo(w * 0.1, h * 0.3, w * 0.5, h * 0.1, w * 0.5, 0);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-w * 0.3, -h * 0.3, w * 0.5, h * 0.3);
    grad.addColorStop(0, '#c0392b');
    grad.addColorStop(0.5, '#e74c3c');
    grad.addColorStop(1, '#a93226');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#2c1810';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.5, 0);
    ctx.lineTo(-w * 0.3, 0);
    ctx.strokeStyle = '#2c1810';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.1, -h * 0.2);
    ctx.lineTo(w * 0.1, h * 0.2);
    ctx.strokeStyle = '#2c1810';
    ctx.lineWidth = 1;
    ctx.stroke();

    const tailLen = 40;
    const tailPhase = s.bobPhase * 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, 0);
    for (let i = 0; i < tailLen; i++) {
      const tx = -w * 0.3 - i * 1.5;
      const ty = Math.sin(tailPhase + i * 0.15) * (5 + i * 0.2);
      ctx.lineTo(tx, ty);
    }
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      const bx = -w * 0.3 - (i + 1) * 12;
      const by = Math.sin(tailPhase + (i + 1) * 12 * 0.15) * (5 + (i + 1) * 12 * 0.2);
      ctx.beginPath();
      ctx.moveTo(bx - 4, by);
      ctx.lineTo(bx, by - 4);
      ctx.lineTo(bx + 4, by);
      ctx.lineTo(bx, by + 4);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? '#1a6b3c' : '#c0392b';
      ctx.fill();
    }
  }

  getHitbox(): { x: number; y: number; w: number; h: number } {
    const s = this.state;
    return {
      x: s.x - s.width * 0.25,
      y: s.y - s.height * 0.25,
      w: s.width * 0.5,
      h: s.height * 0.5,
    };
  }
}
