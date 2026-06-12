export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export class Particle {
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public vz: number = 0;
  public radius: number = 2;
  public opacity: number = 0.8;
  public life: number = 0;
  public maxLife: number = 0;
  public active: boolean = false;
  public baseTailLength: number = 60;
  public tailLength: number = 60;
  public baseRadius: number = 2;

  public reset(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    radius: number,
    maxLife: number,
    tailLength: number,
    globalTailScale: number
  ): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.radius = radius;
    this.baseRadius = radius;
    this.opacity = 0.8;
    this.life = 0;
    this.maxLife = maxLife;
    this.active = true;
    this.baseTailLength = tailLength;
    this.tailLength = tailLength * globalTailScale;
  }

  public update(deltaTime: number, gravity: number, speedMultiplier: number): boolean {
    if (!this.active) return false;

    const dt = deltaTime * speedMultiplier;

    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;

    this.life += deltaTime;

    const fadeStart = this.maxLife * 0.7;
    if (this.life > fadeStart) {
      this.opacity = 0.8 * (1 - (this.life - fadeStart) / (this.maxLife - fadeStart));
    }

    return this.life < this.maxLife;
  }

  public getVelocity(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy + this.vz * this.vz);
  }

  public getRemainingLife(): number {
    return Math.max(0, this.maxLife - this.life);
  }
}
