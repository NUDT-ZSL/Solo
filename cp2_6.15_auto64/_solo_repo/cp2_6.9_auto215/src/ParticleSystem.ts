import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  startSize: number;
  color: THREE.Color;
  targetColor: THREE.Color;
  alive: boolean;
}

export class ParticleSystem {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  constructor(maxParticles: number = 500) {
    this.maxParticles = maxParticles;
    this.group = new THREE.Group();

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);

    for (let i = 0; i < this.maxParticles; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -1000;
      this.positions[i * 3 + 2] = 0;
      this.sizes[i] = 0;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  public burst(
    position: THREE.Vector3,
    color: THREE.Color,
    count: number = 150
  ): void {
    const actualCount = Math.min(count, this.maxParticles - this.particles.length);
    for (let i = 0; i < actualCount; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = 1 + Math.random() * 2;

      this.particles.push({
        position: position.clone(),
        velocity: dir.multiplyScalar(speed),
        life: 0,
        maxLife: 2 + Math.random(),
        size: 0.15,
        startSize: 0.12 + Math.random() * 0.1,
        color: color.clone(),
        targetColor: new THREE.Color(0xffffff),
        alive: true
      });
    }

    if (this.particles.length > 200) {
      this.material.size = 0.1;
    } else {
      this.material.size = 0.15;
    }
  }

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;
      const t = Math.min(p.life / p.maxLife, 1);

      p.position.addScaledVector(p.velocity, delta);
      p.velocity.multiplyScalar(0.97);
      p.velocity.y -= delta * 0.5;

      const currentColor = p.color.clone().lerp(p.targetColor, t);
      const currentSize = p.startSize * (1 - t) * 0.8;

      const idx = this.particles.indexOf(p);
      if (idx >= 0 && idx < this.maxParticles) {
        this.positions[idx * 3] = p.position.x;
        this.positions[idx * 3 + 1] = p.position.y;
        this.positions[idx * 3 + 2] = p.position.z;
        this.colors[idx * 3] = currentColor.r;
        this.colors[idx * 3 + 1] = currentColor.g;
        this.colors[idx * 3 + 2] = currentColor.b;
        this.sizes[idx] = currentSize;
      }

      if (t >= 1) {
        const rmIdx = this.particles.indexOf(p);
        if (rmIdx >= 0 && rmIdx < this.maxParticles) {
          this.positions[rmIdx * 3] = 0;
          this.positions[rmIdx * 3 + 1] = -1000;
          this.positions[rmIdx * 3 + 2] = 0;
          this.sizes[rmIdx] = 0;
        }
        this.particles.splice(i, 1);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public getActiveCount(): number {
    return this.particles.length;
  }
}
