import * as THREE from 'three';

const GRID_SIZE = 32;
const SPACING = 0.5;
const MIN_HEIGHT = -2;
const MAX_HEIGHT = 2;

const COLOR_LOW = new THREE.Color('#1e3a8a');
const COLOR_MID = new THREE.Color('#7c3aed');
const COLOR_HIGH = new THREE.Color('#ef4444');

class WaveSurface {
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshPhongMaterial;
  private mesh: THREE.Mesh;
  private currentHeights: Float32Array;
  private targetHeights: Float32Array;
  private positions: Float32Array;
  private colors: Float32Array;
  private readonly lerpSpeed = 0.15;
  private time = 0;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(
      (GRID_SIZE - 1) * SPACING,
      (GRID_SIZE - 1) * SPACING,
      GRID_SIZE - 1,
      GRID_SIZE - 1
    );

    this.geometry.rotateX(-Math.PI / 2);

    const vertexCount = GRID_SIZE * GRID_SIZE;
    this.currentHeights = new Float32Array(vertexCount);
    this.targetHeights = new Float32Array(vertexCount);

    this.material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 60,
      specular: new THREE.Color('#334155'),
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);

    const posAttr = this.geometry.getAttribute('position');
    this.positions = posAttr.array as Float32Array;

    const colorArray = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      colorArray[i * 3] = COLOR_LOW.r;
      colorArray[i * 3 + 1] = COLOR_LOW.g;
      colorArray[i * 3 + 2] = COLOR_LOW.b;
    }
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    this.colors = this.geometry.getAttribute('color').array as Float32Array;

    this.updateNormals();
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  update(frequencyData: Uint8Array, deltaTime: number): void {
    this.time += deltaTime;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const idx = row * GRID_SIZE + col;
        const distFromCenter = Math.sqrt(
          Math.pow((col - GRID_SIZE / 2) / (GRID_SIZE / 2), 2) +
          Math.pow((row - GRID_SIZE / 2) / (GRID_SIZE / 2), 2)
        );
        const normalizedDist = Math.min(1, distFromCenter);

        const bandIdx = Math.min(
          frequencyData.length - 1,
          Math.floor((col / GRID_SIZE) * frequencyData.length)
        );
        const energy = (frequencyData[bandIdx] ?? 0) / 255;

        const wavePhase = this.time * 2.0 + col * 0.3 + row * 0.2;
        const ambientWave = Math.sin(wavePhase) * 0.15;

        const radialFalloff = 1 - normalizedDist * 0.4;

        const heightEnergy = energy * radialFalloff * (MAX_HEIGHT - MIN_HEIGHT);
        this.targetHeights[idx] = MIN_HEIGHT + heightEnergy + ambientWave;
      }
    }

    for (let i = 0; i < this.currentHeights.length; i++) {
      this.currentHeights[i] += (this.targetHeights[i] - this.currentHeights[i]) * this.lerpSpeed;
      this.positions[i * 3 + 1] = this.currentHeights[i];

      const t = (this.currentHeights[i] - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT);
      const clamped = Math.max(0, Math.min(1, t));

      let color: THREE.Color;
      if (clamped < 0.5) {
        color = COLOR_LOW.clone().lerp(COLOR_MID, clamped * 2);
      } else {
        color = COLOR_MID.clone().lerp(COLOR_HIGH, (clamped - 0.5) * 2);
      }
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }

    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
    this.updateNormals();
  }

  private updateNormals(): void {
    this.geometry.computeVertexNormals();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

export default WaveSurface;
