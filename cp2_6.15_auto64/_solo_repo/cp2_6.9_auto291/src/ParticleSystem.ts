import * as THREE from 'three';
import { Particle, BuildingMesh } from './types';

export class ParticleSystem {
  private scene: THREE.Scene;
  private pool: Particle[] = [];
  private activeEmitters: Map<number, { building: BuildingMesh; lastEmitTime: number }> = new Map();
  private readonly MAX_PARTICLES = 1000;
  private readonly MAX_EMITTERS = 50;
  private readonly PARTICLES_PER_EMIT = 20;
  private readonly PARTICLE_LIFETIME = 1.0;
  private readonly EMIT_INTERVAL = 0.05;
  private particleGeometry: THREE.SphereGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGeometry = new THREE.SphereGeometry(0.04, 6, 6);
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
      });
      const mesh = new THREE.Mesh(this.particleGeometry, material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push({
        mesh,
        active: false,
        life: 0,
        maxLife: this.PARTICLE_LIFETIME,
        velocity: new THREE.Vector3()
      });
    }
  }

  private getParticleFromPool(): Particle | null {
    for (const particle of this.pool) {
      if (!particle.active) {
        return particle;
      }
    }
    return null;
  }

  public startEmitter(building: BuildingMesh): void {
    if (this.activeEmitters.has(building.userData.heatData.id)) {
      return;
    }

    if (this.activeEmitters.size >= this.MAX_EMITTERS) {
      const firstKey = this.activeEmitters.keys().next().value;
      if (firstKey !== undefined) {
        this.stopEmitter(firstKey);
      }
    }

    this.activeEmitters.set(building.userData.heatData.id, {
      building,
      lastEmitTime: 0
    });
  }

  public stopEmitter(buildingId: number): void {
    this.activeEmitters.delete(buildingId);
  }

  private emitParticles(building: BuildingMesh): void {
    const color = (building.material as THREE.MeshStandardMaterial).color;
    const topY = building.position.y + building.scale.y / 2;
    const baseX = building.position.x;
    const baseZ = building.position.z;

    for (let i = 0; i < this.PARTICLES_PER_EMIT; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;

      particle.active = true;
      particle.life = this.PARTICLE_LIFETIME;
      particle.maxLife = this.PARTICLE_LIFETIME;

      const offsetX = (Math.random() - 0.5) * 0.3;
      const offsetZ = (Math.random() - 0.5) * 0.3;

      particle.mesh.position.set(
        baseX + offsetX,
        topY + Math.random() * 0.2,
        baseZ + offsetZ
      );

      particle.velocity.set(
        (Math.random() - 0.5) * 0.3,
        1.5 + Math.random() * 1.0,
        (Math.random() - 0.5) * 0.3
      );

      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(color);
      material.opacity = 1;
      particle.mesh.visible = true;
    }
  }

  public update(deltaTime: number, elapsedTime: number): void {
    for (const [, emitter] of this.activeEmitters) {
      if (elapsedTime - emitter.lastEmitTime >= this.EMIT_INTERVAL) {
        this.emitParticles(emitter.building);
        emitter.lastEmitTime = elapsedTime;
      }
    }

    for (const particle of this.pool) {
      if (!particle.active) continue;

      particle.life -= deltaTime;

      if (particle.life <= 0) {
        particle.active = false;
        particle.mesh.visible = false;
        (particle.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
        continue;
      }

      particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
      particle.velocity.y -= 0.5 * deltaTime;

      const lifeRatio = particle.life / particle.maxLife;
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = lifeRatio;
    }
  }

  public dispose(): void {
    for (const particle of this.pool) {
      this.scene.remove(particle.mesh);
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.particleGeometry.dispose();
    this.pool = [];
    this.activeEmitters.clear();
  }
}
