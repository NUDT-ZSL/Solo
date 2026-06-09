import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export class ParticleSystem {
  scene: THREE.Scene;
  particles: Particle[];
  pool: Particle[];
  baseParticleCount: number;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particles = [];
    this.pool = [];
    this.baseParticleCount = 25;
  }

  setParticleCount(count: number, crystalCount: number): void {
    const adjustedCount = crystalCount > 80 ? Math.max(15, count - 10) : count;
    this.baseParticleCount = adjustedCount;
  }

  createParticle(): Particle {
    const geometry = new THREE.SphereGeometry(0.03, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    this.scene.add(mesh);

    return {
      mesh,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      active: false
    };
  }

  getParticle(): Particle {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createParticle();
  }

  emit(position: THREE.Vector3, color: THREE.Color, customCount?: number): void {
    const count = customCount ?? this.baseParticleCount;

    for (let i = 0; i < count; i++) {
      const particle = this.getParticle();
      particle.mesh.position.copy(position);
      particle.mesh.position.y += 1 + Math.random();

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const speed = 1 + Math.random() * 3;

      particle.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 1,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      particle.life = 0;
      particle.maxLife = 0.8 + Math.random() * 0.7;
      particle.active = true;
      (particle.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
      particle.mesh.visible = true;
      particle.mesh.scale.setScalar(0.5 + Math.random() * 0.5);

      this.particles.push(particle);
    }
  }

  update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle.active) continue;

      particle.life += delta;
      const lifeRatio = particle.life / particle.maxLife;

      if (lifeRatio >= 1) {
        particle.active = false;
        particle.mesh.visible = false;
        this.pool.push(particle);
        this.particles.splice(i, 1);
        continue;
      }

      particle.velocity.y -= 2 * delta;
      particle.velocity.multiplyScalar(1 - 0.5 * delta);
      particle.mesh.position.addScaledVector(particle.velocity, delta);

      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - lifeRatio;
      const scale = 1 - lifeRatio * 0.5;
      particle.mesh.scale.setScalar(scale);
    }
  }

  reset(): void {
    this.particles.forEach(particle => {
      particle.active = false;
      particle.mesh.visible = false;
      this.pool.push(particle);
    });
    this.particles = [];
  }
}
