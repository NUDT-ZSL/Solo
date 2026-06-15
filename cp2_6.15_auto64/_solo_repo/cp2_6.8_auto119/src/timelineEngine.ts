export interface Tag {
  id: string;
  text: string;
  color: string;
}

export interface EventNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor: string;
  title: string;
  description: string;
  date: string;
  tags: Tag[];
  selected: boolean;
  snappedToTimelineId: string | null;
  animTargetX: number | null;
  animTargetY: number | null;
  animStartX: number | null;
  animStartY: number | null;
  animStartTime: number | null;
  animDuration: number;
}

export interface ConnectionArrow {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  color: string;
  hoverColor: string;
  isHovered: boolean;
}

export interface TextLabel {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  selected: boolean;
}

export interface Timeline {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  minLength: number;
  strokeColor: string;
  strokeWidth: number;
}

export type ToolType = 'select' | 'node' | 'arrow' | 'label' | 'timeline';
export type AlignDirection = 'horizontal' | 'vertical';

export interface TimelineState {
  nodes: EventNode[];
  arrows: ConnectionArrow[];
  labels: TextLabel[];
  timelines: Timeline[];
  selectedIds: string[];
  activeTool: ToolType;
  snapDistance: number;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

export class TimelineEngine {
  state: TimelineState;
  listeners: Set<() => void> = new Set();
  pendingArrowFrom: string | null = null;

  constructor() {
    this.state = {
      nodes: [],
      arrows: [],
      labels: [],
      timelines: [],
      selectedIds: [],
      activeTool: 'select',
      snapDistance: 10,
    };
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  setActiveTool(tool: ToolType): void {
    this.state.activeTool = tool;
    this.pendingArrowFrom = null;
    this.notify();
  }

  addNode(x: number, y: number): EventNode {
    const node: EventNode = {
      id: uid(),
      x,
      y,
      width: 120,
      height: 60,
      bgColor: '#EBF4FF',
      title: '',
      description: '',
      date: '',
      tags: [],
      selected: false,
      snappedToTimelineId: null,
      animTargetX: null,
      animTargetY: null,
      animStartX: null,
      animStartY: null,
      animStartTime: null,
      animDuration: 400,
    };
    this.state.nodes.push(node);
    this.notify();
    return node;
  }

  addLabel(x: number, y: number): TextLabel {
    const label: TextLabel = {
      id: uid(),
      x,
      y,
      text: '文本标签',
      fontSize: 14,
      isBold: false,
      isItalic: false,
      selected: false,
    };
    this.state.labels.push(label);
    this.notify();
    return label;
  }

  addTimeline(x: number, y: number, canvasWidth: number): Timeline {
    const length = Math.min(500, Math.max(200, canvasWidth - x - 40));
    const tl: Timeline = {
      id: uid(),
      x1: x,
      y1: y,
      x2: x + length,
      y2: y,
      minLength: 200,
      strokeColor: '#CBD5E0',
      strokeWidth: 2,
    };
    this.state.timelines.push(tl);
    this.notify();
    return tl;
  }

  addArrow(fromId: string, toId: string): ConnectionArrow | null {
    if (fromId === toId) return null;
    if (this.state.arrows.some((a) => a.fromNodeId === fromId && a.toNodeId === toId)) return null;
    const arrow: ConnectionArrow = {
      id: uid(),
      fromNodeId: fromId,
      toNodeId: toId,
      color: '#4A5568',
      hoverColor: '#3182CE',
      isHovered: false,
    };
    this.state.arrows.push(arrow);
    this.notify();
    return arrow;
  }

  clearSelection(): void {
    this.state.selectedIds = [];
    this.state.nodes.forEach((n) => (n.selected = false));
    this.state.labels.forEach((l) => (l.selected = false));
  }

  selectNode(id: string, multi = false): void {
    const node = this.state.nodes.find((n) => n.id === id);
    if (!node) return;
    if (!multi) this.clearSelection();
    node.selected = true;
    if (!this.state.selectedIds.includes(id)) this.state.selectedIds.push(id);
    this.notify();
  }

  selectLabel(id: string, multi = false): void {
    const label = this.state.labels.find((l) => l.id === id);
    if (!label) return;
    if (!multi) this.clearSelection();
    label.selected = true;
    if (!this.state.selectedIds.includes(id)) this.state.selectedIds.push(id);
    this.notify();
  }

  getNode(id: string): EventNode | undefined {
    return this.state.nodes.find((n) => n.id === id);
  }

  getLabel(id: string): TextLabel | undefined {
    return this.state.labels.find((l) => l.id === id);
  }

  getTimeline(id: string): Timeline | undefined {
    return this.state.timelines.find((t) => t.id === id);
  }

  updateNode(id: string, patch: Partial<EventNode>): void {
    const node = this.getNode(id);
    if (!node) return;
    Object.assign(node, patch);
    this.notify();
  }

  updateLabel(id: string, patch: Partial<TextLabel>): void {
    const label = this.getLabel(id);
    if (!label) return;
    Object.assign(label, patch);
    this.notify();
  }

  updateTimeline(id: string, patch: Partial<Timeline>): void {
    const tl = this.getTimeline(id);
    if (!tl) return;
    Object.assign(tl, patch);
    if (tl.x2 < tl.x1 + tl.minLength) tl.x2 = tl.x1 + tl.minLength;
    if (tl.x1 > tl.x2 - tl.minLength) tl.x1 = tl.x2 - tl.minLength;
    this.notify();
  }

  addTagToNode(nodeId: string, text: string, color: string): void {
    const node = this.getNode(nodeId);
    if (!node || node.tags.length >= 3) return;
    node.tags.push({ id: uid(), text, color });
    this.notify();
  }

  removeTagFromNode(nodeId: string, tagId: string): void {
    const node = this.getNode(nodeId);
    if (!node) return;
    node.tags = node.tags.filter((t) => t.id !== tagId);
    this.notify();
  }

  alignSelected(direction: AlignDirection, gap: number): void {
    const selected = this.state.nodes.filter((n) => n.selected);
    if (selected.length < 2) return;

    const sorted = [...selected].sort((a, b) =>
      direction === 'horizontal' ? a.x - b.x : a.y - b.y
    );

    if (direction === 'horizontal') {
      const avgY = sorted.reduce((s, n) => s + n.y + n.height / 2, 0) / sorted.length;
      let curX = sorted[0].x;
      sorted.forEach((n, i) => {
        if (i > 0) curX += sorted[i - 1].width + gap;
        this.setNodeAnimated(n.id, curX, avgY - n.height / 2);
      });
    } else {
      const avgX = sorted.reduce((s, n) => s + n.x + n.width / 2, 0) / sorted.length;
      let curY = sorted[0].y;
      sorted.forEach((n, i) => {
        if (i > 0) curY += sorted[i - 1].height + gap;
        this.setNodeAnimated(n.id, avgX - n.width / 2, curY);
      });
    }
    this.notify();
  }

  setNodeAnimated(id: string, targetX: number, targetY: number): void {
    const node = this.getNode(id);
    if (!node) return;
    node.animStartX = node.x;
    node.animStartY = node.y;
    node.animTargetX = targetX;
    node.animTargetY = targetY;
    node.animStartTime = performance.now();
    node.animDuration = 400;
  }

  tickAnimations(now: number): boolean {
    let animated = false;
    for (const node of this.state.nodes) {
      if (
        node.animStartTime != null &&
        node.animTargetX != null &&
        node.animTargetY != null &&
        node.animStartX != null &&
        node.animStartY != null
      ) {
        const t = Math.min(1, (now - node.animStartTime) / node.animDuration);
        const eased = easeOutBounce(t);
        node.x = node.animStartX + (node.animTargetX - node.animStartX) * eased;
        node.y = node.animStartY + (node.animTargetY - node.animStartY) * eased;
        if (t >= 1) {
          node.x = node.animTargetX;
          node.y = node.animTargetY;
          node.animStartTime = null;
          node.animTargetX = null;
          node.animTargetY = null;
          node.animStartX = null;
          node.animStartY = null;
        }
        animated = true;
      }
    }
    return animated;
  }

  applySnap(nodeId: string, canvasWidth: number): void {
    const node = this.getNode(nodeId);
    if (!node) return;
    const centerY = node.y + node.height / 2;
    const centerX = node.x + node.width / 2;
    let snappedId: string | null = null;
    let closestDist = this.state.snapDistance;

    for (const tl of this.state.timelines) {
      const inRange = centerX >= tl.x1 - 10 && centerX <= tl.x2 + 10;
      if (!inRange) continue;
      const dist = Math.abs(centerY - tl.y1);
      if (dist < closestDist) {
        closestDist = dist;
        snappedId = tl.id;
      }
    }
    if (snappedId) {
      const tl = this.getTimeline(snappedId);
      if (tl) {
        node.y = tl.y1 - node.height / 2;
        node.snappedToTimelineId = snappedId;
        if (centerX < tl.x1 + node.width / 2) node.x = tl.x1;
        else if (centerX > tl.x2 - node.width / 2) node.x = tl.x2 - node.width;
        if (node.x + node.width > canvasWidth) node.x = canvasWidth - node.width - 4;
      }
    } else {
      node.snappedToTimelineId = null;
    }
  }

  hitTestNode(x: number, y: number): EventNode | null {
    for (let i = this.state.nodes.length - 1; i >= 0; i--) {
      const n = this.state.nodes[i];
      if (x >= n.x && x <= n.x + n.width && y >= n.y && y <= n.y + n.height) return n;
    }
    return null;
  }

  hitTestLabel(x: number, y: number): TextLabel | null {
    for (let i = this.state.labels.length - 1; i >= 0; i--) {
      const l = this.state.labels[i];
      const w = Math.max(60, l.text.length * (l.fontSize * 0.6));
      const h = l.fontSize + 8;
      if (x >= l.x && x <= l.x + w && y >= l.y && y <= l.y + h) return l;
    }
    return null;
  }

  hitTestTimelineAnchor(x: number, y: number): { id: string; end: 'start' | 'end' } | null {
    const r = 8;
    for (const tl of this.state.timelines) {
      const d1 = Math.hypot(x - tl.x1, y - tl.y1);
      if (d1 <= r) return { id: tl.id, end: 'start' };
      const d2 = Math.hypot(x - tl.x2, y - tl.y2);
      if (d2 <= r) return { id: tl.id, end: 'end' };
    }
    return null;
  }

  hitTestArrow(x: number, y: number): ConnectionArrow | null {
    for (const a of this.state.arrows) {
      const from = this.getNode(a.fromNodeId);
      const to = this.getNode(a.toNodeId);
      if (!from || !to) continue;
      const x1 = from.x + from.width / 2;
      const y1 = from.y + from.height / 2;
      const x2 = to.x + to.width / 2;
      const y2 = to.y + to.height / 2;
      const dist = this.pointLineDistance(x, y, x1, y1, x2, y2);
      if (dist <= 6) return a;
    }
    return null;
  }

  pointLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.hypot(px - cx, py - cy);
  }

  getSelectedSingleNode(): EventNode | null {
    const selected = this.state.nodes.filter((n) => n.selected);
    return selected.length === 1 ? selected[0] : null;
  }

  getTextScaleFactor(canvasWidth: number): number {
    return canvasWidth < 480 ? 0.88 : 1;
  }
}
