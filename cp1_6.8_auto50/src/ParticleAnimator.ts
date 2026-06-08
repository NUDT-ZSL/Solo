interface PeachPetal {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  speedX: number;
  speedY: number;
  swayAmplitude: number;
  swaySpeed: number;
  swayOffset: number;
  color: string;
  life: number;
}

interface InkBlob {
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  opacity: number;
  speed: number;
  angle: number;
  color: string;
}

const PETAL_COLORS = [
  'rgba(232, 180, 184, 0.7)',
  'rgba(240, 192, 196, 0.6)',
  'rgba(220, 160, 168, 0.5)',
  'rgba(245, 200, 204, 0.65)',
  'rgba(210, 148, 158, 0.55)',
];

const INK_COLORS = [
  'rgba(184, 197, 201, 0.08)',
  'rgba(74, 102, 112, 0.05)',
  'rgba(245, 240, 232, 0.06)',
  'rgba(184, 197, 201, 0.04)',
  'rgba(74, 102, 112, 0.03)',
];

export class ParticleAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private petals: PeachPetal[] = [];
  private inkBlobs: InkBlob[] = [];
  private animationId: number = 0;
  private lastTime: number = 0;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private maxPetals: number = 80;
  private maxInkBlobs: number = 6;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
  }

  init(): void {
    this.resize();
    this.initInkBlobs();
    this.initPetals();
    this.lastTime = performance.now();
    this.animate();
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(this.dpr, this.dpr);

    if (this.width < 768) {
      this.maxPetals = 30;
    } else if (this.width < 1024) {
      this.maxPetals = 50;
    } else {
      this.maxPetals = 80;
    }

    while (this.petals.length < this.maxPetals) {
      this.petals.push(this.createPetal(true));
    }
    while (this.petals.length > this.maxPetals) {
      this.petals.pop();
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private createPetal(randomY: boolean = false): PeachPetal {
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -20,
      size: 6 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.3 + Math.random() * 0.5,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: 0.3 + Math.random() * 0.8,
      swayAmplitude: 20 + Math.random() * 40,
      swaySpeed: 0.5 + Math.random() * 1.5,
      swayOffset: Math.random() * Math.PI * 2,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      life: 0,
    };
  }

  private initPetals(): void {
    this.petals = [];
    for (let i = 0; i < this.maxPetals; i++) {
      this.petals.push(this.createPetal(true));
    }
  }

  private initInkBlobs(): void {
    this.inkBlobs = [];
    for (let i = 0; i < this.maxInkBlobs; i++) {
      this.inkBlobs.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 80 + Math.random() * 200,
        targetRadius: 80 + Math.random() * 200,
        opacity: 0.04 + Math.random() * 0.06,
        speed: 0.1 + Math.random() * 0.3,
        angle: Math.random() * Math.PI * 2,
        color: INK_COLORS[Math.floor(Math.random() * INK_COLORS.length)],
      });
    }
  }

  private updatePetals(dt: number): void {
    for (const petal of this.petals) {
      petal.life += dt;
      petal.y += petal.speedY * dt * 60;
      const sway = Math.sin(petal.life * petal.swaySpeed + petal.swayOffset) * petal.swayAmplitude * 0.01;
      petal.x += (petal.speedX + sway) * dt * 60;
      petal.rotation += petal.rotationSpeed * dt * 60;

      if (petal.y > this.height + 30 || petal.x < -50 || petal.x > this.width + 50) {
        Object.assign(petal, this.createPetal(false));
      }
    }
  }

  private updateInkBlobs(dt: number): void {
    for (const blob of this.inkBlobs) {
      blob.angle += blob.speed * dt * 0.01;
      blob.x += Math.cos(blob.angle) * 0.3 * dt * 60;
      blob.y += Math.sin(blob.angle * 0.7) * 0.2 * dt * 60;
      blob.radius += (blob.targetRadius - blob.radius) * 0.001 * dt * 60;

      if (Math.random() < 0.002 * dt * 60) {
        blob.targetRadius = 80 + Math.random() * 200;
      }

      if (blob.x < -blob.radius) blob.x = this.width + blob.radius;
      if (blob.x > this.width + blob.radius) blob.x = -blob.radius;
      if (blob.y < -blob.radius) blob.y = this.height + blob.radius;
      if (blob.y > this.height + blob.radius) blob.y = -blob.radius;
    }
  }

  private drawInkBlobs(): void {
    for (const blob of this.inkBlobs) {
      const gradient = this.ctx.createRadialGradient(
        blob.x, blob.y, 0,
        blob.x, blob.y, blob.radius
      );
      gradient.addColorStop(0, blob.color);
      gradient.addColorStop(1, 'rgba(184, 197, 201, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawPetal(petal: PeachPetal): void {
    this.ctx.save();
    this.ctx.translate(petal.x, petal.y);
    this.ctx.rotate(petal.rotation);
    this.ctx.globalAlpha = petal.opacity;
    this.ctx.fillStyle = petal.color;

    this.ctx.beginPath();
    const s = petal.size;
    this.ctx.moveTo(0, -s);
    this.ctx.bezierCurveTo(s * 0.8, -s * 0.6, s * 0.6, s * 0.3, 0, s);
    this.ctx.bezierCurveTo(-s * 0.6, s * 0.3, -s * 0.8, -s * 0.6, 0, -s);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.strokeStyle = `rgba(220, 160, 168, ${petal.opacity * 0.3})`;
    this.ctx.lineWidth = 0.5;
    this.ctx.moveTo(0, -s * 0.8);
    this.ctx.quadraticCurveTo(s * 0.1, 0, 0, s * 0.8);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawPetals(): void {
    for (const petal of this.petals) {
      this.drawPetal(petal);
    }
  }

  private animate = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.updateInkBlobs(dt);
    this.drawInkBlobs();

    this.updatePetals(dt);
    this.drawPetals();

    this.animationId = requestAnimationFrame(this.animate);
  };
}
