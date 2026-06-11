export interface NetworkNode {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  visited: boolean;
  activated: boolean;
  activateTime: number;
  hasEnergy: boolean;
  energyColor: string;
  flashRed: boolean;
  flashTime: number;
}

export interface EdgeStar {
  angle: number;
  orbitRadius: number;
  speed: number;
  size: number;
  side: number;
}

export interface NetworkEdge {
  from: number;
  to: number;
  traversed: boolean;
  opacity: number;
  width: number;
  targetOpacity: number;
  targetWidth: number;
  stars: EdgeStar[];
}

const NODE_COUNT_MIN = 12;
const NODE_COUNT_MAX = 18;
const NODE_RADIUS_MIN = 4;
const NODE_RADIUS_MAX = 6;
const NODE_COLOR = '#87CEEB';
const NODE_ACTIVATED_COLOR = '#FFD700';
const ENERGY_COLORS = ['#FF4500', '#FFD700', '#FF1493'];
const MARGIN = 80;
const CONNECT_DIST_FACTOR = 0.38;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function ensureConnected(nodes: { x: number; y: number }[], adj: Set<number>[]): void {
  const visited = new Set<number>();
  const stack = [0];
  visited.add(0);
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const nb of adj[cur]) {
      if (!visited.has(nb)) {
        visited.add(nb);
        stack.push(nb);
      }
    }
  }
  if (visited.size === nodes.length) return;
  const unvisited: number[] = [];
  for (let i = 0; i < nodes.length; i++) {
    if (!visited.has(i)) unvisited.push(i);
  }
  for (const u of unvisited) {
    let bestV = -1;
    let bestD = Infinity;
    for (const v of visited) {
      const d = dist(nodes[u].x, nodes[u].y, nodes[v].x, nodes[v].y);
      if (d < bestD) {
        bestD = d;
        bestV = v;
      }
    }
    if (bestV >= 0) {
      adj[u].add(bestV);
      adj[bestV].add(u);
      visited.add(u);
    }
  }
}

export class StarNetwork {
  nodes: NetworkNode[] = [];
  edges: NetworkEdge[] = [];
  canvasWidth = 0;
  canvasHeight = 0;

  generate(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.nodes = [];
    this.edges = [];

    const count = Math.floor(rand(NODE_COUNT_MIN, NODE_COUNT_MAX + 1));
    const minDist = Math.min(width, height) * 0.1;

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = rand(MARGIN, width - MARGIN);
        y = rand(MARGIN, height - MARGIN);
        attempts++;
      } while (
        attempts < 200 &&
        this.nodes.some(
          (n) => dist(n.x, n.y, x, y) < minDist
        )
      );

      const r = rand(NODE_RADIUS_MIN, NODE_RADIUS_MAX);
      const eIdx = Math.floor(Math.random() * ENERGY_COLORS.length);
      this.nodes.push({
        id: i,
        x,
        y,
        radius: r,
        color: NODE_COLOR,
        visited: false,
        activated: false,
        activateTime: 0,
        hasEnergy: true,
        energyColor: ENERGY_COLORS[eIdx],
        flashRed: false,
        flashTime: 0,
      });
    }

    const maxDist = Math.sqrt(width * width + height * height) * CONNECT_DIST_FACTOR;
    const adj: Set<number>[] = this.nodes.map(() => new Set());

    const candidates: { i: number; j: number; d: number }[] = [];
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const d = dist(this.nodes[i].x, this.nodes[i].y, this.nodes[j].x, this.nodes[j].y);
        if (d < maxDist) {
          candidates.push({ i, j, d });
        }
      }
    }
    candidates.sort((a, b) => a.d - b.d);

    for (const c of candidates) {
      if (Math.random() < 0.45) {
        adj[c.i].add(c.j);
        adj[c.j].add(c.i);
      }
    }

    ensureConnected(this.nodes, adj);

    for (let i = 0; i < this.nodes.length; i++) {
      for (const j of adj[i]) {
        if (j > i) {
          const starCount = Math.floor(rand(4, 7));
          const stars: EdgeStar[] = [];
          for (let s = 0; s < starCount; s++) {
            stars.push({
              angle: rand(0, Math.PI * 2),
              orbitRadius: 10,
              speed: (Math.PI * 2) / 1.5,
              size: rand(1.5, 3),
              side: s % 2 === 0 ? 0 : 1,
            });
          }
          this.edges.push({
            from: i,
            to: j,
            traversed: false,
            opacity: rand(0.3, 0.6),
            width: 1,
            targetOpacity: rand(0.3, 0.6),
            targetWidth: 1,
            stars,
          });
        }
      }
    }
  }

  getNeighbors(nodeId: number): number[] {
    const neighbors: number[] = [];
    for (const e of this.edges) {
      if (e.from === nodeId) neighbors.push(e.to);
      else if (e.to === nodeId) neighbors.push(e.from);
    }
    return neighbors;
  }

  getEdge(from: number, to: number): NetworkEdge | null {
    for (const e of this.edges) {
      if ((e.from === from && e.to === to) || (e.from === to && e.to === from)) {
        return e;
      }
    }
    return null;
  }

  markEdgeTraversed(from: number, to: number): void {
    const edge = this.getEdge(from, to);
    if (edge && !edge.traversed) {
      edge.traversed = true;
      edge.targetOpacity = 1.0;
      edge.targetWidth = 3;
    }
  }

  isEdgeTraversable(from: number, to: number): boolean {
    const edge = this.getEdge(from, to);
    return edge !== null && !edge.traversed;
  }

  findNodeAt(x: number, y: number, hitRadius: number): NetworkNode | null {
    let closest: NetworkNode | null = null;
    let closestDist = Infinity;
    for (const n of this.nodes) {
      const d = dist(n.x, n.y, x, y);
      if (d < hitRadius && d < closestDist) {
        closest = n;
        closestDist = d;
      }
    }
    return closest;
  }

  flashNodeRed(nodeId: number, time: number): void {
    const node = this.nodes[nodeId];
    if (node) {
      node.flashRed = true;
      node.flashTime = time;
    }
  }

  update(time: number): void {
    for (const node of this.nodes) {
      if (node.activated && time - node.activateTime > 2.0) {
        node.activated = false;
      }
      if (node.flashRed && time - node.flashTime > 0.2) {
        node.flashRed = false;
      }
    }

    for (const edge of this.edges) {
      if (edge.traversed) {
        edge.opacity += (edge.targetOpacity - edge.opacity) * 0.05;
        edge.width += (edge.targetWidth - edge.width) * 0.05;
      }
      for (const star of edge.stars) {
        star.angle += star.speed * (1 / 60);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const breathAlpha = 0.8 + 0.2 * Math.sin(time * (2 * Math.PI) / 3);

    for (const edge of this.edges) {
      const n1 = this.nodes[edge.from];
      const n2 = this.nodes[edge.to];
      const alpha = edge.traversed ? edge.opacity * breathAlpha : edge.opacity;

      ctx.save();
      if (edge.traversed) {
        const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
        grad.addColorStop(0, '#FF8C00');
        grad.addColorStop(1, '#8A2BE2');
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = `rgba(135, 206, 235, ${alpha})`;
      }
      ctx.lineWidth = edge.width;
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();
      ctx.restore();

      if (edge.traversed) {
        for (const star of edge.stars) {
          const baseNode = star.side === 0 ? n1 : n2;
          const sx = baseNode.x + Math.cos(star.angle) * star.orbitRadius;
          const sy = baseNode.y + Math.sin(star.angle) * star.orbitRadius;
          ctx.save();
          ctx.globalAlpha = breathAlpha * 0.8;
          ctx.fillStyle = '#E0E0E0';
          ctx.beginPath();
          ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }

    for (const node of this.nodes) {
      ctx.save();

      if (node.flashRed) {
        const flashProgress = (time - node.flashTime) / 0.2;
        const flashAlpha = 1.0 - flashProgress;
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      if (node.activated) {
        const elapsed = time - node.activateTime;
        const glowAlpha = Math.max(0, 1.0 - elapsed / 2.0);
        ctx.globalAlpha = glowAlpha * 0.4;
        ctx.fillStyle = NODE_ACTIVATED_COLOR;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      ctx.fillStyle = node.activated ? NODE_ACTIVATED_COLOR : node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();

      if (node.hasEnergy) {
        const pulse = 1.0 + 0.1 * Math.sin(time * 4);
        const er = 8 * pulse;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = node.energyColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, er + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = node.energyColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();
    }
  }
}
