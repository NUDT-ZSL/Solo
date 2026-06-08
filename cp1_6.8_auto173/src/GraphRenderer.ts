import type { GraphNode, GraphEdge, GraphData, StarParticle, RippleEffect, PosType } from './types';

export default class GraphRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  graphData: GraphData | null;
  particles: StarParticle[];
  ripples: RippleEffect[];
  camera: { x: number; y: number; zoom: number };
  dragging: { active: boolean; nodeId: string | null; startX: number; startY: number; offsetX: number; offsetY: number };
  hoveredNode: GraphNode | null;
  selectedNode: GraphNode | null;
  animationFrameId: number;
  onNodeClick: ((node: GraphNode) => void) | null;
  nodePositions: Map<string, { x: number; y: number }>;

  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onWheel: (e: WheelEvent) => void;
  private _onTouchStart: (e: TouchEvent) => void;
  private _onTouchMove: (e: TouchEvent) => void;
  private _onTouchEnd: (e: TouchEvent) => void;
  private _onClick: (e: MouseEvent) => void;
  private _didDrag: boolean;
  private _lastTouchDist: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.graphData = null;
    this.particles = [];
    this.ripples = [];
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.dragging = { active: false, nodeId: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0 };
    this.hoveredNode = null;
    this.selectedNode = null;
    this.animationFrameId = 0;
    this.onNodeClick = null;
    this.nodePositions = new Map();
    this._didDrag = false;
    this._lastTouchDist = 0;

    this._onMouseDown = this.handleMouseDown.bind(this);
    this._onMouseMove = this.handleMouseMove.bind(this);
    this._onMouseUp = this.handleMouseUp.bind(this);
    this._onWheel = this.handleWheel.bind(this);
    this._onTouchStart = this.handleTouchStart.bind(this);
    this._onTouchMove = this.handleTouchMove.bind(this);
    this._onTouchEnd = this.handleTouchEnd.bind(this);
    this._onClick = this.handleClick.bind(this);

    this.initParticles();
    this.initEvents();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 200; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.1 + Math.random() * 0.5,
        speed: 0.05 + Math.random() * 0.25,
        angle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  initEvents() {
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
    this.canvas.addEventListener('click', this._onClick);
  }

  private handleMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = this.hitTest(sx, sy);
    this._didDrag = false;
    if (node) {
      const pos = this.worldToScreen(node.x, node.y);
      this.dragging = {
        active: true,
        nodeId: node.id,
        startX: sx,
        startY: sy,
        offsetX: sx - pos.x,
        offsetY: sy - pos.y,
      };
    } else {
      this.dragging = {
        active: true,
        nodeId: null,
        startX: sx,
        startY: sy,
        offsetX: this.camera.x,
        offsetY: this.camera.y,
      };
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (this.dragging.active) {
      this._didDrag = true;
      if (this.dragging.nodeId) {
        const world = this.screenToWorld(sx - this.dragging.offsetX, sy - this.dragging.offsetY);
        const node = this.graphData?.nodes.find(n => n.id === this.dragging.nodeId);
        if (node) {
          node.x = world.x;
          node.y = world.y;
        }
      } else {
        const dx = (sx - this.dragging.startX) / this.camera.zoom;
        const dy = (sy - this.dragging.startY) / this.camera.zoom;
        this.camera.x = this.dragging.offsetX - dx;
        this.camera.y = this.dragging.offsetY - dy;
      }
    } else {
      const node = this.hitTest(sx, sy);
      this.hoveredNode = node;
      this.canvas.style.cursor = node ? 'pointer' : 'default';
    }
  }

  private handleMouseUp() {
    this.dragging.active = false;
    this.dragging.nodeId = null;
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldBefore = this.screenToWorld(sx, sy);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.camera.zoom = Math.max(0.3, Math.min(3, this.camera.zoom + delta));
    const worldAfter = this.screenToWorld(sx, sy);
    this.camera.x += worldBefore.x - worldAfter.x;
    this.camera.y += worldBefore.y - worldAfter.y;
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const sx = touch.clientX - rect.left;
      const sy = touch.clientY - rect.top;
      const node = this.hitTest(sx, sy);
      this._didDrag = false;
      if (node) {
        const pos = this.worldToScreen(node.x, node.y);
        this.dragging = {
          active: true,
          nodeId: node.id,
          startX: sx,
          startY: sy,
          offsetX: sx - pos.x,
          offsetY: sy - pos.y,
        };
      } else {
        this.dragging = {
          active: true,
          nodeId: null,
          startX: sx,
          startY: sy,
          offsetX: this.camera.x,
          offsetY: this.camera.y,
        };
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this._lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1 && this.dragging.active) {
      this._didDrag = true;
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const sx = touch.clientX - rect.left;
      const sy = touch.clientY - rect.top;
      if (this.dragging.nodeId) {
        const world = this.screenToWorld(sx - this.dragging.offsetX, sy - this.dragging.offsetY);
        const node = this.graphData?.nodes.find(n => n.id === this.dragging.nodeId);
        if (node) {
          node.x = world.x;
          node.y = world.y;
        }
      } else {
        const dx = (sx - this.dragging.startX) / this.camera.zoom;
        const dy = (sy - this.dragging.startY) / this.camera.zoom;
        this.camera.x = this.dragging.offsetX - dx;
        this.camera.y = this.dragging.offsetY - dy;
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (this._lastTouchDist > 0) {
        const scale = dist / this._lastTouchDist;
        const newZoom = Math.max(0.3, Math.min(3, this.camera.zoom * scale));
        const rect = this.canvas.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const worldBefore = this.screenToWorld(cx, cy);
        this.camera.zoom = newZoom;
        const worldAfter = this.screenToWorld(cx, cy);
        this.camera.x += worldBefore.x - worldAfter.x;
        this.camera.y += worldBefore.y - worldAfter.y;
      }
      this._lastTouchDist = dist;
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (e.touches.length === 0) {
      if (!this._didDrag && this.dragging.nodeId) {
        const node = this.graphData?.nodes.find(n => n.id === this.dragging.nodeId);
        if (node && this.onNodeClick) {
          this.onNodeClick(node);
        }
      }
      this.dragging.active = false;
      this.dragging.nodeId = null;
      this._lastTouchDist = 0;
    }
  }

  private handleClick(e: MouseEvent) {
    if (this._didDrag) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = this.hitTest(sx, sy);
    if (node && this.onNodeClick) {
      this.onNodeClick(node);
    }
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
      y: (wy - this.camera.y) * this.camera.zoom + this.canvas.height / 2,
    };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.canvas.width / 2) / this.camera.zoom + this.camera.x,
      y: (sy - this.canvas.height / 2) / this.camera.zoom + this.camera.y,
    };
  }

  hitTest(sx: number, sy: number): GraphNode | null {
    if (!this.graphData) return null;
    for (const node of this.graphData.nodes) {
      const pos = this.nodePositions.get(node.id);
      if (!pos) continue;
      const dx = sx - pos.x;
      const dy = sy - pos.y;
      const hitRadius = node.radius * this.camera.zoom + 5;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  }

  render(graphData: GraphData) {
    this.graphData = graphData;
    this.startAnimationLoop();
  }

  startAnimationLoop() {
    const loop = () => {
      this.update();
      this.draw();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  update() {
    for (const p of this.particles) {
      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;
      p.twinklePhase += p.twinkleSpeed;
      p.opacity = 0.1 + 0.5 * (0.5 + 0.5 * Math.sin(p.twinklePhase));
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 2;
      r.opacity -= 0.015;
      if (r.radius >= r.maxRadius || r.opacity <= 0) {
        this.ripples.splice(i, 1);
      }
    }

    if (this.graphData) {
      for (const node of this.graphData.nodes) {
        node.glowIntensity += (node.targetGlow - node.glowIntensity) * 0.05;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    this.drawParticles();
    this.drawEdges();
    this.drawNodes();
    this.drawRipples();
  }

  private drawBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#1a0a3e');
    gradient.addColorStop(1, '#0d0d35');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private getPosColor(pos: PosType): string {
    switch (pos) {
      case 'noun': return '#4fc3f7';
      case 'verb': return '#81c784';
      case 'adj': return '#ffb74d';
      default: return '#ce93d8';
    }
  }

  private drawEdges() {
    if (!this.graphData) return;
    const ctx = this.ctx;
    const nodeMap = new Map<string, GraphNode>();
    for (const node of this.graphData.nodes) {
      nodeMap.set(node.id, node);
    }

    for (const edge of this.graphData.edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) continue;

      const srcPos = this.worldToScreen(source.x, source.y);
      const tgtPos = this.worldToScreen(target.x, target.y);

      const dx = tgtPos.x - srcPos.x;
      const dy = tgtPos.y - srcPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      const nx = dx / dist;
      const ny = dy / dist;

      const srcRadius = source.radius * this.camera.zoom;
      const tgtRadius = target.radius * this.camera.zoom;

      const x1 = srcPos.x + nx * srcRadius;
      const y1 = srcPos.y + ny * srcRadius;
      const x2 = tgtPos.x - nx * tgtRadius;
      const y2 = tgtPos.y - ny * tgtRadius;

      const sourceColor = this.getPosColor(source.pos);
      const targetColor = this.getPosColor(target.pos);

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, sourceColor);
      gradient.addColorStop(1, targetColor);

      ctx.globalAlpha = edge.strength * 0.6;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = edge.strength * 3 + 1;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawNodes() {
    if (!this.graphData) return;
    const ctx = this.ctx;

    this.nodePositions.clear();

    for (const node of this.graphData.nodes) {
      const pos = this.worldToScreen(node.x, node.y);
      this.nodePositions.set(node.id, pos);

      const r = node.radius * this.camera.zoom;
      const color = this.getPosColor(node.pos);

      const glowRadius = r * 2.5;
      const glowGradient = ctx.createRadialGradient(pos.x, pos.y, r * 0.5, pos.x, pos.y, glowRadius);
      glowGradient.addColorStop(0, color);
      glowGradient.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.3 * node.glowIntensity;
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      const hlRadius = r * 0.35;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pos.x - r * 0.2, pos.y - r * 0.2, hlRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px "Noto Sans SC"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.word, pos.x, pos.y);

      if (this.selectedNode && this.selectedNode.id === node.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawRipples() {
    const ctx = this.ctx;
    for (const ripple of this.ripples) {
      const pos = this.worldToScreen(ripple.x, ripple.y);
      ctx.globalAlpha = ripple.opacity;
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ripple.radius * this.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = ripple.opacity * 0.6;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ripple.radius * 0.7 * this.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = ripple.opacity * 0.3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ripple.radius * 0.4 * this.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  triggerRipple(node: GraphNode) {
    const color = this.getPosColor(node.pos);
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.ripples.push({
          x: node.x,
          y: node.y,
          radius: node.radius,
          maxRadius: node.radius + 80,
          opacity: 0.8,
          color,
        });
      }, i * 150);
    }
  }

  resetCamera() {
    this.camera = { x: 0, y: 0, zoom: 1 };
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  destroy() {
    cancelAnimationFrame(this.animationFrameId);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('click', this._onClick);
  }

  getNodeScreenPosition(nodeId: string): { x: number; y: number } | null {
    return this.nodePositions.get(nodeId) ?? null;
  }
}
