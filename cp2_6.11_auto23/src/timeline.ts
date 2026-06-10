import { PixelData, generateFragmentsForYear, Particle } from './fragment';

export interface YearNode {
  year: number;
  x: number;
  y: number;
  collected: PixelData[];
  glowIntensity: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FragmentPopup {
  year: number;
  x: number;
  y: number;
  fragments: PixelData[];
  visible: boolean;
}

export class Timeline {
  nodes: YearNode[] = [];
  ripples: Ripple[] = [];
  popup: FragmentPopup | null = null;
  isVertical = false;
  scrollOffset = 0;
  currentYear: number;
  timelineY = 0;
  timelineH = 0;
  timelineX = 0;
  timelineW = 0;
  NODE_SIZE = 40;
  NODE_SPACING = 80;

  constructor() {
    this.currentYear = new Date().getFullYear();
    this.initNodes();
  }

  initNodes(): void {
    this.nodes = [];
    for (let year = this.currentYear - 10; year <= this.currentYear + 10; year++) {
      this.nodes.push({
        year,
        x: 0,
        y: 0,
        collected: [],
        glowIntensity: 0
      });
    }
  }

  updateLayout(viewportW: number, viewportH: number, isVertical: boolean): void {
    this.isVertical = isVertical;
    if (isVertical) {
      this.timelineX = viewportW * 0.5 - 30;
      this.timelineY = 0;
      this.timelineW = 60;
      this.timelineH = viewportH * 0.7;
      this.NODE_SPACING = (viewportH * 0.7) / 22;
    } else {
      this.timelineX = 0;
      this.timelineY = viewportH * 0.5 - viewportH * 0.06;
      this.timelineW = viewportW;
      this.timelineH = viewportH * 0.12;
      this.NODE_SPACING = viewportW / 22;
    }
    this.updateNodePositions(viewportW, viewportH);
  }

  updateNodePositions(viewportW: number, viewportH: number): void {
    const centerIdx = 10;
    for (let i = 0; i < this.nodes.length; i++) {
      const offset = i - centerIdx;
      if (this.isVertical) {
        this.nodes[i].x = this.timelineX + this.timelineW / 2;
        this.nodes[i].y = this.timelineH * 0.5 + offset * this.NODE_SPACING + this.scrollOffset;
      } else {
        this.nodes[i].x = viewportW * 0.5 + offset * this.NODE_SPACING + this.scrollOffset;
        this.nodes[i].y = this.timelineY + this.timelineH / 2;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number): void {
    this.drawTimelineBar(ctx, viewportW, viewportH);
    this.drawYearNodes(ctx);
    this.drawRipples(ctx);
    this.drawCollectedOnTimeline(ctx);
  }

  drawTimelineBar(ctx: CanvasRenderingContext2D, viewportW: number, viewportH: number): void {
    ctx.save();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    
    if (this.isVertical) {
      const x = this.timelineX;
      const y = this.timelineY;
      const h = this.timelineH;
      ctx.beginPath();
      ctx.roundRect(x, y, 60, h, 16);
      ctx.fill();
      ctx.stroke();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 30, y + 20);
      ctx.lineTo(x + 30, y + h - 20);
      ctx.stroke();
    } else {
      const y = this.timelineY;
      const h = this.timelineH;
      ctx.beginPath();
      ctx.roundRect(0, y, viewportW, h, 16);
      ctx.fill();
      ctx.stroke();
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, y + h / 2);
      ctx.lineTo(viewportW - 20, y + h / 2);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  drawYearNodes(ctx: CanvasRenderingContext2D): void {
    const now = performance.now() / 1000;
    
    for (const node of this.nodes) {
      const isPast = node.year < this.currentYear;
      const isFuture = node.year > this.currentYear;
      const isCurrent = node.year === this.currentYear;
      
      const pulse = Math.sin(now * 2) * 0.3 + 0.7;
      const baseGlow = isCurrent ? 25 : 15;
      
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, this.NODE_SIZE);
      
      if (isFuture) {
        gradient.addColorStop(0, `rgba(180, 200, 220, ${0.15 * pulse})`);
        gradient.addColorStop(1, 'rgba(180, 200, 220, 0)');
      } else if (isCurrent) {
        gradient.addColorStop(0, `rgba(255, 230, 120, ${0.6 * pulse})`);
        gradient.addColorStop(0.5, `rgba(255, 220, 100, ${0.3 * pulse})`);
        gradient.addColorStop(1, 'rgba(255, 220, 100, 0)');
      } else {
        gradient.addColorStop(0, `rgba(200, 230, 255, ${0.5 * pulse})`);
        gradient.addColorStop(1, 'rgba(200, 230, 255, 0)');
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, this.NODE_SIZE, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, this.NODE_SIZE / 2 - 2, 0, Math.PI * 2);
      
      if (isFuture) {
        ctx.fillStyle = 'rgba(100, 120, 140, 0.3)';
        ctx.strokeStyle = 'rgba(180, 200, 220, 0.3)';
      } else if (isCurrent) {
        ctx.fillStyle = 'rgba(255, 230, 120, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 200, 1)';
      } else {
        ctx.fillStyle = 'rgba(220, 240, 255, 0.8)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      }
      
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      
      ctx.save();
      ctx.font = "300 13px 'Cormorant Garamond', serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textGradient = ctx.createLinearGradient(node.x - 20, node.y, node.x + 20, node.y);
      if (isFuture) {
        textGradient.addColorStop(0, 'rgba(150, 170, 190, 0.6)');
        textGradient.addColorStop(1, 'rgba(180, 200, 220, 0.6)');
      } else if (isCurrent) {
        textGradient.addColorStop(0, 'rgba(255, 255, 240, 1)');
        textGradient.addColorStop(1, 'rgba(255, 230, 120, 1)');
      } else {
        textGradient.addColorStop(0, 'rgba(240, 250, 255, 0.95)');
        textGradient.addColorStop(1, 'rgba(255, 250, 220, 0.95)');
      }
      ctx.fillStyle = textGradient;
      
      if (this.isVertical) {
        ctx.fillText(String(node.year), node.x, node.y + this.NODE_SIZE / 2 + 12);
      } else {
        ctx.fillText(String(node.year), node.x, node.y + this.NODE_SIZE / 2 + 12);
      }
      ctx.restore();
    }
  }

  drawRipples(ctx: CanvasRenderingContext2D): void {
    for (const ripple of this.ripples) {
      const progress = ripple.life / ripple.maxLife;
      const alpha = 1 - progress;
      const radius = ripple.maxRadius * progress;
      
      ctx.save();
      ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * 0.6})`;
      ctx.lineWidth = 3 * (1 - progress);
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCollectedOnTimeline(ctx: CanvasRenderingContext2D): void {
    for (const node of this.nodes) {
      if (node.collected.length === 0) continue;
      
      node.collected.forEach((frag, i) => {
        let cx = node.x;
        let cy = node.y;
        
        if (this.isVertical) {
          const side = i % 2 === 0 ? -1 : 1;
          cx += side * (50 + Math.floor(i / 2) * 30);
          cy += 80 + Math.floor(i / 2) * 60;
        } else {
          const above = i % 2 === 0 ? -1 : 1;
          cy += above * (50 + Math.floor(i / 2) * 30);
          cx += 80 + Math.floor(i / 2) * 60;
        }
        
        ctx.save();
        ctx.fillStyle = frag.color;
        ctx.shadowColor = frag.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(cx - 6, cy - 6, 12, 12);
        ctx.restore();
      });
    }
  }

  addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 120,
      alpha: 1,
      life: 0,
      maxLife: 72
    });
  }

  update(): void {
    this.ripples = this.ripples.filter(r => {
      r.life++;
      return r.life < r.maxLife;
    });
  }

  handleClick(x: number, y: number): YearNode | null {
    for (const node of this.nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.NODE_SIZE / 2 + 5) {
        this.addRipple(node.x, node.y);
        return node;
      }
    }
    return null;
  }

  openPopup(node: YearNode, viewportW: number, viewportH: number): FragmentPopup {
    const fragments = generateFragmentsForYear(node.year, 5);
    let popupX: number, popupY: number;
    
    if (this.isVertical) {
      popupX = node.x + 60;
      popupY = Math.max(80, Math.min(viewportH - 280, node.y - 100));
    } else {
      popupX = Math.max(20, Math.min(viewportW - 540, node.x - 260));
      popupY = node.y + 70;
    }
    
    this.popup = {
      year: node.year,
      x: popupX,
      y: popupY,
      fragments,
      visible: true
    };
    return this.popup;
  }

  closePopup(): void {
    this.popup = null;
  }

  addToTimeline(fragment: PixelData): void {
    const node = this.nodes.find(n => n.year === fragment.year);
    if (node) {
      node.collected.push(fragment);
    }
  }

  scroll(delta: number): void {
    this.scrollOffset += delta;
    const maxOffset = this.NODE_SPACING * 5;
    this.scrollOffset = Math.max(-maxOffset, Math.min(maxOffset, this.scrollOffset));
  }
}
