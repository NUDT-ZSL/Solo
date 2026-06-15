import { TrackSegment, Hazard, Particle, ItemPickup, ItemType } from './types';

export class HazardManager {
  hazards: Hazard[] = [];
  items: ItemPickup[] = [];
  spawnTimer: number = 0;
  itemSpawnTimer: number = 0;
  crackTimer: number = 0;
  particles: Particle[] = [];

  update(track: TrackSegment[], dt: number): Particle[] {
    this.particles = [];

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 1.5 + Math.random() * 2;
      this.spawnRock(track);
    }

    this.crackTimer -= dt;
    if (this.crackTimer <= 0) {
      this.crackTimer = 4 + Math.random() * 3;
      this.spawnCrack(track);
    }

    this.itemSpawnTimer -= dt;
    if (this.itemSpawnTimer <= 0) {
      this.itemSpawnTimer = 3 + Math.random() * 2;
      this.spawnItem(track);
    }

    for (const h of this.hazards) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rotation += h.rotSpeed * dt;
      h.life -= dt;

      if (h.type === 'rock') {
        for (let i = 0; i < 2; i++) {
          this.particles.push({
            x: h.x + (Math.random() - 0.5) * h.radius,
            y: h.y + (Math.random() - 0.5) * h.radius,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 60 - 30,
            life: 0.6,
            maxLife: 0.6,
            color: Math.random() > 0.5 ? '#ff4400' : '#ff8800',
            size: 2 + Math.random() * 4,
            kind: 'fire',
          });
        }
      }
    }

    this.hazards = this.hazards.filter(h => h.life > 0);

    for (const item of this.items) {
      if (item.collected) {
        item.respawn -= dt;
        if (item.respawn <= 0) {
          item.collected = false;
          item.type = Math.random() > 0.5 ? 'nitro' : 'shield';
        }
      }
    }

    return this.particles;
  }

  private spawnRock(track: TrackSegment[]) {
    const idx = Math.floor(Math.random() * track.length);
    const seg = track[idx];
    const perpAngle = seg.angle + Math.PI / 2;
    const offset = (Math.random() - 0.5) * seg.width * 0.6;

    this.hazards.push({
      type: 'rock',
      x: seg.center.x + Math.cos(perpAngle) * offset,
      y: seg.center.y + Math.sin(perpAngle) * offset,
      vx: Math.cos(seg.angle) * (60 + Math.random() * 40),
      vy: Math.sin(seg.angle) * (60 + Math.random() * 40),
      radius: 12 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 6,
      life: 5 + Math.random() * 4,
      maxLife: 9,
    });
  }

  private spawnCrack(track: TrackSegment[]) {
    const idx = Math.floor(Math.random() * track.length);
    const seg = track[idx];
    const perpAngle = seg.angle + Math.PI / 2;
    const offset = (Math.random() - 0.5) * seg.width * 0.3;

    this.hazards.push({
      type: 'crack',
      x: seg.center.x + Math.cos(perpAngle) * offset,
      y: seg.center.y + Math.sin(perpAngle) * offset,
      vx: 0,
      vy: 0,
      radius: 20 + Math.random() * 15,
      rotation: seg.angle + (Math.random() - 0.5) * 0.5,
      rotSpeed: 0,
      life: 6 + Math.random() * 4,
      maxLife: 10,
    });
  }

  private spawnItem(track: TrackSegment[]) {
    if (this.items.filter(i => !i.collected).length >= 5) return;
    const idx = Math.floor(Math.random() * track.length);
    const seg = track[idx];
    const perpAngle = seg.angle + Math.PI / 2;
    const offset = (Math.random() - 0.5) * seg.width * 0.4;

    this.items.push({
      x: seg.center.x + Math.cos(perpAngle) * offset,
      y: seg.center.y + Math.sin(perpAngle) * offset,
      type: Math.random() > 0.5 ? 'nitro' : 'shield',
      radius: 14,
      segIdx: idx,
      collected: false,
      respawn: 0,
    });
  }

  collectItem(vx: number, vy: number, currentItem: ItemType): { collected: boolean; type: ItemType } {
    if (currentItem !== null) return { collected: false, type: null };

    for (const item of this.items) {
      if (item.collected) continue;
      const dx = vx - item.x;
      const dy = vy - item.y;
      if (dx * dx + dy * dy < item.radius * item.radius * 4) {
        item.collected = true;
        item.respawn = 8;
        return { collected: true, type: item.type };
      }
    }
    return { collected: false, type: null };
  }

  checkHazardCollision(vx: number, vy: number, radius: number, hasShield: boolean): boolean {
    for (const h of this.hazards) {
      const dx = vx - h.x;
      const dy = vy - h.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = radius + h.radius * (h.type === 'crack' ? 0.5 : 0.7);
      if (dist < minDist) {
        if (hasShield) return false;
        return true;
      }
    }
    return false;
  }
}
