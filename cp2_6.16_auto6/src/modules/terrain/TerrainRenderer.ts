import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

export class TerrainRenderer {
  private terrainGenerator: TerrainGenerator;
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.PlaneGeometry | null = null;
  private material: THREE.MeshStandardMaterial | null = null;
  private wireframe: THREE.LineSegments | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private scene: THREE.Scene | null = null;

  constructor(terrainGenerator: TerrainGenerator) {
    this.terrainGenerator = terrainGenerator;
  }

  initialize(scene: THREE.Scene): void {
    this.scene = scene;
    this.createTerrainMesh();
    this.createWireframe();
    this.createGridHelper();
  }

  private createTerrainMesh(): void {
    const gridSize = this.terrainGenerator.getGridSize();
    const cellSize = this.terrainGenerator.getCellSize();
    const terrainSize = gridSize * cellSize;

    this.geometry = new THREE.PlaneGeometry(
      terrainSize,
      terrainSize,
      gridSize - 1,
      gridSize - 1
    );

    this.geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: false,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;

    this.updateMeshVertices();
    this.updateMeshColors();

    if (this.scene) {
      this.scene.add(this.mesh);
    }
  }

  private createWireframe(): void {
    if (!this.geometry) return;

    const wireframeGeometry = new THREE.WireframeGeometry(this.geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.6,
    });

    this.wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);

    if (this.scene) {
      this.scene.add(this.wireframe);
    }
  }

  private createGridHelper(): void {
    const gridSize = this.terrainGenerator.getGridSize();
    const cellSize = this.terrainGenerator.getCellSize();
    const terrainSize = gridSize * cellSize;

    this.gridHelper = new THREE.GridHelper(
      terrainSize,
      gridSize,
      0x333333,
      0x222222
    );
    this.gridHelper.position.y = -0.01;

    if (this.scene) {
      this.scene.add(this.gridHelper);
    }
  }

  update(): void {
    this.updateMeshVertices();
    this.updateMeshColors();
    this.updateWireframe();
  }

  private updateMeshVertices(): void {
    if (!this.geometry || !this.mesh) return;

    const positions = this.geometry.attributes.position;
    const cells = this.terrainGenerator.getCells();
    const gridSize = this.terrainGenerator.getGridSize();
    const scale = this.terrainGenerator['terrainScale'] || 1;

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const index = z * gridSize + x;
        const height = cells[z][x].height * scale;
        positions.setY(index, height);
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private updateMeshColors(): void {
    if (!this.geometry || !this.material) return;

    const positions = this.geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const cells = this.terrainGenerator.getCells();
    const gridSize = this.terrainGenerator.getGridSize();

    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize; x++) {
        const index = z * gridSize + x;
        const height = cells[z][x].height;
        const color = this.terrainGenerator.getColorAtHeight(height);

        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }

    if (!this.geometry.getAttribute('color')) {
      this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    } else {
      const colorAttribute = this.geometry.getAttribute('color') as THREE.BufferAttribute;
      colorAttribute.array.set(colors);
      colorAttribute.needsUpdate = true;
    }

    this.material.vertexColors = true;
    this.material.needsUpdate = true;
  }

  private updateWireframe(): void {
    if (!this.wireframe || !this.mesh) return;

    const newWireframeGeometry = new THREE.WireframeGeometry(this.geometry!);
    this.wireframe.geometry.dispose();
    this.wireframe.geometry = newWireframeGeometry;
  }

  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this.wireframe) {
      this.wireframe.geometry.dispose();
      (this.wireframe.material as THREE.Material).dispose();
    }
    if (this.gridHelper) {
      this.scene?.remove(this.gridHelper);
    }
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
    if (this.wireframe && this.scene) {
      this.scene.remove(this.wireframe);
    }
  }
}
