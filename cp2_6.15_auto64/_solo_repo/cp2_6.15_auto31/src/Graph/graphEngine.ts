import { TreeNode, GraphNode, GraphEdge, NODE_WIDTH, NODE_HEIGHT } from '../Parser/treeNode';
import { drawNode, drawEdge, isPointInNode } from './nodeRenderer';

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;
const PULSE_DURATION = 200;
const PULSE_MAX_SCALE = 1.15;
const COLLAPSE_FADE_DURATION = 300;
const EXPAND_FADE_DURATION = 500;
const TARGET_FPS = 45;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export class GraphEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];
  private nodePositions: Map<string, { x: number; y: number }> = new Map();
  
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
  private targetScale: number = 1;
  
  private isDraggingCanvas: boolean = false;
  private isDraggingNode: boolean = false;
  private dragNodeId: string | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private hoveredNodeId: string | null = null;
  private targetDropNodeId: string | null = null;
  
  private pulseNodeId: string | null = null;
  private pulseStartTime: number = 0;
  
  private fadingNodes: Map<string, { startOpacity: number; targetOpacity: number; startTime: number; duration: number }> = new Map();
  
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private simulationRunning: boolean = false;
  private simulationIterations: number = 0;
  private maxIterations: number = 200;
  
  private onClickNode: ((nodeId: string) => void) | null = null;
  private onDropNode: ((sourceId: string, targetId: string) => void) | null = null;
  private onLayoutComplete: (() => void) | null = null;
  
  private isMobile: boolean = false;
  private prevCollapsedIds: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    
    this.isMobile = window.innerWidth < 768;
    window.addEventListener('resize', this.handleWindowResize);
    
    this.bindEvents();
  }

  private handleWindowResize = (): void => {
    this.isMobile = window.innerWidth < 768;
  };

  setOnClickNode(callback: (nodeId: string) => void): void {
    this.onClickNode = callback;
  }

  setOnDropNode(callback: (sourceId: string, targetId: string) => void): void {
    this.onDropNode = callback;
  }

  setOnLayoutComplete(callback: () => void): void {
    this.onLayoutComplete = callback;
  }

  setData(roots: TreeNode[]): void {
    this.buildGraph(roots);
    this.initPositions();
    this.startSimulation();
  }

  updateNodeVisibility(collapsedNodes: Set<string>): void {
    const newlyCollapsed: string[] = [];
    const newlyExpanded: string[] = [];
    
    for (const id of collapsedNodes) {
      if (!this.prevCollapsedIds.has(id)) {
        newlyCollapsed.push(id);
      }
    }
    
    for (const id of this.prevCollapsedIds) {
      if (!collapsedNodes.has(id)) {
        newlyExpanded.push(id);
      }
    }
    
    this.prevCollapsedIds = new Set(collapsedNodes);
    
    const collapseDescendants = new Set<string>();
    const expandDescendants = new Set<string>();
    
    for (const id of newlyCollapsed) {
      const node = this.nodes.get(id);
      if (node) {
        this.collectDescendantIds(node, collapseDescendants);
      }
    }
    
    for (const id of newlyExpanded) {
      const node = this.nodes.get(id);
      if (node) {
        this.collectDescendantIds(node, expandDescendants);
      }
    }
    
    for (const [id, node] of this.nodes) {
      let visible = true;
      let parentId = node.parentId;
      
      while (parentId) {
        if (collapsedNodes.has(parentId)) {
          visible = false;
          break;
        }
        const parent = this.nodes.get(parentId);
        parentId = parent?.parentId || null;
      }
      
      if (collapseDescendants.has(id)) {
        this.fadingNodes.set(id, {
          startOpacity: 1,
          targetOpacity: 0,
          startTime: performance.now(),
          duration: COLLAPSE_FADE_DURATION,
        });
        node.visible = false;
      } else if (expandDescendants.has(id)) {
        this.fadingNodes.set(id, {
          startOpacity: 0,
          targetOpacity: 1,
          startTime: performance.now(),
          duration: EXPAND_FADE_DURATION,
        });
        node.visible = true;
        node.opacity = 0;
      } else if (visible && node.opacity === 0) {
        node.visible = true;
        node.opacity = 1;
      } else if (!visible && node.opacity === 1 && !this.fadingNodes.has(id)) {
        node.visible = false;
        node.opacity = 0;
      }
    }
  }

  private collectDescendantIds(node: TreeNode, result: Set<string>): void {
    for (const child of node.children) {
      result.add(child.id);
      this.collectDescendantIds(child, result);
    }
  }

  setScale(scale: number): void {
    this.targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
  }

  getScale(): number {
    return this.scale;
  }

  resetView(): void {
    this.offsetX = 0;
    this.offsetY = 0;
    this.targetScale = 1;
    this.scale = 1;
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private buildGraph(roots: TreeNode[]): void {
    this.nodes.clear();
    this.edges = [];
    
    const traverse = (node: TreeNode): void => {
      const existingPos = this.nodePositions.get(node.id);
      const graphNode: GraphNode = {
        ...node,
        x: existingPos?.x ?? 0,
        y: existingPos?.y ?? 0,
        vx: 0,
        vy: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        visible: true,
        opacity: this.nodePositions.has(node.id) ? 1 : 0,
      };
      
      this.nodes.set(node.id, graphNode);
      
      for (const child of node.children) {
        this.edges.push({ source: node.id, target: child.id });
        traverse(child);
      }
    };
    
    for (const root of roots) {
      traverse(root);
    }
  }

  private initPositions(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;
    
    const nodeArray = Array.from(this.nodes.values());
    
    if (nodeArray.length === 0) return;
    
    if (nodeArray.length === 1) {
      nodeArray[0].x = centerX;
      nodeArray[0].y = centerY;
      if (!this.nodePositions.has(nodeArray[0].id)) {
        nodeArray[0].opacity = 1;
      }
      return;
    }
    
    let needsInit = false;
    for (const node of nodeArray) {
      if (!this.nodePositions.has(node.id)) {
        needsInit = true;
        break;
      }
    }
    
    if (!needsInit) {
      for (const node of nodeArray) {
        const pos = this.nodePositions.get(node.id)!;
        node.x = pos.x;
        node.y = pos.y;
        node.vx = 0;
        node.vy = 0;
      }
      return;
    }
    
    const now = performance.now();
    for (let i = 0; i < nodeArray.length; i++) {
      const node = nodeArray[i];
      if (this.nodePositions.has(node.id)) {
        const pos = this.nodePositions.get(node.id)!;
        node.x = pos.x;
        node.y = pos.y;
        node.opacity = 1;
      } else {
        const angle = (i / nodeArray.length) * Math.PI * 2;
        const radius = 150 + node.level * 80;
        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius;
        node.opacity = 0;
        this.fadingNodes.set(node.id, {
          startOpacity: 0,
          targetOpacity: 1,
          startTime: now + i * 30,
          duration: 500,
        });
      }
      node.vx = 0;
      node.vy = 0;
    }
  }

  private startSimulation(): void {
    this.simulationRunning = true;
    this.simulationIterations = 0;
    const nodeCount = this.nodes.size;
    this.maxIterations = Math.min(300, Math.max(80, nodeCount * 1.5));
  }

  private stepSimulation(): void {
    const repulsionStrength = 5000;
    const attractionStrength = 0.015;
    const centerStrength = 0.008;
    const damping = 0.88;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    const centerX = width / 2;
    const centerY = height / 2;

    const nodeArray = Array.from(this.nodes.values()).filter(n => n.visible || this.fadingNodes.has(n.id));
    
    if (nodeArray.length < 2) {
      this.simulationRunning = false;
      this.savePositions();
      if (this.onLayoutComplete) this.onLayoutComplete();
      return;
    }

    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const n1 = nodeArray[i];
        const n2 = nodeArray[j];
        
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const force = repulsionStrength / (distSq || 1);
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        n1.vx -= fx;
        n1.vy -= fy;
        n2.vx += fx;
        n2.vy += fy;
      }
    }

    for (const edge of this.edges) {
      const source = this.nodes.get(edge.source);
      const target = this.nodes.get(edge.target);
      
      if (!source || !target) continue;
      if (!source.visible && !this.fadingNodes.has(source.id)) continue;
      if (!target.visible && !this.fadingNodes.has(target.id)) continue;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = 140 + target.level * 35;
      const force = (dist - idealDist) * attractionStrength;
      
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    for (const node of nodeArray) {
      if (node.level === 1 || node.parentId === null) {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * centerStrength;
        node.vy += dy * centerStrength;
      }
    }

    for (const node of nodeArray) {
      if (node.id === this.dragNodeId) continue;
      
      node.vx *= damping;
      node.vy *= damping;
      
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > 10) {
        node.vx = (node.vx / speed) * 10;
        node.vy = (node.vy / speed) * 10;
      }
      
      node.x += node.vx;
      node.y += node.vy;
    }

    this.simulationIterations++;
    if (this.simulationIterations >= this.maxIterations) {
      this.simulationRunning = false;
      this.savePositions();
      if (this.onLayoutComplete) {
        this.onLayoutComplete();
      }
    }
  }

  private savePositions(): void {
    this.nodePositions.clear();
    for (const [id, node] of this.nodes) {
      this.nodePositions.set(id, { x: node.x, y: node.y });
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('resize', this.handleWindowResize);
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.offsetX) / this.scale,
      y: (screenY - rect.top - this.offsetY) / this.scale,
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    const world = this.screenToWorld(e.clientX, e.clientY);
    
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    
    const clickedNode = this.findNodeAt(world.x, world.y);
    
    if (clickedNode) {
      this.isDraggingNode = true;
      this.dragNodeId = clickedNode.id;
      this.dragOffsetX = world.x - clickedNode.x;
      this.dragOffsetY = world.y - clickedNode.y;
      this.simulationRunning = false;
    } else {
      this.isDraggingCanvas = true;
      this.canvas.style.cursor = 'grabbing';
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const world = this.screenToWorld(e.clientX, e.clientY);
    
    if (this.isDraggingCanvas) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.offsetX += dx;
      this.offsetY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (this.isDraggingNode && this.dragNodeId) {
      const node = this.nodes.get(this.dragNodeId);
      if (node) {
        node.x = world.x - this.dragOffsetX;
        node.y = world.y - this.dragOffsetY;
      }
      
      const hoveredNode = this.findNodeAt(world.x, world.y);
      if (hoveredNode && hoveredNode.id !== this.dragNodeId) {
        this.targetDropNodeId = hoveredNode.id;
        this.canvas.style.cursor = 'copy';
      } else {
        this.targetDropNodeId = null;
        this.canvas.style.cursor = 'grabbing';
      }
    } else {
      const hoveredNode = this.findNodeAt(world.x, world.y);
      this.hoveredNodeId = hoveredNode ? hoveredNode.id : null;
      this.canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    const isClick = Math.abs(dx) < 5 && Math.abs(dy) < 5;
    
    if (this.isDraggingNode && this.dragNodeId) {
      if (this.targetDropNodeId && this.targetDropNodeId !== this.dragNodeId) {
        if (this.onDropNode) {
          this.onDropNode(this.dragNodeId, this.targetDropNodeId);
        }
        this.pulseNodeId = this.targetDropNodeId;
        this.pulseStartTime = performance.now();
      }
      this.dragNodeId = null;
      this.startSimulation();
    } else if (isClick && this.hoveredNodeId) {
      if (this.onClickNode) {
        this.onClickNode(this.hoveredNodeId);
      }
    }
    
    this.isDraggingCanvas = false;
    this.isDraggingNode = false;
    this.targetDropNodeId = null;
    this.canvas.style.cursor = this.hoveredNodeId ? 'pointer' : 'default';
  };

  private handleMouseLeave = (): void => {
    if (this.isDraggingNode && this.dragNodeId && this.targetDropNodeId) {
      if (this.onDropNode) {
        this.onDropNode(this.dragNodeId, this.targetDropNodeId);
      }
      this.pulseNodeId = this.targetDropNodeId;
      this.pulseStartTime = performance.now();
      this.startSimulation();
    }
    
    this.isDraggingCanvas = false;
    this.isDraggingNode = false;
    this.dragNodeId = null;
    this.targetDropNodeId = null;
    this.hoveredNodeId = null;
    this.canvas.style.cursor = 'default';
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.targetScale * delta));
    
    if (newScale === this.targetScale) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleRatio = newScale / this.scale;
    
    this.offsetX = mouseX - (mouseX - this.offsetX) * scaleRatio;
    this.offsetY = mouseY - (mouseY - this.offsetY) * scaleRatio;
    
    this.targetScale = newScale;
  };

  private findNodeAt(x: number, y: number): GraphNode | null {
    const nodes = Array.from(this.nodes.values()).filter(n => n.visible || this.fadingNodes.has(n.id));
    
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (isPointInNode(nodes[i], x, y)) {
        return nodes[i];
      }
    }
    return null;
  }

  startRenderLoop(): void {
    this.lastFrameTime = performance.now();
    
    const render = (now: number): void => {
      const elapsed = now - this.lastFrameTime;
      
      if (elapsed >= FRAME_INTERVAL) {
        this.lastFrameTime = now - (elapsed % FRAME_INTERVAL);
        this.update(now);
        this.render();
      }
      
      this.animationFrameId = requestAnimationFrame(render);
    };
    
    this.animationFrameId = requestAnimationFrame(render);
  }

  private update(now: number): void {
    if (this.simulationRunning) {
      const stepsPerFrame = Math.min(3, Math.max(1, Math.ceil(this.maxIterations / 60)));
      for (let i = 0; i < stepsPerFrame && this.simulationRunning; i++) {
        this.stepSimulation();
      }
    }
    
    const scaleDiff = this.targetScale - this.scale;
    if (Math.abs(scaleDiff) > 0.001) {
      this.scale += scaleDiff * 0.2;
    }
    
    for (const [id, fadeInfo] of this.fadingNodes) {
      const node = this.nodes.get(id);
      if (!node) {
        this.fadingNodes.delete(id);
        continue;
      }
      
      const rawProgress = (now - fadeInfo.startTime) / fadeInfo.duration;
      if (rawProgress < 0) continue;
      
      const progress = Math.min(1, rawProgress);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.opacity = fadeInfo.startOpacity + (fadeInfo.targetOpacity - fadeInfo.startOpacity) * eased;
      if (node.opacity > 0) node.visible = true;
      
      if (progress >= 1) {
        node.opacity = fadeInfo.targetOpacity;
        if (fadeInfo.targetOpacity <= 0) {
          node.visible = false;
        } else {
          node.visible = true;
        }
        this.fadingNodes.delete(id);
      }
    }
    
    if (this.pulseNodeId) {
      const elapsed = now - this.pulseStartTime;
      if (elapsed > PULSE_DURATION) {
        this.pulseNodeId = null;
      }
    }
  }

  private render(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    
    this.ctx.save();
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);
    
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    
    for (const edge of this.edges) {
      const source = this.nodes.get(edge.source);
      const target = this.nodes.get(edge.target);
      
      if (!source || !target) continue;
      
      const sourceOpacity = source.visible ? source.opacity : 0;
      const targetOpacity = target.visible ? target.opacity : 0;
      const opacity = Math.min(sourceOpacity, targetOpacity);
      
      if (opacity <= 0 && !this.fadingNodes.has(source.id) && !this.fadingNodes.has(target.id)) continue;
      
      drawEdge(this.ctx, source.x, source.y, target.x, target.y, opacity);
    }
    
    const fontSize = this.isMobile ? 10 : 14;
    
    for (const [id, node] of this.nodes) {
      if (id === this.dragNodeId) continue;
      if (node.opacity <= 0 && !this.fadingNodes.has(id)) continue;
      
      const isHovered = id === this.hoveredNodeId || id === this.targetDropNodeId;
      
      let pulseScale = 1;
      if (this.pulseNodeId === id) {
        const elapsed = performance.now() - this.pulseStartTime;
        const progress = Math.min(1, elapsed / PULSE_DURATION);
        const pulseProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        pulseScale = 1 + pulseProgress * (PULSE_MAX_SCALE - 1);
      }
      
      drawNode(this.ctx, node, {
        hovered: isHovered,
        pulseScale,
        fontSize,
      });
    }
    
    if (this.dragNodeId) {
      const dragNode = this.nodes.get(this.dragNodeId);
      if (dragNode) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.6;
        drawNode(this.ctx, dragNode, { fontSize });
        this.ctx.restore();
      }
    }
    
    this.ctx.restore();
  }

  exportPNG(): string {
    return this.canvas.toDataURL('image/png');
  }

  getNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }
}
