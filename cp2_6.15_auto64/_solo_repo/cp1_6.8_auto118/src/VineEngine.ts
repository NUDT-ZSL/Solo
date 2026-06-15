export interface VineNode {
  x: number;
  y: number;
  angle: number;
  thickness: number;
  age: number;
}

export interface VineBranch {
  id: number;
  nodes: VineNode[];
  growIndex: number;
  speed: number;
  isMain: boolean;
  parentId: number | null;
  swayPhase: number;
  swayAmplitude: number;
  targetPath: { x: number; y: number }[];
  pathIndex: number;
  alive: boolean;
}

export interface Seed {
  x: number;
  y: number;
  plantedAt: number;
  sprouted: boolean;
}

const MAX_VINES = 20;
const MAX_NODES_PER_VINE = 500;
const BRANCH_PROBABILITY = 0.03;
const MIN_BRANCH_LENGTH = 5;

export class VineEngine {
  branches: VineBranch[] = [];
  seeds: Seed[] = [];
  private nextId = 0;
  private growthSpeed = 1.0;
  private vineCount = 0;
  private onBranchCreated: ((branch: VineBranch) => void) | null = null;
  private onNodeAdded: ((branch: VineBranch, node: VineNode) => void) | null = null;

  setGrowthSpeed(speed: number) {
    this.growthSpeed = speed;
  }

  getGrowthSpeed() {
    return this.growthSpeed;
  }

  getVineCount() {
    return this.vineCount;
  }

  setCallbacks(
    onBranchCreated: (branch: VineBranch) => void,
    onNodeAdded: (branch: VineBranch, node: VineNode) => void
  ) {
    this.onBranchCreated = onBranchCreated;
    this.onNodeAdded = onNodeAdded;
  }

  plantSeed(x: number, y: number): Seed | null {
    if (this.vineCount >= MAX_VINES) return null;
    const seed: Seed = { x, y, plantedAt: performance.now(), sprouted: false };
    this.seeds.push(seed);
    this.vineCount++;
    return seed;
  }

  sproutSeed(seed: Seed, dragPath?: { x: number; y: number }[]) {
    if (seed.sprouted) return;
    seed.sprouted = true;
    const branch = this.createBranch(seed.x, seed.y, -Math.PI / 2, 4.0, true, null, dragPath);
    this.branches.push(branch);
    if (this.onBranchCreated) this.onBranchCreated(branch);
  }

  private createBranch(
    x: number,
    y: number,
    angle: number,
    thickness: number,
    isMain: boolean,
    parentId: number | null,
    targetPath?: { x: number; y: number }[]
  ): VineBranch {
    const node: VineNode = {
      x,
      y,
      angle,
      thickness,
      age: 0,
    };
    return {
      id: this.nextId++,
      nodes: [node],
      growIndex: 0,
      speed: (0.5 + Math.random() * 0.5) * this.growthSpeed,
      isMain,
      parentId,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmplitude: 0.02 + Math.random() * 0.03,
      targetPath: targetPath || [],
      pathIndex: 0,
      alive: true,
    };
  }

  appendPath(vineId: number, path: { x: number; y: number }[]) {
    const branch = this.branches.find((b) => b.id === vineId);
    if (!branch) return;
    branch.targetPath = branch.targetPath.concat(path);
  }

  update(dt: number, now: number) {
    for (const seed of this.seeds) {
      if (!seed.sprouted && now - seed.plantedAt > 800) {
        this.sproutSeed(seed);
      }
    }

    for (const branch of this.branches) {
      if (!branch.alive) continue;
      this.growBranch(branch, dt);
    }

    this.pruneDead();
  }

  private growBranch(branch: VineBranch, dt: number) {
    if (branch.nodes.length >= MAX_NODES_PER_VINE) {
      branch.alive = false;
      return;
    }

    const speed = branch.speed * this.growthSpeed;
    const lastNode = branch.nodes[branch.nodes.length - 1];
    let angle = lastNode.angle;

    if (branch.pathIndex < branch.targetPath.length) {
      const target = branch.targetPath[branch.pathIndex];
      const dx = target.x - lastNode.x;
      const dy = target.y - lastNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        branch.pathIndex++;
      } else {
        const targetAngle = Math.atan2(dy, dx);
        let diff = targetAngle - angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        angle += diff * 0.15;
      }
    } else {
      const sway = Math.sin(performance.now() * 0.001 + branch.swayPhase) * branch.swayAmplitude;
      angle += sway + (Math.random() - 0.5) * 0.08;
      if (branch.isMain) {
        angle += ((-Math.PI / 2) - angle) * 0.005;
      }
    }

    const step = speed * dt * 60;
    const nx = lastNode.x + Math.cos(angle) * step;
    const ny = lastNode.y + Math.sin(angle) * step;

    const thicknessDecay = lastNode.thickness * 0.9995;
    const newNode: VineNode = {
      x: nx,
      y: ny,
      angle,
      thickness: Math.max(0.5, thicknessDecay),
      age: 0,
    };
    branch.nodes.push(newNode);

    if (this.onNodeAdded) this.onNodeAdded(branch, newNode);

    if (
      branch.isMain &&
      branch.nodes.length > 20 &&
      branch.nodes.length % 15 === 0 &&
      Math.random() < BRANCH_PROBABILITY * 3
    ) {
      this.createFork(branch, newNode);
    } else if (
      !branch.isMain &&
      branch.nodes.length > MIN_BRANCH_LENGTH &&
      Math.random() < BRANCH_PROBABILITY
    ) {
      this.createFork(branch, newNode);
    }
  }

  private createFork(parent: VineBranch, fromNode: VineNode) {
    if (this.branches.filter((b) => b.alive).length >= MAX_VINES * 3) return;

    const forkAngle = fromNode.angle + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.6);
    const child = this.createBranch(
      fromNode.x,
      fromNode.y,
      forkAngle,
      fromNode.thickness * 0.6,
      false,
      parent.id
    );
    child.speed = parent.speed * 0.7;
    this.branches.push(child);
    if (this.onBranchCreated) this.onBranchCreated(child);
  }

  private pruneDead() {
    this.branches = this.branches.filter((b) => b.alive || b.nodes.length > 0);
  }

  draw(ctx: CanvasRenderingContext2D, now: number) {
    for (const branch of this.branches) {
      this.drawBranch(ctx, branch, now);
    }

    for (const seed of this.seeds) {
      if (!seed.sprouted) {
        this.drawSeed(ctx, seed, now);
      }
    }
  }

  private drawSeed(ctx: CanvasRenderingContext2D, seed: Seed, now: number) {
    const elapsed = now - seed.plantedAt;
    const pulse = 1 + Math.sin(elapsed * 0.005) * 0.2;
    const radius = 4 * pulse;

    ctx.save();
    ctx.beginPath();
    ctx.arc(seed.x, seed.y, radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(seed.x, seed.y, 0, seed.x, seed.y, radius);
    grad.addColorStop(0, '#8fbc8f');
    grad.addColorStop(1, 'rgba(34,139,34,0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  private drawBranch(ctx: CanvasRenderingContext2D, branch: VineBranch, now: number) {
    const nodes = branch.nodes;
    if (nodes.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const glowIntensity = branch.isMain ? 8 : 4;
    ctx.shadowColor = 'rgba(34,139,34,0.4)';
    ctx.shadowBlur = glowIntensity;

    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      const swayOffset =
        Math.sin(now * 0.001 + branch.swayPhase + i * 0.05) * branch.swayAmplitude * i * 0.3;

      const t = i / nodes.length;
      const green = Math.floor(80 + t * 40);
      ctx.strokeStyle = `rgb(20,${green},20)`;
      ctx.lineWidth = curr.thickness;

      ctx.beginPath();
      ctx.moveTo(prev.x + swayOffset * 0.5, prev.y);
      ctx.lineTo(curr.x + swayOffset, curr.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  findMainVineAt(x: number, y: number, radius: number = 20): VineBranch | null {
    for (const branch of this.branches) {
      if (!branch.isMain) continue;
      for (const node of branch.nodes) {
        const dx = node.x - x;
        const dy = node.y - y;
        if (dx * dx + dy * dy < radius * radius) {
          return branch;
        }
      }
    }
    return null;
  }

  getStats() {
    const activeVines = this.branches.filter((b) => b.alive).length;
    return { vineCount: this.vineCount, activeBranches: activeVines };
  }
}
