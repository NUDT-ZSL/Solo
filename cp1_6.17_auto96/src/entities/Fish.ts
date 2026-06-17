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
  static readonly MIN_SPEED = 0.5;
  static readonly PERCEPTION_RADIUS = 100;
  static readonly SEPARATION_RADIUS = 30;
  static readonly SEPARATION_WEIGHT = 1.5;
  static readonly ALIGNMENT_WEIGHT = 1.0;
  static readonly COHESION_WEIGHT = 1.0;
  static readonly BOUNDARY_WEIGHT = 0.5;
  static readonly MAX_FORCE = 0.05;

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

    let separationForceX = 0, separationForceY = 0;
    let alignmentForceX = 0, alignmentForceY = 0;
    let cohesionForceX = 0, cohesionForceY = 0;
    let separationCount = 0;
    let neighborCount = 0;

    for (const other of flock) {
      if (other === this || other.isSpawning) continue;
      
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < Fish.SEPARATION_RADIUS * Fish.SEPARATION_RADIUS && distSq > 0) {
        const dist = Math.sqrt(distSq);
        const repelStrength = (Fish.SEPARATION_RADIUS - dist) / Fish.SEPARATION_RADIUS;
        separationForceX -= (dx / dist) * repelStrength;
        separationForceY -= (dy / dist) * repelStrength;
        separationCount++;
      }

      if (distSq < Fish.PERCEPTION_RADIUS * Fish.PERCEPTION_RADIUS && other.groupID === this.groupID) {
        alignmentForceX += other.vx;
        alignmentForceY += other.vy;

        cohesionForceX += other.x;
        cohesionForceY += other.y;
        neighborCount++;
      }
    }

    let steerX = 0, steerY = 0;

    if (separationCount > 0) {
      separationForceX /= separationCount;
      separationForceY /= separationCount;
      const sepMag = Math.sqrt(separationForceX * separationForceX + separationForceY * separationForceY);
      if (sepMag > 0) {
        separationForceX = (separationForceX / sepMag) * Fish.MAX_SPEED - this.vx;
        separationForceY = (separationForceY / sepMag) * Fish.MAX_SPEED - this.vy;
        const sepForceMag = Math.sqrt(separationForceX * separationForceX + separationForceY * separationForceY);
        if (sepForceMag > Fish.MAX_FORCE) {
          separationForceX = (separationForceX / sepForceMag) * Fish.MAX_FORCE;
          separationForceY = (separationForceY / sepForceMag) * Fish.MAX_FORCE;
        }
      }
      steerX += separationForceX * Fish.SEPARATION_WEIGHT;
      steerY += separationForceY * Fish.SEPARATION_WEIGHT;
    }

    if (neighborCount > 0) {
      alignmentForceX /= neighborCount;
      alignmentForceY /= neighborCount;
      const aliMag = Math.sqrt(alignmentForceX * alignmentForceX + alignmentForceY * alignmentForceY);
      if (aliMag > 0) {
        alignmentForceX = (alignmentForceX / aliMag) * Fish.MAX_SPEED - this.vx;
        alignmentForceY = (alignmentForceY / aliMag) * Fish.MAX_SPEED - this.vy;
        const aliForceMag = Math.sqrt(alignmentForceX * alignmentForceX + alignmentForceY * alignmentForceY);
        if (aliForceMag > Fish.MAX_FORCE) {
          alignmentForceX = (alignmentForceX / aliForceMag) * Fish.MAX_FORCE;
          alignmentForceY = (alignmentForceY / aliForceMag) * Fish.MAX_FORCE;
        }
      }
      steerX += alignmentForceX * Fish.ALIGNMENT_WEIGHT;
      steerY += alignmentForceY * Fish.ALIGNMENT_WEIGHT;

      cohesionForceX = cohesionForceX / neighborCount - this.x;
      cohesionForceY = cohesionForceY / neighborCount - this.y;
      const cohMag = Math.sqrt(cohesionForceX * cohesionForceX + cohesionForceY * cohesionForceY);
      if (cohMag > 0) {
        cohesionForceX = (cohesionForceX / cohMag) * Fish.MAX_SPEED - this.vx;
        cohesionForceY = (cohesionForceY / cohMag) * Fish.MAX_SPEED - this.vy;
        const cohForceMag = Math.sqrt(cohesionForceX * cohesionForceX + cohesionForceY * cohesionForceY);
        if (cohForceMag > Fish.MAX_FORCE) {
          cohesionForceX = (cohesionForceX / cohForceMag) * Fish.MAX_FORCE;
          cohesionForceY = (cohesionForceY / cohForceMag) * Fish.MAX_FORCE;
        }
      }
      steerX += cohesionForceX * Fish.COHESION_WEIGHT;
      steerY += cohesionForceY * Fish.COHESION_WEIGHT;
    }

    let boundaryX = 0, boundaryY = 0;
    const margin = 60;
    if (this.x < margin) boundaryX = Fish.BOUNDARY_WEIGHT * (margin - this.x) / margin;
    if (this.x > canvasWidth - margin) boundaryX = -Fish.BOUNDARY_WEIGHT * (this.x - (canvasWidth - margin)) / margin;
    if (this.y < margin) boundaryY = Fish.BOUNDARY_WEIGHT * (margin - this.y) / margin;
    if (this.y > canvasHeight - sandHeight - margin) boundaryY = -Fish.BOUNDARY_WEIGHT * (this.y - (canvasHeight - sandHeight - margin)) / margin;

    this.vx += steerX + boundaryX;
    this.vy += steerY + boundaryY;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > Fish.MAX_SPEED) {
      this.vx = (this.vx / speed) * Fish.MAX_SPEED;
      this.vy = (this.vy / speed) * Fish.MAX_SPEED;
    } else if (speed < Fish.MIN_SPEED && speed > 0) {
      this.vx = (this.vx / speed) * Fish.MIN_SPEED;
      this.vy = (this.vy / speed) * Fish.MIN_SPEED;
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
