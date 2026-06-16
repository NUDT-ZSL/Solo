import * as THREE from 'three';

export interface BuildingData {
  mesh: THREE.Mesh;
  gridX: number;
  gridZ: number;
  height: number;
  windPressureLeft: number;
  windPressureRight: number;
}

export class BuildingGrid {
  private scene: THREE.Scene;
  private gridSize: number = 5;
  private cellSize: number = 4;
  private buildings: BuildingData[] = [];
  private buildingGroup: THREE.Group;
  private highlightGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildingGroup = new THREE.Group();
    this.highlightGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);
    this.scene.add(this.highlightGroup);
    this.generateBuildings();
  }

  private getBuildingColor(height: number): THREE.Color {
    const colorLow = new THREE.Color(0x7986CB);
    const colorMid = new THREE.Color(0x5C6BC0);
    const colorHigh = new THREE.Color(0x3949AB);

    if (height <= 4) {
      const t = (height - 2) / 2;
      return colorLow.clone().lerp(colorMid, t);
    } else if (height <= 6) {
      const t = (height - 4) / 2;
      return colorMid.clone().lerp(colorHigh, t);
    } else {
      return colorHigh;
    }
  }

  private generateBuildings(): void {
    const offset = (this.gridSize * this.cellSize) / 2 - this.cellSize / 2;

    for (let gx = 0; gx < this.gridSize; gx++) {
      for (let gz = 0; gz < this.gridSize; gz++) {
        const height = 2 + Math.random() * 6;
        const geometry = new THREE.BoxGeometry(3, height, 3);
        const material = new THREE.MeshLambertMaterial({
          color: this.getBuildingColor(height),
          flatShading: true
        });
        const mesh = new THREE.Mesh(geometry, material);

        const x = gx * this.cellSize - offset;
        const z = gz * this.cellSize - offset;

        mesh.position.set(x, height / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const windPressureLeft = 0.8 + Math.random() * 0.4;
        const windPressureRight = 0.3 + Math.random() * 0.3;

        const buildingData: BuildingData = {
          mesh,
          gridX: gx,
          gridZ: gz,
          height,
          windPressureLeft,
          windPressureRight
        };

        mesh.userData.buildingData = buildingData;
        this.buildings.push(buildingData);
        this.buildingGroup.add(mesh);
      }
    }
  }

  public getBuildings(): BuildingData[] {
    return this.buildings;
  }

  public getBuildingAt(intersectObject: THREE.Object3D): BuildingData | null {
    if (intersectObject.userData && intersectObject.userData.buildingData) {
      return intersectObject.userData.buildingData;
    }
    return null;
  }

  public getBuildingByGrid(gridX: number, gridZ: number): BuildingData | null {
    return this.buildings.find(b => b.gridX === gridX && b.gridZ === gridZ) || null;
  }

  public highlightBuilding(building: BuildingData): void {
    this.clearHighlight();

    const edgeGeometry = new THREE.EdgesGeometry(building.mesh.geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x6C63FF, linewidth: 2 });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.copy(building.mesh.position);
    edges.userData.isHighlight = true;
    this.highlightGroup.add(edges);

    const ringGeometry = new THREE.RingGeometry(1.8, 2.2, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x6C63FF,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(building.mesh.position.x, 0.1, building.mesh.position.z);
    ring.userData.isHighlight = true;
    this.highlightGroup.add(ring);
  }

  public clearHighlight(): void {
    while (this.highlightGroup.children.length > 0) {
      const child = this.highlightGroup.children[0];
      this.highlightGroup.remove(child);
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      } else if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }

  public getWindPaths(): THREE.Vector3[][] {
    const paths: THREE.Vector3[][] = [];
    const offset = (this.gridSize * this.cellSize) / 2;
    const totalWidth = this.gridSize * this.cellSize;

    paths.push([
      new THREE.Vector3(-offset - 5, 4, -4),
      new THREE.Vector3(-offset + 2, 4, -3),
      new THREE.Vector3(0, 4, -2),
      new THREE.Vector3(offset - 2, 4, -3),
      new THREE.Vector3(offset + 5, 4, -4)
    ]);

    paths.push([
      new THREE.Vector3(-offset - 5, 5, 0),
      new THREE.Vector3(-offset + 3, 5, 1),
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(offset - 3, 5, -1),
      new THREE.Vector3(offset + 5, 5, 0)
    ]);

    paths.push([
      new THREE.Vector3(-offset - 5, 4, 4),
      new THREE.Vector3(-offset + 2, 4, 3),
      new THREE.Vector3(0, 4, 2),
      new THREE.Vector3(offset - 2, 4, 3),
      new THREE.Vector3(offset + 5, 4, 4)
    ]);

    paths.push([
      new THREE.Vector3(-offset - 5, 3, -6),
      new THREE.Vector3(-offset + 1, 3, -5),
      new THREE.Vector3(offset - 1, 3, -5),
      new THREE.Vector3(offset + 5, 3, -6)
    ]);

    paths.push([
      new THREE.Vector3(-offset - 5, 6, 6),
      new THREE.Vector3(-offset + 1, 6, 5),
      new THREE.Vector3(offset - 1, 6, 5),
      new THREE.Vector3(offset + 5, 6, 6)
    ]);

    paths.push([
      new THREE.Vector3(-offset - 5, 4.5, -2),
      new THREE.Vector3(-offset + 4, 4.5, -1),
      new THREE.Vector3(0, 4.5, 0.5),
      new THREE.Vector3(offset - 4, 4.5, 1),
      new THREE.Vector3(offset + 5, 4.5, 2)
    ]);

    paths.push([
      new THREE.Vector3(-offset - 5, 5.5, 2),
      new THREE.Vector3(-offset + 4, 5.5, 1),
      new THREE.Vector3(0, 5.5, -0.5),
      new THREE.Vector3(offset - 4, 5.5, -1),
      new THREE.Vector3(offset + 5, 5.5, -2)
    ]);

    paths.push([
      new THREE.Vector3(-offset - 5, 3.5, 1.5),
      new THREE.Vector3(-offset + 3, 3.5, 2),
      new THREE.Vector3(offset - 3, 3.5, 2.5),
      new THREE.Vector3(offset + 5, 3.5, 3)
    ]);

    paths.push([
      new THREE.Vector3(-offset - 5, 6.5, -1.5),
      new THREE.Vector3(-offset + 3, 6.5, -2),
      new THREE.Vector3(offset - 3, 6.5, -2.5),
      new THREE.Vector3(offset + 5, 6.5, -3)
    ]);

    return paths;
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public getGridCenter(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0);
  }

  public getWorldPosition(gridX: number, gridZ: number): THREE.Vector3 {
    const offset = (this.gridSize * this.cellSize) / 2 - this.cellSize / 2;
    return new THREE.Vector3(
      gridX * this.cellSize - offset,
      0,
      gridZ * this.cellSize - offset
    );
  }
}
