import * as THREE from 'three';
import { BuildingConfig, BuildingData } from '@/types';
import { eventBus } from '@/core/EventBus';

type RoofStyle = 'flat' | 'slope' | 'spire' | 'dome';

export class BuildingGenerator {
  private scene: THREE.Scene;
  private buildingGroup: THREE.Group;
  private buildingMeshes: THREE.Mesh[] = [];
  private buildingData: BuildingData[] = [];
  private windowMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, buildingGroup: THREE.Group) {
    this.scene = scene;
    this.buildingGroup = buildingGroup;
    this.registerEvents();
  }

  private registerEvents(): void {
    eventBus.on('config:building', (config) => {
      this.generate(config);
    });
  }

  public generate(config: BuildingConfig): void {
    this.clear();

    const gridSize = 10;
    const cellSize = 100 / gridSize;
    const buildingsPerCell = Math.ceil(config.density * 4);
    const roofStyles: RoofStyle[] = ['flat', 'slope', 'spire', 'dome'];
    const buildingColors = [
      0x5a6978, 0x6b7b8a, 0x4a5568, 0x718096,
      0x8b9aad, 0x5e6b7a, 0x6b7a8f, 0x4e5d6c
    ];

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        for (let i = 0; i < buildingsPerCell; i++) {
          if (Math.random() > config.density) continue;

          const cellX = -50 + gx * cellSize + cellSize / 2;
          const cellZ = -50 + gz * cellSize + cellSize / 2;

          const offsetX = (Math.random() - 0.5) * cellSize * config.randomness * 1.5;
          const offsetZ = (Math.random() - 0.5) * cellSize * config.randomness * 1.5;

          const posX = cellX + offsetX;
          const posZ = cellZ + offsetZ;

          const width = 8 + Math.random() * 12;
          const depth = 8 + Math.random() * 12;
          const height = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);
          const rotation = (Math.random() - 0.5) * Math.PI * 0.5 * config.randomness;
          const roofStyle = roofStyles[Math.floor(Math.random() * roofStyles.length)];
          const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];

          const building = this.createBuilding(width, depth, height, roofStyle, color);
          building.position.set(posX, height / 2, posZ);
          building.rotation.y = rotation;

          this.buildingGroup.add(building);
          this.buildingMeshes.push(building);

          this.buildingData.push({
            id: `building_${gx}_${gz}_${i}`,
            position: { x: posX, z: posZ },
            dimensions: { width, depth, height },
            rotation,
            roofStyle,
            color
          });
        }
      }
    }

    eventBus.emit('buildings:updated', this.buildingData);
  }

  private createBuilding(
    width: number,
    depth: number,
    height: number,
    roofStyle: RoofStyle,
    color: number
  ): THREE.Mesh {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    this.addWindows(group, width, height, depth);

    const roof = this.createRoof(width, depth, roofStyle, color);
    roof.position.y = height / 2;
    group.add(roof);

    const merged = this.mergeGroup(group);
    return merged;
  }

  private addWindows(group: THREE.Group, width: number, height: number, depth: number): void {
    const windowSize = 1.2;
    const windowGap = 2.5;
    const windowHeightGap = 3.5;

    const windowColor = 0x1a1a2e;
    const windowEmissive = 0xffd700;

    const windowsFloor = Math.floor(height / windowHeightGap) - 1;
    const windowsWidth = Math.floor(width / windowGap) - 1;
    const windowsDepth = Math.floor(depth / windowGap) - 1;

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: windowColor,
      emissive: windowEmissive,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.9
    });

    this.windowMaterials.push(windowMaterial);

    for (let floor = 0; floor < windowsFloor; floor++) {
      for (let w = 0; w < windowsWidth; w++) {
        const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize * 1.5);
        const frontWindow = new THREE.Mesh(windowGeo, windowMaterial);
        frontWindow.position.set(
          -width / 2 + windowGap + w * windowGap,
          -height / 2 + windowHeightGap + floor * windowHeightGap,
          depth / 2 + 0.01
        );
        group.add(frontWindow);

        const backWindow = new THREE.Mesh(windowGeo, windowMaterial);
        backWindow.position.set(
          -width / 2 + windowGap + w * windowGap,
          -height / 2 + windowHeightGap + floor * windowHeightGap,
          -depth / 2 - 0.01
        );
        backWindow.rotation.y = Math.PI;
        group.add(backWindow);
      }

      for (let d = 0; d < windowsDepth; d++) {
        const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize * 1.5);
        const rightWindow = new THREE.Mesh(windowGeo, windowMaterial);
        rightWindow.position.set(
          width / 2 + 0.01,
          -height / 2 + windowHeightGap + floor * windowHeightGap,
          -depth / 2 + windowGap + d * windowGap
        );
        rightWindow.rotation.y = Math.PI / 2;
        group.add(rightWindow);

        const leftWindow = new THREE.Mesh(windowGeo, windowMaterial);
        leftWindow.position.set(
          -width / 2 - 0.01,
          -height / 2 + windowHeightGap + floor * windowHeightGap,
          -depth / 2 + windowGap + d * windowGap
        );
        leftWindow.rotation.y = -Math.PI / 2;
        group.add(leftWindow);
      }
    }
  }

  private createRoof(
    width: number,
    depth: number,
    style: RoofStyle,
    color: number
  ): THREE.Group {
    const roofGroup = new THREE.Group();
    const roofColor = new THREE.Color(color).multiplyScalar(0.8).getHex();
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.8,
      metalness: 0.1
    });

    switch (style) {
      case 'flat': {
        const flatGeo = new THREE.BoxGeometry(width * 1.05, 1, depth * 1.05);
        const flat = new THREE.Mesh(flatGeo, roofMaterial);
        flat.castShadow = true;
        roofGroup.add(flat);
        break;
      }
      case 'slope': {
        const slopeHeight = Math.min(width, depth) * 0.3;
        const slopeGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.7, slopeHeight, 4);
        const slope = new THREE.Mesh(slopeGeo, roofMaterial);
        slope.position.y = slopeHeight / 2;
        slope.rotation.y = Math.PI / 4;
        slope.castShadow = true;
        roofGroup.add(slope);
        break;
      }
      case 'spire': {
        const spireHeight = Math.min(width, depth) * 0.8;
        const spireGeo = new THREE.ConeGeometry(Math.min(width, depth) * 0.15, spireHeight, 8);
        const spire = new THREE.Mesh(spireGeo, roofMaterial);
        spire.position.y = spireHeight / 2;
        spire.castShadow = true;
        roofGroup.add(spire);
        break;
      }
      case 'dome': {
        const domeRadius = Math.min(width, depth) * 0.4;
        const domeGeo = new THREE.SphereGeometry(domeRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, roofMaterial);
        dome.position.y = domeRadius * 0.8;
        dome.castShadow = true;
        roofGroup.add(dome);
        break;
      }
    }

    return roofGroup;
  }

  private mergeGroup(group: THREE.Group): THREE.Mesh {
    const geometries: THREE.BufferGeometry[] = [];
    let mergedMaterial: THREE.Material | THREE.Material[] = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const materials: THREE.Material[] = [];

    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const clonedGeo = child.geometry.clone();
        clonedGeo.applyMatrix4(child.matrixWorld);

        if (Array.isArray(child.material)) {
          child.material.forEach((m) => materials.push(m));
        } else if (child.material) {
          materials.push(child.material);
        }

        geometries.push(clonedGeo);
      }
    });

    if (materials.length > 0) {
      mergedMaterial = materials.length === 1 ? materials[0] : materials;
    }

    if (geometries.length === 0) {
      const fallback = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mergedMaterial as THREE.Material);
      return fallback;
    }

    const mergedGeometry = this.mergeBufferGeometries(geometries);
    const mergedMesh = new THREE.Mesh(mergedGeometry, mergedMaterial);
    mergedMesh.castShadow = true;
    mergedMesh.receiveShadow = true;
    return mergedMesh;
  }

  private mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geometries.length === 1) return geometries[0];

    let totalVertices = 0;
    let totalIndices = 0;
    let hasIndex = false;
    let hasNormal = false;
    let hasUV = false;

    geometries.forEach((geo) => {
      totalVertices += geo.attributes.position.count;
      if (geo.index) {
        totalIndices += geo.index.count;
        hasIndex = true;
      }
      if (geo.attributes.normal) hasNormal = true;
      if (geo.attributes.uv) hasUV = true;
    });

    const positions = new Float32Array(totalVertices * 3);
    const normals = hasNormal ? new Float32Array(totalVertices * 3) : null;
    const uvs = hasUV ? new Float32Array(totalVertices * 2) : null;
    const indices = hasIndex ? new Uint32Array(totalIndices) : null;

    let vertexOffset = 0;
    let indexOffset = 0;

    geometries.forEach((geo) => {
      const pos = geo.attributes.position.array as Float32Array;
      positions.set(pos, vertexOffset * 3);

      if (normals && geo.attributes.normal) {
        const n = geo.attributes.normal.array as Float32Array;
        normals.set(n, vertexOffset * 3);
      }

      if (uvs && geo.attributes.uv) {
        const u = geo.attributes.uv.array as Float32Array;
        uvs.set(u, vertexOffset * 2);
      }

      if (indices && geo.index) {
        const idx = geo.index.array as Uint32Array;
        for (let i = 0; i < idx.length; i++) {
          indices[indexOffset + i] = idx[i] + vertexOffset;
        }
        indexOffset += idx.length;
      }

      vertexOffset += geo.attributes.position.count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (normals) merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    if (uvs) merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));

    return merged;
  }

  public setWindowLights(intensity: number): void {
    this.windowMaterials.forEach((mat) => {
      mat.emissiveIntensity = intensity * (0.5 + Math.random() * 0.5);
    });
  }

  public getWindowMaterials(): THREE.MeshStandardMaterial[] {
    return this.windowMaterials;
  }

  public clear(): void {
    this.buildingMeshes.forEach((mesh) => {
      this.buildingGroup.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    });
    this.buildingMeshes = [];
    this.buildingData = [];
    this.windowMaterials = [];
  }

  public getBuildingMeshes(): THREE.Mesh[] {
    return this.buildingMeshes;
  }

  public getBuildingData(): BuildingData[] {
    return this.buildingData;
  }
}
