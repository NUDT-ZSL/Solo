import * as THREE from 'three';
import { Crystal } from './Crystal';

interface GrowthBranch {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  segmentsCount: number;
  depth: number;
  segmentsSinceBranch: number;
}

export interface CrystalClusterParams {
  growthSpeed: number;
  branchAngle: number;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
}

export class CrystalCluster {
  public group: THREE.Group;
  public crystals: Crystal[] = [];
  private branches: GrowthBranch[] = [];
  private seed: Crystal | null = null;
  private params: CrystalClusterParams;
  private growthProgress: Map<GrowthBranch, number> = new Map();
  private maxDepth: number = 8;
  private maxSegments: number = 5000;
  private isMaxComplexity: boolean = false;
  private onMaxComplexity?: () => void;

  constructor(params: CrystalClusterParams, onMaxComplexity?: () => void) {
    this.group = new THREE.Group();
    this.params = params;
    this.onMaxComplexity = onMaxComplexity;
    this.createSeed();
  }

  private createSeed(): void {
    const seedPosition = new THREE.Vector3(0, 0, 0);
    const seedRotation = new THREE.Euler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    const seedColor = new THREE.Color(0xffffff);
    this.seed = new Crystal(
      seedPosition,
      seedRotation,
      seedColor,
      seedColor,
      0,
      0.7,
      0,
      0.3
    );
    this.crystals.push(this.seed);
    this.group.add(this.seed.mesh);

    const initialBranchCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < initialBranchCount; i++) {
      const azimuth = Math.random() * Math.PI * 2;
      const polar = Math.random() * Math.PI;
      const distance = 0.5 + Math.random() * 0.5;

      const direction = new THREE.Vector3(
        Math.sin(polar) * Math.cos(azimuth),
        Math.cos(polar),
        Math.sin(polar) * Math.sin(azimuth)
      ).normalize();

      const position = seedPosition.clone().add(direction.clone().multiplyScalar(distance));

      const branch: GrowthBranch = {
        position: position,
        direction: direction,
        segmentsCount: 0,
        depth: 1,
        segmentsSinceBranch: 0
      };

      this.branches.push(branch);
      this.growthProgress.set(branch, 0);
    }
  }

  public update(dt: number, time: number, paused: boolean = false): void {
    this.crystals.forEach(crystal => {
      crystal.updateBreath(time);
    });

    if (paused || this.isMaxComplexity) return;

    const branchesToGrow = [...this.branches];

    for (const branch of branchesToGrow) {
      if (this.crystals.length >= this.maxSegments) {
        if (!this.isMaxComplexity) {
          this.isMaxComplexity = true;
          this.onMaxComplexity?.();
        }
        break;
      }

      if (branch.depth > this.maxDepth) continue;

      let progress = this.growthProgress.get(branch) || 0;
      progress += this.params.growthSpeed * dt;

      const segmentLength = 0.3 + Math.random() * 0.3;

      while (progress >= segmentLength && this.crystals.length < this.maxSegments) {
        progress -= segmentLength;

        const newDirection = this.deflectDirection(branch.direction, this.params.branchAngle);
        const newPosition = branch.position.clone().add(newDirection.clone().multiplyScalar(segmentLength));

        const crystalRotation = new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );

        const totalDepth = this.maxDepth;
        const colorProgress = branch.depth / totalDepth;
        const opacity = 0.3 + 0.5 * (1 - colorProgress);

        const crystal = new Crystal(
          newPosition,
          crystalRotation,
          this.params.colorStart,
          this.params.colorEnd,
          colorProgress,
          opacity,
          branch.depth,
          0.15 + Math.random() * 0.1
        );

        this.crystals.push(crystal);
        this.group.add(crystal.mesh);

        branch.position.copy(newPosition);
        branch.direction.copy(newDirection);
        branch.segmentsCount++;
        branch.segmentsSinceBranch++;

        if (branch.segmentsSinceBranch >= 3 && branch.depth < this.maxDepth) {
          branch.segmentsSinceBranch = 0;
          this.createBranches(branch);
        }
      }

      this.growthProgress.set(branch, progress);
    }
  }

  private deflectDirection(direction: THREE.Vector3, maxAngleDeg: number): THREE.Vector3 {
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;
    const angle = (Math.random() - 0.5) * 2 * maxAngleRad;

    const tangent1 = new THREE.Vector3();
    const tangent2 = new THREE.Vector3();

    if (Math.abs(direction.x) < 0.9) {
      tangent1.set(1, 0, 0);
    } else {
      tangent1.set(0, 1, 0);
    }
    tangent1.cross(direction).normalize();
    tangent2.crossVectors(direction, tangent1).normalize();

    const rotAxis = tangent1.clone().multiplyScalar(Math.cos(angle * 0.5))
      .add(tangent2.clone().multiplyScalar(Math.sin(angle * 0.5)));

    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(rotAxis.normalize(), angle);

    return direction.clone().applyQuaternion(quaternion).normalize();
  }

  private createBranches(parentBranch: GrowthBranch): void {
    const branchCount = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < branchCount; i++) {
      const angleBetween = (60 + Math.random() * 60) * (Math.PI / 180);
      const rotationAxis = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();

      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(rotationAxis, angleBetween * (i === 0 ? 1 : -1));

      const newDirection = parentBranch.direction.clone().applyQuaternion(quaternion).normalize();

      const branch: GrowthBranch = {
        position: parentBranch.position.clone(),
        direction: newDirection,
        segmentsCount: 0,
        depth: parentBranch.depth + 1,
        segmentsSinceBranch: 0
      };

      this.branches.push(branch);
      this.growthProgress.set(branch, 0);
    }
  }

  public updateParams(params: Partial<CrystalClusterParams>): void {
    this.params = { ...this.params, ...params };

    this.crystals.forEach(crystal => {
      if (crystal.depth > 0) {
        const colorProgress = crystal.depth / this.maxDepth;
        crystal.updateColor(this.params.colorStart, this.params.colorEnd, colorProgress);
      }
    });
  }

  public reset(): void {
    this.crystals.forEach(crystal => {
      this.group.remove(crystal.mesh);
      crystal.dispose();
    });
    this.crystals = [];
    this.branches = [];
    this.growthProgress.clear();
    this.isMaxComplexity = false;
    this.createSeed();
  }

  public getSegmentCount(): number {
    return this.crystals.length;
  }

  public getAverageDepth(): number {
    if (this.crystals.length === 0) return 0;
    const total = this.crystals.reduce((sum, c) => sum + c.depth, 0);
    return total / this.crystals.length;
  }

  public getMaxComplexity(): boolean {
    return this.isMaxComplexity;
  }

  public setMaxDepth(depth: number): void {
    this.maxDepth = depth;
  }

  public dispose(): void {
    this.crystals.forEach(crystal => crystal.dispose());
  }
}
