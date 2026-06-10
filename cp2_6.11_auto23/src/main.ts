import { Timeline, YearNode, FragmentPopup } from './timeline';
import {
  PixelData,
  Particle,
  FloatingParticle,
  CollectedCard,
  createFloatingParticles,
  createExplosionParticles,
  drawPixelIcon
} from './fragment';

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
    let radii: number[];
    if (typeof r === 'number') {
      radii = [r, r, r, r];
    } else if (Array.isArray(r)) {
      radii = r.length === 1 ? [r[0], r[0], r[0], r[0]] : r;
    } else {
      radii = [0, 0, 0, 0];
    }
    this.beginPath();
    this.moveTo(x + radii[0], y);
    this.lineTo(x + w - radii[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
    this.lineTo(x + w, y + h - radii[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
    this.lineTo(x + radii[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
    this.lineTo(x, y + radii[0]);
    this.quadraticCurveTo(x, y, x + radii[0], y);
    this.closePath();
    return this;
  };
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewportW = 0;
  viewportH = 0;
  dpr = 1;
  isVertical = false;

  timeline: Timeline;
  particles: Particle[] = [];
  floatingParticles: FloatingParticle[] = [];
  collectedCards: CollectedCard[] = [];

  draggingFragment: PixelData | null = null;
  dragX = 0;
  dragY = 0;

  collectZoneX = 0;
  collectZoneY = 0;
  collectZoneW = 0;
  collectZoneH = 0;
  collectZoneHover = false;

  hoveredCard: CollectedCard | null = null;
  hoveredFragment: PixelData | null = null;

  lastTime = 0;
  animationId = 0;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.timeline = new Timeline();
    this.resize();
    this.bindEvents();
    this.loop = this.loop.bind(this);
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.viewportW = window.innerWidth;
    this.viewportH = window.innerHeight;

    this.canvas.width = this.viewportW * this.dpr;
    this.canvas.height = this.viewportH * this.dpr;
    this.canvas.style.width = `${this.viewportW}px`;
    this.canvas.style.height = `${this.viewportH}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.isVertical = this.viewportW < 768;

    if (this.isVertical) {
      this.collectZoneX = this.viewportW * 0.05;
      this.collectZoneY = this.viewportH * 0.75;
      this.collectZoneW = this.viewportW * 0.9;
      this.collectZoneH = this.viewportH * 0.2;
    } else {
      this.collectZoneX = this.viewportW * 0.75;
      this.collectZoneY = this.viewportH * 0.7;
      this.collectZoneW = this.viewportW * 0.22;
      this.collectZoneH = this.viewportH * 0.25;
    }

    this.timeline.updateLayout(this.viewportW, this.viewportH, this.isVertical);
    this.rearrangeCards();
  }

  rearrangeCards(): void {
    const padding = 10;
    const cardW = 120;
    const cardH = 160;
    const cols = Math.max(1, Math.floor((this.collectZoneW - padding * 2) / (cardW + padding)));

    this.collectedCards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      card.x = this.collectZoneX + padding + col * (cardW + padding);
      card.y = this.collectZoneY + padding + row * (cardH + padding);
    });
  }

  bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', (e) => this.onPointerUp(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp(-1, -1));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onPointerDown(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onPointerMove(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onPointerUp(-1, -1);
    }, { passive: false });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.timeline.scroll(-e.deltaY * 0.3);
      this.timeline.updateNodePositions(this.viewportW, this.viewportH);
    }, { passive: false });
  }

  onPointerDown(x: number, y: number): void {
    if (this.timeline.popup && this.timeline.popup.visible) {
      const frag = this.getFragmentAt(x, y, this.timeline.popup);
      if (frag) {
        this.draggingFragment = frag;
        this.dragX = x;
        this.dragY = y;
        return;
      }
      if (!this.isPointInPopup(x, y, this.timeline.popup)) {
        this.timeline.closePopup();
      }
      return;
    }

    const node = this.timeline.handleClick(x, y);
    if (node && node.year <= this.timeline.currentYear) {
      const popup = this.timeline.openPopup(node, this.viewportW, this.viewportH);
      popup.fragments.forEach(f => {
        const fps = createFloatingParticles(f.id, 0, 0, f.complementaryColor);
        this.floatingParticles.push(...fps);
      });
    }
  }

  onPointerMove(x: number, y: number): void {
    this.dragX = x;
    this.dragY = y;

    this.collectZoneHover = this.isPointInCollectZone(x, y);

    this.hoveredFragment = null;
    if (this.timeline.popup && !this.draggingFragment) {
      this.hoveredFragment = this.getFragmentAt(x, y, this.timeline.popup);
    }

    this.hoveredCard = null;
    for (const card of this.collectedCards) {
      card.hover = false;
      if (x >= card.x && x <= card.x + 120 && y >= card.y && y <= card.y + 160) {
        this.hoveredCard = card;
        card.hover = true;
      }
    }
  }

  onPointerUp(x: number, y: number): void {
    if (this.draggingFragment && this.isPointInCollectZone(x, y)) {
      this.collectFragment(this.draggingFragment, x, y);
    }
    this.draggingFragment = null;
  }

  isPointInPopup(x: number, y: number, popup: FragmentPopup): boolean {
    const w = 500;
    const h = 250;
    return x >= popup.x && x <= popup.x + w && y >= popup.y && y <= popup.y + h;
  }

  isPointInCollectZone(x: number, y: number): boolean {
    return x >= this.collectZoneX && x <= this.collectZoneX + this.collectZoneW &&
           y >= this.collectZoneY && y <= this.collectZoneY + this.collectZoneH;
  }

  getFragmentAt(x: number, y: number, popup: FragmentPopup): PixelData | null {
    const startX = popup.x + 20;
    const startY = popup.y + 60;
    const gap = 90;

    for (let i = 0; i < popup.fragments.length; i++) {
      const fx = startX + i * gap;
      const fy = startY;
      if (x >= fx && x <= fx + 64 && y >= fy && y <= fy + 80) {
        return popup.fragments[i];
      }
    }
    return null;
  }

  collectFragment(fragment: PixelData, x: number, y: number): void {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF8C42', '#A78BFA', fragment.color];
    const explosion = createExplosionParticles(x, y, colors);
    this.particles.push(...explosion);

    this.timeline.addToTimeline(fragment);

    const cardW = 120;
    const cardH = 160;
    const padding = 10;
    const cols = Math.max(1, Math.floor((this.collectZoneW - padding * 2) / (cardW + padding)));
    const idx = this.collectedCards.length;
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    this.collectedCards.push({
      fragment,
      x: this.collectZoneX + padding + col * (cardW + padding),
      y: this.collectZoneY + padding + row * (cardH + padding),
      scale: 0,
      targetScale: 1,
      hover: false
    });

    this.floatingParticles = this.floatingParticles.filter(p => p.ownerId !== fragment.id);
  }

  update(): void {
    this.timeline.update();

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life++;
      return p.life < p.maxLife;
    });

    this.updateFloatingParticles();

    for (const card of this.collectedCards) {
      const target = card.hover ? 1.05 : card.targetScale;
      card.scale += (target - card.scale) * 0.15;
    }
  }

  updateFloatingParticles(): void {
    if (!this.timeline.popup) return;

    const popup = this.timeline.popup;
    const startX = popup.x + 20;
    const startY = popup.y + 60;
    const gap = 90;

    for (let i = 0; i < popup.fragments.length; i++) {
      const frag = popup.fragments[i];
      const fx = startX + i * gap + 32;
      const fy = startY + 32;

      for (const p of this.floatingParticles) {
        if (p.ownerId !== frag.id) continue;
        p.angle += 0.02;
        p.x += Math.cos(p.angle) * 0.8 + (fx - p.x) * 0.02;
        p.y += Math.sin(p.angle * 0.7) * 0.6 + (fy - p.y) * 0.02;
        p.x += (Math.random() - 0.5) * 0.5;
        p.y += (Math.random() - 0.5) * 0.5;
      }
    }
  }

  draw(): void {
    this.ctx.clearRect(0, 0, this.viewportW, this.viewportH);

    this.timeline.draw(this.ctx, this.viewportW, this.viewportH);
    this.drawCollectZone();
    this.drawCollectedCards();

    if (this.timeline.popup) {
      this.drawPopup(this.timeline.popup);
    }

    this.drawParticles();
    this.drawFloatingParticles();

    if (this.draggingFragment) {
      this.drawDraggingFragment();
    }
  }

  drawCollectZone(): void {
    const glowAlpha = this.collectZoneHover || this.draggingFragment ? 0.6 : 0.3;
    const pulse = Math.sin(performance.now() / 500) * 0.1 + 0.9;

    this.ctx.save();

    this.ctx.shadowColor = `rgba(100, 200, 180, ${glowAlpha * pulse})`;
    this.ctx.shadowBlur = 20;
    this.ctx.strokeStyle = `rgba(100, 220, 200, ${glowAlpha})`;
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = 'rgba(200, 230, 220, 0.04)';

    this.ctx.beginPath();
    this.ctx.roundRect(this.collectZoneX, this.collectZoneY, this.collectZoneW, this.collectZoneH, 16);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;

    this.ctx.font = "300 16px 'Cormorant Garamond', serif";
    this.ctx.fillStyle = 'rgba(200, 230, 220, 0.7)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('◆  收集区  ◆', this.collectZoneX + this.collectZoneW / 2, this.collectZoneY + 24);

    if (this.collectedCards.length === 0) {
      this.ctx.font = "300 13px 'Cormorant Garamond', serif";
      this.ctx.fillStyle = 'rgba(200, 230, 220, 0.4)';
      this.ctx.fillText('拖拽碎片至此处', this.collectZoneX + this.collectZoneW / 2, this.collectZoneY + this.collectZoneH / 2);
    }

    this.ctx.restore();
  }

  drawPopup(popup: FragmentPopup): void {
    const w = 500;
    const h = 250;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(20, 35, 50, 0.92)';
    this.ctx.strokeStyle = 'rgba(100, 220, 200, 0.3)';
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 30;
    this.ctx.beginPath();
    this.ctx.roundRect(popup.x, popup.y, w, h, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;

    this.ctx.font = "400 22px 'Cormorant Garamond', serif";
    const textGrad = this.ctx.createLinearGradient(popup.x, popup.y, popup.x + 100, popup.y);
    textGrad.addColorStop(0, 'rgba(240, 250, 255, 1)');
    textGrad.addColorStop(1, 'rgba(255, 230, 120, 1)');
    this.ctx.fillStyle = textGrad;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`${popup.year} 年 · 文化裂隙`, popup.x + 20, popup.y + 18);

    this.ctx.font = "300 12px 'Cormorant Garamond', serif";
    this.ctx.fillStyle = 'rgba(200, 220, 230, 0.5)';
    this.ctx.fillText('点击并拖拽碎片至收集区', popup.x + 20, popup.y + 42);

    const startX = popup.x + 20;
    const startY = popup.y + 60;
    const gap = 90;

    popup.fragments.forEach((frag, i) => {
      const fx = startX + i * gap;
      const fy = startY;
      const isHover = this.hoveredFragment?.id === frag.id;
      const scale = isHover ? 1.05 : 1;

      this.ctx.save();
      this.ctx.translate(fx + 32, fy + 40);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-32, -40);

      this.ctx.fillStyle = frag.color;
      this.ctx.shadowColor = frag.color;
      this.ctx.shadowBlur = isHover ? 15 : 8;
      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, 64, 64, 8);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      drawPixelIcon(this.ctx, frag.icon, 16, 12, 2, 'rgba(255,255,255,0.95)');

      this.ctx.font = "300 11px 'Cormorant Garamond', serif";
      this.ctx.fillStyle = 'rgba(240, 250, 255, 0.85)';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(frag.title.split(' ')[1], 32, 72);

      this.ctx.restore();
    });

    this.ctx.restore();
  }

  drawCollectedCards(): void {
    for (const card of this.collectedCards) {
      const s = card.scale;
      if (s < 0.01) continue;

      this.ctx.save();
      this.ctx.translate(card.x + 60, card.y + 80);
      this.ctx.scale(s, s);
      this.ctx.translate(-60, -80);

      const shadowBlur = card.hover ? 20 : 10;
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      this.ctx.shadowBlur = shadowBlur;
      this.ctx.fillStyle = 'rgba(25, 40, 55, 0.95)';
      this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, 120, 160, 12);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;

      this.ctx.fillStyle = card.fragment.color;
      this.ctx.beginPath();
      this.ctx.roundRect(15, 15, 90, 70, 8);
      this.ctx.fill();

      drawPixelIcon(this.ctx, card.fragment.icon, 32, 24, 4, 'rgba(255,255,255,0.95)');

      this.ctx.font = "400 14px 'Cormorant Garamond', serif";
      this.ctx.fillStyle = 'rgba(255, 240, 200, 1)';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(`${card.fragment.year}`, 60, 95);

      this.ctx.font = "300 12px 'Cormorant Garamond', serif";
      this.ctx.fillStyle = 'rgba(200, 220, 230, 0.8)';
      this.ctx.fillText(card.fragment.title.split(' ')[1], 60, 115);

      this.ctx.beginPath();
      this.ctx.rect(12, 135, 96, 1);
      this.ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
      this.ctx.fill();

      this.ctx.font = "300 10px 'Cormorant Garamond', serif";
      this.ctx.fillStyle = 'rgba(180, 200, 210, 0.6)';
      const text = card.fragment.description;
      const scrollOffset = (performance.now() / 30) % (text.length * 8 + 120);
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(12, 140, 96, 18);
      this.ctx.clip();
      this.ctx.fillText(text, 60 - scrollOffset + 60, 143);
      this.ctx.restore();

      this.ctx.restore();
    }
  }

  drawParticles(): void {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawFloatingParticles(): void {
    for (const p of this.floatingParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 300 + p.angle) * 0.3;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawDraggingFragment(): void {
    if (!this.draggingFragment) return;
    const f = this.draggingFragment;

    this.ctx.save();
    this.ctx.globalAlpha = 0.85;
    this.ctx.translate(this.dragX, this.dragY);

    this.ctx.fillStyle = f.color;
    this.ctx.shadowColor = f.color;
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.roundRect(-32, -32, 64, 64, 8);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    drawPixelIcon(this.ctx, f.icon, -16, -20, 2, 'rgba(255,255,255,0.95)');

    this.ctx.restore();
  }

  loop(time: number): void {
    this.animationId = requestAnimationFrame(this.loop);
    this.update();
    this.draw();
  }

  start(): void {
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
