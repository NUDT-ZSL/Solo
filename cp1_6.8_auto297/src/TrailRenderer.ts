import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { PARTICLE_COUNT, TRAIL_LENGTH, TRAIL_OPACITY, COLOR_WARM, COLOR_COLD } from './constants';

const SAMPLE_COUNT = 600;
const TRAIL_VERTICES_PER_SAMPLE = TRAIL_LENGTH;
const TOTAL_VERTICES = SAMPLE_COUNT * TRAIL_VERTICES_PER_SAMPLE;

export class TrailRenderer {
  private particleSystem: ParticleSystem;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  public mesh: THREE.LineSegments;

  private trailHistory: Float32Array;
  private trailEnergies: Float32Array;
  private sampleIndices: number[];
  private historyPointer: number;
  private frameCount: number;

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
    this.historyPointer = 0;
    this.frameCount = 0;

    this.trailHistory = new Float32Array(SAMPLE_COUNT * TRAIL_LENGTH * 3);
    this.trailEnergies = new Float32Array(SAMPLE_COUNT * TRAIL_LENGTH);
    this.sampleIndices = [];

    const step = Math.floor(PARTICLE_COUNT / SAMPLE_COUNT);
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      this.sampleIndices.push(i * step);
    }

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const pos = this.particleSystem.getPositionAt(this.sampleIndices[i]);
      for (let j = 0; j < TRAIL_LENGTH; j++) {
        const idx = (i * TRAIL_LENGTH + j) * 3;
        this.trailHistory[idx] = pos.x;
        this.trailHistory[idx + 1] = pos.y;
        this.trailHistory[idx + 2] = pos.z;
        this.trailEnergies[i * TRAIL_LENGTH + j] = this.particleSystem.getEnergyAt(this.sampleIndices[i]);
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.setupBuffers();

    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aTrailEnergy;
        attribute float aTrailAlpha;
        varying float vEnergy;
        varying float vAlpha;
        void main() {
          vEnergy = aTrailEnergy;
          vAlpha = aTrailAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying float vEnergy;
        varying float vAlpha;
        void main() {
          vec3 warm = vec3(${COLOR_WARM.r}, ${COLOR_WARM.g}, ${COLOR_WARM.b});
          vec3 cold = vec3(${COLOR_COLD.r}, ${COLOR_COLD.g}, ${COLOR_COLD.b});
          vec3 col = mix(cold, warm, vEnergy);
          gl_FragColor = vec4(col, vAlpha * ${TRAIL_OPACITY.toFixed(2)});
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.LineSegments(this.geometry, this.material);
  }

  private setupBuffers(): void {
    const positions = new Float32Array(TOTAL_VERTICES * 2 * 3);
    const energies = new Float32Array(TOTAL_VERTICES * 2);
    const alphas = new Float32Array(TOTAL_VERTICES * 2);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aTrailEnergy', new THREE.BufferAttribute(energies, 1));
    this.geometry.setAttribute('aTrailAlpha', new THREE.BufferAttribute(alphas, 1));
  }

  update(): void {
    this.frameCount++;

    if (this.frameCount % 2 !== 0) return;

    this.historyPointer = (this.historyPointer + 1) % TRAIL_LENGTH;

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const pos = this.particleSystem.getPositionAt(this.sampleIndices[i]);
      const energy = this.particleSystem.getEnergyAt(this.sampleIndices[i]);
      const idx = (i * TRAIL_LENGTH + this.historyPointer) * 3;
      this.trailHistory[idx] = pos.x;
      this.trailHistory[idx + 1] = pos.y;
      this.trailHistory[idx + 2] = pos.z;
      this.trailEnergies[i * TRAIL_LENGTH + this.historyPointer] = energy;
    }

    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const energyAttr = this.geometry.attributes.aTrailEnergy as THREE.BufferAttribute;
    const alphaAttr = this.geometry.attributes.aTrailAlpha as THREE.BufferAttribute;

    let vertIdx = 0;

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      for (let j = 0; j < TRAIL_LENGTH - 1; j++) {
        const currSlot = (this.historyPointer - j + TRAIL_LENGTH) % TRAIL_LENGTH;
        const nextSlot = (this.historyPointer - j - 1 + TRAIL_LENGTH) % TRAIL_LENGTH;

        const currIdx = (i * TRAIL_LENGTH + currSlot) * 3;
        const nextIdx = (i * TRAIL_LENGTH + nextSlot) * 3;

        const cx = this.trailHistory[currIdx];
        const cy = this.trailHistory[currIdx + 1];
        const cz = this.trailHistory[currIdx + 2];
        const nx = this.trailHistory[nextIdx];
        const ny = this.trailHistory[nextIdx + 1];
        const nz = this.trailHistory[nextIdx + 2];

        const distSq = (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) + (cz - nz) * (cz - nz);
        if (distSq > 4.0) {
          posAttr.setXYZ(vertIdx, cx, cy, cz);
          energyAttr.setX(vertIdx, this.trailEnergies[i * TRAIL_LENGTH + currSlot]);
          alphaAttr.setX(vertIdx, 0);
          vertIdx++;
          posAttr.setXYZ(vertIdx, cx, cy, cz);
          energyAttr.setX(vertIdx, this.trailEnergies[i * TRAIL_LENGTH + nextSlot]);
          alphaAttr.setX(vertIdx, 0);
          vertIdx++;
          continue;
        }

        const alpha = 1.0 - j / TRAIL_LENGTH;

        posAttr.setXYZ(vertIdx, cx, cy, cz);
        energyAttr.setX(vertIdx, this.trailEnergies[i * TRAIL_LENGTH + currSlot]);
        alphaAttr.setX(vertIdx, alpha);
        vertIdx++;

        posAttr.setXYZ(vertIdx, nx, ny, nz);
        energyAttr.setX(vertIdx, this.trailEnergies[i * TRAIL_LENGTH + nextSlot]);
        alphaAttr.setX(vertIdx, alpha * 0.7);
        vertIdx++;
      }
    }

    posAttr.needsUpdate = true;
    energyAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    this.geometry.setDrawRange(0, vertIdx);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
