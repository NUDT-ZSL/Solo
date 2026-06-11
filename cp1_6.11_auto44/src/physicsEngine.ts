import { Point, Track, Marble, CONFIG, THIRD_INTERVAL_OFFSETS, MarbleType } from './constants';

export interface NodeTriggerEvent {
  marble: Marble;
  trackId: string;
  nodeId: string;
  noteIndex: number;
}

export interface HarmonyEvent {
  marbleType1: MarbleType;
  marbleType2: MarbleType;
  baseNoteIndex: number;
  interval: number;
  startNote: number;
  trackId: string;
}

export interface CollisionEvent {
  position: Point;
  marble1: Marble;
  marble2: Marble;
  startNote: number;
}

export class PhysicsEngine {
  private tracks: Track[] = [];
  private marbles: Marble[] = [];
  private noteInterval: number = CONFIG.DEFAULT_NOTE_INTERVAL;

  private nodeTriggerListeners: ((e: NodeTriggerEvent) => void)[] = [];
  private harmonyListeners: ((e: HarmonyEvent) => void)[] = [];
  private collisionListeners: ((e: CollisionEvent) => void)[] = [];
  private marbleEndListeners: ((marble: Marble) => void)[] = [];

  private triggeredNodesThisFrame: Map<string, { marbleType: MarbleType; noteIndex: number; startNote: number }[]> = new Map();
  private pendingCollisions: Set<string> = new Set();

  public setTracks(tracks: Track[]): void {
    this.tracks = tracks;
  }

  public setMarbles(marbles: Marble[]): void {
    this.marbles = marbles;
  }

  public getMarbles(): Marble[] {
    return this.marbles;
  }

  public setNoteInterval(interval: number): void {
    this.noteInterval = Math.max(CONFIG.MIN_NOTE_INTERVAL, Math.min(CONFIG.MAX_NOTE_INTERVAL, interval));
  }

  public getNoteInterval(): number {
    return this.noteInterval;
  }

  public onNodeTrigger(listener: (e: NodeTriggerEvent) => void): void {
    this.nodeTriggerListeners.push(listener);
  }

  public onHarmony(listener: (e: HarmonyEvent) => void): void {
    this.harmonyListeners.push(listener);
  }

  public onCollision(listener: (e: CollisionEvent) => void): void {
    this.collisionListeners.push(listener);
  }

  public onMarbleEnd(listener: (marble: Marble) => void): void {
    this.marbleEndListeners.push(listener);
  }

  private getTrackLengths(track: Track): { cumulative: number[]; total: number } {
    const cumulative: number[] = [0];
    let total = 0;

    for (let i = 1; i < track.nodes.length; i++) {
      const dx = track.nodes[i].position.x - track.nodes[i - 1].position.x;
      const dy = track.nodes[i].position.y - track.nodes[i - 1].position.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      total += segLen;
      cumulative.push(total);
    }

    return { cumulative, total };
  }

  public launchMarble(marble: Marble, trackId: string): boolean {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track || track.nodes.length === 0) return false;

    marble.trackId = trackId;
    marble.nodeIndex = 0;
    marble.progress = 0;
    marble.isMoving = true;
    marble.lastTriggeredNodeId = null;
    marble.position = { ...track.nodes[0].position };
    marble.velocity = { x: 0, y: 0 };

    return true;
  }

  public update(deltaTime: number): void {
    this.triggeredNodesThisFrame.clear();
    this.pendingCollisions.clear();

    for (const marble of this.marbles) {
      if (!marble.isMoving || !marble.trackId) continue;
      this.updateMarbleAlongTrack(marble, deltaTime);
    }

    this.detectAndProcessHarmonies();
    this.detectAndProcessCollisions();
  }

  private updateMarbleAlongTrack(marble: Marble, deltaTime: number): void {
    const track = this.tracks.find(t => t.id === marble.trackId);
    if (!track) return;

    const { cumulative, total } = this.getTrackLengths(track);

    const avgSegmentLength = total / Math.max(1, track.nodes.length - 1);
    const speed = avgSegmentLength / this.noteInterval;

    marble.progress += speed * deltaTime;

    while (marble.progress >= total && marble.nodeIndex < track.nodes.length - 1) {
      marble.nodeIndex++;
      marble.progress = total;
      break;
    }

    if (marble.progress >= total) {
      this.triggerNodeIfNeeded(marble, track, track.nodes.length - 1);
      marble.isMoving = false;
      marble.position = { ...track.nodes[track.nodes.length - 1].position };
      this.marbleEndListeners.forEach(l => l(marble));
      return;
    }

    let currentSegment = 0;
    for (let i = 1; i < cumulative.length; i++) {
      if (marble.progress <= cumulative[i]) {
        currentSegment = i - 1;
        break;
      }
      currentSegment = i - 1;
    }

    const segmentStart = cumulative[currentSegment];
    const segmentEnd = cumulative[currentSegment + 1];
    const segmentProgress = segmentEnd === segmentStart
      ? 1
      : (marble.progress - segmentStart) / (segmentEnd - segmentStart);

    const startNode = track.nodes[currentSegment];
    const endNode = track.nodes[currentSegment + 1];

    marble.position = {
      x: startNode.position.x + (endNode.position.x - startNode.position.x) * segmentProgress,
      y: startNode.position.y + (endNode.position.y - startNode.position.y) * segmentProgress
    };

    const dx = endNode.position.x - startNode.position.x;
    const dy = endNode.position.y - startNode.position.y;
    const segLen = Math.sqrt(dx * dx + dy * dy) || 1;
    marble.velocity = {
      x: (dx / segLen) * speed,
      y: (dy / segLen) * speed
    };

    this.triggerNodeIfNeeded(marble, track, currentSegment);

    if (segmentProgress >= 0.5) {
      this.triggerNodeIfNeeded(marble, track, currentSegment + 1);
    }
  }

  private triggerNodeIfNeeded(marble: Marble, track: Track, nodeIdx: number): void {
    if (nodeIdx < 0 || nodeIdx >= track.nodes.length) return;

    const node = track.nodes[nodeIdx];
    const uniqueKey = `${marble.id}_${node.id}`;
    if (marble.lastTriggeredNodeId === node.id) return;

    const nodePos = node.position;
    const dist = this.distance(marble.position, nodePos);
    const threshold = CONFIG.NODE_RADIUS + 4;

    if (dist <= threshold || nodeIdx === track.nodes.length - 1) {
      marble.lastTriggeredNodeId = node.id;

      const triggerKey = `${track.id}_${node.id}`;
      if (!this.triggeredNodesThisFrame.has(triggerKey)) {
        this.triggeredNodesThisFrame.set(triggerKey, []);
      }
      this.triggeredNodesThisFrame.get(triggerKey)!.push({
        marbleType: marble.type,
        noteIndex: node.noteIndex,
        startNote: track.startNote
      });

      this.nodeTriggerListeners.forEach(l => l({
        marble,
        trackId: track.id,
        nodeId: node.id,
        noteIndex: node.noteIndex
      }));
    }
  }

  private detectAndProcessHarmonies(): void {
    for (const [key, triggers] of this.triggeredNodesThisFrame.entries()) {
      if (triggers.length < 2) continue;

      const [trackId, nodeId] = key.split('_');
      const track = this.tracks.find(t => t.id === trackId);
      if (!track) continue;

      const node = track.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const nodeIndex = track.nodes.indexOf(node);

      for (let i = 0; i < triggers.length; i++) {
        for (let j = i + 1; j < triggers.length; j++) {
          const t1 = triggers[i];
          const t2 = triggers[j];
          if (t1.marbleType === t2.marbleType) continue;

          const isAdjacentOnTrack = this.checkAdjacentNodeCoincidence(trackId, nodeIndex, t1.marbleType, t2.marbleType);
          if (isAdjacentOnTrack) {
            const interval = THIRD_INTERVAL_OFFSETS[Math.floor(Math.random() * THIRD_INTERVAL_OFFSETS.length)];
            this.harmonyListeners.forEach(l => l({
              marbleType1: t1.marbleType,
              marbleType2: t2.marbleType,
              baseNoteIndex: t1.noteIndex,
              interval,
              startNote: track.startNote,
              trackId
            }));
          }
        }
      }
    }
  }

  private checkAdjacentNodeCoincidence(
    trackId: string,
    nodeIndex: number,
    type1: MarbleType,
    type2: MarbleType
  ): boolean {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return false;

    const indicesToCheck = [nodeIndex, Math.max(0, nodeIndex - 1), Math.min(track.nodes.length - 1, nodeIndex + 1)];

    for (const idx of indicesToCheck) {
      const node = track.nodes[idx];
      const hasT1 = this.isMarbleTypeNearNode(type1, trackId, node.id);
      const hasT2 = this.isMarbleTypeNearNode(type2, trackId, node.id);
      if (hasT1 && hasT2) return true;
    }

    return false;
  }

  private isMarbleTypeNearNode(marbleType: MarbleType, trackId: string, nodeId: string): boolean {
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return false;

    const node = track.nodes.find(n => n.id === nodeId);
    if (!node) return false;

    for (const marble of this.marbles) {
      if (marble.type !== marbleType || marble.trackId !== trackId) continue;
      if (!marble.isMoving) continue;

      const dist = this.distance(marble.position, node.position);
      if (dist < CONFIG.NODE_RADIUS + CONFIG.MARBLE_RADIUS + 8) {
        return true;
      }
    }
    return false;
  }

  private detectAndProcessCollisions(): void {
    const activeMarbles = this.marbles.filter(m => m.isMoving && m.trackId);

    for (let i = 0; i < activeMarbles.length; i++) {
      for (let j = i + 1; j < activeMarbles.length; j++) {
        const m1 = activeMarbles[i];
        const m2 = activeMarbles[j];

        if (m1.trackId === m2.trackId) continue;
        if (m1.type === m2.type) continue;

        const collisionKey = this.getCollisionKey(m1.id, m2.id);
        if (this.pendingCollisions.has(collisionKey)) continue;

        const dist = this.distance(m1.position, m2.position);
        if (dist <= CONFIG.COLLISION_DISTANCE) {
          this.pendingCollisions.add(collisionKey);
          this.processCollision(m1, m2);
        }
      }
    }
  }

  private getCollisionKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
  }

  private processCollision(m1: Marble, m2: Marble): void {
    const collisionPos: Point = {
      x: (m1.position.x + m2.position.x) / 2,
      y: (m1.position.y + m2.position.y) / 2
    };

    const otherTracks = this.tracks.filter(t => t.id !== m1.trackId && t.id !== m2.trackId);
    const allTracks = this.tracks;

    const shouldSwap = Math.random() > 0.4;

    if (shouldSwap && allTracks.length >= 2) {
      this.swapMarblesAtCollision(m1, m2, collisionPos);
    } else {
      this.deflectMarbles(m1, m2, collisionPos);
    }

    const track = allTracks.find(t => t.id === m1.trackId) || allTracks[0];
    this.collisionListeners.forEach(l => l({
      position: collisionPos,
      marble1: m1,
      marble2: m2,
      startNote: track ? track.startNote : 0
    }));
  }

  private swapMarblesAtCollision(m1: Marble, m2: Marble, collisionPos: Point): void {
    const t1Id = m1.trackId;
    const t2Id = m2.trackId;
    if (!t1Id || !t2Id) return;

    const track1 = this.tracks.find(t => t.id === t1Id);
    const track2 = this.tracks.find(t => t.id === t2Id);
    if (!track1 || !track2) return;

    const closestIdx1 = this.findClosestNodeIndex(track2, collisionPos);
    const closestIdx2 = this.findClosestNodeIndex(track1, collisionPos);

    this.transferMarbleToTrack(m1, track2, closestIdx1);
    this.transferMarbleToTrack(m2, track1, closestIdx2);
  }

  private transferMarbleToTrack(marble: Marble, newTrack: Track, startNodeIdx: number): void {
    if (startNodeIdx >= newTrack.nodes.length - 1) {
      marble.isMoving = false;
      this.marbleEndListeners.forEach(l => l(marble));
      return;
    }

    marble.trackId = newTrack.id;
    marble.nodeIndex = startNodeIdx;
    marble.lastTriggeredNodeId = null;

    const { cumulative, total } = this.getTrackLengths(newTrack);
    marble.progress = cumulative[startNodeIdx];

    const bounceProgress = Math.min(cumulative[startNodeIdx] + 20, total);
    marble.progress = bounceProgress;

    marble.isMoving = true;
  }

  private deflectMarbles(m1: Marble, m2: Marble, collisionPos: Point): void {
    const dx = m2.position.x - m1.position.x;
    const dy = m2.position.y - m1.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    m1.position.x -= nx * CONFIG.COLLISION_RESPONSE_FORCE;
    m1.position.y -= ny * CONFIG.COLLISION_RESPONSE_FORCE;
    m2.position.x += nx * CONFIG.COLLISION_RESPONSE_FORCE;
    m2.position.y += ny * CONFIG.COLLISION_RESPONSE_FORCE;

    m1.progress = Math.max(0, m1.progress - CONFIG.COLLISION_RESPONSE_FORCE * 1.5);
    m2.progress = Math.max(0, m2.progress - CONFIG.COLLISION_RESPONSE_FORCE * 1.5);
  }

  private findClosestNodeIndex(track: Track, point: Point): number {
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < track.nodes.length; i++) {
      const d = this.distance(track.nodes[i].position, point);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    return closestIdx;
  }

  public findNearestTrack(point: Point, radius: number = 30): { track: Track; nodeIndex: number } | null {
    let best: { track: Track; nodeIndex: number; dist: number } | null = null;

    for (const track of this.tracks) {
      for (let i = 0; i < track.nodes.length; i++) {
        const d = this.distance(track.nodes[i].position, point);
        if (d <= radius) {
          if (!best || d < best.dist) {
            best = { track, nodeIndex: i, dist: d };
          }
        }
      }
    }

    return best ? { track: best.track, nodeIndex: best.nodeIndex } : null;
  }

  public distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public pointInSegment(point: Point, start: Point, end: Point, thickness: number = 12): boolean {
    const L2 = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
    if (L2 === 0) return this.distance(point, start) <= thickness;

    let t = ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / L2;
    t = Math.max(0, Math.min(1, t));

    const proj = {
      x: start.x + t * (end.x - start.x),
      y: start.y + t * (end.y - start.y)
    };

    return this.distance(point, proj) <= thickness;
  }

  public findTrackAtPoint(point: Point): { track: Track; nodeIndex: number } | null {
    for (const track of this.tracks) {
      for (let i = 0; i < track.nodes.length; i++) {
        if (this.distance(track.nodes[i].position, point) <= CONFIG.NODE_HIT_RADIUS) {
          return { track, nodeIndex: i };
        }
      }

      for (let i = 0; i < track.nodes.length - 1; i++) {
        if (this.pointInSegment(point, track.nodes[i].position, track.nodes[i + 1].position)) {
          return { track, nodeIndex: i };
        }
      }
    }
    return null;
  }
}
