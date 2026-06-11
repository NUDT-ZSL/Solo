export type ThemeType = 'rainbow' | 'warm' | 'cool' | 'mono';

export interface Emoji {
  id: number;
  char: string;
  x: number;
  y: number;
  size: number;
  baseSpeed: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  hue: number;
  trail: { x: number; y: number; rotation: number; alpha: number }[];
  trailLength: number;
  offsetX: number;
  offsetY: number;
  targetOffsetX: number;
  targetOffsetY: number;
  wobbleSpeed: number;
  wobbleAmount: number;
  wobblePhase: number;
}

const EMOJI_LIST = [
  '😀', '😂', '🥰', '😎', '🤩', '😇', '🤗', '😋', '🤔', '😴',
  '🥳', '😈', '👻', '🤖', '👽', '🎃', '💀', '🐱', '🐶', '🐼',
  '🦊', '🐸', '🐙', '🦄', '🌈', '⭐', '💎', '🔥', '💫', '🎵',
  '🎮', '🍕', '🍩', '🍦', '🌸', '🍀', '🌙', '☀️', '⚡', '💧',
  '❤️', '💜', '💙', '💚', '💛', '🧡', '🖤', '🤍', '💯', '🚀'
];

export class EmojiManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private emojis: Emoji[] = [];
  private emojiCount: number = 50;
  private theme: ThemeType = 'rainbow';
  private trailEnabled: boolean = true;
  private nextId: number = 0;
  private maxTrailLength: number = 8;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
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
    this.emojis.forEach(emoji => {
      if (emoji.x > this.canvas.width) {
        emoji.x = Math.random() * this.canvas.width;
      }
      if (emoji.y > this.canvas.height) {
        emoji.y = Math.random() * this.canvas.height;
      }
    });
  }

  private createEmoji(startY?: number): Emoji {
    const size = 24 + Math.random() * 24;
    const fallDuration = 0.5 + Math.random() * 1.5;
    const baseSpeed = this.canvas.height / (fallDuration * 60);
    
    const emoji: Emoji = {
      id: this.nextId++,
      char: EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)],
      x: Math.random() * this.canvas.width,
      y: startY !== undefined ? startY : -size - Math.random() * 100,
      size,
      baseSpeed,
      speed: baseSpeed,
      rotation: (Math.random() - 0.5) * 0.5,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      opacity: 0.7 + Math.random() * 0.3,
      hue: 0,
      trail: [],
      trailLength: this.maxTrailLength,
      offsetX: 0,
      offsetY: 0,
      targetOffsetX: 0,
      targetOffsetY: 0,
      wobbleSpeed: 0.5 + Math.random() * 1.5,
      wobbleAmount: 10 + Math.random() * 20,
      wobblePhase: Math.random() * Math.PI * 2
    };
    
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
      const emoji = this.createEmoji(Math.random() * this.canvas.height);
      this.emojis.push(emoji);
    }
    while (this.emojis.length > this.emojiCount) {
      this.emojis.pop();
    }
  }

  init(): void {
    this.emojis = [];
    this.nextId = 0;
    for (let i = 0; i < this.emojiCount; i++) {
      const emoji = this.createEmoji(Math.random() * this.canvas.height);
      this.emojis.push(emoji);
    }
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    
    for (let i = this.emojis.length - 1; i >= 0; i--) {
      const emoji = this.emojis[i];
      
      emoji.offsetX += (emoji.targetOffsetX - emoji.offsetX) * 0.12;
      emoji.offsetY += (emoji.targetOffsetY - emoji.offsetY) * 0.12;
      
      const wobble = Math.sin(this.time * emoji.wobbleSpeed + emoji.wobblePhase) * emoji.wobbleAmount * 0.1;
      
      if (this.trailEnabled) {
        emoji.trail.unshift({
          x: emoji.x,
          y: emoji.y,
          rotation: emoji.rotation,
          alpha: 1
        });
        
        if (emoji.trail.length > emoji.trailLength) {
          emoji.trail.pop();
        }
        
        emoji.trail.forEach((point, index) => {
          point.alpha = 1 - (index / emoji.trailLength);
        });
      }
      
      emoji.y += emoji.speed + emoji.offsetY;
      emoji.x += wobble + emoji.offsetX;
      emoji.rotation += emoji.rotationSpeed;
      
      if (this.theme === 'rainbow') {
        emoji.hue = (emoji.hue + 0.5) % 360;
      }
      
      if (emoji.y > this.canvas.height + emoji.size) {
        this.emojis.splice(i, 1);
        const newEmoji = this.createEmoji(-emoji.size - Math.random() * 50);
        this.emojis.push(newEmoji);
      }
      
      if (emoji.x < -emoji.size) {
        emoji.x = this.canvas.width + emoji.size;
      } else if (emoji.x > this.canvas.width + emoji.size) {
        emoji.x = -emoji.size;
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    
    for (const emoji of this.emojis) {
      const drawX = emoji.x;
      const drawY = emoji.y;
      
      if (this.trailEnabled && emoji.trail.length > 1) {
        for (let i = emoji.trail.length - 1; i >= 0; i--) {
          const point = emoji.trail[i];
          const alpha = point.alpha * 0.3 * emoji.opacity;
          const scale = 1 - (i / emoji.trailLength) * 0.3;
          
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(point.x, point.y);
          ctx.rotate(point.rotation);
          ctx.scale(scale, scale);
          ctx.font = `${emoji.size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.shadowColor = `hsla(${emoji.hue}, 100%, 60%, ${alpha})`;
          ctx.shadowBlur = 8;
          
          ctx.fillText(emoji.char, 0, 0);
          ctx.restore();
        }
      }
      
      ctx.save();
      ctx.globalAlpha = emoji.opacity;
      ctx.translate(drawX, drawY);
      ctx.rotate(emoji.rotation);
      
      ctx.font = `${emoji.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.shadowColor = `hsl(${emoji.hue}, 100%, 60%)`;
      ctx.shadowBlur = 15;
      
      ctx.fillText(emoji.char, 0, 0);
      ctx.restore();
    }
  }
}
