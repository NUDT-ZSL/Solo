import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export class WebManager {
  connectionDistance: number;
  private particleSystem: ParticleSystem;
  private geometry: THREE.BufferGeometry;
  private line: THREE.LineSegments;
  private maxLines: number;

  constructor(particleSystem: ParticleSystem, connectionDistance: number = 8) {
    this.particleSystem = particleSystem;
    this.connectionDistance = connectionDistance;
    this.maxLines = particleSystem.count * (particleSystem.count - 1) / 2;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxLines * 6);
    const colors = new Float32Array(this.maxLines * 6);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.line = new THREE.LineSegments(this.geometry, material);
  }

  getObject(): THREE.LineSegments {
    return this.line;
  }

  setConnectionDistance(dist: number) {
    this.connectionDistance = dist;
  }

  onParticleCountChanged(newCount: number) {
    this.maxLines = newCount * (newCount - 1) / 2;
    const positions = new Float32Array(this.maxLines * 6);
    const colors = new Float32Array(this.maxLines * 6);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setDrawRange(0, 0);
  }

  update() {
    const ps = this.particleSystem;
    const count = ps.count;
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    let lineIndex = 0;
    const maxDist = this.connectionDistance;
    const maxDistSq = maxDist * maxDist;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;
      const px = ps.positions[ix];
      const py = ps.positions[iy];
      const pz = ps.positions[iz];

      for (let j = i + 1; j < count; j++) {
        const jx = j * 3;
        const jy = jx + 1;
        const jz = jx + 2;

        const dx = px - ps.positions[jx];
        const dy = py - ps.positions[jy];
        const dz = pz - ps.positions[jz];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          const fade = 1.0 - dist / maxDist;
          const alpha = fade * 0.7;

          const li = lineIndex * 6;

          posArr[li] = px;
          posArr[li + 1] = py;
          posArr[li + 2] = pz;
          posArr[li + 3] = ps.positions[jx];
          posArr[li + 4] = ps.positions[jy];
          posArr[li + 5] = ps.positions[jz];

          const cr1 = ps.colors[ix] * alpha;
          const cg1 = ps.colors[iy] * alpha;
          const cb1 = ps.colors[iz] * alpha;
          const cr2 = ps.colors[jx] * alpha;
          const cg2 = ps.colors[jy] * alpha;
          const cb2 = ps.colors[jz] * alpha;

          colArr[li] = cr1;
          colArr[li + 1] = cg1;
          colArr[li + 2] = cb1;
          colArr[li + 3] = cr2;
          colArr[li + 4] = cg2;
          colArr[li + 5] = cb2;

          lineIndex++;
        }
      }
    }

    this.geometry.setDrawRange(0, lineIndex * 2);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }
}
