import { StarCluster } from './StarCluster';

interface FlowParticle {
  progress: number;
  offset: number;
  size: number;
  brightness: number;
}

export interface ConnectionData {
  id: string;
  fromClusterId: string;
  toClusterId: string;
}

export class Connection {
  public id: string;
  public fromCluster: StarCluster;
  public toCluster: StarCluster;
  public flowParticles: FlowParticle[];
  public opacity: number = 1;
  public dissipating: boolean = false;
  public dissipateProgress: number = 0;

  private lastSpawnTime: number = 0;
  private static readonly SPAWN_INTERVAL = 500;
  private static readonly FLOW_SPEED = 0.008;
  private static readonly MIN_FLOW_COUNT = 3;
  private static readonly MAX_FLOW_COUNT = 8;

  constructor(from: StarCluster, to: StarCluster, existingId?: string) {
    this.id = existingId || `conn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.fromCluster = from;
    this.toCluster = to;
    this.flowParticles = [];
  }

  private getLength(): number {
    const dx = this.toCluster.x - this.fromCluster.x;
    const dy = this.toCluster.y - this.fromCluster.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTargetFlowCount(): number {
    const length = this.getLength();
    const minLen = 100;
    const maxLen = 800;
    const t = Math.max(0, Math.min(1, (length - minLen) / (maxLen - minLen)));
    return Math.round(
      Connection.MIN_FLOW_COUNT + (Connection.MAX_FLOW_COUNT - Connection.MIN_FLOW_COUNT) * t
    );
  }

  public update(currentTime: number): void {
    if (this.dissipating) {
      this.dissipateProgress += 1 / 120;
      if (this.dissipateProgress >= 1) {
        this.dissipateProgress = 1;
      }
      this.opacity = Math.max(0, 1 - this.dissipateProgress);

      for (const p of this.flowParticles) {
        p.progress += Connection.FLOW_SPEED * 0.5;
        p.brightness = Math.max(0, p.brightness - 0.02);
      }
      this.flowParticles = this.flowParticles.filter(p => p.progress <= 1.2);
      return;
    }

    const targetCount = this.getTargetFlowCount();

    if (currentTime - this.lastSpawnTime >= Connection.SPAWN_INTERVAL) {
      this.lastSpawnTime = currentTime;

      if (this.flowParticles.length < targetCount) {
        this.flowParticles.push({
          progress: 0,
          offset: (Math.random() - 0.5) * 4,
          size: 2.5 + Math.random() * 1.5,
          brightness: 0.5 + Math.random() * 0.5
        });
      }
    }

    for (const p of this.flowParticles) {
      p.progress += Connection.FLOW_SPEED;
      p.brightness = 0.5 + Math.sin(p.progress * Math.PI * 4) * 0.2 + 0.3;
    }

    this.flowParticles = this.flowParticles.filter(p => p.progress <= 1.1);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.opacity <= 0) return;

    const fromX = this.fromCluster.x;
    const fromY = this.fromCluster.y;
    const toX = this.toCluster.x;
    const toY = this.toCluster.y;
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    const alpha = this.opacity;

    const grad = ctx.createLinearGradient(fromX, fromY, toX, toY);
    grad.addColorStop(0, `hsla(${this.fromCluster.hue}, 90%, 80%, ${0.8 * alpha})`);
    grad.addColorStop(0.5, `hsla(${(this.fromCluster.hue + this.toCluster.hue) / 2}, 80%, 70%, ${0.3 * alpha})`);
    grad.addColorStop(1, `hsla(${this.toCluster.hue}, 90%, 80%, ${0.8 * alpha})`);

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * alpha})`;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();

    for (const p of this.flowParticles) {
      if (p.progress < 0 || p.progress > 1) continue;

      const t = p.progress;
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t + Math.sin(t * Math.PI) * p.offset;

      const h1 = this.fromCluster.hue;
      const h2 = this.toCluster.hue;
      const hue = h1 + (h2 - h1) * t;

      const glowSize = p.size * 4;
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      glowGrad.addColorStop(0, `hsla(${hue}, 100%, 95%, ${0.85 * alpha * p.brightness})`);
      glowGrad.addColorStop(0.3, `hsla(${hue}, 90%, 80%, ${0.4 * alpha * p.brightness})`);
      glowGrad.addColorStop(1, `hsla(${hue}, 80%, 60%, 0)`);

      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, 98%, ${0.95 * alpha * p.brightness})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, p.size * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  public toJSON(): ConnectionData {
    return {
      id: this.id,
      fromClusterId: this.fromCluster.id,
      toClusterId: this.toCluster.id
    };
  }

  public startDissipate(): void {
    this.dissipating = true;
    this.dissipateProgress = 0;
  }

  public isFullyDissipated(): boolean {
    return this.dissipateProgress >= 1;
  }
}
