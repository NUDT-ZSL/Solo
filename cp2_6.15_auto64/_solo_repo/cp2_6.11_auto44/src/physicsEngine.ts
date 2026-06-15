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
  private baseVelocity: number = 200;

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
    this.baseVelocity = 80 / interval;
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
      velocity: this.baseVelocity,
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
      const speed = 1 + Math.random() * 3.5;
      const life = PARTICLE_LIFE * (0.6 + Math.random() * 0.8);
      this.particles.push({
        x: position.x + (Math.random() - 0.5) * 4,
        y: position.y + (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        size: 1 + Math.random() * 3.5,
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
      const nodeDiff = Math.abs(other.currentNodeIndex - nodeIndex);
      if ((nodeDiff === 0 && other.progress > 0.7) || (nodeDiff === 1 && other.progress < 0.3)) {
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

  private checkCrossTrackCollisions(now: number): void {
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

          const avgVel = (a.velocity + b.velocity) / 2;
          const tempTrackId = a.trackId;
          const tempNodeIdx = a.currentNodeIndex;
          const tempProg = a.progress;
          const tempPos = { ...a.position };

          a.trackId = b.trackId;
          a.currentNodeIndex = b.currentNodeIndex;
          a.progress = clamp(b.progress - 0.08, 0, 1);
          a.velocity = avgVel * 0.85;

          b.trackId = tempTrackId;
          b.currentNodeIndex = tempNodeIdx;
          b.progress = clamp(tempProg + 0.08, 0, 1);
          b.velocity = avgVel * 0.85;

          const overlapPush = (COLLISION_DISTANCE - dist) / 2 + 3;
          a.position = {
            x: tempPos.x - nx * overlapPush,
            y: tempPos.y - ny * overlapPush,
          };
          b.position = {
            x: b.position.x + nx * overlapPush,
            y: b.position.y + ny * overlapPush,
          };

          const midPoint = {
            x: (a.position.x + b.position.x) / 2,
            y: (a.position.y + b.position.y) / 2,
          };
          this.emitParticles(midPoint, '#FFFFFF');
          this.emitParticles(a.position, getMarbleColorHex(a.type));
          this.emitParticles(b.position, getMarbleColorHex(b.type));

          if (this.onTriggerCallback) {
            this.onTriggerCallback({
              trackId: a.trackId,
              nodeIndex: a.currentNodeIndex,
              marbleType: a.type,
              noteIndex: -1,
              position: midPoint,
              isCollision: true,
            });
          }
        }
      }
    }
  }

  private updateParticle(p: Particle, deltaMs: number): void {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.93;
    p.vy *= 0.93;
    p.vy += 0.03;
    p.life -= deltaMs;
    p.angle += 0.08 + Math.random() * 0.05;
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
      const segLenClamped = Math.max(segLen, 1);

      const dy = toNode.position.y - fromNode.position.y;
      const slopeFactor = dy / segLenClamped;
      const gravityAccel = GRAVITY * slopeFactor * deltaSec;
      marble.velocity += gravityAccel;

      const friction = Math.pow(0.999, deltaMs);
      marble.velocity *= friction;

      const maxVelocity = this.baseVelocity * 3;
      const minVelocity = this.baseVelocity * 0.3;
      marble.velocity = clamp(marble.velocity, minVelocity, maxVelocity);

      const distanceToTravel = marble.velocity * deltaSec;
      const progressIncrement = distanceToTravel / segLenClamped;
      marble.progress += progressIncrement;

      while (marble.progress >= 1 && marble.currentNodeIndex < totalNodes - 1) {
        marble.progress -= 1;
        marble.currentNodeIndex += 1;
        this.triggerNode(marble, marble.currentNodeIndex, now);

        if (marble.currentNodeIndex >= totalNodes - 1) {
          marble.active = false;
          break;
        }

        const nextFrom = track.nodes[marble.currentNodeIndex].position;
        const nextTo = track.nodes[marble.currentNodeIndex + 1].position;
        const nextSegLen = Math.max(segmentLength(nextFrom, nextTo), 1);
        const nextDy = nextTo.y - nextFrom.y;
        const nextSlope = nextDy / nextSegLen;
        marble.velocity += GRAVITY * nextSlope * deltaSec;
        marble.velocity = clamp(marble.velocity, minVelocity, maxVelocity);
      }

      if (!marble.active) continue;

      const from = track.nodes[marble.currentNodeIndex].position;
      const to = track.nodes[marble.currentNodeIndex + 1].position;
      marble.position = pointOnSegment(from, to, clamp(marble.progress, 0, 1));
    }

    this.checkCrossTrackCollisions(now);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.updateParticle(this.particles[i], deltaMs);
      if (this.particles[i].life <= 0) {
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
