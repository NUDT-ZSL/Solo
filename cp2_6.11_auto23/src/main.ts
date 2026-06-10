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

const FRAME_DURATION = 1000 / 60;

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewportW = 0;
  viewportH = 0;
  dpr = 1;
  isVertical = false;
  uiScale = 1;

  timeline: Timeline;
  particles: Particle[] = [];
  floatingParticles: FloatingParticle[] = [];
  collectedCards: CollectedCard[] = [];

  draggingFragment: PixelData | null = null;
  dragX = 0;
  dragY = 0;
  dragStartX = 0;
  dragStartY = 0;
  hasDragged = false;

  collectZoneX = 0;
  collectZoneY = 0;
  collectZoneW = 0;
  collectZoneH = 0;
  collectZoneHover = false;

  hoveredCard: CollectedCard | null = null;
  hoveredFragment: PixelData | null = null;

  lastFrameTime = 0;
  accumulator = 0;
  animationId = 0;

  cardWidth = 120;
  cardHeight = 160;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.timeline = new Timeline();
    this.resize();
    this.bindEvents();
    this.loop = this.loop.bind(this);
  }

  getPointerPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = (this.canvas.width / this.dpr) / rect.width;
    const scaleY = (this.canvas.height / this.dpr) / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
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

    if (this.viewportW < 480) {
      this.uiScale = 0.7;
    } else if (this.viewportW < 768) {
      this.uiScale = 0.85;
    } else {
      this.uiScale = 1;
    }

    this.cardWidth = 120 * this.uiScale;
    this.cardHeight = 160 * this.uiScale;

    if (this.isVertical) {
      this.collectZoneX = this.viewportW * 0.05;
      this.collectZoneY = this.viewportH * 0.72;
      this.collectZoneW = this.viewportW * 0.9;
      this.collectZoneH = this.viewportH * 0.26;
    } else {
      this.collectZoneX = this.viewportW * 0.75;
      this.collectZoneY = this.viewportH * 0.68;
      this.collectZoneW = this.viewportW * 0.22;
      this.collectZoneH = this.viewportH * 0.28;
    }

    this.timeline.updateLayout(this.viewportW, this.viewportH, this.isVertical, this.uiScale);
    this.rearrangeCards();
  }

  rearrangeCards(): void {
    const padding = 10 * this.uiScale;
    const cols = Math.max(1, Math.floor((this.collectZoneW - padding * 2) / (this.cardWidth + padding)));

    this.collectedCards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      card.x = this.collectZoneX + padding + col * (this.cardWidth + padding);
      card.y = this.collectZoneY + padding + row * (this.cardHeight + padding) + 30;
    });
  }

  bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = this.getPointerPos(e.clientX, e.clientY);
      this.onPointerDown(pos.x, pos.y);
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const pos = this.getPointerPos(e.clientX, e.clientY);
      this.onPointerMove(pos.x, pos.y);
    });
    this.canvas.addEventListener('mouseup', (e) => {
      const pos = this.getPointerPos(e.clientX, e.clientY);
      this.onPointerUp(pos.x, pos.y);
    });
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp(-1, -1));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const pos = this.getPointerPos(t.clientX, t.clientY);
      this.onPointerDown(pos.x, pos.y);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const pos = this.getPointerPos(t.clientX, t.clientY);
      this.onPointerMove(pos.x, pos.y);
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
    this.dragStartX = x;
    this.dragStartY = y;
    this.hasDragged = false;

    if (this.timeline.popup && this.timeline.popup.visible) {
      console.log('[DEBUG] Pointer down at:', x, y);
      console.log('[DEBUG] Popup at:', this.timeline.popup.x, this.timeline.popup.y);
      console.log('[DEBUG] uiScale:', this.uiScale);
      
      const startX = this.timeline.popup.x + 20 * this.uiScale;
      const startY = this.timeline.popup.y + 60 * this.uiScale;
      const gap = 90 * this.uiScale;
      const fragW = 64 * this.uiScale;
      const fragH = 80 * this.uiScale;
      
      this.timeline.popup.fragments.forEach((f, i) => {
        console.log(`[DEBUG] Fragment ${i}:`, 
          startX + i * gap, startY, 
          'to', startX + i * gap + fragW, startY + fragH,
          f.title);
      });
      
      const frag = this.getFragmentAt(x, y, this.timeline.popup);
      console.log('[DEBUG] Hit fragment:', frag ? frag.title : 'null');
      
      if (frag) {
        this.draggingFragment = frag;
        this.dragX = x;
        this.dragY = y;
        return;
      }
      if (!this.isPointInPopup(x, y, this.timeline.popup)) {
        console.log('[DEBUG] Click outside popup, closing');
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

    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;
    if (Math.sqrt(dx * dx + dy * dy) > 5) {
      this.hasDragged = true;
    }

    this.collectZoneHover = this.isPointInCollectZone(x, y);

    this.hoveredFragment = null;
    if (this.timeline.popup && !this.draggingFragment) {
      this.hoveredFragment = this.getFragmentAt(x, y, this.timeline.popup);
    }

    this.hoveredCard = null;
    for (const card of this.collectedCards) {
      card.hover = false;
      if (x >= card.x && x <= card.x + this.cardWidth && y >= card.y && y <= card.y + this.cardHeight) {
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
    const w = 500 * this.uiScale;
    const h = 250 * this.uiScale;
    return x >= popup.x && x <= popup.x + w && y >= popup.y && y <= popup.y + h;
  }

  isPointInCollectZone(x: number, y: number): boolean {
    return x >= this.collectZoneX && x <= this.collectZoneX + this.collectZoneW &&
           y >= this.collectZoneY && y <= this.collectZoneY + this.collectZoneH;
  }

  getFragmentAt(x: number, y: number, popup: FragmentPopup): PixelData | null {
    const startX = popup.x + 20 * this.uiScale;
    const startY = popup.y + 60 * this.uiScale;
    const gap = 90 * this.uiScale;
    const fragW = 64 * this.uiScale;
    const fragH = 80 * this.uiScale;

    for (let i = 0; i < popup.fragments.length; i++) {
      const fx = startX + i * gap;
      const fy = startY;
      if (x >= fx && x <= fx + fragW && y >= fy && y <= fy + fragH) {
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

    const padding = 10 * this.uiScale;
    const cols = Math.max(1, Math.floor((this.collectZoneW - padding * 2) / (this.cardWidth + padding)));
    const idx = this.collectedCards.length;
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    this.collectedCards.push({
      fragment,
      x: this.collectZoneX + padding + col * (this.cardWidth + padding),
      y: this.collectZoneY + padding + row * (this.cardHeight + padding) + 30,
      scale: 0,
      targetScale: 1,
      hover: false
    });

    this.floatingParticles = this.floatingParticles.filter(p => p.ownerId !== fragment.id);
  }

  update(deltaTime: number): void {
    const dt = deltaTime / FRAME_DURATION;

    this.timeline.update(dt);

    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.05 * dt;
      p.life += dt;
      return p.life < p.maxLife;
    });

    this.updateFloatingParticles(dt);

    for (const card of this.collectedCards) {
      const target = card.hover ? 1.05 : card.targetScale;
      card.scale += (target - card.scale) * 0.15 * dt;
    }
  }

  updateFloatingParticles(dt: number): void {
    if (!this.timeline.popup) return;

    const popup = this.timeline.popup;
    const startX = popup.x + 20 * this.uiScale;
    const startY = popup.y + 60 * this.uiScale;
    const gap = 90 * this.uiScale;

    for (let i = 0; i < popup.fragments.length; i++) {
      const frag = popup.fragments[i];
      const fx = startX + i * gap + 32 * this.uiScale;
      const fy = startY + 32 * this.uiScale;

      for (const p of this.floatingParticles) {
        if (p.ownerId !== frag.id) continue;
        p.angle += 0.02 * dt;
        p.x += (Math.cos(p.angle) * 0.8 + (fx - p.x) * 0.02) * dt;
        p.y += (Math.sin(p.angle * 0.7) * 0.6 + (fy - p.y) * 0.02) * dt;
        p.x += (Math.random() - 0.5) * 0.5 * dt;
        p.y += (Math.random() - 0.5) * 0.5 * dt;
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

    const fontSize = 16 * this.uiScale;
    this.ctx.font = `300 ${fontSize}px 'Cormorant Garamond', serif`;
    this.ctx.fillStyle = 'rgba(200, 230, 220, 0.7)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('◆  收集区  ◆', this.collectZoneX + this.collectZoneW / 2, this.collectZoneY + 24 * this.uiScale);

    if (this.collectedCards.length === 0) {
      const hintSize = 13 * this.uiScale;
      this.ctx.font = `300 ${hintSize}px 'Cormorant Garamond', serif`;
      this.ctx.fillStyle = 'rgba(200, 230, 220, 0.4)';
      this.ctx.fillText('拖拽碎片至此处', this.collectZoneX + this.collectZoneW / 2, this.collectZoneY + this.collectZoneH / 2);
    }

    this.ctx.restore();
  }

  drawPopup(popup: FragmentPopup): void {
    const w = 500 * this.uiScale;
    const h = 250 * this.uiScale;
    const s = this.uiScale;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(20, 35, 50, 0.92)';
    this.ctx.strokeStyle = 'rgba(100, 220, 200, 0.3)';
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 30;
    this.ctx.beginPath();
    this.ctx.roundRect(popup.x, popup.y, w, h, 12 * s);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;

    const titleSize = 22 * s;
    this.ctx.font = `400 ${titleSize}px 'Cormorant Garamond', serif`;
    const textGrad = this.ctx.createLinearGradient(popup.x, popup.y, popup.x + 100 * s, popup.y);
    textGrad.addColorStop(0, 'rgba(240, 250, 255, 1)');
    textGrad.addColorStop(1, 'rgba(255, 230, 120, 1)');
    this.ctx.fillStyle = textGrad;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`${popup.year} 年 · 文化裂隙`, popup.x + 20 * s, popup.y + 18 * s);

    const subSize = 12 * s;
    this.ctx.font = `300 ${subSize}px 'Cormorant Garamond', serif`;
    this.ctx.fillStyle = 'rgba(200, 220, 230, 0.5)';
    this.ctx.fillText('点击并拖拽碎片至收集区', popup.x + 20 * s, popup.y + 42 * s);

    const startX = popup.x + 20 * s;
    const startY = popup.y + 60 * s;
    const gap = 90 * s;
    const fragW = 64 * s;
    const fragH = 64 * s;
    const iconPixelSize = 2 * s;

    popup.fragments.forEach((frag, i) => {
      const fx = startX + i * gap;
      const fy = startY;
      const isHover = this.hoveredFragment?.id === frag.id;
      const scale = isHover ? 1.05 : 1;

      this.ctx.save();
      this.ctx.translate(fx + fragW / 2, fy + fragH / 2 + 8 * s);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-fragW / 2, -(fragH / 2 + 8 * s));

      this.ctx.fillStyle = frag.color;
      this.ctx.shadowColor = frag.color;
      this.ctx.shadowBlur = isHover ? 15 : 8;
      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, fragW, fragH, 8 * s);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      const iconX = (fragW - 16 * iconPixelSize) / 2;
      const iconY = (fragH - 16 * iconPixelSize) / 2;
      drawPixelIcon(this.ctx, frag.icon, iconX, iconY, iconPixelSize, 'rgba(255,255,255,0.95)');

      const labelSize = 11 * s;
      this.ctx.font = `300 ${labelSize}px 'Cormorant Garamond', serif`;
      this.ctx.fillStyle = 'rgba(240, 250, 255, 0.85)';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(frag.title.split(' ')[1], fragW / 2, fragH + 12 * s);

      this.ctx.restore();
    });

    this.ctx.restore();
  }

  drawCollectedCards(): void {
    const s = this.uiScale;

    for (const card of this.collectedCards) {
      const scale = card.scale;
      if (scale < 0.01) continue;

      const cw = this.cardWidth;
      const ch = this.cardHeight;

      this.ctx.save();
      this.ctx.translate(card.x + cw / 2, card.y + ch / 2);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-cw / 2, -ch / 2);

      const shadowBlur = card.hover ? 20 : 10;
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      this.ctx.shadowBlur = shadowBlur;
      this.ctx.fillStyle = 'rgba(25, 40, 55, 0.95)';
      this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.roundRect(0, 0, cw, ch, 12 * s);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.shadowBlur = 0;

      const imgW = cw - 30 * s;
      const imgH = ch * 0.4;
      this.ctx.fillStyle = card.fragment.color;
      this.ctx.beginPath();
      this.ctx.roundRect(15 * s, 15 * s, imgW, imgH, 8 * s);
      this.ctx.fill();

      const iconPixel = 4 * s;
      const iconX = (cw - 16 * iconPixel) / 2;
      const iconY = 15 * s + (imgH - 16 * iconPixel) / 2;
      drawPixelIcon(this.ctx, card.fragment.icon, iconX, iconY, iconPixel, 'rgba(255,255,255,0.95)');

      const yearSize = 14 * s;
      this.ctx.font = `400 ${yearSize}px 'Cormorant Garamond', serif`;
      this.ctx.fillStyle = 'rgba(255, 240, 200, 1)';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(`${card.fragment.year}`, cw / 2, ch * 0.58);

      const typeSize = 12 * s;
      this.ctx.font = `300 ${typeSize}px 'Cormorant Garamond', serif`;
      this.ctx.fillStyle = 'rgba(200, 220, 230, 0.8)';
      this.ctx.fillText(card.fragment.title.split(' ')[1], cw / 2, ch * 0.68);

      this.ctx.beginPath();
      this.ctx.rect(12 * s, ch * 0.82, cw - 24 * s, 1);
      this.ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
      this.ctx.fill();

      // 滚动文字
      const text = card.fragment.description;
      const scrollText = `${text}  ·  ${text}  ·  `;
      const scrollSpeed = 40;
      const textWidth = scrollText.length * 6 * s;
      const scrollOffset = (performance.now() / 1000 * scrollSpeed) % (textWidth / 2);

      const descSize = 10 * s;
      this.ctx.font = `300 ${descSize}px 'Cormorant Garamond', serif`;
      this.ctx.fillStyle = 'rgba(180, 200, 210, 0.6)';

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(12 * s, ch * 0.85, cw - 24 * s, ch * 0.12);
      this.ctx.clip();

      // 两端渐隐
      const grad = this.ctx.createLinearGradient(12 * s, 0, cw - 12 * s, 0);
      grad.addColorStop(0, 'rgba(180, 200, 210, 0)');
      grad.addColorStop(0.15, 'rgba(180, 200, 210, 0.6)');
      grad.addColorStop(0.85, 'rgba(180, 200, 210, 0.6)');
      grad.addColorStop(1, 'rgba(180, 200, 210, 0)');
      this.ctx.fillStyle = grad;

      this.ctx.fillText(scrollText, cw / 2 - scrollOffset, ch * 0.86);
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
    const now = performance.now();
    for (const p of this.floatingParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.6 + Math.sin(now / 300 + p.angle) * 0.3;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * this.uiScale, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawDraggingFragment(): void {
    if (!this.draggingFragment) return;
    const f = this.draggingFragment;
    const s = this.uiScale;

    this.ctx.save();
    this.ctx.globalAlpha = 0.85;
    this.ctx.translate(this.dragX, this.dragY);

    const fragW = 64 * s;
    const fragH = 64 * s;
    this.ctx.fillStyle = f.color;
    this.ctx.shadowColor = f.color;
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.roundRect(-fragW / 2, -fragH / 2, fragW, fragH, 8 * s);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    const iconPixelSize = 2 * s;
    const iconX = -8 * iconPixelSize;
    const iconY = -8 * iconPixelSize;
    drawPixelIcon(this.ctx, f.icon, iconX, iconY, iconPixelSize, 'rgba(255,255,255,0.95)');

    this.ctx.restore();
  }

  loop(time: number): void {
    this.animationId = requestAnimationFrame(this.loop);

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = time;
    }

    let deltaTime = time - this.lastFrameTime;
    this.lastFrameTime = time;

    if (deltaTime > 100) {
      deltaTime = 100;
    }

    this.accumulator += deltaTime;

    while (this.accumulator >= FRAME_DURATION) {
      this.update(FRAME_DURATION);
      this.accumulator -= FRAME_DURATION;
    }

    this.draw();
  }

  start(): void {
    this.lastFrameTime = 0;
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
