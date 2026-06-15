import * as THREE from 'three';
import { CrystalBead, CrystalBeadData } from './CrystalBead';

export interface EngineParams {
  growthSpeed: number;
  branchProbability: number;
  glowIntensity: number;
}

export class CrystalEngine {
  beads: Map<number, CrystalBead> = new Map();
  private nextId = 0;
  private scene: THREE.Scene;
  private growthTimer = 0;
  params: EngineParams;
  private dustParticles: THREE.Points;
  private dustPositions: Float32Array;
  private dustVelocities: Float32Array;
  private dustSizes: Float32Array;
  private dustOpacities: Float32Array;
  private dustGeometry: THREE.BufferGeometry;
  private dustMaterial: THREE.PointsMaterial;
  private maxDepth = 8;
  private rootPositions: THREE.Vector3[] = [];

  onBeadClicked: ((bead: CrystalBead) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.params = {
      growthSpeed: 1.0,
      branchProbability: 0.35,
      glowIntensity: 1.0,
    };
    this.dustParticles = this.createDustSystem();
    this.scene.add(this.dustParticles);
    this.spawnRoots(5);
  }

  private spawnRoots(count: number) {
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4 - 1,
        (Math.random() - 0.5) * 6
      );
      this.rootPositions.push(pos.clone());
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        Math.random() * 0.5 + 0.3,
        (Math.random() - 0.5) * 0.6
      ).normalize();
      this.createBead(pos, dir, 0, null);
    }
  }

  private createBead(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    depth: number,
    parentId: number | null
  ): CrystalBead {
    const id = this.nextId++;
    const data: CrystalBeadData = {
      id,
      parentId,
      position: position.clone(),
      direction: direction.clone().normalize(),
      depth,
      age: 0,
      branchCount: 0,
      glowIntensity: 50,
      resonanceTime: 0,
      isGrowing: true,
      targetLength: Math.max(0.3, (1.2 - depth * 0.1) * (0.7 + Math.random() * 0.6)),
      currentLength: 0,
      children: [],
    };

    const bead = new CrystalBead(data);
    this.beads.set(id, bead);
    this.scene.add(bead.mesh);

    if (parentId !== null && this.beads.has(parentId)) {
      const parent = this.beads.get(parentId)!;
      parent.data.children.push(id);
      parent.data.branchCount++;
    }

    return bead;
  }

  update(delta: number) {
    const scaledDelta = delta * this.params.growthSpeed;
    this.growthTimer += scaledDelta;

    if (this.growthTimer > 0.3) {
      this.growthTimer = 0;
      this.tryGrow();
    }

    this.beads.forEach((bead) => {
      bead.update(delta, this.params.glowIntensity);
    });

    this.updateDust(delta);
  }

  private tryGrow() {
    const candidates: CrystalBead[] = [];
    this.beads.forEach((bead) => {
      if (!bead.data.isGrowing && bead.data.depth < this.maxDepth) {
        candidates.push(bead);
      }
    });

    for (const parent of candidates) {
      if (Math.random() < this.params.branchProbability * 0.3) {
        this.branchFrom(parent);
      }
    }
  }

  private branchFrom(parent: CrystalBead) {
    const branchCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < branchCount; i++) {
      const spreadAngle = (Math.PI / 4) * (0.5 + Math.random() * 0.5);
      const twistAngle = Math.random() * Math.PI * 2;

      const parentDir = parent.data.direction.clone();
      const perpendicular = new THREE.Vector3();
      if (Math.abs(parentDir.y) < 0.9) {
        perpendicular.crossVectors(parentDir, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perpendicular.crossVectors(parentDir, new THREE.Vector3(1, 0, 0)).normalize();
      }

      const newDir = parentDir.clone();
      const rotAxis = perpendicular
        .clone()
        .applyAxisAngle(parentDir, twistAngle);
      newDir.applyAxisAngle(rotAxis, spreadAngle);
      newDir.y = Math.abs(newDir.y) * 0.5 + 0.2;
      newDir.normalize();

      const length = parent.data.targetLength;
      const newPos = parent.data.position
        .clone()
        .add(parent.data.direction.clone().multiplyScalar(length));

      const existingChild = this.beads.get(parent.data.children[0]);
      if (existingChild) {
        newPos.copy(existingChild.data.position);
      }

      this.createBead(newPos, newDir, parent.data.depth + 1, parent.data.id);
    }
  }

  private createDustSystem(): THREE.Points {
    const count = 500;
    this.dustGeometry = new THREE.BufferGeometry();
    this.dustPositions = new Float32Array(count * 3);
    this.dustVelocities = new Float32Array(count * 3);
    this.dustSizes = new Float32Array(count);
    this.dustOpacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.dustPositions[i * 3] = (Math.random() - 0.5) * 20;
      this.dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      this.dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      this.dustVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.dustVelocities[i * 3 + 1] = Math.random() * 0.01 + 0.005;
      this.dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      this.dustSizes[i] = Math.random() * 3 + 1;
      this.dustOpacities[i] = Math.random();
    }

    this.dustGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.dustPositions, 3)
    );
    this.dustGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.dustSizes, 1)
    );

    this.dustMaterial = new THREE.PointsMaterial({
      color: 0x886644,
      size: 0.05,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(this.dustGeometry, this.dustMaterial);
  }

  private updateDust(delta: number) {
    const positions = this.dustGeometry.attributes.position as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;
    const count = arr.length / 3;

    for (let i = 0; i < count; i++) {
      arr[i * 3] += this.dustVelocities[i * 3] * delta * 60;
      arr[i * 3 + 1] += this.dustVelocities[i * 3 + 1] * delta * 60;
      arr[i * 3 + 2] += this.dustVelocities[i * 3 + 2] * delta * 60;

      if (arr[i * 3 + 1] > 6) {
        arr[i * 3] = (Math.random() - 0.5) * 20;
        arr[i * 3 + 1] = -6;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
    }
    positions.needsUpdate = true;

    const pulse = Math.sin(performance.now() * 0.001) * 0.1 + 0.3;
    this.dustMaterial.opacity = pulse;
  }

  handleClick(raycaster: THREE.Raycaster): CrystalBead | null {
    const meshes: THREE.Object3D[] = [];
    const meshToBead = new Map<THREE.Object3D, CrystalBead>();

    this.beads.forEach((bead) => {
      bead.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
          meshToBead.set(child, bead);
        }
      });
    });

    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = meshToBead.get(intersects[0].object);
      if (hit) {
        this.triggerResonance(hit.data.id, 3);
        return hit;
      }
    }
    return null;
  }

  private triggerResonance(startId: number, maxHops: number) {
    const visited = new Set<number>();
    const queue: { id: number; hops: number }[] = [{ id: startId, hops: 0 }];

    while (queue.length > 0) {
      const { id, hops } = queue.shift()!;
      if (visited.has(id) || hops > maxHops) continue;
      visited.add(id);

      const bead = this.beads.get(id);
      if (bead) {
        bead.triggerResonance();

        if (bead.data.parentId !== null) {
          queue.push({ id: bead.data.parentId, hops: hops + 1 });
        }
        for (const childId of bead.data.children) {
          queue.push({ id: childId, hops: hops + 1 });
        }
      }
    }
  }

  reset() {
    this.beads.forEach((bead) => {
      this.scene.remove(bead.mesh);
      bead.dispose();
    });
    this.beads.clear();
    this.nextId = 0;
    this.rootPositions = [];
    this.growthTimer = 0;
    this.spawnRoots(5);
  }

  dispose() {
    this.reset();
    this.scene.remove(this.dustParticles);
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
  }
}
