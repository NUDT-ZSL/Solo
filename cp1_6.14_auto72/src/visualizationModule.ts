import * as THREE from 'three';
import EventBus from './eventBus';
import { Building, StreamLine, SimulationParams } from './simulationModule';

export class VisualizationModule {
  private scene: THREE.Scene;
  private eventBus: EventBus;

  private groundMesh: THREE.Mesh | null = null;
  private buildingsGroup: THREE.Group | null = null;
  private heatMapMesh: THREE.Mesh | null = null;
  private streamLinesGroup: THREE.Group | null = null;

  private gridSize: number = 50;
  private gridResolution: number = 50;
  private heatGrid: Float32Array | null = null;

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
  }

  public initialize(): void {
    this.createGround();
    this.createGrid();
    this.createBuildingsGroup();
    this.createHeatMap();
    this.createStreamLinesGroup();
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
    const gridHelper = new THREE.GridHelper(this.gridSize, 50, 0x555555, 0x555555);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.5;
    this.scene.add(gridHelper);
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

  private createStreamLinesGroup(): void {
    const group = new THREE.Group();
    group.name = 'streamlines';
    this.scene.add(group);
    this.streamLinesGroup = group;
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

  private updateHeatMapColors(): void {
    if (!this.heatMapMesh || !this.heatGrid) return;

    const geometry = this.heatMapMesh.geometry as THREE.PlaneGeometry;
    const colors = geometry.attributes.color as THREE.BufferAttribute;

    for (let z = 0; z < this.gridResolution; z++) {
      for (let x = 0; x < this.gridResolution; x++) {
        const idx = z * this.gridResolution + x;
        const heat = this.heatGrid[idx];
        const color = this.getHeatColor(heat);
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
      color.setRGB(0, 0.5 * f, 1);
    } else if (t < 0.5) {
      const f = (t - 0.25) / 0.25;
      color.setRGB(0, 0.5 + 0.5 * f, 1 - f);
    } else if (t < 0.75) {
      const f = (t - 0.5) / 0.25;
      color.setRGB(f, 1, 0);
    } else {
      const f = (t - 0.75) / 0.25;
      color.setRGB(1, 1 - f * 0.8, 0);
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
    if (!this.streamLinesGroup) return;

    while (this.streamLinesGroup.children.length > 0) {
      const child = this.streamLinesGroup.children[0];
      this.streamLinesGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    const lineColor = new THREE.Color(200 / 255, 240 / 255, 255 / 255);

    for (const line of streamLines) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < line.positions.length; i++) {
        points.push(line.positions[i].clone());
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: lineColor,
        transparent: true,
        opacity: 0.3,
        linewidth: 1.5,
      });

      const lineMesh = new THREE.Line(geometry, material);
      this.streamLinesGroup.add(lineMesh);
    }
  }

  public updateDisplayMode(mode: 'heatmap' | 'streamlines' | 'both'): void {
    if (this.heatMapMesh) {
      this.heatMapMesh.visible = mode === 'heatmap' || mode === 'both';
    }
    if (this.streamLinesGroup) {
      this.streamLinesGroup.visible = mode === 'streamlines' || mode === 'both';
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

  public getGridSize(): number {
    return this.gridSize;
  }
}

export default VisualizationModule;
