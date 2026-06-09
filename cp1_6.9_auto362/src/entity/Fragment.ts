export class Fragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  colorT: number;
  flickerPeriod: number;
  flickerPhase: number;
  rotation: number;
  rotationSpeed: number;
  picked: boolean;
  pickProgress: number;
  pickDuration: number;
  birthTime: number;
  spawnProgress: number;
  spawnDuration: number;
  alive: boolean;
  id: number;

  private static nextId = 0;

  constructor(x: number, y: number, targetX?: number, targetY?: number) {
    this.x = x;
    this.y = y;
    this.baseSize = 6 + Math.random() * 6;
    this.size = this.baseSize;
    this.colorT = Math.random();
    this.flickerPeriod = 0.5 + Math.random() * 1;
    this.flickerPhase = Math.random() * Math.PI * 2;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (10 * Math.PI / 180) / 60;
    this.picked = false;
    this.pickProgress = 0;
    this.pickDuration = 0.5 * 60;
    this.birthTime = Date.now();
    this.spawnProgress = 0;
    this.spawnDuration = 0.3 * 60;
    this.alive = true;
    this.id = Fragment.nextId++;

    const speed = 0.2 + Math.random() * 0.3;
    if (targetX !== undefined && targetY !== undefined) {
      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
    } else {
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }
  }

  pickUp(): void {
    if (this.picked) return;
    this.picked = true;
    this.pickProgress = 0;
  }

  getParticleCount(): number {
    return 2 + Math.floor(Math.random() * 3);
  }

  update(canvasWidth: number, canvasHeight: number): boolean {
    if (!this.alive) return false;

    if (this.spawnProgress < this.spawnDuration) {
      this.spawnProgress++;
    }

    if (this.picked) {
      this.pickProgress++;
      const t = this.pickProgress / this.pickDuration;
      this.size = this.baseSize * (1 - t);
      if (this.pickProgress >= this.pickDuration) {
        this.alive = false;
        return false;
      }
      return true;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    const margin = 100;
    if (this.x < -margin || this.x > canvasWidth + margin ||
        this.y < -margin || this.y > canvasHeight + margin) {
      this.alive = false;
      return false;
    }

    return true;
  }

  checkCollision(spiritX: number, spiritY: number, threshold: number = 20): boolean {
    if (this.picked || !this.alive) return false;
    const dx = this.x - spiritX;
    const dy = this.y - spiritY;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  }

  private interpolateColor(t: number): string {
    const gold: [number, number, number] = [255, 215, 0];
    const blue: [number, number, number] = [135, 206, 235];
    const r = Math.round(gold[0] + (blue[0] - gold[0]) * t);
    const g = Math.round(gold[1] + (blue[1] - gold[1]) * t);
    const b = Math.round(gold[2] + (blue[2] - gold[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  getFlickerAlpha(): number {
    const time = Date.now() / 1000;
    const t = Math.sin(time * (Math.PI * 2) / this.flickerPeriod + this.flickerPhase);
    return 0.3 + (t + 1) / 2 * 0.7;
  }

  getSpawnAlpha(): number {
    if (this.spawnProgress < this.spawnDuration) {
      return this.spawnProgress / this.spawnDuration;
    }
    return 1;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const alpha = this.getFlickerAlpha() * this.getSpawnAlpha();
    if (alpha <= 0) return;

    const color = this.interpolateColor(this.colorT);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = alpha;

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 4);
    glowGradient.addColorStop(0, color);
    glowGradient.addColorStop(0.3, color);
    glowGradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.fillStyle = glowGradient;
    ctx.arc(0, 0, this.size * 4, 0, Math.PI * 2);
    ctx.fill();

    const s = this.size;
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.5);
    ctx.lineTo(s * 0.5, -s * 0.3);
    ctx.lineTo(s * 1.5, 0);
    ctx.lineTo(s * 0.5, s * 0.3);
    ctx.lineTo(0, s * 1.5);
    ctx.lineTo(-s * 0.5, s * 0.3);
    ctx.lineTo(-s * 1.5, 0);
    ctx.lineTo(-s * 0.5, -s * 0.3);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(s * 0.8, 0);
    ctx.lineTo(0, s * 0.8);
    ctx.lineTo(-s * 0.8, 0);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();

    ctx.restore();
  }
}
