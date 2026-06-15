export interface Point {
  x: number;
  y: number;
}

export class LightBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  energy: number;
  maxEnergy: number;
  trail: Point[];
  isMoving: boolean;
  private friction: number;
  private maxSpeed: number;
  private stopThreshold: number;
  private maxTrailLength: number;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.energy = 100;
    this.maxEnergy = 100;
    this.trail = [];
    this.isMoving = false;
    this.friction = 0.6;
    this.maxSpeed = 600;
    this.stopThreshold = 15;
    this.maxTrailLength = 60;
  }

  launch(dirX: number, dirY: number, force: number): void {
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len < 0.001) return;
    const nx = dirX / len;
    const ny = dirY / len;
    const speed = Math.min(force, this.maxSpeed);
    this.vx = nx * speed;
    this.vy = ny * speed;
    this.isMoving = true;
  }

  reflect(axis: 'x' | 'y', wallBounceCount: number): void {
    const offsetDeg = 5 + Math.random() * 5;
    const sign = Math.random() < 0.5 ? 1 : -1;
    const offsetRad = (sign * offsetDeg * Math.PI) / 180;

    if (axis === 'x') {
      this.vx = -this.vx;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const angle = Math.atan2(this.vy, this.vx) + offsetRad;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    } else {
      this.vy = -this.vy;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const angle = Math.atan2(this.vy, this.vx) + offsetRad;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }

    void wallBounceCount;
  }

  update(dt: number): void {
    if (!this.isMoving) return;

    const decay = Math.pow(this.friction, dt);
    this.vx *= decay;
    this.vy *= decay;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed < this.stopThreshold) {
      this.vx = 0;
      this.vy = 0;
      this.isMoving = false;
    }
  }

  drainEnergy(amount: number): void {
    this.energy = Math.max(0, this.energy - amount);
  }

  stop(): void {
    this.vx = 0;
    this.vy = 0;
    this.isMoving = false;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    this.isMoving = false;
    this.energy = this.maxEnergy;
  }

  getSpeed(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}
