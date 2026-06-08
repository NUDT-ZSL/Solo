import { TimelineEvent } from './EventManager';

export type LayoutMode = 'horizontal' | 'vertical';

export interface NodeLayout {
  event: TimelineEvent;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  pulsePhase: number;
  scale: number;
  opacity: number;
  hoverScale: number;
}

export interface TimelineLayout {
  nodes: NodeLayout[];
  lineStartX: number;
  lineStartY: number;
  lineEndX: number;
  lineEndY: number;
  scrollOffset: number;
  maxScroll: number;
}

const EASE_OUT_EXPO = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const EASE_OUT_BACK = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const NODE_SPACING = 180;
const NODE_RADIUS = 14;
const ANIM_LERP = 0.12;
const PULSE_SPEED = 0.003;
const PULSE_AMPLITUDE = 0.15;

export class TimelineEngine {
  private layout: TimelineLayout | null = null;
  private animFrameId: number = 0;
  private running: boolean = false;
  private lastTime: number = 0;
  private onFrame: ((layout: TimelineLayout) => void) | null = null;
  private _scrollOffset: number = 0;
  private _viewportW: number = 0;
  private _viewportH: number = 0;
  private _layoutMode: LayoutMode = 'horizontal';
  private hoveredNodeId: string | null = null;
  private selectedNodeId: string | null = null;

  get scrollOffset(): number {
    return this._scrollOffset;
  }

  get layoutMode(): LayoutMode {
    return this._layoutMode;
  }

  setLayoutMode(mode: LayoutMode): void {
    this._layoutMode = mode;
    this._scrollOffset = 0;
  }

  setViewport(w: number, h: number): void {
    this._viewportW = w;
    this._viewportH = h;
  }

  setOnFrame(cb: (layout: TimelineLayout) => void): void {
    this.onFrame = cb;
  }

  setHovered(id: string | null): void {
    this.hoveredNodeId = id;
  }

  setSelected(id: string | null): void {
    this.selectedNodeId = id;
  }

  hitTest(canvasX: number, canvasY: number, layout: TimelineLayout): string | null {
    const hitRadius = NODE_RADIUS + 10;
    for (const node of layout.nodes) {
      const dx = canvasX - node.currentX;
      const dy = canvasY - node.currentY;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node.event.id;
      }
    }
    return null;
  }

  computeLayout(events: TimelineEvent[]): TimelineLayout {
    const w = this._viewportW;
    const h = this._viewportH;
    const isHorizontal = this._layoutMode === 'horizontal';

    const nodes: NodeLayout[] = events.map((evt, i) => {
      const targetX = isHorizontal
        ? 100 + i * NODE_SPACING
        : w / 2;
      const targetY = isHorizontal
        ? h / 2
        : 100 + i * NODE_SPACING;

      const existing = this.layout?.nodes.find((n) => n.event.id === evt.id);

      return {
        event: evt,
        x: targetX,
        y: targetY,
        targetX,
        targetY,
        currentX: existing?.currentX ?? targetX,
        currentY: existing?.currentY ?? targetY,
        pulsePhase: existing?.pulsePhase ?? Math.random() * Math.PI * 2,
        scale: existing?.scale ?? 0,
        opacity: existing?.opacity ?? 0,
        hoverScale: existing?.hoverScale ?? 1,
      };
    });

    const count = events.length;
    const totalLength = count > 0 ? (count - 1) * NODE_SPACING : 0;

    const lineStartX = isHorizontal ? 100 : w / 2;
    const lineStartY = isHorizontal ? h / 2 : 100;
    const lineEndX = isHorizontal ? 100 + totalLength : w / 2;
    const lineEndY = isHorizontal ? h / 2 : 100 + totalLength;

    const axisLength = isHorizontal ? totalLength : totalLength;
    const viewportLen = isHorizontal ? w - 200 : h - 200;
    const maxScroll = Math.max(0, axisLength - viewportLen);

    this._scrollOffset = Math.min(this._scrollOffset, maxScroll);

    this.layout = {
      nodes,
      lineStartX,
      lineStartY,
      lineEndX,
      lineEndY,
      scrollOffset: this._scrollOffset,
      maxScroll,
    };

    return this.layout;
  }

  scrollBy(delta: number): void {
    if (!this.layout) return;
    this._scrollOffset = Math.max(
      0,
      Math.min(this.layout.maxScroll, this._scrollOffset + delta)
    );
  }

  scrollToEvent(id: string): void {
    if (!this.layout) return;
    const node = this.layout.nodes.find((n) => n.event.id === id);
    if (!node) return;
    const isHorizontal = this._layoutMode === 'horizontal';
    const viewportLen = isHorizontal ? this._viewportW - 200 : this._viewportH - 200;
    const nodePos = isHorizontal ? node.targetX - 100 : node.targetY - 100;
    this._scrollOffset = Math.max(
      0,
      Math.min(this.layout.maxScroll, nodePos - viewportLen / 2)
    );
  }

  start(events: TimelineEvent[]): void {
    this.computeLayout(events);
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick(events);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private tick = (events: TimelineEvent[]): void => {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 50);
    this.lastTime = now;

    const layout = this.computeLayout(events);

    for (const node of layout.nodes) {
      const isHovered = node.event.id === this.hoveredNodeId;
      const isSelected = node.event.id === this.selectedNodeId;

      const targetScale = 1;
      node.scale += (targetScale - node.scale) * ANIM_LERP * (dt / 16);
      node.scale = Math.min(node.scale, 1);

      const targetOpacity = 1;
      node.opacity += (targetOpacity - node.opacity) * ANIM_LERP * (dt / 16);
      node.opacity = Math.min(node.opacity, 1);

      const targetHover = isSelected ? 1.5 : isHovered ? 1.3 : 1;
      node.hoverScale += (targetHover - node.hoverScale) * 0.15 * (dt / 16);

      const isHorizontal = this._layoutMode === 'horizontal';
      const offset = this._scrollOffset;
      const drawX = isHorizontal ? node.targetX - offset : node.targetX;
      const drawY = isHorizontal ? node.targetY : node.targetY - offset;

      node.currentX += (drawX - node.currentX) * EASE_OUT_EXPO(ANIM_LERP * (dt / 16));
      node.currentY += (drawY - node.currentY) * EASE_OUT_EXPO(ANIM_LERP * (dt / 16));

      node.pulsePhase += PULSE_SPEED * dt;
    }

    layout.scrollOffset = this._scrollOffset;

    const isHorizontal = this._layoutMode === 'horizontal';
    const scrollOff = this._scrollOffset;
    layout.lineStartX = isHorizontal ? 100 - scrollOff : layout.lineStartX;
    layout.lineEndX = isHorizontal ? layout.lineEndX - scrollOff : layout.lineEndX;
    layout.lineStartY = isHorizontal ? layout.lineStartY : 100;
    layout.lineEndY = isHorizontal ? layout.lineEndY : layout.lineEndY - scrollOff;

    if (this.onFrame) this.onFrame(layout);

    this.animFrameId = requestAnimationFrame(() => this.tick(events));
  };

}
