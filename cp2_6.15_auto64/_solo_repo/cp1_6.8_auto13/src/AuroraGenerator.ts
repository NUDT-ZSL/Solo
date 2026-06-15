import * as THREE from 'three';

const AURORA_STRIPS = 5;
const PARTICLES_PER_STRIP = 600;
const AURORA_WIDTH = 80;
const AURORA_HEIGHT_MIN = 15;
const AURORA_HEIGHT_MAX = 35;

export class AuroraGenerator {
  private scene: THREE.Scene;
  private strips: {
    points: THREE.Vector3[];
    geometry: THREE.BufferGeometry;
    material: THREE.ShaderMaterial;
    mesh: THREE.Points;
    basePositions: Float32Array;
    phase: number;
    hue: number;
  }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (let i = 0; i < AURORA_STRIPS; i++) {
      this.createStrip(i);
    }
  }

  private createStrip(index: number): void {
    const count = PARTICLES_PER_STRIP;
    const positions = new Float32Array(count * 3);
    const aRandom = new Float32Array(count * 3);
    const aPhase = new Float32Array(count);
    const basePositions = new Float32Array(count * 3);

    const stripOffset = (index - AURORA_STRIPS / 2) * 6;
    const heightBase = AURORA_HEIGHT_MIN + Math.random() * (AURORA_HEIGHT_MAX - AURORA_HEIGHT_MIN);

    const points: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const x = (t - 0.5) * AURORA_WIDTH + stripOffset;
      const y = heightBase + Math.sin(t * Math.PI * 2) * 3 + (Math.random() - 0.5) * 4;
      const z = -10 + index * 4 + (Math.random() - 0.5) * 8;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      aRandom[i * 3] = Math.random() * 2 - 1;
      aRandom[i * 3 + 1] = Math.random() * 2 - 1;
      aRandom[i * 3 + 2] = Math.random() * 2 - 1;

      aPhase[i] = Math.random() * Math.PI * 2;

      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));

    const hue = 0.45 + index * 0.04;
    const color1 = new THREE.Color().setHSL(hue, 0.8, 0.5);
    const color2 = new THREE.Color().setHSL(hue + 0.1, 0.9, 0.6);

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
        uColor1: { value: color1 },
        uColor2: { value: color2 },
        uPulse: { value: 0.0 },
        uSize: { value: 2.0 + index * 0.3 },
      },
      vertexShader: `
        attribute vec3 aRandom;
        attribute float aPhase;
        uniform float uTime;
        uniform float uSpeed;
        uniform float uSize;
        uniform float uPulse;
        varying float vAlpha;
        varying vec2 vUvCoord;
        void main() {
          vec3 pos = position;
          float t = uTime * uSpeed * 0.3;
          pos.x += sin(t + aPhase) * aRandom.x * 3.0;
          pos.y += sin(t * 0.7 + aPhase * 1.3) * aRandom.y * 2.0 + sin(t * 0.5 + pos.x * 0.05) * 2.0;
          pos.z += cos(t * 0.5 + aPhase) * aRandom.z * 1.5;
          float pulse = sin(uTime * uSpeed * 1.5 + aPhase * 2.0) * 0.5 + 0.5;
          pulse = mix(pulse, 1.0, uPulse);
          vAlpha = pulse * 0.6 * (0.5 + 0.5 * sin(aPhase + t));
          vUvCoord = vec2(pos.x, pos.y);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = uSize * (200.0 / -mvPosition.z) * (0.7 + pulse * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying float vAlpha;
        varying vec2 vUvCoord;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
          vec3 col = mix(uColor1, uColor2, sin(vUvCoord.x * 0.1 + vUvCoord.y * 0.05) * 0.5 + 0.5);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const mesh = new THREE.Points(geometry, material);
    this.scene.add(mesh);

    this.strips.push({
      points,
      geometry,
      material,
      mesh,
      basePositions,
      phase: index * 1.7,
      hue,
    });
  }

  update(elapsed: number, speed: number): void {
    for (const strip of this.strips) {
      strip.material.uniforms.uTime.value = elapsed;
      strip.material.uniforms.uSpeed.value = speed;
      strip.material.uniforms.uPulse.value = Math.sin(elapsed * 0.5 + strip.phase) * 0.3 + 0.3;
    }
  }

  getIntensity(elapsed: number): number {
    return (Math.sin(elapsed * 0.5) * 0.5 + 0.5) * 0.5 + 0.5;
  }

  dispose(): void {
    for (const strip of this.strips) {
      strip.geometry.dispose();
      strip.material.dispose();
      this.scene.remove(strip.mesh);
    }
    this.strips = [];
  }
}
