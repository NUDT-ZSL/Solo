import type { Move } from './GameEngine';

interface RippleEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color: 'black' | 'white';
}

interface PlacedStone {
  x: number;
  y: number;
  color: 'black' | 'white';
  moveNumber: number;
  isKeyMoment: boolean;
  placeTime: number;
}

export interface BoardRendererOptions {
  canvas: HTMLCanvasElement;
  boardSize: number;
  onStoneClick?: (x: number, y: number) => void;
  onStoneHover?: (x: number, y: number) => void;
  onBoardClick?: (x: number, y: number) => void;
}

const INK_BG = '#F5E6C8';
const INK_GRID = 'rgba(60, 50, 40, 0.35)';
const INK_GRID_DOT = 'rgba(60, 50, 40, 0.5)';
const KEY_MOMENT_COLOR = '#C84032';
const HOVER_SCALE = 1.08;
const STONE_PLACE_DURATION = 300;
const RIPPLE_DURATION = 600;

export class BoardRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private boardSize: number;
  private cellSize: number = 0;
  private padding: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private stones: PlacedStone[] = [];
  private rippleEffects: RippleEffect[] = [];
  private hoverPos: { x: number; y: number } | null = null;
  private animationFrameId: number = 0;
  private lastTime: number = 0;

  private bgCache: HTMLCanvasElement | null = null;

  private onStoneClick?: (x: number, y: number) => void;
  private onStoneHover?: (x: number, y: number) => void;
  private onBoardClick?: (x: number, y: number) => void;

  constructor(options: BoardRendererOptions) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.boardSize = options.boardSize;
    this.onStoneClick = options.onStoneClick;
    this.onStoneHover = options.onStoneHover;
    this.onBoardClick = options.onBoardClick;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('touchstart', this.handleTouch, { passive: false });
  }

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const pos = this.pixelToBoard(mx, my);
    if (pos) {
      if (!this.hoverPos || this.hoverPos.x !== pos.x || this.hoverPos.y !== pos.y) {
        this.hoverPos = pos;
        this.onStoneHover?.(pos.x, pos.y);
      }
    } else {
      this.hoverPos = null;
    }
  };

  private handleClick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const pos = this.pixelToBoard(mx, my);
    if (pos) {
      const stone = this.stones.find(s => s.x === pos.x && s.y === pos.y);
      if (stone) {
        this.onStoneClick?.(pos.x, pos.y);
      } else {
        this.onBoardClick?.(pos.x, pos.y);
      }
    }
  };

  private handleMouseLeave = () => {
    this.hoverPos = null;
  };

  private handleTouch = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (touch.clientX - rect.left) * scaleX;
    const my = (touch.clientY - rect.top) * scaleY;

    const pos = this.pixelToBoard(mx, my);
    if (pos) {
      const stone = this.stones.find(s => s.x === pos.x && s.y === pos.y);
      if (stone) {
        this.onStoneClick?.(pos.x, pos.y);
      } else {
        this.onBoardClick?.(pos.x, pos.y);
      }
    }
  };

  private pixelToBoard(px: number, py: number): { x: number; y: number } | null {
    const bx = Math.round((px - this.offsetX) / this.cellSize);
    const by = Math.round((py - this.offsetY) / this.cellSize);

    if (bx < 0 || bx >= this.boardSize || by < 0 || by >= this.boardSize) return null;

    const cx = this.offsetX + bx * this.cellSize;
    const cy = this.offsetY + by * this.cellSize;
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);

    if (dist > this.cellSize * 0.5) return null;

    return { x: bx, y: by };
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const size = Math.min(width, height);
    this.padding = size * 0.04;
    this.cellSize = (size - this.padding * 2) / (this.boardSize - 1);
    this.offsetX = (width - (this.boardSize - 1) * this.cellSize) / 2;
    this.offsetY = (height - (this.boardSize - 1) * this.cellSize) / 2;

    this.bgCache = null;
  }

  private renderBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.fillStyle = INK_BG;
    ctx.fillRect(0, 0, w, h);

    this.renderPaperTexture(ctx, w, h);
  }

  private renderPaperTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private cacheBackground() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    const offscreen = document.createElement('canvas');
    offscreen.width = this.canvas.width;
    offscreen.height = this.canvas.height;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    offCtx.fillStyle = INK_BG;
    offCtx.fillRect(0, 0, w, h);

    const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 10;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    offCtx.putImageData(imageData, 0, 0);

    this.bgCache = offscreen;
  }

  private renderGrid() {
    const ctx = this.ctx;

    ctx.strokeStyle = INK_GRID;
    ctx.lineWidth = 1;

    for (let i = 0; i < this.boardSize; i++) {
      const x = this.offsetX + i * this.cellSize;
      const y = this.offsetY + i * this.cellSize;

      ctx.beginPath();
      ctx.moveTo(x, this.offsetY);
      ctx.lineTo(x, this.offsetY + (this.boardSize - 1) * this.cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.offsetX, y);
      ctx.lineTo(this.offsetX + (this.boardSize - 1) * this.cellSize, y);
      ctx.stroke();
    }

    const starPoints = [3, 9, 15];
    ctx.fillStyle = INK_GRID_DOT;
    for (const sy of starPoints) {
      for (const sx of starPoints) {
        const cx = this.offsetX + sx * this.cellSize;
        const cy = this.offsetY + sy * this.cellSize;
        ctx.beginPath();
        ctx.arc(cx, cy, this.cellSize * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderStone(
    x: number,
    y: number,
    color: 'black' | 'white',
    scale: number = 1,
    alpha: number = 1
  ) {
    const ctx = this.ctx;
    const cx = this.offsetX + x * this.cellSize;
    const cy = this.offsetY + y * this.cellSize;
    const radius = (this.cellSize * 0.45) * scale;

    ctx.save();
    ctx.globalAlpha = alpha;

    const shadowOffset = this.cellSize * 0.03;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = this.cellSize * 0.08;
    ctx.shadowOffsetX = shadowOffset;
    ctx.shadowOffsetY = shadowOffset;

    if (color === 'black') {
      const gradient = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.3, radius * 0.1,
        cx, cy, radius
      );
      gradient.addColorStop(0, 'rgba(80, 80, 80, 0.95)');
      gradient.addColorStop(0.5, 'rgba(30, 30, 30, 0.92)');
      gradient.addColorStop(1, 'rgba(10, 10, 10, 0.88)');
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.3, radius * 0.1,
        cx, cy, radius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      gradient.addColorStop(0.5, 'rgba(245, 242, 235, 0.95)');
      gradient.addColorStop(1, 'rgba(220, 215, 205, 0.90)');
      ctx.fillStyle = gradient;
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    if (color === 'black') {
      const sheen = ctx.createRadialGradient(
        cx - radius * 0.25, cy - radius * 0.25, 0,
        cx - radius * 0.25, cy - radius * 0.25, radius * 0.6
      );
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
      sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const sheen = ctx.createRadialGradient(
        cx - radius * 0.2, cy - radius * 0.2, 0,
        cx - radius * 0.2, cy - radius * 0.2, radius * 0.5
      );
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderKeyMomentMarker(x: number, y: number, color: 'black' | 'white') {
    const ctx = this.ctx;
    const cx = this.offsetX + x * this.cellSize;
    const cy = this.offsetY + y * this.cellSize;
    const radius = this.cellSize * 0.45;

    ctx.save();
    ctx.strokeStyle = KEY_MOMENT_COLOR;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderMoveNumber(x: number, y: number, moveNumber: number, color: 'black' | 'white') {
    const ctx = this.ctx;
    const cx = this.offsetX + x * this.cellSize;
    const cy = this.offsetY + y * this.cellSize;
    const fontSize = Math.max(10, this.cellSize * 0.35);

    ctx.save();
    ctx.font = `bold ${fontSize}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color === 'black' ? '#fff' : '#333';
    ctx.fillText(String(moveNumber), cx, cy + 1);
    ctx.restore();
  }

  private renderRipples(now: number) {
    const ctx = this.ctx;
    this.rippleEffects = this.rippleEffects.filter(r => {
      const elapsed = now - r.startTime;
      if (elapsed > r.duration) return false;

      const progress = elapsed / r.duration;
      const cx = this.offsetX + r.x * this.cellSize;
      const cy = this.offsetY + r.y * this.cellSize;
      const maxRadius = this.cellSize * 1.5;
      const currentRadius = maxRadius * progress;
      const alpha = (1 - progress) * 0.4;

      ctx.save();
      ctx.strokeStyle = r.color === 'black'
        ? `rgba(30, 30, 30, ${alpha})`
        : `rgba(200, 195, 185, ${alpha})`;
      ctx.lineWidth = 2 * (1 - progress);
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      return true;
    });
  }

  private renderHoverEffect() {
    if (!this.hoverPos) return;
    const { x, y } = this.hoverPos;
    const stone = this.stones.find(s => s.x === x && s.y === y);
    if (!stone) return;

    this.renderStone(x, y, stone.color, HOVER_SCALE, 1);
  }

  private renderLastMoveMarker(currentMoveIndex: number) {
    if (currentMoveIndex < 0 || currentMoveIndex >= this.stones.length) return;
    const stone = this.stones[currentMoveIndex];
    if (!stone) return;

    const ctx = this.ctx;
    const cx = this.offsetX + stone.x * this.cellSize;
    const cy = this.offsetY + stone.y * this.cellSize;
    const radius = this.cellSize * 0.12;

    ctx.save();
    ctx.fillStyle = stone.color === 'black' ? '#fff' : '#333';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  updateBoard(
    board: (null | 'black' | 'white')[][],
    moves: Move[],
    currentMoveIndex: number
  ) {
    const newStones: PlacedStone[] = [];
    const boardMap = new Map<string, number>();

    for (let i = 0; i <= currentMoveIndex && i < moves.length; i++) {
      const move = moves[i];
      const key = `${move.x},${move.y}`;
      boardMap.set(key, i);

      const existingStone = this.stones.find(s => s.x === move.x && s.y === move.y);
      newStones.push({
        x: move.x,
        y: move.y,
        color: move.color,
        moveNumber: move.moveNumber,
        isKeyMoment: move.isKeyMoment,
        placeTime: existingStone ? existingStone.placeTime : performance.now(),
      });
    }

    if (currentMoveIndex >= 0 && currentMoveIndex < moves.length) {
      const move = moves[currentMoveIndex];
      const key = `${move.x},${move.y}`;
      const isNew = !this.stones.some(s => s.x === move.x && s.y === move.y);
      if (isNew) {
        this.rippleEffects.push({
          x: move.x,
          y: move.y,
          startTime: performance.now(),
          duration: RIPPLE_DURATION,
          color: move.color,
        });
      }
    }

    this.stones = newStones;
    this.render(currentMoveIndex);
  }

  private render(currentMoveIndex: number) {
    const now = performance.now();
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    if (!this.bgCache) {
      this.cacheBackground();
    }

    this.ctx.clearRect(0, 0, w, h);

    if (this.bgCache) {
      this.ctx.drawImage(this.bgCache, 0, 0, w, h);
    }

    this.renderGrid();

    for (const stone of this.stones) {
      const elapsed = now - stone.placeTime;
      let scale = 1;
      if (elapsed < STONE_PLACE_DURATION) {
        const progress = elapsed / STONE_PLACE_DURATION;
        const eased = 1 - Math.pow(1 - progress, 3);
        scale = eased;
      }
      this.renderStone(stone.x, stone.y, stone.color, scale);
    }

    for (const stone of this.stones) {
      if (stone.isKeyMoment) {
        this.renderKeyMomentMarker(stone.x, stone.y, stone.color);
      }
    }

    this.renderLastMoveMarker(currentMoveIndex);

    this.renderRipples(now);

    this.renderHoverEffect();

    const hasActiveAnimation = this.rippleEffects.length > 0 ||
      this.stones.some(s => (now - s.placeTime) < STONE_PLACE_DURATION);

    if (hasActiveAnimation) {
      this.animationFrameId = requestAnimationFrame(() => this.render(currentMoveIndex));
    }
  }

  getHoverPos(): { x: number; y: number } | null {
    return this.hoverPos;
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('touchstart', this.handleTouch);
  }
}
