import { EmojiManager, Emoji } from './emojiManager';

export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private emojiManager: EmojiManager;
  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private isMouseOnCanvas: boolean = false;
  private hoverRadius: number = 80;
  private secondaryRadius: number = 60;
  private repelForce: number = 25;
  private transitionDuration: number = 300;

  constructor(canvas: HTMLCanvasElement, emojiManager: EmojiManager) {
    this.canvas = canvas;
    this.emojiManager = emojiManager;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    this.isMouseOnCanvas = true;
  }

  private handleMouseEnter(): void {
    this.isMouseOnCanvas = true;
  }

  private handleMouseLeave(): void {
    this.isMouseOnCanvas = false;
    this.mouseX = -1000;
    this.mouseY = -1000;
    this.resetAllOffsets();
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.touches[0].clientX - rect.left;
      this.mouseY = e.touches[0].clientY - rect.top;
      this.isMouseOnCanvas = true;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.touches[0].clientX - rect.left;
      this.mouseY = e.touches[0].clientY - rect.top;
      this.isMouseOnCanvas = true;
    }
  }

  private handleTouchEnd(): void {
    this.isMouseOnCanvas = false;
    this.mouseX = -1000;
    this.mouseY = -1000;
    this.resetAllOffsets();
  }

  private resetAllOffsets(): void {
    const emojis = this.emojiManager.getEmojis();
    for (const emoji of emojis) {
      emoji.targetOffsetX = 0;
      emoji.targetOffsetY = 0;
    }
  }

  update(): void {
    if (!this.isMouseOnCanvas) {
      return;
    }

    const emojis = this.emojiManager.getEmojis();
    const totalRadius = this.hoverRadius + this.secondaryRadius;
    
    for (const emoji of emojis) {
      const dx = emoji.x - this.mouseX;
      const dy = emoji.y - this.mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < totalRadius) {
        const angle = Math.atan2(dy, dx);
        let force = 0;
        
        if (distance < this.hoverRadius) {
          const t = distance / this.hoverRadius;
          force = this.repelForce * (1 - t * 0.5);
        } else {
          const t = (distance - this.hoverRadius) / this.secondaryRadius;
          force = this.repelForce * 0.5 * (1 - t);
        }
        
        emoji.targetOffsetX = Math.cos(angle) * force;
        emoji.targetOffsetY = Math.sin(angle) * force;
      } else {
        emoji.targetOffsetX = 0;
        emoji.targetOffsetY = 0;
      }
    }
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  setHoverRadius(radius: number): void {
    this.hoverRadius = Math.max(20, Math.min(200, radius));
  }

  getHoverRadius(): number {
    return this.hoverRadius;
  }

  setRepelForce(force: number): void {
    this.repelForce = Math.max(5, Math.min(80, force));
  }

  getRepelForce(): number {
    return this.repelForce;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
  }
}
