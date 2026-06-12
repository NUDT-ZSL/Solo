import {
  Point,
  FlowNode,
  Connection,
  FlowchartData,
  AnchorState,
  MorphAnimation,
  NodeType,
  BoundingBox,
  SHAPE_COLORS,
  ARROW_COLOR,
  SELECTED_COLOR,
  ANCHOR_ATTACHED_COLOR,
  ANCHOR_DEFAULT_COLOR,
  MORPH_DURATION,
  ANCHOR_PULSE_DURATION,
  generateId,
  generateConnectionId,
} from '../types';
import {
  recognize,
  generateStandardPath,
  interpolatePaths,
  easeOutCubic,
} from '../shapeRecognition/ShapeRecognizer';

type DataChangeCallback = (data: FlowchartData) => void;

export class CanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private data: FlowchartData;
  private morphAnimations: MorphAnimation[] = [];
  private anchorStates: AnchorState[] = [];
  private currentPath: Point[] = [];
  private isDrawing = false;
  private isDragging = false;
  private dragNodeId: string | null = null;
  private dragOffset: Point = { x: 0, y: 0 };
  private selectedNodeId: string | null = null;
  private selectedConnectionId: string | null = null;
  private hoveredNodeId: string | null = null;
  private animFrameId: number = 0;
  private dashOffset = 0;
  private pulseAnchors: { point: Point; startTime: number }[] = [];
  private onDataChange: DataChangeCallback | null = null;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private dpr = 1;

  constructor(initialData: FlowchartData) {
    this.data = { ...initialData };
  }

  init(canvas: HTMLCanvasElement, onChange: DataChangeCallback) {
    this.canvas = canvas;
    this.onDataChange = onChange;
    this.dpr = window.devicePixelRatio || 1;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.bindEvents();
    this.startRenderLoop();
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.unbindEvents();
  }

  private resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx!.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setData(data: FlowchartData) {
    this.data = { ...data };
  }

  getData(): FlowchartData {
    return { ...this.data };
  }

  setSelectedNodeId(id: string | null) {
    this.selectedNodeId = id;
  }

  setSelectedConnectionId(id: string | null) {
    this.selectedConnectionId = id;
  }

  private bindEvents() {
    if (!this.canvas) return;
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    window.addEventListener('resize', this.onResize);
  }

  private unbindEvents() {
    if (!this.canvas) return;
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.resize();
  };

  private getCanvasPos(e: MouseEvent): Point {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onMouseDown = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e);
    const hitNode = this.hitTestNode(pos);
    const hitConn = this.hitTestConnection(pos);

    if (hitNode) {
      this.selectedNodeId = hitNode.id;
      this.selectedConnectionId = null;
      this.isDragging = true;
      this.dragNodeId = hitNode.id;
      this.dragOffset = {
        x: pos.x - hitNode.position.x,
        y: pos.y - hitNode.position.y,
      };
    } else if (hitConn) {
      this.selectedConnectionId = hitConn.id;
      this.selectedNodeId = null;
    } else {
      this.selectedNodeId = null;
      this.selectedConnectionId = null;
      this.isDrawing = true;
      this.currentPath = [pos];
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    const pos = this.getCanvasPos(e);

    if (this.isDrawing) {
      this.currentPath.push(pos);
    } else if (this.isDragging && this.dragNodeId) {
      const node = this.data.nodes.find(n => n.id === this.dragNodeId);
      if (node) {
        node.position.x = pos.x - this.dragOffset.x;
        node.position.y = pos.y - this.dragOffset.y;
        this.updateConnectionsForNode(node.id);
        this.emitChange();
      }
    } else {
      const hitNode = this.hitTestNode(pos);
      this.hoveredNodeId = hitNode ? hitNode.id : null;
    }
  };

  private onMouseUp = (_e: MouseEvent) => {
    if (this.isDrawing && this.currentPath.length > 3) {
      const result = recognize(this.currentPath);
      this.processRecognitionResult(result, this.currentPath);
    }

    this.isDrawing = false;
    this.isDragging = false;
    this.dragNodeId = null;
    this.currentPath = [];
  };

  private processRecognitionResult(result: import('../types').RecognitionResult, path: Point[]) {
    if (result.type === 'node' && result.nodeType) {
      this.addNode(result, path);
    } else if (result.type === 'connection') {
      this.addConnection(result, path);
    }
  }

  private addNode(result: import('../types').RecognitionResult, path: Point[]) {
    const nodeType = result.nodeType!;
    const pos = result.position || this.computeCenter(path);
    const size = result.size || { width: 80, height: 50 };

    const node: FlowNode = {
      id: generateId(),
      type: nodeType,
      position: pos,
      size,
      label: '',
      connections: [],
      cornerRadius: result.cornerRadius,
      originalPath: [...path],
      morphProgress: 0,
      createdAt: Date.now(),
      isNew: true,
    };

    this.data.nodes.push(node);

    const standardPath = generateStandardPath(nodeType, pos, size, result.cornerRadius);
    this.morphAnimations.push({
      nodeId: node.id,
      startTime: performance.now(),
      duration: MORPH_DURATION,
      fromPath: [...path],
      toPath: standardPath,
      progress: 0,
    });

    setTimeout(() => { node.isNew = false; }, 50);
    this.emitChange();
  }

  private addConnection(result: import('../types').RecognitionResult, path: Point[]) {
    const sourceAnchor = result.sourceAnchor || path[0];
    const targetAnchor = result.targetAnchor || path[path.length - 1];

    let sourceNodeId: string | null = null;
    let targetNodeId: string | null = null;
    let attachedSource: Point = { ...sourceAnchor };
    let attachedTarget: Point = { ...targetAnchor };

    const sourceHit = this.findNearestAnchor(sourceAnchor);
    if (sourceHit) {
      sourceNodeId = sourceHit.nodeId;
      attachedSource = sourceHit.point;
      this.pulseAnchors.push({ point: sourceHit.point, startTime: performance.now() });
    }

    const targetHit = this.findNearestAnchor(targetAnchor);
    if (targetHit) {
      targetNodeId = targetHit.nodeId;
      attachedTarget = targetHit.point;
      this.pulseAnchors.push({ point: targetHit.point, startTime: performance.now() });
    }

    const controlPoints = this.computeBezierControlPoints(attachedSource, attachedTarget);

    const conn: Connection = {
      id: generateConnectionId(),
      sourceNodeId,
      targetNodeId,
      sourceAnchor: attachedSource,
      targetAnchor: attachedTarget,
      controlPoints,
      isBezier: true,
      originalPath: [...path],
      createdAt: Date.now(),
      isNew: true,
    };

    this.data.connections.push(conn);

    if (sourceNodeId) {
      const sn = this.data.nodes.find(n => n.id === sourceNodeId);
      if (sn && !sn.connections.includes(conn.id)) sn.connections.push(conn.id);
    }
    if (targetNodeId) {
      const tn = this.data.nodes.find(n => n.id === targetNodeId);
      if (tn && !tn.connections.includes(conn.id)) tn.connections.push(conn.id);
    }

    setTimeout(() => { conn.isNew = false; }, 50);
    this.emitChange();
  }

  deleteSelected() {
    if (this.selectedNodeId) {
      this.data.connections = this.data.connections.filter(
        c => c.sourceNodeId !== this.selectedNodeId && c.targetNodeId !== this.selectedNodeId
      );
      this.data.nodes = this.data.nodes.filter(n => n.id !== this.selectedNodeId);
      this.selectedNodeId = null;
      this.emitChange();
    } else if (this.selectedConnectionId) {
      const conn = this.data.connections.find(c => c.id === this.selectedConnectionId);
      if (conn) {
        this.data.nodes.forEach(n => {
          n.connections = n.connections.filter(cid => cid !== conn.id);
        });
      }
      this.data.connections = this.data.connections.filter(c => c.id !== this.selectedConnectionId);
      this.selectedConnectionId = null;
      this.emitChange();
    }
  }

  private findNearestAnchor(point: Point): { point: Point; nodeId: string } | null {
    let nearest: { point: Point; nodeId: string; dist: number } | null = null;
    const SNAP_DISTANCE = 25;

    for (const node of this.data.nodes) {
      const anchors = this.getNodeAnchors(node);
      for (const anchor of anchors) {
        const dist = Math.sqrt((point.x - anchor.x) ** 2 + (point.y - anchor.y) ** 2);
        if (dist < SNAP_DISTANCE && (!nearest || dist < nearest.dist)) {
          nearest = { point: anchor, nodeId: node.id, dist };
        }
      }
    }

    return nearest ? { point: nearest.point, nodeId: nearest.nodeId } : null;
  }

  private getNodeAnchors(node: FlowNode): Point[] {
    const { position, size, type } = node;
    const hw = size.width / 2;
    const hh = size.height / 2;

    switch (type) {
      case 'rectangle':
      case 'rounded-rectangle':
        return [
          { x: position.x, y: position.y - hh },
          { x: position.x + hw, y: position.y },
          { x: position.x, y: position.y + hh },
          { x: position.x - hw, y: position.y },
        ];
      case 'diamond':
        return [
          { x: position.x, y: position.y - hh },
          { x: position.x + hw, y: position.y },
          { x: position.x, y: position.y + hh },
          { x: position.x - hw, y: position.y },
        ];
    }
  }

  private computeBezierControlPoints(start: Point, end: Point): Point[] {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(dist * 0.3, 80);

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    let cp1: Point, cp2: Point;

    if (Math.abs(dx) > Math.abs(dy)) {
      cp1 = { x: midX, y: start.y };
      cp2 = { x: midX, y: end.y };
    } else {
      cp1 = { x: start.x, y: midY };
      cp2 = { x: end.x, y: midY };
    }

    const needsAvoidance = this.checkPathOverlap(start, end, cp1, cp2);
    if (needsAvoidance) {
      const perpX = -dy / dist;
      const perpY = dx / dist;
      cp1 = { x: cp1.x + perpX * offset, y: cp1.y + perpY * offset };
      cp2 = { x: cp2.x + perpX * offset, y: cp2.y + perpY * offset };
    }

    return [cp1, cp2];
  }

  private checkPathOverlap(start: Point, end: Point, cp1: Point, cp2: Point): boolean {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = this.bezierPoint(start, cp1, cp2, end, t);
      for (const node of this.data.nodes) {
        if (this.pointInNodeBox(pt, node)) return true;
      }
    }
    return false;
  }

  private bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
    };
  }

  private pointInNodeBox(pt: Point, node: FlowNode): boolean {
    const hw = node.size.width / 2 + 10;
    const hh = node.size.height / 2 + 10;
    return (
      pt.x > node.position.x - hw &&
      pt.x < node.position.x + hw &&
      pt.y > node.position.y - hh &&
      pt.y < node.position.y + hh
    );
  }

  private hitTestNode(pos: Point): FlowNode | null {
    for (let i = this.data.nodes.length - 1; i >= 0; i--) {
      const node = this.data.nodes[i];
      if (this.isPointInNode(pos, node)) return node;
    }
    return null;
  }

  private isPointInNode(pt: Point, node: FlowNode): boolean {
    const hw = node.size.width / 2;
    const hh = node.size.height / 2;

    if (node.type === 'diamond') {
      const dx = Math.abs(pt.x - node.position.x) / hw;
      const dy = Math.abs(pt.y - node.position.y) / hh;
      return dx + dy <= 1.1;
    }

    return (
      pt.x >= node.position.x - hw &&
      pt.x <= node.position.x + hw &&
      pt.y >= node.position.y - hh &&
      pt.y <= node.position.y + hh
    );
  }

  private hitTestConnection(pos: Point): Connection | null {
    for (let i = this.data.connections.length - 1; i >= 0; i--) {
      const conn = this.data.connections[i];
      if (this.isPointNearConnection(pos, conn)) return conn;
    }
    return null;
  }

  private isPointNearConnection(pt: Point, conn: Connection): boolean {
    const threshold = 8;
    if (conn.controlPoints.length >= 2) {
      const steps = 30;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const bp = this.bezierPoint(
          conn.sourceAnchor,
          conn.controlPoints[0],
          conn.controlPoints[1],
          conn.targetAnchor,
          t
        );
        const dist = Math.sqrt((pt.x - bp.x) ** 2 + (pt.y - bp.y) ** 2);
        if (dist < threshold) return true;
      }
    }
    const dist = Math.sqrt(
      (pt.x - conn.sourceAnchor.x) ** 2 + (pt.y - conn.sourceAnchor.y) ** 2
    );
    if (dist < threshold) return true;
    const dist2 = Math.sqrt(
      (pt.x - conn.targetAnchor.x) ** 2 + (pt.y - conn.targetAnchor.y) ** 2
    );
    return dist2 < threshold;
  }

  private updateConnectionsForNode(nodeId: string) {
    for (const conn of this.data.connections) {
      if (conn.sourceNodeId === nodeId) {
        const node = this.data.nodes.find(n => n.id === nodeId);
        if (node) {
          const anchors = this.getNodeAnchors(node);
          const nearest = this.findClosestAnchor(conn.targetAnchor, anchors);
          conn.sourceAnchor = nearest;
          conn.controlPoints = this.computeBezierControlPoints(conn.sourceAnchor, conn.targetAnchor);
        }
      }
      if (conn.targetNodeId === nodeId) {
        const node = this.data.nodes.find(n => n.id === nodeId);
        if (node) {
          const anchors = this.getNodeAnchors(node);
          const nearest = this.findClosestAnchor(conn.sourceAnchor, anchors);
          conn.targetAnchor = nearest;
          conn.controlPoints = this.computeBezierControlPoints(conn.sourceAnchor, conn.targetAnchor);
        }
      }
    }
  }

  private findClosestAnchor(target: Point, anchors: Point[]): Point {
    let closest = anchors[0];
    let minDist = Infinity;
    for (const a of anchors) {
      const d = Math.sqrt((a.x - target.x) ** 2 + (a.y - target.y) ** 2);
      if (d < minDist) { minDist = d; closest = a; }
    }
    return closest;
  }

  private computeCenter(points: Point[]): Point {
    let sx = 0, sy = 0;
    for (const p of points) { sx += p.x; sy += p.y; }
    return { x: sx / points.length, y: sy / points.length };
  }

  private emitChange() {
    if (this.onDataChange) {
      this.onDataChange({ ...this.data });
    }
  }

  private startRenderLoop() {
    const loop = () => {
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    ctx.clearRect(0, 0, w, h);
    this.drawGrid(ctx, w, h);
    this.updateMorphAnimations();
    this.renderConnections(ctx);
    this.renderNodes(ctx);
    this.renderAnchorPulses(ctx);
    this.renderCurrentDrawing(ctx);
    this.dashOffset = (this.dashOffset + 0.5) % 20;
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gap = 20;
    for (let x = 0; x < w; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = 0; x < w; x += gap) {
      for (let y = 0; y < h; y += gap) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private updateMorphAnimations() {
    const now = performance.now();
    this.morphAnimations = this.morphAnimations.filter(anim => {
      const elapsed = now - anim.startTime;
      const rawT = Math.min(elapsed / anim.duration, 1);
      anim.progress = easeOutCubic(rawT);

      const node = this.data.nodes.find(n => n.id === anim.nodeId);
      if (node) {
        node.morphProgress = anim.progress;
      }

      return rawT < 1;
    });
  }

  private renderNodes(ctx: CanvasRenderingContext2D) {
    for (const node of this.data.nodes) {
      const morphAnim = this.morphAnimations.find(a => a.nodeId === node.id);
      const isSelected = node.id === this.selectedNodeId;
      const isHovered = node.id === this.hoveredNodeId;
      const colors = SHAPE_COLORS[node.type];

      ctx.save();

      if (morphAnim && morphAnim.progress < 1) {
        const interpolated = interpolatePaths(
          morphAnim.fromPath,
          morphAnim.toPath,
          morphAnim.progress
        );
        this.drawInterpolatedShape(ctx, interpolated, node, colors, isSelected, isHovered);
      } else {
        this.drawStandardShape(ctx, node, colors, isSelected, isHovered);
      }

      ctx.restore();
    }
  }

  private drawInterpolatedShape(
    ctx: CanvasRenderingContext2D,
    points: Point[],
    node: FlowNode,
    colors: { fill: string; border: string },
    isSelected: boolean,
    isHovered: boolean
  ) {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = colors.fill + 'cc';
    ctx.fill();

    ctx.strokeStyle = isSelected ? SELECTED_COLOR : colors.border;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    if (isSelected) {
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -this.dashOffset;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawStandardShape(
    ctx: CanvasRenderingContext2D,
    node: FlowNode,
    colors: { fill: string; border: string },
    isSelected: boolean,
    isHovered: boolean
  ) {
    const { position, size, type } = node;
    const hw = size.width / 2;
    const hh = size.height / 2;

    ctx.beginPath();
    switch (type) {
      case 'rectangle':
        ctx.rect(position.x - hw, position.y - hh, size.width, size.height);
        break;
      case 'diamond':
        ctx.moveTo(position.x, position.y - hh);
        ctx.lineTo(position.x + hw, position.y);
        ctx.lineTo(position.x, position.y + hh);
        ctx.lineTo(position.x - hw, position.y);
        ctx.closePath();
        break;
      case 'rounded-rectangle': {
        const r = node.cornerRadius || Math.min(hw, hh) * 0.3;
        ctx.roundRect(position.x - hw, position.y - hh, size.width, size.height, r);
        break;
      }
    }

    if (isHovered && !isSelected) {
      ctx.fillStyle = colors.fill + 'dd';
    } else {
      ctx.fillStyle = colors.fill + 'cc';
    }
    ctx.fill();

    ctx.strokeStyle = isSelected ? SELECTED_COLOR : colors.border;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    if (isSelected) {
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -this.dashOffset;
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (node.label) {
      ctx.fillStyle = '#1e1e2e';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, position.x, position.y);
    }

    if (isSelected) {
      this.drawNodeAnchors(ctx, node);
    }
  }

  private drawNodeAnchors(ctx: CanvasRenderingContext2D, node: FlowNode) {
    const anchors = this.getNodeAnchors(node);
    for (const anchor of anchors) {
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = ANCHOR_DEFAULT_COLOR;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private renderConnections(ctx: CanvasRenderingContext2D) {
    for (const conn of this.data.connections) {
      const isSelected = conn.id === this.selectedConnectionId;

      ctx.save();
      ctx.strokeStyle = isSelected ? SELECTED_COLOR : ARROW_COLOR;
      ctx.lineWidth = isSelected ? 2.5 : 2;

      if (isSelected) {
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -this.dashOffset;
      }

      if (conn.controlPoints.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(conn.sourceAnchor.x, conn.sourceAnchor.y);
        ctx.bezierCurveTo(
          conn.controlPoints[0].x, conn.controlPoints[0].y,
          conn.controlPoints[1].x, conn.controlPoints[1].y,
          conn.targetAnchor.x, conn.targetAnchor.y
        );
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(conn.sourceAnchor.x, conn.sourceAnchor.y);
        ctx.lineTo(conn.targetAnchor.x, conn.targetAnchor.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      this.drawArrowHead(ctx, conn);

      if (conn.sourceNodeId) {
        this.drawAnchorDot(ctx, conn.sourceAnchor, conn.sourceNodeId != null);
      }
      if (conn.targetNodeId) {
        this.drawAnchorDot(ctx, conn.targetAnchor, conn.targetNodeId != null);
      }

      ctx.restore();
    }
  }

  private drawArrowHead(ctx: CanvasRenderingContext2D, conn: Connection) {
    const end = conn.targetAnchor;
    let angle: number;

    if (conn.controlPoints.length >= 2) {
      const cp = conn.controlPoints[conn.controlPoints.length - 1];
      angle = Math.atan2(end.y - cp.y, end.x - cp.x);
    } else {
      angle = Math.atan2(end.y - conn.sourceAnchor.y, end.x - conn.sourceAnchor.x);
    }

    const headLen = 12;
    const headAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle - headAngle),
      end.y - headLen * Math.sin(angle - headAngle)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLen * Math.cos(angle + headAngle),
      end.y - headLen * Math.sin(angle + headAngle)
    );
    ctx.strokeStyle = conn.id === this.selectedConnectionId ? SELECTED_COLOR : ARROW_COLOR;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawAnchorDot(ctx: CanvasRenderingContext2D, point: Point, isAttached: boolean) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = isAttached ? ANCHOR_ATTACHED_COLOR : ANCHOR_DEFAULT_COLOR;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private renderAnchorPulses(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    this.pulseAnchors = this.pulseAnchors.filter(p => {
      const elapsed = now - p.startTime;
      if (elapsed > ANCHOR_PULSE_DURATION) return false;

      const t = elapsed / ANCHOR_PULSE_DURATION;
      const scale = 1 + 0.5 * Math.sin(t * Math.PI);
      const alpha = 1 - t;

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.point.x, p.point.y, 6 * scale, 0, Math.PI * 2);
      ctx.fillStyle = ANCHOR_ATTACHED_COLOR + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
      ctx.restore();

      return true;
    });
  }

  private renderCurrentDrawing(ctx: CanvasRenderingContext2D) {
    if (this.currentPath.length < 2) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
    for (let i = 1; i < this.currentPath.length; i++) {
      ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  getNodeAt(pos: Point): FlowNode | null {
    return this.hitTestNode(pos);
  }

  getConnectionAt(pos: Point): Connection | null {
    return this.hitTestConnection(pos);
  }

  updateNodeLabel(nodeId: string, label: string) {
    const node = this.data.nodes.find(n => n.id === nodeId);
    if (node) {
      node.label = label;
      this.emitChange();
    }
  }

  handleResize() {
    this.resize();
  }
}
