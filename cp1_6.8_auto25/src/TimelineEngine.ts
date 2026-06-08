import { LayerManager, NodePosition } from './LayerManager';
import { TimelineEvent } from './EventManager';

interface AnimationState {
  hoverIndex: number;
  selectedIndex: number;
  pulsePhase: number;
  nodeScales: Float32Array;
  nodeGlows: Float32Array;
  targetScales: Float32Array;
  targetGlows: Float32Array;
  dragIndex: number;
  dragX: number;
  dragY: number;
}

const EASE_SPEED = 0.12;
const PULSE_SPEED = 0.04;
const GLOW_BASE = 0.3;
const GLOW_HOVER = 1.0;
const GLOW_SELECTED = 0.85;
const SCALE_BASE = 1.0;
const SCALE_HOVER = 1.35;
const SCALE_SELECTED = 1.25;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

export class TimelineEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private layerManager: LayerManager;
  private events: TimelineEvent[] = [];
  private positions: NodePosition[] = [];
  private anim: AnimationState;
  private rafId: number = 0;
  private lastFrameTime = 0;
  private onNodeClick: ((index: number) => void) | null = null;
  private dpr = 1;

  constructor(layerManager: LayerManager) {
    this.layerManager = layerManager;
    this.anim = this.createAnimState(0);
  }

  private createAnimState(count: number): AnimationState {
    return {
      hoverIndex: -1,
      selectedIndex: -1,
      pulsePhase: 0,
      nodeScales: new Float32Array(count).fill(SCALE_BASE),
      nodeGlows: new Float32Array(count).fill(GLOW_BASE),
      targetScales: new Float32Array(count).fill(SCALE_BASE),
      targetGlows: new Float32Array(count).fill(GLOW_BASE),
      dragIndex: -1,
      dragX: 0,
      dragY: 0,
    };
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.bindEvents();
    this.startLoop();
  }

  detach(): void {
    this.stopLoop();
    this.unbindEvents();
    this.canvas = null;
    this.ctx = null;
  }

  resize(): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement!;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx!.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.layerManager.setCanvasSize(w, h);
  }

  setEvents(events: TimelineEvent[]): void {
    this.events = events;
    if (events.length !== this.anim.nodeScales.length) {
      const oldSelected = this.anim.selectedIndex;
      const oldHover = this.anim.hoverIndex;
      this.anim = this.createAnimState(events.length);
      if (oldSelected >= 0 && oldSelected < events.length) this.anim.selectedIndex = oldSelected;
      if (oldHover >= 0 && oldHover < events.length) this.anim.hoverIndex = oldHover;
    }
    this.layerManager.setEventCount(events.length);
    this.recalculatePositions();
  }

  setSelectedIndex(idx: number): void {
    this.anim.selectedIndex = idx;
    this.updateTargets();
  }

  setOnNodeClick(fn: (index: number) => void): void {
    this.onNodeClick = fn;
  }

  setDragState(dragIndex: number, x: number, y: number): void {
    this.anim.dragIndex = dragIndex;
    this.anim.dragX = x;
    this.anim.dragY = y;
  }

  clearDrag(): void {
    this.anim.dragIndex = -1;
  }

  private recalculatePositions(): void {
    this.positions = this.layerManager.calculateNodePositions();
  }

  private updateTargets(): void {
    const { hoverIndex, selectedIndex, targetScales, targetGlows } = this.anim;
    for (let i = 0; i < targetScales.length; i++) {
      if (i === hoverIndex) {
        targetScales[i] = SCALE_HOVER;
        targetGlows[i] = GLOW_HOVER;
      } else if (i === selectedIndex) {
        targetScales[i] = SCALE_SELECTED;
        targetGlows[i] = GLOW_SELECTED;
      } else {
        targetScales[i] = SCALE_BASE;
        targetGlows[i] = GLOW_BASE;
      }
    }
  }

  private startLoop(): void {
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      const delta = now - this.lastFrameTime;
      if (delta < FRAME_TIME * 0.8) return;
      this.lastFrameTime = now;
      this.update();
      this.draw();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private update(): void {
    this.anim.pulsePhase += PULSE_SPEED;
    if (this.anim.pulsePhase > Math.PI * 2) this.anim.pulsePhase -= Math.PI * 2;

    const { nodeScales, nodeGlows, targetScales, targetGlows } = this.anim;
    for (let i = 0; i < nodeScales.length; i++) {
      nodeScales[i] += (targetScales[i] - nodeScales[i]) * EASE_SPEED;
      nodeGlows[i] += (targetGlows[i] - nodeGlows[i]) * EASE_SPEED;
    }
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    ctx.clearRect(0, 0, w, h);
    this.drawBackground(ctx, w, h);
    this.drawTimelineLine(ctx, w, h);
    this.drawNodes(ctx);
    this.drawLabels(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 3; i++) {
      const cx = w * (0.2 + i * 0.3);
      const cy = h * 0.5;
      const r = Math.min(w, h) * 0.4;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, '#60a5fa');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  private drawTimelineLine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.positions.length < 2) return;

    const mode = this.layerManager.getMode();
    ctx.save();

    const grad = ctx.createLinearGradient(0, 0, mode === 'horizontal' ? w : 0, mode === 'vertical' ? h : 0);
    grad.addColorStop(0, 'rgba(96,165,250,0.1)');
    grad.addColorStop(0.3, 'rgba(96,165,250,0.6)');
    grad.addColorStop(0.7, 'rgba(96,165,250,0.6)');
    grad.addColorStop(1, 'rgba(96,165,250,0.1)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    const first = this.positions[0];
    const last = this.positions[this.positions.length - 1];

    if (mode === 'vertical') {
      ctx.moveTo(first.x, Math.max(-50, first.y - 40));
      for (let i = 0; i < this.positions.length; i++) {
        ctx.lineTo(this.positions[i].x, this.positions[i].y);
      }
      ctx.lineTo(last.x, Math.min(h + 50, last.y + 40));
    } else {
      ctx.moveTo(Math.max(-50, first.x - 40), first.y);
      for (let i = 0; i < this.positions.length; i++) {
        ctx.lineTo(this.positions[i].x, this.positions[i].y);
      }
      ctx.lineTo(Math.min(w + 50, last.x + 40), last.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawNodes(ctx: CanvasRenderingContext2D): void {
    const radius = this.layerManager.getNodeRadius();
    const pulse = Math.sin(this.anim.pulsePhase);

    for (let i = 0; i < this.positions.length; i++) {
      const pos = this.positions[i];
      const event = this.events[i];
      if (!event) continue;

      const scale = this.anim.nodeScales[i];
      const glow = this.anim.nodeGlows[i];
      const r = radius * scale;

      let x = pos.x;
      let y = pos.y;
      if (this.anim.dragIndex === i) {
        x = this.anim.dragX;
        y = this.anim.dragY;
      }

      const pulseRadius = r + 8 + pulse * 4 * glow;

      ctx.save();
      const glowGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, pulseRadius * 2.5);
      const c = this.hexToRgb(event.color);
      glowGrad.addColorStop(0, `rgba(${c},${0.3 * glow})`);
      glowGrad.addColorStop(0.5, `rgba(${c},${0.1 * glow})`);
      glowGrad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(x, y, pulseRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, r + 3 + pulse * 2 * glow, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c},${0.15 + 0.1 * glow})`;
      ctx.fill();

      const nodeGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
      nodeGrad.addColorStop(0, this.lightenColor(event.color, 40));
      nodeGrad.addColorStop(1, event.color);
      ctx.fillStyle = nodeGrad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${0.2 + 0.3 * glow})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `${Math.round(r * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(event.icon, x, y + 1);
      ctx.restore();
    }
  }

  private drawLabels(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.positions.length; i++) {
      const pos = this.positions[i];
      const event = this.events[i];
      if (!event) continue;

      if (this.anim.dragIndex === i) continue;

      const scale = this.anim.nodeScales[i];
      const isHoverOrSelected = i === this.anim.hoverIndex || i === this.anim.selectedIndex;
      const alpha = isHoverOrSelected ? 1 : 0.7;

      ctx.save();
      ctx.globalAlpha = alpha;

      const mode = this.layerManager.getMode();
      if (mode === 'vertical') {
        const alignRight = pos.side === 'left';
        ctx.textAlign = alignRight ? 'right' : 'left';

        ctx.fillStyle = '#e2e8f0';
        ctx.font = `600 ${14 * Math.min(scale, 1.15)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(event.title, pos.labelX, pos.labelY - 10);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `400 ${12 * Math.min(scale, 1.05)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(event.date, pos.labelX, pos.labelY + 10);
      } else {
        ctx.textAlign = 'center';
        const dir = pos.side === 'left' ? -1 : 1;

        ctx.fillStyle = '#e2e8f0';
        ctx.font = `600 ${14 * Math.min(scale, 1.15)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(event.title, pos.labelX, pos.labelY);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `400 ${12 * Math.min(scale, 1.05)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillText(event.date, pos.labelX, pos.labelY + 18 * dir);
      }
      ctx.restore();
    }
  }

  private hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }

  private lightenColor(hex: string, amount: number): string {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return `rgb(${r},${g},${b})`;
  }

  private mouseX = 0;
  private mouseY = 0;

  private bindEvents(): void {
    if (!this.canvas) return;
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  private unbindEvents(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas!.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    const hitIdx = this.layerManager.hitTest(this.mouseX, this.mouseY, this.positions);
    this.anim.hoverIndex = hitIdx;
    this.updateTargets();

    if (this.canvas) {
      this.canvas.style.cursor = hitIdx >= 0 ? 'pointer' : 'default';
    }
  };

  private handleClick = (_e: MouseEvent): void => {
    const hitIdx = this.layerManager.hitTest(this.mouseX, this.mouseY, this.positions);
    if (hitIdx >= 0 && this.onNodeClick) {
      this.anim.selectedIndex = hitIdx;
      this.updateTargets();
      this.onNodeClick(hitIdx);
    }
  };

  private handleMouseLeave = (): void => {
    this.anim.hoverIndex = -1;
    this.updateTargets();
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const current = this.layerManager.getScrollOffset();
    const delta = this.layerManager.getMode() === 'vertical' ? e.deltaY : e.deltaX || e.deltaY;
    const next = this.layerManager.clampScroll(current + delta * 0.8);
    this.layerManager.setScrollOffset(next);
    this.recalculatePositions();
  };

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  getPositions(): NodePosition[] {
    return this.positions;
  }
}
