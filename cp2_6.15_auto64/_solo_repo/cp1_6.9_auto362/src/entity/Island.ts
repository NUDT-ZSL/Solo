export type MotionType = 'sine' | 'circular';

export interface NoisePoint {
  dx: number;
  dy: number;
  radius: number;
  alpha: number;
}

export class Island {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  motionType: MotionType;
  motionPeriod: number;
  motionPhase: number;
  motionAmplitudeX!: number;
  motionAmplitudeY!: number;
  circularRadius!: number;
  circularAngle!: number;
  circularSpeed!: number;
  colorStart: [number, number, number];
  colorEnd: [number, number, number];
  noisePoints: NoisePoint[];
  birthTime: number;
  lifespan: number;
  spawnEdge: 'top' | 'bottom' | 'left' | 'right';
  exitEdge: 'top' | 'bottom' | 'left' | 'right';
  spawnDuration: number;
  exitDuration: number;
  baseSpeed: number;
  directionX: number;
  directionY: number;
  alive: boolean;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.birthTime = Date.now();
    this.lifespan = (10 + Math.random() * 5) * 1000;
    this.spawnDuration = 1000;
    this.exitDuration = 1000;
    this.alive = true;
    this.size = 60 + Math.random() * 60;
    this.motionType = Math.random() < 0.5 ? 'sine' : 'circular';
    this.motionPeriod = 8 + Math.random() * 4;
    this.motionPhase = Math.random() * Math.PI * 2;
    this.baseSpeed = 0.3 + Math.random() * 0.5;

    const edges: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
    this.spawnEdge = edges[Math.floor(Math.random() * edges.length)];
    const oppositeEdges: Record<string, 'top' | 'bottom' | 'left' | 'right'> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };
    this.exitEdge = oppositeEdges[this.spawnEdge];

    const margin = this.size + 50;
    switch (this.spawnEdge) {
      case 'top':
        this.baseX = margin + Math.random() * (canvasWidth - 2 * margin);
        this.baseY = -margin;
        break;
      case 'bottom':
        this.baseX = margin + Math.random() * (canvasWidth - 2 * margin);
        this.baseY = canvasHeight + margin;
        break;
      case 'left':
        this.baseX = -margin;
        this.baseY = margin + Math.random() * (canvasHeight - 2 * margin);
        break;
      case 'right':
        this.baseX = canvasWidth + margin;
        this.baseY = margin + Math.random() * (canvasHeight - 2 * margin);
        break;
    }
    this.x = this.baseX;
    this.y = this.baseY;

    const lifespanFrames = (this.lifespan - this.spawnDuration - this.exitDuration) / (1000 / 60);
    let targetX: number, targetY: number;
    const margin2 = this.size + 100;
    switch (this.exitEdge) {
      case 'top':
        targetX = margin2 + Math.random() * (canvasWidth - 2 * margin2);
        targetY = -margin2;
        break;
      case 'bottom':
        targetX = margin2 + Math.random() * (canvasWidth - 2 * margin2);
        targetY = canvasHeight + margin2;
        break;
      case 'left':
        targetX = -margin2;
        targetY = margin2 + Math.random() * (canvasHeight - 2 * margin2);
        break;
      case 'right':
        targetX = canvasWidth + margin2;
        targetY = margin2 + Math.random() * (canvasHeight - 2 * margin2);
        break;
    }
    this.directionX = (targetX - this.baseX) / lifespanFrames;
    this.directionY = (targetY - this.baseY) / lifespanFrames;

    if (this.motionType === 'sine') {
      this.motionAmplitudeX = 20 + Math.random() * 40;
      this.motionAmplitudeY = 20 + Math.random() * 40;
    } else {
      this.circularRadius = 15 + Math.random() * 30;
      this.circularAngle = Math.random() * Math.PI * 2;
      this.circularSpeed = (Math.PI * 2) / (this.motionPeriod * 60);
    }

    const darkBlue: [number, number, number] = [26, 26, 62];
    const darkGreen: [number, number, number] = [42, 58, 30];
    const t = Math.random();
    this.colorStart = [
      Math.round(darkBlue[0] + (darkGreen[0] - darkBlue[0]) * t),
      Math.round(darkBlue[1] + (darkGreen[1] - darkBlue[1]) * t),
      Math.round(darkBlue[2] + (darkGreen[2] - darkBlue[2]) * t),
    ];
    this.colorEnd = [
      Math.round(this.colorStart[0] * 0.7),
      Math.round(this.colorStart[1] * 0.7),
      Math.round(this.colorStart[2] * 0.7),
    ];

    this.noisePoints = [];
    const noiseCount = 15 + Math.floor(this.size / 5);
    for (let i = 0; i < noiseCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusRatio = 0.3 + Math.random() * 0.5;
      this.noisePoints.push({
        dx: Math.cos(angle) * radiusRatio,
        dy: Math.sin(angle) * radiusRatio,
        radius: 2 + Math.random() * 5,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }
  }

  update(canvasWidth: number, canvasHeight: number): boolean {
    const elapsed = Date.now() - this.birthTime;
    if (elapsed > this.lifespan) {
      this.alive = false;
      return false;
    }

    this.baseX += this.directionX * this.baseSpeed;
    this.baseY += this.directionY * this.baseSpeed;

    const t = elapsed / 1000;
    if (this.motionType === 'sine') {
      this.x = this.baseX + Math.sin(t * (Math.PI * 2) / this.motionPeriod + this.motionPhase) * this.motionAmplitudeX;
      this.y = this.baseY + Math.cos(t * (Math.PI * 2) / this.motionPeriod + this.motionPhase * 1.3) * this.motionAmplitudeY;
    } else {
      this.circularAngle += this.circularSpeed;
      this.x = this.baseX + Math.cos(this.circularAngle) * this.circularRadius;
      this.y = this.baseY + Math.sin(this.circularAngle) * this.circularRadius;
    }

    return true;
  }

  getAlpha(): number {
    const elapsed = Date.now() - this.birthTime;
    if (elapsed < this.spawnDuration) {
      return elapsed / this.spawnDuration;
    }
    if (elapsed > this.lifespan - this.exitDuration) {
      return (this.lifespan - elapsed) / this.exitDuration;
    }
    return 1;
  }

  isFarEnoughFrom(other: Island, minDistance: number = 300): boolean {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy) >= minDistance;
  }

  getEdgePoints(): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      points.push({
        x: this.x + Math.cos(angle) * this.size * 0.8,
        y: this.y + Math.sin(angle) * this.size * 0.8,
      });
    }
    return points;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const alpha = this.getAlpha();
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    const glowGradient = ctx.createRadialGradient(this.x, this.y, this.size * 0.5, this.x, this.y, this.size + 20);
    glowGradient.addColorStop(0, `rgba(100, 150, 255, 0.15)`);
    glowGradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.fillStyle = glowGradient;
    ctx.arc(this.x, this.y, this.size + 20, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createRadialGradient(
      this.x - this.size * 0.3,
      this.y - this.size * 0.3,
      0,
      this.x,
      this.y,
      this.size
    );
    const [sr, sg, sb] = this.colorStart;
    const [er, eg, eb] = this.colorEnd;
    bodyGradient.addColorStop(0, `rgb(${sr}, ${sg}, ${sb})`);
    bodyGradient.addColorStop(1, `rgb(${er}, ${eg}, ${eb})`);

    ctx.beginPath();
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const wobble = Math.sin(angle * 3 + this.motionPhase) * this.size * 0.08 +
                     Math.cos(angle * 5 + this.motionPhase * 0.7) * this.size * 0.04;
      const r = this.size + wobble;
      const px = this.x + Math.cos(angle) * r;
      const py = this.y + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = bodyGradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(150, 200, 255, 0.4)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (const np of this.noisePoints) {
      const nx = this.x + np.dx * this.size;
      const ny = this.y + np.dy * this.size;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${np.alpha * alpha})`;
      ctx.arc(nx, ny, np.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const highlightGradient = ctx.createRadialGradient(
      this.x - this.size * 0.25,
      this.y - this.size * 0.25,
      0,
      this.x - this.size * 0.25,
      this.y - this.size * 0.25,
      this.size * 0.6
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    highlightGradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.fillStyle = highlightGradient;
    ctx.arc(this.x - this.size * 0.25, this.y - this.size * 0.25, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
