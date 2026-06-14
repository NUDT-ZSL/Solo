import * as THREE from 'three';
import EventBus from './eventBus';
import { Building, StreamLine, SimulationParams } from './simulationModule';

export class VisualizationModule {
  private scene: THREE.Scene;
  private eventBus: EventBus;

  private groundMesh: THREE.Mesh | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private buildingsGroup: THREE.Group | null = null;
  private heatMapMesh: THREE.Mesh | null = null;
  private streamLinesMesh: THREE.LineSegments | null = null;

  private gridSize: number = 50;
  private gridResolution: number = 50;
  private heatGrid: Float32Array | null = null;
  private heatMin: number = 0;
  private heatMax: number = 1;

  private displayMode: 'heatmap' | 'streamlines' | 'both' = 'both';

  private maxStreamLines: number = 300;
  private verticesPerLine: number = 20;
  private streamLineGeometry: THREE.BufferGeometry | null = null;

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
  }

  public initialize(): void {
    this.createGround();
    this.createGrid();
    this.createBuildingsGroup();
    this.createHeatMap();
    this.createStreamLines();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('simulation:heatGridUpdated', (data: any) => {
      this.updateHeatGrid(data.heatGrid, data.gridSize, data.gridResolution);
    });

    this.eventBus.on('simulation:buildingsUpdated', (buildings: Building[]) => {
      this.updateBuildings(buildings);
    });

    this.eventBus.on('simulation:streamlinesUpdated', (streamLines: StreamLine[]) => {
      this.updateStreamLines(streamLines);
    });

    this.eventBus.on('simulation:paramsUpdated', (params: SimulationParams) => {
      this.updateDisplayMode(params.displayMode);
      this.updateHeatRange(params.heatSourceIntensity);
    });
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(this.gridSize, this.gridSize);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = 0;
    ground.name = 'ground';
    this.scene.add(ground);
    this.groundMesh = ground;
  }

  private createGrid(): void {
    this.gridHelper = new THREE.GridHelper(this.gridSize, 50, 0x555555, 0x555555);
    this.gridHelper.position.y = 0.01;
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.5;
    this.scene.add(this.gridHelper);
  }

  private createBuildingsGroup(): void {
    const group = new THREE.Group();
    group.name = 'buildings';
    this.scene.add(group);
    this.buildingsGroup = group;
  }

  private createHeatMap(): void {
    const geometry = new THREE.PlaneGeometry(
      this.gridSize,
      this.gridSize,
      this.gridResolution - 1,
      this.gridResolution - 1
    );

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    const heatMap = new THREE.Mesh(geometry, material);
    heatMap.rotation.x = -Math.PI / 2;
    heatMap.position.y = 0.05;
    heatMap.name = 'heatmap';
    this.scene.add(heatMap);
    this.heatMapMesh = heatMap;

    this.initHeatMapColors();
  }

  private initHeatMapColors(): void {
    if (!this.heatMapMesh) return;

    const geometry = this.heatMapMesh.geometry as THREE.PlaneGeometry;
    const colors = new Float32Array(geometry.attributes.position.count * 3);

    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = 0;
      colors[i + 1] = 0.5;
      colors[i + 2] = 1;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.attributes.color.needsUpdate = true;
  }

  private createStreamLines(): void {
    const totalVertices = this.maxStreamLines * (this.verticesPerLine - 1) * 2;
    const positions = new Float32Array(totalVertices * 3);

    this.streamLineGeometry = new THREE.BufferGeometry();
    this.streamLineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.streamLineGeometry.setDrawRange(0, 0);

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(200 / 255, 240 / 255, 255 / 255),
      transparent: true,
      opacity: 0.3,
    });

    const lineSegments = new THREE.LineSegments(this.streamLineGeometry, material);
    lineSegments.name = 'streamlines';
    this.scene.add(lineSegments);
    this.streamLinesMesh = lineSegments;
  }

  public updateHeatGrid(
    heatGrid: Float32Array,
    gridSize: number,
    gridResolution: number
  ): void {
    this.heatGrid = heatGrid;
    this.gridSize = gridSize;
    this.gridResolution = gridResolution;

    this.updateHeatMapColors();
  }

  private updateHeatRange(heatSourceIntensity: number): void {
    this.heatMin = 0;
    this.heatMax = Math.max(0.1, heatSourceIntensity / 50);
    this.updateHeatMapColors();
  }

  private updateHeatMapColors(): void {
    if (!this.heatMapMesh || !this.heatGrid) return;

    const geometry = this.heatMapMesh.geometry as THREE.PlaneGeometry;
    const colors = geometry.attributes.color as THREE.BufferAttribute;
    const range = this.heatMax - this.heatMin;

    for (let z = 0; z < this.gridResolution; z++) {
      for (let x = 0; x < this.gridResolution; x++) {
        const idx = z * this.gridResolution + x;
        const heat = this.heatGrid[idx];
        const normalized = range > 0 ? (heat - this.heatMin) / range : 0;
        const clamped = Math.max(0, Math.min(1, normalized));
        const color = this.getHeatColor(clamped);
        const vertexIdx = z * this.gridResolution + x;

        colors.setXYZ(vertexIdx, color.r, color.g, color.b);
      }
    }

    colors.needsUpdate = true;
  }

  private getHeatColor(t: number): THREE.Color {
    const color = new THREE.Color();

    if (t < 0.25) {
      const f = t / 0.25;
      color.setRGB(0, 0.3 + 0.4 * f, 0.6 + 0.4 * f);
    } else if (t < 0.5) {
      const f = (t - 0.25) / 0.25;
      color.setRGB(0, 0.7 + 0.3 * f, 1 - f);
    } else if (t < 0.75) {
      const f = (t - 0.5) / 0.25;
      color.setRGB(f * 0.8 + 0.2, 1 - f * 0.3, 0);
    } else {
      const f = (t - 0.75) / 0.25;
      color.setRGB(1, 0.7 - f * 0.5, 0);
    }

    return color;
  }

  public updateBuildings(buildings: Building[]): void {
    if (!this.buildingsGroup) return;

    while (this.buildingsGroup.children.length > 0) {
      const child = this.buildingsGroup.children[0];
      this.buildingsGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    for (const building of buildings) {
      const geometry = new THREE.BoxGeometry(building.width, building.height, building.depth);
      const material = new THREE.MeshStandardMaterial({
        color: building.color,
        roughness: 0.7,
        metalness: 0.2,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(building.position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.buildingsGroup.add(mesh);
    }
  }

  public updateStreamLines(streamLines: StreamLine[]): void {
    if (!this.streamLineGeometry || !this.streamLinesMesh) return;

    const positions = this.streamLineGeometry.attributes.position.array as Float32Array;
    let vertexIndex = 0;

    const lineCount = Math.min(streamLines.length, this.maxStreamLines);

    for (let lineIdx = 0; lineIdx < lineCount; lineIdx++) {
      const line = streamLines[lineIdx];
      const positionsCount = line.positions.length;

      for (let i = 0; i < positionsCount - 1; i++) {
        const p1 = line.positions[i];
        const p2 = line.positions[i + 1];

        const idx = vertexIndex * 3;
        positions[idx] = p1.x;
        positions[idx + 1] = p1.y;
        positions[idx + 2] = p1.z;

        const idx2 = (vertexIndex + 1) * 3;
        positions[idx2] = p2.x;
        positions[idx2 + 1] = p2.y;
        positions[idx2 + 2] = p2.z;

        vertexIndex += 2;
      }
    }

    this.streamLineGeometry.setDrawRange(0, vertexIndex);
    this.streamLineGeometry.attributes.position.needsUpdate = true;
    this.streamLineGeometry.computeBoundingSphere();
  }

  public updateDisplayMode(mode: 'heatmap' | 'streamlines' | 'both'): void {
    this.displayMode = mode;

    if (this.heatMapMesh) {
      this.heatMapMesh.visible = this.displayMode === 'heatmap' || this.displayMode === 'both';
    }
    if (this.streamLinesMesh) {
      this.streamLinesMesh.visible = this.displayMode === 'streamlines' || this.displayMode === 'both';
    }
    if (this.gridHelper) {
      this.gridHelper.visible = true;
    }
  }

  public update(_deltaTime: number): void {
  }

  public getHeatMapMesh(): THREE.Mesh | null {
    return this.heatMapMesh;
  }

  public getGroundMesh(): THREE.Mesh | null {
    return this.groundMesh;
  }

  public getGridHelper(): THREE.GridHelper | null {
    return this.gridHelper;
  }

  public getGridSize(): number {
    return this.gridSize;
  }
}

export default VisualizationModule;
