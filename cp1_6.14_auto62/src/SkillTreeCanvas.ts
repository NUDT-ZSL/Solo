import {
  SkillNode,
  SkillConnection,
  CATEGORY_COLORS,
  ConnectionType
} from './TreeDataManager';

export interface CanvasCallbacks {
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionChange: (nodeId: string, x: number, y: number) => void;
  onRequestConnection: (sourceId: string, targetId: string, type: ConnectionType) => void;
  onRemoveConnection: (connectionId: string) => void;
  onHoverNode: (node: SkillNode | null, screenX: number, screenY: number) => void;
  onDropTemplate: (category: string, worldX: number, worldY: number) => void;
  onScaleChange: (scale: number) => void;
}

interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

const NODE_RADIUS = 32;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const GRID_SIZE = 50;
const GRID_COLOR = '#2a2a4e';
const BG_COLOR = '#1a1a2e';

export class SkillTreeCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: CanvasCallbacks;

  private view: ViewState = { offsetX: 0, offsetY: 0, scale: 1.0 };
  private nodes: SkillNode[] = [];
  private connections: SkillConnection[] = [];
  private selectedNodeId: string | null = null;
  private connectionSourceId: string | null = null;

  private isDraggingNode = false;
  private draggedNodeId: string | null = null;
  private dragStartWorld: { x: number; y: number } = { x: 0, y: 0 };
  private dragStartMouse: { x: number; y: number } = { x: 0, y: 0 };

  private isPanning = false;
  private panStart: { x: number; y: number } = { x: 0, y: 0 };

  private hoveredNodeId: string | null = null;
  private hoveredConnectionId: string | null = null;
  private mouseScreenPos: { x: number; y: number } = { x: 0, y: 0 };

  private showGrid = true;
  private dpr = 1;
  private rafId: number | null = null;
  private lastClickTime = 0;
  private lastClickNodeId: string | null = null;

  private animatingConnections: Map<string, { type: 'fadeIn' | 'fadeOut'; startTime: number }> = new Map();

  constructor(canvas: HTMLCanvasElement, callbacks: CanvasCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.callbacks = callbacks;

    this.setupCanvas();
    this.attachEvents();
    this.scheduleRender();
  }

  private setupCanvas(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setData(nodes: SkillNode[], connections: SkillConnection[]): void {
    this.nodes = nodes;
    this.connections = connections;
  }

  setSelectedNode(id: string | null): void {
    this.selectedNodeId = id;
  }

  setConnectionSource(id: string | null): void {
    this.connectionSourceId = id;
  }

  setShowGrid(show: boolean): void {
    this.showGrid = show;
  }

  resetView(): void {
    this.view = { offsetX: 0, offsetY: 0, scale: 1.0 };
    this.callbacks.onScaleChange(1.0);
  }

  getScale(): number {
    return this.view.scale;
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (sx - rect.left - this.view.offsetX) / this.view.scale;
    const y = (sy - rect.top - this.view.offsetY) / this.view.scale;
    return { x, y };
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = wx * this.view.scale + this.view.offsetX + rect.left;
    const y = wy * this.view.scale + this.view.offsetY + rect.top;
    return { x, y };
  }

  private hitTestNode(wx: number, wy: number): SkillNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
        return n;
      }
    }
    return null;
  }

  private hitTestConnection(wx: number, wy: number): SkillConnection | null {
    const threshold = 8 / this.view.scale;
    for (const conn of this.connections) {
      const src = this.nodes.find(n => n.id === conn.sourceId);
      const tgt = this.nodes.find(n => n.id === conn.targetId);
      if (!src || !tgt) continue;

      const cp1x = src.x + (tgt.x - src.x) * 0.5;
      const cp1y = src.y;
      const cp2x = src.x + (tgt.x - src.x) * 0.5;
      const cp2y = tgt.y;

      if (this.pointNearBezier(wx, wy, src.x, src.y, cp1x, cp1y, cp2x, cp2y, tgt.x, tgt.y, threshold)) {
        return conn;
      }
    }
    return null;
  }

  private pointNearBezier(
    px: number, py: number,
    x0: number, y0: number, x1: number, y1: number,
    x2: number, y2: number, x3: number, y3: number,
    threshold: number
  ): boolean {
    for (let t = 0; t <= 1; t += 0.05) {
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const bx = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3;
      const by = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3;
      const dx = px - bx;
      const dy = py - by;
      if (dx * dx + dy * dy <= threshold * threshold) {
        return true;
      }
    }
    return false;
  }

  private attachEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseLeave);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('dblclick', this.onDblClick);
    this.canvas.addEventListener('dragover', this.onDragOver);
    this.canvas.addEventListener('drop', this.onDrop);
    window.addEventListener('resize', this.onResize);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('dblclick', this.onDblClick);
    this.canvas.removeEventListener('dragover', this.onDragOver);
    this.canvas.removeEventListener('drop', this.onDrop);
    window.removeEventListener('resize', this.onResize);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private onResize = (): void => {
    this.resize();
  };

  private onMouseDown = (e: MouseEvent): void => {
    const world = this.screenToWorld(e.clientX, e.clientY);
    const node = this.hitTestNode(world.x, world.y);

    if (e.button === 0) {
      if (node) {
        this.isDraggingNode = true;
        this.draggedNodeId = node.id;
        this.dragStartWorld = { x: node.x, y: node.y };
        this.dragStartMouse = { x: e.clientX, y: e.clientY };
      } else {
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.view.offsetX, y: e.clientY - this.view.offsetY };
      }
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseScreenPos = { x: e.clientX, y: e.clientY };

    if (this.isDraggingNode && this.draggedNodeId) {
      const dx = (e.clientX - this.dragStartMouse.x) / this.view.scale;
      const dy = (e.clientY - this.dragStartMouse.y) / this.view.scale;
      const newX = this.dragStartWorld.x + dx;
      const newY = this.dragStartWorld.y + dy;

      const nodeIdx = this.nodes.findIndex(n => n.id === this.draggedNodeId);
      if (nodeIdx !== -1) {
        this.nodes[nodeIdx] = { ...this.nodes[nodeIdx], x: newX, y: newY };
      }

      this.callbacks.onNodePositionChange(this.draggedNodeId, newX, newY);
    } else if (this.isPanning) {
      this.view.offsetX = e.clientX - this.panStart.x;
      this.view.offsetY = e.clientY - this.panStart.y;
    } else {
      const world = this.screenToWorld(e.clientX, e.clientY);
      const node = this.hitTestNode(world.x, world.y);
      const newHoveredId = node ? node.id : null;

      if (newHoveredId !== this.hoveredNodeId) {
        this.hoveredNodeId = newHoveredId;
        if (node) {
          const rect = this.canvas.getBoundingClientRect();
          this.callbacks.onHoverNode(node, e.clientX - rect.left, e.clientY - rect.top);
        } else {
          this.callbacks.onHoverNode(null, 0, 0);
        }
      }

      const conn = this.hitTestConnection(world.x, world.y);
      this.hoveredConnectionId = conn ? conn.id : null;
    }
  };

  private onMouseUp = (): void => {
    this.isDraggingNode = false;
    this.draggedNodeId = null;
    this.isPanning = false;
  };

  private onMouseLeave = (): void => {
    this.isDraggingNode = false;
    this.draggedNodeId = null;
    this.isPanning = false;
    this.hoveredNodeId = null;
    this.hoveredConnectionId = null;
    this.callbacks.onHoverNode(null, 0, 0);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - this.view.offsetX) / this.view.scale;
    const worldY = (mouseY - this.view.offsetY) / this.view.scale;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.view.scale * zoomFactor));

    this.view.offsetX = mouseX - worldX * newScale;
    this.view.offsetY = mouseY - worldY * newScale;
    this.view.scale = newScale;

    this.callbacks.onScaleChange(newScale);
  };

  private onClick = (e: MouseEvent): void => {
    const world = this.screenToWorld(e.clientX, e.clientY);
    const node = this.hitTestNode(world.x, world.y);
    const conn = this.hitTestConnection(world.x, world.y);

    if (node) {
      if (this.connectionSourceId && this.connectionSourceId !== node.id) {
        this.callbacks.onRequestConnection(this.connectionSourceId, node.id, 'prerequisite');
        this.connectionSourceId = null;
      }
      this.callbacks.onSelectNode(node.id);

      const now = Date.now();
      if (this.lastClickNodeId === node.id && now - this.lastClickTime < 300) {
        this.connectionSourceId = node.id;
      }
      this.lastClickTime = now;
      this.lastClickNodeId = node.id;
    } else if (conn) {
      if (e.shiftKey) {
        this.animateConnectionRemoval(conn.id);
      }
    } else {
      this.callbacks.onSelectNode(null);
      this.connectionSourceId = null;
      this.lastClickNodeId = null;
    }
  };

  private onDblClick = (e: MouseEvent): void => {
    const world = this.screenToWorld(e.clientX, e.clientY);
    const node = this.hitTestNode(world.x, world.y);
    if (node) {
      this.connectionSourceId = node.id;
    }
  };

  private onDragOver = (e: DragEvent): void => {
    e.preventDefault();
  };

  private onDrop = (e: DragEvent): void => {
    e.preventDefault();
    const category = e.dataTransfer?.getData('category');
    if (!category) return;

    const world = this.screenToWorld(e.clientX, e.clientY);
    this.callbacks.onDropTemplate(category, world.x, world.y);
  };

  private animateConnectionRemoval(id: string): void {
    this.animatingConnections.set(id, { type: 'fadeOut', startTime: performance.now() });
    setTimeout(() => {
      this.callbacks.onRemoveConnection(id);
      this.animatingConnections.delete(id);
    }, 300);
  }

  animateConnectionAdd(id: string): void {
    this.animatingConnections.set(id, { type: 'fadeIn', startTime: performance.now() });
    setTimeout(() => this.animatingConnections.delete(id), 300);
  }

  private scheduleRender(): void {
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.view.offsetX, this.view.offsetY);
    ctx.scale(this.view.scale, this.view.scale);

    if (this.showGrid) {
      this.drawGrid(ctx);
    }

    this.drawConnections(ctx);

    if (this.connectionSourceId) {
      this.drawPendingConnection(ctx);
    }

    this.drawNodes(ctx);

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const rect = this.canvas.getBoundingClientRect();
    const startWorld = this.screenToWorld(rect.left, rect.top);
    const endWorld = this.screenToWorld(rect.right, rect.bottom);

    const startX = Math.floor(startWorld.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(startWorld.y / GRID_SIZE) * GRID_SIZE;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1 / this.view.scale;

    ctx.beginPath();
    for (let x = startX; x <= endWorld.x; x += GRID_SIZE) {
      ctx.moveTo(x, startWorld.y);
      ctx.lineTo(x, endWorld.y);
    }
    for (let y = startY; y <= endWorld.y; y += GRID_SIZE) {
      ctx.moveTo(startWorld.x, y);
      ctx.lineTo(endWorld.x, y);
    }
    ctx.stroke();
  }

  private drawConnections(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();

    for (const conn of this.connections) {
      const src = this.nodes.find(n => n.id === conn.sourceId);
      const tgt = this.nodes.find(n => n.id === conn.targetId);
      if (!src || !tgt) continue;

      let alpha = 1;
      const anim = this.animatingConnections.get(conn.id);
      if (anim) {
        const t = Math.min(1, (now - anim.startTime) / 300);
        alpha = anim.type === 'fadeIn' ? t : 1 - t;
      }

      this.drawBezierConnection(ctx, src, tgt, conn.type, alpha, this.hoveredConnectionId === conn.id);
    }
  }

  private drawBezierConnection(
    ctx: CanvasRenderingContext2D,
    src: SkillNode,
    tgt: SkillNode,
    type: ConnectionType,
    alpha: number,
    hovered: boolean
  ): void {
    const cp1x = src.x + (tgt.x - src.x) * 0.5;
    const cp1y = src.y;
    const cp2x = src.x + (tgt.x - src.x) * 0.5;
    const cp2y = tgt.y;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = type === 'prerequisite' ? '#ffffff' : '#00d2ff';
    ctx.lineWidth = hovered ? 5 / this.view.scale : 3 / this.view.scale;

    if (type === 'evolution') {
      ctx.setLineDash([8 / this.view.scale, 4 / this.view.scale]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tgt.x, tgt.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  private drawPendingConnection(ctx: CanvasRenderingContext2D): void {
    const src = this.nodes.find(n => n.id === this.connectionSourceId);
    if (!src) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseWorld = this.screenToWorld(this.mouseScreenPos.x, this.mouseScreenPos.y);

    const cp1x = src.x + (mouseWorld.x - src.x) * 0.5;
    const cp1y = src.y;
    const cp2x = src.x + (mouseWorld.x - src.x) * 0.5;
    const cp2y = mouseWorld.y;

    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 3 / this.view.scale;
    ctx.setLineDash([6 / this.view.scale, 6 / this.view.scale]);

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, mouseWorld.x, mouseWorld.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  private drawNodes(ctx: CanvasRenderingContext2D): void {
    for (const node of this.nodes) {
      this.drawNode(ctx, node);
    }
  }

  private drawNode(ctx: CanvasRenderingContext2D, node: SkillNode): void {
    const isSelected = node.id === this.selectedNodeId;
    const isHovered = node.id === this.hoveredNodeId;
    const isConnSource = node.id === this.connectionSourceId;
    const scale = isHovered ? 1.1 : 1.0;

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.scale(scale, scale);

    const color = CATEGORY_COLORS[node.category] || '#4fc3f7';

    if (isSelected || isConnSource) {
      ctx.shadowColor = isConnSource ? '#4fc3f7' : '#ffffff';
      ctx.shadowBlur = 15 / this.view.scale;
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 3 / this.view.scale;

    ctx.beginPath();
    ctx.arc(0, 0, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = `${24 / this.view.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.icon, 0, -8 / this.view.scale);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${11 / this.view.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const maxWidth = (NODE_RADIUS * 2 - 8) / this.view.scale;
    const displayName = node.name.length > 6 ? node.name.slice(0, 6) + '…' : node.name;
    ctx.fillText(displayName, 0, 12 / this.view.scale);

    ctx.restore();
  }
}
