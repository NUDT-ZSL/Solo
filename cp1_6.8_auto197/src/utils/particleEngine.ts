import { EmotionConfig, FoodConfig } from '@/data/mockData';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
  shape: 'glow' | 'bubble' | 'smoke' | 'spark';
  behavior: 'float' | 'bubble' | 'spiral' | 'burst';
  angle: number;
  orbitRadius: number;
  orbitSpeed: number;
  burst: boolean;
  burstVx: number;
  burstVy: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private bgParticles: BackgroundParticle[] = [];
  private animFrameId: number = 0;
  private emotionConfig: EmotionConfig;
  private foodConfig: FoodConfig | null = null;
  private rotationY = 0;
  private rotationX = 0;
  private targetRotationY = 0;
  private targetRotationX = 0;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private centerX = 0;
  private centerY = 0;
  private autoRotate = true;
  private maxParticles: number;
  private emitTimer = 0;
  private onParticleBurst: ((x: number, y: number) => void) | null = null;
  private isDetailMode = false;

  constructor(canvas: HTMLCanvasElement, emotionConfig: EmotionConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.emotionConfig = emotionConfig;
    this.maxParticles = window.innerWidth < 768 ? 80 : 200;
    this.resize();
    this.initBgParticles();
    this.bindEvents();
  }

  setFoodConfig(foodConfig: FoodConfig) {
    this.foodConfig = foodConfig;
  }

  setDetailMode(mode: boolean) {
    this.isDetailMode = mode;
    this.maxParticles = mode ? (window.innerWidth < 768 ? 120 : 300) : (window.innerWidth < 768 ? 60 : 150);
  }

  setOnBurst(cb: (x: number, y: number) => void) {
    this.onParticleBurst = cb;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
  }

  private initBgParticles() {
    this.bgParticles = [];
    const count = window.innerWidth < 768 ? 30 : 60;
    const rect = this.canvas.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      this.bgParticles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.2 - 0.1,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
        color: this.getRandomWarmColor(),
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }
  }

  private getRandomWarmColor(): string {
    const colors = ['#FFD700', '#FFA500', '#FF8C42', '#C9A9FF', '#FFB6C1', '#D2B48C'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.resize();
    this.initBgParticles();
  };

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.autoRotate = false;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.targetRotationY += dx * 0.005;
    this.targetRotationX += dy * 0.003;
    this.targetRotationX = Math.max(-0.5, Math.min(0.5, this.targetRotationX));
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseUp = () => {
    this.isDragging = false;
    setTimeout(() => {
      if (!this.isDragging) this.autoRotate = true;
    }, 3000);
  };

  private onClick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.handleBurstAt(mx, my);
  };

  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    this.isDragging = true;
    this.autoRotate = false;
    this.lastMouseX = touch.clientX;
    this.lastMouseY = touch.clientY;
  };

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - this.lastMouseX;
    const dy = touch.clientY - this.lastMouseY;
    this.targetRotationY += dx * 0.005;
    this.targetRotationX += dy * 0.003;
    this.targetRotationX = Math.max(-0.5, Math.min(0.5, this.targetRotationX));
    this.lastMouseX = touch.clientX;
    this.lastMouseY = touch.clientY;
  };

  private onTouchEnd = () => {
    this.isDragging = false;
    setTimeout(() => {
      if (!this.isDragging) this.autoRotate = true;
    }, 3000);
  };

  private handleBurstAt(mx: number, my: number) {
    const dist = Math.sqrt((mx - this.centerX) ** 2 + (my - this.centerY) ** 2);
    if (dist < 150) {
      for (const p of this.particles) {
        if (p.burst) continue;
        const dx = p.x - this.centerX;
        const dy = p.y - this.centerY;
        const dz = p.z;
        const px = this.projectX(dx, dy, dz) + this.centerX;
        const py = this.projectY(dx, dy, dz) + this.centerY;
        const d = Math.sqrt((px - mx) ** 2 + (py - my) ** 2);
        if (d < 120) {
          p.burst = true;
          const angle = Math.atan2(py - my, px - mx);
          const speed = Math.random() * 5 + 3;
          p.burstVx = Math.cos(angle) * speed;
          p.burstVy = Math.sin(angle) * speed;
        }
      }
      if (this.onParticleBurst) {
        this.onParticleBurst(mx, my);
      }
    }
  }

  private projectX(x: number, _y: number, z: number): number {
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);
    return x * cosY - z * sinY;
  }

  private projectY(x: number, y: number, z: number): number {
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);
    const cosX = Math.cos(this.rotationX);
    const sinX = Math.sin(this.rotationX);
    const rz = x * sinY + z * cosY;
    return y * cosX - rz * sinX;
  }

  private projectZ(x: number, y: number, z: number): number {
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);
    const cosX = Math.cos(this.rotationX);
    const sinX = Math.sin(this.rotationX);
    const ry = y;
    const rz = x * sinY + z * cosY;
    return ry * sinX + rz * cosX;
  }

  private emitParticle() {
    if (this.particles.length >= this.maxParticles) return;
    const cfg = this.emotionConfig;
    const shape = this.foodConfig?.particleShape || 'glow';
    const radius = this.isDetailMode ? 120 : 60;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;

    const p: Particle = {
      x: Math.cos(angle) * r,
      y: (Math.random() - 0.3) * radius,
      z: Math.sin(angle) * r,
      vx: 0,
      vy: 0,
      vz: 0,
      color: cfg.particleColor,
      alpha: 0,
      size: Math.random() * 4 + 2,
      life: 0,
      maxLife: Math.random() * 200 + 150,
      shape,
      behavior: cfg.particleBehavior,
      angle: angle,
      orbitRadius: r,
      orbitSpeed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      burst: false,
      burstVx: 0,
      burstVy: 0,
      trail: [],
    };

    if (Math.random() > 0.5) {
      p.color = cfg.secondaryColor;
    }

    this.particles.push(p);
  }

  private updateParticle(p: Particle) {
    p.life++;

    if (p.burst) {
      p.x += p.burstVx;
      p.y += p.burstVy;
      p.burstVx *= 0.96;
      p.burstVy *= 0.96;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife) * 0.8;
      p.size *= 0.99;
      return;
    }

    const lifeRatio = p.life / p.maxLife;
    if (lifeRatio < 0.1) {
      p.alpha = lifeRatio / 0.1;
    } else if (lifeRatio > 0.8) {
      p.alpha = (1 - lifeRatio) / 0.2;
    } else {
      p.alpha = 1;
    }

    switch (p.behavior) {
      case 'float':
        p.angle += p.orbitSpeed;
        p.x = Math.cos(p.angle) * p.orbitRadius;
        p.z = Math.sin(p.angle) * p.orbitRadius;
        p.y += (Math.sin(p.life * 0.02) * 0.3 - 0.1);
        p.size = (Math.sin(p.life * 0.03) * 0.5 + 1) * 3;
        break;

      case 'bubble':
        p.y -= 0.5 + Math.random() * 0.3;
        p.x += Math.sin(p.life * 0.05) * 0.3;
        p.z += Math.cos(p.life * 0.04) * 0.2;
        p.size = Math.max(1, p.size + (Math.random() - 0.5) * 0.1);
        if (p.y < -150) {
          p.y = 80 + Math.random() * 40;
          p.alpha = 0;
        }
        break;

      case 'spiral':
        p.angle += p.orbitSpeed * 1.5;
        p.orbitRadius += 0.05;
        p.x = Math.cos(p.angle) * p.orbitRadius;
        p.z = Math.sin(p.angle) * p.orbitRadius;
        p.y += Math.sin(p.life * 0.01) * 0.5 - 0.05;
        break;

      case 'burst':
        p.angle += p.orbitSpeed * 2;
        p.orbitRadius += Math.sin(p.life * 0.1) * 0.5;
        p.x = Math.cos(p.angle) * p.orbitRadius;
        p.z = Math.sin(p.angle) * p.orbitRadius;
        p.y += (Math.random() - 0.5) * 0.8;
        if (Math.random() < 0.05) {
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = (Math.random() - 0.5) * 2;
        }
        p.x += p.vx * 0.2;
        p.y += p.vy * 0.2;
        p.vx *= 0.98;
        p.vy *= 0.98;
        break;
    }

    p.alpha = Math.max(0, Math.min(1, p.alpha)) * 0.85;
  }

  private drawParticle(p: Particle) {
    const px = this.projectX(p.x, p.y, p.z) + this.centerX;
    const py = this.projectY(p.x, p.y, p.z) + this.centerY;
    const pz = this.projectZ(p.x, p.y, p.z);
    const perspective = 600 / (600 + pz);
    const size = p.size * perspective;

    if (px < -50 || px > this.canvas.width + 50 || py < -50 || py > this.canvas.height + 50) return;

    this.ctx.save();
    this.ctx.globalAlpha = p.alpha * perspective;

    switch (p.shape) {
      case 'glow':
        const glowGrad = this.ctx.createRadialGradient(px, py, 0, px, py, size * 3);
        glowGrad.addColorStop(0, p.color);
        glowGrad.addColorStop(0.4, p.color + '80');
        glowGrad.addColorStop(1, p.color + '00');
        this.ctx.fillStyle = glowGrad;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalAlpha = p.alpha * perspective * 0.6;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case 'bubble':
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = p.alpha * perspective * 0.7;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fillStyle = p.color + '30';
        this.ctx.globalAlpha = p.alpha * perspective * 0.3;
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.globalAlpha = p.alpha * perspective * 0.4;
        this.ctx.beginPath();
        this.ctx.arc(px - size * 0.3, py - size * 0.3, size * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case 'smoke':
        const smokeGrad = this.ctx.createRadialGradient(px, py, 0, px, py, size * 2);
        smokeGrad.addColorStop(0, p.color + '60');
        smokeGrad.addColorStop(0.5, p.color + '30');
        smokeGrad.addColorStop(1, p.color + '00');
        this.ctx.fillStyle = smokeGrad;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;

      case 'spark':
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(px, py, size * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = p.color + '80';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = p.alpha * perspective * 0.5;
        const tailLen = size * 3;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(px - p.vx * tailLen, py - p.vy * tailLen);
        this.ctx.stroke();
        break;
    }

    this.ctx.restore();
  }

  private drawBgParticles() {
    const rect = this.canvas.getBoundingClientRect();
    for (const p of this.bgParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += p.pulseSpeed;

      if (p.y < -10) {
        p.y = rect.height + 10;
        p.x = Math.random() * rect.width;
      }
      if (p.x < -10) p.x = rect.width + 10;
      if (p.x > rect.width + 10) p.x = -10;

      const alpha = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, p.color + '00');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  start() {
    const animate = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);

      this.drawBgParticles();

      if (this.autoRotate) {
        this.targetRotationY += 0.003;
      }
      this.rotationY += (this.targetRotationY - this.rotationY) * 0.08;
      this.rotationX += (this.targetRotationX - this.rotationX) * 0.08;

      this.emitTimer++;
      if (this.emitTimer % 3 === 0) {
        this.emitParticle();
      }

      this.particles = this.particles.filter((p) => p.life < p.maxLife && p.size > 0.1);
      for (const p of this.particles) {
        this.updateParticle(p);
      }

      const sorted = [...this.particles].sort((a, b) => {
        return this.projectZ(b.x, b.y, b.z) - this.projectZ(a.x, a.y, a.z);
      });

      for (const p of sorted) {
        this.drawParticle(p);
      }

      this.animFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  stop() {
    cancelAnimationFrame(this.animFrameId);
  }

  destroy() {
    this.stop();
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.onResize);
  }
}

export class BackgroundParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: BackgroundParticle[] = [];
  private animFrameId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.initParticles();
    window.addEventListener('resize', this.onResize);
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private initParticles() {
    this.particles = [];
    const rect = this.canvas.getBoundingClientRect();
    const count = window.innerWidth < 768 ? 25 : 50;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.15 - 0.05,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.35 + 0.05,
        color: this.warmColor(),
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.015 + 0.005,
      });
    }
  }

  private warmColor(): string {
    const colors = ['#FFD700', '#FFA500', '#FF8C42', '#C9A9FF', '#FFB6C1', '#D2B48C', '#E0B0FF'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private onResize = () => {
    this.resize();
    this.initParticles();
  };

  start() {
    const animate = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.ctx.clearRect(0, 0, rect.width, rect.height);

      for (const p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        if (p.y < -10) {
          p.y = rect.height + 10;
          p.x = Math.random() * rect.width;
        }
        if (p.x < -10) p.x = rect.width + 10;
        if (p.x > rect.width + 10) p.x = -10;

        const alpha = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, p.color + '00');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      this.animFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  stop() {
    cancelAnimationFrame(this.animFrameId);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
  }
}
