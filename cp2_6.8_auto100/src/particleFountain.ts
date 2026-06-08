import * as THREE from 'three';
import type { FrequencyData } from './audioController';

const PARTICLE_COUNT = 1000;
const RING_COUNT = 3;
const RING_VERTICES = 60;

const LOW_COLOR_START = new THREE.Color('#0B3D91');
const LOW_COLOR_END = new THREE.Color('#8B5CF6');
const MID_COLOR_START = new THREE.Color('#00D4FF');
const MID_COLOR_END = new THREE.Color('#FF007F');
const HIGH_COLOR_START = new THREE.Color('#FFD700');
const HIGH_COLOR_END = new THREE.Color('#FF4500');

const RING_COLORS = [
  new THREE.Color('#0B3D91'),
  new THREE.Color('#8B5CF6'),
  new THREE.Color('#FF007F')
];

type FrequencyBand = 'low' | 'mid' | 'high';

interface ParticleState {
  velocity: THREE.Vector3;
  band: FrequencyBand;
  life: number;
  maxLife: number;
}

export class ParticleFountain {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.ShaderMaterial;
  private particleStates: ParticleState[];

  private rings: THREE.Mesh[];
  private ringTargetScales: number[];
  private ringCurrentScales: number[];

  private time = 0;
  private rotationAngle = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleStates = [];
    this.rings = [];
    this.ringTargetScales = [1, 1, 1];
    this.ringCurrentScales = [1, 1, 1];

    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -3;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const band = this.assignBand(i);
      const color = this.getBandColor(band, Math.random());
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.05;

      this.particleStates.push({
        velocity: new THREE.Vector3(0, 0, 0),
        band,
        life: Math.random() * 2,
        maxLife: 3 + Math.random() * 3
      });
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * 300.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);

    this.createRings();
  }

  private assignBand(index: number): FrequencyBand {
    const r = index % 3;
    if (r === 0) return 'low';
    if (r === 1) return 'mid';
    return 'high';
  }

  private getBandColor(band: FrequencyBand, t: number): THREE.Color {
    const color = new THREE.Color();
    switch (band) {
      case 'low':
        color.copy(LOW_COLOR_START).lerp(LOW_COLOR_END, t);
        break;
      case 'mid':
        color.copy(MID_COLOR_START).lerp(MID_COLOR_END, t);
        break;
      case 'high':
        color.copy(HIGH_COLOR_START).lerp(HIGH_COLOR_END, t);
        break;
    }
    return color;
  }

  private getBandEnergy(band: FrequencyBand, freq: FrequencyData): number {
    switch (band) {
      case 'low': return freq.low;
      case 'mid': return freq.mid;
      case 'high': return freq.high;
    }
  }

  private createRings(): void {
    const ringHeights = [2, 3, 4];

    for (let i = 0; i < RING_COUNT; i++) {
      const geometry = new THREE.RingGeometry(2.8, 3.0, RING_VERTICES);
      const color = RING_COLORS[i];
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const ring = new THREE.Mesh(geometry, material);
      ring.position.y = ringHeights[i];
      ring.rotation.x = -Math.PI / 2;
      this.scene.add(ring);
      this.rings.push(ring);
    }
  }

  private resetParticle(i: number): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 1.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    positions[i * 3] = x;
    positions[i * 3 + 1] = -3;
    positions[i * 3 + 2] = z;

    this.particleStates[i].life = 0;
    this.particleStates[i].maxLife = 3 + Math.random() * 3;
    this.particleStates[i].velocity.set(0, 0, 0);
  }

  update(freq: FrequencyData, delta: number): void {
    this.time += delta;

    const hasAudio = freq.volume > 0.001;

    if (hasAudio) {
      const rotationSpeed = freq.mid * 0.5;
      this.rotationAngle += rotationSpeed * delta;
      this.particles.rotation.y = this.rotationAngle;

      for (let i = 0; i < RING_COUNT; i++) {
        let targetBand: FrequencyBand;
        if (i === 0) targetBand = 'low';
        else if (i === 1) targetBand = 'mid';
        else targetBand = 'high';

        const bandEnergy = this.getBandEnergy(targetBand, freq);
        this.ringTargetScales[i] = 0.8 + bandEnergy * 0.7;

        this.ringCurrentScales[i] += (this.ringTargetScales[i] - this.ringCurrentScales[i]) * Math.min(1, delta * 10);
        const scale = this.ringCurrentScales[i];
        this.rings[i].scale.set(scale, scale, 1);
        this.rings[i].rotation.z += delta * 0.3;

        const mat = this.rings[i].material as THREE.MeshBasicMaterial;
        mat.opacity = 0.2 + bandEnergy * 0.4;
      }
    } else {
      for (let i = 0; i < RING_COUNT; i++) {
        this.ringTargetScales[i] = 0.8;
        this.ringCurrentScales[i] += (0.8 - this.ringCurrentScales[i]) * Math.min(1, delta * 2);
        const scale = this.ringCurrentScales[i];
        this.rings[i].scale.set(scale, scale, 1);
        const mat = this.rings[i].material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3;
      }
    }

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const sizes = (this.particleGeometry.attributes as Record<string, THREE.BufferAttribute>).aSize.array as Float32Array;

    const maxHeight = 5;
    const baseSpeed = hasAudio ? 1 + freq.low * 4 : 0.2;
    const horizontalRadius = hasAudio ? 0.5 + freq.high * 2.5 : 0.5;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const state = this.particleStates[i];
      const bandEnergy = this.getBandEnergy(state.band, freq);

      if (hasAudio) {
        state.life += delta;

        if (state.life >= state.maxLife || positions[i * 3 + 1] > maxHeight) {
          this.resetParticle(i);
          continue;
        }

        state.velocity.y = baseSpeed * (0.5 + Math.random() * 0.5);
        state.velocity.x += (Math.random() - 0.5) * delta * horizontalRadius;
        state.velocity.z += (Math.random() - 0.5) * delta * horizontalRadius;

        state.velocity.x *= 0.98;
        state.velocity.z *= 0.98;

        positions[i * 3] += state.velocity.x * delta;
        positions[i * 3 + 1] += state.velocity.y * delta;
        positions[i * 3 + 2] += state.velocity.z * delta;

        const colorT = state.life / state.maxLife;
        const color = this.getBandColor(state.band, colorT * 0.8 + bandEnergy * 0.2);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        const dynamicSize = 0.05 + bandEnergy * 0.15;
        sizes[i] = dynamicSize;
      } else {
        positions[i * 3 + 1] = -3 + Math.sin(this.time * 0.5 + i * 0.1) * 0.05;

        const color = this.getBandColor(state.band, 0.3);
        colors[i * 3] = color.r * 0.5;
        colors[i * 3 + 1] = color.g * 0.5;
        colors[i * 3 + 2] = color.b * 0.5;

        sizes[i] = 0.05;
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    (this.particleGeometry.attributes as Record<string, THREE.BufferAttribute>).aSize.needsUpdate = true;
  }

  dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.scene.remove(this.particles);

    for (const ring of this.rings) {
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      this.scene.remove(ring);
    }
    this.rings = [];
  }
}
