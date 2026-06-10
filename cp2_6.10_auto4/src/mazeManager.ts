export interface CrackLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
}

export interface CrackAnimation {
  originX: number;
  originY: number;
  startTime: number;
  duration: number;
  lines: CrackLine[];
}

export interface PathParticle {
  t: number;
  speed: number;
  size: number;
  alpha: number;
}

export interface LightPath {
  fromShardId: number;
  toShardId: number;
  startTime: number;
  particles: PathParticle[];
}

export interface RippleAnimation {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
  colorHue: number;
}

export interface BreakParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

export interface StarDust {
  x: number;
  y: number;
  size: number;
  alpha: number;
  driftSpeed: { x: number; y: number };
}

export interface MirrorShard {
  id: number;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  targetRotation: number;
  baseRotation: number;
  baseX: number;
  baseY: number;
  isDragging: boolean;
  isSnapping: boolean;
  dragOffset: number;
  neighbors: number[];
  crackAnim: CrackAnimation | null;
  edgeGlowIntensity: number;
  edgeGlowPhase: number;
  clickPivotX?: number;
  clickPivotY?: number;
  origCenterX?: number;
  origCenterY?: number;
  origRotation?: number;
  pivotOffsetX?: number;
  pivotOffsetY?: number;
  startMouseAngle?: number;
  snapStartX?: number;
  snapStartY?: number;
}

export interface LevelTransition {
  active: boolean;
  startTime: number;
  duration: number;
  phase: 'fadeIn' | 'hold' | 'fadeOut';
}

const ALIGN_THRESHOLD = 5 * Math.PI / 180;
const SNAP_DURATION = 250;
const BOUNCE_DURATION = 350;

export class MazeManager {
  shards: MirrorShard[] = [];
  paths: Map<string, LightPath> = new Map();
  ripples: RippleAnimation[] = [];
  breakParticles: BreakParticle[] = [];
  starDust: StarDust[] = [];
  level = 1;
  canvasWidth = 0;
  canvasHeight = 0;
  shardRadius = 55;
  levelTransition: LevelTransition = { active: false, startTime: 0, duration: 1500, phase: 'fadeIn' };
  activatedLoopShards: Set<number> = new Set();
  private previousRotations: Map<number, number> = new Map();

  private pathKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  private normalizeAngleDiff(a: number, b: number): number {
    let diff = Math.abs(a - b);
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
    return Math.min(diff, Math.PI - diff);
  }

  init(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.generateStarDust();
    this.generateLevel(1);
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.generateStarDust();
  }

  private generateStarDust(): void {
    this.starDust = [];
    const count = Math.floor((this.canvasWidth * this.canvasHeight) / 12000);
    for (let i = 0; i < count; i++) {
      this.starDust.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: 1 + Math.random() * 2,
        alpha: 0.15 + Math.random() * 0.45,
        driftSpeed: {
          x: (Math.random() - 0.5) * 0.015,
          y: (Math.random() - 0.5) * 0.015
        }
      });
    }
  }

  generateLevel(levelNum: number): void {
    this.level = levelNum;
    this.shards = [];
    this.paths.clear();
    this.ripples = [];
    this.breakParticles = [];
    this.activatedLoopShards.clear();
    this.levelTransition = { active: false, startTime: 0, duration: 1500, phase: 'fadeIn' };

    const targetShardCount = Math.min(200, 40 + levelNum * 10);
    const area = this.canvasWidth * this.canvasHeight;
    this.shardRadius = Math.max(28, Math.sqrt(area / (targetShardCount * 1.3)));

    const hexW = this.shardRadius * 2;
    const hexH = Math.sqrt(3) * this.shardRadius;
    const horizSpacing = hexW * 0.78;
    const vertSpacing = hexH;

    let id = 0;
    const cols = Math.ceil(this.canvasWidth / horizSpacing) + 2;
    const rows = Math.ceil(this.canvasHeight / vertSpacing) + 2;
    const offsetX = -this.shardRadius * 0.5;
    const offsetY = -this.shardRadius * 0.5;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * horizSpacing + (row % 2 === 0 ? 0 : horizSpacing / 2);
        const y = offsetY + row * vertSpacing;

        const jitterX = (Math.random() - 0.5) * this.shardRadius * 0.25;
        const jitterY = (Math.random() - 0.5) * this.shardRadius * 0.25;

        const cx = x + jitterX;
        const cy = y + jitterY;

        if (cx < -this.shardRadius * 1.2 || cx > this.canvasWidth + this.shardRadius * 1.2) continue;
        if (cy < -this.shardRadius * 1.2 || cy > this.canvasHeight + this.shardRadius * 1.2) continue;

        let baseRot = (Math.floor(Math.random() * 6)) * (Math.PI / 3);
        if (this.previousRotations.has(id)) {
          const prev = this.previousRotations.get(id) as number;
          baseRot = prev + (Math.random() - 0.5) * 0.3;
        }

        this.shards.push({
          id: id++,
          x: cx,
          y: cy,
          radius: this.shardRadius,
          rotation: baseRot + (Math.random() - 0.5) * 0.6,
          targetRotation: baseRot,
          baseRotation: baseRot,
          baseX: cx,
          baseY: cy,
          isDragging: false,
          isSnapping: false,
          dragOffset: 0,
          neighbors: [],
          crackAnim: null,
          edgeGlowIntensity: 0,
          edgeGlowPhase: 0
        });
      }
    }

    this.buildNeighbors();
  }

  private buildNeighbors(): void {
    for (let i = 0; i < this.shards.length; i++) {
      this.shards[i].neighbors = [];
    }
    const distThreshold = this.shardRadius * 2.1;
    for (let i = 0; i < this.shards.length; i++) {
      for (let j = i + 1; j < this.shards.length; j++) {
        const dx = this.shards[i].x - this.shards[j].x;
        const dy = this.shards[i].y - this.shards[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < distThreshold) {
          this.shards[i].neighbors.push(this.shards[j].id);
          this.shards[j].neighbors.push(this.shards[i].id);
        }
      }
    }
  }

  getShardAt(x: number, y: number): MirrorShard | null {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      const dx = x - s.x;
      const dy = y - s.y;
      if (dx * dx + dy * dy <= s.radius * s.radius * 0.9) {
        return s;
      }
    }
    return null;
  }

  startDrag(shard: MirrorShard, mouseX: number, mouseY: number): void {
    shard.isDragging = true;
    shard.isSnapping = false;
    shard.clickPivotX = mouseX;
    shard.clickPivotY = mouseY;
    shard.origCenterX = shard.x;
    shard.origCenterY = shard.y;
    shard.origRotation = shard.rotation;
    shard.pivotOffsetX = mouseX - shard.x;
    shard.pivotOffsetY = mouseY - shard.y;
    shard.startMouseAngle = Math.atan2(mouseY - mouseY, mouseX - mouseX);
  }

  updateDrag(shard: MirrorShard, mouseX: number, mouseY: number): void {
    if (!shard.isDragging) return;
    if (shard.clickPivotX === undefined || shard.clickPivotY === undefined ||
        shard.origRotation === undefined || shard.pivotOffsetX === undefined ||
        shard.pivotOffsetY === undefined || shard.startMouseAngle === undefined) return;

    const currentAngle = Math.atan2(mouseY - shard.clickPivotY, mouseX - shard.clickPivotX);
    const deltaAngle = currentAngle - shard.startMouseAngle;

    shard.rotation = shard.origRotation + deltaAngle;

    const cos = Math.cos(deltaAngle);
    const sin = Math.sin(deltaAngle);
    const rotatedDx = shard.pivotOffsetX * cos - shard.pivotOffsetY * sin;
    const rotatedDy = shard.pivotOffsetX * sin + shard.pivotOffsetY * cos;
    shard.x = shard.clickPivotX - rotatedDx;
    shard.y = shard.clickPivotY - rotatedDy;

    shard.edgeGlowPhase = Math.min(1, shard.edgeGlowPhase + 0.08);
  }

  endDrag(shard: MirrorShard, now: number): { aligned: boolean; broken: boolean } {
    if (!shard.isDragging) return { aligned: false, broken: false };
    shard.isDragging = false;

    let bestNeighbor: MirrorShard | null = null;
    let bestDiff = Infinity;

    for (const nid of shard.neighbors) {
      const neighbor = this.shards.find(s => s.id === nid);
      if (!neighbor) continue;
      const diff = this.normalizeAngleDiff(shard.rotation, neighbor.rotation);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestNeighbor = neighbor;
      }
    }

    shard.snapStartX = shard.x;
    shard.snapStartY = shard.y;

    if (bestNeighbor && bestDiff < ALIGN_THRESHOLD) {
      const snapRot = bestNeighbor.rotation;
      shard.targetRotation = snapRot;
      shard.isSnapping = true;
      shard.edgeGlowPhase = 1;
      return { aligned: true, broken: false };
    } else {
      shard.targetRotation = shard.baseRotation;
      shard.isSnapping = true;
      this.spawnBreakParticles(shard.x, shard.y);
      return { aligned: false, broken: true };
    }
  }

  triggerCrack(shard: MirrorShard, mouseX: number, mouseY: number, now: number): void {
    if (shard.crackAnim && now - shard.crackAnim.startTime < shard.crackAnim.duration * 0.6) return;
    const localX = mouseX - shard.x;
    const localY = mouseY - shard.y;
    const lineCount = 5 + Math.floor(Math.random() * 4);
    const lines: CrackLine[] = [];
    for (let i = 0; i < lineCount; i++) {
      const angle = (Math.PI * 2 * i) / lineCount + (Math.random() - 0.5) * 0.6;
      const len = shard.radius * (0.4 + Math.random() * 0.55);
      lines.push({
        startX: localX,
        startY: localY,
        endX: localX + Math.cos(angle) * len,
        endY: localY + Math.sin(angle) * len,
        progress: 0
      });
    }
    shard.crackAnim = {
      originX: localX,
      originY: localY,
      startTime: now,
      duration: 900,
      lines
    };
  }

  addPath(shardA: MirrorShard, shardB: MirrorShard, now: number): boolean {
    const key = this.pathKey(shardA.id, shardB.id);
    if (this.paths.has(key)) return false;
    const particles: PathParticle[] = [];
    const pCount = 6;
    for (let i = 0; i < pCount; i++) {
      particles.push({
        t: Math.random(),
        speed: 0.0025 + Math.random() * 0.0025,
        size: 1.5 + Math.random() * 2,
        alpha: 0.5 + Math.random() * 0.5
      });
    }
    this.paths.set(key, {
      fromShardId: shardA.id,
      toShardId: shardB.id,
      startTime: now,
      particles
    });
    return true;
  }

  private spawnBreakParticles(x: number, y: number): void {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.2;
      this.breakParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 3,
        alpha: 0.55 + Math.random() * 0.35,
        life: 1
      });
    }
  }

  spawnRipple(x: number, y: number, now: number): void {
    const maxR = Math.sqrt(this.canvasWidth * this.canvasWidth + this.canvasHeight * this.canvasHeight);
    this.ripples.push({
      x,
      y,
      startTime: now,
      duration: 2200,
      maxRadius: maxR,
      colorHue: Math.random() * 360
    });
  }

  checkLoops(now: number): { found: boolean; centerX: number; centerY: number } {
    const adjacency: Map<number, number[]> = new Map();
    for (const s of this.shards) adjacency.set(s.id, []);

    for (const [, path] of this.paths) {
      const fromList = adjacency.get(path.fromShardId);
      const toList = adjacency.get(path.toShardId);
      if (fromList) fromList.push(path.toShardId);
      if (toList) toList.push(path.fromShardId);
    }

    const visited: Set<number> = new Set();
    let loopComponent: Set<number> | null = null;

    for (const s of this.shards) {
      if (visited.has(s.id)) continue;
      const component: Set<number> = new Set();
      const hasLoop = this.detectCycle(s.id, -1, adjacency, visited, component);
      if (hasLoop && component.size >= 3) {
        loopComponent = component;
        break;
      }
    }

    if (loopComponent && loopComponent.size >= 3) {
      this.activatedLoopShards = new Set(loopComponent);
      let cx = 0, cy = 0, cnt = 0;
      for (const id of loopComponent) {
        const sh = this.shards.find(s => s.id === id);
        if (sh) { cx += sh.x; cy += sh.y; cnt++; }
      }
      if (cnt > 0) { cx /= cnt; cy /= cnt; }
      return { found: true, centerX: cx, centerY: cy };
    }
    return { found: false, centerX: 0, centerY: 0 };
  }

  private detectCycle(
    node: number,
    parent: number,
    adjacency: Map<number, number[]>,
    visited: Set<number>,
    component: Set<number>
  ): boolean {
    visited.add(node);
    component.add(node);

    const neighbors = adjacency.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this.detectCycle(neighbor, node, adjacency, visited, component)) {
          return true;
        }
      } else if (neighbor !== parent) {
        return true;
      }
    }
    return false;
  }

  startLevelTransition(now: number): void {
    this.previousRotations.clear();
    for (const s of this.shards) {
      this.previousRotations.set(s.id, s.rotation);
    }
    this.levelTransition = {
      active: true,
      startTime: now,
      duration: 1600,
      phase: 'fadeIn'
    };
  }

  update(now: number, dt: number): void {
    for (const s of this.shards) {
      if (s.isSnapping && !s.isDragging) {
        const diff = s.targetRotation - s.rotation;
        const ease = 0.18;
        s.rotation += diff * ease;

        if (s.snapStartX !== undefined && s.snapStartY !== undefined) {
          s.x += (s.baseX - s.x) * ease;
          s.y += (s.baseY - s.y) * ease;
        }

        const posDiffX = Math.abs(s.baseX - s.x);
        const posDiffY = Math.abs(s.baseY - s.y);
        if (Math.abs(diff) < 0.003 && posDiffX < 0.5 && posDiffY < 0.5) {
          s.rotation = s.targetRotation;
          s.x = s.baseX;
          s.y = s.baseY;
          s.isSnapping = false;
          s.snapStartX = undefined;
          s.snapStartY = undefined;
        }
      }
      if (!s.isDragging && !s.isSnapping) {
        s.edgeGlowPhase = Math.max(0, s.edgeGlowPhase - 0.025);
      }

      if (s.crackAnim) {
        const elapsed = now - s.crackAnim.startTime;
        const t = Math.min(1, elapsed / s.crackAnim.duration);
        for (const line of s.crackAnim.lines) {
          line.progress = Math.min(1, t * 1.8 + (Math.random() * 0.05));
        }
        if (t >= 1) {
          s.crackAnim = null;
        }
      }
    }

    for (const [, path] of this.paths) {
      for (const p of path.particles) {
        p.t += p.speed * dt;
        if (p.t > 1) p.t -= 1;
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (now - this.ripples[i].startTime > this.ripples[i].duration) {
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.breakParticles.length - 1; i >= 0; i--) {
      const p = this.breakParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= 0.025;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) this.breakParticles.splice(i, 1);
    }

    for (const s of this.starDust) {
      s.x += s.driftSpeed.x * dt;
      s.y += s.driftSpeed.y * dt;
      if (s.x < 0) s.x = this.canvasWidth;
      if (s.x > this.canvasWidth) s.x = 0;
      if (s.y < 0) s.y = this.canvasHeight;
      if (s.y > this.canvasHeight) s.y = 0;
    }

    if (this.levelTransition.active) {
      const elapsed = now - this.levelTransition.startTime;
      const t = elapsed / this.levelTransition.duration;
      if (t < 0.45) {
        this.levelTransition.phase = 'fadeIn';
      } else if (t < 0.55) {
        if (this.levelTransition.phase !== 'hold') {
          this.levelTransition.phase = 'hold';
          this.generateLevel(this.level + 1);
        }
      } else if (t >= 1) {
        this.levelTransition.active = false;
      } else {
        this.levelTransition.phase = 'fadeOut';
      }
    }
  }

  getConnectedPathCount(): number {
    return this.paths.size;
  }
}
