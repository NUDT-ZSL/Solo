export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ParticleParams {
  tailLength: number;
  speed: number;
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
  public tailLength: number = 60;
  public speed: number = 1.0;
  public baseRadius: number = 2;

  public tailPoints: Vector3[] = [];
  private _maxTailPoints: number = 20;

  constructor() {
    this.tailPoints = [];
    for (let i = 0; i < this._maxTailPoints; i++) {
      this.tailPoints.push({ x: 0, y: 0, z: 0 });
    }
  }

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
    speed: number
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
    this.tailLength = tailLength;
    this.speed = speed;

    const tailCount = Math.min(this._maxTailPoints, Math.max(3, Math.floor(tailLength / 4)));
    for (let i = 0; i < tailCount; i++) {
      this.tailPoints[i].x = x;
      this.tailPoints[i].y = y;
      this.tailPoints[i].z = z;
    }
    for (let i = tailCount; i < this._maxTailPoints; i++) {
      this.tailPoints[i].x = x;
      this.tailPoints[i].y = y;
      this.tailPoints[i].z = z;
    }
  }

  public update(deltaTime: number, gravity: number): boolean {
    if (!this.active) return false;

    const dt = deltaTime * this.speed;

    for (let i = this._maxTailPoints - 1; i > 0; i--) {
      this.tailPoints[i].x = this.tailPoints[i - 1].x;
      this.tailPoints[i].y = this.tailPoints[i - 1].y;
      this.tailPoints[i].z = this.tailPoints[i - 1].z;
    }
    this.tailPoints[0].x = this.x;
    this.tailPoints[0].y = this.y;
    this.tailPoints[0].z = this.z;

    this.vy += gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;

    this.life += deltaTime;

    if (this.life >= this.maxLife) {
      const fadeStart = this.maxLife * 0.7;
      if (this.life > fadeStart) {
        this.opacity = 0.8 * (1 - (this.life - fadeStart) / (this.maxLife - fadeStart));
      }
    }

    return this.life < this.maxLife;
  }

  public getTailPointCount(): number {
    return Math.min(this._maxTailPoints, Math.max(3, Math.floor(this.tailLength / 4)));
  }

  public getVelocity(): number {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy + this.vz * this.vz);
  }

  public getRemainingLife(): number {
    return Math.max(0, this.maxLife - this.life);
  }
}
