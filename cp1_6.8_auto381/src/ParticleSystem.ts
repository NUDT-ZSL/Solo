import * as THREE from 'three';

export class ParticleSystem {
  count: number;
  restoreSpeed: number;
  positions: Float32Array;
  restPositions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  haloIntensities: Float32Array;
  draggedIndex: number = -1;
  dragTarget: THREE.Vector3 = new THREE.Vector3();
  geometry: THREE.BufferGeometry;
  points: THREE.Points;
  haloPoints: THREE.Points;
  haloGeometry: THREE.BufferGeometry;

  private spread: number = 30;

  constructor(count: number = 150, restoreSpeed: number = 0.02) {
    this.count = count;
    this.restoreSpeed = restoreSpeed;
    this.positions = new Float32Array(count * 3);
    this.restPositions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.haloIntensities = new Float32Array(count);

    this.generateParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, material);

    this.haloGeometry = new THREE.BufferGeometry();
    const haloPositions = new Float32Array(count * 3);
    const haloColors = new Float32Array(count * 4);
    this.haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
    this.haloGeometry.setAttribute('color', new THREE.BufferAttribute(haloColors, 4));

    const haloMaterial = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.haloPoints = new THREE.Points(this.haloGeometry, haloMaterial);
  }

  generateParticles() {
    const count = this.count;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * this.spread;
      const y = (Math.random() - 0.5) * this.spread;
      const z = (Math.random() - 0.5) * this.spread * 0.3;
      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;
      this.restPositions[i3] = x;
      this.restPositions[i3 + 1] = y;
      this.restPositions[i3 + 2] = z;
      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      const dist = Math.sqrt(x * x + y * y + z * z);
      const maxDist = this.spread * 0.866;
      const t = Math.min(dist / maxDist, 1.0);
      const warm = new THREE.Color(0xffcc44);
      const cool = new THREE.Color(0x4488ff);
      const c = warm.clone().lerp(cool, t);
      this.colors[i3] = c.r;
      this.colors[i3 + 1] = c.g;
      this.colors[i3 + 2] = c.b;

      this.haloIntensities[i] = 0;
    }
  }

  regenerate(count: number) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.restPositions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.haloIntensities = new Float32Array(count);
    this.draggedIndex = -1;

    this.generateParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;

    const haloPos = new Float32Array(count * 3);
    const haloCol = new Float32Array(count * 4);
    this.haloGeometry.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    this.haloGeometry.setAttribute('color', new THREE.BufferAttribute(haloCol, 4));
  }

  resetLayout() {
    const count = this.count;
    const spread = this.spread;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread * 0.3;
      this.restPositions[i3] = x;
      this.restPositions[i3 + 1] = y;
      this.restPositions[i3 + 2] = z;
      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;
    }
  }

  update(dt: number) {
    const count = this.count;
    const dampening = 0.92;
    const springK = this.restoreSpeed * 60;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      if (i === this.draggedIndex) {
        this.positions[i3] = this.dragTarget.x;
        this.positions[i3 + 1] = this.dragTarget.y;
        this.positions[i3 + 2] = this.dragTarget.z;
        this.velocities[i3] = 0;
        this.velocities[i3 + 1] = 0;
        this.velocities[i3 + 2] = 0;
        this.haloIntensities[i] = Math.min(this.haloIntensities[i] + 0.1, 1.0);
        continue;
      }

      const dx = this.restPositions[i3] - this.positions[i3];
      const dy = this.restPositions[i3 + 1] - this.positions[i3 + 1];
      const dz = this.restPositions[i3 + 2] - this.positions[i3 + 2];

      this.velocities[i3] += dx * springK * dt;
      this.velocities[i3 + 1] += dy * springK * dt;
      this.velocities[i3 + 2] += dz * springK * dt;

      this.velocities[i3] *= dampening;
      this.velocities[i3 + 1] *= dampening;
      this.velocities[i3 + 2] *= dampening;

      this.positions[i3] += this.velocities[i3];
      this.positions[i3 + 1] += this.velocities[i3 + 1];
      this.positions[i3 + 2] += this.velocities[i3 + 2];

      const displacement = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (displacement > 0.5) {
        this.haloIntensities[i] = Math.min(this.haloIntensities[i] + 0.05, 0.7);
      } else {
        this.haloIntensities[i] *= 0.95;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.updateHalo();
  }

  private updateHalo() {
    const haloPos = this.haloGeometry.attributes.position as THREE.BufferAttribute;
    const haloCol = this.haloGeometry.attributes.color as THREE.BufferAttribute;
    const posArr = haloPos.array as Float32Array;
    const colArr = haloCol.array as Float32Array;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      posArr[i3] = this.positions[i3];
      posArr[i3 + 1] = this.positions[i3 + 1];
      posArr[i3 + 2] = this.positions[i3 + 2];

      const intensity = this.haloIntensities[i];
      const baseR = this.colors[i3];
      const baseG = this.colors[i3 + 1];
      const baseB = this.colors[i3 + 2];
      colArr[i4] = baseR;
      colArr[i4 + 1] = baseG;
      colArr[i4 + 2] = baseB;
      colArr[i4 + 3] = intensity;
    }

    haloPos.needsUpdate = true;
    haloCol.needsUpdate = true;
  }

  getPosition(index: number): THREE.Vector3 {
    const i3 = index * 3;
    return new THREE.Vector3(
      this.positions[i3],
      this.positions[i3 + 1],
      this.positions[i3 + 2]
    );
  }

  applyForce(index: number, force: THREE.Vector3) {
    const i3 = index * 3;
    this.velocities[i3] += force.x;
    this.velocities[i3 + 1] += force.y;
    this.velocities[i3 + 2] += force.z;
  }

  applyRadialForce(centerIndex: number, strength: number) {
    if (centerIndex < 0 || centerIndex >= this.count) return;
    const ci3 = centerIndex * 3;
    const cx = this.positions[ci3];
    const cy = this.positions[ci3 + 1];
    const cz = this.positions[ci3 + 2];

    for (let i = 0; i < this.count; i++) {
      if (i === centerIndex || i === this.draggedIndex) continue;
      const i3 = i * 3;
      const dx = this.positions[i3] - cx;
      const dy = this.positions[i3 + 1] - cy;
      const dz = this.positions[i3 + 2] - cz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 0.1) continue;
      const falloff = Math.exp(-dist * 0.15);
      const fx = (dx / dist) * strength * falloff;
      const fy = (dy / dist) * strength * falloff;
      const fz = (dz / dist) * strength * falloff;
      this.velocities[i3] += fx;
      this.velocities[i3 + 1] += fy;
      this.velocities[i3 + 2] += fz;
    }
  }
}
