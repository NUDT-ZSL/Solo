import * as THREE from 'three';

interface CollectibleItem {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  baseY: number;
  phase: number;
  collected: boolean;
}

interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class Collectibles {
  public group: THREE.Group;
  private items: CollectibleItem[] = [];
  private particles: ParticleData[] = [];
  private totalCount: number;
  public collectedCount = 0;
  private particleGeo: THREE.SphereGeometry;
  private particleMats: THREE.MeshBasicMaterial[];

  constructor(totalCount: number = 20) {
    this.totalCount = totalCount;
    this.group = new THREE.Group();
    this.particleGeo = new THREE.SphereGeometry(0.05, 6, 6);
    this.particleMats = [
      new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true }),
      new THREE.MeshBasicMaterial({ color: 0xFFA500, transparent: true }),
      new THREE.MeshBasicMaterial({ color: 0xFF4500, transparent: true }),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true })
    ];
  }

  public spawn(positions: THREE.Vector3[]): void {
    this.clear();
    for (let i = 0; i < positions.length && i < this.totalCount; i++) {
      const pos = positions[i];
      const geo = new THREE.SphereGeometry(0.2, 24, 24);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xFFD700,
        emissiveIntensity: 1.5,
        metalness: 0.8,
        roughness: 0.1
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.copy(pos);

      const light = new THREE.PointLight(0xFFD700, 1.2, 3, 2);
      light.position.copy(pos);

      this.group.add(sphere);
      this.group.add(light);
      this.items.push({
        mesh: sphere,
        light,
        baseY: pos.y,
        phase: Math.random() * Math.PI * 2,
        collected: false
      });
    }
  }

  public clear(): void {
    for (const item of this.items) {
      this.group.remove(item.mesh);
      this.group.remove(item.light);
      item.mesh.geometry.dispose();
      (item.mesh.material as THREE.Material).dispose();
    }
    this.items = [];
    for (const p of this.particles) {
      this.group.remove(p.mesh);
    }
    this.particles = [];
    this.collectedCount = 0;
  }

  public update(dt: number, elapsed: number, playerPos: THREE.Vector3): boolean {
    let newlyCollected = false;
    const floatAmp = 0.2;
    const floatPeriod = 2;

    for (const item of this.items) {
      if (item.collected) continue;

      item.phase += dt;
      const t = (item.phase % floatPeriod) / floatPeriod * Math.PI * 2;
      item.mesh.position.y = item.baseY + Math.sin(t) * floatAmp;
      item.light.position.copy(item.mesh.position);

      const dx = playerPos.x - item.mesh.position.x;
      const dz = playerPos.z - item.mesh.position.z;
      const dy = playerPos.y - item.mesh.position.y;
      const distSq = dx * dx + dz * dz + dy * dy;

      if (distSq < 0.45 * 0.45) {
        item.collected = true;
        this.collectedCount++;
        newlyCollected = true;
        this.spawnParticles(item.mesh.position);
        this.group.remove(item.mesh);
        this.group.remove(item.light);
        item.mesh.geometry.dispose();
        (item.mesh.material as THREE.Material).dispose();
      }
    }

    this.updateParticles(dt);
    return newlyCollected;
  }

  private spawnParticles(pos: THREE.Vector3): void {
    const count = 50;
    const maxParticles = 200;
    const overflow = this.particles.length + count - maxParticles;
    if (overflow > 0) {
      for (let i = 0; i < overflow && this.particles.length > 0; i++) {
        const p = this.particles.shift();
        if (p) this.group.remove(p.mesh);
      }
    }

    for (let i = 0; i < count; i++) {
      const mat = this.particleMats[Math.floor(Math.random() * this.particleMats.length)].clone();
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(pos);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.5 + Math.random() * 2.5;
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
        maxLife: 1.5
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= dt * 3;
      p.mesh.position.addScaledVector(p.velocity, dt);

      const alpha = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
      const scale = Math.max(0.3, alpha);
      p.mesh.scale.setScalar(scale);
    }
  }

  public isAllCollected(): boolean {
    return this.collectedCount >= this.totalCount;
  }

  public getTotalCount(): number {
    return this.totalCount;
  }
}
