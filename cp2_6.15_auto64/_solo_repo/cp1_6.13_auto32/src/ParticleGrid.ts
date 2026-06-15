import * as THREE from 'three';
import { WaveModel } from './WaveModel';

const COLOR_START = new THREE.Color('#38bdf8');
const COLOR_END = new THREE.Color('#0ea5e9');

export type QualityLevel = 'high' | 'low';

export class ParticleGrid {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private gridCountX: number;
  private gridCountZ: number;
  private spacing: number;
  private basePositions: Float32Array;
  private currentPositions: Float32Array;
  private colors: Float32Array;
  private baseSize: number;
  private baseOpacity: number;
  public particleCount: number;

  constructor(gridSize: number, spacing: number) {
    this.spacing = spacing;
    this.gridCountX = Math.floor(gridSize / spacing) + 1;
    this.gridCountZ = Math.floor(gridSize / spacing) + 1;
    this.particleCount = this.gridCountX * this.gridCountZ;
    this.baseSize = 2;
    this.baseOpacity = 0.7;

    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.currentPositions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);

    const half = gridSize / 2;
    const tempColor = new THREE.Color();
    let idx = 0;

    for (let iz = 0; iz < this.gridCountZ; iz++) {
      for (let ix = 0; ix < this.gridCountX; ix++) {
        const x = ix * spacing - half;
        const z = iz * spacing - half;

        this.basePositions[idx * 3] = x;
        this.basePositions[idx * 3 + 1] = 0;
        this.basePositions[idx * 3 + 2] = z;

        this.currentPositions[idx * 3] = x;
        this.currentPositions[idx * 3 + 1] = 0;
        this.currentPositions[idx * 3 + 2] = z;

        const dist = Math.sqrt(x * x + z * z);
        const t = Math.min(1, dist / (half * 1.2));
        tempColor.copy(COLOR_START).lerp(COLOR_END, t);
        this.colors[idx * 3] = tempColor.r;
        this.colors[idx * 3 + 1] = tempColor.g;
        this.colors[idx * 3 + 2] = tempColor.b;

        idx++;
      }
    }

    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.currentPositions, 3)
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: this.baseSize,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
  }

  public update(model: WaveModel, time: number): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      const ix = i * 3;
      const x = this.basePositions[ix];
      const z = this.basePositions[ix + 2];
      const y = model.getHeightAt(x, z, time);
      arr[ix] = x;
      arr[ix + 1] = y;
      arr[ix + 2] = z;
    }

    posAttr.needsUpdate = true;
  }

  public setQualityLevel(level: QualityLevel): void {
    if (level === 'low') {
      this.material.size = this.baseSize * 0.5;
      this.material.opacity = 0.5;
    } else {
      this.material.size = this.baseSize;
      this.material.opacity = this.baseOpacity;
    }
    this.material.needsUpdate = true;
  }

  public getSpacing(): number {
    return this.spacing;
  }
}
