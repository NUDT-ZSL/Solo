import * as THREE from 'three';
import { Crystal, CrystalParams } from './Crystal';
import { ParticleSystem } from './ParticleSystem';

const RESONANCE_RADIUS = 3.0;
const SHOCKWAVE_RADIUS = 8.0;
const SHOCKWAVE_STRENGTH = 1.5;

export class CrystalCluster {
  crystals: Crystal[] = [];
  private particleSystem: ParticleSystem;
  private group: THREE.Group;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private growthSpeed: number = 1.0;
  private resonanceStrength: number = 1.0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.particleSystem = new ParticleSystem();
    this.group.add(this.particleSystem.getObject());

    this.generateCrystals();
  }

  private generateCrystals() {
    const count = 300;
    const spreadRadius = 18;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spreadRadius;
      const distFromCenter = radius / spreadRadius;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -2 + Math.random() * 0.5;

      const height = 1.5 + Math.random() * 4.0 * (1 - distFromCenter * 0.5);
      const crystalRadius = 0.15 + Math.random() * 0.35;
      const colorRatio = distFromCenter * 0.7 + Math.random() * 0.3;
      const sides = Math.floor(Math.random() * 4) + 4;
      const isPillar = Math.random() > 0.4;

      const params: CrystalParams = {
        position: new THREE.Vector3(x, y, z),
        height,
        radius: crystalRadius,
        colorRatio,
        rotationY: Math.random() * Math.PI * 2,
        sides,
        isPillar,
      };

      const crystal = new Crystal(params);
      this.crystals.push(crystal);
      this.group.add(crystal.mesh);
    }
  }

  setGrowthSpeed(value: number) {
    this.growthSpeed = value;
  }

  setResonanceStrength(value: number) {
    this.resonanceStrength = value;
  }

  handleClick(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    const rect = renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const meshes = this.crystals.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const hitCrystal = hitMesh.userData.crystal as Crystal;
      if (hitCrystal) {
        this.triggerResonance(hitCrystal);
      }
    }
  }

  handleDoubleClick(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    const rect = renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const meshes = this.crystals.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    let center: THREE.Vector3;
    if (intersects.length > 0) {
      center = intersects[0].point.clone();
    } else {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 2);
      const target = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, target);
      if (target) {
        center = target;
      } else {
        return;
      }
    }

    this.triggerShockwave(center);
  }

  private triggerResonance(crystal: Crystal) {
    const origin = crystal.getWorldPosition();

    for (const other of this.crystals) {
      const dist = other.getWorldPosition().distanceTo(origin);
      if (dist <= RESONANCE_RADIUS) {
        const falloff = 1 - dist / RESONANCE_RADIUS;
        other.triggerResonance(falloff * this.resonanceStrength);
      }
    }

    this.particleSystem.emit(
      origin.clone().add(new THREE.Vector3(0, crystal.params.height * 0.5, 0)),
      crystal.getColor(),
      30,
      this.resonanceStrength,
    );
  }

  private triggerShockwave(center: THREE.Vector3) {
    this.particleSystem.emit(center, new THREE.Color(0xffffff), 60, 2.0);

    for (const crystal of this.crystals) {
      const pos = crystal.getWorldPosition();
      const dist = pos.distanceTo(center);

      if (dist <= SHOCKWAVE_RADIUS) {
        const falloff = 1 - dist / SHOCKWAVE_RADIUS;
        const direction = pos.clone().sub(center).normalize();
        crystal.applyShockwave(direction, falloff * SHOCKWAVE_STRENGTH);
        crystal.triggerResonance(falloff * this.resonanceStrength * 0.5);

        this.particleSystem.emit(
          pos.clone().add(new THREE.Vector3(0, crystal.params.height * 0.3, 0)),
          crystal.getColor(),
          Math.floor(10 * falloff),
          this.resonanceStrength * falloff,
        );
      }
    }
  }

  update(delta: number) {
    for (const crystal of this.crystals) {
      crystal.update(delta, this.growthSpeed, this.resonanceStrength);
    }
    this.particleSystem.update(delta);
  }

  dispose() {
    for (const crystal of this.crystals) {
      crystal.dispose();
    }
    this.particleSystem.dispose();
  }
}
