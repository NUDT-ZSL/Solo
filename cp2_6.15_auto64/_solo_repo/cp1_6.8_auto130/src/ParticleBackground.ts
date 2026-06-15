import * as THREE from 'three';

export class ParticleBackground {
  private scene: THREE.Scene;
  private mesh!: THREE.Points;
  private material!: THREE.ShaderMaterial;
  private count: number = 5000;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.velocities = new Float32Array(this.count * 3);
    this.lifetimes = new Float32Array(this.count);
    this.build();
  }

  private build() {
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const phases = new Float32Array(this.count);

    const spread = 20;

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.5 - 3;

      this.velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.015;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;

      this.lifetimes[i] = Math.random();

      const t = Math.random();
      const color = new THREE.Color();
      if (t < 0.5) {
        color.setHSL(0.72 + t * 0.1, 0.7, 0.5 + Math.random() * 0.2);
      } else {
        color.setHSL(0.1, 0.9, 0.5 + Math.random() * 0.2);
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.3 + Math.random() * 0.7;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float aPhase;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        void main() {
          vColor = color;
          float pulse = 0.5 + 0.5 * sin(uTime * 1.5 + aPhase);
          vAlpha = 0.3 + 0.7 * pulse;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (1.0 + 0.3 * pulse) * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - d * 2.0;
          glow = pow(glow, 2.0);
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.mesh = new THREE.Points(geometry, this.material);
    this.scene.add(this.mesh);
  }

  update(dt: number) {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;

    const positions = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const spread = 20;
    const half = spread / 2;

    for (let i = 0; i < this.count; i++) {
      let x = positions.getX(i) + this.velocities[i * 3];
      let y = positions.getY(i) + this.velocities[i * 3 + 1];
      let z = positions.getZ(i) + this.velocities[i * 3 + 2];

      if (x > half) x = -half;
      if (x < -half) x = half;
      if (y > half) y = -half;
      if (y < -half) y = half;
      if (z > 2) z = -spread * 0.5 - 3;
      if (z < -spread * 0.5 - 3) z = 2;

      positions.setXYZ(i, x, y, z);
    }

    positions.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.mesh);
  }
}
