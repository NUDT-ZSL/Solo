export interface BeatInfo {
  bpm: number;
  beatInterval: number;
  currentBeat: number;
  timeSinceLastBeat: number;
  timeToNextBeat: number;
  isOnBeat: boolean;
  beatIntensity: number;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

const GLOW_CORE = '#fff078';
const GLOW_MID = '#ffd23c';
const GLOW_OUTER = '#ffb41e';
const GLOW_FADE = '#ff6e00';

export class Player {
  x = 0;
  targetLane = 1;
  currentLane = 1;
  currentY = 0;
  targetY = 0;
  radius = 22;
  trailParticles: TrailParticle[] = [];
  pulsePhase = 0;
  isHit = false;
  hitTimer = 0;
  invincibleTimer = 0;
  laneCount = 4;
  canvasWidth = 0;
  canvasHeight = 0;
  laneHeight = 0;
  glowIntensity = 0;
  spiralAngle = 0;

  resize(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.laneHeight = h / this.laneCount;
    this.x = w * 0.15;
    this.radius = Math.max(16, Math.min(28, h / 25));
    this.currentY = this.getLaneY(this.currentLane);
    this.targetY = this.currentY;
  }

  getLaneY(lane: number): number {
    return this.laneHeight * lane + this.laneHeight / 2;
  }

  setLane(lane: number) {
    this.targetLane = Math.max(0, Math.min(this.laneCount - 1, lane));
    this.currentLane = this.targetLane;
    this.targetY = this.getLaneY(this.targetLane);
  }

  moveUp() {
    this.setLane(this.currentLane - 1);
  }

  moveDown() {
    this.setLane(this.currentLane + 1);
  }

  onHit() {
    this.isHit = true;
    this.hitTimer = 0.3;
    this.invincibleTimer = 1.5;
    this.glowIntensity = 0;
  }

  update(dt: number, beatInfo: BeatInfo) {
    this.currentY += (this.targetY - this.currentY) * Math.min(1, 12 * dt);
    this.pulsePhase += dt * beatInfo.bpm / 60 * Math.PI * 2;
    this.spiralAngle += dt * 6;

    if (beatInfo.isOnBeat || beatInfo.beatIntensity > 0.8) {
      this.glowIntensity = Math.min(1, this.glowIntensity + 8 * dt);
    }
    this.glowIntensity = Math.max(0, this.glowIntensity - 2 * dt);

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
    } else {
      this.isHit = false;
    }
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    const spiralCount = 3;
    const spiralSpeed = 60;
    for (let i = 0; i < spiralCount; i++) {
      const angle = this.spiralAngle + (i / spiralCount) * Math.PI * 2;
      const r = this.radius * 0.6;
      const px = this.x + Math.cos(angle) * r;
      const py = this.currentY + Math.sin(angle) * r;
      this.trailParticles.push({
        x: px,
        y: py,
        vx: -spiralSpeed * 0.3 + (Math.random() - 0.5) * 20,
        vy: (Math.random() - 0.5) * 15,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        hue: 40 + Math.random() * 20,
      });
    }

    if (Math.random() < 0.3) {
      this.trailParticles.push({
        x: this.x + (Math.random() - 0.5) * this.radius,
        y: this.currentY + (Math.random() - 0.5) * this.radius,
        vx: -40 - Math.random() * 30,
        vy: (Math.random() - 0.5) * 20,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 1.5 + Math.random() * 2.5,
        hue: 30 + Math.random() * 30,
      });
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.trailParticles) {
      const alpha = (p.life / p.maxLife) * 0.7;
      const sz = p.size * (p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const blinkVisible = this.invincibleTimer <= 0 || Math.sin(this.invincibleTimer * 20) > 0;
    if (!blinkVisible) return;

    const pulse = 1 + this.glowIntensity * 0.15;
    const drawRadius = this.radius * pulse;

    ctx.save();
    ctx.shadowColor = '#ffdc3c';
    ctx.shadowBlur = 30 + this.glowIntensity * 20;
    ctx.beginPath();
    ctx.arc(this.x, this.currentY, drawRadius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      this.x, this.currentY, 0,
      this.x, this.currentY, drawRadius
    );
    grad.addColorStop(0, GLOW_CORE);
    grad.addColorStop(0.5, GLOW_MID);
    grad.addColorStop(1, GLOW_OUTER);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.3 + this.glowIntensity * 0.3;
    ctx.beginPath();
    const outerR = drawRadius + 8 + this.glowIntensity * 10;
    ctx.arc(this.x, this.currentY, outerR, 0, Math.PI * 2);
    const outerGrad = ctx.createRadialGradient(
      this.x, this.currentY, drawRadius,
      this.x, this.currentY, outerR
    );
    outerGrad.addColorStop(0, GLOW_MID);
    outerGrad.addColorStop(1, GLOW_FADE);
    ctx.fillStyle = outerGrad;
    ctx.fill();
    ctx.restore();
  }
}
