import { Flower, EmotionType } from './flower';
import { Particle } from './particle';

const MAX_FLOWERS = 150;
const MAX_PARTICLES = 500;

interface EmotionColors {
  color1: string;
  color2: string;
}

const EMOTION_GRADIENTS: Record<EmotionType, EmotionColors> = {
  happy: { color1: '#ff8c42', color2: '#ffd700' },
  sad: { color1: '#4a6fa5', color2: '#8b6fa5' },
  angry: { color1: '#8b0000', color2: '#ff4500' },
  calm: { color1: '#2ecc71', color2: '#87ceeb' }
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

export class Garden {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private flowers: Flower[] = [];
  private particles: Particle[] = [];
  private currentEmotion: EmotionType = 'calm';
  private targetEmotion: EmotionType = 'calm';
  private emotionTransitionProgress: number = 1;
  private readonly transitionDuration: number = 1.2 * 60;
  private width: number = 0;
  private height: number = 0;
  private animationId: number | null = null;
  private draggingFlower: Flower | null = null;
  private isMouseDown: boolean = false;
  private mouseDownTime: number = 0;
  private mouseDownX: number = 0;
  private mouseDownY: number = 0;
  private hasDragged: boolean = false;
  private frameCount: number = 0;
  private sortedFlowers: Flower[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onMouseUp();
    }, { passive: false });
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.isMouseDown = true;
    this.mouseDownTime = performance.now();
    this.mouseDownX = x;
    this.mouseDownY = y;
    this.hasDragged = false;

    for (let i = this.flowers.length - 1; i >= 0; i--) {
      if (this.flowers[i].containsPoint(x, y)) {
        this.draggingFlower = this.flowers[i];
        this.draggingFlower.startDrag(x, y);
        break;
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isMouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - this.mouseDownX;
    const dy = y - this.mouseDownY;
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      this.hasDragged = true;
    }

    if (this.draggingFlower) {
      this.draggingFlower.updateDrag(x, y);
    }
  }

  private onMouseUp(e?: MouseEvent): void {
    if (this.draggingFlower) {
      this.draggingFlower.endDrag();
      this.draggingFlower = null;
    }

    if (this.isMouseDown && !this.hasDragged && e) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = this.flowers.length - 1; i >= 0; i--) {
        if (this.flowers[i].containsPoint(x, y)) {
          const burstParticles = this.flowers[i].triggerBurst();
          this.particles.push(...burstParticles);
          break;
        }
      }
    }

    this.isMouseDown = false;
  }

  setEmotion(emotion: EmotionType): void {
    if (this.targetEmotion === emotion) return;
    this.targetEmotion = emotion;
    this.emotionTransitionProgress = 0;
    this.spawnFlowers();
  }

  spawnFlowers(x?: number, y?: number): void {
    const count = 20 + Math.floor(Math.random() * 21);
    for (let i = 0; i < count; i++) {
      const fx = x !== undefined ? x + (Math.random() - 0.5) * 100 : Math.random() * this.width;
      const fy = y !== undefined ? y + (Math.random() - 0.5) * 100 : this.height - 50 - Math.random() * 50;
      this.addFlower(fx, fy, this.targetEmotion);
    }
  }

  addFlower(x: number, y: number, emotion: EmotionType): void {
    const flower = new Flower({ x, y, emotion });
    this.flowers.push(flower);
    if (this.flowers.length > MAX_FLOWERS) {
      this.flowers.shift();
    }
  }

  private updateBackground(): void {
    if (this.emotionTransitionProgress < 1) {
      this.emotionTransitionProgress = Math.min(
        this.emotionTransitionProgress + 1 / this.transitionDuration,
        1
      );
      if (this.emotionTransitionProgress >= 1) {
        this.currentEmotion = this.targetEmotion;
      }
    }
  }

  private drawBackground(): void {
    const t = this.emotionTransitionProgress;
    const currentColors = EMOTION_GRADIENTS[this.currentEmotion];
    const targetColors = EMOTION_GRADIENTS[this.targetEmotion];

    const color1 = interpolateColor(currentColors.color1, targetColors.color1, t);
    const color2 = interpolateColor(currentColors.color2, targetColors.color2, t);

    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, color2);
    gradient.addColorStop(1, color1);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  update(): void {
    this.frameCount++;
    this.updateBackground();

    for (const flower of this.flowers) {
      const newParticles = flower.update();
      if (newParticles.length > 0) {
        this.particles.push(...newParticles);
      }
    }

    let flowerCount = this.flowers.length;
    for (let i = flowerCount - 1; i >= 0; i--) {
      if (this.flowers[i].dead) {
        this.flowers.splice(i, 1);
      }
    }

    const particleCount = this.particles.length;
    for (let i = particleCount - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].dead) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }

    if (this.frameCount % 10 === 0) {
      this.sortedFlowers = [...this.flowers].sort((a, b) => a.y - b.y);
    }
  }

  render(): void {
    this.drawBackground();

    const flowers = this.sortedFlowers.length > 0 ? this.sortedFlowers : this.flowers;
    for (const flower of flowers) {
      flower.draw(this.ctx);
    }

    const ctx = this.ctx;
    for (const particle of this.particles) {
      if (particle.dead) continue;
      ctx.save();
      ctx.globalAlpha = particle.alpha;

      if (particle.isGolden) {
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.radius
        );
        gradient.addColorStop(0, 'rgba(255, 223, 0, 1)');
        gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, ${particle.alpha})`;
      }

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  start(): void {
    const loop = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getFlowerCount(): number {
    return this.flowers.length;
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
