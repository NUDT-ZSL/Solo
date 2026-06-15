import { StarNetwork } from './network';
import { ParticleSystem } from './particles';

const BASE_SPEED = 200;
const BREATH_MIN = 0.98;
const BREATH_MAX = 1.02;
const BREATH_PERIOD = 0.5;
const BOOST_MULTIPLIER = 1.5;
const BOOST_DURATION = 0.5;

export class PlayerShip {
  x: number;
  y: number;
  currentNode: number;
  targetNode: number | null = null;
  speed = BASE_SPEED;
  baseSpeed = BASE_SPEED;
  speedBoost = false;
  boostEndTime = 0;
  rotation = 0;
  scale = 1.0;
  isMoving = false;
  private moveStartX = 0;
  private moveStartY = 0;
  private moveTargetX = 0;
  private moveTargetY = 0;
  private moveTotalDist = 0;
  private movedDist = 0;
  haloPhase = 0;

  constructor(x: number, y: number, startNode: number) {
    this.x = x;
    this.y = y;
    this.currentNode = startNode;
  }

  moveTo(nodeId: number, network: StarNetwork): boolean {
    if (this.isMoving) return false;
    if (!network.isEdgeTraversable(this.currentNode, nodeId)) return false;

    const target = network.nodes[nodeId];
    if (!target) return false;

    this.targetNode = nodeId;
    this.moveStartX = this.x;
    this.moveStartY = this.y;
    this.moveTargetX = target.x;
    this.moveTargetY = target.y;
    this.moveTotalDist = Math.sqrt(
      (this.moveTargetX - this.moveStartX) ** 2 +
      (this.moveTargetY - this.moveStartY) ** 2
    );
    this.movedDist = 0;
    this.isMoving = true;
    return true;
  }

  triggerBoost(time: number): void {
    this.speedBoost = true;
    this.boostEndTime = time + BOOST_DURATION;
    this.speed = this.baseSpeed * BOOST_MULTIPLIER;
  }

  update(deltaTime: number, time: number, network: StarNetwork, particles: ParticleSystem): boolean {
    if (this.speedBoost && time >= this.boostEndTime) {
      this.speedBoost = false;
      this.speed = this.baseSpeed;
    }

    this.haloPhase += deltaTime * 4;

    if (this.isMoving) {
      const currentSpeed = this.speed;
      const moveStep = currentSpeed * deltaTime;
      this.movedDist += moveStep;

      const progress = Math.min(this.movedDist / this.moveTotalDist, 1.0);
      this.x = this.moveStartX + (this.moveTargetX - this.moveStartX) * progress;
      this.y = this.moveStartY + (this.moveTargetY - this.moveStartY) * progress;

      const dx = this.moveTargetX - this.moveStartX;
      const dy = this.moveTargetY - this.moveStartY;
      if (dx !== 0 || dy !== 0) {
        this.rotation = Math.atan2(dy, dx);
      }

      const trailCount = Math.floor(3 + Math.random() * 3);
      for (let i = 0; i < trailCount; i++) {
        particles.emitTrail(
          this.x - Math.cos(this.rotation) * 10 + rand(-4, 4),
          this.y - Math.sin(this.rotation) * 10 + rand(-4, 4)
        );
      }

      if (progress >= 1.0) {
        this.isMoving = false;
        const prevNode = this.currentNode;
        this.currentNode = this.targetNode!;
        this.targetNode = null;
        this.x = this.moveTargetX;
        this.y = this.moveTargetY;

        network.markEdgeTraversed(prevNode, this.currentNode);
        const node = network.nodes[this.currentNode];
        node.visited = true;
        node.activated = true;
        node.activateTime = time;

        if (node.hasEnergy) {
          node.hasEnergy = false;
          particles.launchEnergy(
            node.x, node.y,
            this.x, this.y,
            node.energyColor
          );
          this.triggerBoost(time);
          particles.emitWave(this.x, this.y, node.energyColor);
        }

        return true;
      }
    } else {
      const breathT = (Math.sin(time * (2 * Math.PI) / BREATH_PERIOD) + 1) / 2;
      this.scale = BREATH_MIN + (BREATH_MAX - BREATH_MIN) * breathT;

      if (Math.random() < 0.5) {
        particles.emitTrail(
          this.x + rand(-3, 3),
          this.y + rand(-3, 3)
        );
      }
    }

    return false;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const haloSize = 20 + 4 * Math.sin(this.haloPhase);
    const haloAlpha = 0.15 + 0.1 * Math.sin(this.haloPhase * 1.3);
    ctx.globalAlpha = haloAlpha;
    ctx.fillStyle = this.speedBoost ? '#FFD700' : '#00BFFF';
    ctx.beginPath();
    ctx.arc(0, 0, haloSize * this.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = this.speedBoost ? '#FFD700' : '#87CEEB';
    ctx.beginPath();
    ctx.arc(0, 0, 12 * this.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;
    ctx.rotate(this.rotation);

    const s = this.scale;
    ctx.fillStyle = this.speedBoost ? '#FFD700' : '#E0E0E0';
    ctx.beginPath();
    ctx.moveTo(14 * s, 0);
    ctx.lineTo(-8 * s, -7 * s);
    ctx.lineTo(-4 * s, 0);
    ctx.lineTo(-8 * s, 7 * s);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.speedBoost ? '#FFFFFF' : '#87CEEB';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
