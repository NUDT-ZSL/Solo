export interface BubbleData {
  id: string;
  content: string;
  title: string;
  createdAt: number;
  color: string;
}

interface Bubble {
  data: BubbleData;
  x: number;
  y: number;
  baseY: number;
  radius: number;
  floatOffset: number;
  floatSpeed: number;
  floatAmplitude: number;
  rotationAngle: number;
  rotationSpeed: number;
  scale: number;
  targetScale: number;
  opacity: number;
  phase: 'floating' | 'fishing' | 'entering';
  enterProgress: number;
  fishingProgress: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
}

const BUBBLE_COLORS = [
  'rgba(255, 154, 162, 0.6)',
  'rgba(147, 196, 255, 0.6)',
  'rgba(181, 234, 215, 0.6)',
  'rgba(255, 218, 150, 0.6)',
  'rgba(200, 170, 255, 0.6)',
  'rgba(255, 181, 222, 0.6)',
  'rgba(160, 230, 250, 0.6)',
];

const BUBBLE_GLOW_COLORS = [
  'rgba(255, 154, 162, 0.15)',
  'rgba(147, 196, 255, 0.15)',
  'rgba(181, 234, 215, 0.15)',
  'rgba(255, 218, 150, 0.15)',
  'rgba(200, 170, 255, 0.15)',
  'rgba(255, 181, 222, 0.15)',
  'rgba(160, 230, 250, 0.15)',
];

export class OceanScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bubbles: Bubble[] = [];
  private particles: Particle[] = [];
  private animFrameId: number = 0;
  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private hoveredBubble: Bubble | null = null;
  private onBubbleClick: ((data: BubbleData) => void) | null = null;
  private onBubbleHover: ((data: BubbleData | null, x: number, y: number) => void) | null = null;
  private width: number = 0;
  private height: number = 0;
  private time: number = 0;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.bindEvents();
  }

  setCallbacks(
    onClick: (data: BubbleData) => void,
    onHover: (data: BubbleData | null, x: number, y: number) => void
  ) {
    this.onBubbleClick = onClick;
    this.onBubbleHover = onHover;
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  private bindEvents() {
    const onMouseMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.updateHover();
    };

    const onMouseLeave = () => {
      this.mouseX = -1000;
      this.mouseY = -1000;
      this.hoveredBubble = null;
      if (this.onBubbleHover) this.onBubbleHover(null, 0, 0);
    };

    const onClick = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const clicked = this.findBubbleAt(x, y);
      if (clicked && clicked.phase === 'floating' && this.onBubbleClick) {
        this.onBubbleClick(clicked.data);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const clicked = this.findBubbleAt(x, y);
      if (clicked && clicked.phase === 'floating' && this.onBubbleClick) {
        this.onBubbleClick(clicked.data);
      }
    };

    const onResize = () => {
      this.resize();
      this.repositionBubbles();
    };

    this.canvas.addEventListener('mousemove', onMouseMove);
    this.canvas.addEventListener('mouseleave', onMouseLeave);
    this.canvas.addEventListener('click', onClick);
    this.canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('resize', onResize);

    (this as any)._cleanupResize = () => {
      this.canvas.removeEventListener('mousemove', onMouseMove);
      this.canvas.removeEventListener('mouseleave', onMouseLeave);
      this.canvas.removeEventListener('click', onClick);
      this.canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('resize', onResize);
    };
  }

  private repositionBubbles() {
    for (const b of this.bubbles) {
      if (b.x > this.width) b.x = Math.random() * this.width;
      if (b.y > this.height) b.y = Math.random() * this.height;
      b.baseY = b.y;
    }
  }

  private findBubbleAt(x: number, y: number): Bubble | null {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (b.phase !== 'floating') continue;
      const dx = x - b.x;
      const dy = y - b.y;
      const r = b.radius * b.scale;
      if (dx * dx + dy * dy < r * r) return b;
    }
    return null;
  }

  private updateHover() {
    const found = this.findBubbleAt(this.mouseX, this.mouseY);
    if (found !== this.hoveredBubble) {
      this.hoveredBubble = found;
      if (this.onBubbleHover) {
        this.onBubbleHover(
          found ? found.data : null,
          found ? found.x : 0,
          found ? found.y : 0
        );
      }
    }
  }

  addBubble(data: BubbleData) {
    const colorIdx = Math.floor(Math.random() * BUBBLE_COLORS.length);
    const radius = 28 + Math.random() * 22;
    const x = 40 + Math.random() * (this.width - 80);
    const y = this.height + radius + 20;
    const bubble: Bubble = {
      data,
      x,
      y,
      baseY: 60 + Math.random() * (this.height - 120),
      radius,
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.3 + Math.random() * 0.5,
      floatAmplitude: 8 + Math.random() * 12,
      rotationAngle: Math.random() * Math.PI * 2,
      rotationSpeed: (0.2 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1),
      scale: 1,
      targetScale: 1,
      opacity: 1,
      phase: 'entering',
      enterProgress: 0,
      fishingProgress: 0,
    };
    bubble.data.color = BUBBLE_COLORS[colorIdx];
    this.bubbles.push(bubble);
  }

  removeBubble(id: string) {
    const bubble = this.bubbles.find(b => b.data.id === id);
    if (bubble && bubble.phase === 'floating') {
      bubble.phase = 'fishing';
      bubble.fishingProgress = 0;
    }
  }

  refreshOcean() {
    this.bubbles = [];
    this.particles = [];
  }

  private spawnFishingParticles(bubble: Bubble) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: bubble.x,
        y: bubble.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        radius: 2 + Math.random() * 3,
        color: bubble.data.color,
        opacity: 0.8,
        life: 0,
        maxLife: 40 + Math.random() * 20,
      });
    }
  }

  private updateBubbles() {
    const toRemove: number[] = [];

    for (let i = 0; i < this.bubbles.length; i++) {
      const b = this.bubbles[i];

      if (b.phase === 'entering') {
        b.enterProgress += 0.02;
        const t = Math.min(b.enterProgress, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        b.y = this.height + b.radius + 20 - (this.height + b.radius + 20 - b.baseY) * ease;
        b.opacity = ease;
        if (t >= 1) {
          b.phase = 'floating';
          b.y = b.baseY;
        }
      }

      if (b.phase === 'floating') {
        b.y = b.baseY + Math.sin(this.time * b.floatSpeed + b.floatOffset) * b.floatAmplitude;
        b.rotationAngle += b.rotationSpeed * 0.01;

        if (this.hoveredBubble === b) {
          b.targetScale = 1.2;
        } else {
          b.targetScale = 1;
        }
        b.scale += (b.targetScale - b.scale) * 0.08;
      }

      if (b.phase === 'fishing') {
        b.fishingProgress += 0.025;
        const t = Math.min(b.fishingProgress, 1);
        b.y -= 3 + t * 6;
        b.scale = Math.max(0, 1 - t * t);
        b.opacity = Math.max(0, 1 - t);

        if (b.fishingProgress < 0.05) {
          this.spawnFishingParticles(b);
        }

        if (t >= 1) {
          toRemove.push(i);
        }
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.bubbles.splice(toRemove[i], 1);
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life++;
      p.opacity = Math.max(0, 1 - p.life / p.maxLife);
      p.radius *= 0.98;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#E0F4FF');
    gradient.addColorStop(0.5, '#D0F0F0');
    gradient.addColorStop(1, '#B8F0D8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBubble(bubble: Bubble) {
    const ctx = this.ctx;
    const { x, y, radius, scale, opacity, data, rotationAngle } = bubble;
    const r = radius * scale;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);

    const colorIdx = BUBBLE_COLORS.indexOf(data.color);
    const glowColor = BUBBLE_GLOW_COLORS[colorIdx >= 0 ? colorIdx : 0];

    const outerGlow = ctx.createRadialGradient(0, 0, r, 0, 0, r * 1.8);
    outerGlow.addColorStop(0, glowColor);
    outerGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.3, data.color);
    gradient.addColorStop(0.7, data.color.replace(/[\d.]+\)$/, '0.3)'));
    gradient.addColorStop(1, data.color.replace(/[\d.]+\)$/, '0.05)'));

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = data.color.replace(/[\d.]+\)$/, '0.4)');
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const highlightGrad = ctx.createRadialGradient(
      -r * 0.25, -r * 0.25, r * 0.05,
      -r * 0.15, -r * 0.15, r * 0.5
    );
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.25, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = highlightGrad;
    ctx.fill();

    if (scale > 1.1) {
      ctx.save();
      ctx.rotate(rotationAngle * 0.3);
      const innerGrad = ctx.createRadialGradient(
        r * 0.1, r * 0.15, r * 0.02,
        r * 0.1, r * 0.15, r * 0.35
      );
      innerGrad.addColorStop(0, 'rgba(255,255,255,0.4)');
      innerGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(r * 0.1, r * 0.15, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      grad.addColorStop(0, p.color.replace(/[\d.]+\)$/, '0.8)'));
      grad.addColorStop(1, p.color.replace(/[\d.]+\)$/, '0)'));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();

    const sorted = [...this.bubbles].sort((a, b) => a.radius - b.radius);
    for (const bubble of sorted) {
      this.drawBubble(bubble);
    }

    this.drawParticles();
  }

  private animate = () => {
    this.time += 0.016;
    this.updateBubbles();
    this.updateParticles();
    this.render();
    this.animFrameId = requestAnimationFrame(this.animate);
  };

  start() {
    this.animate();
  }

  stop() {
    cancelAnimationFrame(this.animFrameId);
    const cleanup = (this as any)._cleanupResize;
    if (cleanup) cleanup();
  }

  getBubbleCount(): number {
    return this.bubbles.filter(b => b.phase === 'floating').length;
  }
}
