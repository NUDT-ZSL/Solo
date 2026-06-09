export interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface StarClusterData {
  id: string;
  x: number;
  y: number;
  letter: string;
  hue: number;
  createdAt: number;
  particles: Array<{
    offsetX: number;
    offsetY: number;
    vx: number;
    vy: number;
    radius: number;
  }>;
}

export class StarCluster {
  public id: string;
  public x: number;
  public y: number;
  public letter: string;
  public hue: number;
  public createdAt: number;
  public particles: Particle[];
  public isHovered: boolean = false;
  public opacity: number = 1;
  public dissipating: boolean = false;
  public dissipateProgress: number = 0;

  private static readonly HOVER_RADIUS = 25;
  private static readonly HALO_RADIUS = 20;
  private static readonly BROWNIAN_RANGE = 3;
  private static readonly BROWNIAN_SPEED = 0.1;

  constructor(x: number, y: number, letter: string, hue?: number, existingData?: StarClusterData) {
    this.id = existingData?.id || `cluster_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.x = x;
    this.y = y;
    this.letter = letter.toUpperCase();
    this.hue = hue ?? (200 + Math.random() * 100);
    this.createdAt = existingData?.createdAt || Date.now();
    this.particles = [];

    if (existingData) {
      this.particles = existingData.particles.map(p => ({
        x: this.x + p.offsetX,
        y: this.y + p.offsetY,
        baseX: this.x + p.offsetX,
        baseY: this.y + p.offsetY,
        vx: p.vx,
        vy: p.vy,
        radius: p.radius,
        color: `hsl(${this.hue + (Math.random() * 20 - 10)}, 90%, 100%)`
      }));
    } else {
      const particleCount = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 12;
        const offsetX = Math.cos(angle) * dist;
        const offsetY = Math.sin(angle) * dist;
        const radius = 2 + Math.random() * 2;

        this.particles.push({
          x: this.x + offsetX,
          y: this.y + offsetY,
          baseX: this.x + offsetX,
          baseY: this.y + offsetY,
          vx: (Math.random() - 0.5) * StarCluster.BROWNIAN_SPEED * 2,
          vy: (Math.random() - 0.5) * StarCluster.BROWNIAN_SPEED * 2,
          radius,
          color: `hsl(${this.hue + (Math.random() * 20 - 10)}, 90%, 100%)`
        });
      }
    }
  }

  public update(): void {
    if (this.dissipating) {
      this.dissipateProgress += 1 / 120;
      if (this.dissipateProgress >= 1) {
        this.dissipateProgress = 1;
      }
      this.opacity = Math.max(0, 1 - this.dissipateProgress);

      for (const p of this.particles) {
        const dx = p.x - this.x;
        const dy = p.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 0.5 + this.dissipateProgress * 3;
        p.x += (dx / dist) * speed;
        p.y += (dy / dist) * speed;
      }
      return;
    }

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      const dx = p.x - p.baseX;
      const dy = p.y - p.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > StarCluster.BROWNIAN_RANGE) {
        p.vx -= (dx / dist) * StarCluster.BROWNIAN_SPEED * 0.5;
        p.vy -= (dy / dist) * StarCluster.BROWNIAN_SPEED * 0.5;
      }

      if (Math.random() < 0.05) {
        p.vx += (Math.random() - 0.5) * StarCluster.BROWNIAN_SPEED;
        p.vy += (Math.random() - 0.5) * StarCluster.BROWNIAN_SPEED;
      }

      const maxSpeed = StarCluster.BROWNIAN_SPEED * 2;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const scale = this.isHovered ? 1.2 : 1;
    const alpha = this.opacity;

    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);
    ctx.translate(-this.x, -this.y);

    const haloGradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, StarCluster.HALO_RADIUS * scale
    );
    haloGradient.addColorStop(0, `hsla(${this.hue}, 90%, 70%, 0.2)`);
    haloGradient.addColorStop(0.5, `hsla(${this.hue}, 90%, 60%, 0.08)`);
    haloGradient.addColorStop(1, `hsla(${this.hue}, 90%, 50%, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, StarCluster.HALO_RADIUS * scale, 0, Math.PI * 2);
    ctx.fillStyle = haloGradient;
    ctx.fill();

    for (const p of this.particles) {
      const glowGradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.radius * 3
      );
      glowGradient.addColorStop(0, p.color);
      glowGradient.addColorStop(0.4, `hsla(${this.hue}, 90%, 80%, 0.4)`);
      glowGradient.addColorStop(1, 'hsla(0, 0%, 100%, 0)');

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    }

    ctx.restore();
  }

  public isMouseHovered(mouseX: number, mouseY: number): boolean {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= StarCluster.HOVER_RADIUS;
  }

  public getCreatedTimeString(): string {
    const date = new Date(this.createdAt);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  public toJSON(): StarClusterData {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      letter: this.letter,
      hue: this.hue,
      createdAt: this.createdAt,
      particles: this.particles.map(p => ({
        offsetX: p.baseX - this.x,
        offsetY: p.baseY - this.y,
        vx: p.vx,
        vy: p.vy,
        radius: p.radius
      }))
    };
  }

  public startDissipate(): void {
    this.dissipating = true;
    this.dissipateProgress = 0;
  }

  public isFullyDissipated(): boolean {
    return this.dissipateProgress >= 1;
  }
}
