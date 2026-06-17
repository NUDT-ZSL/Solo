import Algae from './Algae';

export default class Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  groupID: number;
  eatTimer: number;
  isSpawning: boolean;
  spawnStartX: number;
  spawnStartY: number;
  spawnTargetX: number;
  spawnTargetY: number;
  spawnProgress: number;
  isEndangered: boolean;

  static readonly MAX_SPEED = 2;
  static readonly PERCEPTION_RADIUS = 80;
  static readonly SEPARATION_RADIUS = 25;
  static readonly ALIGNMENT_WEIGHT = 0.05;
  static readonly COHESION_WEIGHT = 0.01;
  static readonly SEPARATION_WEIGHT = 0.1;
  static readonly BOUNDARY_WEIGHT = 0.1;

  constructor(x: number, y: number, groupID: number = 0) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.radius = 10;
    this.color = '#FFD700';
    this.groupID = groupID;
    this.eatTimer = 0;
    this.isSpawning = false;
    this.spawnStartX = x;
    this.spawnStartY = y;
    this.spawnTargetX = x;
    this.spawnTargetY = y;
    this.spawnProgress = 0;
    this.isEndangered = false;
  }

  startSpawning(fromX: number, fromY: number, toX: number, toY: number): void {
    this.isSpawning = true;
    this.spawnStartX = fromX;
    this.spawnStartY = fromY;
    this.spawnTargetX = toX;
    this.spawnTargetY = toY;
    this.spawnProgress = 0;
    this.x = fromX;
    this.y = fromY;
  }

  move(flock: Fish[], canvasWidth: number, canvasHeight: number, sandHeight: number): void {
    if (this.isSpawning) {
      this.spawnProgress += 1 / 30;
      const t = Math.min(this.spawnProgress, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const bounce = Math.sin(t * Math.PI) * 30 * (1 - t);
      
      this.x = this.spawnStartX + (this.spawnTargetX - this.spawnStartX) * easeOut;
      this.y = this.spawnStartY + (this.spawnTargetY - this.spawnStartY) * easeOut - bounce;
      
      if (t >= 1) {
        this.isSpawning = false;
        this.x = this.spawnTargetX;
        this.y = this.spawnTargetY;
      }
      return;
    }

    let separationX = 0, separationY = 0;
    let alignmentX = 0, alignmentY = 0;
    let cohesionX = 0, cohesionY = 0;
    let separationCount = 0;
    let alignmentCount = 0;
    let cohesionCount = 0;

    for (const other of flock) {
      if (other === this) continue;
      
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < Fish.SEPARATION_RADIUS && dist > 0) {
        separationX -= dx / dist;
        separationY -= dy / dist;
        separationCount++;
      }

      if (dist < Fish.PERCEPTION_RADIUS && other.groupID === this.groupID) {
        alignmentX += other.vx;
        alignmentY += other.vy;
        alignmentCount++;
        
        cohesionX += other.x;
        cohesionY += other.y;
        cohesionCount++;
      }
    }

    if (separationCount > 0) {
      separationX /= separationCount;
      separationY /= separationCount;
    }

    if (alignmentCount > 0) {
      alignmentX /= alignmentCount;
      alignmentY /= alignmentCount;
    }

    if (cohesionCount > 0) {
      cohesionX = (cohesionX / cohesionCount - this.x) * 0.01;
      cohesionY = (cohesionY / cohesionCount - this.y) * 0.01;
    }

    let boundaryX = 0, boundaryY = 0;
    const margin = 50;
    if (this.x < margin) boundaryX = Fish.BOUNDARY_WEIGHT;
    if (this.x > canvasWidth - margin) boundaryX = -Fish.BOUNDARY_WEIGHT;
    if (this.y < margin) boundaryY = Fish.BOUNDARY_WEIGHT;
    if (this.y > canvasHeight - sandHeight - margin) boundaryY = -Fish.BOUNDARY_WEIGHT;

    this.vx += separationX * Fish.SEPARATION_WEIGHT;
    this.vy += separationY * Fish.SEPARATION_WEIGHT;
    this.vx += alignmentX * Fish.ALIGNMENT_WEIGHT;
    this.vy += alignmentY * Fish.ALIGNMENT_WEIGHT;
    this.vx += cohesionX * Fish.COHESION_WEIGHT;
    this.vy += cohesionY * Fish.COHESION_WEIGHT;
    this.vx += boundaryX;
    this.vy += boundaryY;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > Fish.MAX_SPEED) {
      this.vx = (this.vx / speed) * Fish.MAX_SPEED;
      this.vy = (this.vy / speed) * Fish.MAX_SPEED;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(canvasHeight - sandHeight - this.radius, this.y));
  }

  eat(algaeList: Algae[], deltaTime: number): boolean {
    if (this.isSpawning) return false;
    
    this.eatTimer += deltaTime;
    if (this.eatTimer < 10) return false;

    for (let i = algaeList.length - 1; i >= 0; i--) {
      const algae = algaeList[i];
      const dx = algae.x - this.x;
      const dy = algae.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.radius + algae.radius) {
        this.eatTimer = 0;
        algaeList.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  grow(): void {
    this.radius = Math.min(this.radius + 0.5, 15);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.x + this.radius * 0.3, this.y - this.radius * 0.2, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.x + this.radius * 0.35, this.y - this.radius * 0.2, this.radius * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.closePath();

    if (this.isEndangered) {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#FF0000';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x, this.y - this.radius - 8);
    }
  }
}
