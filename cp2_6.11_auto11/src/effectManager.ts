import { Rune } from './rune';

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  duration: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface LightBeam {
  x: number;
  topY: number;
  bottomY: number;
  width: number;
  life: number;
  duration: number;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface ShakeState {
  active: boolean;
  duration: number;
  elapsed: number;
  intensity: number;
  offsetX: number;
}

export interface Crack {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  segments: { x: number; y: number }[];
  glowIntensity: number;
}

export class EffectManager {
  shockwaves: Shockwave[] = [];
  trailPoints: TrailPoint[] = [];
  lightBeam: LightBeam | null = null;
  shake: ShakeState = {
    active: false,
    duration: 200,
    elapsed: 0,
    intensity: 3,
    offsetX: 0,
  };
  particles: Particle[] = [];
  cracks: Crack[] = [];

  comboRunes: Rune[] = [];
  lastActivationTime: number = 0;
  comboTimeout: number = 1500;
  successCount: number = 0;
  maxSuccessForEvolution: number = 10;
  isGoldenPhase: boolean = false;

  audioContext: AudioContext | null = null;

  constructor() {
    this.generateInitialCracks();
  }

  private generateInitialCracks(): void {
    for (let i = 0; i < 3; i++) {
      this.addRandomCrack();
    }
    this.cracks.forEach(c => c.glowIntensity = 0.3);
  }

  addRandomCrack(): void {
    const clamp01 = (v: number) => Math.max(0.05, Math.min(0.95, v));

    const side = Math.floor(Math.random() * 4);
    let startX: number, startY: number, angle: number;

    switch (side) {
      case 0:
        startX = 0.1 + Math.random() * 0.8;
        startY = 0.05 + Math.random() * 0.1;
        angle = Math.PI * 0.3 + Math.random() * Math.PI * 0.4;
        break;
      case 1:
        startX = 0.9 - Math.random() * 0.1;
        startY = 0.1 + Math.random() * 0.8;
        angle = Math.PI * 0.8 + Math.random() * Math.PI * 0.4;
        break;
      case 2:
        startX = 0.1 + Math.random() * 0.8;
        startY = 0.95 - Math.random() * 0.1;
        angle = -Math.PI * 0.4 + Math.random() * Math.PI * 0.8;
        break;
      default:
        startX = 0.05 + Math.random() * 0.1;
        startY = 0.1 + Math.random() * 0.8;
        angle = -Math.PI * 0.4 - Math.random() * Math.PI * 0.4;
        break;
    }

    startX = clamp01(startX);
    startY = clamp01(startY);

    const length = 0.2 + Math.random() * 0.4;
    let endX = startX + Math.cos(angle) * length;
    let endY = startY + Math.sin(angle) * length;

    endX = clamp01(endX);
    endY = clamp01(endY);

    const segments: { x: number; y: number }[] = [];
    const segCount = 3 + Math.floor(Math.random() * 4);
    let currentAngle = angle;

    for (let i = 1; i < segCount; i++) {
      currentAngle += (Math.random() - 0.5) * 0.5;
      const segLength = length / segCount;
      const prevX = i === 1 ? startX : segments[i - 2].x;
      const prevY = i === 1 ? startY : segments[i - 2].y;
      const segX = clamp01(prevX + Math.cos(currentAngle) * segLength);
      const segY = clamp01(prevY + Math.sin(currentAngle) * segLength);
      segments.push({ x: segX, y: segY });
    }

    this.cracks.push({
      startX,
      startY,
      endX,
      endY,
      segments,
      glowIntensity: 0,
    });
  }

  addShockwave(x: number, y: number): void {
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: 60,
      life: 0,
      duration: 300,
    });
  }

  addTrailPoint(x: number, y: number, color: string): void {
    this.trailPoints.push({
      x,
      y,
      life: 800,
      maxLife: 800,
      color,
    });
  }

  triggerLightBeam(steleX: number, steleTopY: number, steleWidth: number): void {
    const beamWidth = steleWidth * 0.6;
    this.lightBeam = {
      x: steleX,
      topY: steleTopY - 400,
      bottomY: steleTopY,
      width: beamWidth,
      life: 0,
      duration: 1500,
      active: true,
    };

    for (let i = 0; i < 20; i++) {
      this.spawnBeamParticle(steleX, steleTopY, beamWidth);
    }
  }

  private spawnBeamParticle(centerX: number, topY: number, beamWidth: number): void {
    const x = centerX + (Math.random() - 0.5) * beamWidth * 0.8;
    const y = topY - Math.random() * 50;
    const vy = -0.5 - Math.random() * 1.5;

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.3,
      vy,
      size: 2 + Math.random() * 3,
      life: 1000 + Math.random() * 500,
      maxLife: 1500,
      color: '#FFFFFF',
    });
  }

  triggerShake(): void {
    this.shake.active = true;
    this.shake.elapsed = 0;
  }

  addComboRune(rune: Rune, currentTime: number): boolean {
    if (currentTime - this.lastActivationTime > this.comboTimeout && this.comboRunes.length > 0) {
      this.comboRunes = [];
    }

    this.comboRunes.push(rune);
    this.lastActivationTime = currentTime;

    if (this.comboRunes.length >= 5) {
      return true;
    }
    return false;
  }

  resetCombo(): void {
    this.comboRunes = [];
  }

  triggerSuccess(currentTime: number): void {
    this.successCount++;
    this.lastActivationTime = currentTime;

    if (this.cracks.length > 0) {
      const lastCrack = this.cracks[this.cracks.length - 1];
      lastCrack.glowIntensity = 1;
    }

    if (this.successCount < this.maxSuccessForEvolution) {
      this.addRandomCrack();
    }

    if (this.successCount >= this.maxSuccessForEvolution && !this.isGoldenPhase) {
      this.isGoldenPhase = true;
    }

    this.resetCombo();
  }

  playBuzzSound(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        return;
      }
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(120, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  update(dt: number, currentTime: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      const t = Math.min(1, sw.life / sw.duration);
      sw.radius = easeInOutCubic(t) * sw.maxRadius;

      if (sw.life >= sw.duration) {
        this.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const tp = this.trailPoints[i];
      tp.life -= dt;
      if (tp.life <= 0) {
        this.trailPoints.splice(i, 1);
      }
    }

    if (this.lightBeam && this.lightBeam.active) {
      this.lightBeam.life += dt;
      if (this.lightBeam.life >= this.lightBeam.duration) {
        this.lightBeam.active = false;
        this.lightBeam = null;
      }

      if (Math.random() < 0.3) {
        const beam = this.lightBeam;
        if (beam) {
          this.spawnBeamParticle(beam.x, beam.bottomY, beam.width);
        }
      }
    }

    if (this.shake.active) {
      this.shake.elapsed += dt;
      const t = this.shake.elapsed / this.shake.duration;
      if (t >= 1) {
        this.shake.active = false;
        this.shake.offsetX = 0;
      } else {
        this.shake.offsetX = Math.sin(t * Math.PI * 8) * this.shake.intensity * (1 - t);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 0.1;
      p.y += p.vy * dt * 0.1;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (const crack of this.cracks) {
      if (crack.glowIntensity > 0.3) {
        crack.glowIntensity = Math.max(0.3, crack.glowIntensity - dt / 2000);
      }
    }

    if (currentTime - this.lastActivationTime > this.comboTimeout && this.comboRunes.length > 0) {
      this.comboRunes = [];
    }
  }

  getBeamOpacity(): number {
    if (!this.lightBeam) return 0;
    const t = this.lightBeam.life / this.lightBeam.duration;
    if (t < 0.2) {
      return easeInOutCubic(t / 0.2) * 0.6;
    } else if (t > 0.8) {
      return easeInOutCubic((1 - t) / 0.2) * 0.6;
    }
    return 0.6;
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
