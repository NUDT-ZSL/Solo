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
}

interface ResetParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  phase: 'explode' | 'gather';
  color: string;
  size: number;
}

export class HourglassRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  particles: SandParticle[] = [];
  private maxParticles: number = 3000;
  private activeParticles: number = 0;

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
    moveDY: 0
  };

  private gravity: number = 0.12;
  private friction: number = 0.985;

  private spawnTimer: number = 0;
  private spawnRate: number = 0.008;

  private topSandHeight: number = 0;
  private bottomSandProfile: number[] = [];

  private noiseTexture: HTMLCanvasElement | null = null;

  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetDuration: number = 1.0;
  private resetParticles: ResetParticle[] = [];

  private lastTime: number = 0;

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
      const v = Math.floor(Math.random() * 60);
      imageData.data[i] = 255;
      imageData.data[i + 1] = 255;
      imageData.data[i + 2] = 255;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = Math.floor(Math.random() * 40 + 20);
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
    this.ctx.scale(this.dpr, this.dpr);

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

    this.initBottomSandProfile();
  }

  private initBottomSandProfile(): void {
    const w = Math.floor(this.containerBounds.width);
    this.bottomSandProfile = new Array(w).fill(0);
  }

  init(): void {
    this.particles = [];
    this.activeParticles = 0;

    const container = this.containerBounds;
    const topAreaHeight = container.height / 2 - 20;
    const particlesInTop = Math.floor(this.maxParticles * 0.6);

    for (let i = 0; i < particlesInTop; i++) {
      const px = container.x + 20 + Math.random() * (container.width - 40);
      const pyramidTop = container.y + 30;
      const pyramidBase = container.y + topAreaHeight;
      const t = Math.random();
      const py = pyramidBase - Math.sqrt(t) * (pyramidBase - pyramidTop);
      const halfWidthAtY = (1 - (py - pyramidTop) / (pyramidBase - pyramidTop)) * (container.width / 2 - 25);
      const centerX = container.x + container.width / 2;
      const finalX = centerX + (Math.random() - 0.5) * 2 * halfWidthAtY;

      const p = new SandParticle(finalX, py, this.hue);
      p.settled = true;
      p.settledY = py;
      p.vx = 0;
      p.vy = 0;
      this.particles.push(p);
    }

    this.activeParticles = particlesInTop;
    this.topSandHeight = topAreaHeight;
    this.initBottomSandProfile();
    this.rotation = 0;
    this.targetRotation = 0;
    this.isFlipping = false;
  }

  setFlowRate(value: number): void {
    this.flowRate = Math.max(0.5, Math.min(5.0, value));
    this.spawnRate = 0.004 + (this.flowRate / 5.0) * 0.02;
  }

  setHue(value: number): void {
    this.hue = Math.max(0, Math.min(360, value));
    for (const p of this.particles) {
      p.baseHue = this.hue + (Math.random() - 0.5) * 15;
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

    if (this.isResetting) return;

    for (const p of this.particles) {
      if (p.containsPoint(x, y) && !p.isHighlighted) {
        p.highlight();
        break;
      }
    }

    if (this.mouseState.isDown) {
      this.applyPushForce(x, y, this.mouseState.moveDX, this.mouseState.moveDY);
    }
  }

  handleMouseDown(x: number, y: number): void {
    this.mouseState.isDown = true;
    this.mouseState.x = x;
    this.mouseState.y = y;
    this.mouseState.prevX = x;
    this.mouseState.prevY = y;
  }

  handleMouseUp(): void {
    this.mouseState.isDown = false;
    this.mouseState.moveDX = 0;
    this.mouseState.moveDY = 0;
  }

  handleClick(x: number, y: number): void {
    if (this.isResetting) return;
    this.triggerExplosion(x, y, 30);
  }

  private applyPushForce(cx: number, cy: number, dx: number, dy: number): void {
    const radius = 40;
    const radiusSq = radius * radius;
    const forceMag = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.08, 1.5);

    if (forceMag < 0.05) return;

    const fx = (dx / Math.max(1, Math.sqrt(dx * dx + dy * dy))) * forceMag;
    const fy = (dy / Math.max(1, Math.sqrt(dx * dx + dy * dy))) * forceMag;

    for (const p of this.particles) {
      const ddx = p.x - cx;
      const ddy = p.y - cy;
      const distSq = ddx * ddx + ddy * ddy;
      if (distSq < radiusSq) {
        const falloff = 1 - distSq / radiusSq;
        const angle = Math.atan2(ddy, ddx) + (Math.random() - 0.5) * 0.8;
        const speed = forceMag * falloff * (0.5 + Math.random());
        p.settled = false;
        p.vx += Math.cos(angle) * speed + fx * falloff * 0.5;
        p.vy += Math.sin(angle) * speed + fy * falloff * 0.5 - 0.5;
      }
    }
  }

  private triggerExplosion(cx: number, cy: number, radius: number): void {
    const radiusSq = radius * radius;
    let count = 0;

    for (const p of this.particles) {
      if (count >= 80) break;
      const ddx = p.x - cx;
      const ddy = p.y - cy;
      const distSq = ddx * ddx + ddy * ddy;
      if (distSq < radiusSq) {
        p.settled = false;
        p.explode(0.8);
        count++;
      }
    }
  }

  reset(): void {
    if (this.isResetting) return;
    this.isResetting = true;
    this.resetStartTime = performance.now() / 1000;

    this.resetParticles = [];
    const count = 200;
    for (let i = 0; i < count; i++) {
      const cx = this.containerBounds.x + this.containerBounds.width / 2;
      const cy = this.containerBounds.y + this.containerBounds.height / 2;
      const angle = Math.random() * Math.PI * 2;
      const startR = Math.random() * 50;
      const targetR = 60 + Math.random() * Math.min(this.containerBounds.width, this.containerBounds.height) * 0.35;
      const targetAngle = Math.random() * Math.PI * 2;

      this.resetParticles.push({
        x: cx + Math.cos(angle) * startR,
        y: cy + Math.sin(angle) * startR,
        targetX: cx + Math.cos(targetAngle) * targetR,
        targetY: cy + Math.sin(targetAngle) * targetR,
        vx: Math.cos(angle) * (3 + Math.random() * 5),
        vy: Math.sin(angle) * (3 + Math.random() * 5),
        phase: 'explode',
        color: `hsl(${this.hue + (Math.random() - 0.5) * 30}, ${55 + Math.random() * 20}%, ${60 + Math.random() * 20}%)`,
        size: 1 + Math.random() * 2
      });
    }

    for (const p of this.particles) {
      p.explode(0.5);
    }
  }

  private updateReset(deltaTime: number): void {
    const elapsed = performance.now() / 1000 - this.resetStartTime;
    const progress = elapsed / this.resetDuration;

    if (progress < 0.5) {
      const t = progress / 0.5;
      for (const rp of this.resetParticles) {
        rp.x += rp.vx;
        rp.y += rp.vy;
        rp.vx *= 0.96;
        rp.vy *= 0.96;
        rp.vy += 0.1;
      }
    } else {
      const t = (progress - 0.5) / 0.5;
      const easeT = t * t * (3 - 2 * t);
      for (const rp of this.resetParticles) {
        const sx = rp.targetX - (rp.targetX - rp.x) * (1 - easeT);
        const sy = rp.targetY - (rp.targetY - rp.y) * (1 - easeT);
        rp.x = sx;
        rp.y = sy;
      }
    }

    if (progress >= this.resetDuration) {
      this.isResetting = false;
      this.resetParticles = [];
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
        if (p.settled && ((gravityDir > 0 && p.y < this.neckY - 30) || (gravityDir < 0 && p.y > this.neckY + 30))) {
          p.settled = false;
          p.x = centerX + (Math.random() - 0.5) * this.neckWidth * 0.5;
          p.y = topNeckY;
          p.vx = (Math.random() - 0.5) * 0.5;
          p.vy = gravityDir > 0 ? 0.5 + Math.random() * 0.5 : -(0.5 + Math.random() * 0.5);
          break;
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

      if (p.settled) continue;

      const leftBound = container.x + 4;
      const rightBound = container.x + container.width - 4;
      const topBound = container.y + 4;
      const bottomBound = container.y + container.height - 4;

      if (p.x < leftBound) {
        p.x = leftBound;
        p.vx = -p.vx * 0.3;
      }
      if (p.x > rightBound) {
        p.x = rightBound;
        p.vx = -p.vx * 0.3;
      }

      const neckLeft = container.x + container.width / 2 - this.neckWidth / 2;
      const neckRight = container.x + container.width / 2 + this.neckWidth / 2;
      const neckTop = this.neckY - 12;
      const neckBottom = this.neckY + 12;

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
        const slopeMargin = 15;
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
          if (Math.abs(p.vy) < 0.3) {
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
          if (Math.abs(p.vy) < 0.3) {
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

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed < 0.15 && ((gravityDir > 0 && p.y > bottomBound - 2) || (gravityDir < 0 && p.y < topBound + 2))) {
        p.settled = true;
        p.vx = 0;
        p.vy = 0;
      }
    }
  }

  private checkFlip(): void {
    if (this.isFlipping || this.isResetting) return;

    const gravityDir = Math.cos(this.rotation * Math.PI / 180) > 0 ? 1 : -1;
    let settledInTop = 0;

    for (const p of this.particles) {
      if (gravityDir > 0 && p.y < this.neckY - 30 && p.settled) settledInTop++;
      if (gravityDir < 0 && p.y > this.neckY + 30 && p.settled) settledInTop++;
    }

    if (settledInTop < 5) {
      this.flip();
    }
  }

  flip(): void {
    if (this.isFlipping || this.isResetting) return;
    this.isFlipping = true;
    this.flipStartTime = performance.now() / 1000;
    this.flipStartRotation = this.rotation;
    this.targetRotation = this.rotation + 180;
  }

  private updateFlip(deltaTime: number): void {
    if (!this.isFlipping) return;

    const elapsed = performance.now() / 1000 - this.flipStartTime;
    const t = Math.min(1, elapsed / this.flipDuration);
    const easeT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.rotation = this.flipStartRotation + (this.targetRotation - this.flipStartRotation) * easeT;

    if (t >= 1) {
      this.isFlipping = false;
      this.rotation = this.targetRotation;

      for (const p of this.particles) {
        p.settled = false;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.vy = (Math.random() - 0.5) * 0.3;
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

    ctx.save();
    const radius = 8;
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

    const neckWidth = this.neckWidth;
    const neckY = this.neckY;

    ctx.moveTo(cb.x + 4, neckY - 15);
    ctx.lineTo(cx - neckWidth / 2, neckY - 3);
    ctx.moveTo(cb.x + cb.width - 4, neckY - 15);
    ctx.lineTo(cx + neckWidth / 2, neckY - 3);
    ctx.moveTo(cb.x + 4, neckY + 15);
    ctx.lineTo(cx - neckWidth / 2, neckY + 3);
    ctx.moveTo(cb.x + cb.width - 4, neckY + 15);
    ctx.lineTo(cx + neckWidth / 2, neckY + 3);

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
    const cy = cb.y + cb.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    const gravityDir = 1;
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
      const avgY = sorted.reduce((s, p) => s + p.y, 0) / sorted.length;
      const topY = sorted[0].y;
      const baseY = this.neckY - 25;
      const height = baseY - topY;

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
      const sorted = [...bottomParticles].sort((a, b) => b.y - a.y);
      const baseY = cb.y + cb.height - 4;
      const shapeExponent = 0.5 + (this.shapeFactor / 100) * 2;

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

  private renderSandStream(deltaTime: number): void {
    const ctx = this.ctx;
    const cb = this.containerBounds;
    const cx = cb.x + cb.width / 2;
    const cy = cb.y + cb.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    const gravityDir = 1;
    const flowingParticles = this.particles.filter(p =>
      !p.settled &&
      p.y > this.neckY - 15 &&
      p.y < this.neckY + 15 &&
      Math.abs(p.x - cx) < this.neckWidth
    );

    if (flowingParticles.length > 0) {
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 3; i++) {
        const jitterX = (Math.random() - 0.5) * 1.5;
        const width = 2 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(cx + jitterX, this.neckY - 8);
        ctx.lineTo(cx + jitterX + (Math.random() - 0.5) * 1, this.neckY + 8);
        ctx.strokeStyle = `hsla(${this.hue}, 55%, 65%, 0.6)`;
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
    const progress = elapsed / this.resetDuration;

    for (const rp of this.resetParticles) {
      const alpha = progress < 0.5
        ? 1 - progress * 0.5
        : 1 - (progress - 0.5) * 1.5;
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
      this.updateFlip(deltaTime);
      this.checkFlip();
    } else {
      this.updateReset(deltaTime);
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    this.renderSandPiles();
    this.renderContainer();
    this.renderSandStream(deltaTime);
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
