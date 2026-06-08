import type { BeatInfo } from './Player';
import { LANE_COLORS } from './ObstacleManager';

interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'burst' | 'ambient';
}

export class BeatVisualizer {
  particles: VisualParticle[] = [];
  bgHue = 270;
  stripeAlpha = 0;
  shakeX = 0;
  shakeY = 0;
  shakeDecay = 0;
  wavePhase = 0;
  cW = 0;
  cH = 0;
  laneH = 0;
  laneCount = 4;
  analyserData: Uint8Array | null = null;

  resize(w: number, h: number) {
    this.cW = w;
    this.cH = h;
    this.laneH = h / this.laneCount;
  }

  triggerShake(intensity: number) {
    this.shakeX = (Math.random() - 0.5) * intensity;
    this.shakeY = (Math.random() - 0.5) * intensity;
    this.shakeDecay = intensity;
  }

  triggerBurst(x: number, y: number, color: string, count: number = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 80 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 0.6 + Math.random() * 0.4,
        size: 3 + Math.random() * 4,
        color,
        type: 'burst',
      });
    }
  }

  triggerMiss(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 60;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.4 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color: '#ff2222',
        type: 'burst',
      });
    }
  }

  update(dt: number, beatInfo: BeatInfo, combo: number) {
    this.bgHue = 270 + Math.sin(beatInfo.timeSinceLastBeat * 0.01) * 15;
    this.wavePhase += dt * 2;

    if (combo > 10) {
      this.stripeAlpha = Math.min(0.4, this.stripeAlpha + dt * 2);
    } else {
      this.stripeAlpha = Math.max(0, this.stripeAlpha - dt);
    }

    if (this.shakeDecay > 0) {
      this.shakeDecay *= Math.pow(0.05, dt);
      this.shakeX = (Math.random() - 0.5) * this.shakeDecay;
      this.shakeY = (Math.random() - 0.5) * this.shakeDecay;
      if (this.shakeDecay < 0.5) {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeDecay = 0;
      }
    }

    if (Math.random() < 0.15) {
      this.particles.push({
        x: Math.random() * this.cW,
        y: Math.random() * this.cH,
        vx: (Math.random() - 0.5) * 10,
        vy: -10 - Math.random() * 20,
        life: 1 + Math.random(),
        maxLife: 1 + Math.random(),
        size: 1 + Math.random() * 2,
        color: `hsl(${270 + Math.random() * 60}, 80%, 60%)`,
        type: 'ambient',
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.3, dt);
      p.vy *= Math.pow(0.3, dt);
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > 200) {
      this.particles = this.particles.slice(-200);
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.cH);
    const h = Math.round(this.bgHue);
    grad.addColorStop(0, `hsl(${h}, 60%, 8%)`);
    grad.addColorStop(0.5, `hsl(${h + 10}, 50%, 4%)`);
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.cW, this.cH);

    if (this.stripeAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.stripeAlpha;
      const stripeW = 60;
      const offset = (Date.now() * 0.1) % (stripeW * 2);
      for (let x = -stripeW * 2 + offset; x < this.cW + stripeW; x += stripeW * 2) {
        ctx.fillStyle = `hsl(${(Date.now() * 0.1) % 360}, 100%, 50%)`;
        ctx.fillRect(x, 0, stripeW, this.cH);
      }
      ctx.restore();
    }
  }

  renderTrack(ctx: CanvasRenderingContext2D, beatInfo: BeatInfo) {
    for (let i = 0; i < this.laneCount; i++) {
      const y = this.laneH * i;
      const midY = y + this.laneH / 2;
      const beatPulse = Math.max(0, 1 - beatInfo.timeSinceLastBeat * 4);

      ctx.save();
      ctx.globalAlpha = 0.15 + beatPulse * 0.15;

      const tGrad = ctx.createLinearGradient(0, y, 0, y + this.laneH);
      tGrad.addColorStop(0, 'transparent');
      tGrad.addColorStop(0.3, LANE_COLORS[i]);
      tGrad.addColorStop(0.7, LANE_COLORS[i]);
      tGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = tGrad;
      ctx.fillRect(0, y, this.cW, this.laneH);

      ctx.globalAlpha = 0.4 + beatPulse * 0.4;
      ctx.strokeStyle = LANE_COLORS[i];
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < this.cW; x += 4) {
        const wave = Math.sin(x * 0.02 + this.wavePhase + i) * (3 + beatPulse * 5);
        if (x === 0) {
          ctx.moveTo(x, midY + wave);
        } else {
          ctx.lineTo(x, midY + wave);
        }
      }
      ctx.stroke();

      ctx.restore();
    }

    for (let i = 1; i < this.laneCount; i++) {
      const y = this.laneH * i;
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([10, 20]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.cW, y);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const sz = p.size * (p.type === 'burst' ? alpha : 0.5 + alpha * 0.5);
      ctx.save();
      ctx.globalAlpha = alpha * (p.type === 'ambient' ? 0.4 : 0.8);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getShakeOffset(): [number, number] {
    return [this.shakeX, this.shakeY];
  }
}
