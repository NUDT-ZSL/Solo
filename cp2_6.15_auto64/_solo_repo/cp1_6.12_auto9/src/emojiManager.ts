export type ThemeType = 'rainbow' | 'warm' | 'cool' | 'mono';

export interface Emoji {
  id: number;
  char: string;
  x: number;
  y: number;
  baseSize: number;
  size: number;
  baseSpeed: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  hue: number;
  offsetX: number;
  offsetY: number;
  targetOffsetX: number;
  targetOffsetY: number;
  offsetTransitionStart: number;
  offsetTransitionDuration: number;
  startOffsetX: number;
  startOffsetY: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobblePhase: number;
  velocityX: number;
  velocityY: number;
  prevX: number;
  prevY: number;
  cacheCanvas: HTMLCanvasElement | null;
  cacheCtx: CanvasRenderingContext2D | null;
  cacheHue: number;
}

const EMOJI_LIST = [
  '😀', '😂', '🥰', '😎', '🤩', '😇', '🤗', '😋', '🤔', '😴',
  '🥳', '😈', '👻', '🤖', '👽', '🎃', '💀', '🐱', '🐶', '🐼',
  '🦊', '🐸', '🐙', '🦄', '🌈', '⭐', '💎', '🔥', '💫', '🎵',
  '🎮', '🍕', '🍩', '🍦', '🌸', '🍀', '🌙', '☀️', '⚡', '💧',
  '❤️', '💜', '💙', '💚', '💛', '🧡', '🖤', '🤍', '💯', '🚀'
];

const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;
const TRAIL_LENGTH = 30;
const TRAIL_SEGMENTS = 6;

export class EmojiManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private emojis: Emoji[] = [];
  private emojiCount: number = 50;
  private theme: ThemeType = 'rainbow';
  private trailEnabled: boolean = true;
  private nextId: number = 0;
  private time: number = 0;
  private scaleFactor: number = 1;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.updateScaleFactor();
  }

  updateScaleFactor(): void {
    const cssHeight = this.canvas.clientHeight || window.innerHeight;
    this.scaleFactor = Math.max(0.6, cssHeight / REFERENCE_HEIGHT);
    this.dpr = window.devicePixelRatio || 1;
  }

  getScaleFactor(): number {
    return this.scaleFactor;
  }

  setCount(count: number): void {
    this.emojiCount = Math.max(10, Math.min(120, count));
    this.adjustEmojiCount();
  }

  getCount(): number {
    return this.emojiCount;
  }

  setTheme(theme: ThemeType): void {
    this.theme = theme;
    this.emojis.forEach(emoji => {
      emoji.hue = this.getHueForTheme(emoji);
      emoji.cacheHue = -1;
    });
  }

  getTheme(): ThemeType {
    return this.theme;
  }

  setTrailEnabled(enabled: boolean): void {
    this.trailEnabled = enabled;
  }

  isTrailEnabled(): boolean {
    return this.trailEnabled;
  }

  getEmojis(): Emoji[] {
    return this.emojis;
  }

  resize(): void {
    const oldScale = this.scaleFactor;
    this.updateScaleFactor();
    const scaleRatio = this.scaleFactor / oldScale;
    
    this.emojis.forEach(emoji => {
      emoji.size = emoji.baseSize * this.scaleFactor;
      emoji.speed = emoji.baseSpeed * this.scaleFactor;
      emoji.wobbleAmount = 10 * this.scaleFactor + Math.random() * 20 * this.scaleFactor;
      
      if (emoji.x > this.canvas.clientWidth) {
        emoji.x = Math.random() * this.canvas.clientWidth;
      }
      if (emoji.y > this.canvas.clientHeight) {
        emoji.y = Math.random() * this.canvas.clientHeight;
      }
    });
  }

  private createEmojiCache(emoji: Emoji): void {
    if (!emoji.cacheCanvas) {
      emoji.cacheCanvas = document.createElement('canvas');
      emoji.cacheCtx = emoji.cacheCanvas.getContext('2d')!;
    }
    
    const cacheSize = emoji.size * 3 * this.dpr;
    emoji.cacheCanvas.width = cacheSize;
    emoji.cacheCanvas.height = cacheSize;
    
    const ctx = emoji.cacheCtx!;
    ctx.clearRect(0, 0, cacheSize, cacheSize);
    
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(emoji.size * 1.5, emoji.size * 1.5);
    
    ctx.font = `${emoji.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = `hsl(${emoji.hue}, 100%, 60%)`;
    ctx.shadowBlur = 20 * this.scaleFactor;
    
    ctx.fillText(emoji.char, 0, 0);
    ctx.restore();
    
    emoji.cacheHue = Math.floor(emoji.hue);
  }

  private createEmoji(startY?: number): Emoji {
    const baseSize = 24 + Math.random() * 24;
    const size = baseSize * this.scaleFactor;
    const fallDuration = 0.5 + Math.random() * 1.5;
    const baseSpeed = REFERENCE_HEIGHT / (fallDuration * 60);
    const speed = baseSpeed * this.scaleFactor;
    
    const emoji: Emoji = {
      id: this.nextId++,
      char: EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)],
      x: Math.random() * (this.canvas.clientWidth || window.innerWidth),
      y: startY !== undefined ? startY : -size - Math.random() * 100,
      baseSize,
      size,
      baseSpeed,
      speed,
      rotation: (Math.random() - 0.5) * 0.5,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.7 + Math.random() * 0.3,
      hue: 0,
      offsetX: 0,
      offsetY: 0,
      targetOffsetX: 0,
      targetOffsetY: 0,
      offsetTransitionStart: 0,
      offsetTransitionDuration: 300,
      startOffsetX: 0,
      startOffsetY: 0,
      wobbleSpeed: 0.5 + Math.random() * 1.5,
      wobbleAmount: 10 * this.scaleFactor + Math.random() * 20 * this.scaleFactor,
      wobblePhase: Math.random() * Math.PI * 2,
      velocityX: 0,
      velocityY: 0,
      prevX: 0,
      prevY: 0,
      cacheCanvas: null,
      cacheCtx: null,
      cacheHue: -1
    };
    
    emoji.prevX = emoji.x;
    emoji.prevY = emoji.y;
    emoji.hue = this.getHueForTheme(emoji);
    return emoji;
  }

  private getHueForTheme(emoji: Emoji): number {
    switch (this.theme) {
      case 'rainbow':
        return (emoji.id * 13 + emoji.y * 0.3) % 360;
      case 'warm':
        return 0 + Math.random() * 60;
      case 'cool':
        return 180 + Math.random() * 100;
      case 'mono':
        return 270;
      default:
        return 0;
    }
  }

  private adjustEmojiCount(): void {
    while (this.emojis.length < this.emojiCount) {
      const emoji = this.createEmoji(Math.random() * (this.canvas.clientHeight || window.innerHeight));
      this.emojis.push(emoji);
    }
    while (this.emojis.length > this.emojiCount) {
      const removed = this.emojis.pop();
      if (removed?.cacheCanvas) {
        removed.cacheCanvas.width = 0;
        removed.cacheCanvas.height = 0;
      }
    }
  }

  init(): void {
    this.emojis.forEach(e => {
      if (e.cacheCanvas) {
        e.cacheCanvas.width = 0;
        e.cacheCanvas.height = 0;
      }
    });
    this.emojis = [];
    this.nextId = 0;
    this.updateScaleFactor();
    for (let i = 0; i < this.emojiCount; i++) {
      const emoji = this.createEmoji(Math.random() * (this.canvas.clientHeight || window.innerHeight));
      this.emojis.push(emoji);
    }
  }

  update(deltaTime: number, currentTime: number): void {
    this.time += deltaTime;
    const canvasHeight = this.canvas.clientHeight || window.innerHeight;
    const canvasWidth = this.canvas.clientWidth || window.innerWidth;
    
    for (let i = this.emojis.length - 1; i >= 0; i--) {
      const emoji = this.emojis[i];
      
      emoji.prevX = emoji.x;
      emoji.prevY = emoji.y;
      
      if (emoji.cacheHue !== Math.floor(emoji.hue)) {
        this.createEmojiCache(emoji);
      }
      
      if (emoji.offsetTransitionStart > 0) {
        const elapsed = currentTime - emoji.offsetTransitionStart;
        if (elapsed < emoji.offsetTransitionDuration) {
          const t = elapsed / emoji.offsetTransitionDuration;
          const easeOut = 1 - Math.pow(1 - t, 3);
          emoji.offsetX = emoji.startOffsetX + (emoji.targetOffsetX - emoji.startOffsetX) * easeOut;
          emoji.offsetY = emoji.startOffsetY + (emoji.targetOffsetY - emoji.startOffsetY) * easeOut;
        } else {
          emoji.offsetX = emoji.targetOffsetX;
          emoji.offsetY = emoji.targetOffsetY;
          emoji.offsetTransitionStart = 0;
        }
      }
      
      const wobble = Math.sin(this.time * emoji.wobbleSpeed + emoji.wobblePhase) * emoji.wobbleAmount * 0.1;
      
      const moveX = wobble + emoji.offsetX;
      const moveY = emoji.speed + emoji.offsetY;
      
      emoji.velocityX = moveX;
      emoji.velocityY = moveY;
      
      emoji.y += moveY;
      emoji.x += moveX;
      emoji.rotation += emoji.rotationSpeed;
      
      if (this.theme === 'rainbow') {
        emoji.hue = (emoji.hue + 0.5) % 360;
      }
      
      if (emoji.y > canvasHeight + emoji.size) {
        if (emoji.cacheCanvas) {
          emoji.cacheCanvas.width = 0;
          emoji.cacheCanvas.height = 0;
        }
        this.emojis.splice(i, 1);
        const newEmoji = this.createEmoji(-emoji.size - Math.random() * 50);
        this.emojis.push(newEmoji);
      }
      
      if (emoji.x < -emoji.size) {
        emoji.x = canvasWidth + emoji.size;
        emoji.prevX = emoji.x;
      } else if (emoji.x > canvasWidth + emoji.size) {
        emoji.x = -emoji.size;
        emoji.prevX = emoji.x;
      }
    }
  }

  private renderTrail(ctx: CanvasRenderingContext2D, emoji: Emoji): void {
    if (!emoji.cacheCanvas) return;
    
    const scaledTrailLength = TRAIL_LENGTH * this.scaleFactor;
    const angle = Math.atan2(emoji.velocityY, emoji.velocityX);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    for (let i = TRAIL_SEGMENTS; i >= 1; i--) {
      const t = i / (TRAIL_SEGMENTS + 1);
      const distance = t * scaledTrailLength;
      const alpha = (1 - t) * 0.45 * emoji.opacity;
      const scale = 1 - t * 0.4;
      
      const trailX = emoji.x - cos * distance;
      const trailY = emoji.y - sin * distance;
      
      const drawSize = emoji.size * scale * 3;
      const offset = drawSize / 2;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(trailX, trailY);
      ctx.rotate(emoji.rotation);
      ctx.drawImage(
        emoji.cacheCanvas,
        -offset,
        -offset,
        drawSize,
        drawSize
      );
      ctx.restore();
    }
  }

  render(): void {
    const ctx = this.ctx;
    
    for (const emoji of this.emojis) {
      if (!emoji.cacheCanvas || emoji.cacheHue !== Math.floor(emoji.hue)) {
        this.createEmojiCache(emoji);
      }
      
      if (this.trailEnabled) {
        this.renderTrail(ctx, emoji);
      }
      
      const drawSize = emoji.size * 3;
      const offset = drawSize / 2;
      
      ctx.save();
      ctx.globalAlpha = emoji.opacity;
      ctx.translate(emoji.x, emoji.y);
      ctx.rotate(emoji.rotation);
      ctx.drawImage(
        emoji.cacheCanvas!,
        -offset,
        -offset,
        drawSize,
        drawSize
      );
      ctx.restore();
    }
  }
}
