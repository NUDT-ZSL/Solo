import * as THREE from 'three';

export type ParticleDensity = 'sparse' | 'medium' | 'dense';

const DENSITY_COUNTS: Record<ParticleDensity, number> = {
  sparse: 250,
  medium: 500,
  dense: 1000
};

export class ParticleSystem {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particleCount: number;
  private phases: Float32Array;
  private baseSizes: Float32Array;

  constructor(density: ParticleDensity = 'medium') {
    this.particleCount = DENSITY_COUNTS[density];
    this.phases = new Float32Array(this.particleCount);
    this.baseSizes = new Float32Array(this.particleCount);

    this.geometry = this.createGeometry();
    this.material = this.createMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private createGeometry(): THREE.BufferGeometry {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    const palette = [
      new THREE.Color(0x63B3ED),
      new THREE.Color(0xB794F4),
      new THREE.Color(0x68D391),
      new THREE.Color(0xE2E8F0),
      new THREE.Color(0xFC8181)
    ];

    for (let i = 0; i < this.particleCount; i++) {
      const radius = 40 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.3) * 80;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      this.phases[i] = Math.random() * Math.PI * 2;
      this.baseSizes[i] = 0.3 + Math.random() * 0.7;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }

  private createMaterial(): THREE.PointsMaterial {
    return new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });
  }

  public setDensity(density: ParticleDensity): void {
    const newCount = DENSITY_COUNTS[density];
    if (newCount === this.particleCount) return;

    this.particleCount = newCount;
    this.phases = new Float32Array(this.particleCount);
    this.baseSizes = new Float32Array(this.particleCount);

    this.geometry.dispose();
    this.geometry = this.createGeometry();
    this.points.geometry = this.geometry;
  }

  public update(elapsedTime: number): void {
    this.material.opacity = 0.4 + Math.sin(elapsedTime * 0.5) * 0.15;

    const positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const phase = this.phases[i];
      const twinkle = Math.sin(elapsedTime * 1.5 + phase) * 0.5 + 0.5;
      const drift = Math.sin(elapsedTime * 0.3 + phase * 2) * 0.02;
      positions[i * 3 + 1] += drift * 0.1;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
