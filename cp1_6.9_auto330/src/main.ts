import { TextProcessor, type CharInfo } from './textProcessor';
import { Particle } from './particle';

interface SealStamp {
  x: number;
  y: number;
  radius: number;
  glowStartTime: number;
  glowDuration: number;
  isGlowing: boolean;
}

interface CounterBadge {
  x: number;
  y: number;
  radius: number;
  count: number;
}

class App {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  textProcessor: TextProcessor;
  particles: Particle[] = [];
  poemText: string = '';
  sealCount: number = 0;
  isSealed: boolean = false;
  sealStartTime: number = 0;
  lastFrameTime: number = 0;
  animationId: number = 0;

  sealStamp: SealStamp = {
    x: 0, y: 0, radius: 30, glowStartTime: 0, glowDuration: 2000, isGlowing: false,
  };

  counterBadge: CounterBadge = { x: 0, y: 0, radius: 26, count: 0 };

  isMobile: boolean = false;
  noiseCanvas: HTMLCanvasElement | null = null;
  linesCanvas: HTMLCanvasElement | null = null;

  uiInputWrapper: HTMLDivElement;
  uiPoemInput: HTMLTextAreaElement;
  uiSealBtn: HTMLButtonElement;
  uiResetBtn: HTMLButtonElement;
  uiCharCounter: HTMLDivElement;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.textProcessor = new TextProcessor(this.canvas);

    this.uiInputWrapper = document.getElementById('input-wrapper') as HTMLDivElement;
    this.uiPoemInput = document.getElementById('poem-input') as HTMLTextAreaElement;
    this.uiSealBtn = document.getElementById('seal-btn') as HTMLButtonElement;
    this.uiResetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.uiCharCounter = document.getElementById('char-counter') as HTMLDivElement;

    this.setupCanvas();
    this.setupUI();
    this.generateTextures();
    this.updateLayout();
    this.startAnimationLoop();
  }

  setupCanvas(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.updateLayout();
      this.generateTextures();
    });
  }

  resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.isMobile = window.innerWidth <= 640;

    if (this.isMobile) {
      const targetW = Math.min(window.innerWidth, 360);
      const targetH = Math.min(window.innerHeight, 640);
      this.canvas.style.width = targetW + 'px';
      this.canvas.style.height = targetH + 'px';
      this.canvas.width = targetW * dpr;
      this.canvas.height = targetH * dpr;
    } else {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.textProcessor.updateDimensions();
  }

  updateLayout(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    if (this.isMobile) {
      this.sealStamp.x = w / 2;
      this.sealStamp.y = 60;
      this.sealStamp.radius = 28;
    } else {
      this.sealStamp.x = 60;
      this.sealStamp.y = 60;
      this.sealStamp.radius = 30;
    }

    this.counterBadge.x = w - 40;
    this.counterBadge.y = h - 40;
    this.counterBadge.radius = this.isMobile ? 22 : 26;
  }

  setupUI(): void {
    this.uiPoemInput.addEventListener('input', () => {
      const len = Array.from(this.uiPoemInput.value).length;
      this.uiCharCounter.textContent = `${len} / 140`;
      this.uiSealBtn.disabled = len === 0;
    });

    this.uiSealBtn.addEventListener('click', () => {
      this.performSeal();
    });

    this.uiResetBtn.addEventListener('click', () => {
      this.reset();
    });

    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.handleParticleClick(touch.clientX - rect.left, touch.clientY - rect.top);
    }, { passive: false });
  }

  handleCanvasClick(e: MouseEvent): void {
    if (!this.isSealed) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.handleParticleClick(x, y);
  }

  handleParticleClick(x: number, y: number): void {
    const time = performance.now();
    for (const p of this.particles) {
      if (p.isClicked(x, y)) {
        p.returnToOrigin(time);
        return;
      }
    }
  }

  performSeal(): void {
    const text = this.uiPoemInput.value.trim();
    if (!text) return;

    this.poemText = text;
    this.isSealed = true;
    this.sealCount++;
    this.sealStartTime = performance.now();
    this.counterBadge.count = this.sealCount;
    this.sealStamp.isGlowing = true;
    this.sealStamp.glowStartTime = this.sealStartTime;

    Particle.clearEffects();

    const layout = this.textProcessor.process(text);
    const shuffledChars = this.textProcessor.shuffleChars(layout.chars);
    const fontSize = this.textProcessor.getFontSize();
    const cx = this.textProcessor.getCenterX();
    const cy = this.textProcessor.getCenterY();

    this.particles = shuffledChars.map((charInfo: CharInfo, i: number) => {
      const orbitRadius = this.textProcessor.getOrbitRadius(
        this.isMobile,
        i,
        shuffledChars.length
      ) * (this.isMobile ? 0.8 : 1);

      const particle = new Particle(
        charInfo,
        orbitRadius,
        i,
        shuffledChars.length,
        fontSize,
        cx,
        cy
      );
      particle.startPeel(this.sealStartTime);
      return particle;
    });

    this.uiInputWrapper.classList.add('hidden');
    this.uiResetBtn.classList.add('show');
  }

  reset(): void {
    this.isSealed = false;
    this.particles = [];
    Particle.clearEffects();
    this.uiInputWrapper.classList.remove('hidden');
    this.uiResetBtn.classList.remove('show');
  }

  generateTextures(): void {
    this.generateNoiseTexture();
    this.generateLinesTexture();
  }

  generateNoiseTexture(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d')!;

    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    const alpha = Math.floor(0.05 * 255);

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() > 0.5 ? 120 : 80;
      data[i] = v;
      data[i + 1] = v - 10;
      data[i + 2] = v - 25;
      data[i + 3] = Math.random() * alpha;
    }
    ctx.putImageData(imageData, 0, 0);
    this.noiseCanvas = off;
  }

  generateLinesTexture(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const ctx = off.getContext('2d')!;

    ctx.strokeStyle = 'rgba(150, 110, 70, 0.04)';
    ctx.lineWidth = 1;

    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      const startX = Math.random() * w;
      const startY = Math.random() * h;
      ctx.moveTo(startX, startY);
      const segments = 3 + Math.floor(Math.random() * 4);
      let x = startX, y = startY;
      for (let j = 0; j < segments; j++) {
        x += (Math.random() - 0.5) * 120;
        y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(100, 70, 40, 0.03)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const rx = 30 + Math.random() * 80;
      const ry = 15 + Math.random() * 50;
      ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.stroke();
    }

    this.linesCanvas = off;
  }

  drawParchmentBackground(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    const gradient = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, '#F5E6CA');
    gradient.addColorStop(0.6, '#F0DEC0');
    gradient.addColorStop(1, '#E3D3B7');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    if (this.linesCanvas) {
      this.ctx.globalAlpha = 1;
      this.ctx.drawImage(this.linesCanvas, 0, 0, w, h);
    }

    const vignette = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(80, 50, 20, 0.12)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, w, h);

    if (this.noiseCanvas) {
      this.ctx.globalAlpha = 1;
      this.ctx.drawImage(this.noiseCanvas, 0, 0, w, h);
    }
  }

  drawSealStamp(time: number): void {
    const { x, y, radius } = this.sealStamp;
    let glowAlpha = 0;

    if (this.sealStamp.isGlowing) {
      const elapsed = time - this.sealStamp.glowStartTime;
      const progress = elapsed / this.sealStamp.glowDuration;
      if (progress >= 1) {
        this.sealStamp.isGlowing = false;
      } else {
        glowAlpha = (1 - progress) * 1.3;
      }
    }

    this.ctx.save();
    this.ctx.translate(x, y);

    if (glowAlpha > 0) {
      const glowRadius = radius * (2.5 + glowAlpha * 0.5);
      const glow = this.ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, glowRadius);
      glow.addColorStop(0, `hsla(35, 100%, 80%, ${glowAlpha * 0.7})`);
      glow.addColorStop(0.5, `hsla(30, 95%, 70%, ${glowAlpha * 0.4})`);
      glow.addColorStop(1, `hsla(25, 90%, 60%, 0)`);
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.strokeStyle = 'rgba(80, 45, 25, 0.7)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(-radius - 2, -radius * 0.5 - i * 3);
      this.ctx.bezierCurveTo(
        -radius * 0.5, -radius * 0.7 - i * 2,
        radius * 0.5, -radius * 0.6 - i * 2,
        radius + 2, -radius * 0.4 - i * 3
      );
      this.ctx.stroke();
    }

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 5;

    const bodyGrad = this.ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
    bodyGrad.addColorStop(0, '#D4853A');
    bodyGrad.addColorStop(0.5, '#B8682A');
    bodyGrad.addColorStop(1, '#8B4A1A');
    this.ctx.fillStyle = bodyGrad;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.fillStyle = 'rgba(255, 220, 160, 0.25)';
    this.ctx.beginPath();
    this.ctx.ellipse(-radius * 0.3, -radius * 0.3, radius * 0.35, radius * 0.2, -0.4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#4A2210';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = '#3A1808';
    this.ctx.font = `bold ${radius * 1.1}px 'Ma Shan Zheng', 'Patrick Hand SC', cursive`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('诗', 0, 2);

    this.ctx.restore();
  }

  drawCounterBadge(): void {
    const { x, y, radius, count } = this.counterBadge;
    if (count === 0) return;

    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 3;

    const badgeGrad = this.ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
    badgeGrad.addColorStop(0, '#8B2635');
    badgeGrad.addColorStop(0.6, '#6B1A27');
    badgeGrad.addColorStop(1, '#4A0E18');
    this.ctx.fillStyle = badgeGrad;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.strokeStyle = 'rgba(255, 200, 180, 0.4)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = '#F8E7D6';
    this.ctx.font = `bold ${radius * 0.9}px 'Patrick Hand SC', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(String(count), 0, 1);

    this.ctx.restore();
  }

  startAnimationLoop(): void {
    this.lastFrameTime = performance.now();
    const loop = () => {
      const now = performance.now();
      const delta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.render(now, delta);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  render(time: number, deltaTime: number): void {
    this.drawParchmentBackground();

    if (this.isSealed) {
      Particle.updateTrailDots(deltaTime);
      Particle.updatePulseEffects(deltaTime);

      for (const p of this.particles) {
        p.update(time, this.textProcessor.getCenterX(), this.textProcessor.getCenterY());
      }

      Particle.drawPulseEffects(this.ctx);

      const sorted = [...this.particles].sort((a, b) => a.z - b.z);
      for (const p of sorted) {
        p.draw(this.ctx, time);
      }

      Particle.drawTrailDots(this.ctx);
    }

    this.drawSealStamp(time);
    this.drawCounterBadge();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
