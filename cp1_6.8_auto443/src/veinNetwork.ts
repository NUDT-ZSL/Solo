import * as THREE from 'three';
import { VEIN_CONNECT_DIST, type ColorTheme } from './utils';

export class VeinNetwork {
  private maxLines: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;
  private lines: THREE.LineSegments;
  private linePositions: Float32Array;
  private lineColors: Float32Array;
  private lineCount: number;

  constructor(maxLines: number = 15000) {
    this.maxLines = maxLines;
    this.lineCount = 0;
    this.linePositions = new Float32Array(maxLines * 2 * 3);
    this.lineColors = new Float32Array(maxLines * 2 * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.lines.frustumCulled = false;
  }

  getObject(): THREE.LineSegments {
    return this.lines;
  }

  update(particlePositions: Float32Array, particleCount: number, theme: ColorTheme) {
    this.lineCount = 0;
    const maxDist = VEIN_CONNECT_DIST;
    const maxDistSq = maxDist * maxDist;

    const step = particleCount > 2000 ? 2 : 1;

    for (let i = 0; i < particleCount && this.lineCount < this.maxLines; i += step) {
      const ix = particlePositions[i * 3];
      const iy = particlePositions[i * 3 + 1];
      const iz = particlePositions[i * 3 + 2];

      for (let j = i + step; j < particleCount && this.lineCount < this.maxLines; j += step) {
        const jx = particlePositions[j * 3];
        const jy = particlePositions[j * 3 + 1];
        const jz = particlePositions[j * 3 + 2];

        const dx = ix - jx;
        const dy = iy - jy;
        const dz = iz - jz;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < maxDistSq) {
          const idx = this.lineCount * 6;
          this.linePositions[idx] = ix;
          this.linePositions[idx + 1] = iy;
          this.linePositions[idx + 2] = iz;
          this.linePositions[idx + 3] = jx;
          this.linePositions[idx + 4] = jy;
          this.linePositions[idx + 5] = jz;

          const alpha = 1.0 - Math.sqrt(distSq) / maxDist;
          const lineColor = theme.line.clone().multiplyScalar(0.5 + alpha * 0.5);

          this.lineColors[idx] = lineColor.r;
          this.lineColors[idx + 1] = lineColor.g;
          this.lineColors[idx + 2] = lineColor.b;
          this.lineColors[idx + 3] = lineColor.r;
          this.lineColors[idx + 4] = lineColor.g;
          this.lineColors[idx + 5] = lineColor.b;

          this.lineCount++;
        }
      }
    }

    (
      this.geometry.getAttribute('position') as THREE.BufferAttribute
    ).needsUpdate = true;
    (
      this.geometry.getAttribute('color') as THREE.BufferAttribute
    ).needsUpdate = true;
    this.geometry.setDrawRange(0, this.lineCount * 2);
  }

  setOpacity(opacity: number) {
    this.material.opacity = opacity;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
