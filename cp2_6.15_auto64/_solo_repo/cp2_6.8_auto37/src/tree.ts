import * as THREE from 'three';

export interface BranchData {
  mesh: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  radius: number;
  layer: number;
  parent: BranchData | null;
  children: BranchData[];
  leaves: THREE.Mesh[];
  growthPoint: THREE.Mesh | null;
  isGrowing: boolean;
  growthProgress: number;
  regrowTimer: number;
  cut: boolean;
}

export interface TreeStats {
  branchCount: number;
  leafCount: number;
  maxLayer: number;
}

export class TreeGenerator {
  public group: THREE.Group;
  public branches: BranchData[] = [];
  public leaves: THREE.Mesh[] = [];
  private scene: THREE.Scene;
  public growthSpeed: number = 1.0;
  private maxLayers: number = 3;
  private originalLeaves: { mesh: THREE.Mesh; color: THREE.Color; scale: THREE.Vector3 }[] = [];
  private isBlooming: boolean = false;
  public bloomParticles: THREE.Points | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  private createBranchMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.08, 0.5, 0.25 + Math.random() * 0.1),
      flatShading: false
    });
  }

  private createLeafMaterial(): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.28 + Math.random() * 0.08, 0.6, 0.35 + Math.random() * 0.15),
      side: THREE.DoubleSide
    });
  }

  public generateTree(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): void {
    this.clear();
    this.group.position.copy(position);

    const trunkHeight = 1.5 + Math.random() * 1.5;
    const trunkRadius = 0.18 + Math.random() * 0.08;

    const trunkStart = new THREE.Vector3(0, 0, 0);
    const trunkEnd = new THREE.Vector3(0, trunkHeight, 0);

    const trunk = this.createBranch(trunkStart, trunkEnd, trunkRadius, 0, null);
    this.branches.push(trunk);

    const mainBranchCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < mainBranchCount; i++) {
      const angle = (i / mainBranchCount) * Math.PI * 2 + Math.random() * 0.5;
      const heightRatio = 0.6 + Math.random() * 0.35;
      this.growBranchFromPoint(trunk, heightRatio, angle, 1);
    }

    this.group.position.copy(position);
  }

  private createBranch(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    layer: number,
    parent: BranchData | null
  ): BranchData {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    direction.normalize();

    const geometry = new THREE.CylinderGeometry(radius * 0.7, radius, length, 6, 1);
    geometry.translate(0, length / 2, 0);

    const mesh = new THREE.Mesh(geometry, this.createBranchMaterial());
    mesh.position.copy(start);
    mesh.lookAt(new THREE.Vector3().addVectors(start, direction));
    mesh.rotateX(Math.PI / 2);

    this.group.add(mesh);

    const branchData: BranchData = {
      mesh,
      start: start.clone(),
      end: end.clone(),
      direction: direction.clone(),
      length,
      radius,
      layer,
      parent,
      children: [],
      leaves: [],
      growthPoint: null,
      isGrowing: false,
      growthProgress: 1,
      regrowTimer: 0,
      cut: false
    };

    if (parent) {
      parent.children.push(branchData);
    }

    if (layer >= this.maxLayers - 1) {
      this.addLeaves(branchData);
    }

    return branchData;
  }

  private addLeaves(branch: BranchData): void {
    const leafCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < leafCount; i++) {
      const leafGeo = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 4, 4);
      leafGeo.scale(1, 0.6, 1.5);
      const leafMat = this.createLeafMaterial();
      const leaf = new THREE.Mesh(leafGeo, leafMat);

      const t = 0.7 + Math.random() * 0.3;
      const pos = new THREE.Vector3().lerpVectors(branch.start, branch.end, t);

      const perpendicular = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.5,
        Math.random() - 0.5
      ).normalize();

      pos.add(perpendicular.multiplyScalar(0.15));
      leaf.position.copy(pos);

      leaf.lookAt(new THREE.Vector3(
        pos.x + (Math.random() - 0.5),
        pos.y + Math.random(),
        pos.z + (Math.random() - 0.5)
      ));

      this.group.add(leaf);
      branch.leaves.push(leaf);
      this.leaves.push(leaf);
    }
  }

  private growBranchFromPoint(
    parentBranch: BranchData,
    heightRatio: number,
    angle: number,
    layer: number
  ): void {
    if (layer > this.maxLayers) return;

    const startPoint = new THREE.Vector3().lerpVectors(
      parentBranch.start,
      parentBranch.end,
      heightRatio
    );

    const baseDir = parentBranch.direction.clone();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(baseDir, up).normalize();
    if (right.lengthSq() < 0.01) {
      right.set(1, 0, 0);
    }
    const forward = new THREE.Vector3().crossVectors(right, baseDir).normalize();

    const branchAngle = 0.3 + Math.random() * 0.4;
    const direction = new THREE.Vector3()
      .addScaledVector(baseDir, Math.cos(branchAngle))
      .addScaledVector(right, Math.sin(branchAngle) * Math.cos(angle))
      .addScaledVector(forward, Math.sin(branchAngle) * Math.sin(angle))
      .normalize();

    const lengthScale = Math.pow(0.72, layer) * (0.85 + Math.random() * 0.3);
    const length = parentBranch.length * lengthScale;
    const radiusScale = Math.pow(0.7, layer);
    const radius = parentBranch.radius * radiusScale;

    const endPoint = new THREE.Vector3().addVectors(
      startPoint,
      direction.multiplyScalar(length)
    );

    const branch = this.createBranch(startPoint, endPoint, radius, layer, parentBranch);
    this.branches.push(branch);

    if (layer < this.maxLayers) {
      const childCount = layer === 0 ? 2 : 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < childCount; i++) {
        const childAngle = (i / childCount) * Math.PI * 2 + Math.random() * 0.8;
        this.growBranchFromPoint(branch, 0.6 + Math.random() * 0.35, childAngle, layer + 1);
      }
    }
  }

  public cutBranch(branch: BranchData): void {
    if (branch.cut) return;
    branch.cut = true;

    this.removeBranchAndChildren(branch);

    const growthPointGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const growthPointMat = new THREE.MeshBasicMaterial({
      color: 0x32cd32,
      transparent: true,
      opacity: 0.9
    });
    const growthPoint = new THREE.Mesh(growthPointGeo, growthPointMat);
    growthPoint.position.copy(branch.start);
    this.group.add(growthPoint);
    branch.growthPoint = growthPoint;
    branch.regrowTimer = 3.0;
  }

  private removeBranchAndChildren(branch: BranchData): void {
    const removeRecursive = (b: BranchData) => {
      this.group.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();

      b.leaves.forEach(leaf => {
        this.group.remove(leaf);
        leaf.geometry.dispose();
        (leaf.material as THREE.Material).dispose();
        const idx = this.leaves.indexOf(leaf);
        if (idx >= 0) this.leaves.splice(idx, 1);
      });

      const branchIdx = this.branches.indexOf(b);
      if (branchIdx >= 0) this.branches.splice(branchIdx, 1);

      b.children.forEach(child => removeRecursive(child));
    };

    if (branch.parent) {
      const childIdx = branch.parent.children.indexOf(branch);
      if (childIdx >= 0) branch.parent.children.splice(childIdx, 1);
    }

    branch.children.forEach(child => removeRecursive(child));

    this.group.remove(branch.mesh);
    branch.mesh.geometry.dispose();
    (branch.mesh.material as THREE.Material).dispose();

    branch.leaves.forEach(leaf => {
      this.group.remove(leaf);
      leaf.geometry.dispose();
      (leaf.material as THREE.Material).dispose();
      const idx = this.leaves.indexOf(leaf);
      if (idx >= 0) this.leaves.splice(idx, 1);
    });

    const branchIdx = this.branches.indexOf(branch);
    if (branchIdx >= 0) this.branches.splice(branchIdx, 1);
  }

  public cutLeaf(leaf: THREE.Mesh): void {
    for (const branch of this.branches) {
      const idx = branch.leaves.indexOf(leaf);
      if (idx >= 0) {
        branch.leaves.splice(idx, 1);
        break;
      }
    }
    const leafIdx = this.leaves.indexOf(leaf);
    if (leafIdx >= 0) this.leaves.splice(leafIdx, 1);
    this.group.remove(leaf);
    leaf.geometry.dispose();
    (leaf.material as THREE.Material).dispose();
  }

  public update(deltaTime: number): void {
    for (const branch of this.branches) {
      if (branch.regrowTimer > 0 && branch.growthPoint) {
        branch.regrowTimer -= deltaTime;
        const scale = 1 + Math.sin(Date.now() * 0.01) * 0.15;
        branch.growthPoint.scale.setScalar(scale);

        if (branch.regrowTimer <= 0) {
          this.regrowBranch(branch);
        }
      }
    }

    if (this.isBlooming) {
      this.updateBloom(deltaTime);
    }
  }

  private regrowBranch(branch: BranchData): void {
    if (branch.growthPoint) {
      this.group.remove(branch.growthPoint);
      branch.growthPoint.geometry.dispose();
      (branch.growthPoint.material as THREE.Material).dispose();
      branch.growthPoint = null;
    }

    if (branch.layer >= this.maxLayers) return;

    const regrowCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < regrowCount; i++) {
      const baseAngle = (i / regrowCount) * Math.PI * 2;
      const angle = baseAngle + (Math.random() - 0.5) * 0.5;

      const parentDir = branch.parent ? branch.parent.direction.clone() : new THREE.Vector3(0, 1, 0);
      const up = new THREE.Vector3(0, 1, 0);
      let right = new THREE.Vector3().crossVectors(parentDir, up).normalize();
      if (right.lengthSq() < 0.01) right.set(1, 0, 0);
      const forward = new THREE.Vector3().crossVectors(right, parentDir).normalize();

      const deflectionAngle = (15 * Math.PI / 180) * (0.7 + Math.random() * 0.6);
      const direction = new THREE.Vector3()
        .addScaledVector(parentDir, Math.cos(deflectionAngle))
        .addScaledVector(right, Math.sin(deflectionAngle) * Math.cos(angle))
        .addScaledVector(forward, Math.sin(deflectionAngle) * Math.sin(angle))
        .normalize();

      const parentLength = branch.parent ? branch.parent.length : 2;
      const parentRadius = branch.parent ? branch.parent.radius : 0.2;
      const layerScale = Math.pow(0.72, branch.layer + 1);
      const length = parentLength * layerScale * (0.8 + Math.random() * 0.4);
      const radius = parentRadius * Math.pow(0.7, branch.layer + 1);

      const startPoint = branch.start.clone();
      const endPoint = new THREE.Vector3().addVectors(
        startPoint,
        direction.clone().multiplyScalar(length)
      );

      const newBranch = this.createBranch(
        startPoint,
        endPoint,
        radius,
        branch.layer + 1,
        branch.parent
      );
      newBranch.cut = false;
      this.branches.push(newBranch);

      if (branch.layer + 1 < this.maxLayers) {
        const childCount = 1 + Math.floor(Math.random() * 2);
        for (let j = 0; j < childCount; j++) {
          const childAngle = (j / childCount) * Math.PI * 2 + Math.random() * 0.8;
          this.growBranchFromPoint(newBranch, 0.65 + Math.random() * 0.3, childAngle, branch.layer + 2);
        }
      }
    }

    branch.cut = false;
  }

  public getStats(): TreeStats {
    let maxLayer = 0;
    for (const branch of this.branches) {
      if (branch.layer > maxLayer) maxLayer = branch.layer;
    }
    return {
      branchCount: this.branches.length,
      leafCount: this.leaves.length,
      maxLayer: maxLayer + 1
    };
  }

  public triggerBloom(): void {
    if (this.isBlooming) return;
    this.isBlooming = true;
    this.originalLeaves = [];

    for (const leaf of this.leaves) {
      const mat = leaf.material as THREE.MeshLambertMaterial;
      this.originalLeaves.push({
        mesh: leaf,
        color: mat.color.clone(),
        scale: leaf.scale.clone()
      });
    }

    this.bloomTime = 0;
    this.bloomPhase = 0;

    const topPoint = this.findHighestPoint();
    this.createBloomParticles(topPoint);
  }

  private bloomTime: number = 0;
  private bloomPhase: number = 0;

  private findHighestPoint(): THREE.Vector3 {
    let highest = new THREE.Vector3(0, 0, 0);
    for (const branch of this.branches) {
      if (branch.end.y > highest.y) highest = branch.end.clone();
    }
    if (this.branches.length === 0) highest.set(0, 3, 0);
    return highest;
  }

  private createBloomParticles(origin: THREE.Vector3): void {
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const speed = 0.5 + Math.random() * 1.0;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      ));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff69b4,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.bloomParticles = new THREE.Points(geometry, material);
    (this.bloomParticles as any).velocities = velocities;
    (this.bloomParticles as any).origin = origin.clone();
    this.group.add(this.bloomParticles);
  }

  private updateBloom(deltaTime: number): void {
    this.bloomTime += deltaTime;

    if (this.bloomPhase === 0) {
      const t = Math.min(this.bloomTime / 0.8, 1);
      const easeT = t * t * (3 - 2 * t);

      for (const { mesh, color } of this.originalLeaves) {
        const mat = mesh.material as THREE.MeshLambertMaterial;
        mat.color.lerpColors(color, new THREE.Color(0xff69b4), easeT);
        const scale = 1 + easeT * 0.5;
        mesh.scale.setScalar(scale);
      }

      if (t >= 1) {
        this.bloomPhase = 1;
        this.bloomTime = 0;
      }
    } else if (this.bloomPhase === 1) {
      const t = Math.min(this.bloomTime / 0.6, 1);

      for (const { mesh } of this.originalLeaves) {
        const mat = mesh.material as THREE.MeshLambertMaterial;
        mat.opacity = 1 - t;
        mat.transparent = true;
        mesh.scale.setScalar(1.5 * (1 - t * 0.5));
      }

      if (t >= 1) {
        this.bloomPhase = 2;
        this.bloomTime = 0;
      }
    } else if (this.bloomPhase === 2) {
      if (this.bloomParticles) {
        const positions = this.bloomParticles.geometry.attributes.position.array as Float32Array;
        const velocities = (this.bloomParticles as any).velocities as THREE.Vector3[];
        const count = velocities.length;

        for (let i = 0; i < count; i++) {
          positions[i * 3] += velocities[i].x * deltaTime * 2;
          positions[i * 3 + 1] += velocities[i].y * deltaTime * 2;
          positions[i * 3 + 2] += velocities[i].z * deltaTime * 2;
          velocities[i].y -= deltaTime * 0.8;
        }
        this.bloomParticles.geometry.attributes.position.needsUpdate = true;

        const mat = this.bloomParticles.material as THREE.PointsMaterial;
        mat.opacity = Math.max(0, 0.9 - this.bloomTime * 0.45);
      }

      if (this.bloomTime > 2.0) {
        this.bloomPhase = 3;
        this.bloomTime = 0;
      }
    } else if (this.bloomPhase === 3) {
      const t = Math.min(this.bloomTime / 0.4, 1);
      const easeT = t * t * (3 - 2 * t);

      for (const { mesh, color, scale } of this.originalLeaves) {
        const mat = mesh.material as THREE.MeshLambertMaterial;
        mat.opacity = easeT;
        mat.color.lerpColors(new THREE.Color(0xff69b4), color, easeT);
        mesh.scale.lerpVectors(new THREE.Vector3(0.75, 0.75, 0.75), scale, easeT);
      }

      if (t >= 1) {
        for (const { mesh, color, scale } of this.originalLeaves) {
          const mat = mesh.material as THREE.MeshLambertMaterial;
          mat.color.copy(color);
          mat.opacity = 1;
          mat.transparent = false;
          mesh.scale.copy(scale);
        }

        if (this.bloomParticles) {
          this.group.remove(this.bloomParticles);
          this.bloomParticles.geometry.dispose();
          (this.bloomParticles.material as THREE.Material).dispose();
          this.bloomParticles = null;
        }

        this.originalLeaves = [];
        this.isBlooming = false;
        this.bloomPhase = 0;
      }
    }
  }

  public clear(): void {
    for (const branch of this.branches) {
      this.group.remove(branch.mesh);
      branch.mesh.geometry.dispose();
      (branch.mesh.material as THREE.Material).dispose();
      if (branch.growthPoint) {
        this.group.remove(branch.growthPoint);
        branch.growthPoint.geometry.dispose();
        (branch.growthPoint.material as THREE.Material).dispose();
      }
    }

    for (const leaf of this.leaves) {
      this.group.remove(leaf);
      leaf.geometry.dispose();
      (leaf.material as THREE.Material).dispose();
    }

    if (this.bloomParticles) {
      this.group.remove(this.bloomParticles);
      this.bloomParticles.geometry.dispose();
      (this.bloomParticles.material as THREE.Material).dispose();
      this.bloomParticles = null;
    }

    this.branches = [];
    this.leaves = [];
    this.originalLeaves = [];
    this.isBlooming = false;
  }
}
