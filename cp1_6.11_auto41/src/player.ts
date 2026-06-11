import type { Network, NodeData } from './network';
import type { ParticleSystem } from './particles';

export interface EnergyOrb {
  active: boolean;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  lockedTarget: boolean;
  currentX: number;
  currentY: number;
  progress: number;
  duration: number;
  color: string;
  nodeId: number;
}

export class Player {
  x: number;
  y: number;
  currentNodeId: number;
  targetNodeId: number | null;
  isMoving: boolean;
  baseSpeed: number = 200;
  speedMultiplier: number = 1;
  speedBoostTime: number = 0;
  directionX: number = 0;
  directionY: number = 0;
  private breathPhase: number = 0;
  private breathPeriod: number = 500;
  energyOrbs: EnergyOrb[] = [];

  private readonly SHIP_SIZE = 14;
  private readonly BOOST_DURATION = 500;
  private readonly BOOST_MULTIPLIER = 1.5;
  private readonly ORB_DURATION = 400;

  constructor(startNodeId: number, startX: number, startY: number) {
    this.currentNodeId = startNodeId;
    this.targetNodeId = null;
    this.isMoving = false;
    this.x = startX;
    this.y = startY;
  }

  tryMoveTo(targetNodeId: number, network: Network): boolean {
    if (this.isMoving) return false;
    if (!network.isNeighbor(this.currentNodeId, targetNodeId)) return false;

    const edge = network.getEdge(this.currentNodeId, targetNodeId);
    if (edge && edge.traversed) {
      network.flashNodeRed(targetNodeId);
      return false;
    }

    this.targetNodeId = targetNodeId;
    this.isMoving = true;

    const targetNode = network.nodes[targetNodeId];
    const dx = targetNode.x - this.x;
    const dy = targetNode.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    this.directionX = dx / len;
    this.directionY = dy / len;

    return true;
  }

  update(dt: number, network: Network, particles: ParticleSystem): void {
    this.breathPhase += dt;

    if (this.speedBoostTime > 0) {
      this.speedBoostTime -= dt;
      if (this.speedBoostTime <= 0) {
        this.speedMultiplier = 1;
      }
    }

    if (this.isMoving && this.targetNodeId !== null) {
      const targetNode = network.nodes[this.targetNodeId];
      const dx = targetNode.x - this.x;
      const dy = targetNode.y - this.y;
      const dist = Math.hypot(dx, dy);
      const moveDistance = this.baseSpeed * this.speedMultiplier * dt / 1000;

      if (dist <= moveDistance) {
        this.x = targetNode.x;
        this.y = targetNode.y;
        this.arriveAtNode(this.targetNodeId, network, particles);
      } else {
        this.x += (dx / dist) * moveDistance;
        this.y += (dy / dist) * moveDistance;
        particles.spawnTrail(this.x, this.y, this.directionX, this.directionY);
      }
    }

    this.updateEnergyOrbs(dt, particles);
  }

  private arriveAtNode(nodeId: number, network: Network, particles: ParticleSystem): void {
    const fromId = this.currentNodeId;
    const toId = nodeId;

    network.markEdgeTraversed(fromId, toId);
    network.highlightNode(toId);

    const fromNode = network.nodes[fromId];
    const toNode = network.nodes[toId];
    particles.spawnStarPoints(fromNode.x, fromNode.y);
    particles.spawnStarPoints(toNode.x, toNode.y);

    if (network.collectEnergy(toId)) {
      const node = network.nodes[toId];
      this.launchEnergyOrb(node);
    }

    this.currentNodeId = nodeId;
    this.targetNodeId = null;
    this.isMoving = false;
  }

  launchEnergyOrb(node: NodeData): void {
    this.energyOrbs.push({
      active: true,
      startX: node.x,
      startY: node.y,
      targetX: this.x,
      targetY: this.y,
      lockedTarget: true,
      currentX: node.x,
      currentY: node.y,
      progress: 0,
      duration: this.ORB_DURATION,
      color: node.energyColor,
      nodeId: node.id
    });
  }

  private updateEnergyOrbs(dt: number, particles: ParticleSystem): void {
    for (let i = this.energyOrbs.length - 1; i >= 0; i--) {
      const orb = this.energyOrbs[i];
      if (!orb.active) continue;

      orb.progress += dt / orb.duration;

      if (orb.progress >= 1) {
        const dist = Math.hypot(orb.currentX - this.x, orb.currentY - this.y);
        if (dist < 60) {
          this.collectOrb(orb, particles);
        }
        this.energyOrbs.splice(i, 1);
      } else {
        const t = orb.progress;
        const arcHeight = 60 * (1 - Math.abs(t - 0.5) * 2);
        orb.currentX = orb.startX + (orb.targetX - orb.startX) * t;
        orb.currentY = orb.startY + (orb.targetY - orb.startY) * t - arcHeight * t * (1 - t) * 4;
      }
    }
  }

  private collectOrb(orb: EnergyOrb, particles: ParticleSystem): void {
    this.speedMultiplier = this.BOOST_MULTIPLIER;
    this.speedBoostTime = this.BOOST_DURATION;
    particles.spawnWave(this.x, this.y, orb.color);
  }

  getBreathScale(): number {
    const phase = (this.breathPhase % this.breathPeriod) / this.breathPeriod;
    return 0.98 + 0.04 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const orb of this.energyOrbs) {
      if (orb.active) {
        this.renderEnergyOrb(ctx, orb);
      }
    }

    this.renderShip(ctx);
  }

  private renderEnergyOrb(ctx: CanvasRenderingContext2D, orb: EnergyOrb): void {
    ctx.save();
    ctx.translate(orb.currentX, orb.currentY);

    const pulse = 0.8 + 0.2 * Math.sin(orb.progress * Math.PI * 8);
    const radius = 10 * pulse;

    ctx.shadowBlur = 25;
    ctx.shadowColor = orb.color;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, orb.color);
    gradient.addColorStop(1, `${orb.color}00`);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }

  private renderShip(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isMoving) {
      const angle = Math.atan2(this.directionY, this.directionX);
      ctx.rotate(angle);
    }

    const scale = this.getBreathScale();
    ctx.scale(scale, scale);

    this.renderHalo(ctx);

    const size = this.SHIP_SIZE;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00BFFF';

    const grad = ctx.createLinearGradient(-size, 0, size, 0);
    grad.addColorStop(0, '#1B1B4A');
    grad.addColorStop(0.5, '#00BFFF');
    grad.addColorStop(1, '#8A2BE2');

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.5);
    ctx.lineTo(-size * 0.3, 0);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(size * 0.2, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    ctx.restore();
  }

  private renderHalo(ctx: CanvasRenderingContext2D): void {
    const haloPulse = 0.85 + 0.15 * Math.sin(this.breathPhase / 200);
    const haloRadius = this.SHIP_SIZE * 1.8 * haloPulse;

    ctx.save();
    ctx.globalAlpha = 0.4 * haloPulse;

    const haloGrad = ctx.createRadialGradient(0, 0, this.SHIP_SIZE * 0.5, 0, 0, haloRadius);
    haloGrad.addColorStop(0, 'rgba(0, 191, 255, 0.6)');
    haloGrad.addColorStop(0.5, 'rgba(138, 43, 226, 0.3)');
    haloGrad.addColorStop(1, 'rgba(138, 43, 226, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();
    ctx.restore();
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  hasSpeedBoost(): boolean {
    return this.speedBoostTime > 0;
  }
}
