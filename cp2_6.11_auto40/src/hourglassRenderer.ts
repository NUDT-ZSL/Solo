import { SandParticle } from './sandParticle';

export interface ContainerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  prevX: number;
  prevY: number;
  moveDX: number;
  moveDY: number;
  smoothDX: number;
  smoothDY: number;
}

interface ResetParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  scatterEndX: number;
  scatterEndY: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

export class HourglassRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  particles: SandParticle[] = [];
  private maxParticles: number = 3000;

  containerBounds: ContainerBounds = { x: 0, y: 0, width: 0, height: 0 };
  private neckY: number = 0;
  private neckWidth: number = 0;

  flowRate: number = 1.0;
  hue: number = 40;
  shapeFactor: number = 50;

  rotation: number = 0;
  targetRotation: number = 0;
  isFlipping: boolean = false;
  private flipStartTime: number = 0;
  private flipDuration: number = 2;
  private flipStartRotation: number = 0;

  mouseState: MouseState = {
    x: -1000,
    y: -1000,
    isDown: false,
    prevX: -1000,
    prevY: -1000,
    moveDX: 0,
    moveDY: 0,
    smoothDX: 0,
    smoothDY: 0
  };

  private gravity: number = 0.15;
  private friction: number = 0.985;

  private spawnTimer: number = 0;
  private spawnRate: number = 0.008;

  private noiseTexture: HTMLCanvasElement | null = null;

  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetDuration: number = 1.0;
  private resetParticles: ResetParticle[] = [];
  private resetPhase: 'scatter' | 'gather' = 'scatter';

  private lastTime: number = 0;

  private spatialGrid: Map<string, SandParticle[]> = new Map();
  private cellSize: number = 6;
  private collisionIterations: number = 4;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    this.generateNoiseTexture();
    this.init();
  }

  private generateNoiseTexture(): void {
    this.noiseTexture = document.createElement('canvas');
    this.noiseTexture.width = 256;
    this.noiseTexture.height = 256;
    const nctx = this.noiseTexture.getContext('2d')!;
    const imageData = nctx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 55);
      imageData.data[i] = 255;
      imageData.data[i + 1] = 255;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = Math.floor(Math.random() * 35 + 20);
    }
    nctx.putImageData(imageData, 0, 0);
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const containerWidth = width * 0.5;
    const containerHeight = height * 0.7;
    this.containerBounds = {
      x: (width - containerWidth) / 2,
      y: (height - containerHeight) / 2,
      width: containerWidth,
      height: containerHeight
    };

    this.neckY = this.containerBounds.y + this.containerBounds.height / 2;
    this.neckWidth = Math.max(8, containerWidth * 0.06);
  }

  init(): void {
    this.particles = [];

    const container = this.containerBounds;
    const topAreaHeight = container.height / 2 - 20;
    const particlesInTop = Math.floor(this.maxParticles * 0.6);

    for (let i = 0; i < particlesInTop; i++) {
      const pyramidTop = container.y + 30;
      const pyramidBase = container.y + topAreaHeight;
      const t = Math.random();
      const py = pyramidBase - Math.sqrt(t) * (pyramidBase - pyramidTop);
      const halfWidthAtY = (1 - (py - pyramidTop) / (pyramidBase - pyramidTop)) * (container.width / 2 - 25);
      const centerX = container.x + container.width / 2;
      const finalX = centerX + (Math.random() - 0.5) * 2 * halfWidthAtY;

      const p = new SandParticle(finalX, py, this.hue);
      p.settled = true;
      p.vx = 0;
      p.vy = 0;
      this.particles.push(p);
    }

    this.rotation = 0;
    this.targetRotation = 0;
    this.isFlipping = false;
    this.spawnTimer = 0;
  }

  setFlowRate(value: number): void {
    this.flowRate = Math.max(0.5, Math.min(5.0, value));
    this.spawnRate = 0.004 + (this.flowRate / 5.0) * 0.02;
  }

  setHue(value: number): void {
    this.hue = Math.max(0, Math.min(360, value));
    for (const p of this.particles) {
      p.baseHue = this.hue + (Math.random() - 0.5) * 12;
    }
  }

  setShapeFactor(value: number): void {
    this.shapeFactor = Math.max(0, Math.min(100, value));
  }

  handleMouseMove(x: number, y: number): void {
    this.mouseState.prevX = this.mouseState.x;
    this.mouseState.prevY = this.mouseState.y;
    this.mouseState.x = x;
    this.mouseState.y = y;
    this.mouseState.moveDX = x - this.mouseState.prevX;
    this.mouseState.moveDY = y - this.mouseState.prevY;

    const smoothFactor = 0.25;
    this.mouseState.smoothDX = this.mouseState.smoothDX * (1 - smoothFactor) + this.mouseState.moveDX * smoothFactor;
    this.mouseState.smoothDY = this.mouseState.smoothDY * (1 - smoothFactor) + this.mouseState.moveDY * smoothFactor;

    if (this.isResetting) return;

    const localPoint = this.screenToLocal(x, y);
    for (const p of this.particles) {
      if (p.containsPoint(localPoint.x, localPoint.y) && !p.isHighlighted) {
        p.highlight();
        break;
      }
    }

    if (this.mouseState.isDown) {
      this.applyPushForce(localPoint.x, localPoint.y, this.mouseState.smoothDX, this.mouseState.smoothDY);
    }
  }

  handleMouseDown(x: number, y: number): void {
    this.mouseState.isDown = true;
    this.mouseState.x = x;
    this.mouseState.y = y;
    this.mouseState.prevX = x;
    this.mouseState.prevY = y;
    this.mouseState.moveDX = 0;
    this.mouseState.moveDY = 0;
    this.mouseState.smoothDX = 0;
    this.mouseState.smoothDY = 0;
  }

  handleMouseUp(): void {
    this.mouseState.isDown = false;
    this.mouseState.moveDX = 0;
    this.mouseState.moveDY = 0;
  }

  handleClick(x: number, y: number): void {
    if (this.isResetting) return;
    const localPoint = this.screenToLocal(x, y);
    this.triggerExplosion(localPoint.x, localPoint.y, 30);
  }

  private screenToLocal(sx: number, sy: number): { x: number; y: number } {
    const cb = this.containerBounds;
    const cx = cb.x + cb.width / 2;
    const cy = cb.y + cb.height / 2;
    const angle = -(this.rotation * Math.PI) / 180;
    const dx = sx - cx;
    const dy = sy - cy;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos
    };
  }

  private applyPushForce(cx: number, cy: number, dx: number, dy: number): void {
    const radius = 40;
    const radiusSq = radius * radius;
    const moveDist = Math.sqrt(dx * dx + dy * dy);
    if (moveDist < 0.3) return;

    const forceMag = Math.min(moveDist * 0.15, 2.5);
    const dirX = dx / Math.max(0.1, moveDist);
    const dirY = dy / Math.max(0.1, moveDist);

    for (const p of this.particles) {
      const ddx = p.x - cx;
      const ddy = p.y - cy;
      const distSq = ddx * ddx + ddy * ddy;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq) || 0.01;
        const nx = ddx / dist;
        const ny = ddy / dist;
        const falloff = 1 - dist / radius;
        const falloffSq = falloff * falloff;

        const dirDotNormal = dirX * nx + dirY * ny;
        const tangentScale = Math.max(0, 1 - Math.abs(dirDotNormal));

        const pushSpeed = forceMag * falloffSq * 0.8;
        const spreadSpeed = forceMag * falloff * tangentScale * 0.3;

        p.settled = false;
        p.applyForce(
          dirX * pushSpeed + nx * spreadSpeed * (Math.random() * 0.5 + 0.5),
          dirY * pushSpeed + ny * spreadSpeed * (Math.random() * 0.5 + 0.5) - 0.3
        );
      }
    }
  }

  private triggerExplosion(cx: number, cy: number, radius: number): void {
    const radiusSq = radius * radius;
    let count = 0;
    const maxExplode = 120;

    const candidates: { p: SandParticle; dist: number; nx: number; ny: number }[] = [];

    for (const p of this.particles) {
      const ddx = p.x - cx;
      const ddy = p.y - cy;
      const distSq = ddx * ddx + ddy * ddy;

      if (distSq < radiusSq * 2.25) {
        const dist = Math.sqrt(distSq) || 0.01;
        candidates.push({
          p,
          dist,
          nx: ddx / dist,
          ny: ddy / dist
        });
      }
    }

    candidates.sort((a, b) => a.dist - b.dist);

    for (let i = 0; i < Math.min(maxExplode, candidates.length); i++) {
      const { p, dist, nx, ny } = candidates[i];
      p.settled = false;

      const falloff = 1 - Math.min(1, dist / radius);
      const baseSpeed = 2.5 + falloff * 4.5;
      const spreadAngle = (Math.random() - 0.5) * 0.8;
      const cos = Math.cos(spreadAngle);
      const sin = Math.sin(spreadAngle);

      const speed = baseSpeed * (0.7 + Math.random() * 0.6);
      p.vx = (nx * cos - ny * sin) * speed;
      p.vy = (nx * sin + ny * cos) * speed - 1.5;

      p.isExploding = true;
      p.explodeTime = 0;
      p.explodeDuration = 0.8;
      p.explodeColor = p.getRandomExplodeColor();

      count++;
    }
  }

  reset(): void {
    if (this.isResetting) return;
    this.isResetting = true;
    this.resetPhase = 'scatter';
    this.resetStartTime = performance.now() / 1000;

    this.resetParticles = [];
    const cx = this.containerBounds.x + this.containerBounds.width / 2;
    const cy = this.containerBounds.y + this.containerBounds.height / 2;

    for (const p of this.particles) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 2;
      p.settled = false;
      p.isExploding = true;
      p.explodeTime = 0;
      p.explodeDuration = 0.5;
      p.explodeColor = p.getRandomExplodeColor();
    }

    const resetCount = 400;
    for (let i = 0; i < resetCount; i++) {
      const startAngle = Math.random() * Math.PI * 2;
      const startR = Math.random() * Math.min(this.containerBounds.width, this.containerBounds.height) * 0.15;
      const targetAngle = Math.random() * Math.PI * 2;
      const targetR = 40 + Math.random() * Math.min(this.containerBounds.width, this.containerBounds.height) * 0.35;

      const dirAngle = Math.random() * Math.PI * 2;
      const dirSpeed = 2 + Math.random() * 4;

      this.resetParticles.push({
        x: cx + Math.cos(startAngle) * startR,
        y: cy + Math.sin(startAngle) * startR,
        startX: cx + Math.cos(startAngle) * startR,
        startY: cy + Math.sin(startAngle) * startR,
        scatterEndX: 0,
        scatterEndY: 0,
        targetX: cx + Math.cos(targetAngle) * targetR,
        targetY: cy + Math.sin(targetAngle) * targetR,
        vx: Math.cos(dirAngle) * dirSpeed,
        vy: Math.sin(dirAngle) * dirSpeed - 1.5,
        color: `hsl(${this.hue + (Math.random() - 0.5) * 30}, ${55 + Math.random() * 20}%, ${60 + Math.random() * 20}%)`,
        size: 1 + Math.random() * 2
      });
    }
  }

  private updateReset(): void {
    const elapsed = performance.now() / 1000 - this.resetStartTime;
    const progress = Math.min(1, elapsed / this.resetDuration);
    const scatterEnd = 0.45;

    if (progress < scatterEnd) {
      const t = progress / scatterEnd;
      const slowdown = 1 - t * 0.5;
      for (const rp of this.resetParticles) {
        rp.x += rp.vx * slowdown;
        rp.y += rp.vy * slowdown;
        rp.vx *= 0.97;
        rp.vy *= 0.97;
        rp.vy += 0.06;
      }
    } else {
      if (this.resetPhase === 'scatter') {
        this.resetPhase = 'gather';
        for (const rp of this.resetParticles) {
          rp.scatterEndX = rp.x;
          rp.scatterEndY = rp.y;
        }
      }
      const t = (progress - scatterEnd) / (1 - scatterEnd);
      const easeT = this.easeInOutCubic(t);
      for (const rp of this.resetParticles) {
        rp.x = rp.scatterEndX + (rp.targetX - rp.scatterEndX) * easeT;
        rp.y = rp.scatterEndY + (rp.targetY - rp.scatterEndY) * easeT;
      }
    }

    if (progress >= this.resetDuration) {
      this.isResetting = false;
      this.resetParticles = [];
      this.resetPhase = 'scatter';
      this.init();
      this.setHue(this.hue);
    }
  }

  private spawnFromTop(deltaTime: number): void {
    if (this.isResetting || this.isFlipping) return;

    const container = this.containerBounds;
    const gravityDir = Math.cos(this.rotation * Math.PI / 180) > 0 ? 1 : -1;
    const topNeckY = gravityDir > 0
      ? this.neckY - 5
      : this.neckY + 5;

    let settledInTop = 0;
    for (const p of this.particles) {
      if (gravityDir > 0 && p.y < this.neckY - 30 && p.settled) settledInTop++;
      if (gravityDir < 0 && p.y > this.neckY + 30 && p.settled) settledInTop++;
    }

    if (settledInTop < 10) return;

    this.spawnTimer += deltaTime * this.flowRate;
    const spawnCount = Math.floor(this.spawnTimer / this.spawnRate);
    this.spawnTimer -= spawnCount * this.spawnRate;

    const centerX = container.x + container.width / 2;

    for (let i = 0; i < spawnCount; i++) {
      for (const p of this.particles) {
        const inTopGravity = gravityDir > 0 && p.y < this.neckY - 30;
        const inBottomGravity = gravityDir < 0 && p.y > this.neckY + 30;
        if (p.settled && (inTopGravity || inBottomGravity)) {
          p.settled = false;
          p.x = centerX + (Math.random() - 0.5) * this.neckWidth * 0.4;
          p.y = topNeckY;
          p.vx = (Math.random() - 0.5) * 0.6;
          p.vy = gravityDir > 0
            ? 0.6 + Math.random() * 0.6
            : -(0.6 + Math.random() * 0.6);
          break;
        }
      }
    }
  }

  private buildSpatialGrid(): void {
    this.spatialGrid.clear();
    const cb = this.containerBounds;

    for (const p of this.particles) {
      if (p.settled) continue;
      const gx = Math.floor((p.x - cb.x) / this.cellSize);
      const gy = Math.floor((p.y - cb.y) / this.cellSize);
      const key = `${gx},${gy}`;
      let cell = this.spatialGrid.get(key);
      if (!cell) {
        cell = [];
        this.spatialGrid.set(key, cell);
      }
      cell.push(p);
    }
  }

  private getNearbyParticles(p: SandParticle): SandParticle[] {
    const cb = this.containerBounds;
    const gx = Math.floor((p.x - cb.x) / this.cellSize);
    const gy = Math.floor((p.y - cb.y) / this.cellSize);
    const nearby: SandParticle[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        const cell = this.spatialGrid.get(key);
        if (cell) {
          for (const other of cell) {
            if (other !== p) {
              nearby.push(other);
            }
          }
        }
      }
    }
    return nearby;
  }

  private updateCellSize(): void {
    let avgRadius = 0;
    let count = 0;
    for (const p of this.particles) {
      if (!p.settled) {
        avgRadius += p.radius;
        count++;
      }
    }
    if (count > 0) {
      avgRadius /= count;
      const targetSize = avgRadius * 2.8;
      this.cellSize = Math.max(4, Math.min(12, targetSize));
    }
  }

  private handleCollisions(): void {
    this.updateCellSize();

    for (let iter = 0; iter < this.collisionIterations; iter++) {
      this.buildSpatialGrid();

      for (const p of this.particles) {
        if (p.settled && iter > 1) continue;
        const nearby = this.getNearbyParticles(p);
        for (const other of nearby) {
          if (p.x < other.x || (p.x === other.x && p.y < other.y)) {
            const rest = 0.12 - iter * 0.02;
            const fric = 0.06 + iter * 0.01;
            p.resolveCollision(other, Math.max(0.02, rest), Math.min(0.12, fric));
          }
        }
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    const container = this.containerBounds;
    const gravityDir = Math.cos(this.rotation * Math.PI / 180) > 0 ? 1 : -1;
    const effectiveGravity = this.gravity * gravityDir;

    for (const p of this.particles) {
      p.update(effectiveGravity, this.friction, deltaTime);
    }

    this.handleCollisions();

    const leftBound = container.x + 4;
    const rightBound = container.x + container.width - 4;
    const topBound = container.y + 4;
    const bottomBound = container.y + container.height - 4;
    const neckLeft = container.x + container.width / 2 - this.neckWidth / 2;
    const neckRight = container.x + container.width / 2 + this.neckWidth / 2;
    const neckTop = this.neckY - 12;
    const neckBottom = this.neckY + 12;
    const slopeMargin = 15;

    for (const p of this.particles) {
      if (p.settled) continue;

      if (p.x < leftBound) {
        p.x = leftBound;
        p.vx = -p.vx * 0.3;
      }
      if (p.x > rightBound) {
        p.x = rightBound;
        p.vx = -p.vx * 0.3;
      }

      if (p.y > neckTop && p.y < neckBottom) {
        if (p.x < neckLeft) {
          p.x = neckLeft;
          p.vx = Math.abs(p.vx) * 0.3;
        }
        if (p.x > neckRight) {
          p.x = neckRight;
          p.vx = -Math.abs(p.vx) * 0.3;
        }
      } else {
        if (p.y > neckTop - slopeMargin && p.y < neckTop) {
          const t = (p.y - (neckTop - slopeMargin)) / slopeMargin;
          const boundaryLeft = container.x + 5 + (neckLeft - container.x - 5) * t;
          const boundaryRight = container.x + container.width - 5 - (container.x + container.width - 5 - neckRight) * t;
          if (p.x < boundaryLeft) {
            p.x = boundaryLeft;
            p.vx = Math.abs(p.vx) * 0.2 + 0.1;
          }
          if (p.x > boundaryRight) {
            p.x = boundaryRight;
            p.vx = -Math.abs(p.vx) * 0.2 - 0.1;
          }
        }
        if (p.y < neckBottom + slopeMargin && p.y > neckBottom) {
          const t = ((neckBottom + slopeMargin) - p.y) / slopeMargin;
          const boundaryLeft = container.x + 5 + (neckLeft - container.x - 5) * t;
          const boundaryRight = container.x + container.width - 5 - (container.x + container.width - 5 - neckRight) * t;
          if (p.x < boundaryLeft) {
            p.x = boundaryLeft;
            p.vx = Math.abs(p.vx) * 0.2 + 0.1;
          }
          if (p.x > boundaryRight) {
            p.x = boundaryRight;
            p.vx = -Math.abs(p.vx) * 0.2 - 0.1;
          }
        }
      }

      if (gravityDir > 0) {
        if (p.y > bottomBound) {
          p.y = bottomBound;
          p.vy = -p.vy * 0.1;
          p.vx *= 0.7;
          if (Math.abs(p.vy) < 0.25 && Math.abs(p.vx) < 0.15) {
            p.settled = true;
            p.vx = 0;
            p.vy = 0;
          }
        }
        if (p.y < topBound) {
          p.y = topBound;
          p.vy = Math.abs(p.vy) * 0.2;
        }
      } else {
        if (p.y < topBound) {
          p.y = topBound;
          p.vy = -p.vy * 0.1;
          p.vx *= 0.7;
          if (Math.abs(p.vy) < 0.25 && Math.abs(p.vx) < 0.15) {
            p.settled = true;
            p.vx = 0;
            p.vy = 0;
          }
        }
        if (p.y > bottomBound) {
          p.y = bottomBound;
          p.vy = -Math.abs(p.vy) * 0.2;
        }
      }
    }
  }

  private checkFlip(): void {
    if (this.isFlipping || this.isResetting) return;

    const gravityDir = Math.cos(this.rotation * Math.PI / 180) > 0 ? 1 : -1;
    let settledInTop = 0;
    let flowingInTop = 0;

    for (const p of this.particles) {
      const inTop = gravityDir > 0 ? p.y < this.neckY - 30 : p.y > this.neckY + 30;
      if (inTop) {
        if (p.settled) settledInTop++;
        else flowingInTop++;
      }
    }

    if (settledInTop < 5 && flowingInTop < 3) {
      this.flip();
    }
  }

  flip(): void {
    if (this.isFlipping || this.isResetting) return;
    this.isFlipping = true;
    this.flipStartTime = performance.now() / 1000;
    this.flipStartRotation = this.rotation;
    this.targetRotation = this.rotation + 180;

    for (const p of this.particles) {
      p.settled = false;
      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = (Math.random() - 0.5) * 0.4;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateFlip(): void {
    if (!this.isFlipping) return;

    const elapsed = performance.now() / 1000 - this.flipStartTime;
    const t = Math.min(1, elapsed / this.flipDuration);
    const easeT = this.easeInOutCubic(t);

    this.rotation = this.flipStartRotation + (this.targetRotation - this.flipStartRotation) * easeT;

    if (t >= 1) {
      this.isFlipping = false;
      this.rotation = this.targetRotation % 360;
      this.spawnTimer = 0;
      for (const p of this.particles) {
        p.settled = false;
      }
    }
  }

  private renderContainer(): void {
    const ctx = this.ctx;
    const cb = this.containerBounds;
    const cx = cb.x + cb.width / 2;
    const cy = cb.y + cb.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    const radius = 8;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cb.x + radius, cb.y);
    ctx.lineTo(cb.x + cb.width - radius, cb.y);
    ctx.quadraticCurveTo(cb.x + cb.width, cb.y, cb.x + cb.width, cb.y + radius);
    ctx.lineTo(cb.x + cb.width, cb.y + cb.height - radius);
    ctx.quadraticCurveTo(cb.x + cb.width, cb.y + cb.height, cb.x + cb.width - radius, cb.y + cb.height);
    ctx.lineTo(cb.x + radius, cb.y + cb.height);
    ctx.quadraticCurveTo(cb.x, cb.y + cb.height, cb.x, cb.y + cb.height - radius);
    ctx.lineTo(cb.x, cb.y + radius);
    ctx.quadraticCurveTo(cb.x, cb.y, cb.x + radius, cb.y);
    ctx.closePath();

    ctx.fillStyle = 'rgba(255, 248, 235, 0.08)';
    ctx.fill();

    ctx.save();
    ctx.clip();
    if (this.noiseTexture) {
      const pattern = ctx.createPattern(this.noiseTexture, 'repeat');
      if (pattern) {
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = pattern;
        ctx.fillRect(cb.x, cb.y, cb.width, cb.height);
      }
    }
    ctx.restore();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#B8860B';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cb.x + 4, this.neckY - 15);
    ctx.lineTo(cx - this.neckWidth / 2, this.neckY - 3);
    ctx.moveTo(cb.x + cb.width - 4, this.neckY - 15);
    ctx.lineTo(cx + this.neckWidth / 2, this.neckY - 3);
    ctx.moveTo(cb.x + 4, this.neckY + 15);
    ctx.lineTo(cx - this.neckWidth / 2, this.neckY + 3);
    ctx.moveTo(cb.x + cb.width - 4, this.neckY + 15);
    ctx.lineTo(cx + this.neckWidth / 2, this.neckY + 3);

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#B8860B';
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private renderSandPiles(): void {
    const ctx = this.ctx;
    const cb = this.containerBounds;
    const cx = cb.x + cb.width / 2;

    ctx.save();
    const centerY = cb.y + cb.height / 2;
    ctx.translate(cx, centerY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.translate(-cx, -centerY);

    const topParticles: SandParticle[] = [];
    const bottomParticles: SandParticle[] = [];

    for (const p of this.particles) {
      if (p.y < this.neckY - 20) {
        topParticles.push(p);
      } else if (p.y > this.neckY + 20) {
        bottomParticles.push(p);
      }
    }

    if (topParticles.length > 10) {
      const sorted = [...topParticles].sort((a, b) => a.y - b.y);
      const topY = sorted[0].y;
      const baseY = this.neckY - 25;

      ctx.beginPath();
      const pileWidth = cb.width * 0.4;
      ctx.moveTo(cx - pileWidth, baseY);
      ctx.lineTo(cx, topY);
      ctx.lineTo(cx + pileWidth, baseY);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, topY, 0, baseY);
      grad.addColorStop(0, `hsla(${this.hue}, 60%, 72%, 0.55)`);
      grad.addColorStop(1, `hsla(${this.hue}, 55%, 58%, 0.7)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    if (bottomParticles.length > 10) {
      const baseY = cb.y + cb.height - 4;
      const cols = 40;
      const colWidth = (cb.width - 20) / cols;
      const heights: number[] = new Array(cols).fill(0);

      for (const p of bottomParticles) {
        const colIdx = Math.floor((p.x - (cb.x + 10)) / colWidth);
        if (colIdx >= 0 && colIdx < cols) {
          const h = baseY - p.y;
          if (h > heights[colIdx]) heights[colIdx] = h;
        }
      }

      for (let i = 0; i < cols; i++) {
        heights[i] = Math.max(heights[i], 1);
      }

      const smoothHeights = [...heights];
      for (let iter = 0; iter < 3; iter++) {
        for (let i = 1; i < cols - 1; i++) {
          smoothHeights[i] = (heights[i - 1] + heights[i] + heights[i + 1]) / 3;
        }
      }

      const shapeT = this.shapeFactor / 100;
      for (let i = 0; i < cols; i++) {
        const distFromCenter = Math.abs(i - cols / 2) / (cols / 2);
        const shapeMod = 1 + (shapeT - 0.5) * distFromCenter * 1.5;
        smoothHeights[i] *= Math.max(0.3, shapeMod);
      }

      ctx.beginPath();
      ctx.moveTo(cb.x + 10, baseY);
      for (let i = 0; i < cols; i++) {
        const px = cb.x + 10 + i * colWidth + colWidth / 2;
        const h = smoothHeights[i];
        ctx.lineTo(px, baseY - h);
      }
      ctx.lineTo(cb.x + cb.width - 10, baseY);
      ctx.closePath();

      const maxH = Math.max(...smoothHeights);
      const grad = ctx.createLinearGradient(0, baseY - maxH, 0, baseY);
      grad.addColorStop(0, `hsla(${this.hue}, 58%, 70%, 0.5)`);
      grad.addColorStop(1, `hsla(${this.hue}, 52%, 55%, 0.75)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }

  private renderSandStream(): void {
    const ctx = this.ctx;
    const cb = this.containerBounds;
    const cx = cb.x + cb.width / 2;

    ctx.save();
    const centerY = cb.y + cb.height / 2;
    ctx.translate(cx, centerY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.translate(-cx, -centerY);

    const flowingParticles = this.particles.filter(p =>
      !p.settled &&
      p.y > this.neckY - 15 &&
      p.y < this.neckY + 15 &&
      Math.abs(p.x - cx) < this.neckWidth
    );

    if (flowingParticles.length > 0) {
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 4; i++) {
        const jitterX = (Math.random() - 0.5) * 1.5;
        const width = 2 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(cx + jitterX, this.neckY - 10);
        ctx.lineTo(cx + jitterX + (Math.random() - 0.5) * 1.5, this.neckY + 10);
        ctx.strokeStyle = `hsla(${this.hue}, 55%, 65%, 0.55)`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    const cb = this.containerBounds;
    const cx = cb.x + cb.width / 2;
    const cy = cb.y + cb.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    for (const p of this.particles) {
      p.render(ctx);
    }

    ctx.restore();
  }

  private renderResetParticles(): void {
    if (!this.isResetting || this.resetParticles.length === 0) return;
    const ctx = this.ctx;
    const elapsed = performance.now() / 1000 - this.resetStartTime;
    const progress = Math.min(1, elapsed / this.resetDuration);

    for (const rp of this.resetParticles) {
      const alpha = progress < 0.5
        ? 1 - progress * 0.4
        : 1 - (progress - 0.5) * 1.8;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = rp.color;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.size * (progress < 0.3 ? 1.5 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private frame(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    if (!this.isResetting) {
      this.spawnFromTop(deltaTime);
      this.updateParticles(deltaTime);
      this.updateFlip();
      this.checkFlip();
    } else {
      this.updateReset();
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    this.renderSandPiles();
    this.renderContainer();
    this.renderSandStream();
    this.renderParticles();
    this.renderResetParticles();
  }

  start(): void {
    this.lastTime = performance.now();
    const loop = (t: number) => {
      this.frame(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
