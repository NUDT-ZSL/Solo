import type { Particle, ParticleType, DarkMatter, QuantumNode, PulseRing, GameStateRef } from './types';

const START_HUE = 200;
const END_HUE = 330;
const DAMPING = 0.85;
const WOBBLE_DAMPING = 0.9;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [
    Math.floor((r + m) * 255),
    Math.floor((g + m) * 255),
    Math.floor((b + m) * 255)
  ];
}

export function lerpHue(t: number): number {
  return START_HUE + (END_HUE - START_HUE) * t;
}

export class ParticleSystem {
  private particlePool: Particle[] = [];
  private poolIndex = 0;
  private maxPoolSize = 2000;

  constructor() {
    for (let i = 0; i < this.maxPoolSize; i++) {
      this.particlePool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0,
      radius: 2, hue: 200, saturation: 100, lightness: 60,
      alpha: 1, life: 0, maxLife: 1, type: 'fiber',
      pulsePhase: 0, wobblePhase: 0, index: 0, pulseIntensity: 0
    };
  }

  acquire(): Particle {
    const p = this.particlePool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.maxPoolSize;
    p.x = 0; p.y = 0; p.prevX = 0; p.prevY = 0;
    p.vx = 0; p.vy = 0; p.alpha = 1; p.life = 0;
    p.pulsePhase = 0; p.wobblePhase = 0; p.pulseIntensity = 0;
    return p;
  }

  createFiberParticle(x: number, y: number, index: number, total: number): Particle {
    const t = total <= 1 ? 0 : index / (total - 1);
    const hue = lerpHue(t);
    const p = this.acquire();
    p.x = x; p.y = y; p.prevX = x; p.prevY = y;
    p.radius = 2 + Math.random() * 2;
    p.hue = hue;
    p.saturation = 100;
    p.lightness = 55 + Math.random() * 10;
    p.alpha = 1;
    p.type = 'fiber';
    p.index = index;
    p.wobblePhase = Math.random() * Math.PI * 2;
    p.life = 100;
    p.maxLife = 100;
    return p;
  }

  createExplosionParticles(x: number, y: number, count: number): Particle[] {
    const result: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 50 + Math.random() * 150;
      const p = this.acquire();
      p.x = x; p.y = y; p.prevX = x; p.prevY = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.radius = 2 + Math.random() * 3;
      p.hue = START_HUE + Math.random() * (END_HUE - START_HUE);
      p.saturation = 100;
      p.lightness = 60;
      p.alpha = 1;
      p.type = 'explosion';
      p.life = 0.3 + Math.random() * 0.2;
      p.maxLife = p.life;
      result.push(p);
    }
    return result;
  }

  createStarParticles(width: number, height: number, count: number): Particle[] {
    const result: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.prevX = p.x; p.prevY = p.y;
      p.vx = (Math.random() - 0.5) * 5;
      p.vy = (Math.random() - 0.5) * 5;
      p.radius = 0.5 + Math.random() * 1.5;
      p.hue = 0;
      p.saturation = 0;
      p.lightness = 100;
      p.alpha = 0.2 + Math.random() * 0.4;
      p.type = 'star';
      p.life = 10000;
      p.maxLife = 10000;
      p.wobblePhase = Math.random() * Math.PI * 2;
      result.push(p);
    }
    return result;
  }

  createConfettiParticles(x: number, y: number, count: number): Particle[] {
    const result: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 100 + Math.random() * 200;
      const p = this.acquire();
      p.x = x; p.y = y; p.prevX = x; p.prevY = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 50;
      p.radius = 3 + Math.random() * 4;
      p.hue = Math.random() * 360;
      p.saturation = 100;
      p.lightness = 50 + Math.random() * 20;
      p.alpha = 1;
      p.type = 'confetti';
      p.life = 3;
      p.maxLife = 3;
      p.wobblePhase = Math.random() * Math.PI * 2;
      result.push(p);
    }
    return result;
  }

  updateStars(particles: Particle[], dt: number, width: number, height: number, time: number): void {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.wobblePhase += dt * 0.5;
      p.alpha = 0.2 + 0.2 * Math.sin(time * 0.5 + p.wobblePhase) + 0.2;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
    }
  }

  updateFiberParticles(
    particles: Particle[],
    dt: number,
    mouseSpeed: number,
    warningNearDark: boolean,
    brokenIndex: number,
    breakActive: boolean,
    breakTimer: number
  ): void {
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      const p = particles[i];
      if (breakActive && i >= brokenIndex) {
        const t = breakTimer / 0.3;
        const angle = Math.atan2(p.y - particles[brokenIndex > 0 ? brokenIndex - 1 : 0].y,
                                 p.x - particles[brokenIndex > 0 ? brokenIndex - 1 : 0].x);
        const spreadAngle = angle + (Math.random() - 0.5) * Math.PI;
        const speed = 100 * t;
        p.x += Math.cos(spreadAngle) * speed * dt + p.vx * dt;
        p.y += Math.sin(spreadAngle) * speed * dt + p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.alpha = Math.max(0, 1 - t);
        continue;
      }

      p.wobblePhase += dt * (8 + mouseSpeed * 0.05);
      const wobbleAmp = warningNearDark ? 2 : Math.min(2, mouseSpeed * 0.015);
      const wobbleX = Math.sin(p.wobblePhase) * wobbleAmp;
      const wobbleY = Math.cos(p.wobblePhase * 1.3) * wobbleAmp;

      const dx = p.x - p.prevX;
      const dy = p.y - p.prevY;
      p.prevX = p.x;
      p.prevY = p.y;
      p.x += dx * DAMPING + wobbleX * (1 - WOBBLE_DAMPING);
      p.y += dy * DAMPING + wobbleY * (1 - WOBBLE_DAMPING);
    }
  }

  updateExplosionParticles(particles: Particle[], dt: number): Particle[] {
    const alive: Particle[] = [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.alpha = p.life / p.maxLife;
      p.radius *= 0.99;
      alive.push(p);
    }
    return alive;
  }

  updateConfettiParticles(particles: Particle[], dt: number, height: number): Particle[] {
    const alive: Particle[] = [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0 || p.y > height + 50) continue;
      p.vy += 300 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.wobblePhase += dt * 10;
      p.radius = 2 + Math.sin(p.wobblePhase) * 2;
      p.alpha = Math.min(1, p.life / 0.5);
      alive.push(p);
    }
    return alive;
  }

  private particleToColor(p: Particle, extraBright = 0): string {
    const l = Math.min(90, p.lightness + extraBright);
    const [r, g, b] = hslToRgb(p.hue, p.saturation / 100, l / 100);
    return `rgba(${r},${g},${b},${p.alpha})`;
  }

  renderStars(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderFiber(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    lightPulseDist: number,
    lightPulseActive: boolean,
    brokenIdx: number,
    breakActive: boolean
  ): void {
    if (particles.length < 2) {
      for (const p of particles) {
        this.renderSingleFiberParticle(ctx, p, 0);
      }
      return;
    }

    let accumDist = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (breakActive && i >= brokenIdx) continue;

      let pulseBright = 0;
      if (lightPulseActive && i > 0) {
        const prev = particles[i - 1];
        const segLen = Math.hypot(p.x - prev.x, p.y - prev.y);
        const segStart = accumDist;
        const segEnd = accumDist + segLen;
        if (segStart <= lightPulseDist && segEnd >= lightPulseDist - 50) {
          const t = Math.max(0, (lightPulseDist - segStart) / Math.max(1, segLen));
          const waveDist = Math.max(0, 50 - (lightPulseDist - segStart + (1 - t) * segLen));
          pulseBright = Math.min(40, (waveDist / 50) * 40);
        }
        accumDist = segEnd;
      }

      if (i > 0) {
        const prev = particles[i - 1];
        if (!(breakActive && i - 1 >= brokenIdx)) {
          const midHue = (prev.hue + p.hue) / 2;
          const avgAlpha = (prev.alpha + p.alpha) / 2;
          const [r, g, b] = hslToRgb(midHue, 1, (prev.lightness + p.lightness + pulseBright) / 200);
          ctx.strokeStyle = `rgba(${r},${g},${b},${avgAlpha * 0.7})`;
          ctx.lineWidth = (prev.radius + p.radius) * 0.6;
          ctx.lineCap = 'round';
          ctx.shadowColor = `hsl(${midHue}, 100%, 60%)`;
          ctx.shadowBlur = 8 + pulseBright * 0.3;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      this.renderSingleFiberParticle(ctx, p, pulseBright);
    }
    ctx.shadowBlur = 0;
  }

  private renderSingleFiberParticle(ctx: CanvasRenderingContext2D, p: Particle, extraBright: number): void {
    const l = Math.min(90, p.lightness + extraBright);
    const [r, g, b] = hslToRgb(p.hue, 1, l / 100);
    ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
    ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
    ctx.shadowBlur = 6 + extraBright * 0.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  renderExplosions(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const [r, g, b] = hslToRgb(p.hue, 1, p.lightness / 100);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderConfetti(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const [r, g, b] = hslToRgb(p.hue, 1, p.lightness / 100);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
      ctx.shadowBlur = 5;
      ctx.fillRect(p.x - p.radius / 2, p.y - p.radius / 2, p.radius, p.radius * 1.5);
    }
    ctx.restore();
  }

  renderDarkMatters(ctx: CanvasRenderingContext2D, matters: DarkMatter[], time: number): void {
    for (const dm of matters) {
      ctx.save();
      const drawX = dm.x + dm.knockbackX;
      const drawY = dm.y + dm.knockbackY;
      ctx.translate(drawX, drawY);
      ctx.rotate(dm.rotation);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, dm.radius);
      grad.addColorStop(0, 'rgba(153, 50, 204, 0.75)');
      grad.addColorStop(0.5, 'rgba(148, 0, 211, 0.5)');
      grad.addColorStop(1, 'rgba(138, 43, 226, 0)');

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(153, 50, 204, 0.8)';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i <= spikes * 2; i++) {
        const angle = (Math.PI * i) / spikes;
        const wobble = Math.sin(time * 2 + i * 0.7) * dm.radius * 0.08;
        const rad = dm.radius * (0.85 + wobble / dm.radius);
        const px = Math.cos(angle) * rad;
        const py = Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = 'rgba(255, 180, 255, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const swirlR = dm.radius * (0.3 + i * 0.2);
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 1.5; a += 0.1) {
          const sa = a + i * 0.8 + time * (0.5 + i * 0.2);
          const sx = Math.cos(sa) * swirlR * (a / (Math.PI * 1.5));
          const sy = Math.sin(sa) * swirlR * (a / (Math.PI * 1.5));
          if (a === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderNode(ctx: CanvasRenderingContext2D, node: QuantumNode, time: number): void {
    ctx.save();
    ctx.translate(node.x, node.y);

    const glowR = node.radius * (1 + 0.1 * Math.sin(time * 3));
    const glow = ctx.createRadialGradient(0, 0, node.radius * 0.3, 0, 0, glowR * 2);
    const glowAlpha = 0.4 * node.alpha;
    if (node.isTop) {
      glow.addColorStop(0, `rgba(255, 105, 180, ${glowAlpha})`);
      glow.addColorStop(1, 'rgba(255, 105, 180, 0)');
    } else {
      glow.addColorStop(0, `rgba(0, 191, 255, ${glowAlpha})`);
      glow.addColorStop(1, 'rgba(0, 191, 255, 0)');
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR * 2, 0, Math.PI * 2);
    ctx.fill();

    const coreColor = node.isTop ? [255, 105, 180] : [0, 191, 255];
    const coreGrad = ctx.createRadialGradient(-node.radius * 0.3, -node.radius * 0.3, 0, 0, 0, node.radius);
    coreGrad.addColorStop(0, `rgba(255,255,255,${node.alpha})`);
    coreGrad.addColorStop(0.3, `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},${node.alpha})`);
    coreGrad.addColorStop(1, `rgba(${coreColor[0] * 0.6},${coreColor[1] * 0.6},${coreColor[2] * 0.6},${node.alpha})`);
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = `rgba(${coreColor[0]},${coreColor[1]},${coreColor[2]},${node.alpha})`;
    ctx.shadowBlur = 25 * node.alpha;
    ctx.beginPath();
    ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255,255,255,${0.3 * node.alpha})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      const ringR = node.radius * (0.55 + i * 0.2);
      const rot = time * (i % 2 === 0 ? 1 : -1) * 0.8;
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const px = Math.cos(a + rot) * ringR;
        const py = Math.sin(a + rot) * ringR * 0.3;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    for (const ring of node.pulseRings) {
      this.renderPulseRing(ctx, ring);
    }
  }

  renderPulseRing(ctx: CanvasRenderingContext2D, ring: PulseRing): void {
    ctx.save();
    const grad = ctx.createRadialGradient(ring.x, ring.y, ring.radius * 0.8, ring.x, ring.y, ring.radius);
    grad.addColorStop(0, `hsla(${ring.hue}, 100%, 70%, 0)`);
    grad.addColorStop(0.5, `hsla(${ring.hue}, 100%, 70%, ${ring.alpha * 0.5})`);
    grad.addColorStop(1, `hsla(${ring.hue}, 100%, 70%, ${ring.alpha})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.shadowColor = `hsl(${ring.hue}, 100%, 70%)`;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  renderBoundary(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -time * 20;
    ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 10;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.restore();
  }

  renderCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, drawing: boolean): void {
    const visible = (Math.sin(time * 4) + 1) / 2;
    const alpha = drawing ? 1 : 0.3 + visible * 0.4;
    const r = drawing ? 8 : 6;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r - 4, 0); ctx.lineTo(-r + 2, 0);
    ctx.moveTo(r - 2, 0); ctx.lineTo(r + 4, 0);
    ctx.moveTo(0, -r - 4); ctx.lineTo(0, -r + 2);
    ctx.moveTo(0, r - 2); ctx.lineTo(0, r + 4);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderRedFlash(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number): void {
    if (alpha <= 0) return;
    ctx.save();
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(255,0,0,0)');
    grad.addColorStop(1, `rgba(255,0,0,${alpha * 0.4})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
