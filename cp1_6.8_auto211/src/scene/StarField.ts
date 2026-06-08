import * as THREE from 'three';

const STAR_COUNT = 800;
const BOUNDARY = 80;
const DRIFT_SPEED = 0.003;

export class StarField {
  private points: THREE.Points;
  private velocities: Float32Array;
  private geometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    this.velocities = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * BOUNDARY * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * BOUNDARY * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * BOUNDARY * 2;

      this.velocities[i3] = (Math.random() - 0.5) * DRIFT_SPEED * 2;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * DRIFT_SPEED * 2;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * DRIFT_SPEED * 2;

      const brightness = 0.4 + Math.random() * 0.6;
      const blueTint = Math.random() * 0.3;
      colors[i3] = brightness * (1 - blueTint);
      colors[i3 + 1] = brightness * (1 - blueTint * 0.5);
      colors[i3 + 2] = brightness;

      sizes[i] = 0.3 + Math.random() * 0.8;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, material);
    scene.add(this.points);
  }

  update(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] += this.velocities[i3];
      positions[i3 + 1] += this.velocities[i3 + 1];
      positions[i3 + 2] += this.velocities[i3 + 2];

      for (let axis = 0; axis < 3; axis++) {
        if (positions[i3 + axis] > BOUNDARY) positions[i3 + axis] = -BOUNDARY;
        if (positions[i3 + axis] < -BOUNDARY) positions[i3 + axis] = BOUNDARY;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
