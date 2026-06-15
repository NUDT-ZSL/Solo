import * as THREE from 'three';
import { BuildingConfig, BuildingData } from '@/types';
import { eventBus } from '@/core/EventBus';

type RoofStyle = 'flat' | 'slope' | 'spire' | 'dome';

interface BuildingGroup extends THREE.Group {
  userData: {
    buildingData: BuildingData;
    windowMaterial: THREE.MeshStandardMaterial;
    bodyMaterial: THREE.MeshStandardMaterial;
  };
}

export class BuildingGenerator {
  private scene: THREE.Scene;
  private buildingGroup: THREE.Group;
  private buildings: BuildingGroup[] = [];
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
    const roofStyles: RoofStyle[] = ['flat', 'slope', 'spire', 'dome'];
    const buildingColors = [
      0x5a6978, 0x6b7b8a, 0x4a5568, 0x718096,
      0x8b9aad, 0x5e6b7a, 0x6b7a8f, 0x4e5d6c
    ];

    for (let gx = 0; gx < gridSize; gx++) {
      for (let gz = 0; gz < gridSize; gz++) {
        const buildingsInCell = Math.ceil(config.density * 1.2);
        for (let i = 0; i < buildingsInCell; i++) {
          if (Math.random() > config.density * 1.2) continue;

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
          (building as BuildingGroup).userData = {
            buildingData: {
              id: `building_${gx}_${gz}_${i}`,
              position: { x: posX, z: posZ },
              dimensions: { width, depth, height },
              rotation,
              roofStyle,
              color
            },
            windowMaterial: building.userData.windowMaterial,
            bodyMaterial: building.userData.bodyMaterial
          };

          building.position.set(posX, height / 2, posZ);
          building.rotation.y = rotation;

          this.buildingGroup.add(building);
          this.buildings.push(building as BuildingGroup);

          if (building.userData.windowMaterial) {
            this.windowMaterials.push(building.userData.windowMaterial);
          }
        }
      }
    }

    const buildingDataList = this.buildings.map((b) => b.userData.buildingData);
    eventBus.emit('buildings:updated', buildingDataList);
  }

  private createBuilding(
    width: number,
    depth: number,
    height: number,
    roofStyle: RoofStyle,
    color: number
  ): THREE.Group {
    const group = new THREE.Group();

    const { texture, emissiveTexture, windowMat } = this.createWindowTexture(color);

    const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: emissiveTexture,
      emissive: new THREE.Color(0xffd700),
      emissiveIntensity: 0,
      roughness: 0.7,
      metalness: 0.2
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    group.userData.windowMaterial = windowMat;
    group.userData.bodyMaterial = bodyMaterial;

    this.addRoof(group, width, depth, height, roofStyle, color);

    return group;
  }

  private createWindowTexture(
    color: number
  ): {
    texture: THREE.CanvasTexture;
    emissiveTexture: THREE.CanvasTexture;
    windowMat: THREE.MeshStandardMaterial;
  } {
    const canvasW = 128;
    const canvasH = 512;
    const dayCanvas = document.createElement('canvas');
    const nightCanvas = document.createElement('canvas');
    dayCanvas.width = canvasW;
    dayCanvas.height = canvasH;
    nightCanvas.width = canvasW;
    nightCanvas.height = canvasH;

    const dayCtx = dayCanvas.getContext('2d')!;
    const nightCtx = nightCanvas.getContext('2d')!;

    const c = new THREE.Color(color);
    const r = Math.round(c.r * 255);
    const g = Math.round(c.g * 255);
    const b = Math.round(c.b * 255);

    dayCtx.fillStyle = `rgb(${r},${g},${b})`;
    dayCtx.fillRect(0, 0, canvasW, canvasH);

    nightCtx.fillStyle = '#0a0a14';
    nightCtx.fillRect(0, 0, canvasW, canvasH);

    const cols = 5;
    const rows = Math.floor(canvasH / 28);
    const winW = 12;
    const winH = 16;
    const gapX = (canvasW - cols * winW) / (cols + 1);
    const gapY = (canvasH - rows * winH) / (rows + 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = gapX + col * (winW + gapX);
        const y = gapY + row * (winH + gapY);

        dayCtx.fillStyle = '#1a2030';
        dayCtx.fillRect(x, y, winW, winH);

        if (Math.random() > 0.4) {
          nightCtx.fillStyle = '#ffd700';
          nightCtx.fillRect(x, y, winW, winH);
        } else {
          nightCtx.fillStyle = '#0a0a14';
          nightCtx.fillRect(x, y, winW, winH);
        }
      }
    }

    const texture = new THREE.CanvasTexture(dayCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const emissiveTexture = new THREE.CanvasTexture(nightCanvas);
    emissiveTexture.wrapS = THREE.RepeatWrapping;
    emissiveTexture.wrapT = THREE.RepeatWrapping;

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      emissive: 0xffd700,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.9
    });

    return { texture, emissiveTexture, windowMat };
  }

  private addRoof(
    group: THREE.Group,
    width: number,
    depth: number,
    height: number,
    style: RoofStyle,
    color: number
  ): void {
    const roofColor = new THREE.Color(color).multiplyScalar(0.7);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: roofColor,
      roughness: 0.8,
      metalness: 0.1
    });

    switch (style) {
      case 'flat': {
        const geo = new THREE.BoxGeometry(width * 1.08, 1.5, depth * 1.08);
        const mesh = new THREE.Mesh(geo, roofMaterial);
        mesh.position.y = height / 2 + 0.75;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);

        const edgeGeo = new THREE.BoxGeometry(width * 1.12, 2.5, depth * 1.12);
        const edgeMat = new THREE.MeshStandardMaterial({
          color: roofColor.clone().multiplyScalar(0.9),
          roughness: 0.9,
          metalness: 0.05
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.y = height / 2 + 1.25;
        group.add(edge);
        break;
      }
      case 'slope': {
        const slopeHeight = Math.min(width, depth) * 0.35;
        const baseGeo = new THREE.BoxGeometry(width * 1.02, 1, depth * 1.02);
        const base = new THREE.Mesh(baseGeo, roofMaterial);
        base.position.y = height / 2 + 0.5;
        base.castShadow = true;
        group.add(base);

        const roofGeo = new THREE.BufferGeometry();
        const hw = width / 2;
        const hd = depth / 2;
        const ridgeH = slopeHeight;
        const verts = new Float32Array([
          -hw, 0, -hd,
          hw, 0, -hd,
          0, ridgeH, 0,
          hw, 0, -hd,
          hw, 0, hd,
          0, ridgeH, 0,
          hw, 0, hd,
          -hw, 0, hd,
          0, ridgeH, 0,
          -hw, 0, hd,
          -hw, 0, -hd,
          0, ridgeH, 0
        ]);
        roofGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        roofGeo.computeVertexNormals();
        const slopeMesh = new THREE.Mesh(roofGeo, roofMaterial);
        slopeMesh.position.y = height / 2 + 1;
        slopeMesh.castShadow = true;
        group.add(slopeMesh);
        break;
      }
      case 'spire': {
        const baseGeo = new THREE.BoxGeometry(width * 1.02, 1, depth * 1.02);
        const base = new THREE.Mesh(baseGeo, roofMaterial);
        base.position.y = height / 2 + 0.5;
        base.castShadow = true;
        group.add(base);

        const spireHeight = Math.min(width, depth) * 0.9;
        const spireGeo = new THREE.ConeGeometry(
          Math.min(width, depth) * 0.2,
          spireHeight,
          8
        );
        const spireMat = new THREE.MeshStandardMaterial({
          color: 0x888899,
          roughness: 0.4,
          metalness: 0.6
        });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.y = height / 2 + 1 + spireHeight / 2;
        spire.castShadow = true;
        group.add(spire);
        break;
      }
      case 'dome': {
        const baseGeo = new THREE.BoxGeometry(width * 1.02, 1, depth * 1.02);
        const base = new THREE.Mesh(baseGeo, roofMaterial);
        base.position.y = height / 2 + 0.5;
        base.castShadow = true;
        group.add(base);

        const domeRadius = Math.min(width, depth) * 0.45;
        const domeGeo = new THREE.SphereGeometry(
          domeRadius,
          24,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        const domeMat = new THREE.MeshStandardMaterial({
          color: 0x99aacc,
          roughness: 0.3,
          metalness: 0.5
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = height / 2 + 1;
        dome.castShadow = true;
        group.add(dome);
        break;
      }
    }
  }

  public setWindowLights(intensity: number): void {
    this.buildings.forEach((building) => {
      const bodyMat = building.userData.bodyMaterial as THREE.MeshStandardMaterial;
      if (bodyMat && bodyMat.emissiveIntensity !== undefined) {
        bodyMat.emissiveIntensity = intensity * (0.6 + Math.random() * 0.4);
      }
    });
  }

  public getWindowMaterials(): THREE.MeshStandardMaterial[] {
    return this.windowMaterials;
  }

  public clear(): void {
    this.buildings.forEach((building) => {
      this.buildingGroup.remove(building);
      building.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    });
    this.buildings = [];
    this.windowMaterials = [];
  }

  public getBuildingGroups(): BuildingGroup[] {
    return this.buildings;
  }

  public getBuildingData(): BuildingData[] {
    return this.buildings.map((b) => b.userData.buildingData);
  }
}
