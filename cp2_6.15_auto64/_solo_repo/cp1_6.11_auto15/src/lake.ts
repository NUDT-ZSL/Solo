export interface WaveLayer {
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  direction: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  width: number;
  startTime: number;
  duration: number;
}

export interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  startTime: number;
  duration: number;
  color: string;
}

export interface Float {
  x: number;
  y: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  driftX: number;
  driftY: number;
  isBiting: boolean;
  biteStartTime: number;
  shakeFrequency: number;
  shakeAmplitude: number;
  glowRotation: number;
  scale: number;
}

export interface ParticlePool {
  particles: SplashParticle[];
  maxParticles: number;
}

export class LakeRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private waveLayers: WaveLayer[] = [];
  private ripples: Ripple[] = [];
  private particles: ParticlePool;
  private float: Float | null = null;

  private time: number = 0;
  private lastDirectionChange: number = 0;
  private baseWaveDirection: number = Math.PI / 6;

  private waterGradient: CanvasGradient | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.particles = {
      particles: [],
      maxParticles: 200
    };
    this.resize();
    this.initWaveLayers();
  }

  resize(): void {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.createWaterGradient();
  }

  private createWaterGradient(): void {
    this.waterGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    this.waterGradient.addColorStop(0, '#0a192f');
    this.waterGradient.addColorStop(1, '#020c1b');
  }

  private initWaveLayers(): void {
    const layerCount = 5;
    for (let i = 0; i < layerCount; i++) {
      this.waveLayers.push({
        amplitude: 2 + Math.random() * 4,
        frequency: 0.005 + Math.random() * 0.01,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        direction: this.baseWaveDirection + (Math.random() - 0.5) * 0.5
      });
    }
  }

  getWaveHeight(x: number, y: number, time: number): number {
    let height = 0;
    for (const layer of this.waveLayers) {
      const dx = Math.cos(layer.direction);
      const dy = Math.sin(layer.direction);
      const dist = x * dx + y * dy;
      height += Math.sin(dist * layer.frequency + time * layer.speed + layer.phase) * layer.amplitude;
    }
    return height;
  }

  getWaveDirection(): number {
    return this.baseWaveDirection;
  }

  addRipple(x: number, y: number, maxRadius: number = 80, duration: number = 1500): void {
    if (this.ripples.length >= 3) {
      this.ripples.shift();
    }
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius,
      opacity: 0.6,
      width: 2,
      startTime: Date.now(),
      duration
    });
  }

  addSplash(x: number, y: number, count: number = 15, color: string = 'rgba(255, 255, 255, 0.8)'): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 50 + Math.random() * 100;
      const size = 8 + Math.random() * 4;

      const particle: SplashParticle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        size,
        opacity: 1,
        startTime: Date.now(),
        duration: 600,
        color
      };

      if (this.particles.particles.length >= this.particles.maxParticles) {
        this.particles.particles.shift();
      }
      this.particles.particles.push(particle);
    }
  }

  setFloat(x: number, y: number): void {
    this.float = {
      x,
      y,
      baseY: y,
      offsetX: 0,
      offsetY: 0,
      driftX: 0,
      driftY: 0,
      isBiting: false,
      biteStartTime: 0,
      shakeFrequency: 4,
      shakeAmplitude: 15,
      glowRotation: 0,
      scale: 1
    };
  }

  removeFloat(): void {
    this.float = null;
  }

  getFloat(): Float | null {
    return this.float;
  }

  startBite(): void {
    if (this.float) {
      this.float.isBiting = true;
      this.float.biteStartTime = Date.now();
      this.float.shakeFrequency = 3 + Math.random() * 2;
      this.float.scale = 1.2;
    }
  }

  stopBite(): void {
    if (this.float) {
      this.float.isBiting = false;
      this.float.scale = 1;
    }
  }

  update(deltaTime: number, currentTime: number): void {
    this.time = currentTime;

    if (currentTime - this.lastDirectionChange > 5000) {
      this.baseWaveDirection += (Math.random() - 0.5) * 0.5;
      this.lastDirectionChange = currentTime;

      for (const layer of this.waveLayers) {
        layer.direction = this.baseWaveDirection + (Math.random() - 0.5) * 0.3;
        layer.amplitude = 2 + Math.random() * 4;
      }
    }

    if (this.float) {
      const waveOffset = this.getWaveHeight(this.float.x, this.float.baseY, currentTime / 1000);
      this.float.offsetY = waveOffset;

      const driftSpeed = 0.02;
      this.float.driftX += Math.cos(this.baseWaveDirection) * driftSpeed;
      this.float.driftY += Math.sin(this.baseWaveDirection) * driftSpeed * 0.3;

      this.float.x += this.float.driftX * deltaTime / 16;
      this.float.y = this.float.baseY + this.float.offsetY;
      this.float.y += this.float.driftY * deltaTime / 16;

      this.float.x = Math.max(50, Math.min(this.width - 50, this.float.x));
      this.float.y = Math.max(this.height * 0.3, Math.min(this.height - 80, this.float.y));

      this.float.glowRotation += deltaTime * 0.003;

      if (this.float.isBiting) {
        const biteElapsed = currentTime - this.float.biteStartTime;
        const shakeOffset = Math.sin(biteElapsed * this.float.shakeFrequency * 0.01) * this.float.shakeAmplitude;
        this.float.offsetX = shakeOffset;
        this.float.y -= 5;
      } else {
        this.float.offsetX *= 0.9;
      }
    }

    this.ripples = this.ripples.filter(ripple => {
      const elapsed = currentTime - ripple.startTime;
      const progress = elapsed / ripple.duration;
      if (progress >= 1) return false;

      ripple.radius = ripple.maxRadius * progress;
      ripple.opacity = 0.6 * (1 - progress);
      ripple.width = 2 + progress * 4;
      return true;
    });

    this.particles.particles = this.particles.particles.filter(particle => {
      const elapsed = currentTime - particle.startTime;
      const progress = elapsed / particle.duration;
      if (progress >= 1) return false;

      particle.vy += 400 * deltaTime / 1000;
      particle.x += particle.vx * deltaTime / 1000;
      particle.y += particle.vy * deltaTime / 1000;
      particle.opacity = 1 - progress;
      particle.size *= 0.99;
      return true;
    });
  }

  render(): void {
    const ctx = this.ctx;

    ctx.fillStyle = this.waterGradient!;
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderWaveSurface();
    this.renderRipples();
    this.renderFloat();
    this.renderParticles();
  }

  private renderWaveSurface(): void {
    const ctx = this.ctx;
    const time = this.time / 1000;

    ctx.save();
    for (let layerIndex = this.waveLayers.length - 1; layerIndex >= 0; layerIndex--) {
      const alpha = 0.05 + (layerIndex / this.waveLayers.length) * 0.1;

      ctx.beginPath();
      ctx.moveTo(0, this.height);

      for (let x = 0; x <= this.width; x += 3) {
        const waveHeight = this.getWaveHeight(x, 0, time) * (1 + layerIndex * 0.2);
        const y = this.height * 0.5 + waveHeight + layerIndex * 10;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(this.width, this.height);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, this.height * 0.4, 0, this.height * 0.6);
      gradient.addColorStop(0, `rgba(100, 255, 218, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(2, 12, 27, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    for (let x = 0; x <= this.width; x += 2) {
      const y = this.height * 0.5 + this.getWaveHeight(x, 0, time) * 2;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = 'rgba(100, 255, 218, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  private renderRipples(): void {
    const ctx = this.ctx;

    for (const ripple of this.ripples) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, ripple.radius, ripple.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100, 255, 218, ${ripple.opacity})`;
      ctx.lineWidth = ripple.width;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderFloat(): void {
    if (!this.float) return;

    const ctx = this.ctx;
    const x = this.float.x + this.float.offsetX;
    const y = this.float.y + this.float.offsetY;
    const time = this.time / 1000;

    ctx.save();
    const glowRadius = 40;
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glowGradient.addColorStop(0, 'rgba(100, 255, 218, 0.3)');
    glowGradient.addColorStop(0.5, 'rgba(100, 255, 218, 0.1)');
    glowGradient.addColorStop(1, 'rgba(100, 255, 218, 0)');

    ctx.translate(x, y);
    ctx.rotate(this.float.glowRotation);
    ctx.translate(-x, -y);
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(this.float.scale, this.float.scale);

    const floatColor = this.float.isBiting ? '#ff4757' : '#ffffff';
    const shadowColor = this.float.isBiting ? 'rgba(255, 71, 87, 0.8)' : 'rgba(255, 255, 255, 0.5)';

    if (this.float.isBiting) {
      const flash = Math.sin(time * 4) > 0;
      if (flash) {
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 20;
      }
    } else {
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 8;
    }

    ctx.fillStyle = floatColor;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(8, 0, 0, 12);
    ctx.quadraticCurveTo(-8, 0, 0, -12);
    ctx.fill();

    ctx.fillStyle = 'rgba(100, 255, 218, 0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (!this.float.isBiting) {
      this.addRipplePeriodically(x, y);
    }
  }

  private lastRippleTime: number = 0;
  private addRipplePeriodically(x: number, y: number): void {
    const now = Date.now();
    if (now - this.lastRippleTime > 800) {
      this.addRipple(x, y + 5, 40, 1200);
      this.lastRippleTime = now;
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    for (const particle of this.particles.particles) {
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderWaterCone(x: number, y: number, progress: number): void {
    if (progress >= 1) return;

    const ctx = this.ctx;
    const height = 100 * Math.sin(progress * Math.PI);
    const width = 80 * (1 - progress * 0.5);

    ctx.save();
    ctx.globalAlpha = 0.6 * (1 - progress);

    const gradient = ctx.createLinearGradient(x, y - height, x, y);
    gradient.addColorStop(0, 'rgba(147, 197, 253, 0.8)');
    gradient.addColorStop(0.5, 'rgba(100, 255, 218, 0.5)');
    gradient.addColorStop(1, 'rgba(100, 255, 218, 0.1)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.quadraticCurveTo(x, y - height, x + width / 2, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  getActiveParticleCount(): number {
    return this.particles.particles.length;
  }
}
