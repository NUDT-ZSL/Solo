import * as THREE from 'three';

export interface BuildingCell {
  mesh: THREE.Mesh;
  baseY: number;
}

export interface GroundCell {
  mesh: THREE.Mesh;
}

const BUILDING_COLOR_COLD = new THREE.Color('#1B5E20');
const BUILDING_COLOR_HOT = new THREE.Color('#B71C1C');

const GROUND_COLOR_COLD = new THREE.Color('#81C784');
const GROUND_COLOR_HOT = new THREE.Color('#E53935');

const TRANSITION_DURATION = 0.3;

export class SceneUpdater {
  private buildings: BuildingCell[][];
  private groundPlanes: GroundCell[][];
  private gridSize: number;

  private currentTempMatrix: number[][];
  private targetTempMatrix: number[][];
  private transitionProgress: number;
  private isTransitioning: boolean;

  private globalMinTemp: number;
  private globalMaxTemp: number;

  constructor(
    buildings: BuildingCell[][],
    groundPlanes: GroundCell[][],
    gridSize: number
  ) {
    this.buildings = buildings;
    this.groundPlanes = groundPlanes;
    this.gridSize = gridSize;

    this.currentTempMatrix = this.createEmptyMatrix();
    this.targetTempMatrix = this.createEmptyMatrix();
    this.transitionProgress = 1;
    this.isTransitioning = false;

    this.globalMinTemp = 20;
    this.globalMaxTemp = 35;
  }

  private createEmptyMatrix(): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < this.gridSize; i++) {
      matrix.push(new Array(this.gridSize).fill(25));
    }
    return matrix;
  }

  public updateTemperatures(
    tempMatrix: number[][],
    minTemp: number,
    maxTemp: number
  ): void {
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        this.currentTempMatrix[i][j] = this.lerp(
          this.currentTempMatrix[i][j],
          tempMatrix[i][j],
          this.transitionProgress
        );
        this.targetTempMatrix[i][j] = tempMatrix[i][j];
      }
    }

    this.globalMinTemp = minTemp;
    this.globalMaxTemp = maxTemp;

    this.transitionProgress = 0;
    this.isTransitioning = true;
  }

  public update(deltaTime: number): void {
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / TRANSITION_DURATION;

      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
      }

      const easedProgress = this.easeInOut(this.transitionProgress);

      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          const temp = this.lerp(
            this.currentTempMatrix[i][j],
            this.targetTempMatrix[i][j],
            easedProgress
          );

          const t = this.normalizeTemp(temp);

          const buildingColor = new THREE.Color();
          buildingColor.copy(BUILDING_COLOR_COLD).lerp(BUILDING_COLOR_HOT, t);

          const groundColor = new THREE.Color();
          groundColor.copy(GROUND_COLOR_COLD).lerp(GROUND_COLOR_HOT, t);

          const buildingMaterial = this.buildings[i][j].mesh.material as THREE.MeshStandardMaterial;
          buildingMaterial.color.copy(buildingColor);

          const groundMaterial = this.groundPlanes[i][j].mesh.material as THREE.MeshStandardMaterial;
          groundMaterial.color.copy(groundColor);
        }
      }

      if (!this.isTransitioning) {
        for (let i = 0; i < this.gridSize; i++) {
          for (let j = 0; j < this.gridSize; j++) {
            this.currentTempMatrix[i][j] = this.targetTempMatrix[i][j];
          }
        }
      }
    }
  }

  private normalizeTemp(temp: number): number {
    const range = this.globalMaxTemp - this.globalMinTemp;
    if (range === 0) return 0.5;
    const t = (temp - this.globalMinTemp) / range;
    return Math.max(0, Math.min(1, t));
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
