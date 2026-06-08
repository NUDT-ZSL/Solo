import * as THREE from 'three';

export interface TreeConfig {
  depth: number;
  angleRange: number;
  trunkHeight: number;
  trunkRadius: number;
  lengthRatio: number;
  radiusRatio: number;
  minBranches: number;
  maxBranches: number;
}

interface BranchData {
  group: THREE.Group;
  mesh: THREE.Mesh;
  targetLength: number;
  level: number;
  isLeaf: boolean;
  leafMesh?: THREE.Mesh;
}

export class TreeGenerator {
  private scene: THREE.Scene;
  private rootGroup: THREE.Group;
  private branches: BranchData[] = [];
  private config: TreeConfig;
  private branchMaterial: THREE.MeshStandardMaterial;
  private leafMaterial: THREE.MeshStandardMaterial;
  private isAnimating: boolean = false;
  private animationProgress: number = 0;
  private animationLevel: number = -1;
  private animationStartTime: number = 0;
  private readonly LEVEL_GROW_TIME: number = 500;
  private windEnabled: boolean = false;
  private windAmplitude: number = 0.15;
  private windTime: number = 0;
  private initialPositions: Map<THREE.Object3D, THREE.Vector3> = new Map();

  constructor(scene: THREE.Scene, config: Partial<TreeConfig> = {}) {
    this.scene = scene;
    this.config = {
      depth: 5,
      angleRange: 30,
      trunkHeight: 2,
      trunkRadius: 0.15,
      lengthRatio: 0.65,
      radiusRatio: 0.7,
      minBranches: 2,
      maxBranches: 4,
      ...config
    };

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.branchMaterial = new THREE.MeshStandardMaterial({
      color: 0x6B4423,
      roughness: 0.9,
      metalness: 0.1
    });

    this.leafMaterial = new THREE.MeshStandardMaterial({
      color: 0xA5E6BA,
      emissive: 0xA5E6BA,
      emissiveIntensity: 0.5,
      roughness: 0.6,
      metalness: 0.0
    });
  }

  public generate(): void {
    this.clear();
    this.isAnimating = false;
    this.buildTree(this.config.depth);
    this.applyInstantScale();
  }

  public regrow(): void {
    this.clear();
    this.buildTree(this.config.depth);
    this.startGrowAnimation();
  }

  public setConfig(config: Partial<TreeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): TreeConfig {
    return { ...this.config };
  }

  public setWind(enabled: boolean, amplitude?: number): void {
    this.windEnabled = enabled;
    if (amplitude !== undefined) {
      this.windAmplitude = amplitude;
    }
    if (!enabled) {
      this.resetWindPositions();
    }
  }

  public update(deltaTime: number): void {
    if (this.isAnimating) {
      this.updateGrowAnimation();
    }
    if (this.windEnabled) {
      this.windTime += deltaTime;
      this.applyWind();
    }
  }

  public clear(): void {
    while (this.rootGroup.children.length > 0) {
      const child = this.rootGroup.children[0];
      this.rootGroup.remove(child);
    }
    this.branches = [];
    this.initialPositions.clear();
    this.isAnimating = false;
  }

  private buildTree(depth: number): void {
    const trunkGroup = new THREE.Group();
    trunkGroup.position.set(0, 0, 0);
    this.rootGroup.add(trunkGroup);

    this.createBranch(trunkGroup, this.config.trunkHeight, this.config.trunkRadius, 0, depth, new THREE.Vector3(0, 1, 0));
  }

  private createBranch(
    parent: THREE.Group,
    length: number,
    radius: number,
    level: number,
    maxDepth: number,
    direction: THREE.Vector3
  ): void {
    const branchGroup = new THREE.Group();
    parent.add(branchGroup);

    const geometry = new THREE.CylinderGeometry(radius * 0.7, radius, length, 8);
    const mesh = new THREE.Mesh(geometry, this.branchMaterial);
    mesh.position.y = length / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    branchGroup.add(mesh);

    const tipGroup = new THREE.Group();
    tipGroup.position.y = length;
    branchGroup.add(tipGroup);

    const isLeaf = level >= maxDepth - 1;

    this.branches.push({
      group: branchGroup,
      mesh,
      targetLength: length,
      level,
      isLeaf
    });

    this.initialPositions.set(branchGroup, branchGroup.position.clone());

    if (isLeaf) {
      const leafGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const leafMesh = new THREE.Mesh(leafGeo, this.leafMaterial);
      tipGroup.add(leafMesh);
      this.branches[this.branches.length - 1].leafMesh = leafMesh;
      this.initialPositions.set(tipGroup, tipGroup.position.clone());
      return;
    }

    const numBranches = Math.floor(Math.random() * (this.config.maxBranches - this.config.minBranches + 1)) + this.config.minBranches;
    const angleRad = (this.config.angleRange * Math.PI) / 180;

    for (let i = 0; i < numBranches; i++) {
      const tiltAngle = (Math.random() * 2 - 1) * angleRad;
      const rotateAngle = (Math.random() * 2 - 1) * angleRad;

      const childDir = direction.clone();

      const axis1 = new THREE.Vector3(1, 0, 0);
      childDir.applyAxisAngle(axis1, tiltAngle);

      const axis2 = new THREE.Vector3(0, 1, 0);
      childDir.applyAxisAngle(axis2, rotateAngle + (i / numBranches) * Math.PI * 2);

      childDir.normalize();

      const childLength = length * this.config.lengthRatio;
      const childRadius = radius * this.config.radiusRatio;

      const childGroup = new THREE.Group();
      tipGroup.add(childGroup);

      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), childDir);
      childGroup.quaternion.copy(quaternion);

      this.createBranch(childGroup, childLength, childRadius, level + 1, maxDepth, childDir);
    }
  }

  private applyInstantScale(): void {
    for (const branch of this.branches) {
      branch.group.scale.y = 1;
      branch.mesh.visible = true;
      if (branch.leafMesh) {
        branch.leafMesh.visible = true;
      }
    }
  }

  private startGrowAnimation(): void {
    for (const branch of this.branches) {
      branch.group.scale.y = 0;
      branch.mesh.visible = false;
      if (branch.leafMesh) {
        branch.leafMesh.visible = false;
      }
    }
    this.isAnimating = true;
    this.animationLevel = 0;
    this.animationStartTime = performance.now();
    this.showLevel(0);
  }

  private showLevel(level: number): void {
    for (const branch of this.branches) {
      if (branch.level === level) {
        branch.mesh.visible = true;
        if (branch.leafMesh) {
          branch.leafMesh.visible = true;
        }
      }
    }
  }

  private updateGrowAnimation(): void {
    const now = performance.now();
    const elapsed = now - this.animationStartTime;
    const progress = Math.min(elapsed / this.LEVEL_GROW_TIME, 1);

    for (const branch of this.branches) {
      if (branch.level === this.animationLevel) {
        branch.group.scale.y = progress;
      } else if (branch.level < this.animationLevel) {
        branch.group.scale.y = 1;
      }
    }

    if (progress >= 1) {
      this.animationLevel++;
      if (this.animationLevel >= this.config.depth) {
        this.isAnimating = false;
        for (const branch of this.branches) {
          branch.group.scale.y = 1;
        }
      } else {
        this.animationStartTime = now;
        this.showLevel(this.animationLevel);
      }
    }
  }

  private applyWind(): void {
    const freq = 1.0;
    const omega = 2 * Math.PI * freq;
    const maxLevel = this.config.depth;

    for (const branch of this.branches) {
      const levelFactor = branch.level / Math.max(1, maxLevel - 1);
      const amplitude = this.windAmplitude * levelFactor;
      const phase = branch.level * 0.3;

      const offsetX = Math.sin(this.windTime * omega + phase) * amplitude;
      const offsetZ = Math.cos(this.windTime * omega * 0.8 + phase) * amplitude * 0.6;

      const initial = this.initialPositions.get(branch.group);
      if (initial) {
        branch.group.position.x = initial.x + offsetX;
        branch.group.position.z = initial.z + offsetZ;
      }

      if (branch.isLeaf && branch.leafMesh) {
        const leafAmplitude = amplitude * 1.5;
        const leafOffsetX = Math.sin(this.windTime * omega * 1.2 + phase + 0.5) * leafAmplitude;
        const leafOffsetZ = Math.cos(this.windTime * omega * 0.9 + phase + 0.5) * leafAmplitude * 0.6;
        if (branch.leafMesh.parent) {
          branch.leafMesh.position.x = leafOffsetX;
          branch.leafMesh.position.z = leafOffsetZ;
        }
      }
    }
  }

  private resetWindPositions(): void {
    for (const branch of this.branches) {
      const initial = this.initialPositions.get(branch.group);
      if (initial) {
        branch.group.position.copy(initial);
      }
      if (branch.leafMesh) {
        branch.leafMesh.position.set(0, 0, 0);
      }
    }
  }

  public getBranchCount(): number {
    return this.branches.length;
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.rootGroup);
    this.branchMaterial.dispose();
    this.leafMaterial.dispose();
  }
}
