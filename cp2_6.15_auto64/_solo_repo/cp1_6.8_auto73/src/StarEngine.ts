export const STAR_COLORS = [
  "#FFD700",
  "#FF6B9D",
  "#00E5FF",
  "#7C4DFF",
  "#69F0AE",
  "#FF8A65",
  "#40C4FF",
  "#F06292",
];

export interface StarData {
  id: string;
  text: string;
  color: string;
  userId: string;
  blessings: number;
  createdAt: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface BlessingParticle {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  progress: number;
  color: string;
  starId: string;
}

export class Star {
  id: string;
  text: string;
  color: string;
  userId: string;
  blessings: number;
  createdAt: string;

  x: number;
  y: number;
  baseSize: number;
  size: number;
  targetSize: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;

  driftAngle: number;
  driftSpeed: number;
  driftPhase: number;

  breathPhase: number;
  breathSpeed: number;
  breathAmplitude: number;

  hovered: boolean;
  hoverScale: number;

  clickBurst: boolean;
  burstTime: number;

  constructor(data: StarData, canvasW: number, canvasH: number) {
    this.id = data.id;
    this.text = data.text;
    this.color = data.color;
    this.userId = data.userId;
    this.blessings = data.blessings;
    this.createdAt = data.createdAt;

    this.x = Math.random() * canvasW;
    this.y = Math.random() * canvasH;
    this.baseSize = 3 + Math.random() * 4 + data.blessings * 0.5;
    this.size = this.baseSize;
    this.targetSize = this.baseSize;
    this.opacity = 0.5 + Math.random() * 0.3;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.005;

    this.driftAngle = Math.random() * Math.PI * 2;
    this.driftSpeed = 0.15 + Math.random() * 0.25;
    this.driftPhase = Math.random() * Math.PI * 2;

    this.breathPhase = Math.random() * Math.PI * 2;
    this.breathSpeed = 0.01 + Math.random() * 0.015;
    this.breathAmplitude = 0.15 + Math.random() * 0.1;

    this.hovered = false;
    this.hoverScale = 1;

    this.clickBurst = false;
    this.burstTime = 0;
  }

  update(dt: number, canvasW: number, canvasH: number) {
    this.driftPhase += dt * 0.001;
    this.x += Math.cos(this.driftAngle + Math.sin(this.driftPhase) * 0.5) * this.driftSpeed * dt * 0.03;
    this.y += Math.sin(this.driftAngle + Math.cos(this.driftPhase) * 0.5) * this.driftSpeed * dt * 0.03;

    if (this.x < -20) this.x = canvasW + 20;
    if (this.x > canvasW + 20) this.x = -20;
    if (this.y < -20) this.y = canvasH + 20;
    if (this.y > canvasH + 20) this.y = -20;

    this.breathPhase += this.breathSpeed * dt;
    const breathFactor = 1 + Math.sin(this.breathPhase) * this.breathAmplitude;

    const targetHoverScale = this.hovered ? 1.6 : 1;
    this.hoverScale += (targetHoverScale - this.hoverScale) * 0.08;

    this.size += (this.targetSize - this.size) * 0.05;
    this.size = Math.max(1, this.size);

    this.rotation += this.rotationSpeed * dt;

    this.opacity = (0.5 + Math.random() * 0.01) * breathFactor;
    this.opacity = Math.min(1, Math.max(0.3, this.opacity));

    if (this.clickBurst) {
      this.burstTime += dt;
      if (this.burstTime > 600) {
        this.clickBurst = false;
        this.burstTime = 0;
      }
    }
  }

  applyBlessing() {
    this.blessings++;
    this.targetSize = this.baseSize + this.blessings * 0.8;
    this.breathAmplitude = Math.min(0.4, this.breathAmplitude + 0.02);
  }

  triggerBurst() {
    this.clickBurst = true;
    this.burstTime = 0;
  }

  containsPoint(px: number, py: number): boolean {
    const hitRadius = Math.max(this.baseSize * this.hoverScale * 3, 15);
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= hitRadius * hitRadius;
  }

  getDisplayText(): string {
    return this.text.length > 6 ? this.text.slice(0, 6) + "…" : this.text;
  }
}

export class StarEngine {
  stars: Star[] = [];
  particles: Particle[] = [];
  blessingParticles: BlessingParticle[] = [];
  canvasW: number = 0;
  canvasH: number = 0;

  resize(w: number, h: number) {
    this.canvasW = w;
    this.canvasH = h;
  }

  addStar(data: StarData) {
    const star = new Star(data, this.canvasW, this.canvasH);
    this.stars.push(star);
    return star;
  }

  removeStar(id: string) {
    this.stars = this.stars.filter((s) => s.id !== id);
  }

  updateStar(data: StarData) {
    const star = this.stars.find((s) => s.id === data.id);
    if (star) {
      star.blessings = data.blessings;
      star.targetSize = star.baseSize + data.blessings * 0.8;
    }
  }

  spawnBurstParticles(star: Star) {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 1 + Math.random() * 2.5;
      this.particles.push({
        x: star.x,
        y: star.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 600 + Math.random() * 400,
        color: star.color,
        size: 1.5 + Math.random() * 2,
      });
    }
  }

  spawnBlessingParticle(fromX: number, fromY: number, targetStar: Star, userId: string) {
    this.blessingParticles.push({
      sx: fromX,
      sy: fromY,
      tx: targetStar.x,
      ty: targetStar.y,
      progress: 0,
      color: targetStar.color,
      starId: targetStar.id,
    });
  }

  update(dt: number) {
    for (const star of this.stars) {
      star.update(dt, this.canvasW, this.canvasH);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.blessingParticles.length - 1; i >= 0; i--) {
      const bp = this.blessingParticles[i];
      bp.progress += dt * 0.0015;
      if (bp.progress >= 1) {
        const star = this.stars.find((s) => s.id === bp.starId);
        if (star) {
          star.applyBlessing();
        }
        this.blessingParticles.splice(i, 1);
      } else {
        const targetStar = this.stars.find((s) => s.id === bp.starId);
        if (targetStar) {
          bp.tx = targetStar.x;
          bp.ty = targetStar.y;
        }
      }
    }

    this.resolveCollisions();
  }

  private resolveCollisions() {
    for (let i = 0; i < this.stars.length; i++) {
      for (let j = i + 1; j < this.stars.length; j++) {
        const a = this.stars[i];
        const b = this.stars[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = (a.size + b.size) * 2;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap * 0.3;
          a.y -= ny * overlap * 0.3;
          b.x += nx * overlap * 0.3;
          b.y += ny * overlap * 0.3;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const star of this.stars) {
      this.renderStar(ctx, star);
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.life * 0.8;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const bp of this.blessingParticles) {
      const t = bp.progress;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const cx = bp.sx + (bp.tx - bp.sx) * ease;
      const cy = bp.sy + (bp.ty - bp.sy) * ease;
      ctx.save();
      ctx.globalAlpha = 1 - t * 0.3;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = bp.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderStar(ctx: CanvasRenderingContext2D, star: Star) {
    ctx.save();
    ctx.translate(star.x, star.y);

    const displaySize = star.size * star.hoverScale;
    const breathOpacity = 0.6 + Math.sin(star.breathPhase) * 0.2;

    ctx.globalAlpha = breathOpacity;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, displaySize * 4);
    gradient.addColorStop(0, star.color);
    gradient.addColorStop(0.3, star.color + "80");
    gradient.addColorStop(0.7, star.color + "20");
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.shadowColor = star.color;
    ctx.shadowBlur = displaySize * 6;
    ctx.beginPath();
    ctx.arc(0, 0, displaySize * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = Math.min(1, breathOpacity + 0.3);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = star.color;
    ctx.shadowBlur = displaySize * 3;
    ctx.beginPath();
    ctx.arc(0, 0, displaySize, 0, Math.PI * 2);
    ctx.fill();

    if (star.hovered) {
      ctx.globalAlpha = 0.95;
      ctx.font = `${Math.max(12, displaySize * 2)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.shadowColor = star.color;
      ctx.shadowBlur = 8;
      ctx.fillText(star.getDisplayText(), 0, -displaySize * 3 - 8);
    }

    if (star.blessings > 0) {
      ctx.globalAlpha = 0.7;
      ctx.font = `${Math.max(9, displaySize)}px sans-serif`;
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "center";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 4;
      ctx.fillText(`✦${star.blessings}`, 0, displaySize * 3 + 14);
    }

    ctx.restore();
  }

  findStarAt(x: number, y: number): Star | null {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      if (this.stars[i].containsPoint(x, y)) {
        return this.stars[i];
      }
    }
    return null;
  }
}
