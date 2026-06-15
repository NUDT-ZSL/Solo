import { Particle, ParticleParams } from './Particle';

export interface HourglassParams {
  particleColor: string;
  flowSpeed: number;
  tiltAngle: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

type FlipState = 'idle' | 'flipping' | 'flipping_slow';

export class Hourglass {
  x: number;
  y: number;
  width: number;
  height: number;
  topParticles: Particle[];
  bottomParticles: Particle[];
  fallingParticles: Particle[];
  flipState: FlipState;
  flipProgress: number;
  flipDuration: number;
  rotation: number;
  neckWidth: number;
  isTiming: boolean;
  isComplete: boolean;
  goldTransitionProgress: number;
  burstParticles: BurstParticle[];
  burstActive: boolean;
  private collisionGrid: Map<string, Particle[]>;
  private readonly gridSize: number = 10;
  private readonly topChamberTop: number;
  private readonly topChamberBottom: number;
  private readonly bottomChamberTop: number;
  private readonly bottomChamberBottom: number;
  private readonly leftEdge: number;
  private readonly rightEdge: number;

  constructor(centerX: number, centerY: number) {
    this.width = 180;
    this.height = 320;
    this.x = centerX - this.width / 2;
    this.y = centerY - this.height / 2;
    this.topParticles = [];
    this.bottomParticles = [];
    this.fallingParticles = [];
    this.flipState = 'idle';
    this.flipProgress = 0;
    this.flipDuration = 800;
    this.rotation = 0;
    this.neckWidth = 12;
    this.isTiming = false;
    this.isComplete = false;
    this.goldTransitionProgress = 0;
    this.burstParticles = [];
    this.burstActive = false;
    this.collisionGrid = new Map();

    const padding = 16;
    this.topChamberTop = this.y + padding;
    this.topChamberBottom = this.y + this.height / 2 - 4;
    this.bottomChamberTop = this.y + this.height / 2 + 4;
    this.bottomChamberBottom = this.y + this.height - padding;
    this.leftEdge = this.x + padding;
    this.rightEdge = this.x + this.width - padding;

    this.initializeParticles();
  }

  private initializeParticles(): void {
    this.topParticles = [];
    this.bottomParticles = [];
    this.fallingParticles = [];
    this.collisionGrid.clear();
    this.isTiming = false;
    this.isComplete = false;
    this.goldTransitionProgress = 0;
    this.burstParticles = [];
    this.burstActive = false;

    const particleCount = 200 + Math.floor(Math.random() * 201);
    const centerX = this.x + this.width / 2;
    const halfWidth = (this.rightEdge - this.leftEdge) / 2 - 4;
    const chamberHeight = this.topChamberBottom - this.topChamberTop - 20;

    for (let i = 0; i < particleCount; i++) {
      const t = Math.random();
      const layerHeight = Math.sqrt(t) * chamberHeight;
      const currentY = this.topChamberBottom - layerHeight - 2;
      const layerRatio = layerHeight / chamberHeight;
      const currentHalfWidth = halfWidth * (1 - layerRatio * 0.7);
      const offsetX = (Math.random() - 0.5) * 2 * currentHalfWidth;
      const currentX = centerX + offsetX;
      const p = new Particle(currentX, currentY);
      this.topParticles.push(p);
    }
  }

  flip(): void {
    if (this.flipState !== 'idle') return;
    this.flipState = 'flipping';
    this.flipProgress = 0;
    this.flipDuration = 800;
    this.goldTransitionProgress = 0;
    this.isComplete = false;
  }

  private flipSlow(): void {
    if (this.flipState !== 'idle') return;
    this.flipState = 'flipping_slow';
    this.flipProgress = 0;
    this.flipDuration = 2000;
  }

  reset(): void {
    this.flipState = 'idle';
    this.rotation = 0;
    this.flipProgress = 0;
    this.initializeParticles();
  }

  private getNeckX(): number {
    return this.x + this.width / 2;
  }

  private getNeckY(): number {
    return this.y + this.height / 2;
  }

  private getTopChamberBounds(): { left: number; right: number; top: number; bottom: number } {
    const centerX = this.getNeckX();
    const topHalfWidth = (this.rightEdge - this.leftEdge) / 2;
    const neckHalfWidth = this.neckWidth / 2;
    return {
      left: centerX - topHalfWidth,
      right: centerX + topHalfWidth,
      top: this.topChamberTop,
      bottom: this.topChamberBottom
    };
  }

  private getBottomChamberBounds(): { left: number; right: number; top: number; bottom: number } {
    const centerX = this.getNeckX();
    const bottomHalfWidth = (this.rightEdge - this.leftEdge) / 2;
    return {
      left: centerX - bottomHalfWidth,
      right: centerX + bottomHalfWidth,
      top: this.bottomChamberTop,
      bottom: this.bottomChamberBottom
    };
  }

  private isInsideTopChamber(px: number, py: number): boolean {
    const bounds = this.getTopChamberBounds();
    if (py < bounds.top || py > bounds.bottom) return false;
    const t = (py - bounds.top) / (bounds.bottom - bounds.top);
    const halfWidthTop = (bounds.right - bounds.left) / 2;
    const halfWidthNeck = this.neckWidth / 2;
    const currentHalfWidth = halfWidthTop + (halfWidthNeck - halfWidthTop) * t;
    const centerX = (bounds.left + bounds.right) / 2;
    return Math.abs(px - centerX) <= currentHalfWidth - 1;
  }

  private isInsideBottomChamber(px: number, py: number, tiltAngle: number): boolean {
    const bounds = this.getBottomChamberBounds();
    if (py < bounds.top || py > bounds.bottom) return false;
    const t = (py - bounds.top) / (bounds.bottom - bounds.top);
    const halfWidthBottom = (bounds.right - bounds.left) / 2;
    const halfWidthNeck = this.neckWidth / 2;
    const currentHalfWidth = halfWidthNeck + (halfWidthBottom - halfWidthNeck) * t;
    const centerX = (bounds.left + bounds.right) / 2;
    const tiltOffset = Math.tan(tiltAngle * Math.PI / 180) * (py - bounds.top);
    return Math.abs(px - centerX - tiltOffset) <= currentHalfWidth - 1;
  }

  private getPileHeight(particles: Particle[]): number {
    if (particles.length === 0) return 0;
    let minY = Infinity;
    for (const p of particles) {
      if (p.y < minY) minY = p.y;
    }
    return this.bottomChamberBottom - minY;
  }

  private getTopPileBottom(particles: Particle[]): number {
    if (particles.length === 0) return this.topChamberTop;
    let maxY = -Infinity;
    for (const p of particles) {
      if (p.y > maxY) maxY = p.y;
    }
    return maxY;
  }

  private buildCollisionGrid(particles: Particle[]): void {
    this.collisionGrid.clear();
    for (const p of particles) {
      const key = `${Math.floor(p.x / this.gridSize)},${Math.floor(p.y / this.gridSize)}`;
      if (!this.collisionGrid.has(key)) {
        this.collisionGrid.set(key, []);
      }
      this.collisionGrid.get(key)!.push(p);
    }
  }

  private checkCollision(p: Particle, particles: Particle[]): boolean {
    const keys = [
      `${Math.floor(p.x / this.gridSize)},${Math.floor(p.y / this.gridSize)}`,
      `${Math.floor(p.x / this.gridSize) + 1},${Math.floor(p.y / this.gridSize)}`,
      `${Math.floor(p.x / this.gridSize) - 1},${Math.floor(p.y / this.gridSize)}`,
      `${Math.floor(p.x / this.gridSize)},${Math.floor(p.y / this.gridSize) + 1}`,
      `${Math.floor(p.x / this.gridSize)},${Math.floor(p.y / this.gridSize) - 1}`,
      `${Math.floor(p.x / this.gridSize) + 1},${Math.floor(p.y / this.gridSize) + 1}`,
      `${Math.floor(p.x / this.gridSize) - 1},${Math.floor(p.y / this.gridSize) - 1}`,
      `${Math.floor(p.x / this.gridSize) + 1},${Math.floor(p.y / this.gridSize) - 1}`,
      `${Math.floor(p.x / this.gridSize) - 1},${Math.floor(p.y / this.gridSize) + 1}`
    ];
    for (const key of keys) {
      const cell = this.collisionGrid.get(key);
      if (!cell) continue;
      for (const other of cell) {
        if (other === p) continue;
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (p.size + other.size) / 2;
        if (dist < minDist && dist > 0) {
          return true;
        }
      }
    }
    return false;
  }

  update(deltaTime: number, params: HourglassParams): void {
    const gravity = 0.3;
    const wind = Math.tan(params.tiltAngle * Math.PI / 180) * 0.2;
    const jitterAmount = deltaTime > 16 ? 0.2 : 0.5;

    if (this.flipState === 'flipping' || this.flipState === 'flipping_slow') {
      this.flipProgress += deltaTime;
      const t = Math.min(this.flipProgress / this.flipDuration, 1);
      const eased = this.cubicBezier(t, 0.25, 0.1, 0.25, 1);
      this.rotation = (this.flipState === 'flipping' ? Math.PI : Math.PI * 2) * eased;

      if (t >= 1) {
        const wasFlipping = this.flipState === 'flipping';
        this.flipState = 'idle';
        this.flipProgress = 0;
        this.rotation = 0;

        if (wasFlipping) {
          const temp = this.topParticles;
          this.topParticles = this.bottomParticles;
          this.bottomParticles = temp;

          for (const p of this.bottomParticles) {
            p.settled = true;
            p.isFalling = false;
          }

          const centerX = this.getNeckX();
          const padding = 16;
          const topChamberBottomForReset = this.y + this.height / 2 - 4;
          const topChamberTopForReset = this.y + padding;
          const halfWidth = (this.rightEdge - this.leftEdge) / 2 - 4;
          const chamberHeight = topChamberBottomForReset - topChamberTopForReset - 20;

          for (let i = 0; i < this.topParticles.length; i++) {
            const t = i / this.topParticles.length;
            const layerHeight = Math.sqrt(t) * chamberHeight;
            const currentY = topChamberBottomForReset - layerHeight - 2;
            const layerRatio = layerHeight / chamberHeight;
            const currentHalfWidth = halfWidth * (1 - layerRatio * 0.7);
            const offsetX = (Math.random() - 0.5) * 2 * currentHalfWidth;
            this.topParticles[i].x = centerX + offsetX;
            this.topParticles[i].y = currentY;
            this.topParticles[i].settled = true;
            this.topParticles[i].isFalling = false;
            this.topParticles[i].velocityX = 0;
            this.topParticles[i].velocityY = 0;
          }

          this.isTiming = this.topParticles.length > 0;
        } else {
          this.triggerBurst();
        }
      }
      return;
    }

    if (this.isComplete) {
      this.goldTransitionProgress = Math.min(this.goldTransitionProgress + deltaTime / 1500, 1);
    }

    if (this.burstActive) {
      this.updateBurst(deltaTime);
    }

    const particleParams: ParticleParams = {
      gravity,
      wind,
      flowSpeed: params.flowSpeed,
      jitterAmount,
      targetColor: '#FFD700',
      colorTransitionProgress: this.goldTransitionProgress
    };

    for (const p of this.topParticles) {
      p.update(particleParams);
    }
    for (const p of this.bottomParticles) {
      p.update(particleParams);
    }
    for (const p of this.fallingParticles) {
      p.update(particleParams);
    }

    if (this.isTiming && this.topParticles.length > 0) {
      const dropsPerFrame = Math.min(params.flowSpeed, this.topParticles.length);
      for (let i = 0; i < dropsPerFrame && this.topParticles.length > 0; i++) {
        let lowestIdx = 0;
        let lowestY = -Infinity;
        const neckX = this.getNeckX();
        for (let j = 0; j < this.topParticles.length; j++) {
          const p = this.topParticles[j];
          const nearNeck = Math.abs(p.x - neckX) < this.neckWidth / 2 + 2;
          if (nearNeck && p.y > lowestY) {
            lowestY = p.y;
            lowestIdx = j;
          }
        }
        if (lowestY === -Infinity) {
          for (let j = 0; j < this.topParticles.length; j++) {
            if (this.topParticles[j].y > lowestY) {
              lowestY = this.topParticles[j].y;
              lowestIdx = j;
            }
          }
        }
        const falling = this.topParticles.splice(lowestIdx, 1)[0];
        falling.isFalling = true;
        falling.settled = false;
        falling.x = this.getNeckX() + (Math.random() - 0.5) * 4;
        falling.y = this.getNeckY();
        falling.velocityX = wind * 2;
        falling.velocityY = 1;
        this.fallingParticles.push(falling);
      }
    }

    this.buildCollisionGrid(this.bottomParticles);
    const bottomBounds = this.getBottomChamberBounds();
    const pileAngleRad = 30 * Math.PI / 180;
    const centerX = this.getNeckX();
    const tiltOffset = Math.tan(params.tiltAngle * Math.PI / 180);

    for (let i = this.fallingParticles.length - 1; i >= 0; i--) {
      const p = this.fallingParticles[i];
      p.x += p.velocityX;
      p.y += p.velocityY;
      p.velocityY += gravity;
      p.velocityX += wind * 0.1;

      const pileHeight = this.getPileHeight(this.bottomParticles);
      const distFromCenter = p.x - centerX;
      const slopeLimit = pileHeight * 0.4;
      const maxDist = pileHeight > 0 ?
        Math.min(Math.tan(pileAngleRad) * (this.bottomChamberBottom - p.y) + slopeLimit,
          (bottomBounds.right - bottomBounds.left) / 2 - 4) :
        (bottomBounds.right - bottomBounds.left) / 2 - 4;

      const effectiveCenter = centerX + tiltOffset * (this.bottomChamberBottom - p.y);

      if (p.y >= this.bottomChamberBottom - p.size / 2 ||
        (this.bottomParticles.length > 0 &&
          p.y >= this.bottomChamberBottom - this.getPileHeight(this.bottomParticles) - p.size &&
          Math.abs(p.x - effectiveCenter) <= maxDist &&
          this.checkCollision(p, this.bottomParticles))) {
        p.y = Math.min(p.y, this.bottomChamberBottom - p.size / 2);
        p.settled = true;
        p.isFalling = false;
        p.velocityX = 0;
        p.velocityY = 0;

        let settleAttempts = 0;
        while (settleAttempts < 10 && this.checkCollision(p, this.bottomParticles)) {
          const angle = Math.random() * Math.PI * 2;
          const pushDist = p.size * 0.6;
          p.x += Math.cos(angle) * pushDist;
          p.y -= 0.5;
          settleAttempts++;
        }

        if (!this.isInsideBottomChamber(p.x, p.y, params.tiltAngle)) {
          const clampCenter = centerX + tiltOffset * (this.bottomChamberBottom - p.y);
          const halfW = (bottomBounds.right - bottomBounds.left) / 2 - 4;
          p.x = Math.max(clampCenter - halfW, Math.min(clampCenter + halfW, p.x));
        }

        this.bottomParticles.push(p);
        this.fallingParticles.splice(i, 1);
      }

      if (p.y > this.height + 50) {
        this.fallingParticles.splice(i, 1);
      }
    }

    if (this.isTiming && this.topParticles.length === 0 && this.fallingParticles.length === 0) {
      this.isTiming = false;
      this.isComplete = true;
      this.flipSlow();
    }
  }

  private triggerBurst(): void {
    this.burstActive = true;
    const centerX = this.getNeckX();
    const centerY = this.y + this.height - 30;
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 1 + Math.random() * 2;
      this.burstParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0,
        maxLife: 600,
        size: 2 + Math.random() * 3,
        color: '#FFD700'
      });
    }
  }

  private updateBurst(deltaTime: number): void {
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const b = this.burstParticles[i];
      b.life += deltaTime;
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.05;
      if (b.life >= b.maxLife) {
        this.burstParticles.splice(i, 1);
      }
    }
    if (this.burstParticles.length === 0) {
      this.burstActive = false;
    }
  }

  private cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    let tGuess = t;
    for (let i = 0; i < 8; i++) {
      const xGuess = ((ax * tGuess + bx) * tGuess + cx) * tGuess;
      const dx = (3 * ax * tGuess + 2 * bx) * tGuess + cx;
      if (Math.abs(dx) < 1e-6) break;
      tGuess -= (xGuess - t) / dx;
    }
    return ((ay * tGuess + by) * tGuess + cy) * tGuess;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const centerX = this.getNeckX();
    const centerY = this.getNeckY();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation);
    ctx.translate(-centerX, -centerY);

    this.renderGlass(ctx);

    ctx.save();
    ctx.beginPath();
    this.clipChambers(ctx);
    ctx.clip();

    for (const p of this.topParticles) {
      p.render(ctx, 0);
    }
    for (const p of this.bottomParticles) {
      p.render(ctx, 0);
    }
    for (const p of this.fallingParticles) {
      p.render(ctx, 3);
    }

    ctx.restore();
    ctx.restore();

    if (this.burstActive) {
      this.renderBurst(ctx);
    }
  }

  private renderGlass(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    this.clipChambers(ctx);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333';
    ctx.stroke();
  }

  private clipChambers(ctx: CanvasRenderingContext2D): void {
    const radius = 8;
    const padding = 16;
    const neckHalf = this.neckWidth / 2;
    const cx = this.getNeckX();
    const cy = this.getNeckY();

    const topLeft = this.x + padding;
    const topRight = this.x + this.width - padding;
    const topTop = this.y + padding;
    const topBottom = cy - 2;

    ctx.moveTo(topLeft + radius, topTop);
    ctx.lineTo(topRight - radius, topTop);
    ctx.quadraticCurveTo(topRight, topTop, topRight, topTop + radius);
    ctx.lineTo(cx + neckHalf, topBottom);
    ctx.lineTo(cx - neckHalf, topBottom);
    ctx.lineTo(topLeft, topTop + radius);
    ctx.quadraticCurveTo(topLeft, topTop, topLeft + radius, topTop);
    ctx.closePath();

    const bottomTop = cy + 2;
    const bottomBottom = this.y + this.height - padding;

    ctx.moveTo(cx - neckHalf, bottomTop);
    ctx.lineTo(topLeft, bottomBottom - radius);
    ctx.quadraticCurveTo(topLeft, bottomBottom, topLeft + radius, bottomBottom);
    ctx.lineTo(topRight - radius, bottomBottom);
    ctx.quadraticCurveTo(topRight, bottomBottom, topRight, bottomBottom - radius);
    ctx.lineTo(cx + neckHalf, bottomTop);
    ctx.closePath();
  }

  private renderBurst(ctx: CanvasRenderingContext2D): void {
    for (const b of this.burstParticles) {
      const alpha = 1 - b.life / b.maxLife;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.fill();
    }
  }

  containsPoint(px: number, py: number): boolean {
    return px >= this.x && px <= this.x + this.width &&
      py >= this.y && py <= this.y + this.height;
  }
}
