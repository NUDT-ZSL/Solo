import { Particle } from './particle';

export interface SystemStats {
  total: number;
  flowing: number;
  cooled: number;
  splash: number;
  eruption: number;
  avgTemperature: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private maxParticles: number = 8000;
  private tubeCenterX: number = 0;
  private tubeTop: number = 0;
  private tubeWidth: number = 200;
  private tubeLength: number = 600;
  private coolingStart: number = 0;
  private cooledCanvas: HTMLCanvasElement;
  private cooledCtx: CanvasRenderingContext2D;
  private cooledDirty: boolean = true;
  private lastCooledCount: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.tubeCenterX = canvasWidth / 2;
    this.tubeTop = (canvasHeight - this.tubeLength) / 2;
    this.coolingStart = this.tubeTop + 500 - this.tubeTop;

    this.cooledCanvas = document.createElement('canvas');
    this.cooledCanvas.width = canvasWidth;
    this.cooledCanvas.height = canvasHeight;
    this.cooledCtx = this.cooledCanvas.getContext('2d')!;

    this.initPool();
    this.initInitialParticles();
  }

  private initPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePool.push(new Particle());
    }
  }

  private initInitialParticles(): void {
    const count = 5000;
    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (p) {
        p.initFlowing(this.tubeCenterX, this.tubeTop, this.tubeWidth, this.tubeLength);
        this.particles.push(p);
      }
    }
  }

  private acquireParticle(): Particle | null {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    if (this.particles.length < this.maxParticles) {
      return new Particle();
    }
    return null;
  }

  private releaseParticle(p: Particle): void {
    if (this.particlePool.length < this.maxParticles) {
      this.particlePool.push(p);
    }
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const oldCenterX = this.tubeCenterX;
    const oldTop = this.tubeTop;

    this.tubeCenterX = canvasWidth / 2;
    this.tubeTop = (canvasHeight - this.tubeLength) / 2;
    this.coolingStart = this.tubeTop + 500 - this.tubeTop;

    const dx = this.tubeCenterX - oldCenterX;
    const dy = this.tubeTop - oldTop;

    for (const p of this.particles) {
      if (p.state === 'cooled' || p.state === 'flowing') {
        p.x += dx;
        p.y += dy;
      }
    }

    this.cooledCanvas.width = canvasWidth;
    this.cooledCanvas.height = canvasHeight;
    this.cooledDirty = true;
    this.redrawCooledLayer(dx, dy);
  }

  private redrawCooledLayer(dx: number, dy: number): void {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.cooledCanvas.width;
    tempCanvas.height = this.cooledCanvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(this.cooledCanvas, dx, dy);
    this.cooledCtx.clearRect(0, 0, this.cooledCanvas.width, this.cooledCanvas.height);
    this.cooledCtx.drawImage(tempCanvas, 0, 0);
  }

  spawnSplash(x: number, y: number, count: number = 1): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (p) {
        p.initSplash(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10);
        this.particles.push(p);
      }
    }
  }

  triggerEruption(): void {
    const tubeBottom = this.tubeTop + this.tubeLength;
    const count = 50;
    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (p) {
        p.initEruption(this.tubeCenterX, tubeBottom);
        this.particles.push(p);
      }
    }
  }

  update(
    mouseX: number,
    mouseY: number,
    mouseInTube: boolean,
    deltaTime: number
  ): void {
    const heatedPositions: Array<{ x: number; y: number }> = [];
    let flowingCount = 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const wasCooled = p.state === 'cooled';
      const alive = p.update(
        this.tubeCenterX,
        this.tubeTop,
        this.tubeWidth,
        this.tubeLength,
        this.coolingStart,
        mouseX,
        mouseY,
        mouseInTube,
        deltaTime
      );

      if (!alive) {
        this.particles.splice(i, 1);
        this.releaseParticle(p);
        continue;
      }

      if (p.state === 'flowing') {
        flowingCount++;
      }

      if (!wasCooled && p.state === 'cooled') {
        this.drawCooledParticle(p);
        this.cooledDirty = true;
      }

      if (p.state === 'flowing' && p.heated && p.heatIntensity > 0.6 && Math.random() < 0.05) {
        heatedPositions.push({ x: p.x, y: p.y });
      }
    }

    for (const pos of heatedPositions) {
      if (Math.random() < 0.3) {
        this.spawnSplash(pos.x, pos.y, 1);
      }
    }

    const targetFlowing = 5000;
    if (flowingCount < targetFlowing && this.particles.length < this.maxParticles) {
      const spawnBatch = Math.min(20, targetFlowing - flowingCount);
      for (let i = 0; i < spawnBatch; i++) {
        const p = this.acquireParticle();
        if (p) {
          p.initFlowing(this.tubeCenterX, this.tubeTop, this.tubeWidth, this.tubeLength);
          this.particles.push(p);
        }
      }
    }
  }

  private drawCooledParticle(p: Particle): void {
    this.cooledCtx.beginPath();
    this.cooledCtx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
    this.cooledCtx.fillStyle = `rgba(${Math.floor(p.color.r)}, ${Math.floor(p.color.g)}, ${Math.floor(p.color.b)}, ${p.color.a})`;
    this.cooledCtx.fill();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.cooledCanvas, 0, 0);

    for (const p of this.particles) {
      if (p.state !== 'cooled') {
        p.render(ctx);
      }
    }
  }

  renderTube(ctx: CanvasRenderingContext2D): void {
    const tubeLeft = this.tubeCenterX - this.tubeWidth / 2;
    const tubeRight = this.tubeCenterX + this.tubeWidth / 2;
    const tubeBottom = this.tubeTop + this.tubeLength;

    ctx.save();

    const bgGrad = ctx.createRadialGradient(
      this.tubeCenterX, this.tubeTop + this.tubeLength / 2, 50,
      this.tubeCenterX, this.tubeTop + this.tubeLength / 2, 400
    );
    bgGrad.addColorStop(0, '#4A1A00');
    bgGrad.addColorStop(1, '#1A0A00');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.beginPath();

    const steps = 60;
    const pointsLeft: Array<{ x: number; y: number }> = [];
    const pointsRight: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = this.tubeTop + t * this.tubeLength;
      const noiseL = Math.sin(t * 8 + 1.3) * 8 + Math.sin(t * 15 + 2.7) * 4;
      const noiseR = Math.sin(t * 8 + 4.1) * 8 + Math.sin(t * 15 + 0.9) * 4;
      pointsLeft.push({ x: tubeLeft + noiseL, y });
      pointsRight.push({ x: tubeRight + noiseR, y });
    }

    ctx.moveTo(pointsLeft[0].x, pointsLeft[0].y);
    for (let i = 1; i <= steps; i++) {
      const xc = (pointsLeft[i].x + pointsLeft[i - 1].x) / 2;
      const yc = (pointsLeft[i].y + pointsLeft[i - 1].y) / 2;
      ctx.quadraticCurveTo(pointsLeft[i - 1].x, pointsLeft[i - 1].y, xc, yc);
    }
    for (let i = steps; i >= 0; i--) {
      const xc = i < steps ? (pointsRight[i].x + pointsRight[i + 1].x) / 2 : pointsRight[i].x;
      const yc = i < steps ? (pointsRight[i].y + pointsRight[i + 1].y) / 2 : pointsRight[i].y;
      ctx.quadraticCurveTo(pointsRight[i].x, pointsRight[i].y, xc, yc);
    }
    ctx.closePath();

    const tubeGrad = ctx.createLinearGradient(tubeLeft, 0, tubeRight, 0);
    tubeGrad.addColorStop(0, '#FF4500');
    tubeGrad.addColorStop(0.3, '#FF6600');
    tubeGrad.addColorStop(0.5, '#FFAA00');
    tubeGrad.addColorStop(0.7, '#FF6600');
    tubeGrad.addColorStop(1, '#FF4500');

    ctx.fillStyle = tubeGrad;
    ctx.globalAlpha = 0.15;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FF4500';
    ctx.shadowColor = '#FF4500';
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.shadowBlur = 0;

    const coolY1 = this.coolingStart;
    const coolY2 = tubeBottom;
    const coolGrad = ctx.createLinearGradient(0, coolY1, 0, coolY2);
    coolGrad.addColorStop(0, 'rgba(74, 32, 0, 0)');
    coolGrad.addColorStop(0.5, 'rgba(74, 32, 0, 0.3)');
    coolGrad.addColorStop(1, 'rgba(42, 16, 0, 0.6)');

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = coolY1 + t * (coolY2 - coolY1);
      const idx = Math.floor((y - this.tubeTop) / this.tubeLength * steps);
      const clampedIdx = Math.max(0, Math.min(steps, idx));
      if (i === 0) {
        ctx.moveTo(pointsLeft[clampedIdx].x, y);
      } else {
        ctx.lineTo(pointsLeft[clampedIdx].x, y);
      }
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const y = coolY1 + t * (coolY2 - coolY1);
      const idx = Math.floor((y - this.tubeTop) / this.tubeLength * steps);
      const clampedIdx = Math.max(0, Math.min(steps, idx));
      ctx.lineTo(pointsRight[clampedIdx].x, y);
    }
    ctx.closePath();
    ctx.fillStyle = coolGrad;
    ctx.fill();

    ctx.restore();
  }

  isPointInTube(x: number, y: number): boolean {
    const tubeLeft = this.tubeCenterX - this.tubeWidth / 2 - 20;
    const tubeRight = this.tubeCenterX + this.tubeWidth / 2 + 20;
    const tubeBottom = this.tubeTop + this.tubeLength;
    return x >= tubeLeft && x <= tubeRight && y >= this.tubeTop - 20 && y <= tubeBottom + 20;
  }

  getStats(): SystemStats {
    let flowing = 0;
    let cooled = 0;
    let splash = 0;
    let eruption = 0;
    let tempSum = 0;
    let tempCount = 0;

    for (const p of this.particles) {
      switch (p.state) {
        case 'flowing':
          flowing++;
          tempSum += p.getTemperatureValue();
          tempCount++;
          break;
        case 'cooled':
          cooled++;
          break;
        case 'splash':
          splash++;
          tempSum += p.getTemperatureValue();
          tempCount++;
          break;
        case 'eruption':
          eruption++;
          tempSum += p.getTemperatureValue();
          tempCount++;
          break;
      }
    }

    const avgTemperature = tempCount > 0 ? tempSum / tempCount : 0;

    return {
      total: this.particles.length,
      flowing,
      cooled,
      splash,
      eruption,
      avgTemperature
    };
  }

  getTubeBounds(): { centerX: number; top: number; width: number; length: number } {
    return {
      centerX: this.tubeCenterX,
      top: this.tubeTop,
      width: this.tubeWidth,
      length: this.tubeLength
    };
  }
}
