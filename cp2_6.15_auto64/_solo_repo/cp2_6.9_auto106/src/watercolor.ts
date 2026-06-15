export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface WatercolorDrop {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: RGB;
  opacity: number;
  initialOpacity: number;
  age: number;
  maxAge: number;
}

export interface BrushStroke {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  width: number;
  color: RGB;
  opacity: number;
  type: 'solid' | 'dry';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: RGB;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface ExplosionRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color1: RGB;
  color2: RGB;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: RGB;
  life: number;
  maxLife: number;
}

export const PALETTE: { name: string; hex: string; rgb: RGB }[] = [
  { name: '朱红', hex: '#C23B22', rgb: { r: 194, g: 59, b: 34 } },
  { name: '藤黄', hex: '#FFD700', rgb: { r: 255, g: 215, b: 0 } },
  { name: '花青', hex: '#2E5D8A', rgb: { r: 46, g: 93, b: 138 } },
  { name: '赭石', hex: '#A0522D', rgb: { r: 160, g: 82, b: 45 } },
  { name: '钛白', hex: '#FAFAFA', rgb: { r: 250, g: 250, b: 250 } },
  { name: '朱砂', hex: '#E63946', rgb: { r: 230, g: 57, b: 70 } },
  { name: '石绿', hex: '#2D6A4F', rgb: { r: 45, g: 106, b: 79 } },
  { name: '群青', hex: '#404E88', rgb: { r: 64, g: 78, b: 136 } },
  { name: '胭脂', hex: '#9D2933', rgb: { r: 157, g: 41, b: 51 } },
  { name: '鹅黄', hex: '#FFF3B0', rgb: { r: 255, g: 243, b: 176 } },
  { name: '墨色', hex: '#2C2C2C', rgb: { r: 44, g: 44, b: 44 } },
  { name: '紫色', hex: '#7B4B94', rgb: { r: 123, g: 75, b: 148 } },
];

const PAPER_COLOR: RGB = { r: 245, g: 230, b: 204 };

function rgbToString(rgb: RGB, alpha: number = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
  };
}

function getComplementaryColor(rgb: RGB): RGB {
  return {
    r: 255 - rgb.r,
    g: 255 - rgb.g,
    b: 255 - rgb.b,
  };
}

function saturateColor(rgb: RGB, amount: number): RGB {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  if (max === min) return rgb;
  
  const increase = (v: number) => {
    if (v === max) return Math.min(255, Math.round(v + (255 - v) * amount));
    if (v === min) return Math.max(0, Math.round(v - v * amount));
    return v;
  };
  
  return {
    r: increase(rgb.r),
    g: increase(rgb.g),
    b: increase(rgb.b),
  };
}

export class PaperTexture {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private noiseData: Uint8ClampedArray;
  private width: number;
  private height: number;
  private breathPhase: number = 0;
  private intensity: number = 0.6;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    this.noiseData = this.generateNoiseData();
  }

  private generateNoiseData(): Uint8ClampedArray {
    const data = new Uint8ClampedArray(this.width * this.height);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 255;
    }
    return data;
  }

  setIntensity(value: number): void {
    this.intensity = value;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  update(deltaTime: number): void {
    this.breathPhase += deltaTime * ((2 * Math.PI) / 5000);
  }

  render(): void {
    const ctx = this.ctx;
    const breath = (Math.sin(this.breathPhase) + 1) / 2;
    const brightness = 1 + breath * 0.08;

    ctx.fillStyle = rgbToString({
      r: Math.min(255, Math.round(PAPER_COLOR.r * brightness)),
      g: Math.min(255, Math.round(PAPER_COLOR.g * brightness)),
      b: Math.min(255, Math.round(PAPER_COLOR.b * brightness)),
    });
    ctx.fillRect(0, 0, this.width, this.height);

    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const pixels = imageData.data;
    const intensity = this.intensity;

    for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
      const noise = this.noiseData[j] / 255;
      const fiberNoise = (Math.sin(j * 0.01) * 0.5 + 0.5) * 0.3;
      const variation = ((noise - 0.5) * 0.12 + (fiberNoise - 0.15) * 0.08) * intensity;

      pixels[i] = Math.max(0, Math.min(255, pixels[i] + variation * 255));
      pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + variation * 255));
      pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + variation * 255 * 0.8));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.noiseData = this.generateNoiseData();
  }
}

export class WatercolorEngine {
  private drops: WatercolorDrop[] = [];
  private particles: Particle[] = [];
  private splashParticles: SplashParticle[] = [];
  private explosionRings: ExplosionRing[] = [];
  private diffusionSpeed: number = 1;
  private baseOpacity: number = 0.7;

  setDiffusionSpeed(speed: number): void {
    this.diffusionSpeed = speed;
  }

  setBaseOpacity(opacity: number): void {
    this.baseOpacity = opacity;
  }

  getActiveParticleCount(): number {
    return this.drops.length + this.particles.length + this.splashParticles.length + this.explosionRings.length;
  }

  addDrop(x: number, y: number, color: RGB): void {
    const radius = 8 + Math.random() * 4;
    this.drops.push({
      x,
      y,
      radius,
      maxRadius: radius * (3 + Math.random() * 2),
      color,
      opacity: this.baseOpacity,
      initialOpacity: this.baseOpacity,
      age: 0,
      maxAge: 4000 + Math.random() * 2000,
    });
  }

  addStroke(fromX: number, fromY: number, toX: number, toY: number, speed: number, color: RGB): void {
    if (speed < 150) {
      this.addSolidStroke(fromX, fromY, toX, toY, color);
    } else if (speed < 400) {
      this.addDryStroke(fromX, fromY, toX, toY, color);
    } else {
      this.addSplashParticles(fromX, fromY, toX, toY, color);
    }
  }

  private addSolidStroke(fromX: number, fromY: number, toX: number, toY: number, color: RGB): void {
    const width = 12 + Math.random() * 6;
    this.interpolateStroke(fromX, fromY, toX, toY, (x, y) => {
      this.drops.push({
        x: x + (Math.random() - 0.5) * 2,
        y: y + (Math.random() - 0.5) * 2,
        radius: width / 2 * (0.8 + Math.random() * 0.4),
        maxRadius: width * (1.5 + Math.random()),
        color,
        opacity: this.baseOpacity * 0.6,
        initialOpacity: this.baseOpacity * 0.6,
        age: 0,
        maxAge: 3000 + Math.random() * 1500,
      });
    }, width / 3);
  }

  private addDryStroke(fromX: number, fromY: number, toX: number, toY: number, color: RGB): void {
    const width = 6 + Math.random() * 4;
    this.interpolateStroke(fromX, fromY, toX, toY, (x, y) => {
      if (Math.random() < 0.75) {
        const offsetX = (Math.random() - 0.5) * width * 0.8;
        const offsetY = (Math.random() - 0.5) * width * 0.8;
        this.drops.push({
          x: x + offsetX,
          y: y + offsetY,
          radius: (width / 2) * (0.3 + Math.random() * 0.5),
          maxRadius: width * (0.8 + Math.random() * 0.5),
          color,
          opacity: this.baseOpacity * 0.4,
          initialOpacity: this.baseOpacity * 0.4,
          age: 0,
          maxAge: 2000 + Math.random() * 1000,
        });
      }
    }, width / 2);
  }

  private addSplashParticles(fromX: number, fromY: number, toX: number, toY: number, color: RGB): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const count = 10 + Math.floor(Math.random() * 11);
    const saturatedColor = saturateColor(color, 0.2);

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 20 + Math.random() * 80;
      const particleAngle = angle + spread;
      this.particles.push({
        x: fromX + Math.random() * dx,
        y: fromY + Math.random() * dy,
        vx: Math.cos(particleAngle) * speed,
        vy: Math.sin(particleAngle) * speed,
        radius: 1 + Math.random() * 3,
        color: saturatedColor,
        opacity: this.baseOpacity * (0.5 + Math.random() * 0.4),
        life: 0,
        maxLife: 600 + Math.random() * 800,
      });
    }
  }

  addClickSplash(x: number, y: number, color: RGB): void {
    const count = 20 + Math.floor(Math.random() * 21);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 100;
      this.splashParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1 + Math.random() * 4,
        color,
        life: 0,
        maxLife: 500,
      });
    }
  }

  addExplosion(x: number, y: number, color: RGB): void {
    const maxRadius = 80 + Math.random() * 40;
    this.explosionRings.push({
      x,
      y,
      radius: 10,
      maxRadius,
      color1: color,
      color2: getComplementaryColor(color),
      opacity: this.baseOpacity,
      life: 0,
      maxLife: 1200,
    });

    const count = 40 + Math.floor(Math.random() * 31);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      const particleColor = Math.random() < 0.5 ? color : getComplementaryColor(color);
      this.splashParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 5,
        color: particleColor,
        life: 0,
        maxLife: 800 + Math.random() * 400,
      });
    }
  }

  private interpolateStroke(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    callback: (x: number, y: number) => void,
    step: number
  ): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(distance / step));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      callback(fromX + dx * t, fromY + dy * t);
    }
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const diffusionRate = 2.5 * this.diffusionSpeed;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.age += deltaTime;
      drop.radius = Math.min(drop.maxRadius, drop.radius + diffusionRate * dt);
      drop.opacity = drop.initialOpacity * (1 - drop.age / drop.maxAge);

      if (drop.age >= drop.maxAge || drop.opacity <= 0.01) {
        this.drops.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 20 * dt;
      p.opacity = (1 - p.life / p.maxLife) * this.baseOpacity;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.splashParticles.length - 1; i >= 0; i--) {
      const p = this.splashParticles[i];
      p.life += deltaTime;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.opacity = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife) {
        this.splashParticles.splice(i, 1);
      }
    }

    for (let i = this.explosionRings.length - 1; i >= 0; i--) {
      const ring = this.explosionRings[i];
      ring.life += deltaTime;
      const t = ring.life / ring.maxLife;
      ring.radius = ring.maxRadius * t;
      ring.opacity = (1 - t) * this.baseOpacity;

      if (ring.life >= ring.maxLife) {
        this.explosionRings.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (const ring of this.explosionRings) {
      const gradient = ctx.createRadialGradient(ring.x, ring.y, ring.radius * 0.7, ring.x, ring.y, ring.radius);
      gradient.addColorStop(0, rgbToString(ring.color1, 0));
      gradient.addColorStop(0.5, rgbToString(lerpColor(ring.color1, ring.color2, 0.5), ring.opacity * 0.8));
      gradient.addColorStop(1, rgbToString(ring.color2, 0));

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'multiply';
    for (const drop of this.drops) {
      const gradient = ctx.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, drop.radius);
      gradient.addColorStop(0, rgbToString(drop.color, drop.opacity * 0.9));
      gradient.addColorStop(0.6, rgbToString(drop.color, drop.opacity * 0.5));
      gradient.addColorStop(1, rgbToString(drop.color, 0));

      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = rgbToString(p.color, p.opacity);
      ctx.fill();
    }

    for (const p of this.splashParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = rgbToString(p.color, p.opacity);
      ctx.fill();
    }

    ctx.restore();
  }

  clear(): void {
    this.drops.length = 0;
    this.particles.length = 0;
    this.splashParticles.length = 0;
    this.explosionRings.length = 0;
  }
}
