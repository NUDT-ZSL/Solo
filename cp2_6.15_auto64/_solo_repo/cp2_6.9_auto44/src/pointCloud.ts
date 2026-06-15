import * as THREE from 'three';

export type ColorMode = 'original' | 'heatmap' | 'custom';

export interface ParticleInfo {
  position: THREE.Vector3;
  color: THREE.Color;
  avgNeighborDistance: number;
}

export class PointCloud {
  private scene: THREE.Scene;
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private basePositions: Float32Array = new Float32Array();
  private baseColors: Float32Array = new Float32Array();
  private targetColors: Float32Array = new Float32Array();
  private currentColors: Float32Array = new Float32Array();
  private sizes: Float32Array = new Float32Array();
  private distances: number[] = [];
  private colorMode: ColorMode = 'original';
  private customHueMin: number = 30;
  private customHueMax: number = 200;
  private colorTransitionStart: number = 0;
  private isTransitioning: boolean = false;
  private highlightedIndex: number = -1;
  private pulseStartTime: number = 0;
  private pulseMesh!: THREE.Mesh;
  private pulseActive: boolean = false;
  private autoRotate: boolean = false;
  private glowActive: boolean = false;
  private rotationSpeed: number = (Math.PI * 2) / 5000;
  private rotationAngle: number = 0;
  private onRotationChange?: (angle: number) => void;

  private readonly PARTICLE_COUNT = 15000;
  private readonly TRANSITION_DURATION = 500;
  private readonly PULSE_DURATION = 800;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createPulseMesh();
    this.generatePointCloud();
  }

  private createPulseMesh(): void {
    const geometry = new THREE.RingGeometry(0.05, 0.08, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.pulseMesh = new THREE.Mesh(geometry, material);
    this.pulseMesh.visible = false;
    this.scene.add(this.pulseMesh);
  }

  private generatePointCloud(): void {
    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(this.PARTICLE_COUNT * 3);
    this.baseColors = new Float32Array(this.PARTICLE_COUNT * 3);
    this.currentColors = new Float32Array(this.PARTICLE_COUNT * 3);
    this.targetColors = new Float32Array(this.PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(this.PARTICLE_COUNT);
    this.distances = new Array(this.PARTICLE_COUNT);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.sphericalHarmonicDeformation(theta, phi);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;

      this.distances[i] = Math.sqrt(x * x + y * y + z * z);

      const size = 2 + Math.random() * 3;
      this.sizes[i] = size;

      const yNormalized = (y + 1.2) / 2.4;
      const ochre = new THREE.Color(0xcc7722);
      const marble = new THREE.Color(0xf5f5f0);
      const color = ochre.clone().lerp(marble, yNormalized);

      this.baseColors[i * 3] = color.r;
      this.baseColors[i * 3 + 1] = color.g;
      this.baseColors[i * 3 + 2] = color.b;

      this.currentColors[i * 3] = color.r;
      this.currentColors[i * 3 + 1] = color.g;
      this.currentColors[i * 3 + 2] = color.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.basePositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.currentColors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);

    this.computeTargetColors();
  }

  private sphericalHarmonicDeformation(theta: number, phi: number): number {
    const baseRadius = 1.0;

    const y00 = 0.5 * Math.sqrt(1 / Math.PI);
    const y20 = 0.25 * Math.sqrt(5 / Math.PI) * (3 * Math.cos(phi) * Math.cos(phi) - 1);
    const y22 = 0.25 * Math.sqrt(15 / Math.PI) * Math.sin(phi) * Math.sin(phi) * Math.cos(2 * theta);
    const y32 = 0.25 * Math.sqrt(105 / (2 * Math.PI)) * Math.sin(phi) * Math.sin(phi) * Math.cos(phi) * Math.cos(2 * theta);
    const y11 = -0.5 * Math.sqrt(3 / (2 * Math.PI)) * Math.sin(phi) * Math.cos(theta);
    const y30 = 0.25 * Math.sqrt(7 / Math.PI) * (5 * Math.cos(phi) * Math.cos(phi) * Math.cos(phi) - 3 * Math.cos(phi));

    const deformation =
      0.0 * y00 +
      0.15 * y20 +
      0.10 * y22 +
      0.08 * y32 +
      0.05 * y11 +
      0.03 * y30 +
      0.02 * Math.sin(theta * 3) * Math.sin(phi);

    const headShape = Math.max(0.7, 1.0 - 0.3 * Math.pow(Math.abs(Math.cos(phi)), 3));
    const faceIndent = 0.95 + 0.05 * Math.sin(theta) * Math.sin(phi);

    return baseRadius * (1 + deformation) * headShape * faceIndent;
  }

  private computeTargetColors(): void {
    let maxDist = 0;
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      if (this.distances[i] > maxDist) maxDist = this.distances[i];
    }

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const idx = i * 3;
      let r: number, g: number, b: number;

      switch (this.colorMode) {
        case 'original':
          r = this.baseColors[idx];
          g = this.baseColors[idx + 1];
          b = this.baseColors[idx + 2];
          break;

        case 'heatmap': {
          const t = this.distances[i] / maxDist;
          const heatColor = new THREE.Color();
          heatColor.setHSL((1 - t) * 0.66, 1, 0.5);
          r = heatColor.r;
          g = heatColor.g;
          b = heatColor.b;
          break;
        }

        case 'custom': {
          const y = this.basePositions[idx + 1];
          const yNormalized = (y + 1.2) / 2.4;
          const hue = this.customHueMin + (this.customHueMax - this.customHueMin) * yNormalized;
          const customColor = new THREE.Color();
          customColor.setHSL(hue / 360, 0.8, 0.55);
          r = customColor.r;
          g = customColor.g;
          b = customColor.b;
          break;
        }

        default:
          r = this.baseColors[idx];
          g = this.baseColors[idx + 1];
          b = this.baseColors[idx + 2];
      }

      this.targetColors[idx] = r;
      this.targetColors[idx + 1] = g;
      this.targetColors[idx + 2] = b;
    }
  }

  public setColorMode(mode: ColorMode): void {
    if (this.colorMode === mode) return;
    this.colorMode = mode;
    this.computeTargetColors();
    this.startColorTransition();
  }

  public setCustomHues(hueMin: number, hueMax: number): void {
    this.customHueMin = hueMin;
    this.customHueMax = hueMax;
    if (this.colorMode === 'custom') {
      this.computeTargetColors();
      this.startColorTransition();
    }
  }

  private startColorTransition(): void {
    this.colorTransitionStart = performance.now();
    this.isTransitioning = true;
  }

  public update(time: number): void {
    if (this.isTransitioning) {
      const elapsed = time - this.colorTransitionStart;
      const t = Math.min(elapsed / this.TRANSITION_DURATION, 1);
      const easeT = t * t * (3 - 2 * t);

      const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
      for (let i = 0; i < this.PARTICLE_COUNT; i++) {
        const idx = i * 3;
        this.currentColors[idx] = this.baseColors[idx] + (this.targetColors[idx] - this.baseColors[idx]) * easeT;
        this.currentColors[idx + 1] = this.baseColors[idx + 1] + (this.targetColors[idx + 1] - this.baseColors[idx + 1]) * easeT;
        this.currentColors[idx + 2] = this.baseColors[idx + 2] + (this.targetColors[idx + 2] - this.baseColors[idx + 2]) * easeT;

        if (i === this.highlightedIndex) {
          colorAttr.array[idx] = 1.0;
          colorAttr.array[idx + 1] = 1.0;
          colorAttr.array[idx + 2] = 0.0;
        } else {
          colorAttr.array[idx] = this.currentColors[idx];
          colorAttr.array[idx + 1] = this.currentColors[idx + 1];
          colorAttr.array[idx + 2] = this.currentColors[idx + 2];
        }
      }
      colorAttr.needsUpdate = true;

      if (t >= 1) {
        this.isTransitioning = false;
        for (let i = 0; i < this.PARTICLE_COUNT * 3; i++) {
          this.baseColors[i] = this.targetColors[i];
        }
      }
    } else if (this.highlightedIndex >= 0) {
      const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
      const idx = this.highlightedIndex * 3;
      colorAttr.array[idx] = 1.0;
      colorAttr.array[idx + 1] = 1.0;
      colorAttr.array[idx + 2] = 0.0;
      colorAttr.needsUpdate = true;
    }

    if (this.pulseActive) {
      const elapsed = time - this.pulseStartTime;
      const t = elapsed / this.PULSE_DURATION;
      if (t >= 1) {
        this.pulseActive = false;
        this.pulseMesh.visible = false;
      } else {
        const scale = 0.1 + t * 1.5;
        this.pulseMesh.scale.setScalar(scale);
        (this.pulseMesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
      }
    }

    if (this.autoRotate) {
      this.rotationAngle += this.rotationSpeed * 16.67;
      if (this.rotationAngle >= Math.PI * 2) {
        this.rotationAngle -= Math.PI * 2;
      }
      this.points.rotation.y = this.rotationAngle;
      if (this.onRotationChange) {
        this.onRotationChange(this.rotationAngle);
      }
    }
  }

  public getPoints(): THREE.Points {
    return this.points;
  }

  public highlightParticle(index: number, camera: THREE.Camera): ParticleInfo | null {
    if (index < 0 || index >= this.PARTICLE_COUNT) return null;

    if (this.highlightedIndex >= 0 && this.highlightedIndex !== index) {
      const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
      const prevIdx = this.highlightedIndex * 3;
      colorAttr.array[prevIdx] = this.currentColors[prevIdx];
      colorAttr.array[prevIdx + 1] = this.currentColors[prevIdx + 1];
      colorAttr.array[prevIdx + 2] = this.currentColors[prevIdx + 2];
    }

    this.highlightedIndex = index;

    const idx = index * 3;
    const position = new THREE.Vector3(
      this.basePositions[idx],
      this.basePositions[idx + 1],
      this.basePositions[idx + 2]
    );

    const color = new THREE.Color(
      this.currentColors[idx],
      this.currentColors[idx + 1],
      this.currentColors[idx + 2]
    );

    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.array[idx] = 1.0;
    colorAttr.array[idx + 1] = 1.0;
    colorAttr.array[idx + 2] = 0.0;
    colorAttr.needsUpdate = true;

    const worldPos = position.clone().applyMatrix4(this.points.matrixWorld);
    this.pulseMesh.position.copy(worldPos);
    this.pulseMesh.lookAt(camera.position);
    this.pulseMesh.scale.setScalar(0.1);
    (this.pulseMesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
    this.pulseMesh.visible = true;
    this.pulseActive = true;
    this.pulseStartTime = performance.now();

    const avgNeighborDist = this.computeAvgNeighborDistance(index);

    return { position, color, avgNeighborDistance: avgNeighborDist };
  }

  private computeAvgNeighborDistance(index: number): number {
    const idx = index * 3;
    const px = this.basePositions[idx];
    const py = this.basePositions[idx + 1];
    const pz = this.basePositions[idx + 2];

    const distances: number[] = [];
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      if (i === index) continue;
      const j = i * 3;
      const dx = this.basePositions[j] - px;
      const dy = this.basePositions[j + 1] - py;
      const dz = this.basePositions[j + 2] - pz;
      distances.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }

    distances.sort((a, b) => a - b);
    let sum = 0;
    for (let i = 0; i < 10 && i < distances.length; i++) {
      sum += distances[i];
    }
    return sum / Math.min(10, distances.length);
  }

  public setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
    this.glowActive = enabled;
    if (!enabled) {
      this.rotationAngle = this.points.rotation.y;
    }
  }

  public isAutoRotating(): boolean {
    return this.autoRotate;
  }

  public setRotationCallback(callback: (angle: number) => void): void {
    this.onRotationChange = callback;
  }

  public getRotationAngle(): number {
    return this.rotationAngle;
  }
}
