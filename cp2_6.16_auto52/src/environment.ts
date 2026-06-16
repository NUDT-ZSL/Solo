import { Plant, LightBeam, Particle, Branch, Leaf } from './plant';

export class Environment {
  plants: Plant[] = [];
  lightBeams: LightBeam[] = [];
  particles: Particle[] = [];
  width: number;
  height: number;
  soilY: number;

  private selectedPlant: Plant | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private plantStartX: number = 0;
  private plantStartY: number = 0;
  private overlapThreshold: number = 15;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.soilY = height - 80;
    this.initLightBeams();
  }

  private initLightBeams(): void {
    const beamCount = 8;
    for (let i = 0; i < beamCount; i++) {
      this.lightBeams.push({
        x: (i / beamCount) * this.width + Math.random() * 50,
        y: 0,
        height: this.soilY,
        opacity: 0.3 + Math.random() * 0.2,
      });
    }
  }

  update(deltaTime: number): void {
    this.updateLightBeams(deltaTime);
    this.updatePlants(deltaTime);
    this.detectOverlapsAndAvoidance();
    this.updateParticles(deltaTime);
  }

  private updateLightBeams(deltaTime: number): void {
    const moveSpeed = 60;

    for (const beam of this.lightBeams) {
      beam.x += moveSpeed * deltaTime;

      if (beam.x > this.width + 20) {
        beam.x = -20;
        beam.opacity = 0.3 + Math.random() * 0.2;
      }
    }
  }

  private updatePlants(deltaTime: number): void {
    for (const plant of this.plants) {
      plant.grow(deltaTime);
      plant.updateLight(this.lightBeams, deltaTime);
    }
  }

  private detectOverlapsAndAvoidance(): void {
    for (let i = 0; i < this.plants.length; i++) {
      const plant = this.plants[i];
      const overlappingBranches: Set<number> = new Set();
      let hasAnyOverlap = false;

      for (let j = 0; j < this.plants.length; j++) {
        if (i === j) continue;
        const other = this.plants[j];

        for (let bi = 0; bi < plant.branches.length; bi++) {
          const branch = plant.branches[bi];
          const branchMid = plant.getBranchMidpoint(branch);

          for (const otherBranch of other.branches) {
            const otherSeg = other.getBranchSegment(otherBranch);
            const dist = this.pointToSegmentDistance(
              branchMid.x, branchMid.y,
              otherSeg.x1, otherSeg.y1,
              otherSeg.x2, otherSeg.y2
            );

            if (dist < this.overlapThreshold) {
              hasAnyOverlap = true;
              overlappingBranches.add(bi);
              this.handleBranchAvoidance(plant, bi, branchMid, other, otherBranch);
              break;
            }
          }

          for (const otherLeaf of other.leaves) {
            const dist = Math.hypot(branchMid.x - otherLeaf.x, branchMid.y - otherLeaf.y);
            if (dist < this.overlapThreshold) {
              hasAnyOverlap = true;
              overlappingBranches.add(bi);
              this.handleLeafAvoidance(plant, bi, branchMid, otherLeaf);
              break;
            }
          }
        }
      }

      plant.setGrowSpeedMultiplier(hasAnyOverlap ? 0.5 : 1.0);

      for (let bi = 0; bi < plant.branches.length; bi++) {
        if (!overlappingBranches.has(bi)) {
          plant.resetBranchOverlapState(bi);
        }
      }
    }
  }

  private handleBranchAvoidance(
    plant: Plant,
    branchIndex: number,
    branchMid: { x: number; y: number },
    other: Plant,
    otherBranch: Branch
  ): void {
    const branch = plant.branches[branchIndex];

    if (branch.overlapStartTime === 0) {
      plant.setBranchOverlapStartTime(branchIndex, performance.now());
      return;
    }

    const overlapDuration = (performance.now() - branch.overlapStartTime) / 1000;
    if (overlapDuration > 3) {
      const otherEnd = other.getBranchEnd(otherBranch);
      const dx = branchMid.x - (otherBranch.x + otherEnd.x) / 2;
      const dy = branchMid.y - (otherBranch.y + otherEnd.y) / 2;
      const targetAngle = Math.atan2(dy, dx);

      let angleDiff = targetAngle - branch.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      const avoidAngle = (20 + Math.random() * 20) * (Math.PI / 180);
      const avoidDirection = angleDiff > 0 ? 1 : -1;

      plant.setBranchAvoidAngle(branchIndex, avoidAngle, avoidDirection);
    }
  }

  private handleLeafAvoidance(
    plant: Plant,
    branchIndex: number,
    branchMid: { x: number; y: number },
    otherLeaf: Leaf
  ): void {
    const branch = plant.branches[branchIndex];

    if (branch.overlapStartTime === 0) {
      plant.setBranchOverlapStartTime(branchIndex, performance.now());
      return;
    }

    const overlapDuration = (performance.now() - branch.overlapStartTime) / 1000;
    if (overlapDuration > 3) {
      const dx = branchMid.x - otherLeaf.x;
      const dy = branchMid.y - otherLeaf.y;
      const targetAngle = Math.atan2(dy, dx);

      let angleDiff = targetAngle - branch.angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      const avoidAngle = (20 + Math.random() * 20) * (Math.PI / 180);
      const avoidDirection = angleDiff > 0 ? 1 : -1;

      plant.setBranchAvoidAngle(branchIndex, avoidAngle, avoidDirection);
    }
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

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const lifeRatio = p.life / p.maxLife;
      const speedMultiplier = lifeRatio * 3;

      p.x += p.vx * deltaTime * 60 * speedMultiplier;
      p.y += p.vy * deltaTime * 60 * speedMultiplier;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  handleCanvasClick(x: number, y: number): void {
    if (this.isDragging) return;

    for (const plant of this.plants) {
      if (plant.containsPoint(x, y)) {
        return;
      }
    }

    if (y > 0 && y < this.soilY + 20) {
      const soilY = Math.max(y, this.soilY - 10);
      this.plantSeed(x, soilY);
    }
  }

  handleMouseDown(x: number, y: number): boolean {
    for (const plant of this.plants) {
      if (plant.containsPoint(x, y)) {
        this.selectedPlant = plant;
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.plantStartX = plant.seedX;
        this.plantStartY = plant.seedY;
        plant.isSelected = true;
        return true;
      }
    }
    return false;
  }

  handleMouseMove(x: number, y: number): void {
    if (this.isDragging && this.selectedPlant) {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;
      const newX = Math.max(20, Math.min(this.width - 20, this.plantStartX + dx));
      const newY = Math.max(100, Math.min(this.soilY + 30, this.plantStartY + dy));
      this.selectedPlant.moveTo(newX, newY);
    }
  }

  handleMouseUp(): void {
    if (this.selectedPlant) {
      this.selectedPlant.isSelected = false;
    }
    this.selectedPlant = null;
    this.isDragging = false;
  }

  reset(): void {
    this.plants = [];
    this.particles = [];
    this.selectedPlant = null;
    this.isDragging = false;
  }

  private plantSeed(x: number, y: number): void {
    const plant = new Plant(x, y);
    this.plants.push(plant);
    this.createSeedParticles(x, y);
  }

  private createSeedParticles(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        life: 0.3,
        maxLife: 0.3,
        color: '#8bc34a',
      });
    }
  }

  getPlantCount(): number {
    return this.plants.length;
  }

  shouldUseLowDetailLeaves(): boolean {
    return this.plants.length > 20;
  }
}
