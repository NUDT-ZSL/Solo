import * as THREE from 'three';

export class StarField {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private particles: THREE.Points;
  private twinkleData: Float32Array;
  private baseSizes: Float32Array;
  private count = 5000;
  private isMythMode = false;
  private colorTransition = 0;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    this.twinkleData = new Float32Array(this.count * 2);
    this.baseSizes = new Float32Array(this.count);

    const white = new THREE.Color(0xffffff);
    const blueWhite = new THREE.Color(0xb8c6db);

    for (let i = 0; i < this.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 30;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = Math.random();
      const col = white.clone().lerp(blueWhite, brightness);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      const size = 0.2 + brightness * 1.8;
      sizes[i] = size;
      this.baseSizes[i] = size;

      this.twinkleData[i * 2] = 0.5 + Math.random() * 1.5;
      this.twinkleData[i * 2 + 1] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  update(time: number) {
    const sizeAttr = this.particles.geometry.getAttribute('size') as THREE.BufferAttribute;
    const colorAttr = this.particles.geometry.getAttribute('color') as THREE.BufferAttribute;

    for (let i = 0; i < this.count; i++) {
      const period = this.twinkleData[i * 2];
      const phase = this.twinkleData[i * 2 + 1];
      const twinkle = 0.6 + 0.4 * Math.sin((time / period) * Math.PI * 2 + phase);
      sizeAttr.array[i] = this.baseSizes[i] * twinkle;

      if (this.colorTransition > 0) {
        const baseR = 0.72 + (1 - (this.baseSizes[i] / 2)) * 0.28;
        const gold = new THREE.Color(0xffd700);
        const original = new THREE.Color(
          baseR > 0.9 ? 0xad / 255 : baseR,
          baseR > 0.9 ? 0xd8 / 255 : baseR * 0.85,
          baseR > 0.9 ? 0xe6 / 255 : baseR * 0.78
        );
        const mixed = original.clone().lerp(gold, this.colorTransition);
        colorAttr.array[i * 3] = mixed.r;
        colorAttr.array[i * 3 + 1] = mixed.g;
        colorAttr.array[i * 3 + 2] = mixed.b;
      }
    }

    sizeAttr.needsUpdate = true;
    if (this.colorTransition > 0 || this.isMythMode) {
      colorAttr.needsUpdate = true;
    }
  }

  setMythMode(enabled: boolean, transition: number) {
    this.isMythMode = enabled;
    this.colorTransition = transition;
  }

  dispose() {
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.scene.remove(this.particles);
  }
}
