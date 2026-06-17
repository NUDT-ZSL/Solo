export default class Algae {
  x: number;
  y: number;
  radius: number;
  color: string;
  age: number;
  reproduceTimer: number;
  isSpawning: boolean;
  spawnStartX: number;
  spawnStartY: number;
  spawnTargetX: number;
  spawnTargetY: number;
  spawnProgress: number;
  isEndangered: boolean;

  static readonly REPRODUCE_INTERVAL = 15;
  static readonly REPRODUCE_RADIUS = 40;
  static readonly OVERLAP_CHECK_ATTEMPTS = 5;
  static readonly MIN_SPAWN_DISTANCE = 18;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.color = '#2ECC40';
    this.age = 0;
    this.reproduceTimer = Math.random() * Algae.REPRODUCE_INTERVAL;
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

  grow(deltaTime: number): void {
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

    this.age += deltaTime;
    this.reproduceTimer += deltaTime;
  }

  reproduce(canvasWidth: number, canvasHeight: number, sandHeight: number, existingAlgae: Algae[]): Algae | null {
    if (this.isSpawning) return null;
    if (this.reproduceTimer < Algae.REPRODUCE_INTERVAL) return null;

    this.reproduceTimer = 0;

    for (let attempt = 0; attempt < Algae.OVERLAP_CHECK_ATTEMPTS; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Algae.REPRODUCE_RADIUS;
      let newX = this.x + Math.cos(angle) * dist;
      let newY = this.y + Math.sin(angle) * dist;

      newX = Math.max(this.radius, Math.min(canvasWidth - this.radius, newX));
      newY = Math.max(this.radius, Math.min(canvasHeight - sandHeight - this.radius, newY));

      let overlaps = false;
      for (const other of existingAlgae) {
        if (other === this) continue;
        const dx = other.x - newX;
        const dy = other.y - newY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < Algae.MIN_SPAWN_DISTANCE) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        return new Algae(newX, newY);
      }
    }

    return null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pulseScale = 1 + Math.sin(this.age * 2) * 0.1;
    const drawRadius = this.radius * pulseScale;

    ctx.beginPath();
    ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(this.x, this.y, drawRadius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#3DFF5C';
    ctx.fill();
    ctx.closePath();

    if (this.isEndangered) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#FF0000';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.x, this.y - this.radius - 8);
    }
  }
}
