export interface NodeData {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  highlighted: boolean;
  highlightTime: number;
  flashRed: boolean;
  flashRedTime: number;
  energyColor: string;
  energyCollected: boolean;
}

export interface EdgeData {
  from: number;
  to: number;
  traversed: boolean;
  traverseProgress: number;
  opacity: number;
}

export class Network {
  nodes: NodeData[] = [];
  edges: EdgeData[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  private readonly ENERGY_COLORS = ['#FF4500', '#FFD700', '#FF1493'];
  private readonly NODE_COLOR = '#87CEEB';
  private readonly HIGHLIGHT_COLOR = '#FFD700';
  private readonly MIN_NODES = 12;
  private readonly MAX_NODES = 18;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.generate();
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private generate(): void {
    this.nodes = [];
    this.edges = [];

    const nodeCount = this.MIN_NODES + Math.floor(Math.random() * (this.MAX_NODES - this.MIN_NODES + 1));
    const padding = 100;

    for (let i = 0; i < nodeCount; i++) {
      let x: number, y: number;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 100) {
        x = padding + Math.random() * (this.canvasWidth - padding * 2);
        y = padding + Math.random() * (this.canvasHeight - padding * 2);
        valid = true;

        for (const node of this.nodes) {
          const dist = Math.hypot(x - node.x, y - node.y);
          if (dist < 120) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      this.nodes.push({
        id: i,
        x: x!,
        y: y!,
        radius: 8 + Math.random() * 4,
        color: this.NODE_COLOR,
        highlighted: false,
        highlightTime: 0,
        flashRed: false,
        flashRedTime: 0,
        energyColor: this.ENERGY_COLORS[Math.floor(Math.random() * this.ENERGY_COLORS.length)],
        energyCollected: false
      });
    }

    this.connectNodes();
  }

  private connectNodes(): void {
    const connected = new Set<number>();
    const unconnected = new Set(this.nodes.map(n => n.id));

    const startId = 0;
    connected.add(startId);
    unconnected.delete(startId);

    while (unconnected.size > 0) {
      let bestDist = Infinity;
      let bestFrom = -1;
      let bestTo = -1;

      for (const fromId of connected) {
        const fromNode = this.nodes[fromId];
        for (const toId of unconnected) {
          const toNode = this.nodes[toId];
          const dist = Math.hypot(fromNode.x - toNode.x, fromNode.y - toNode.y);
          if (dist < bestDist) {
            bestDist = dist;
            bestFrom = fromId;
            bestTo = toId;
          }
        }
      }

      if (bestFrom >= 0 && bestTo >= 0) {
        this.addEdge(bestFrom, bestTo);
        connected.add(bestTo);
        unconnected.delete(bestTo);
      }
    }

    const extraEdges = Math.floor(this.nodes.length * 0.5);
    for (let i = 0; i < extraEdges; i++) {
      const a = Math.floor(Math.random() * this.nodes.length);
      const b = Math.floor(Math.random() * this.nodes.length);
      if (a !== b && !this.hasEdge(a, b)) {
        const dist = Math.hypot(this.nodes[a].x - this.nodes[b].x, this.nodes[a].y - this.nodes[b].y);
        if (dist < 300) {
          this.addEdge(a, b);
        }
      }
    }
  }

  private addEdge(from: number, to: number): void {
    if (from > to) {
      [from, to] = [to, from];
    }
    this.edges.push({
      from,
      to,
      traversed: false,
      traverseProgress: 0,
      opacity: 0.3 + Math.random() * 0.3
    });
  }

  private hasEdge(a: number, b: number): boolean {
    const from = Math.min(a, b);
    const to = Math.max(a, b);
    return this.edges.some(e => e.from === from && e.to === to);
  }

  getEdge(from: number, to: number): EdgeData | undefined {
    const f = Math.min(from, to);
    const t = Math.max(from, to);
    return this.edges.find(e => e.from === f && e.to === t);
  }

  getNeighbors(nodeId: number): number[] {
    const neighbors: number[] = [];
    for (const edge of this.edges) {
      if (edge.from === nodeId) neighbors.push(edge.to);
      else if (edge.to === nodeId) neighbors.push(edge.from);
    }
    return neighbors;
  }

  getAvailableNeighbors(nodeId: number): number[] {
    return this.getNeighbors(nodeId).filter(neighborId => {
      const edge = this.getEdge(nodeId, neighborId);
      return edge && !edge.traversed;
    });
  }

  isNeighbor(fromId: number, toId: number): boolean {
    return this.getNeighbors(fromId).includes(toId);
  }

  markEdgeTraversed(from: number, to: number): void {
    const edge = this.getEdge(from, to);
    if (edge) {
      edge.traversed = true;
    }
  }

  highlightNode(nodeId: number, duration: number = 2000): void {
    const node = this.nodes[nodeId];
    if (node) {
      node.highlighted = true;
      node.highlightTime = duration;
    }
  }

  flashNodeRed(nodeId: number, duration: number = 200): void {
    const node = this.nodes[nodeId];
    if (node) {
      node.flashRed = true;
      node.flashRedTime = duration;
    }
  }

  collectEnergy(nodeId: number): boolean {
    const node = this.nodes[nodeId];
    if (node && !node.energyCollected) {
      node.energyCollected = true;
      return true;
    }
    return false;
  }

  getCollectedCount(): number {
    return this.nodes.filter(n => n.energyCollected).length;
  }

  getTotalCount(): number {
    return this.nodes.length;
  }

  update(dt: number): void {
    for (const node of this.nodes) {
      if (node.highlighted) {
        node.highlightTime -= dt;
        if (node.highlightTime <= 0) {
          node.highlighted = false;
        }
      }
      if (node.flashRed) {
        node.flashRedTime -= dt;
        if (node.flashRedTime <= 0) {
          node.flashRed = false;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, breathPhase: number): void {
    for (const edge of this.edges) {
      const fromNode = this.nodes[edge.from];
      const toNode = this.nodes[edge.to];

      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);

      if (edge.traversed) {
        const breath = 0.8 + 0.2 * breathPhase;
        const grad = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
        grad.addColorStop(0, `rgba(255, 140, 0, ${breath})`);
        grad.addColorStop(1, `rgba(138, 43, 226, ${breath})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = `rgba(135, 206, 235, ${edge.opacity})`;
        ctx.lineWidth = 1;
      }

      ctx.stroke();
    }

    for (const node of this.nodes) {
      this.renderNode(ctx, node);
    }
  }

  private renderNode(ctx: CanvasRenderingContext2D, node: NodeData): void {
    ctx.save();
    ctx.translate(node.x, node.y);

    let color = node.color;
    let glowIntensity = 15;

    if (node.flashRed) {
      color = '#FF0000';
      glowIntensity = 30;
    } else if (node.highlighted) {
      color = this.HIGHLIGHT_COLOR;
      glowIntensity = 25;
    }

    ctx.shadowBlur = glowIntensity;
    ctx.shadowColor = color;

    ctx.beginPath();
    ctx.arc(0, 0, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, node.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.restore();

    if (!node.energyCollected) {
      this.renderEnergyOrb(ctx, node);
    }
  }

  private renderEnergyOrb(ctx: CanvasRenderingContext2D, node: NodeData): void {
    ctx.save();
    ctx.translate(node.x, node.y);

    const pulse = 0.9 + 0.1 * Math.sin(performance.now() / 300);
    const orbRadius = 8 * pulse;

    ctx.shadowBlur = 20;
    ctx.shadowColor = node.energyColor;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, orbRadius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, node.energyColor);
    gradient.addColorStop(1, `${node.energyColor}00`);

    ctx.beginPath();
    ctx.arc(0, 0, orbRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }

  findNodeAt(x: number, y: number, threshold: number = 25): number | null {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const dist = Math.hypot(x - node.x, y - node.y);
      if (dist < threshold) {
        return i;
      }
    }
    return null;
  }
}
