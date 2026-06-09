import * as THREE from 'three';
import type { TerrainData } from './terrain';

export interface FloodState {
  waterLevel: number;
  submergedPercent: number;
}

const WATER_COLOR = new THREE.Color(0x0064c8);
const GRADIENT_WIDTH = 5;
const WAVE_AMPLITUDE = 0.3;
const WAVE_FREQUENCY = 0.5;
const FADE_DURATION = 0.5;

interface ObjectFadeState {
  targetOpacity: number;
  targetColor: THREE.Color;
  currentOpacity: number;
  currentColor: THREE.Color;
}

export class FloodController {
  private terrainData: TerrainData;
  private scene: THREE.Scene;
  private waterMesh: THREE.Mesh;
  private waterGeometry: THREE.PlaneGeometry;
  private waterPositions: Float32Array;
  private objectStates: Map<THREE.Mesh, ObjectFadeState> = new Map();
  private currentWaterLevel: number = 0;
  private targetWaterLevel: number = 0;
  private elapsedTime: number = 0;

  constructor(terrainData: TerrainData, scene: THREE.Scene) {
    this.terrainData = terrainData;
    this.scene = scene;

    const terrainSize = terrainData.gridSize * terrainData.cellSize;
    this.waterGeometry = new THREE.PlaneGeometry(terrainSize * 1.1, terrainSize * 1.1, 60, 60);
    this.waterGeometry.rotateX(-Math.PI / 2);
    this.waterPositions = this.waterGeometry.attributes.position.array as Float32Array;

    const waterMaterial = new THREE.MeshPhongMaterial({
      color: WATER_COLOR,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      shininess: 80,
      specular: new THREE.Color(0x4488cc),
      depthWrite: false,
    });

    this.waterMesh = new THREE.Mesh(this.waterGeometry, waterMaterial);
    this.waterMesh.name = 'water_surface';
    this.waterMesh.position.y = -10;
    this.waterMesh.visible = false;
    scene.add(this.waterMesh);

    for (const obj of terrainData.objects) {
      const mat = obj.mesh.material as THREE.MeshLambertMaterial;
      mat.transparent = true;

      this.objectStates.set(obj.mesh, {
        targetOpacity: obj.originalOpacity,
        targetColor: obj.originalColor.clone(),
        currentOpacity: obj.originalOpacity,
        currentColor: obj.originalColor.clone(),
      });
    }
  }

  public setWaterLevel(level: number): void {
    this.targetWaterLevel = Math.max(0, level);
    if (this.targetWaterLevel > 0.1) {
      this.waterMesh.visible = true;
    }
  }

  public getWaterLevel(): number {
    return this.currentWaterLevel;
  }

  public update(deltaTime: number): FloodState {
    this.elapsedTime += deltaTime;

    const levelSpeed = 15;
    if (Math.abs(this.currentWaterLevel - this.targetWaterLevel) > 0.01) {
      const diff = this.targetWaterLevel - this.currentWaterLevel;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), levelSpeed * deltaTime);
      this.currentWaterLevel += step;
    } else {
      this.currentWaterLevel = this.targetWaterLevel;
    }

    this.updateWaterSurface();
    this.updateObjectFading(deltaTime);

    const submergedPercent = this.calculateSubmergedPercent();

    return {
      waterLevel: this.currentWaterLevel,
      submergedPercent,
    };
  }

  private updateWaterSurface(): void {
    const level = this.currentWaterLevel;
    const positions = this.waterPositions;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      const wave = Math.sin(x * 0.15 + this.elapsedTime * WAVE_FREQUENCY * Math.PI * 2) * 0.5
                 + Math.cos(z * 0.12 + this.elapsedTime * WAVE_FREQUENCY * Math.PI * 2 * 0.8) * 0.3
                 + Math.sin((x + z) * 0.08 + this.elapsedTime * WAVE_FREQUENCY * Math.PI * 2 * 1.2) * 0.2;

      positions[i + 1] = level + wave * WAVE_AMPLITUDE;
    }

    this.waterGeometry.attributes.position.needsUpdate = true;
    this.waterGeometry.computeVertexNormals();

    const mat = this.waterMesh.material as THREE.MeshPhongMaterial;
    if (level < 0.5) {
      mat.opacity = 0.55 * (level / 0.5);
    } else {
      mat.opacity = 0.55;
    }
  }

  private updateObjectFading(deltaTime: number): void {
    const waterLevel = this.currentWaterLevel;
    const fadeSpeed = 1 / FADE_DURATION;

    for (const obj of this.terrainData.objects) {
      const state = this.objectStates.get(obj.mesh);
      if (!state) continue;

      const mat = obj.mesh.material as THREE.MeshLambertMaterial;
      const heightDiff = waterLevel - obj.baseY;

      let targetOpacity = obj.originalOpacity;
      let targetColor = obj.originalColor;

      if (heightDiff > GRADIENT_WIDTH) {
        targetOpacity = 0.2;
        targetColor = WATER_COLOR;
      } else if (heightDiff > 0) {
        const t = heightDiff / GRADIENT_WIDTH;
        const easeT = t * t * (3 - 2 * t);
        targetOpacity = obj.originalOpacity * (1 - easeT * 0.85);
        targetColor = obj.originalColor.clone().lerp(WATER_COLOR, easeT * 0.75);
      } else if (heightDiff > -GRADIENT_WIDTH * 0.5) {
        const t = (heightDiff + GRADIENT_WIDTH * 0.5) / (GRADIENT_WIDTH * 0.5);
        const easeT = t * t * (3 - 2 * t);
        targetOpacity = obj.originalOpacity * (1 - easeT * 0.3);
        targetColor = obj.originalColor.clone().lerp(WATER_COLOR, easeT * 0.2);
      }

      state.targetOpacity = targetOpacity;
      state.targetColor = targetColor.clone();

      const opacityDiff = state.targetOpacity - state.currentOpacity;
      if (Math.abs(opacityDiff) > 0.001) {
        state.currentOpacity += Math.sign(opacityDiff) * Math.min(Math.abs(opacityDiff), fadeSpeed * deltaTime);
        mat.opacity = state.currentOpacity;
      } else {
        state.currentOpacity = state.targetOpacity;
        mat.opacity = state.targetOpacity;
      }

      const colorDiffR = state.targetColor.r - state.currentColor.r;
      const colorDiffG = state.targetColor.g - state.currentColor.g;
      const colorDiffB = state.targetColor.b - state.currentColor.b;
      const colorDist = Math.sqrt(colorDiffR ** 2 + colorDiffG ** 2 + colorDiffB ** 2);

      if (colorDist > 0.005) {
        state.currentColor.lerp(state.targetColor, Math.min(1, fadeSpeed * deltaTime));
        mat.color.copy(state.currentColor);
      } else {
        state.currentColor.copy(state.targetColor);
        mat.color.copy(state.targetColor);
      }
    }
  }

  private calculateSubmergedPercent(): number {
    const { heightMap, gridSize, totalArea } = this.terrainData;
    const waterLevel = this.currentWaterLevel;

    if (waterLevel <= 0 || totalArea === 0) return 0;

    let submergedArea = 0;

    for (let i = 0; i < heightMap.length; i++) {
      if (heightMap[i] <= waterLevel && heightMap[i] > 0) {
        submergedArea++;
      }
    }

    const cellArea = this.terrainData.cellSize * this.terrainData.cellSize;
    return Math.min(100, (submergedArea * cellArea / totalArea) * 100);
  }

  public dispose(): void {
    this.waterGeometry.dispose();
    (this.waterMesh.material as THREE.Material).dispose();
    this.scene.remove(this.waterMesh);
  }
}
