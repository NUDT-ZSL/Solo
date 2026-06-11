import * as THREE from 'three';
import { StructureType, CompoundStructure } from './paper';

export enum CreatureType {
  CRANE = 'CRANE',
  FOX = 'FOX',
  DRAGON = 'DRAGON',
}

const CREATURE_STRUCTURE_MAP: Map<StructureType, CreatureType> = new Map([
  [StructureType.HEXAHEDRON, CreatureType.CRANE],
  [StructureType.TETRAHEDRON, CreatureType.FOX],
  [StructureType.STAR, CreatureType.DRAGON],
]);

export const CREATURE_NAMES: Map<CreatureType, string> = new Map([
  [CreatureType.CRANE, '千纸鹤'],
  [CreatureType.FOX, '折纸狐'],
  [CreatureType.DRAGON, '纸龙'],
]);

const MAX_PARTICLES = 200;

export class Creature {
  type: CreatureType;
  name: string;
  mesh: THREE.Group;
  isUnlocked: boolean = false;
  actionAnimation: (() => void) | null = null;
  private scene: THREE.Scene;
  private idleTime: number = 0;
  private baseY: number = 0;
  private actionActive: boolean = false;
  private actionTime: number = 0;

  constructor(type: CreatureType, scene: THREE.Scene) {
    this.type = type;
    this.name = CREATURE_NAMES.get(type) || type;
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.buildModel();
  }

  private buildModel(): void {
    const rainbowMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      shininess: 80,
      emissive: 0x222222,
    });

    if (this.type === CreatureType.CRANE) {
      this.buildCrane(rainbowMaterial);
    } else if (this.type === CreatureType.FOX) {
      this.buildFox(rainbowMaterial);
    } else if (this.type === CreatureType.DRAGON) {
      this.buildDragon(rainbowMaterial);
    }
  }

  private buildCrane(mat: THREE.MeshPhongMaterial): void {
    const bodyGeo = new THREE.ConeGeometry(0.3, 1.0, 4);
    const body = new THREE.Mesh(bodyGeo, mat.clone());
    body.rotation.x = Math.PI / 2;
    this.mesh.add(body);

    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      0, 0, 0,  -1.2, 0.4, 0.2,  -0.4, 0, 0.4,
      0, 0, 0,   1.2, 0.4, 0.2,   0.4, 0, 0.4,
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();
    const leftWing = new THREE.Mesh(wingGeo, mat.clone());
    leftWing.position.set(0, 0.1, -0.2);
    this.mesh.add(leftWing);

    const rightWingGeo = wingGeo.clone();
    const rightWing = new THREE.Mesh(rightWingGeo, mat.clone());
    rightWing.position.set(0, 0.1, -0.2);
    rightWing.scale.x = -1;
    this.mesh.add(rightWing);

    const headGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const head = new THREE.Mesh(headGeo, mat.clone());
    head.position.set(0, 0.1, -0.6);
    this.mesh.add(head);

    const beakGeo = new THREE.ConeGeometry(0.05, 0.2, 4);
    const beak = new THREE.Mesh(beakGeo, mat.clone());
    beak.rotation.x = -Math.PI / 2;
    beak.position.set(0, 0.05, -0.85);
    this.mesh.add(beak);

    const tailGeo = new THREE.BufferGeometry();
    const tailVerts = new Float32Array([
      0, 0, 0.5,  -0.3, 0.2, 1.0,  0, 0, 1.0,
      0, 0, 0.5,   0.3, 0.2, 1.0,  0, 0, 1.0,
    ]);
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
    tailGeo.computeVertexNormals();
    const tail = new THREE.Mesh(tailGeo, mat.clone());
    this.mesh.add(tail);

    this.actionAnimation = () => {
      this.actionActive = true;
      this.actionTime = 0;
    };
  }

  private buildFox(mat: THREE.MeshPhongMaterial): void {
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 1.0);
    const body = new THREE.Mesh(bodyGeo, mat.clone());
    body.position.y = 0.2;
    this.mesh.add(body);

    const headGeo = new THREE.BoxGeometry(0.4, 0.35, 0.4);
    const head = new THREE.Mesh(headGeo, mat.clone());
    head.position.set(0, 0.35, -0.55);
    this.mesh.add(head);

    const earGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
    const leftEar = new THREE.Mesh(earGeo, mat.clone());
    leftEar.position.set(-0.12, 0.62, -0.55);
    this.mesh.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, mat.clone());
    rightEar.position.set(0.12, 0.62, -0.55);
    this.mesh.add(rightEar);

    const snoutGeo = new THREE.ConeGeometry(0.1, 0.25, 4);
    const snout = new THREE.Mesh(snoutGeo, mat.clone());
    snout.rotation.x = -Math.PI / 2;
    snout.position.set(0, 0.3, -0.85);
    this.mesh.add(snout);

    const tailGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
    const tail = new THREE.Mesh(tailGeo, mat.clone());
    tail.rotation.x = Math.PI / 4;
    tail.position.set(0, 0.4, 0.65);
    this.mesh.add(tail);

    this.actionAnimation = () => {
      this.actionActive = true;
      this.actionTime = 0;
    };
  }

  private buildDragon(mat: THREE.MeshPhongMaterial): void {
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 6);
    const body = new THREE.Mesh(bodyGeo, mat.clone());
    body.rotation.x = Math.PI / 2;
    body.position.y = 0.3;
    this.mesh.add(body);

    const headGeo = new THREE.SphereGeometry(0.2, 6, 6);
    const head = new THREE.Mesh(headGeo, mat.clone());
    head.position.set(0, 0.4, -0.75);
    this.mesh.add(head);

    const hornGeo = new THREE.ConeGeometry(0.04, 0.3, 4);
    const leftHorn = new THREE.Mesh(hornGeo, mat.clone());
    leftHorn.position.set(-0.1, 0.65, -0.75);
    leftHorn.rotation.z = 0.2;
    this.mesh.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeo, mat.clone());
    rightHorn.position.set(0.1, 0.65, -0.75);
    rightHorn.rotation.z = -0.2;
    this.mesh.add(rightHorn);

    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      0, 0, 0,  -1.0, 0.5, 0.1,  -0.5, 0.1, 0.5,
      0, 0, 0,   1.0, 0.5, 0.1,   0.5, 0.1, 0.5,
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();
    const leftWing = new THREE.Mesh(wingGeo, mat.clone());
    leftWing.position.set(0, 0.3, -0.1);
    this.mesh.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, mat.clone());
    rightWing.position.set(0, 0.3, -0.1);
    rightWing.scale.x = -1;
    this.mesh.add(rightWing);

    const tailGeo = new THREE.ConeGeometry(0.1, 0.8, 4);
    const tail = new THREE.Mesh(tailGeo, mat.clone());
    tail.rotation.x = -Math.PI / 4;
    tail.position.set(0, 0.35, 0.8);
    this.mesh.add(tail);

    this.actionAnimation = () => {
      this.actionActive = true;
      this.actionTime = 0;
    };
  }

  playSpawnAnimation(origin: THREE.Vector3, onComplete?: () => void): void {
    this.mesh.position.copy(origin);
    this.mesh.scale.set(0.01, 0.01, 0.01);
    this.baseY = origin.y;
    this.scene.add(this.mesh);

    const particleSystem = new ParticleSystem(this.scene, origin, MAX_PARTICLES);
    particleSystem.emit();

    const startTime = performance.now();
    const duration = 3000;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      const scale = eased;
      this.mesh.scale.set(scale, scale, scale);

      particleSystem.update(16);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        particleSystem.dispose();
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  update(deltaMs: number): void {
    this.idleTime += deltaMs;
    const floatOffset = Math.sin(this.idleTime * 0.002) * 0.1;
    this.mesh.position.y = this.baseY + floatOffset;

    const hue = (this.idleTime * 0.0001) % 1;
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
        child.material.color.setHSL(hue, 0.6, 0.65);
        child.material.emissive.setHSL(hue, 0.3, 0.1);
      }
    });

    if (this.actionActive) {
      this.actionTime += deltaMs;

      if (this.type === CreatureType.CRANE) {
        const wingAngle = Math.sin(this.actionTime * 0.01) * 0.5;
        const wings = this.mesh.children.filter((_, i) => i === 1 || i === 2);
        wings.forEach((wing, i) => {
          wing.rotation.z = (i === 0 ? 1 : -1) * wingAngle;
        });
        if (this.actionTime > 2000) this.actionActive = false;
      } else if (this.type === CreatureType.FOX) {
        const jumpHeight = Math.abs(Math.sin(this.actionTime * 0.005)) * 0.5;
        this.mesh.position.y = this.baseY + floatOffset + jumpHeight;
        if (this.actionTime > 2000) this.actionActive = false;
      } else if (this.type === CreatureType.DRAGON) {
        if (this.actionTime < 2000) {
          this.emitFireParticle();
        } else {
          this.actionActive = false;
        }
      }
    }
  }

  private fireParticleTimer: number = 0;
  private emitFireParticle(): void {
    this.fireParticleTimer++;
    if (this.fireParticleTimer % 5 !== 0) return;

    const headPos = new THREE.Vector3(0, 0.4, -0.95);
    this.mesh.localToWorld(headPos);

    const geo = new THREE.SphereGeometry(0.05, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.05 + Math.random() * 0.08, 1, 0.5),
      transparent: true,
      opacity: 0.8,
    });
    const particle = new THREE.Mesh(geo, mat);
    particle.position.copy(headPos);
    this.scene.add(particle);

    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      Math.random() * 0.02 + 0.01,
      -0.05 - Math.random() * 0.03
    );

    let life = 0;
    const animateParticle = () => {
      life++;
      particle.position.add(dir);
      mat.opacity -= 0.03;
      if (mat.opacity > 0 && life < 40) {
        requestAnimationFrame(animateParticle);
      } else {
        this.scene.remove(particle);
        geo.dispose();
        mat.dispose();
      }
    };
    requestAnimationFrame(animateParticle);
  }

  playAction(): void {
    if (this.actionAnimation) {
      this.actionAnimation();
    }
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private origin: THREE.Vector3;
  private maxParticles: number;
  private mesh: THREE.InstancedMesh | null = null;
  private positions: Float32Array;
  private velocities: Float32Array;
  private lives: Float32Array;
  private particleCount: number = 0;
  private dummy: THREE.Object3D;

  constructor(scene: THREE.Scene, origin: THREE.Vector3, maxParticles: number) {
    this.scene = scene;
    this.origin = origin.clone();
    this.maxParticles = Math.min(maxParticles, MAX_PARTICLES);
    this.positions = new Float32Array(this.maxParticles * 3);
    this.velocities = new Float32Array(this.maxParticles * 3);
    this.lives = new Float32Array(this.maxParticles);
    this.dummy = new THREE.Object3D();
  }

  emit(): void {
    const geo = new THREE.SphereGeometry(0.04, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.mesh);

    this.particleCount = this.maxParticles;

    for (let i = 0; i < this.maxParticles; i++) {
      const idx = i * 3;
      this.positions[idx] = this.origin.x + (Math.random() - 0.5) * 2;
      this.positions[idx + 1] = this.origin.y + (Math.random() - 0.5) * 2;
      this.positions[idx + 2] = this.origin.z + (Math.random() - 0.5) * 2;

      this.velocities[idx] = (Math.random() - 0.5) * 0.02;
      this.velocities[idx + 1] = Math.random() * 0.03 + 0.01;
      this.velocities[idx + 2] = (Math.random() - 0.5) * 0.02;

      this.lives[i] = 1.0;

      this.dummy.position.set(this.positions[idx], this.positions[idx + 1], this.positions[idx + 2]);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(deltaMs: number): void {
    if (!this.mesh) return;

    const dt = deltaMs / 1000;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      this.positions[idx] += this.velocities[idx];
      this.positions[idx + 1] += this.velocities[idx + 1];
      this.positions[idx + 2] += this.velocities[idx + 2];

      this.velocities[idx] *= 0.98;
      this.velocities[idx + 1] *= 0.98;
      this.velocities[idx + 2] *= 0.98;

      this.lives[i] -= dt * 0.5;

      this.dummy.position.set(this.positions[idx], this.positions[idx + 1], this.positions[idx + 2]);
      const s = Math.max(this.lives[i], 0);
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;

    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 1 - dt * 0.3);
  }

  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
      this.mesh = null;
    }
  }
}

export class CreatureManager {
  private creatures: Map<CreatureType, Creature> = new Map();
  private unlockedTypes: Set<CreatureType> = new Set();
  totalCreatures: number = 3;

  onCreatureUnlocked: ((creature: Creature) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.creatures.set(CreatureType.CRANE, new Creature(CreatureType.CRANE, scene));
    this.creatures.set(CreatureType.FOX, new Creature(CreatureType.FOX, scene));
    this.creatures.set(CreatureType.DRAGON, new Creature(CreatureType.DRAGON, scene));
  }

  tryUnlock(compound: CompoundStructure): Creature | null {
    const structureType = compound.getStructureType();
    if (!structureType) return null;

    const creatureType = CREATURE_STRUCTURE_MAP.get(structureType);
    if (!creatureType) return null;

    if (this.unlockedTypes.has(creatureType)) return null;

    const creature = this.creatures.get(creatureType)!;
    creature.isUnlocked = true;
    this.unlockedTypes.add(creatureType);

    const origin = new THREE.Vector3(0, 2, 0);
    creature.playSpawnAnimation(origin, () => {
      if (this.onCreatureUnlocked) {
        this.onCreatureUnlocked(creature);
      }
    });

    return creature;
  }

  getUnlockedCount(): number {
    return this.unlockedTypes.size;
  }

  isUnlocked(type: CreatureType): boolean {
    return this.unlockedTypes.has(type);
  }

  getCreature(type: CreatureType): Creature | undefined {
    return this.creatures.get(type);
  }

  getAllCreatureTypes(): CreatureType[] {
    return [CreatureType.CRANE, CreatureType.FOX, CreatureType.DRAGON];
  }

  update(deltaMs: number): void {
    for (const [, creature] of this.creatures) {
      if (creature.isUnlocked) {
        creature.update(deltaMs);
      }
    }
  }

  dispose(): void {
    for (const [, creature] of this.creatures) {
      creature.dispose();
    }
    this.creatures.clear();
  }
}
