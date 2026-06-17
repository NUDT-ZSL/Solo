export interface VineConfig {
  startX: number;
  startY: number;
  length: number;
  nodeCount: number;
  gravity: number;
  windStrength: number;
  windDirection: number;
}

interface VineNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  oldX: number;
  oldY: number;
  isBouncing: boolean;
  bounceStartTime: number;
  bounceHeight: number;
  bounceDamping: number;
}

export class Vine {
  private startX: number;
  private startY: number;
  private length: number;
  private nodeCount: number;
  private segmentLength: number;
  private nodes: VineNode[] = [];
  private gravity: number;
  private windStrength: number;
  private windDirection: number;
  private time: number = 0;
  private windCoefficient: number = 0.3;

  constructor(config: VineConfig) {
    this.startX = config.startX;
    this.startY = config.startY;
    this.length = config.length;
    this.nodeCount = config.nodeCount;
    this.gravity = config.gravity;
    this.windStrength = config.windStrength;
    this.windDirection = config.windDirection;
    this.segmentLength = this.length / (this.nodeCount - 1);
    this.initNodes();
  }

  private initNodes(): void {
    this.nodes = [];
    for (let i = 0; i < this.nodeCount; i++) {
      const x = this.startX;
      const y = this.startY + i * this.segmentLength;
      this.nodes.push({
        x,
        y,
        vx: 0,
        vy: 0,
        oldX: x,
        oldY: y,
        isBouncing: false,
        bounceStartTime: 0,
        bounceHeight: 30,
        bounceDamping: 0.8
      });
    }
  }

  public setWind(strength: number, direction: number): void {
    this.windStrength = strength;
    this.windDirection = direction;
  }

  public getStartX(): number {
    return this.startX;
  }

  public getStartY(): number {
    return this.startY;
  }

  public checkClick(mouseX: number, mouseY: number, currentTime: number): boolean {
    for (let i = 1; i < this.nodeCount; i++) {
      const node = this.nodes[i];
      const dist = Math.sqrt(Math.pow(mouseX - node.x, 2) + Math.pow(mouseY - node.y, 2));
      if (dist < 15) {
        this.triggerBounce(i, currentTime);
        return true;
      }
    }
    return false;
  }

  private triggerBounce(nodeIndex: number, currentTime: number): void {
    const node = this.nodes[nodeIndex];
    if (node.isBouncing) return;
    node.isBouncing = true;
    node.bounceStartTime = currentTime;
    node.vy = -Math.sqrt(2 * this.gravity * node.bounceHeight);
  }

  public update(deltaTime: number, currentTime: number): void {
    const dt = deltaTime / 1000;
    this.time += dt;

    const windForce = this.windStrength * this.windCoefficient * this.windDirection;
    const windOscillation = Math.sin(this.time * 2) * 0.5;

    for (let i = 1; i < this.nodeCount; i++) {
      const node = this.nodes[i];

      if (!node.isBouncing) {
        node.vx += (windForce + windOscillation * this.windStrength * 0.3) * dt * 10;
        node.vy += this.gravity * dt * 5;
      } else {
        const bounceElapsed = currentTime - node.bounceStartTime;
        if (bounceElapsed < 400) {
          node.vy += this.gravity * dt * 5;
          node.vx += windForce * dt * 5;
        } else {
          node.isBouncing = false;
        }
      }

      node.vx *= 0.98;
      node.vy *= 0.98;

      const newX = node.x + node.vx * dt * 60;
      const newY = node.y + node.vy * dt * 60;

      node.oldX = node.x;
      node.oldY = node.y;
      node.x = newX;
      node.y = newY;
    }

    this.applyConstraints();
  }

  private applyConstraints(): void {
    for (let iteration = 0; iteration < 5; iteration++) {
      for (let i = 0; i < this.nodeCount - 1; i++) {
        const node1 = this.nodes[i];
        const node2 = this.nodes[i + 1];

        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) continue;

        const diff = (dist - this.segmentLength) / dist;
        const offsetX = dx * diff * 0.5;
        const offsetY = dy * diff * 0.5;

        if (i === 0) {
          node2.x -= offsetX;
          node2.y -= offsetY;
        } else {
          node1.x += offsetX;
          node1.y += offsetY;
          node2.x -= offsetX;
          node2.y -= offsetY;
        }
      }

      this.nodes[0].x = this.startX;
      this.nodes[0].y = this.startY;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.nodes[0].x, this.nodes[0].y);

    for (let i = 1; i < this.nodeCount; i++) {
      ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
    }
    ctx.stroke();

    for (let i = 0; i < this.nodeCount; i++) {
      const node = this.nodes[i];
      const leafSize = i === 0 ? 0 : 4 + Math.sin(i * 1.5) * 2;

      if (i > 0 && i % 2 === 0) {
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(
          node.x + 8,
          node.y,
          leafSize + 2,
          leafSize,
          Math.PI / 6,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(
          node.x - 8,
          node.y,
          leafSize + 2,
          leafSize,
          -Math.PI / 6,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.fillStyle = '#388E3C';
      ctx.beginPath();
      ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
