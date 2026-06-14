import * as THREE from 'three';
import { StarField } from './StarField';

export class NetworkGenerator {
  private scene: THREE.Scene;
  private starField: StarField;
  private networkLines: THREE.LineSegments | null = null;
  private localLines: THREE.LineSegments | null = null;
  private networkActive: boolean = false;
  private distanceThreshold: number = 4;
  private localGroup: THREE.Group;

  constructor(scene: THREE.Scene, starField: StarField) {
    this.scene = scene;
    this.starField = starField;
    this.localGroup = new THREE.Group();
    this.scene.add(this.localGroup);
  }

  setDistanceThreshold(threshold: number): void {
    this.distanceThreshold = threshold;
  }

  getDistanceThreshold(): number {
    return this.distanceThreshold;
  }

  generateNetwork(): void {
    this.clearNetwork();

    const positions = this.starField.getPositions();
    const colors = this.starField.getParticleSystem()?.geometry.getAttribute('color') as THREE.BufferAttribute;
    const count = this.starField.getParticleCount();

    if (!positions || !colors) return;

    const linePositions: number[] = [];
    const lineColors: number[] = [];
    const thresholdSq = this.distanceThreshold * this.distanceThreshold;

    const tempColor1 = new THREE.Color();
    const tempColor2 = new THREE.Color();
    const avgColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const xi = positions[i3];
      const yi = positions[i3 + 1];
      const zi = positions[i3 + 2];

      for (let j = i + 1; j < count; j++) {
        const j3 = j * 3;
        const dx = positions[j3] - xi;
        const dy = positions[j3 + 1] - yi;
        const dz = positions[j3 + 2] - zi;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < thresholdSq) {
          const dist = Math.sqrt(distSq);
          const alpha = 0.6 - (dist / this.distanceThreshold) * 0.5;

          linePositions.push(xi, yi, zi, positions[j3], positions[j3 + 1], positions[j3 + 2]);

          tempColor1.setRGB(colors.getX(i), colors.getY(i), colors.getZ(i));
          tempColor2.setRGB(colors.getX(j), colors.getY(j), colors.getZ(j));
          avgColor.copy(tempColor1).lerp(tempColor2, 0.5);

          lineColors.push(avgColor.r, avgColor.g, avgColor.b, alpha);
          lineColors.push(avgColor.r, avgColor.g, avgColor.b, alpha);
        }
      }
    }

    if (linePositions.length === 0) {
      this.networkActive = true;
      return;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 4));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.networkLines = new THREE.LineSegments(geometry, material);
    this.starField.getGroup().add(this.networkLines);
    this.networkActive = true;
  }

  clearNetwork(): void {
    if (this.networkLines) {
      this.starField.getGroup().remove(this.networkLines);
      this.networkLines.geometry.dispose();
      (this.networkLines.material as THREE.Material).dispose();
      this.networkLines = null;
    }
    this.networkActive = false;
  }

  toggleNetwork(): boolean {
    if (this.networkActive) {
      this.clearNetwork();
    } else {
      this.generateNetwork();
    }
    return this.networkActive;
  }

  isNetworkActive(): boolean {
    return this.networkActive;
  }

  showLocalNetwork(centerIndex: number, threshold: number = 3): void {
    this.clearLocalNetwork();

    const positions = this.starField.getPositions();
    if (!positions || centerIndex < 0) return;

    const neighbors = this.starField.getNeighbors(centerIndex, threshold);
    if (neighbors.length === 0) return;

    const ci3 = centerIndex * 3;
    const cx = positions[ci3];
    const cy = positions[ci3 + 1];
    const cz = positions[ci3 + 2];

    const linePositions: number[] = [];
    const lineColors: number[] = [];

    for (const neighborIndex of neighbors) {
      const ni3 = neighborIndex * 3;
      linePositions.push(cx, cy, cz, positions[ni3], positions[ni3 + 1], positions[ni3 + 2]);

      const cyanColor = new THREE.Color('#00d4ff');
      lineColors.push(cyanColor.r, cyanColor.g, cyanColor.b, 0.3);
      lineColors.push(cyanColor.r, cyanColor.g, cyanColor.b, 0.3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 4));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      linewidth: 1
    });

    this.localLines = new THREE.LineSegments(geometry, material);
    this.starField.getGroup().add(this.localLines);
  }

  clearLocalNetwork(): void {
    if (this.localLines) {
      this.starField.getGroup().remove(this.localLines);
      this.localLines.geometry.dispose();
      (this.localLines.material as THREE.Material).dispose();
      this.localLines = null;
    }
  }

  update(): void {
    if (this.networkLines) {
      this.networkLines.updateMatrixWorld(true);
    }
    if (this.localLines) {
      this.localLines.updateMatrixWorld(true);
    }
  }
}
