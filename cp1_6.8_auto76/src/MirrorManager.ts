export interface Phantom {
  x: number;
  y: number;
  opacity: number;
  scale: number;
  age: number;
  spawnTime: number;
}

interface TrailFrame {
  x: number;
  y: number;
  timestamp: number;
}

export class MirrorManager {
  phantoms: Phantom[];
  trailBuffer: TrailFrame[];
  delayMs: number;
  maxPhantoms: number;
  private lastSpawnTime: number;
  private spawnInterval: number;
  private phantomRadius: number;

  constructor() {
    this.phantoms = [];
    this.trailBuffer = [];
    this.delayMs = 1000;
    this.maxPhantoms = 3;
    this.lastSpawnTime = 0;
    this.spawnInterval = 2000;
    this.phantomRadius = 10;
  }

  recordPosition(x: number, y: number, timestamp: number): void {
    this.trailBuffer.push({ x, y, timestamp });
    const cutoff = timestamp - this.delayMs - 500;
    while (this.trailBuffer.length > 0 && this.trailBuffer[0].timestamp < cutoff) {
      this.trailBuffer.shift();
    }
  }

  trySpawnPhantom(x: number, y: number, timestamp: number): void {
    if (this.phantoms.length >= this.maxPhantoms) return;
    if (timestamp - this.lastSpawnTime < this.spawnInterval) return;
    this.phantoms.push({
      x,
      y,
      opacity: 0.4,
      scale: 1,
      age: 0,
      spawnTime: timestamp,
    });
    this.lastSpawnTime = timestamp;
  }

  update(dt: number, currentTimestamp: number): void {
    const targetPos = this.getDelayedPosition(currentTimestamp - this.delayMs);

    for (const phantom of this.phantoms) {
      phantom.age += dt * 1000;
      phantom.opacity = 0.3 + 0.15 * Math.sin(phantom.age * 0.003);
      phantom.scale = 1 + 0.1 * Math.sin(phantom.age * 0.004);

      if (targetPos) {
        const dx = targetPos.x - phantom.x;
        const dy = targetPos.y - phantom.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const speed = 150;
          const moveAmount = Math.min(speed * dt, dist);
          phantom.x += (dx / dist) * moveAmount;
          phantom.y += (dy / dist) * moveAmount;
        }
      }
    }

    this.phantoms = this.phantoms.filter(p => p.age < 15000);
  }

  checkCollisionWith(bx: number, by: number, bRadius: number): boolean {
    for (const phantom of this.phantoms) {
      const dx = bx - phantom.x;
      const dy = by - phantom.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bRadius + this.phantomRadius * phantom.scale) {
        return true;
      }
    }
    return false;
  }

  getDelayedPosition(targetTime: number): { x: number; y: number } | null {
    if (this.trailBuffer.length === 0) return null;

    let closest = this.trailBuffer[0];
    let minDiff = Math.abs(this.trailBuffer[0].timestamp - targetTime);

    for (let i = 1; i < this.trailBuffer.length; i++) {
      const diff = Math.abs(this.trailBuffer[i].timestamp - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = this.trailBuffer[i];
      }
    }

    return { x: closest.x, y: closest.y };
  }

  clear(): void {
    this.phantoms = [];
    this.trailBuffer = [];
    this.lastSpawnTime = 0;
  }
}
