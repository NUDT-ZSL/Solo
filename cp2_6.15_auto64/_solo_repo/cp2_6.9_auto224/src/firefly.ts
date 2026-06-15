export interface FireflyConfig {
  x: number;
  y: number;
  color: string;
  size: number;
  speed: number;
  radius: number;
  pulsePhase: number;
  pulsePeriod: number;
  baseAlpha: number;
}

const COLORS = ['#C8FF70', '#7FFF00', '#A0FF50', '#D4FF80'];

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  speed: number;
  baseRadius: number;
  radius: number;
  pulsePhase: number;
  pulsePeriod: number;
  baseAlpha: number;
  alpha: number;
  baseGlowSize: number;

  angle: number;
  sineOffset: number;
  sineAmplitude: number;
  sineFrequency: number;
  originX: number;
  originY: number;

  attractTargetX: number | null;
  attractTargetY: number | null;
  attractStrength: number;
  minAttractDistance: number;

  isAttracting: boolean;
  dispersing: boolean;
  disperseProgress: number;
  disperseStartX: number;
  disperseStartY: number;
  disperseTargetX: number;
  disperseTargetY: number;
  disperseDuration: number;

  repelBoost: number;
  repelBoostTimer: number;

  swarmTargetX: number | null;
  swarmTargetY: number | null;
  swarmStrength: number;

  globalBrightness: number;

  constructor(config: FireflyConfig) {
    this.x = config.x;
    this.y = config.y;
    this.vx = 0;
    this.vy = 0;
    this.color = config.color;
    this.size = config.size;
    this.speed = config.speed;
    this.baseRadius = config.radius;
    this.radius = config.radius;
    this.pulsePhase = config.pulsePhase;
    this.pulsePeriod = config.pulsePeriod;
    this.baseAlpha = config.baseAlpha;
    this.alpha = config.baseAlpha;
    this.baseGlowSize = this.size * 4;

    this.angle = Math.random() * Math.PI * 2;
    this.sineOffset = Math.random() * Math.PI * 2;
    this.sineAmplitude = 0.3 + Math.random() * 0.7;
    this.sineFrequency = 0.5 + Math.random() * 1.5;
    this.originX = this.x;
    this.originY = this.y;

    this.attractTargetX = null;
    this.attractTargetY = null;
    this.attractStrength = 0;
    this.minAttractDistance = 30;

    this.isAttracting = false;
    this.dispersing = false;
    this.disperseProgress = 1;
    this.disperseStartX = this.x;
    this.disperseStartY = this.y;
    this.disperseTargetX = this.x;
    this.disperseTargetY = this.y;
    this.disperseDuration = 240;

    this.repelBoost = 0;
    this.repelBoostTimer = 0;

    this.swarmTargetX = null;
    this.swarmTargetY = null;
    this.swarmStrength = 0;

    this.globalBrightness = 1.0;
  }

  static createRandom(canvasWidth: number, canvasHeight: number): Firefly {
    return new Firefly({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 3 + Math.random() * 3,
      speed: 0.3 + Math.random() * 0.9,
      radius: 10 + Math.random() * 30,
      pulsePhase: Math.random() * Math.PI * 2,
      pulsePeriod: 0.5 + Math.random() * 1.5,
      baseAlpha: 0.4 + Math.random() * 0.4,
    });
  }

  setAttractTarget(x: number | null, y: number | null, strength: number = 0.05): void {
    if (x === null || y === null) {
      if (this.isAttracting) {
        this.startDisperse();
      }
      this.attractTargetX = null;
      this.attractTargetY = null;
      this.isAttracting = false;
    } else {
      this.attractTargetX = x;
      this.attractTargetY = y;
      this.attractStrength = strength;
      this.isAttracting = true;
      this.dispersing = false;
    }
  }

  startDisperse(): void {
    this.dispersing = true;
    this.disperseProgress = 0;
    this.disperseStartX = this.x;
    this.disperseStartY = this.y;
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 80;
    this.disperseTargetX = this.x + Math.cos(angle) * distance;
    this.disperseTargetY = this.y + Math.sin(angle) * distance;
    this.disperseDuration = 180 + Math.floor(Math.random() * 120);
  }

  applyRepel(centerX: number, centerY: number, waveRadius: number): void {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < waveRadius + 5 && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const pushDist = waveRadius + 20 - dist;
      this.x += nx * pushDist;
      this.y += ny * pushDist;
      this.originX = this.x;
      this.originY = this.y;
      this.vx = nx * 2;
      this.vy = ny * 2;
      this.repelBoost = 0.5;
      this.repelBoostTimer = 60;
    }
  }

  setSwarmTarget(x: number | null, y: number | null, strength: number): void {
    this.swarmTargetX = x;
    this.swarmTargetY = y;
    this.swarmStrength = strength;
  }

  setGlobalBrightness(value: number): void {
    this.globalBrightness = value;
  }

  update(canvasWidth: number, canvasHeight: number, time: number): void {
    this.pulsePhase += (Math.PI * 2) / (this.pulsePeriod * 60);
    const pulse = 0.5 + 0.5 * Math.sin(this.pulsePhase);

    let boostMultiplier = 1;
    if (this.repelBoostTimer > 0) {
      this.repelBoostTimer--;
      const t = this.repelBoostTimer / 60;
      boostMultiplier = 1 + this.repelBoost * t;
    }

    this.alpha = this.baseAlpha * (0.6 + 0.4 * pulse) * this.globalBrightness * boostMultiplier;
    this.radius = this.baseGlowSize * (0.8 + 0.4 * pulse) * boostMultiplier;

    if (this.dispersing) {
      this.disperseProgress++;
      const t = Math.min(this.disperseProgress / this.disperseDuration, 1);
      const eased = easeInOut(t);
      this.x = this.disperseStartX + (this.disperseTargetX - this.disperseStartX) * eased;
      this.y = this.disperseStartY + (this.disperseTargetY - this.disperseStartY) * eased;
      if (t >= 1) {
        this.dispersing = false;
        this.originX = this.x;
        this.originY = this.y;
      }
    } else {
      this.angle += this.speed * 0.02;
      const sineWave = Math.sin(time * 0.001 * this.sineFrequency + this.sineOffset) * this.sineAmplitude;

      let targetX = this.originX + Math.cos(this.angle) * this.baseRadius + sineWave * 10;
      let targetY = this.originY + Math.sin(this.angle) * this.baseRadius + sineWave * 10;

      if (this.isAttracting && this.attractTargetX !== null && this.attractTargetY !== null) {
        const dx = this.attractTargetX - this.x;
        const dy = this.attractTargetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.minAttractDistance) {
          const attractX = this.x + (dx / dist) * this.attractStrength * 60;
          const attractY = this.y + (dy / dist) * this.attractStrength * 60;
          targetX = targetX * 0.3 + attractX * 0.7;
          targetY = targetY * 0.3 + attractY * 0.7;
          this.originX = this.originX * 0.95 + this.attractTargetX * 0.05;
          this.originY = this.originY * 0.95 + this.attractTargetY * 0.05;
        }
      }

      if (this.swarmTargetX !== null && this.swarmTargetY !== null && this.swarmStrength > 0) {
        const dx = this.swarmTargetX - this.x;
        const dy = this.swarmTargetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const swarmX = this.x + (dx / dist) * this.swarmStrength * 2;
          const swarmY = this.y + (dy / dist) * this.swarmStrength * 2;
          targetX = targetX * (1 - this.swarmStrength) + swarmX * this.swarmStrength;
          targetY = targetY * (1 - this.swarmStrength) + swarmY * this.swarmStrength;
        }
      }

      this.vx = this.vx * 0.9 + (targetX - this.x) * 0.1;
      this.vy = this.vy * 0.9 + (targetY - this.y) * 0.1;
      this.x += this.vx;
      this.y += this.vy;
    }

    const margin = 50;
    this.x = Math.max(margin, Math.min(canvasWidth - margin, this.x));
    this.y = Math.max(margin, Math.min(canvasHeight - margin, this.y));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const glowRadius = this.radius;
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, glowRadius
    );
    gradient.addColorStop(0, this.hexToRgba(this.color, this.alpha * 0.9));
    gradient.addColorStop(0.3, this.hexToRgba(this.color, this.alpha * 0.5));
    gradient.addColorStop(0.7, this.hexToRgba(this.color, this.alpha * 0.15));
    gradient.addColorStop(1, this.hexToRgba(this.color, 0));

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.hexToRgba('#FFFFFF', this.alpha * 0.9);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getBrightness(): number {
    return this.alpha;
  }
}
