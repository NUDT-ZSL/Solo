import { TreeNode, GraphNode, GraphEdge, NODE_WIDTH, NODE_HEIGHT } from '../Parser/treeNode';
import { drawNode, drawEdge, isPointInNode } from './nodeRenderer';

interface ForceSimulationOptions {
  repulsionStrength?: number;
  attractionStrength?: number;
  centerStrength?: number;
  damping?: number;
  iterations?: number;
}

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
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private hoveredNodeId: string | null = null;
  private targetNodeId: string | null = null;
  
  private pulseNodeId: string | null = null;
  private pulseStartTime: number = 0;
  private readonly PULSE_DURATION: number = 200;
  
  private animationFrameId: number | null = null;
  private simulationRunning: boolean = false;
  private simulationIterations: number = 0;
  private maxIterations: number = 200;
  
  private onClickNode: ((nodeId: string) => void) | null = null;
  private onDropNode: ((sourceId: string, targetId: string) => void) | null = null;
  private onLayoutComplete: (() => void) | null = null;
  
  private isMobile: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    
    this.isMobile = window.innerWidth < 768;
    
    this.bindEvents();
  }

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
      
      const wasVisible = node.visible;
      node.visible = visible;
      
      if (!wasVisible && visible) {
        node.opacity = 0;
      } else if (wasVisible && !visible) {
        node.opacity = 1;
      }
    }
  }

  setScale(scale: number): void {
    this.targetScale = Math.max(0.5, Math.min(2, scale));
  }

  getScale(): number {
    return this.scale;
  }

  setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  resetView(): void {
    this.offsetX = 0;
    this.offsetY = 0;
    this.targetScale = 1;
    this.scale = 1;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  private buildGraph(roots: TreeNode[]): void {
    this.nodes.clear();
    this.edges = [];
    
    const traverse = (node: TreeNode): void => {
      const graphNode: GraphNode = {
        ...node,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        visible: true,
        opacity: 1,
      };
      
      if (this.nodePositions.has(node.id)) {
        const pos = this.nodePositions.get(node.id)!;
        graphNode.x = pos.x;
        graphNode.y = pos.y;
      }
      
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
    const centerX = this.canvas.width / window.devicePixelRatio / 2;
    const centerY = this.canvas.height / window.devicePixelRatio / 2;
    
    const nodeArray = Array.from(this.nodes.values());
    
    if (nodeArray.length === 0) return;
    
    if (nodeArray.length === 1) {
      nodeArray[0].x = centerX;
      nodeArray[0].y = centerY;
      return;
    }
    
    for (let i = 0; i < nodeArray.length; i++) {
      if (!this.nodePositions.has(nodeArray[i].id)) {
        const angle = (i / nodeArray.length) * Math.PI * 2;
        const radius = 150 + nodeArray[i].level * 80;
        nodeArray[i].x = centerX + Math.cos(angle) * radius;
        nodeArray[i].y = centerY + Math.sin(angle) * radius;
      }
      nodeArray[i].vx = 0;
      nodeArray[i].vy = 0;
    }
  }

  private startSimulation(): void {
    this.simulationRunning = true;
    this.simulationIterations = 0;
    this.maxIterations = Math.min(300, Math.max(100, this.nodes.size * 2));
  }

  private stepSimulation(options: ForceSimulationOptions = {}): void {
    const {
      repulsionStrength = 5000,
      attractionStrength = 0.01,
      centerStrength = 0.005,
      damping = 0.9,
    } = options;

    const centerX = this.canvas.width / window.devicePixelRatio / 2;
    const centerY = this.canvas.height / window.devicePixelRatio / 2;

    const nodeArray = Array.from(this.nodes.values()).filter(n => n.visible);

    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const n1 = nodeArray[i];
        const n2 = nodeArray[j];
        
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionStrength / (dist * dist);
        
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
      
      if (!source || !target || !source.visible || !target.visible) continue;
      
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = 120 + target.level * 30;
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
    this.canvas.addEventListener('wheel', this.handleWheel);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.offsetX) / this.scale;
    const y = (e.clientY - rect.top - this.offsetY) / this.scale;
    
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    
    const clickedNode = this.findNodeAt(x, y);
    
    if (clickedNode) {
      this.isDraggingNode = true;
      this.dragNodeId = clickedNode.id;
      this.simulationRunning = false;
    } else {
      this.isDraggingCanvas = true;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.offsetX) / this.scale;
    const y = (e.clientY - rect.top - this.offsetY) / this.scale;
    
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
        node.x = x;
        node.y = y;
      }
      
      const hoveredNode = this.findNodeAt(x, y);
      if (hoveredNode && hoveredNode.id !== this.dragNodeId) {
        this.targetNodeId = hoveredNode.id;
        this.canvas.style.cursor = 'copy';
      } else {
        this.targetNodeId = null;
        this.canvas.style.cursor = 'grabbing';
      }
    } else {
      const hoveredNode = this.findNodeAt(x, y);
      this.hoveredNodeId = hoveredNode ? hoveredNode.id : null;
      this.canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    const isClick = Math.abs(dx) < 5 && Math.abs(dy) < 5;
    
    if (this.isDraggingNode && this.dragNodeId) {
      if (this.targetNodeId && this.targetNodeId !== this.dragNodeId) {
        if (this.onDropNode) {
          this.onDropNode(this.dragNodeId, this.targetNodeId);
        }
        this.pulseNodeId = this.targetNodeId;
        this.pulseStartTime = performance.now();
      }
      this.dragNodeId = null;
    } else if (isClick && this.hoveredNodeId) {
      if (this.onClickNode) {
        this.onClickNode(this.hoveredNodeId);
      }
    }
    
    this.isDraggingCanvas = false;
    this.isDraggingNode = false;
    this.targetNodeId = null;
    this.canvas.style.cursor = this.hoveredNodeId ? 'pointer' : 'default';
  };

  private handleMouseLeave = (): void => {
    if (this.isDraggingNode && this.dragNodeId && this.targetNodeId) {
      if (this.onDropNode) {
        this.onDropNode(this.dragNodeId, this.targetNodeId);
      }
    }
    
    this.isDraggingCanvas = false;
    this.isDraggingNode = false;
    this.dragNodeId = null;
    this.targetNodeId = null;
    this.hoveredNodeId = null;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(2, this.targetScale * delta));
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const scaleRatio = newScale / this.scale;
    
    this.offsetX = mouseX - (mouseX - this.offsetX) * scaleRatio;
    this.offsetY = mouseY - (mouseY - this.offsetY) * scaleRatio;
    
    this.targetScale = newScale;
  };

  private findNodeAt(x: number, y: number): GraphNode | null {
    const nodes = Array.from(this.nodes.values()).filter(n => n.visible);
    
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (isPointInNode(nodes[i], x, y)) {
        return nodes[i];
      }
    }
    return null;
  }

  startRenderLoop(): void {
    const render = (): void => {
      this.update();
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  private update(): void {
    if (this.simulationRunning) {
      this.stepSimulation();
    }
    
    const scaleDiff = this.targetScale - this.scale;
    if (Math.abs(scaleDiff) > 0.001) {
      this.scale += scaleDiff * 0.15;
    }
    
    const fadeSpeed = 0.08;
    for (const node of this.nodes.values()) {
      if (node.visible && node.opacity < 1) {
        node.opacity = Math.min(1, node.opacity + fadeSpeed);
      } else if (!node.visible && node.opacity > 0) {
        node.opacity = Math.max(0, node.opacity - fadeSpeed * 1.5);
      }
    }
    
    if (this.pulseNodeId) {
      const elapsed = performance.now() - this.pulseStartTime;
      if (elapsed > this.PULSE_DURATION) {
        this.pulseNodeId = null;
      }
    }
  }

  private render(): void {
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    
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
      if (!source.visible || !target.visible) continue;
      
      const opacity = Math.min(source.opacity, target.opacity);
      drawEdge(this.ctx, source.x, source.y, target.x, target.y, opacity);
    }
    
    const fontSize = this.isMobile ? 10 : 14;
    
    for (const node of this.nodes.values()) {
      if (node.id === this.dragNodeId) continue;
      
      const isHovered = node.id === this.hoveredNodeId || node.id === this.targetNodeId;
      
      let pulseScale = 1;
      if (this.pulseNodeId === node.id) {
        const elapsed = performance.now() - this.pulseStartTime;
        const progress = Math.min(1, elapsed / this.PULSE_DURATION);
        const pulseProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        pulseScale = 1 + pulseProgress * 0.15;
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
