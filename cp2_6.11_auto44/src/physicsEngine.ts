import {
  Marble,
  Track,
  Point,
  Particle,
  MarbleType,
  generateId,
  lerpPoint,
  distance,
  DEFAULT_NODE_INTERVAL,
  MARBLE_RADIUS,
  COLLISION_DISTANCE,
  PARTICLE_COUNT_MIN,
  PARTICLE_COUNT_MAX,
  PARTICLE_LIFE,
  getMarbleColorHex,
} from './constants';

export interface TriggerEvent {
  trackId: string;
  nodeIndex: number;
  marbleType: MarbleType;
  noteIndex: number;
  position: Point;
  harmonyWith?: MarbleType;
  isCollision?: boolean;
}

export class PhysicsEngine {
  private tracks: Track[] = [];
  private marbles: Marble[] = [];
  private particles: Particle[] = [];
  private nodeInterval: number = DEFAULT_NODE_INTERVAL;
  private lastTriggerTimes: Map<string, number> = new Map();
  private onTriggerCallback: ((event: TriggerEvent) => void) | null = null;

  constructor() {}

  setTracks(tracks: Track[]): void {
    this.tracks = tracks;
  }

  getTracks(): Track[] {
    return this.tracks;
  }

  getMarbles(): Marble[] {
    return this.marbles;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  setNodeInterval(interval: number): void {
    this.nodeInterval = interval;
  }

  getNodeInterval(): number {
    return this.nodeInterval;
  }

  onTrigger(callback: (event: TriggerEvent) => void): void {
    this.onTriggerCallback = callback;
  }

  spawnMarble(type: MarbleType, trackId: string): boolean {
    const activeCount = this.marbles.filter((m) => m.active).length;
    if (activeCount >= 4) return false;
    if (this.marbles.some((m) => m.active && m.type === type)) return false;

    const track = this.tracks.find((t) => t.id === trackId);
    if (!track || track.nodes.length < 2) return false;

    const startPos = { ...track.nodes[0].position };
    const marble: Marble = {
      id: generateId('marble'),
      type,
      trackId,
      currentNodeIndex: 0,
      progress: 0,
      speed: 1,
      position: startPos,
      active: true,
    };
    this.marbles.push(marble);
    return true;
  }

  removeMarble(id: string): void {
    this.marbles = this.marbles.filter((m) => m.id !== id);
  }

  clearMarbles(): void {
    this.marbles = [];
  }

  getActiveMarbleCount(): number {
    return this.marbles.filter((m) => m.active).length;
  }

  hasActiveMarbleOfType(type: MarbleType): boolean {
    return this.marbles.some((m) => m.active && m.type === type);
  }

  private emitParticles(position: Point, color: string): void {
    const count = PARTICLE_COUNT_MIN + Math.floor(Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN + 1));
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private triggerNode(marble: Marble, nodeIndex: number, now: number): void {
    const track = this.tracks.find((t) => t.id === marble.trackId);
    if (!track) return;

    const node = track.nodes[nodeIndex];
    if (!node) return;

    const key = `${marble.id}_${nodeIndex}`;
    const lastTrigger = this.lastTriggerTimes.get(key) || 0;
    if (now - lastTrigger < 100) return;
    this.lastTriggerTimes.set(key, now);

    node.triggered = true;
    node.triggerTime = now;
    node.triggerColor = getMarbleColorHex(marble.type);

    let harmonyWith: MarbleType | undefined;
    for (const other of this.marbles) {
      if (other.id === marble.id || !other.active) continue;
      if (other.trackId !== marble.trackId) continue;
      if (Math.abs(other.currentNodeIndex - nodeIndex) <= 1 && other.progress > 0.7) {
        harmonyWith = other.type;
        break;
      }
    }

    this.emitParticles(node.position, getMarbleColorHex(marble.type));

    if (this.onTriggerCallback) {
      this.onTriggerCallback({
        trackId: marble.trackId,
        nodeIndex,
        marbleType: marble.type,
        noteIndex: node.noteIndex,
        position: { ...node.position },
        harmonyWith,
      });
    }
  }

  private checkCollisions(now: number): void {
    for (let i = 0; i < this.marbles.length; i++) {
      for (let j = i + 1; j < this.marbles.length; j++) {
        const a = this.marbles[i];
        const b = this.marbles[j];
        if (!a.active || !b.active) continue;
        if (a.trackId === b.trackId) continue;

        const dist = distance(a.position, b.position);
        if (dist < COLLISION_DISTANCE) {
          const tempTrackId = a.trackId;
          const tempNodeIndex = a.currentNodeIndex;
          const tempProgress = a.progress;
          a.trackId = b.trackId;
          a.currentNodeIndex = b.currentNodeIndex;
          a.progress = b.progress;
          b.trackId = tempTrackId;
          b.currentNodeIndex = tempNodeIndex;
          b.progress = tempProgress;

          this.emitParticles(a.position, '#FFFFFF');
          this.emitParticles(b.position, '#FFFFFF');

          if (this.onTriggerCallback) {
            this.onTriggerCallback({
              trackId: a.trackId,
              nodeIndex: a.currentNodeIndex,
              marbleType: a.type,
              noteIndex: -1,
              position: { ...a.position },
              isCollision: true,
            });
          }
        }
      }
    }
  }

  update(deltaMs: number): void {
    const now = performance.now();

    for (const marble of this.marbles) {
      if (!marble.active) continue;

      const track = this.tracks.find((t) => t.id === marble.trackId);
      if (!track) {
        marble.active = false;
        continue;
      }

      const totalNodes = track.nodes.length;
      if (totalNodes < 2 || marble.currentNodeIndex >= totalNodes - 1) {
        marble.active = false;
        continue;
      }

      const intervalMs = this.nodeInterval * 1000;
      const increment = deltaMs / intervalMs;
      marble.progress += increment * marble.speed;

      while (marble.progress >= 1 && marble.currentNodeIndex < totalNodes - 1) {
        marble.progress -= 1;
        marble.currentNodeIndex += 1;
        this.triggerNode(marble, marble.currentNodeIndex, now);

        if (marble.currentNodeIndex >= totalNodes - 1) {
          marble.active = false;
          break;
        }
      }

      if (!marble.active) continue;

      const from = track.nodes[marble.currentNodeIndex].position;
      const to = track.nodes[marble.currentNodeIndex + 1].position;
      marble.position = lerpPoint(from, to, marble.progress);
    }

    this.checkCollisions(now);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= deltaMs;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.marbles = this.marbles.filter((m) => m.active);
  }

  getDominantMarbleType(): MarbleType | null {
    const active = this.marbles.filter((m) => m.active);
    if (active.length === 0) return null;
    const counts: Record<MarbleType, number> = { drum: 0, bass: 0, piano: 0, synth: 0 };
    active.forEach((m) => counts[m.type]++);
    let maxType: MarbleType | null = null;
    let maxCount = 0;
    (Object.keys(counts) as MarbleType[]).forEach((t) => {
      if (counts[t] > maxCount) {
        maxCount = counts[t];
        maxType = t;
      }
    });
    return maxType;
  }
}
