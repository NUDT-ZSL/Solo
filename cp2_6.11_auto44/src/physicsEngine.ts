import {
  Marble,
  Track,
  Point,
  Particle,
  MarbleType,
  generateId,
  distance,
  segmentLength,
  pointOnSegment,
  DEFAULT_NODE_INTERVAL,
  COLLISION_DISTANCE,
  COLLISION_COOLDOWN,
  PARTICLE_COUNT_MIN,
  PARTICLE_COUNT_MAX,
  PARTICLE_LIFE,
  GRAVITY,
  MARBLE_RADIUS,
  getMarbleColorHex,
  clamp,
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
  private collisionCooldowns: Map<string, number> = new Map();
  private onTriggerCallback: ((event: TriggerEvent) => void) | null = null;

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
      velocity: 0,
      position: startPos,
      active: true,
      direction: 1,
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
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: PARTICLE_LIFE * (0.7 + Math.random() * 0.6),
        maxLife: PARTICLE_LIFE,
        color,
        size: 1.5 + Math.random() * 3,
        angle,
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
    if (now - lastTrigger < 80) return;
    this.lastTriggerTimes.set(key, now);

    node.triggered = true;
    node.triggerTime = now;
    node.triggerColor = getMarbleColorHex(marble.type);

    let harmonyWith: MarbleType | undefined;
    for (const other of this.marbles) {
      if (other.id === marble.id || !other.active) continue;
      if (other.trackId !== marble.trackId) continue;
      if (other.currentNodeIndex === nodeIndex || other.currentNodeIndex === nodeIndex - 1) {
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
          const collisionKey = [a.id, b.id].sort().join('_');
          const lastCollision = this.collisionCooldowns.get(collisionKey) || 0;
          if (now - lastCollision < COLLISION_COOLDOWN) continue;
          this.collisionCooldowns.set(collisionKey, now);

          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const len = Math.max(dist, 0.01);
          const nx = dx / len;
          const ny = dy / len;

          const tempTrackId = a.trackId;
          const tempNodeIdx = a.currentNodeIndex;
          const tempProg = a.progress;

          a.trackId = b.trackId;
          a.currentNodeIndex = b.currentNodeIndex;
          a.progress = Math.max(0, b.progress - 0.1);

          b.trackId = tempTrackId;
          b.currentNodeIndex = tempNodeIdx;
          b.progress = Math.min(1, tempProg + 0.1);

          a.velocity *= 0.7;
          b.velocity *= 0.7;

          const pushDist = (COLLISION_DISTANCE - dist) / 2 + 2;
          a.position.x -= nx * pushDist;
          a.position.y -= ny * pushDist;
          b.position.x += nx * pushDist;
          b.position.y += ny * pushDist;

          this.emitParticles(
            { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 },
            '#FFFFFF'
          );
          this.emitParticles(a.position, getMarbleColorHex(a.type));
          this.emitParticles(b.position, getMarbleColorHex(b.type));

          if (this.onTriggerCallback) {
            this.onTriggerCallback({
              trackId: a.trackId,
              nodeIndex: a.currentNodeIndex,
              marbleType: a.type,
              noteIndex: -1,
              position: { x: (a.position.x + b.position.x) / 2, y: (a.position.y + b.position.y) / 2 },
              isCollision: true,
            });
          }
        }
      }
    }
  }

  update(deltaMs: number): void {
    const now = performance.now();
    const deltaSec = deltaMs / 1000;

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

      const fromNode = track.nodes[marble.currentNodeIndex];
      const toNode = track.nodes[marble.currentNodeIndex + 1];
      const segLen = segmentLength(fromNode.position, toNode.position);
      const segLenClamped = Math.max(segLen, 10);

      const dy = toNode.position.y - fromNode.position.y;
      const gravityComponent = (dy / segLenClamped) * GRAVITY * deltaSec;
      marble.velocity += gravityComponent;

      const friction = 0.998;
      marble.velocity *= friction;

      const maxVelocity = segLenClamped / (this.nodeInterval * 1000) * 3;
      marble.velocity = clamp(marble.velocity, 20, maxVelocity);

      const progressIncrement = (marble.velocity * deltaMs) / segLenClamped;
      marble.progress += progressIncrement;

      while (marble.progress >= 1 && marble.currentNodeIndex < totalNodes - 1) {
        marble.progress -= 1;
        marble.currentNodeIndex += 1;
        this.triggerNode(marble, marble.currentNodeIndex, now);

        if (marble.currentNodeIndex >= totalNodes - 1) {
          marble.active = false;
          break;
        }

        const nextFrom = track.nodes[marble.currentNodeIndex];
        const nextTo = track.nodes[marble.currentNodeIndex + 1];
        const nextLen = segmentLength(nextFrom.position, nextTo.position);
        const nextDy = nextTo.position.y - nextFrom.position.y;
        const nextGravity = (nextDy / Math.max(nextLen, 10)) * GRAVITY * deltaSec;
        marble.velocity += nextGravity;
        marble.velocity = clamp(marble.velocity, 20, maxVelocity);
      }

      if (!marble.active) continue;

      const from = track.nodes[marble.currentNodeIndex].position;
      const to = track.nodes[marble.currentNodeIndex + 1].position;
      marble.position = pointOnSegment(from, to, clamp(marble.progress, 0, 1));
    }

    this.checkCollisions(now);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.vy += 0.05;
      p.life -= deltaMs;
      p.angle += 0.1;
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
