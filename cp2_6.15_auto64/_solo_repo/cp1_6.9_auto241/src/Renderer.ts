import { Card } from './Card';
import { Link } from './Link';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  period: number;
}

export interface RendererState {
  cards: Map<string, Card>;
  links: Map<string, Link>;
  tempLink: {
    fromCardId: string;
    toX: number;
    toY: number;
  } | null;
  contextMenu: {
    x: number;
    y: number;
    cardId: string;
    hovered: boolean;
  } | null;
  editInput: {
    cardId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private stars: Star[];
  private lastTime: number;
  private animationId: number;
  public state: RendererState;
  private viewportWidth: number;
  private viewportHeight: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.stars = [];
    this.lastTime = performance.now();
    this.animationId = 0;
    this.viewportWidth = 0;
    this.viewportHeight = 0;
    this.state = {
      cards: new Map(),
      links: new Map(),
      tempLink: null,
      contextMenu: null,
      editInput: null
    };
    this.initStars();
    this.resize();
  }

  public setState(state: Partial<RendererState>): void {
    Object.assign(this.state, state);
  }

  public get cards(): Map<string, Card> {
    return this.state.cards;
  }

  public get links(): Map<string, Link> {
    return this.state.links;
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.viewportWidth = rect.width;
    this.viewportHeight = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.initStars();
  }

  private initStars(): void {
    this.stars = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.viewportWidth,
        y: Math.random() * this.viewportHeight,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        period: 3 + Math.random() * 3
      });
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    cancelAnimationFrame(this.animationId);
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt, now / 1000);
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, time: number): void {
    for (const star of this.stars) {
      star.phase += dt * (Math.PI * 2 / star.period);
    }

    const cardsArray = Array.from(this.state.cards.values());
    for (const card of cardsArray) {
      card.update(dt, time);
    }

    const linksArray = Array.from(this.state.links.values());
    for (const link of linksArray) {
      const wasMoving = this.state.cards.get(link.fromCardId)?.isDragging ||
                       this.state.cards.get(link.toCardId)?.isDragging;
      if (wasMoving) {
        link.needsRecalc = true;
      }
      link.update(dt, this.state.cards);
    }
  }

  private render(): void {
    this.drawBackground();
    this.drawLinks();
    this.drawTempLink();
    this.drawCards();
    this.drawContextMenu();
  }

  private drawBackground(): void {
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    const cx = w * 0.3;
    const cy = h * 0.2;

    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
    gradient.addColorStop(0, '#1a1a4e');
    gradient.addColorStop(0.4, '#0d0d2b');
    gradient.addColorStop(1, '#05050f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const twinkle = (Math.sin(star.phase) + 1) / 2;
      const alpha = star.baseAlpha * (0.3 + twinkle * 0.7);
      this.ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();

      if (star.size > 2 && twinkle > 0.7) {
        this.ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.3})`;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  private drawLinks(): void {
    for (const link of this.state.links.values()) {
      link.draw(this.ctx, this.state.cards);
    }
  }

  private drawTempLink(): void {
    const temp = this.state.tempLink;
    if (!temp) return;

    const fromCard = this.state.cards.get(temp.fromCardId);
    if (!fromCard) return;

    this.ctx.save();
    this.ctx.globalAlpha = 0.6;
    this.ctx.setLineDash([6, 6]);

    const gradient = this.ctx.createLinearGradient(
      fromCard.centerX, fromCard.centerY,
      temp.toX, temp.toY
    );
    gradient.addColorStop(0, fromCard.color[0] + 'aa');
    gradient.addColorStop(1, '#ffffff55');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    const p0 = { x: fromCard.centerX, y: fromCard.centerY };
    const p3 = { x: temp.toX, y: temp.toY };
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.max(30, dist * 0.3);
    const angle1 = Math.atan2(dy, dx) - Math.PI / 6;
    const angle2 = Math.atan2(dy, dx) + Math.PI - Math.PI / 6;
    const p1 = { x: p0.x + Math.cos(angle1) * offset, y: p0.y + Math.sin(angle1) * offset };
    const p2 = { x: p3.x + Math.cos(angle2) * offset, y: p3.y + Math.sin(angle2) * offset };

    this.ctx.beginPath();
    this.ctx.moveTo(p0.x, p0.y);
    this.ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
    this.ctx.fillStyle = 'rgba(240, 248, 255, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(temp.toX, temp.toY, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawCards(): void {
    const sortedCards = Array.from(this.state.cards.values()).sort((a, b) => {
      if (a.isDragging && !b.isDragging) return 1;
      if (!a.isDragging && b.isDragging) return -1;
      return 0;
    });

    for (const card of sortedCards) {
      card.draw(this.ctx);
    }
  }

  private drawContextMenu(): void {
    const menu = this.state.contextMenu;
    if (!menu) return;

    this.ctx.save();

    const w = 110;
    const h = 36;
    const x = menu.x;
    const y = menu.y;
    const r = 8;

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 16;
    this.ctx.shadowOffsetY = 4;

    this.ctx.fillStyle = menu.hovered
      ? 'rgba(40, 45, 70, 0.95)'
      : 'rgba(25, 30, 50, 0.92)';
    this.beginRoundedRect(x, y, w, h, r);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.beginRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
    this.ctx.stroke();

    this.ctx.fillStyle = 'rgba(255, 230, 230, 0.9)';
    this.ctx.font = `400 13px 'Noto Sans SC', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('删除卡片', x + w / 2, y + h / 2);

    this.ctx.restore();
  }

  private beginRoundedRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  public isPointInContextMenu(px: number, py: number): boolean {
    const menu = this.state.contextMenu;
    if (!menu) return false;
    return px >= menu.x && px <= menu.x + 110 &&
           py >= menu.y && py <= menu.y + 36;
  }
}
