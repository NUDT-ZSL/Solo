import { AudioManager } from './audio';

export interface PlantNode {
  id: number;
  x: number;
  y: number;
  targetY: number;
  baseX: number;
  radius: number;
  note: string;
  color: string;
  growthProgress: number;
  pulsePhase: number;
  clicked: boolean;
  clickTime: number;
}

export class Plant {
  public nodes: PlantNode[] = [];
  public readonly maxNodes: number = 10;
  private baseX: number;
  private baseY: number;
  private growInterval: number = 2000;
  private lastGrowTime: number = 0;
  private readonly cMajorScale: string[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];
  private colorStart: { r: number; g: number; b: number } = { r: 76, g: 175, b: 80 };
  private colorEnd: { r: number; g: number; b: number } = { r: 129, g: 199, b: 132 };
  private audio: AudioManager;
  private flickerPhase: number = 0;
  private isFlickering: boolean = false;
  private flickerStartTime: number = 0;
  private readonly flickerDuration: number = 1200;

  constructor(centerX: number, centerY: number) {
    this.baseX = centerX;
    this.baseY = centerY + 150;
    this.audio = AudioManager.getInstance();
  }

  private interpolateColor(t: number): string {
    const r = Math.round(this.colorStart.r + (this.colorEnd.r - this.colorStart.r) * t);
    const g = Math.round(this.colorStart.g + (this.colorEnd.g - this.colorStart.g) * t);
    const b = Math.round(this.colorStart.b + (this.colorEnd.b - this.colorStart.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private createNode(id: number): PlantNode {
    const spacing = 32;
    const targetY = this.baseY - id * spacing;
    const sway = Math.sin(id * 0.8) * 8;
    return {
      id,
      x: this.baseX + sway,
      y: this.baseY,
      targetY,
      baseX: this.baseX + sway,
      radius: 14 - id * 0.6,
      note: this.cMajorScale[id % this.cMajorScale.length],
      color: this.interpolateColor(id / (this.maxNodes - 1)),
      growthProgress: 0,
      pulsePhase: Math.random() * Math.PI * 2,
      clicked: false,
      clickTime: 0
    };
  }

  public startFlickering(currentTime: number): void {
    this.isFlickering = true;
    this.flickerStartTime = currentTime;
  }

  public reset(): void {
    this.nodes = [];
    this.lastGrowTime = 0;
    this.isFlickering = false;
    this.flickerPhase = 0;
  }

  public update(dt: number, currentTime: number): void {
    if (this.isFlickering) {
      const elapsed = currentTime - this.flickerStartTime;
      if (elapsed >= this.flickerDuration) {
        this.isFlickering = false;
      } else {
        this.flickerPhase = elapsed / this.flickerDuration;
      }
    }

    if (this.nodes.length < this.maxNodes) {
      if (this.lastGrowTime === 0) {
        this.lastGrowTime = currentTime;
      }
      if (currentTime - this.lastGrowTime >= this.growInterval) {
        const newNode = this.createNode(this.nodes.length);
        this.nodes.push(newNode);
        this.audio.playNote(newNode.note, 0.5);
        this.lastGrowTime = currentTime;
      }
    }

    for (const node of this.nodes) {
      if (node.growthProgress < 1) {
        node.growthProgress = Math.min(1, node.growthProgress + dt / 600);
      }
      node.y = this.baseY - (this.baseY - node.targetY) * node.growthProgress;
      node.pulsePhase += dt * 0.003;
    }
  }

  public hitTest(x: number, y: number): PlantNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (node.growthProgress < 0.5) continue;
      const dx = x - node.x;
      const dy = y - node.y;
      const hitRadius = node.radius + 8;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  }

  public onClickNode(node: PlantNode, currentTime: number): void {
    node.clicked = true;
    node.clickTime = currentTime;
    this.audio.playArpeggio(node.note, 0.25);
  }

  private getFlickerAlpha(): number {
    if (!this.isFlickering) return 1;
    const t = this.flickerPhase;
    const pulse = Math.sin(t * Math.PI * 6);
    return 0.3 + (pulse * 0.5 + 0.5) * 0.7;
  }

  public render(ctx: CanvasRenderingContext2D, currentTime: number): void {
    const globalAlpha = this.getFlickerAlpha();
    ctx.save();
    ctx.globalAlpha = globalAlpha;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (i > 0) {
        const prev = this.nodes[i - 1];
        const lineAlpha = Math.min(node.growthProgress, prev.growthProgress) * 0.7;
        ctx.save();
        ctx.globalAlpha = lineAlpha * globalAlpha;
        ctx.strokeStyle = 'rgba(129, 199, 132, 0.8)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.quadraticCurveTo(
          (prev.x + node.x) / 2 + Math.sin(currentTime * 0.001 + i) * 2,
          (prev.y + node.y) / 2,
          node.x,
          node.y
        );
        ctx.stroke();
        ctx.restore();
      }
    }

    for (const node of this.nodes) {
      if (node.growthProgress < 0.05) continue;
      const pulse = Math.sin(node.pulsePhase) * 0.15 + 1;
      const r = node.radius * node.growthProgress * pulse;
      const clickScale = node.clicked ? Math.max(0, 1 - (currentTime - node.clickTime) / 400) : 0;
      const clickR = r + clickScale * 12;

      ctx.save();
      ctx.globalAlpha = node.growthProgress * globalAlpha * 0.4;
      ctx.fillStyle = node.color;
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(node.x, node.y, clickR + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = node.growthProgress * globalAlpha * 0.85;
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, clickR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = node.growthProgress * globalAlpha;
      const gradient = ctx.createRadialGradient(
        node.x - r * 0.3, node.y - r * 0.3, 0,
        node.x, node.y, r
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(0.4, node.color);
      gradient.addColorStop(1, node.color);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.nodes.length === 0) {
      ctx.save();
      ctx.globalAlpha = 0.7 * globalAlpha;
      ctx.fillStyle = '#4CAF50';
      ctx.shadowColor = '#4CAF50';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(this.baseX, this.baseY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  public isComplete(): boolean {
    return this.nodes.length >= this.maxNodes;
  }
}
