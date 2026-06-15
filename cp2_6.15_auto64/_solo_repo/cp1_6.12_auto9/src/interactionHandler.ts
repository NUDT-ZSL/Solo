import { EmojiManager, Emoji } from './emojiManager';

const REFERENCE_HOVER_RADIUS = 80;
const REFERENCE_SECONDARY_RADIUS = 60;
const REFERENCE_REPEL_FORCE = 25;
const TRANSITION_DURATION = 300;

export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private emojiManager: EmojiManager;
  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private isMouseOnCanvas: boolean = false;
  private hoverRadius: number = REFERENCE_HOVER_RADIUS;
  private secondaryRadius: number = REFERENCE_SECONDARY_RADIUS;
  private repelForce: number = REFERENCE_REPEL_FORCE;
  private transitionDuration: number = TRANSITION_DURATION;
  private scaleFactor: number = 1;

  constructor(canvas: HTMLCanvasElement, emojiManager: EmojiManager) {
    this.canvas = canvas;
    this.emojiManager = emojiManager;
    this.scaleFactor = emojiManager.getScaleFactor();
    this.updateScaledValues();
    this.bindEvents();
  }

  updateScaleFactor(scaleFactor: number): void {
    this.scaleFactor = scaleFactor;
    this.updateScaledValues();
  }

  private updateScaledValues(): void {
    this.hoverRadius = REFERENCE_HOVER_RADIUS * this.scaleFactor;
    this.secondaryRadius = REFERENCE_SECONDARY_RADIUS * this.scaleFactor;
    this.repelForce = REFERENCE_REPEL_FORCE * this.scaleFactor;
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

  private setTargetOffset(emoji: Emoji, targetX: number, targetY: number): void {
    if (emoji.targetOffsetX === targetX && emoji.targetOffsetY === targetY) {
      return;
    }
    
    emoji.startOffsetX = emoji.offsetX;
    emoji.startOffsetY = emoji.offsetY;
    emoji.targetOffsetX = targetX;
    emoji.targetOffsetY = targetY;
    emoji.offsetTransitionDuration = this.transitionDuration;
    emoji.offsetTransitionStart = performance.now();
  }

  private resetAllOffsets(): void {
    const emojis = this.emojiManager.getEmojis();
    const currentTime = performance.now();
    
    for (const emoji of emojis) {
      if (emoji.targetOffsetX !== 0 || emoji.targetOffsetY !== 0) {
        emoji.startOffsetX = emoji.offsetX;
        emoji.startOffsetY = emoji.offsetY;
        emoji.targetOffsetX = 0;
        emoji.targetOffsetY = 0;
        emoji.offsetTransitionDuration = this.transitionDuration;
        emoji.offsetTransitionStart = currentTime;
      }
    }
  }

  update(): void {
    const emojis = this.emojiManager.getEmojis();
    const totalRadius = this.hoverRadius + this.secondaryRadius;
    
    if (!this.isMouseOnCanvas) {
      return;
    }
    
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
        
        const targetX = Math.cos(angle) * force;
        const targetY = Math.sin(angle) * force;
        
        this.setTargetOffset(emoji, targetX, targetY);
      } else {
        if (emoji.targetOffsetX !== 0 || emoji.targetOffsetY !== 0) {
          this.setTargetOffset(emoji, 0, 0);
        }
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
