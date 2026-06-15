import { WhiteboardNode, NodeManager } from './nodeManager';

export interface Connector {
  id: string;
  fromNodeId: string;
  fromAnchorIndex: number;
  toNodeId: string;
  toAnchorIndex: number;
}

interface ConnectorHistoryAction {
  type: 'add' | 'delete';
  connector: Connector;
}

const MAX_CONNECTOR_HISTORY = 50;
const SNAP_DISTANCE = 50;
const CONTROL_OFFSET = 50;

export class ConnectorManager {
  private connectors: Map<string, Connector> = new Map();
  private selectedConnectorId: string | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodeManager: NodeManager;
  private history: ConnectorHistoryAction[] = [];
  private historyIndex: number = -1;
  private onConnectorsChanged: () => void;
  private onSelectionChanged: (connectorId: string | null) => void;
  private onRequestSave: () => void;
  private viewportOffset = { x: 0, y: 0 };
  private viewportScale = 1;
  private isCreating = false;
  private createStart: { nodeId: string; anchorIndex: number; x: number; y: number } | null = null;
  private mousePosition: { x: number; y: number } | null = null;
  private hoveredAnchor: { nodeId: string; anchorIndex: number } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    nodeManager: NodeManager,
    onConnectorsChanged: () => void,
    onSelectionChanged: (connectorId: string | null) => void,
    onRequestSave: () => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.nodeManager = nodeManager;
    this.onConnectorsChanged = onConnectorsChanged;
    this.onSelectionChanged = onSelectionChanged;
    this.onRequestSave = onRequestSave;
  }

  setViewport(offset: { x: number; y: number }, scale: number) {
    this.viewportOffset = offset;
    this.viewportScale = scale;
  }

  getConnectors(): Connector[] {
    return Array.from(this.connectors.values());
  }

  getSelectedConnectorId(): string | null {
    return this.selectedConnectorId;
  }

  loadConnectors(connectors: Connector[]) {
    this.connectors.clear();
    this.history = [];
    this.historyIndex = -1;
    this.selectedConnectorId = null;
    for (const c of connectors) {
      this.connectors.set(c.id, { ...c });
    }
    this.onConnectorsChanged();
    this.onSelectionChanged(null);
  }

  clearAll() {
    this.connectors.clear();
    this.selectedConnectorId = null;
    this.onConnectorsChanged();
    this.onSelectionChanged(null);
  }

  deleteSelected() {
    if (!this.selectedConnectorId) return false;
    const c = this.connectors.get(this.selectedConnectorId);
    if (c) {
      this.deleteConnector(c.id);
      return true;
    }
    return false;
  }

  setSelectedConnector(id: string | null) {
    this.selectedConnectorId = id;
    this.onSelectionChanged(id);
  }

  private pushHistory(action: ConnectorHistoryAction) {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(action);
    if (this.history.length > MAX_CONNECTOR_HISTORY) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return;
    const action = this.history[this.historyIndex];
    this.historyIndex--;
    if (action.type === 'add') {
      this.connectors.delete(action.connector.id);
    } else if (action.type === 'delete') {
      this.connectors.set(action.connector.id, { ...action.connector });
    }
    this.onConnectorsChanged();
    this.onRequestSave();
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    const action = this.history[this.historyIndex];
    if (action.type === 'add') {
      this.connectors.set(action.connector.id, { ...action.connector });
    } else if (action.type === 'delete') {
      this.connectors.delete(action.connector.id);
    }
    this.onConnectorsChanged();
    this.onRequestSave();
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: wx * this.viewportScale + this.viewportOffset.x,
      y: wy * this.viewportScale + this.viewportOffset.y
    };
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.viewportOffset.x) / this.viewportScale,
      y: (sy - this.viewportOffset.y) / this.viewportScale
    };
  }

  private findNearestAnchor(
    worldX: number,
    worldY: number,
    excludeNodeId?: string
  ): { nodeId: string; anchorIndex: number; distance: number } | null {
    let nearest: { nodeId: string; anchorIndex: number; distance: number } | null = null;

    for (const node of this.nodeManager.getNodes()) {
      if (excludeNodeId && node.id === excludeNodeId) continue;
      const anchors = this.nodeManager.getAnchorPoints(node);
      for (let i = 0; i < anchors.length; i++) {
        const dist = Math.hypot(anchors[i].x - worldX, anchors[i].y - worldY);
        if (!nearest || dist < nearest.distance) {
          nearest = { nodeId: node.id, anchorIndex: i, distance: dist };
        }
      }
    }
    return nearest;
  }

  handleMouseDown(screenX: number, screenY: number): boolean {
    const world = this.screenToWorld(screenX, screenY);

    const hit = this.hitTestConnector(screenX, screenY);
    if (hit) {
      this.selectedConnectorId = hit;
      this.onSelectionChanged(hit);
      return true;
    }

    const nearest = this.findNearestAnchor(world.x, world.y);
    if (nearest && nearest.distance * this.viewportScale < SNAP_DISTANCE) {
      const node = this.nodeManager.getNode(nearest.nodeId);
      if (node) {
        const anchors = this.nodeManager.getAnchorPoints(node);
        this.isCreating = true;
        this.createStart = {
          nodeId: nearest.nodeId,
          anchorIndex: nearest.anchorIndex,
          x: anchors[nearest.anchorIndex].x,
          y: anchors[nearest.anchorIndex].y
        };
        this.mousePosition = { x: screenX, y: screenY };
        return true;
      }
    }

    this.selectedConnectorId = null;
    this.onSelectionChanged(null);
    return false;
  }

  handleMouseMove(screenX: number, screenY: number): boolean {
    if (this.isCreating) {
      this.mousePosition = { x: screenX, y: screenY };
      const world = this.screenToWorld(screenX, screenY);
      const nearest = this.findNearestAnchor(world.x, world.y, this.createStart?.nodeId);
      if (nearest && nearest.distance * this.viewportScale < SNAP_DISTANCE) {
        this.hoveredAnchor = { nodeId: nearest.nodeId, anchorIndex: nearest.anchorIndex };
      } else {
        this.hoveredAnchor = null;
      }
      return true;
    }

    const world = this.screenToWorld(screenX, screenY);
    const nearest = this.findNearestAnchor(world.x, world.y);
    if (nearest && nearest.distance * this.viewportScale < SNAP_DISTANCE) {
      this.hoveredAnchor = { nodeId: nearest.nodeId, anchorIndex: nearest.anchorIndex };
      return true;
    } else {
      this.hoveredAnchor = null;
    }
    return false;
  }

  handleMouseUp(screenX: number, screenY: number): boolean {
    if (!this.isCreating || !this.createStart) {
      this.isCreating = false;
      this.createStart = null;
      this.hoveredAnchor = null;
      return false;
    }

    const world = this.screenToWorld(screenX, screenY);
    const nearest = this.findNearestAnchor(world.x, world.y, this.createStart.nodeId);

    if (nearest && nearest.distance * this.viewportScale < SNAP_DISTANCE && nearest.nodeId !== this.createStart.nodeId) {
      const connector: Connector = {
        id: this.generateId(),
        fromNodeId: this.createStart.nodeId,
        fromAnchorIndex: this.createStart.anchorIndex,
        toNodeId: nearest.nodeId,
        toAnchorIndex: nearest.anchorIndex
      };
      this.connectors.set(connector.id, connector);
      this.pushHistory({ type: 'add', connector: { ...connector } });
      this.onConnectorsChanged();
      this.onRequestSave();
    }

    this.isCreating = false;
    this.createStart = null;
    this.hoveredAnchor = null;
    this.mousePosition = null;
    return true;
  }

  private generateId(): string {
    return 'conn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  deleteConnector(id: string, recordHistory: boolean = true) {
    const c = this.connectors.get(id);
    if (!c) return;
    if (recordHistory) {
      this.pushHistory({ type: 'delete', connector: { ...c } });
    }
    this.connectors.delete(id);
    if (this.selectedConnectorId === id) {
      this.selectedConnectorId = null;
      this.onSelectionChanged(null);
    }
    this.onConnectorsChanged();
    if (recordHistory) this.onRequestSave();
  }

  deleteConnectorsByNode(nodeId: string) {
    const toDelete: string[] = [];
    for (const c of this.connectors.values()) {
      if (c.fromNodeId === nodeId || c.toNodeId === nodeId) {
        toDelete.push(c.id);
      }
    }
    for (const id of toDelete) {
      this.deleteConnector(id, false);
    }
  }

  private hitTestConnector(screenX: number, screenY: number): string | null {
    for (const c of this.connectors.values()) {
      const fromNode = this.nodeManager.getNode(c.fromNodeId);
      const toNode = this.nodeManager.getNode(c.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromAnchors = this.nodeManager.getAnchorPoints(fromNode);
      const toAnchors = this.nodeManager.getAnchorPoints(toNode);
      const from = this.worldToScreen(fromAnchors[c.fromAnchorIndex].x, fromAnchors[c.fromAnchorIndex].y);
      const to = this.worldToScreen(toAnchors[c.toAnchorIndex].x, toAnchors[c.toAnchorIndex].y);

      const path = this.getBezierPoints(from.x, from.y, to.x, to.y);
      for (let t = 0; t <= 1; t += 0.02) {
        const px = path.x(t);
        const py = path.y(t);
        const dist = Math.hypot(screenX - px, screenY - py);
        if (dist < 8) return c.id;
      }
    }
    return null;
  }

  private getBezierPoints(x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const perpAngle = angle + Math.PI / 2;

    const offsetX = Math.cos(perpAngle) * CONTROL_OFFSET;
    const offsetY = Math.sin(perpAngle) * CONTROL_OFFSET;

    const cp1x = x1 + dx * 0.5 + offsetX;
    const cp1y = y1 + dy * 0.5 + offsetY;
    const cp2x = x2 - dx * 0.5 + offsetX;
    const cp2y = y2 - dy * 0.5 + offsetY;

    return {
      cp1x, cp1y, cp2x, cp2y,
      x: (t: number) => {
        const mt = 1 - t;
        return mt * mt * mt * x1 + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * x2;
      },
      y: (t: number) => {
        const mt = 1 - t;
        return mt * mt * mt * y1 + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * y2;
      },
      dx: (t: number) => {
        const mt = 1 - t;
        return 3 * mt * mt * (cp1x - x1) + 6 * mt * t * (cp2x - cp1x) + 3 * t * t * (x2 - cp2x);
      },
      dy: (t: number) => {
        const mt = 1 - t;
        return 3 * mt * mt * (cp1y - y1) + 6 * mt * t * (cp2y - cp1y) + 3 * t * t * (y2 - cp2y);
      }
    };
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string,
    alpha: number
  ) {
    const size = 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.5);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  draw() {
    const ctx = this.ctx;

    for (const c of this.connectors.values()) {
      const fromNode = this.nodeManager.getNode(c.fromNodeId);
      const toNode = this.nodeManager.getNode(c.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromAnchors = this.nodeManager.getAnchorPoints(fromNode);
      const toAnchors = this.nodeManager.getAnchorPoints(toNode);
      const from = this.worldToScreen(fromAnchors[c.fromAnchorIndex].x, fromAnchors[c.fromAnchorIndex].y);
      const to = this.worldToScreen(toAnchors[c.toAnchorIndex].x, toAnchors[c.toAnchorIndex].y);

      const isSelected = this.selectedConnectorId === c.id;
      const color = isSelected ? '#4A90D9' : '#888';
      const lineWidth = isSelected ? 3 : 2;

      const bezier = this.getBezierPoints(from.x, from.y, to.x, to.y);

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.bezierCurveTo(bezier.cp1x, bezier.cp1y, bezier.cp2x, bezier.cp2y, to.x, to.y);
      ctx.stroke();

      const startAngle = Math.atan2(bezier.dy(0.1), bezier.dx(0.1));
      const endAngle = Math.atan2(bezier.dy(0.9), bezier.dx(0.9));
      this.drawArrow(ctx, bezier.x(0.1), bezier.y(0.1), startAngle + Math.PI, color, isSelected ? 1 : 0.7);
      this.drawArrow(ctx, bezier.x(0.9), bezier.y(0.9), endAngle, color, isSelected ? 1 : 0.7);
    }

    if (this.isCreating && this.createStart && this.mousePosition) {
      const from = this.worldToScreen(this.createStart.x, this.createStart.y);
      let toX = this.mousePosition.x;
      let toY = this.mousePosition.y;

      if (this.hoveredAnchor) {
        const node = this.nodeManager.getNode(this.hoveredAnchor.nodeId);
        if (node) {
          const anchors = this.nodeManager.getAnchorPoints(node);
          const pt = this.worldToScreen(anchors[this.hoveredAnchor.anchorIndex].x, anchors[this.hoveredAnchor.anchorIndex].y);
          toX = pt.x;
          toY = pt.y;
        }
      }

      const bezier = this.getBezierPoints(from.x, from.y, toX, toY);
      ctx.strokeStyle = '#4A90D9';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.bezierCurveTo(bezier.cp1x, bezier.cp1y, bezier.cp2x, bezier.cp2y, toX, toY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (this.hoveredAnchor) {
      const node = this.nodeManager.getNode(this.hoveredAnchor.nodeId);
      if (node) {
        const anchors = this.nodeManager.getAnchorPoints(node);
        const pt = this.worldToScreen(anchors[this.hoveredAnchor.anchorIndex].x, anchors[this.hoveredAnchor.anchorIndex].y);
        ctx.fillStyle = '#4A90D9';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    if (!this.isCreating) {
      for (const node of this.nodeManager.getNodes()) {
        const anchors = this.nodeManager.getAnchorPoints(node);
        for (const a of anchors) {
          const pt = this.worldToScreen(a.x, a.y);
          ctx.fillStyle = 'rgba(74, 144, 217, 0.25)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawMinimap(minimapCtx: CanvasRenderingContext2D, scale: number, offsetX: number, offsetY: number) {
    minimapCtx.strokeStyle = '#888';
    minimapCtx.lineWidth = 1;
    for (const c of this.connectors.values()) {
      const fromNode = this.nodeManager.getNode(c.fromNodeId);
      const toNode = this.nodeManager.getNode(c.toNodeId);
      if (!fromNode || !toNode) continue;

      const fromAnchors = this.nodeManager.getAnchorPoints(fromNode);
      const toAnchors = this.nodeManager.getAnchorPoints(toNode);
      const x1 = fromAnchors[c.fromAnchorIndex].x * scale + offsetX;
      const y1 = fromAnchors[c.fromAnchorIndex].y * scale + offsetY;
      const x2 = toAnchors[c.toAnchorIndex].x * scale + offsetX;
      const y2 = toAnchors[c.toAnchorIndex].y * scale + offsetY;

      minimapCtx.beginPath();
      minimapCtx.moveTo(x1, y1);
      minimapCtx.lineTo(x2, y2);
      minimapCtx.stroke();
    }
  }
}
