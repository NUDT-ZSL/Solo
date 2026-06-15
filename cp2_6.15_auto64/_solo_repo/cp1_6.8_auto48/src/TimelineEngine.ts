export type Priority = 'high' | 'medium' | 'low';
export type ViewMode = 'week' | 'month';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  date: string;
  timestamp: number;
}

export interface NodeLayout {
  event: TimelineEvent;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  glowPhase: number;
  scale: number;
  targetScale: number;
  hovered: boolean;
  lineProgress: number;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#ff3b5c',
  medium: '#ff9f43',
  low: '#2ed573',
};

const PRIORITY_GLOW: Record<Priority, string> = {
  high: 'rgba(255,59,92,0.6)',
  medium: 'rgba(255,159,67,0.6)',
  low: 'rgba(46,213,115,0.6)',
};

export function getPriorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority];
}

export function getPriorityGlow(priority: Priority): string {
  return PRIORITY_GLOW[priority];
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export class TimelineEngine {
  private events: TimelineEvent[] = [];
  private nodes: NodeLayout[] = [];
  private viewMode: ViewMode = 'week';
  private animating: boolean = false;
  private animStartTime: number = 0;
  private baseDate: Date = new Date();
  private onNodesChange?: (nodes: NodeLayout[]) => void;
  private scrollOffset: number = 0;
  private readonly NODE_SPACING = 120;
  private readonly ANIM_DURATION = 800;

  constructor(onNodesChange?: (nodes: NodeLayout[]) => void) {
    this.onNodesChange = onNodesChange;
    this.baseDate = new Date();
  }

  setCallback(cb: (nodes: NodeLayout[]) => void): void {
    this.onNodesChange = cb;
  }

  addEvent(title: string, description: string, priority: Priority, date?: string): TimelineEvent {
    const dateStr = date || this.formatDate(new Date());
    const ts = new Date(dateStr).getTime();
    const event: TimelineEvent = {
      id: generateId(),
      title,
      description,
      priority,
      date: dateStr,
      timestamp: ts,
    };
    this.events.push(event);
    this.events.sort((a, b) => a.timestamp - b.timestamp);
    this.recalculateLayout();
    this.startAnimation();
    return event;
  }

  removeEvent(id: string): void {
    this.events = this.events.filter(e => e.id !== id);
    this.nodes = this.nodes.filter(n => n.event.id !== id);
    this.recalculateLayout();
    this.startAnimation();
  }

  getEvents(): TimelineEvent[] {
    return [...this.events];
  }

  setViewMode(mode: ViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.recalculateLayout();
    this.startAnimation();
  }

  getViewMode(): ViewMode {
    return this.viewMode;
  }

  setBaseDate(date: Date): void {
    this.baseDate = date;
    this.recalculateLayout();
    this.startAnimation();
  }

  getBaseDate(): Date {
    return new Date(this.baseDate);
  }

  setScrollOffset(offset: number): void {
    this.scrollOffset = offset;
  }

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  getVisibleRange(): { start: Date; end: Date } {
    const base = new Date(this.baseDate);
    if (this.viewMode === 'week') {
      const day = base.getDay();
      const start = new Date(base);
      start.setDate(base.getDate() - day + (day === 0 ? -6 : 1));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    } else {
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      return { start, end };
    }
  }

  navigatePrev(): void {
    const d = new Date(this.baseDate);
    if (this.viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    this.baseDate = d;
    this.recalculateLayout();
    this.startAnimation();
  }

  navigateNext(): void {
    const d = new Date(this.baseDate);
    if (this.viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    this.baseDate = d;
    this.recalculateLayout();
    this.startAnimation();
  }

  setHovered(nodeId: string, hovered: boolean): void {
    const node = this.nodes.find(n => n.event.id === nodeId);
    if (node) {
      node.hovered = hovered;
      node.targetScale = hovered ? 1.4 : 1.0;
    }
  }

  getNodes(): NodeLayout[] {
    return this.nodes;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private recalculateLayout(): void {
    const { start, end } = this.getVisibleRange();
    const startTs = start.getTime();
    const endTs = end.getTime();

    const visibleEvents = this.events.filter(
      e => e.timestamp >= startTs && e.timestamp <= endTs + 86400000
    );

    const centerX = 0;
    const startY = 80;

    const existingMap = new Map(this.nodes.map(n => [n.event.id, n]));

    const newNodes: NodeLayout[] = visibleEvents.map((event, i) => {
      const existing = existingMap.get(event.id);
      const targetX = centerX;
      const targetY = startY + i * this.NODE_SPACING;

      return {
        event,
        x: existing ? existing.currentX : targetX,
        y: existing ? existing.currentY : targetY,
        targetX,
        targetY,
        currentX: existing ? existing.currentX : targetX,
        currentY: existing ? existing.currentY : targetY,
        glowPhase: existing ? existing.glowPhase : Math.random() * Math.PI * 2,
        scale: existing ? existing.scale : 0,
        targetScale: existing ? existing.targetScale : 1.0,
        hovered: existing ? existing.hovered : false,
        lineProgress: existing ? existing.lineProgress : 0,
      };
    });

    this.nodes = newNodes;
  }

  private startAnimation(): void {
    this.animating = true;
    this.animStartTime = performance.now();
  }

  update(time: number): boolean {
    let needsRedraw = false;

    if (this.animating) {
      const elapsed = time - this.animStartTime;
      const progress = Math.min(elapsed / this.ANIM_DURATION, 1);
      const eased = easeOutCubic(progress);

      for (const node of this.nodes) {
        node.currentX = lerp(node.x, node.targetX, eased);
        node.currentY = lerp(node.y, node.targetY, eased);
        node.lineProgress = easeInOutQuad(progress);

        if (node.scale < node.targetScale) {
          node.scale = Math.min(node.scale + 0.08, node.targetScale);
        }

        if (progress >= 1) {
          node.x = node.targetX;
          node.y = node.targetY;
        }
      }

      needsRedraw = true;

      if (progress >= 1) {
        this.animating = false;
        for (const node of this.nodes) {
          node.currentX = node.targetX;
          node.currentY = node.targetY;
        }
      }
    }

    for (const node of this.nodes) {
      node.glowPhase += 0.03;
      if (node.glowPhase > Math.PI * 2) node.glowPhase -= Math.PI * 2;

      if (Math.abs(node.scale - node.targetScale) > 0.01) {
        node.scale = lerp(node.scale, node.targetScale, 0.15);
        needsRedraw = true;
      }
    }

    if (this.onNodesChange) {
      this.onNodesChange(this.nodes);
    }

    return needsRedraw || this.animating;
  }

  drawTimeline(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scrollOffset: number
  ): void {
    const centerX = width / 2;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(centerX, 0, centerX, height);
    gradient.addColorStop(0, 'rgba(108,92,231,0.15)');
    gradient.addColorStop(0.5, 'rgba(108,92,231,0.05)');
    gradient.addColorStop(1, 'rgba(108,92,231,0.15)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const nx = centerX + node.currentX;
      const ny = node.currentY - scrollOffset;

      if (ny < -60 || ny > height + 60) continue;

      if (i > 0) {
        const prev = this.nodes[i - 1];
        const px = centerX + prev.currentX;
        const py = prev.currentY - scrollOffset;

        const lineGrad = ctx.createLinearGradient(px, py, nx, ny);
        lineGrad.addColorStop(0, getPriorityGlow(prev.event.priority));
        lineGrad.addColorStop(1, getPriorityGlow(node.event.priority));

        ctx.save();
        ctx.globalAlpha = node.lineProgress;
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        const midY = (py + ny) / 2;
        ctx.bezierCurveTo(px, midY, nx, midY, nx, ny);
        ctx.stroke();
        ctx.restore();
      }

      const breathe = Math.sin(node.glowPhase) * 0.3 + 0.7;
      const radius = 8 * node.scale;
      const glowRadius = (20 + breathe * 12) * node.scale;
      const color = getPriorityColor(node.event.priority);
      const glowColor = getPriorityGlow(node.event.priority);

      ctx.save();
      const glow = ctx.createRadialGradient(nx, ny, radius * 0.5, nx, ny, glowRadius);
      glow.addColorStop(0, glowColor);
      glow.addColorStop(0.5, `rgba(108,92,231,${0.1 * breathe})`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(nx, ny, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 * breathe;
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(nx, ny, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${node.hovered ? '13px' : '12px'} -apple-system, sans-serif`;
      ctx.textAlign = nx > centerX ? 'right' : 'left';
      const labelX = nx + (nx > centerX ? -24 : 24);
      ctx.fillText(node.event.title, labelX, ny + 4);
      ctx.restore();
    }
  }

  hitTest(mx: number, my: number, width: number, scrollOffset: number): NodeLayout | null {
    const centerX = width / 2;
    for (const node of this.nodes) {
      const nx = centerX + node.currentX;
      const ny = node.currentY - scrollOffset;
      const dist = Math.sqrt((mx - nx) ** 2 + (my - ny) ** 2);
      if (dist < 20 * node.scale) {
        return node;
      }
    }
    return null;
  }

  getDateSlots(): { date: string; label: string; dayOfWeek: number }[] {
    const { start, end } = this.getVisibleRange();
    const slots: { date: string; label: string; dayOfWeek: number }[] = [];
    const current = new Date(start);
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    while (current <= end) {
      slots.push({
        date: this.formatDate(current),
        label: `${current.getMonth() + 1}/${current.getDate()}`,
        dayOfWeek: current.getDay(),
      });
      current.setDate(current.getDate() + 1);
    }
    return slots;
  }
}
