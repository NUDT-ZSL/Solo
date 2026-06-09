export interface PlayerState {
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  targetRadius: number;
  health: number;
  maxHealth: number;
  isIgnited: boolean;
  igniteCooldown: number;
  pulsePhase: number;
  pulseBrightness: number;
}

export class Player {
  public state: PlayerState;
  private readonly NORMAL_RADIUS = 150;
  private readonly IGNITED_RADIUS = 250;
  private readonly RADIUS_TRANSITION_MS = 300;
  private readonly IGNITE_COST_PER_SEC = 2;
  private readonly COOLDOWN_MS = 5000;
  private readonly PULSE_PERIOD_MS = 1200;
  private readonly MOVE_SPEED = 180;

  constructor(startX: number, startY: number) {
    this.state = {
      x: startX,
      y: startY,
      baseRadius: this.NORMAL_RADIUS,
      currentRadius: this.NORMAL_RADIUS,
      targetRadius: this.NORMAL_RADIUS,
      health: 100,
      maxHealth: 100,
      isIgnited: false,
      igniteCooldown: 0,
      pulsePhase: 0,
      pulseBrightness: 0.8
    };
  }

  move(dx: number, dy: number, deltaTime: number, isWallAt: (x: number, y: number) => boolean): void {
    const dt = deltaTime / 1000;
    const speed = this.MOVE_SPEED * dt;
    
    let ndx = dx;
    let ndy = dy;
    const len = Math.hypot(ndx, ndy);
    if (len > 0) {
      ndx = (ndx / len) * speed;
      ndy = (ndy / len) * speed;
    }

    const newX = this.state.x + ndx;
    if (!isWallAt(newX, this.state.y)) {
      this.state.x = newX;
    }

    const newY = this.state.y + ndy;
    if (!isWallAt(this.state.x, newY)) {
      this.state.y = newY;
    }
  }

  toggleIgnite(): void {
    if (this.state.igniteCooldown > 0) return;

    if (!this.state.isIgnited) {
      this.state.isIgnited = true;
      this.state.targetRadius = this.IGNITED_RADIUS;
    } else {
      this.exitIgnite();
    }
  }

  private exitIgnite(): void {
    this.state.isIgnited = false;
    this.state.targetRadius = this.NORMAL_RADIUS;
    this.state.igniteCooldown = this.COOLDOWN_MS;
  }

  update(deltaTime: number): void {
    this.state.pulsePhase += deltaTime;
    const t = (this.state.pulsePhase % this.PULSE_PERIOD_MS) / this.PULSE_PERIOD_MS;
    this.state.pulseBrightness = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));

    if (this.state.currentRadius !== this.state.targetRadius) {
      const diff = this.state.targetRadius - this.state.currentRadius;
      const step = (this.IGNITED_RADIUS - this.NORMAL_RADIUS) * (deltaTime / this.RADIUS_TRANSITION_MS);
      if (Math.abs(diff) <= step) {
        this.state.currentRadius = this.state.targetRadius;
      } else {
        this.state.currentRadius += Math.sign(diff) * step;
      }
    }

    if (this.state.isIgnited) {
      this.state.health -= this.IGNITE_COST_PER_SEC * (deltaTime / 1000);
      if (this.state.health <= 0) {
        this.state.health = 0;
        this.exitIgnite();
      }
    } else if (this.state.igniteCooldown > 0) {
      this.state.igniteCooldown -= deltaTime;
      if (this.state.igniteCooldown < 0) {
        this.state.igniteCooldown = 0;
      }
    }

    if (!this.state.isIgnited && this.state.health < this.state.maxHealth && this.state.igniteCooldown <= 0) {
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 5 * (deltaTime / 1000));
    }
  }
}
