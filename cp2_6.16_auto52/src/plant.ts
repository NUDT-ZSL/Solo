export interface Branch {
  x: number;
  y: number;
  angle: number;
  length: number;
  level: number;
  thickness: number;
  parentIndex: number;
  children: number[];
  growthProgress: number;
  targetLength: number;
  baseAngle: number;
  overlapStartTime: number;
  avoidDirection: number;
}

export interface Leaf {
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  size: number;
  branchIndex: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface LightBeam {
  x: number;
  y: number;
  height: number;
  opacity: number;
}

export class Plant {
  id: number;
  seedX: number;
  seedY: number;
  branches: Branch[] = [];
  leaves: Leaf[] = [];
  totalLightTime: number = 0;
  growSpeedMultiplier: number = 1.0;
  isGrowing: boolean = true;
  iterationLevel: number = 0;
  maxIterations: number;
  createdAt: number;
  isSelected: boolean = false;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;

  private static nextId = 0;
  private overlapCheckBranches: Set<number> = new Set();

  constructor(seedX: number, seedY: number) {
    this.id = Plant.nextId++;
    this.seedX = seedX;
    this.seedY = seedY;
    this.createdAt = performance.now();
    this.maxIterations = 4 + Math.floor(Math.random() * 2);

    const trunkHeight = 30 + Math.random() * 50;
    this.branches.push({
      x: seedX,
      y: seedY,
      angle: -Math.PI / 2,
      length: 0,
      targetLength: trunkHeight,
      level: 0,
      thickness: 6,
      parentIndex: -1,
      children: [],
      growthProgress: 0,
      baseAngle: -Math.PI / 2,
      overlapStartTime: 0,
      avoidDirection: 0,
    });
  }

  grow(deltaTime: number, allPlants: Plant[]): void {
    if (!this.isGrowing) return;

    const effectiveSpeed = this.growSpeedMultiplier * deltaTime;
    let allGrown = true;

    for (let i = 0; i < this.branches.length; i++) {
      const branch = this.branches[i];
      if (branch.length < branch.targetLength) {
        branch.length += effectiveSpeed * 40 * this.getLevelGrowthFactor(branch.level);
        if (branch.length > branch.targetLength) {
          branch.length = branch.targetLength;
        }
        branch.growthProgress = branch.length / branch.targetLength;
        allGrown = false;
      }
    }

    this.checkAndGenerateBranches();
    this.detectOverlaps(allPlants);
    this.updateLeafPositions();

    if (allGrown && this.iterationLevel >= this.maxIterations) {
      this.isGrowing = false;
    }
  }

  private getLevelGrowthFactor(level: number): number {
    return Math.max(0.3, 1.0 - level * 0.15);
  }

  private checkAndGenerateBranches(): void {
    for (let i = 0; i < this.branches.length; i++) {
      const branch = this.branches[i];
      if (branch.growthProgress >= 1.0 && branch.children.length === 0 && branch.level < this.maxIterations) {
        this.generateChildBranches(i);
      }
    }
  }

  private generateChildBranches(parentIndex: number): void {
    const parent = this.branches[parentIndex];
    const level = parent.level + 1;
    this.iterationLevel = Math.max(this.iterationLevel, level);

    const numChildren = level === 0 ? 2 : (Math.random() > 0.3 ? 2 : 3);
    const baseAngleOffset = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
    const lengthFactor = 0.6 + Math.random() * 0.2;
    const targetLength = parent.targetLength * lengthFactor;

    const endX = parent.x + Math.cos(parent.angle) * parent.length;
    const endY = parent.y + Math.sin(parent.angle) * parent.length;

    for (let c = 0; c < numChildren; c++) {
      let angleOffset: number;
      if (numChildren === 2) {
        angleOffset = c === 0 ? -baseAngleOffset : baseAngleOffset;
      } else {
        const spread = (c - (numChildren - 1) / 2) * baseAngleOffset;
        angleOffset = spread;
      }

      const randomJitter = (Math.random() - 0.5) * (Math.PI / 180) * 30;

      this.branches.push({
        x: endX,
        y: endY,
        angle: parent.angle + angleOffset + randomJitter,
        length: 0,
        targetLength: targetLength,
        level: level,
        thickness: Math.max(1.5, parent.thickness * 0.7),
        parentIndex: parentIndex,
        children: [],
        growthProgress: 0,
        baseAngle: parent.angle + angleOffset,
        overlapStartTime: 0,
        avoidDirection: 0,
      });

      const childIndex = this.branches.length - 1;
      parent.children.push(childIndex);

      if (level >= 2 && Math.random() > 0.3) {
        const leafX = endX + Math.cos(parent.angle + angleOffset) * targetLength * 0.5;
        const leafY = endY + Math.sin(parent.angle + angleOffset) * targetLength * 0.5;
        this.leaves.push({
          x: leafX,
          y: leafY,
          angle: parent.angle + angleOffset,
          targetAngle: parent.angle + angleOffset,
          size: 6 + Math.random() * 6,
          branchIndex: childIndex,
        });
      }
    }
  }

  private detectOverlaps(allPlants: Plant[]): void {
    this.overlapCheckBranches.clear();
    const overlapThreshold = 15;
    let hasAnyOverlap = false;

    for (const other of allPlants) {
      if (other.id === this.id) continue;

      for (let i = 0; i < this.branches.length; i++) {
        const branch = this.branches[i];
        const branchEnd = this.getBranchEnd(branch);
        const branchMid = {
          x: branch.x + (branchEnd.x - branch.x) * 0.5,
          y: branch.y + (branchEnd.y - branch.y) * 0.5,
        };

        for (const otherBranch of other.branches) {
          const otherEnd = other.getBranchEnd(otherBranch);
          const dist = this.pointToSegmentDistance(
            branchMid.x, branchMid.y,
            otherBranch.x, otherBranch.y,
            otherEnd.x, otherEnd.y
          );

          if (dist < overlapThreshold) {
            hasAnyOverlap = true;
            this.overlapCheckBranches.add(i);
            this.handleAvoidance(i, other, otherBranch);
            break;
          }
        }

        for (const otherLeaf of other.leaves) {
          const dist = Math.hypot(branchMid.x - otherLeaf.x, branchMid.y - otherLeaf.y);
          if (dist < overlapThreshold) {
            hasAnyOverlap = true;
            this.overlapCheckBranches.add(i);
            this.handleLeafAvoidance(i, otherLeaf);
            break;
          }
        }
      }
    }

    this.growSpeedMultiplier = hasAnyOverlap ? 0.5 : 1.0;

    for (let i = 0; i < this.branches.length; i++) {
      if (!this.overlapCheckBranches.has(i)) {
        this.branches[i].overlapStartTime = 0;
        this.branches[i].avoidDirection = 0;
      }
    }
  }

  private handleAvoidance(branchIndex: number, other: Plant, otherBranch: Branch): void {
    const branch = this.branches[branchIndex];
    const branchEnd = this.getBranchEnd(branch);
    const otherEnd = this.getBranchEnd(otherBranch);

    if (branch.overlapStartTime === 0) {
      branch.overlapStartTime = performance.now();
    }

    const overlapDuration = (performance.now() - branch.overlapStartTime) / 1000;
    if (overlapDuration > 3) {
      const dx = branchEnd.x - (otherBranch.x + otherEnd.x) / 2;
      const dy = branchEnd.y - (otherBranch.y + otherEnd.y) / 2;
      const targetAngle = Math.atan2(dy, dx);

      let angleDiff = targetAngle - branch.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      const avoidAngle = (20 + Math.random() * 20) * (Math.PI / 180);
      const avoidDirection = angleDiff > 0 ? 1 : -1;

      branch.angle = branch.baseAngle + avoidDirection * avoidAngle;
      branch.avoidDirection = avoidDirection;
    }
  }

  private handleLeafAvoidance(branchIndex: number, otherLeaf: Leaf): void {
    const branch = this.branches[branchIndex];

    if (branch.overlapStartTime === 0) {
      branch.overlapStartTime = performance.now();
    }

    const overlapDuration = (performance.now() - branch.overlapStartTime) / 1000;
    if (overlapDuration > 3) {
      const branchEnd = this.getBranchEnd(branch);
      const dx = branchEnd.x - otherLeaf.x;
      const dy = branchEnd.y - otherLeaf.y;
      const targetAngle = Math.atan2(dy, dx);

      let angleDiff = targetAngle - branch.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      const avoidAngle = (20 + Math.random() * 20) * (Math.PI / 180);
      const avoidDirection = angleDiff > 0 ? 1 : -1;

      branch.angle = branch.baseAngle + avoidDirection * avoidAngle;
      branch.avoidDirection = avoidDirection;
    }
  }

  private updateLeafPositions(): void {
    for (const leaf of this.leaves) {
      const branch = this.branches[leaf.branchIndex];
      if (!branch) continue;

      const branchEnd = this.getBranchEnd(branch);
      const t = 0.7;
      leaf.x = branch.x + (branchEnd.x - branch.x) * t;
      leaf.y = branch.y + (branchEnd.y - branch.y) * t;
    }
  }

  updateLight(lightBeams: LightBeam[], deltaTime: number): void {
    let isLit = false;

    for (const leaf of this.leaves) {
      for (const beam of lightBeams) {
        if (Math.abs(leaf.x - beam.x) < 4) {
          isLit = true;

          const beamDirection = beam.x < leaf.x ? 0 : Math.PI;
          let targetAngle = beamDirection;

          let angleDiff = targetAngle - leaf.targetAngle;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          const rotationSpeed = 0.5 * (Math.PI / 180);
          if (Math.abs(angleDiff) > rotationSpeed) {
            leaf.targetAngle += Math.sign(angleDiff) * rotationSpeed;
          }

          let leafAngleDiff = leaf.targetAngle - leaf.angle;
          while (leafAngleDiff > Math.PI) leafAngleDiff -= 2 * Math.PI;
          while (leafAngleDiff < -Math.PI) leafAngleDiff += 2 * Math.PI;

          leaf.angle += leafAngleDiff * 0.1;
          break;
        }
      }
    }

    if (isLit) {
      this.totalLightTime += deltaTime;
    }
  }

  getLeafColor(): string {
    const maxLight = 60;
    const t = Math.min(1, this.totalLightTime / maxLight);

    if (t < 0.5) {
      const blendT = t * 2;
      return this.lerpColor('#cddc39', '#8bc34a', blendT);
    } else {
      const blendT = (t - 0.5) * 2;
      return this.lerpColor('#8bc34a', '#2e7d32', blendT);
    }
  }

  hasSufficientLight(): boolean {
    return this.totalLightTime > 30;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 0, g: 0, b: 0 };
  }

  getBranchEnd(branch: Branch): { x: number; y: number } {
    return {
      x: branch.x + Math.cos(branch.angle) * branch.length,
      y: branch.y + Math.sin(branch.angle) * branch.length,
    };
  }

  private pointToSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) return Math.hypot(px - x1, py - y1);

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.hypot(px - projX, py - projY);
  }

  containsPoint(x: number, y: number): boolean {
    const selectionRadius = 40;
    return Math.hypot(x - this.seedX, y - this.seedY) < selectionRadius;
  }

  moveTo(newX: number, newY: number): void {
    const dx = newX - this.seedX;
    const dy = newY - this.seedY;

    this.seedX = newX;
    this.seedY = newY;

    for (const branch of this.branches) {
      branch.x += dx;
      branch.y += dy;
    }

    for (const leaf of this.leaves) {
      leaf.x += dx;
      leaf.y += dy;
    }
  }
}
