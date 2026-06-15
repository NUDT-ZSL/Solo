import type { DrawOperation, Point } from '../../shared/types.js';
import { v4 as uuidv4 } from 'uuid';

interface CanvasEngineOptions {
  canvas: HTMLCanvasElement;
  onOperation?: (op: DrawOperation) => void;
}

type ToolType = 'pen' | 'eraser' | 'emoji' | 'text';

interface PendingStroke {
  id: string;
  type: 'pen' | 'eraser';
  points: Point[];
  color: string;
  width: number;
  startTime: number;
}

class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private operations: DrawOperation[] = [];
  private onOperation?: (op: DrawOperation) => void;

  private currentTool: ToolType = 'pen';
  private penColor: string = '#ffffff';
  private penWidth: number = 4;
  private currentEmoji: string = '😀';
  private currentFontFamily: string = 'Arial';

  private isDrawing: boolean = false;
  private pendingStroke: PendingStroke | null = null;

  private isReplayMode: boolean = false;
  private replayIndex: number = 0;

  private isClearing: boolean = false;
  private clearProgress: number = 0;
  private clearStartTime: number = 0;
  private clearAnimationId: number | null = null;

  private fadeTailDuration: number = 100;

  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  private emojiAnimations: Map<string, { startTime: number; duration: number; emoji: string; x: number; y: number }> = new Map();

  constructor(options: CanvasEngineOptions) {
    this.canvas = options.canvas;
    this.ctx = this.canvas.getContext('2d')!;
    this.onOperation = options.onOperation;
    this.init();
  }

  private init() {
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    this.startRenderLoop();
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  private getCanvasPoint(e: MouseEvent | Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      timestamp: Date.now(),
    };
  }

  private handleMouseDown(e: MouseEvent) {
    if (this.isReplayMode || this.isClearing) return;

    const point = this.getCanvasPoint(e);

    if (this.currentTool === 'emoji') {
      this.addEmoji(point.x, point.y, this.currentEmoji);
      return;
    }

    if (this.currentTool === 'text') {
      return;
    }

    this.isDrawing = true;
    this.pendingStroke = {
      id: uuidv4(),
      type: this.currentTool as 'pen' | 'eraser',
      points: [point],
      color: this.penColor,
      width: this.penWidth,
      startTime: Date.now(),
    };
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isDrawing || !this.pendingStroke || this.isReplayMode) return;

    const point = this.getCanvasPoint(e);
    this.pendingStroke.points.push(point);
  }

  private handleMouseUp() {
    if (!this.isDrawing || !this.pendingStroke) return;

    this.isDrawing = false;

    if (this.pendingStroke.points.length > 1) {
      const operation: DrawOperation = {
        id: this.pendingStroke.id,
        type: this.pendingStroke.type,
        userId: 'local',
        timestamp: Date.now(),
        points: this.pendingStroke.points,
        color: this.pendingStroke.color,
        width: this.pendingStroke.width,
      };

      this.operations.push(operation);
      this.onOperation?.(operation);
    }

    this.pendingStroke = null;
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  }

  private handleTouchEnd() {
    this.handleMouseUp();
  }

  addEmoji(x: number, y: number, emoji: string) {
    if (this.isReplayMode || this.isClearing) return;

    const animId = uuidv4();
    this.emojiAnimations.set(animId, {
      startTime: Date.now(),
      duration: 500,
      emoji,
      x,
      y,
    });

    const operation: DrawOperation = {
      id: uuidv4(),
      type: 'emoji',
      userId: 'local',
      timestamp: Date.now(),
      emoji,
      x,
      y,
    };

    this.operations.push(operation);
    this.onOperation?.(operation);
  }

  addText(x: number, y: number, text: string, fontFamily?: string) {
    if (this.isReplayMode || this.isClearing) return;

    const operation: DrawOperation = {
      id: uuidv4(),
      type: 'text',
      userId: 'local',
      timestamp: Date.now(),
      text,
      fontFamily: fontFamily || this.currentFontFamily,
      x,
      y,
    };

    this.operations.push(operation);
    this.onOperation?.(operation);
  }

  addOperation(operation: DrawOperation) {
    if (this.isReplayMode) return;
    this.operations.push(operation);
  }

  addOperations(operations: DrawOperation[]) {
    if (this.isReplayMode) return;
    this.operations.push(...operations);
  }

  undo() {
    if (this.isReplayMode || this.operations.length === 0) return;
    this.operations.pop();
  }

  clear() {
    if (this.isReplayMode) return;
    this.startClearAnimation();
  }

  private startClearAnimation() {
    this.isClearing = true;
    this.clearProgress = 0;
    this.clearStartTime = Date.now();
  }

  private updateClearAnimation(time: number) {
    if (!this.isClearing) return;

    const elapsed = time - this.clearStartTime;
    const duration = 800;
    this.clearProgress = Math.min(elapsed / duration, 1);

    if (this.clearProgress >= 1) {
      this.isClearing = false;
      this.operations = [];
      this.clearProgress = 0;
    }
  }

  setTool(tool: ToolType) {
    this.currentTool = tool;
  }

  getTool(): ToolType {
    return this.currentTool;
  }

  setPenColor(color: string) {
    this.penColor = color;
  }

  getPenColor(): string {
    return this.penColor;
  }

  setPenWidth(width: number) {
    this.penWidth = width;
  }

  getPenWidth(): number {
    return this.penWidth;
  }

  setCurrentEmoji(emoji: string) {
    this.currentEmoji = emoji;
  }

  setFontFamily(fontFamily: string) {
    this.currentFontFamily = fontFamily;
  }

  getOperations(): DrawOperation[] {
    return [...this.operations];
  }

  getOperationCount(): number {
    return this.operations.length;
  }

  setReplayMode(enabled: boolean) {
    this.isReplayMode = enabled;
    if (!enabled) {
      this.replayIndex = this.operations.length;
    }
  }

  isInReplayMode(): boolean {
    return this.isReplayMode;
  }

  setReplayIndex(index: number) {
    this.replayIndex = Math.max(0, Math.min(index, this.operations.length));
  }

  getReplayIndex(): number {
    return this.replayIndex;
  }

  private startRenderLoop() {
    const loop = (time: number) => {
      this.lastTime = time;
      this.updateClearAnimation(time);
      this.updateEmojiAnimations(time);
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private updateEmojiAnimations(time: number) {
    for (const [id, anim] of this.emojiAnimations) {
      if (time - anim.startTime > anim.duration) {
        this.emojiAnimations.delete(id);
      }
    }
  }

  private render() {
    const ctx = this.ctx;
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    const opsToRender = this.isReplayMode
      ? this.operations.slice(0, this.replayIndex)
      : this.operations;

    for (const op of opsToRender) {
      this.renderOperation(ctx, op);
    }

    if (this.pendingStroke && this.pendingStroke.points.length > 1) {
      this.renderStrokeWithFade(ctx, this.pendingStroke.points, this.pendingStroke.color, this.pendingStroke.width, this.pendingStroke.type);
    }

    this.renderEmojiAnimations(ctx);

    if (this.isClearing) {
      this.renderClearEffect(ctx, width, height);
    }
  }

  private renderOperation(ctx: CanvasRenderingContext2D, op: DrawOperation) {
    switch (op.type) {
      case 'pen':
      case 'eraser':
        if (op.points && op.points.length > 1) {
          this.renderStroke(ctx, op.points, op.color || '#ffffff', op.width || 4, op.type);
        }
        break;
      case 'emoji':
        if (op.emoji && op.x !== undefined && op.y !== undefined) {
          this.renderEmoji(ctx, op.emoji, op.x, op.y);
        }
        break;
      case 'text':
        if (op.text && op.x !== undefined && op.y !== undefined) {
          this.renderText(ctx, op.text, op.x, op.y, op.fontFamily || 'Arial');
        }
        break;
    }
  }

  private renderStroke(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number,
    type: 'pen' | 'eraser'
  ) {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }

    ctx.lineWidth = width;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
    ctx.restore();
  }

  private renderStrokeWithFade(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number,
    type: 'pen' | 'eraser'
  ) {
    if (points.length < 2) return;

    const now = Date.now();
    const fadeWindow = this.fadeTailDuration;

    const tailStartIdx = this.findTailStartIndex(points, now, fadeWindow);

    if (tailStartIdx >= points.length - 1) {
      this.renderStroke(ctx, points, color, width, type);
      return;
    }

    const mainPoints = points.slice(0, tailStartIdx + 1);
    const fadePoints = points.slice(tailStartIdx);

    if (mainPoints.length > 1) {
      this.renderStroke(ctx, mainPoints, color, width, type);
    }

    if (fadePoints.length >= 2) {
      this.renderFadeTail(ctx, fadePoints, color, width, type, now, fadeWindow);
    }
  }

  private findTailStartIndex(points: Point[], now: number, fadeWindow: number): number {
    for (let i = points.length - 1; i >= 0; i--) {
      if (now - points[i].timestamp > fadeWindow) {
        return i;
      }
    }
    return 0;
  }

  private renderFadeTail(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number,
    type: 'pen' | 'eraser',
    now: number,
    fadeWindow: number
  ) {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }

    for (let i = 1; i < points.length; i++) {
      const progress = (now - points[i].timestamp) / fadeWindow;
      const alpha = Math.max(0, 1 - progress);

      if (type !== 'eraser') {
        ctx.strokeStyle = this.hexToRgba(color, alpha);
        ctx.shadowColor = this.hexToRgba(color, alpha * 0.6);
      } else {
        ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
      }

      ctx.lineWidth = width * (1 - progress * 0.3);

      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private renderEmoji(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number) {
    ctx.save();
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
    ctx.restore();
  }

  private renderText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontFamily: string) {
    ctx.save();
    ctx.font = `24px ${fontFamily}, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private renderEmojiAnimations(ctx: CanvasRenderingContext2D) {
    const now = Date.now();

    for (const anim of this.emojiAnimations.values()) {
      const elapsed = now - anim.startTime;
      const progress = elapsed / anim.duration;

      const scale = 0.3 + progress * 0.7;
      const alpha = progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${32 * scale}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(anim.emoji, anim.x, anim.y);
      ctx.restore();
    }
  }

  private renderClearEffect(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(width * width + height * height);
    const radius = maxRadius * this.clearProgress;

    const startAngle = -Math.PI / 2 - this.clearProgress * Math.PI * 2;
    const endAngle = -Math.PI / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();

    ctx.restore();

    if (this.clearProgress < 1 && this.clearProgress > 0.01) {
      const gradientAngle = endAngle;
      const gradientX = centerX + Math.cos(gradientAngle) * radius * 0.5;
      const gradientY = centerY + Math.sin(gradientAngle) * radius * 0.5;

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowColor = '#bb86fc';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#bb86fc';
      ctx.beginPath();
      ctx.arc(gradientX, gradientY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  destroy() {
    window.removeEventListener('resize', this.resize.bind(this));
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.clearAnimationId) {
      cancelAnimationFrame(this.clearAnimationId);
    }
  }
}

export default CanvasEngine;
