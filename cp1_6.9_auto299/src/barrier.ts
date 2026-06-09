export interface Barrier {
  id: number;
  x: number;
  y: number;
  trackIndex: number;
  direction: 1 | -1;
  width: number;
  height: number;
  speed: number;
  pulsePhase: number;
  active: boolean;
}

export class BarrierSystem {
  barriers: Barrier[] = [];
  nextId: number = 0;
  canvasWidth: number;
  canvasHeight: number;
  isMobile: boolean;
  baseSpeed: number = 80;
  baseWidth: number = 200;
  baseHeight: number = 40;
  spawnTimer: number = 0;
  spawnInterval: number = 1.5;
  difficultyTimer: number = 0;

  constructor(canvasWidth: number, canvasHeight: number, isMobile: boolean) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isMobile = isMobile;
    if (isMobile) {
      this.baseWidth = 100;
      this.baseHeight = 20;
    }
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  spawn(trackY: number, trackIndex: number): void {
    const fromLeft = Math.random() > 0.5;
    const speedMul = 1 + this.difficultyTimer * 0.015;
    const barrier: Barrier = {
      id: this.nextId++,
      x: fromLeft ? -this.baseWidth - 10 : this.canvasWidth + 10,
      y: trackY - this.baseHeight / 2,
      trackIndex,
      direction: fromLeft ? 1 : -1,
      width: this.baseWidth,
      height: this.baseHeight,
      speed: this.baseSpeed * speedMul,
      pulsePhase: Math.random() * Math.PI * 2,
      active: true
    };
    this.barriers.push(barrier);
  }

  spawnRandom(trackYs: number[]): void {
    if (trackYs.length === 0) return;

    const activePerTrack = new Map<number, number>();
    for (const b of this.barriers) {
      if (b.active) {
        activePerTrack.set(b.trackIndex, (activePerTrack.get(b.trackIndex) || 0) + 1);
      }
    }

    const candidates: number[] = [];
    for (let i = 0; i < trackYs.length; i++) {
      const count = activePerTrack.get(i) || 0;
      if (count < 2) {
        candidates.push(i);
      }
    }

    if (candidates.length === 0) return;
    const trackIdx = candidates[Math.floor(Math.random() * candidates.length)];
    this.spawn(trackYs[trackIdx], trackIdx);
  }

  update(dt: number): void {
    this.difficultyTimer += dt;
    this.spawnInterval = Math.max(0.7, 1.5 - this.difficultyTimer * 0.008);

    for (let i = this.barriers.length - 1; i >= 0; i--) {
      const b = this.barriers[i];
      if (!b.active) {
        this.barriers.splice(i, 1);
        continue;
      }

      b.x += b.direction * b.speed * dt;
      b.pulsePhase += dt * 4;

      const offscreenLeft = b.direction === -1 && b.x + b.width < -50;
      const offscreenRight = b.direction === 1 && b.x > this.canvasWidth + 50;
      if (offscreenLeft || offscreenRight) {
        b.active = false;
      }
    }
  }

  checkCollision(playerX: number, playerY: number, playerRadius: number): Barrier | null {
    for (const b of this.barriers) {
      if (!b.active) continue;
      const closestX = Math.max(b.x, Math.min(playerX, b.x + b.width));
      const closestY = Math.max(b.y, Math.min(playerY, b.y + b.height));
      const dx = playerX - closestX;
      const dy = playerY - closestY;
      if (dx * dx + dy * dy < playerRadius * playerRadius) {
        return b;
      }
    }
    return null;
  }

  clearInRadius(centerX: number, centerY: number, radius: number): number {
    let cleared = 0;
    for (const b of this.barriers) {
      if (!b.active) continue;
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      const dx = bx - centerX;
      const dy = by - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        b.active = false;
        cleared++;
      }
    }
    return cleared;
  }

  clearAll(): number {
    const count = this.barriers.filter(b => b.active).length;
    for (const b of this.barriers) {
      b.active = false;
    }
    return count;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const b of this.barriers) {
      if (!b.active) continue;

      const pulse = 0.6 + Math.sin(b.pulsePhase) * 0.4;

      ctx.save();

      const glowGradient = ctx.createRadialGradient(
        b.x + b.width / 2, b.y + b.height / 2, 0,
        b.x + b.width / 2, b.y + b.height / 2, b.width * 0.6
      );
      glowGradient.addColorStop(0, `rgba(120, 0, 200, ${0.25 * pulse})`);
      glowGradient.addColorStop(0.5, `rgba(80, 0, 150, ${0.1 * pulse})`);
      glowGradient.addColorStop(1, 'rgba(60, 0, 100, 0)');

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.roundRect(b.x - 20, b.y - 10, b.width + 40, b.height + 20, 10);
      ctx.fill();

      ctx.shadowColor = `rgba(180, 80, 255, ${0.6 * pulse})`;
      ctx.shadowBlur = 20;

      const bodyGradient = ctx.createLinearGradient(b.x, b.y, b.x + b.width, b.y + b.height);
      bodyGradient.addColorStop(0, `rgba(61, 0, 102, ${0.7 + 0.1 * pulse})`);
      bodyGradient.addColorStop(0.5, `rgba(90, 20, 140, ${0.75 + 0.1 * pulse})`);
      bodyGradient.addColorStop(1, `rgba(61, 0, 102, ${0.7 + 0.1 * pulse})`);

      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.width, b.height, 6);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(200, 100, 255, ${0.5 + 0.3 * pulse})`;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.width, b.height, 6);
      ctx.stroke();

      ctx.lineWidth = 1;
      const lineCount = 4;
      for (let i = 1; i < lineCount; i++) {
        const lineY = b.y + (b.height * i) / lineCount;
        const offset = Math.sin(b.pulsePhase + i) * 3;
        ctx.strokeStyle = `rgba(180, 80, 255, ${0.2 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(b.x + 8, lineY + offset);
        ctx.lineTo(b.x + b.width - 8, lineY - offset);
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}
