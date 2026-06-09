export interface Particle {
  x: number;
  y: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  opacity: number;
  birthTime: number;
  lastUpdate: number;
  decayRate: number;
  isClearing: boolean;
  clearStartTime: number;
  clearDuration: number;
}

export interface TrailSpawnResult {
  particles: Particle[];
}

export class ParticleTrailManager {
  public particles: Particle[] = [];
  public colorOffset: number = 0;
  public baseParticleSize: number = 5;
  public decayRate: number = 0.03;

  private readonly MIN_GHOST_OPACITY = 0.05;
  private readonly CLEAR_DURATION = 1500;
  private readonly MERGE_THRESHOLD = 2;
  private readonly MERGE_TRIGGER_COUNT = 1000;

  private lastPos: { x: number; y: number; time: number } | null = null;
  private accumulatedDistance: number = 0;

  constructor() {}

  public beginStroke(x: number, y: number, now: number): void {
    this.lastPos = { x, y, time: now };
    this.accumulatedDistance = 0;
    this.spawnParticle(x, y, 0, now);
  }

  public moveStroke(x: number, y: number, now: number): void {
    if (!this.lastPos) {
      this.beginStroke(x, y, now);
      return;
    }

    const dx = x - this.lastPos.x;
    const dy = y - this.lastPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max((now - this.lastPos.time) / 1000, 0.001);
    const speed = dist / dt;

    this.accumulatedDistance += dist;

    while (this.accumulatedDistance >= 5) {
      const t = (this.accumulatedDistance - dist + 5) / dist;
      const px = this.lastPos.x + dx * t;
      const py = this.lastPos.y + dy * t;
      this.spawnParticle(px, py, speed, now);
      this.accumulatedDistance -= 5;
    }

    this.lastPos = { x, y, time: now };
  }

  public endStroke(): void {
    this.lastPos = null;
  }

  private getHueFromSpeed(speed: number): { hue: number; saturation: number; lightness: number } {
    if (speed < 100) {
      const t = speed / 100;
      return {
        hue: 200 + t * 40,
        saturation: 85,
        lightness: 60
      };
    } else if (speed < 300) {
      const t = (speed - 100) / 200;
      return {
        hue: 280 + t * 40,
        saturation: 88,
        lightness: 62
      };
    } else {
      const t = Math.min((speed - 300) / 300, 1);
      return {
        hue: 0 + t * 30,
        saturation: 92,
        lightness: 60
      };
    }
  }

  private spawnParticle(x: number, y: number, speed: number, now: number): void {
    const colorInfo = this.getHueFromSpeed(speed);
    const sizeVariation = Math.random() * (this.baseParticleSize * 0.6);
    const size = Math.max(1, this.baseParticleSize * 0.7 + sizeVariation);

    const particle: Particle = {
      x,
      y,
      size,
      hue: (colorInfo.hue + this.colorOffset + 360) % 360,
      saturation: colorInfo.saturation,
      lightness: colorInfo.lightness,
      opacity: 1,
      birthTime: now,
      lastUpdate: now,
      decayRate: this.decayRate,
      isClearing: false,
      clearStartTime: 0,
      clearDuration: this.CLEAR_DURATION
    };

    this.particles.push(particle);
  }

  public updateAll(now: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const dt = (now - p.lastUpdate) / 1000;
      p.lastUpdate = now;

      if (p.isClearing) {
        const elapsed = now - p.clearStartTime;
        const t = Math.min(elapsed / p.clearDuration, 1);
        p.opacity *= 1 - t;
        if (t >= 1) p.opacity = 0;
      } else {
        const decayFactor = Math.pow(1 - p.decayRate, dt);
        p.opacity = Math.max(this.MIN_GHOST_OPACITY, p.opacity * decayFactor);
      }

      if (p.opacity <= 0.001) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > this.MERGE_TRIGGER_COUNT) {
      this.mergeParticles();
    }
  }

  private mergeParticles(): void {
    const merged: Particle[] = [];
    const used = new Set<number>();

    for (let i = 0; i < this.particles.length; i++) {
      if (used.has(i)) continue;
      const a = this.particles[i];
      used.add(i);
      let count = 1;
      let sumX = a.x;
      let sumY = a.y;
      let sumSize = a.size;
      let sumHueSin = Math.sin((a.hue * Math.PI) / 180);
      let sumHueCos = Math.cos((a.hue * Math.PI) / 180);
      let sumSat = a.saturation;
      let sumLight = a.lightness;
      let sumOpacity = a.opacity;

      for (let j = i + 1; j < this.particles.length; j++) {
        if (used.has(j)) continue;
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.MERGE_THRESHOLD) {
          used.add(j);
          count++;
          sumX += b.x;
          sumY += b.y;
          sumSize += b.size;
          sumHueSin += Math.sin((b.hue * Math.PI) / 180);
          sumHueCos += Math.cos((b.hue * Math.PI) / 180);
          sumSat += b.saturation;
          sumLight += b.lightness;
          sumOpacity += b.opacity;
        }
      }

      if (count === 1) {
        merged.push(a);
      } else {
        const avgHue =
          (Math.atan2(sumHueSin / count, sumHueCos / count) * 180) / Math.PI;
        merged.push({
          x: sumX / count,
          y: sumY / count,
          size: sumSize / count,
          hue: (avgHue + 360) % 360,
          saturation: sumSat / count,
          lightness: sumLight / count,
          opacity: Math.min(sumOpacity / count, 1),
          birthTime: a.birthTime,
          lastUpdate: a.lastUpdate,
          decayRate: a.decayRate,
          isClearing: a.isClearing,
          clearStartTime: a.clearStartTime,
          clearDuration: a.clearDuration
        });
      }
    }

    this.particles = merged;
  }

  public startClearAll(now: number): void {
    for (const p of this.particles) {
      if (!p.isClearing) {
        p.isClearing = true;
        p.clearStartTime = now;
      }
    }
  }

  public drawAll(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const p of this.particles) {
      if (p.opacity <= 0.001) continue;

      const radius = p.size;
      const gradient = ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        radius
      );

      gradient.addColorStop(
        0,
        `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.opacity})`
      );
      gradient.addColorStop(
        0.5,
        `hsla(${p.hue}, ${p.saturation - 5}%, ${p.lightness - 5}%, ${p.opacity * 0.6})`
      );
      gradient.addColorStop(
        1,
        `hsla(${p.hue}, ${p.saturation - 10}%, ${p.lightness - 10}%, 0)`
      );

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.restore();
  }
}
