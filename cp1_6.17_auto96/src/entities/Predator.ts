import Fish from './Fish';

export default class Predator extends Fish {
  target: Fish | null;
  eatCount: number;

  static readonly MAX_SPEED = 2.5;
  static readonly CHASE_RADIUS = 200;
  static readonly GROW_THRESHOLD = 3;
  static readonly MAX_RADIUS = 30;
  static readonly CHASE_FORCE = 0.08;
  static readonly WANDER_FORCE = 0.03;
  static readonly MAX_STEER_FORCE = 0.06;

  constructor(x: number, y: number) {
    super(x, y, -1);
    this.radius = 20;
    this.color = '#FF4500';
    this.target = null;
    this.eatCount = 0;
  }

  chase(fishList: Fish[]): void {
    if (this.isSpawning) return;

    let nearestFish: Fish | null = null;
    let nearestDist = Infinity;

    for (const fish of fishList) {
      if (fish.isSpawning) continue;
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestFish = fish;
      }
    }

    this.target = nearestFish;

    if (this.target && nearestDist < Predator.CHASE_RADIUS) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const desiredVx = (dx / dist) * Predator.MAX_SPEED;
        const desiredVy = (dy / dist) * Predator.MAX_SPEED;

        let steerX = desiredVx - this.vx;
        let steerY = desiredVy - this.vy;
        const steerMag = Math.sqrt(steerX * steerX + steerY * steerY);
        if (steerMag > Predator.MAX_STEER_FORCE) {
          steerX = (steerX / steerMag) * Predator.MAX_STEER_FORCE;
          steerY = (steerY / steerMag) * Predator.MAX_STEER_FORCE;
        }

        this.vx += steerX * (Predator.CHASE_FORCE / Predator.MAX_STEER_FORCE);
        this.vy += steerY * (Predator.CHASE_FORCE / Predator.MAX_STEER_FORCE);
      }
    } else {
      const wanderAngle = Math.atan2(this.vy, this.vx) + (Math.random() - 0.5) * 1.5;
      this.vx += Math.cos(wanderAngle) * Predator.WANDER_FORCE;
      this.vy += Math.sin(wanderAngle) * Predator.WANDER_FORCE;
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > Predator.MAX_SPEED) {
      this.vx = (this.vx / speed) * Predator.MAX_SPEED;
      this.vy = (this.vy / speed) * Predator.MAX_SPEED;
    } else if (speed < Fish.MIN_SPEED && speed > 0) {
      this.vx = (this.vx / speed) * Fish.MIN_SPEED;
      this.vy = (this.vy / speed) * Fish.MIN_SPEED;
    }
  }

  move(flock: Fish[], canvasWidth: number, canvasHeight: number, sandHeight: number): void {
    if (this.isSpawning) {
      super.move(flock, canvasWidth, canvasHeight, sandHeight);
      return;
    }

    this.chase(flock);

    let boundaryX = 0, boundaryY = 0;
    const margin = 60;
    const boundaryForce = 0.3;
    if (this.x < margin) boundaryX = boundaryForce * (margin - this.x) / margin;
    if (this.x > canvasWidth - margin) boundaryX = -boundaryForce * (this.x - (canvasWidth - margin)) / margin;
    if (this.y < margin) boundaryY = boundaryForce * (margin - this.y) / margin;
    if (this.y > canvasHeight - sandHeight - margin) boundaryY = -boundaryForce * (this.y - (canvasHeight - sandHeight - margin)) / margin;

    this.vx += boundaryX;
    this.vy += boundaryY;

    this.x += this.vx;
    this.y += this.vy;

    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasHeight - sandHeight - this.radius, this.y));
  }

  eatFish(fishList: Fish[]): boolean {
    if (this.isSpawning) return false;

    for (let i = fishList.length - 1; i >= 0; i--) {
      const fish = fishList[i];
      if (fish.isSpawning) continue;
      
      const dx = fish.x - this.x;
      const dy = fish.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.radius + fish.radius) {
        fishList.splice(i, 1);
        this.eatCount++;
        
        if (this.eatCount >= Predator.GROW_THRESHOLD) {
          this.eatCount = 0;
          this.grow();
        }
        return true;
      }
    }
    return false;
  }

  grow(): void {
    this.radius = Math.min(this.radius + 1, Predator.MAX_RADIUS);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.x + this.radius * 0.35, this.y - this.radius * 0.2, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.x + this.radius * 0.4, this.y - this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(this.x - this.radius * 0.8, this.y);
    ctx.lineTo(this.x - this.radius * 1.3, this.y - this.radius * 0.4);
    ctx.lineTo(this.x - this.radius * 1.3, this.y + this.radius * 0.4);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();

    if (this.isEndangered) {
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#FF0000';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x, this.y - this.radius - 10);
    }
  }
}
