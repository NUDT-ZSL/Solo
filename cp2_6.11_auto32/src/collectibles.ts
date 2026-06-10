import * as THREE from 'three';

interface CollectibleItem {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  baseY: number;
  phase: number;
  collected: boolean;
  worldGX: number;
  worldGZ: number;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  startScale: number;
}

export class Collectibles {
  public group: THREE.Group;
  private items: CollectibleItem[] = [];
  private particles: Particle[] = [];
  private totalCount: number;
  public collectedCount = 0;
  private particleGeo: THREE.SphereGeometry;
  private particleColors: number[] = [0xFFD700, 0xFFA500, 0xFF4500, 0xFFFFFF];
  private maxParticles = 200;
  private floatAmp = 0.2;
  private floatPeriod = 2;

  constructor(totalCount: number = 20) {
    this.totalCount = totalCount;
    this.group = new THREE.Group();
    this.particleGeo = new THREE.SphereGeometry(0.05, 8, 8);
  }

  public spawn(positions: THREE.Vector3[]): void {
    this.clearAll();

    const ballGeo = new THREE.SphereGeometry(0.2, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.05
    });

    for (let i = 0; i < positions.length && i < this.totalCount; i++) {
      const pos = positions[i];
      const sphere = new THREE.Mesh(ballGeo, ballMat);
      sphere.position.copy(pos);

      const light = new THREE.PointLight(0xFFD700, 1.5, 4, 2);
      light.position.copy(pos);

      this.group.add(sphere);
      this.group.add(light);
      this.items.push({
        mesh: sphere,
        light,
        baseY: pos.y,
        phase: Math.random() * Math.PI * 2,
        collected: false,
        worldGX: 0,
        worldGZ: 0
      });
    }
  }

  public clearAll(): void {
    for (const item of this.items) {
      this.group.remove(item.mesh);
      this.group.remove(item.light);
    }
    this.items = [];
    this.collectedCount = 0;

    for (const p of this.particles) {
      this.group.remove(p.mesh);
      p.mesh.material instanceof THREE.Material && p.mesh.material.dispose();
    }
    this.particles = [];
  }

  public update(dt: number, playerPos: THREE.Vector3): boolean {
    let newlyCollected = false;

    for (const item of this.items) {
      if (item.collected) continue;

      item.phase += dt;
      const t = (item.phase % this.floatPeriod) / this.floatPeriod * Math.PI * 2;
      item.mesh.position.y = item.baseY + Math.sin(t) * this.floatAmp;
      item.light.position.copy(item.mesh.position);

      const dx = playerPos.x - item.mesh.position.x;
      const dz = playerPos.z - item.mesh.position.z;
      const dy = playerPos.y - item.mesh.position.y;
      const distSq = dx * dx + dz * dz + dy * dy;

      if (distSq < 0.55 * 0.55) {
        item.collected = true;
        this.collectedCount++;
        newlyCollected = true;
        this.emitParticles(item.mesh.position);
        this.group.remove(item.mesh);
        this.group.remove(item.light);
      }
    }

    this.updateParticles(dt);
    return newlyCollected;
  }

  private emitParticles(pos: THREE.Vector3): void {
    const count = 50;
    const overflow = this.particles.length + count - this.maxParticles;
    if (overflow > 0) {
      for (let i = 0; i < overflow && this.particles.length > 0; i++) {
        const p = this.particles.shift();
        if (p) {
          this.group.remove(p.mesh);
          p.mesh.material instanceof THREE.Material && p.mesh.material.dispose();
        }
      }
    }

    for (let i = 0; i < count; i++) {
      const colorIdx = Math.floor(Math.random() * this.particleColors.length);
      const mat = new THREE.MeshBasicMaterial({
        color: this.particleColors[colorIdx],
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(pos);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 3;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 1.5,
        maxLife: 1.5,
        startScale: 0.8 + Math.random() * 0.6
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        p.mesh.material instanceof THREE.Material && p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= dt * 4;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(1 - dt * 0.8);

      const alpha = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = alpha * alpha;
      const s = p.startScale * (0.3 + 0.7 * alpha);
      p.mesh.scale.setScalar(s);
    }
  }

  public getActiveParticleCount(): number {
    return this.particles.length;
  }

  public isAllCollected(): boolean {
    return this.collectedCount >= this.totalCount;
  }

  public getTotalCount(): number {
    return this.totalCount;
  }
}
