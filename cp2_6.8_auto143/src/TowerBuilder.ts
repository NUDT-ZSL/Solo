import * as THREE from 'three';

export interface FloorParams {
  height: number;
  widthRatio: number;
  rotation: number;
}

export type TowerStyle = 'classic' | 'spiral';

export interface TowerConfig {
  floorCount: number;
  floors: FloorParams[];
  style: TowerStyle;
}

export class TowerBuilder {
  private group: THREE.Group;
  private config: TowerConfig;
  private floorGroups: THREE.Group[] = [];
  private glassMaterial: THREE.MeshPhysicalMaterial;
  private edgeMaterial: THREE.LineBasicMaterial;
  private pillarMaterial: THREE.MeshStandardMaterial;

  constructor(config: TowerConfig) {
    this.config = JSON.parse(JSON.stringify(config));
    this.group = new THREE.Group();
    this.group.name = 'tower-root';

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x74B9FF,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.5,
      side: THREE.DoubleSide,
    });

    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 0.5,
    });

    this.pillarMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfe6e9,
      roughness: 0.5,
      metalness: 0.3,
    });

    this.build();
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getFloorGroups(): THREE.Group[] {
    return this.floorGroups;
  }

  private clearTower(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Group) {
        while (child.children.length > 0) {
          const c = child.children[0];
          child.remove(c);
          if (c instanceof THREE.Mesh) {
            c.geometry.dispose();
          }
        }
      }
    }
    this.floorGroups = [];
  }

  private lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    return new THREE.Color().lerpColors(color1, color2, t);
  }

  private getFloorColor(index: number, total: number): THREE.Color {
    const bottomColor = new THREE.Color(0xFF6B6B);
    const topColor = new THREE.Color(0xFFD93D);
    const t = total <= 1 ? 0 : index / (total - 1);
    return this.lerpColor(bottomColor, topColor, t);
  }

  private createFloorMesh(
    width: number,
    height: number,
    floorIndex: number,
    totalFloors: number
  ): THREE.Group {
    const floorGroup = new THREE.Group();
    floorGroup.name = `floor-${floorIndex}`;

    const halfW = width / 2;

    const wallGeo = new THREE.BoxGeometry(width, height, width);
    const glass = new THREE.Mesh(wallGeo, this.glassMaterial);
    glass.position.y = height / 2;
    floorGroup.add(glass);

    const edges = new THREE.EdgesGeometry(wallGeo);
    const line = new THREE.LineSegments(edges, this.edgeMaterial);
    line.position.y = height / 2;
    floorGroup.add(line);

    const floorColor = this.getFloorColor(floorIndex, totalFloors);
    const floorGeo = new THREE.BoxGeometry(width, 0.1, width);
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.4,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = 0;
    floorGroup.add(floorMesh);

    if (this.config.style === 'classic') {
      const pillarW = 2;
      const pillarH = 1;
      const pillarGeo = new THREE.BoxGeometry(pillarW, pillarH, pillarW);
      const positions = [
        [-halfW + pillarW / 2, height, -halfW + pillarW / 2],
        [halfW - pillarW / 2, height, -halfW + pillarW / 2],
        [-halfW + pillarW / 2, height, halfW - pillarW / 2],
        [halfW - pillarW / 2, height, halfW - pillarW / 2],
      ];
      positions.forEach(([x, y, z]) => {
        const pillar = new THREE.Mesh(pillarGeo, this.pillarMaterial);
        pillar.position.set(x, y + pillarH / 2, z);
        floorGroup.add(pillar);

        const pillarEdges = new THREE.EdgesGeometry(pillarGeo);
        const pillarLine = new THREE.LineSegments(pillarEdges, this.edgeMaterial);
        pillarLine.position.copy(pillar.position);
        floorGroup.add(pillarLine);
      });
    }

    return floorGroup;
  }

  rebuild(config: TowerConfig): void {
    this.config = JSON.parse(JSON.stringify(config));
    this.build();
  }

  build(): void {
    this.clearTower();

    const { floors, style } = this.config;
    const totalFloors = floors.length;
    const baseWidth = 10;
    let accumulatedY = 0;
    const spiralAngleStep = (Math.PI * 2) / totalFloors;
    const spiralRadiusStep = 0.8;

    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      let width = baseWidth * floor.widthRatio;
      let offsetX = 0;
      let offsetZ = 0;
      let baseRotation = 0;

      if (style === 'spiral') {
        const shrink = 1 - (i * 0.15);
        width = baseWidth * floor.widthRatio * Math.max(0.4, shrink);
        const radius = i * spiralRadiusStep;
        const angle = i * spiralAngleStep;
        offsetX = Math.cos(angle) * radius;
        offsetZ = Math.sin(angle) * radius;
        baseRotation = i * (Math.PI / 6);
      }

      const floorGroup = this.createFloorMesh(width, floor.height, i, totalFloors);
      floorGroup.position.set(offsetX, accumulatedY, offsetZ);
      floorGroup.rotation.y = baseRotation + THREE.MathUtils.degToRad(floor.rotation);

      floorGroup.userData = {
        baseScale: 1,
        baseY: accumulatedY,
        originalHeight: floor.height,
      };

      this.floorGroups.push(floorGroup);
      this.group.add(floorGroup);

      accumulatedY += floor.height;
    }
  }

  playGrowAnimation(onComplete?: () => void): void {
    const durationPerFloor = 0.4;
    const totalDuration = durationPerFloor * this.floorGroups.length;

    this.floorGroups.forEach((floorGroup, index) => {
      const data = floorGroup.userData;
      const startTime = index * durationPerFloor;
      const startScale = 0.01;
      const targetScale = 1;

      const startPosY = 0;
      const targetPosY = data.baseY;

      const animate = (t: number) => {
        const localT = (t - startTime) / durationPerFloor;
        if (localT < 0) return;

        const eased = Math.min(1, localT);
        const smooth = 1 - Math.pow(1 - eased, 3);

        floorGroup.scale.setScalar(startScale + (targetScale - startScale) * smooth);
        floorGroup.position.y = startPosY + (targetPosY - startPosY) * smooth;
      };

      (floorGroup as any)._growUpdate = animate;
    });

    const startTime = performance.now() / 1000;
    const tick = () => {
      const now = performance.now() / 1000;
      const elapsed = now - startTime;

      this.floorGroups.forEach((fg) => {
        if ((fg as any)._growUpdate) {
          (fg as any)._growUpdate(elapsed);
        }
      });

      if (elapsed < totalDuration) {
        requestAnimationFrame(tick);
      } else {
        this.floorGroups.forEach((fg) => {
          fg.scale.setScalar(1);
          fg.position.y = (fg.userData as any).baseY;
          delete (fg as any)._growUpdate;
        });
        if (onComplete) onComplete();
      }
    };
    tick();
  }

  getTotalHeight(): number {
    return this.config.floors.reduce((sum, f) => sum + f.height, 0);
  }
}
