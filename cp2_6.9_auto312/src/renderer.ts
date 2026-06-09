import * as THREE from 'three';
import { Vine, VineNode, Flower, VineStage } from './vineGenerator';

interface SparkParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

export class VineRenderer {
  private scene: THREE.Scene;
  private vineMeshes: Map<number, THREE.Group> = new Map();
  private seedMeshes: Map<number, THREE.Mesh> = new Map();
  private seedHaloMeshes: Map<number, THREE.Mesh> = new Map();
  private sparkParticles: SparkParticle[] = [];
  private burstParticles: BurstParticle[] = [];
  private leafGeometries: THREE.BufferGeometry[] = [];
  private petalGeometry: THREE.BufferGeometry;
  private maxParticles = 800;

  private colorSprout = new THREE.Color('#8FBC8F');
  private colorGrowStart = new THREE.Color('#6B9E6B');
  private colorGrowEnd = new THREE.Color('#4F7A4F');
  private colorSeed = new THREE.Color('#5B8C5A');
  private colorFlowerStart = new THREE.Color('#FF6B9D');
  private colorFlowerEnd = new THREE.Color('#FF8C42');
  private colorFruit = new THREE.Color('#FF4757');

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.petalGeometry = this.createPetalGeometry();
    for (let i = 0; i < 3; i++) {
      this.leafGeometries.push(this.createLeafGeometry());
    }
  }

  private createPetalGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.15, 0.15, 0, 0.35);
    shape.quadraticCurveTo(-0.15, 0.15, 0, 0);
    return new THREE.ShapeGeometry(shape);
  }

  private createLeafGeometry(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.25, 0.1, 0.3, 0.35);
    shape.quadraticCurveTo(0.1, 0.25, 0, 0.45);
    shape.quadraticCurveTo(-0.1, 0.25, -0.3, 0.35);
    shape.quadraticCurveTo(-0.25, 0.1, 0, 0);
    return new THREE.ShapeGeometry(shape);
  }

  private getStageColor(vine: Vine, node: VineNode): THREE.Color {
    if (vine.totalAge < 5) {
      return this.colorSprout.clone();
    }
    const t = Math.min(1, (vine.totalAge - 5) / 30);
    return this.colorGrowStart.clone().lerp(this.colorGrowEnd, t);
  }

  private getVineGroup(vineId: number): THREE.Group {
    let group = this.vineMeshes.get(vineId);
    if (!group) {
      group = new THREE.Group();
      this.scene.add(group);
      this.vineMeshes.set(vineId, group);
    }
    return group;
  }

  createSeed(vineId: number, position: THREE.Vector3): void {
    const seedGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const seedMat = new THREE.MeshStandardMaterial({
      color: this.colorSeed,
      emissive: this.colorSeed,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.1
    });
    const seedMesh = new THREE.Mesh(seedGeo, seedMat);
    seedMesh.position.copy(position);
    this.scene.add(seedMesh);
    this.seedMeshes.set(vineId, seedMesh);

    const haloGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: this.colorSeed,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.copy(position);
    this.scene.add(haloMesh);
    this.seedHaloMeshes.set(vineId, haloMesh);
  }

  updateSeed(vineId: number, sinkProgress: number, time: number): void {
    const seedMesh = this.seedMeshes.get(vineId);
    const haloMesh = this.seedHaloMeshes.get(vineId);
    if (seedMesh && haloMesh) {
      const fade = 1 - sinkProgress;
      seedMesh.scale.setScalar(fade);
      haloMesh.scale.setScalar(1 + sinkProgress * 0.5);
      (haloMesh.material as THREE.MeshBasicMaterial).opacity = 0.25 * fade;
      const pulse = 1 + Math.sin(time * 3) * 0.1;
      haloMesh.scale.multiplyScalar(pulse);
      if (sinkProgress >= 1) {
        this.scene.remove(seedMesh);
        this.scene.remove(haloMesh);
        seedMesh.geometry.dispose();
        (seedMesh.material as THREE.Material).dispose();
        haloMesh.geometry.dispose();
        (haloMesh.material as THREE.Material).dispose();
        this.seedMeshes.delete(vineId);
        this.seedHaloMeshes.delete(vineId);
      }
    }
  }

  renderVine(vine: Vine, time: number, timeScale: number): void {
    const group = this.getVineGroup(vine.id);
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    }

    if (vine.nodes.length < 2) return;

    const color = this.getStageColor(vine, vine.nodes[0]);
    for (let i = 1; i < vine.nodes.length; i++) {
      const parent = vine.nodes[vine.nodes[i].parentIndex];
      const child = vine.nodes[i];
      if (!parent) continue;

      const start = parent.position;
      const end = child.position;
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();
      if (len < 0.001) continue;

      const nodeColor = this.getStageColor(vine, child);
      const radius = child.radius;
      const cylGeo = new THREE.CylinderGeometry(radius * 0.8, radius, len, 6);
      const cylMat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        roughness: 0.8,
        metalness: 0.05
      });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      cyl.position.copy(mid);
      cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      group.add(cyl);

      if (child.hasLeftLeaf || child.hasRightLeaf) {
        const perp = new THREE.Vector3();
        if (Math.abs(dir.x) < 0.9) perp.set(1, 0, 0);
        else perp.set(0, 0, 1);
        perp.cross(dir).normalize();

        const leafGeo = this.leafGeometries[Math.floor(Math.random() * this.leafGeometries.length)];
        const sway = Math.sin(time * 1.5 * timeScale + child.leafPhase) * 0.15;

        if (child.hasLeftLeaf) {
          const leafMat = new THREE.MeshStandardMaterial({
            color: nodeColor.clone().multiplyScalar(1.15),
            roughness: 0.7,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92
          });
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.copy(end);
          const leafDir = perp.clone().negate().applyAxisAngle(dir, sway);
          leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDir);
          leaf.scale.setScalar(0.7 + Math.random() * 0.3);
          group.add(leaf);
        }

        if (child.hasRightLeaf) {
          const leafMat = new THREE.MeshStandardMaterial({
            color: nodeColor.clone().multiplyScalar(1.15),
            roughness: 0.7,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92
          });
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.copy(end);
          const leafDir = perp.clone().applyAxisAngle(dir, -sway);
          leaf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDir);
          leaf.scale.setScalar(0.7 + Math.random() * 0.3);
          group.add(leaf);
        }
      }
    }

    for (const flower of vine.flowers) {
      this.renderFlower(group, flower, time, timeScale);
    }
  }

  private renderFlower(group: THREE.Group, flower: Flower, time: number, timeScale: number): void {
    if (flower.hasFruit) {
      const fruitGeo = new THREE.SphereGeometry(0.2, 12, 12);
      const fruitMat = new THREE.MeshStandardMaterial({
        color: this.colorFruit,
        roughness: 0.3,
        metalness: 0.1,
        emissive: this.colorFruit,
        emissiveIntensity: flower.fruitReady ? 0.3 : 0.1
      });
      const fruit = new THREE.Mesh(fruitGeo, fruitMat);
      fruit.position.copy(flower.position);
      fruit.position.y += 0.1;
      const bob = Math.sin(time * 2 * timeScale) * 0.03;
      fruit.position.y += bob;
      if (!flower.fruitReady) {
        fruit.scale.setScalar(0.5 + flower.bloomProgress * 0.5);
      }
      group.add(fruit);
      return;
    }

    const petalCount = 6;
    const bloomScale = Math.min(1, flower.bloomProgress);
    const colorT = Math.random();
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalMat = new THREE.MeshStandardMaterial({
        color: this.colorFlowerStart.clone().lerp(this.colorFlowerEnd, (i / petalCount + colorT) % 1),
        roughness: 0.4,
        metalness: 0.2,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: flower.withered ? 0.3 : 0.95
      });
      const petal = new THREE.Mesh(this.petalGeometry, petalMat);
      petal.position.copy(flower.position);
      petal.position.y += 0.05;

      const tilt = (1 - bloomScale) * 1.2;
      const euler = new THREE.Euler(
        tilt + Math.sin(time * 0.5 * timeScale + i) * 0.05,
        angle,
        0
      );
      petal.quaternion.setFromEuler(euler);
      petal.scale.setScalar(bloomScale * (0.8 + Math.random() * 0.4));
      group.add(petal);
    }

    const coreGeo = new THREE.SphereGeometry(0.08 * bloomScale, 8, 8);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xFFE66D,
      emissive: 0xFFE66D,
      emissiveIntensity: 0.4,
      roughness: 0.3
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(flower.position);
    core.position.y += 0.08;
    group.add(core);
  }

  addBoundarySpark(position: THREE.Vector3): void {
    if (this.sparkParticles.length + this.burstParticles.length >= this.maxParticles) return;

    const geo = new THREE.SphereGeometry(0.04, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88FF88,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.position.y += Math.random() * 0.3;
    this.scene.add(mesh);

    this.sparkParticles.push({
      mesh,
      life: 0,
      maxLife: 2,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 0.3
      )
    });
  }

  addFruitBurst(position: THREE.Vector3): void {
    const count = 30;
    for (let i = 0; i < count; i++) {
      if (this.sparkParticles.length + this.burstParticles.length >= this.maxParticles) break;

      const geo = new THREE.SphereGeometry(0.05, 6, 6);
      const color = this.colorFruit.clone().lerp(new THREE.Color('#FF6B81'), Math.random());
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 2.5 + 0.5,
        (Math.random() - 0.5) * 3
      );

      this.burstParticles.push({
        mesh,
        life: 0,
        maxLife: 1.5,
        velocity
      });
    }
  }

  updateParticles(dt: number, timeScale: number): void {
    const scaledDt = dt * timeScale;

    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.life += scaledDt;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(scaledDt));
      p.velocity.y -= scaledDt * 0.3;
      const opacity = Math.max(0, 1 - p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.9;
      p.mesh.scale.setScalar(1 + p.life * 0.5);

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.sparkParticles.splice(i, 1);
      }
    }

    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.life += scaledDt;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(scaledDt));
      p.velocity.y -= scaledDt * 4;
      const opacity = Math.max(0, 1 - p.life / p.maxLife);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      const scale = Math.max(0.1, 1 - p.life / p.maxLife);
      p.mesh.scale.setScalar(scale);

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.burstParticles.splice(i, 1);
      }
    }
  }

  getStageName(stage: VineStage): string {
    switch (stage) {
      case 'sprouting': return '萌芽';
      case 'growing': return '生长';
      case 'flowering': return '开花';
      case 'fruiting': return '结果';
    }
  }

  disposeVine(vineId: number): void {
    const group = this.vineMeshes.get(vineId);
    if (group) {
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      }
      this.scene.remove(group);
      this.vineMeshes.delete(vineId);
    }
  }
}
