import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  active: boolean;
  baseY: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles: number = 300;
  private treePositions: THREE.Vector3[];
  private canopyHeights: number[];
  private currentCount: number = 0;
  private material: THREE.MeshBasicMaterial;

  constructor(
    scene: THREE.Scene,
    treePositions: THREE.Vector3[],
    canopyHeights: number[]
  ) {
    this.scene = scene;
    this.treePositions = treePositions;
    this.canopyHeights = canopyHeights;
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffb6c1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.initPool();
  }

  private initPool(): void {
    const geo = new THREE.PlaneGeometry(0.1, 0.1);
    for (let i = 0; i < this.maxParticles; i++) {
      const mat = this.material.clone();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        active: false,
        baseY: 0,
      });
    }
  }

  updateSeason(
    targetCount: number,
    color: THREE.Color,
    alpha: number = 0.9
  ): void {
    this.material.color.copy(color);
    this.material.opacity = alpha;
    this.material.needsUpdate = true;

    this.currentCount = Math.min(targetCount, this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (i < this.currentCount) {
        if (!p.active) {
          this.resetParticle(p);
          p.active = true;
          p.mesh.visible = true;
        }
        (p.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      } else {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  private resetParticle(p: Particle): void {
    const treeIndex = Math.floor(Math.random() * this.treePositions.length);
    const treePos = this.treePositions[treeIndex];
    const canopyH = this.canopyHeights[treeIndex];

    const spread = 2.5 + Math.random() * 1.5;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * spread;

    p.mesh.position.set(
      treePos.x + Math.cos(angle) * r,
      canopyH + Math.random() * 2,
      treePos.z + Math.sin(angle) * r
    );
    p.baseY = canopyH;

    p.velocity.set(
      (Math.random() - 0.5) * 0.01,
      -(0.01 + Math.random() * 0.02),
      (Math.random() - 0.5) * 0.01
    );

    p.mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    const scale = 0.6 + Math.random() * 0.8;
    p.mesh.scale.set(scale, scale, scale);
  }

  animate(delta: number): void {
    const timeScale = delta * 60;

    for (let i = 0; i < this.currentCount; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      const swayX = (Math.random() - 0.5) * 0.02;
      const swayZ = (Math.random() - 0.5) * 0.02;

      p.mesh.position.x += (p.velocity.x + swayX) * timeScale;
      p.mesh.position.y += p.velocity.y * timeScale;
      p.mesh.position.z += (p.velocity.z + swayZ) * timeScale;

      p.mesh.rotation.x += 0.02 * timeScale;
      p.mesh.rotation.y += 0.03 * timeScale;

      if (p.mesh.position.y < 0) {
        this.resetParticle(p);
      }
    }
  }

  getActiveCount(): number {
    return this.currentCount;
  }

  dispose(): void {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
    this.material.dispose();
  }
}
