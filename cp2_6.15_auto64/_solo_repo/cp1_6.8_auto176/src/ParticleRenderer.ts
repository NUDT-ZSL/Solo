interface InkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export class ParticleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: InkParticle[] = [];
  private animId: number = 0;
  private running: boolean = false;
  private dpr: number = 1;
  private w: number = 0;
  private h: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private createParticle(): InkParticle {
    const maxLife = 400 + Math.random() * 600;
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.1 - Math.random() * 0.3,
      radius: 1 + Math.random() * 2.5,
      opacity: 0.05 + Math.random() * 0.15,
      life: 0,
      maxLife,
    };
  }

  private initParticles() {
    const count = Math.min(50, Math.floor((this.w * this.h) / 20000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const p = this.createParticle();
      p.life = Math.random() * p.maxLife;
      this.particles.push(p);
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.initParticles();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  handleResize() {
    this.resize();
    this.initParticles();
  }

  private loop = () => {
    if (!this.running) return;
    this.update();
    this.draw();
    this.animId = requestAnimationFrame(this.loop);
  };

  private update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      if (p.life >= p.maxLife || p.y < -10 || p.x < -10 || p.x > this.w + 10) {
        this.particles[i] = this.createParticle();
      }
    }
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.w, this.h);

    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      const fadeIn = Math.min(lifeRatio * 5, 1);
      const fadeOut = lifeRatio > 0.8 ? 1 - (lifeRatio - 0.8) / 0.2 : 1;
      const alpha = p.opacity * fadeIn * fadeOut;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(40, 35, 30, ${alpha})`;
      this.ctx.fill();
    }
  }

  destroy() {
    this.stop();
  }
}
