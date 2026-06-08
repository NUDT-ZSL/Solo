import * as THREE from 'three';

export type FurnitureType = 'table' | 'chair' | 'sofa' | 'bed' | 'bookshelf' | 'lamp';

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  name: string;
  group: THREE.Group;
  highlight: THREE.LineSegments | null;
  shadow: THREE.Mesh;
  targetPosition: THREE.Vector3;
  targetRotation: number;
}

const FURNITURE_NAMES: Record<FurnitureType, string> = {
  table: '桌子',
  chair: '椅子',
  sofa: '沙发',
  bed: '床',
  bookshelf: '书柜',
  lamp: '灯具'
};

const GRID_SIZE = 0.25;
const ROOM_HALF = 1.9;

export class FurnitureManager {
  private scene: THREE.Scene;
  private items: FurnitureItem[] = [];
  private selectedItem: FurnitureItem | null = null;
  private hoveredItem: FurnitureItem | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private createId(): string {
    return 'furn_' + Math.random().toString(36).substr(2, 9);
  }

  private createTableGeometry(): THREE.Group {
    const group = new THREE.Group();
    
    const topGeo = new THREE.BoxGeometry(1.0, 0.05, 0.6);
    const topMat = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355, 
      roughness: 0.6,
      metalness: 0.1
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legGeo = new THREE.BoxGeometry(0.05, 0.75, 0.05);
    const legMat = new THREE.MeshStandardMaterial({ 
      color: 0x6B5344,
      roughness: 0.6,
      metalness: 0.1
    });
    const legPositions = [
      [-0.45, 0.375, -0.25],
      [0.45, 0.375, -0.25],
      [-0.45, 0.375, 0.25],
      [0.45, 0.375, 0.25]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  private createChairGeometry(): THREE.Group {
    const group = new THREE.Group();

    const seatGeo = new THREE.BoxGeometry(0.4, 0.04, 0.4);
    const woodMat = new THREE.MeshStandardMaterial({ 
      color: 0xA0826D,
      roughness: 0.5,
      metalness: 0.1
    });
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    const backGeo = new THREE.BoxGeometry(0.4, 0.5, 0.03);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(0, 0.72, -0.185);
    back.castShadow = true;
    group.add(back);

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
    const legMat = new THREE.MeshStandardMaterial({ 
      color: 0x555555,
      roughness: 0.3,
      metalness: 0.6
    });
    const legPositions = [
      [-0.16, 0.225, -0.16],
      [0.16, 0.225, -0.16],
      [-0.16, 0.225, 0.16],
      [0.16, 0.225, 0.16]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  private createSofaGeometry(): THREE.Group {
    const group = new THREE.Group();

    const baseGeo = new THREE.BoxGeometry(1.8, 0.3, 0.7);
    const fabricMat = new THREE.MeshStandardMaterial({ 
      color: 0x7B8FA6,
      roughness: 0.9,
      metalness: 0.0
    });
    const base = new THREE.Mesh(baseGeo, fabricMat);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const cushionGeo = new THREE.BoxGeometry(1.7, 0.15, 0.6);
    const cushionMat = new THREE.MeshStandardMaterial({ 
      color: 0x8FA6B8,
      roughness: 0.9,
      metalness: 0.0
    });
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.y = 0.42;
    cushion.castShadow = true;
    group.add(cushion);

    const backGeo = new THREE.BoxGeometry(1.8, 0.5, 0.1);
    const back = new THREE.Mesh(backGeo, fabricMat);
    back.position.set(0, 0.6, -0.3);
    back.castShadow = true;
    group.add(back);

    const armGeo = new THREE.BoxGeometry(0.1, 0.4, 0.7);
    const leftArm = new THREE.Mesh(armGeo, fabricMat);
    leftArm.position.set(-0.85, 0.4, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, fabricMat);
    rightArm.position.set(0.85, 0.4, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    const legGeo = new THREE.BoxGeometry(0.06, 0.1, 0.06);
    const legMat = new THREE.MeshStandardMaterial({ 
      color: 0x3E3E3E,
      roughness: 0.4,
      metalness: 0.3
    });
    const legPositions = [
      [-0.85, 0.05, -0.3],
      [0.85, 0.05, -0.3],
      [-0.85, 0.05, 0.3],
      [0.85, 0.05, 0.3]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  private createBedGeometry(): THREE.Group {
    const group = new THREE.Group();

    const frameGeo = new THREE.BoxGeometry(1.5, 0.2, 2.0);
    const frameMat = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355,
      roughness: 0.6,
      metalness: 0.1
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 0.2;
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);

    const mattressGeo = new THREE.BoxGeometry(1.4, 0.15, 1.9);
    const mattressMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      roughness: 0.8,
      metalness: 0.0
    });
    const mattress = new THREE.Mesh(mattressGeo, mattressMat);
    mattress.position.y = 0.375;
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    group.add(mattress);

    const pillowGeo = new THREE.BoxGeometry(0.5, 0.1, 0.35);
    const pillowMat = new THREE.MeshStandardMaterial({ 
      color: 0xE8E0D5,
      roughness: 0.9,
      metalness: 0.0
    });
    const pillow1 = new THREE.Mesh(pillowGeo, pillowMat);
    pillow1.position.set(-0.3, 0.5, -0.7);
    pillow1.castShadow = true;
    group.add(pillow1);

    const pillow2 = new THREE.Mesh(pillowGeo, pillowMat);
    pillow2.position.set(0.3, 0.5, -0.7);
    pillow2.castShadow = true;
    group.add(pillow2);

    const headboardGeo = new THREE.BoxGeometry(1.5, 0.6, 0.08);
    const headboard = new THREE.Mesh(headboardGeo, frameMat);
    headboard.position.set(0, 0.6, -0.96);
    headboard.castShadow = true;
    group.add(headboard);

    return group;
  }

  private createBookshelfGeometry(): THREE.Group {
    const group = new THREE.Group();

    const sideGeo = new THREE.BoxGeometry(0.04, 1.4, 0.35);
    const woodMat = new THREE.MeshStandardMaterial({ 
      color: 0xA69889,
      roughness: 0.5,
      metalness: 0.1
    });
    const leftSide = new THREE.Mesh(sideGeo, woodMat);
    leftSide.position.set(-0.4, 0.7, 0);
    leftSide.castShadow = true;
    group.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo, woodMat);
    rightSide.position.set(0.4, 0.7, 0);
    rightSide.castShadow = true;
    group.add(rightSide);

    const backGeo = new THREE.BoxGeometry(0.76, 1.4, 0.02);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(0, 0.7, -0.165);
    group.add(back);

    const shelfGeo = new THREE.BoxGeometry(0.76, 0.03, 0.33);
    const shelfPositions = [0.015, 0.3, 0.6, 0.9, 1.2];
    shelfPositions.forEach(y => {
      const shelf = new THREE.Mesh(shelfGeo, woodMat);
      shelf.position.set(0, y, 0);
      shelf.castShadow = true;
      group.add(shelf);
    });

    const bookGeo = new THREE.BoxGeometry(0.06, 0.22, 0.18);
    const bookColors = [0x8B6914, 0x6B4423, 0x3E5C76, 0x5C6B54, 0x8B4513, 0x704214, 0x4A4A4A];
    let bookX = -0.3;
    for (let i = 0; i < 5; i++) {
      const bookMat = new THREE.MeshStandardMaterial({ 
        color: bookColors[i % bookColors.length],
        roughness: 0.7,
        metalness: 0.0
      });
      const book = new THREE.Mesh(bookGeo, bookMat);
      book.position.set(bookX + i * 0.07, 0.15, 0);
      book.castShadow = true;
      group.add(book);
    }
    for (let i = 0; i < 4; i++) {
      const bookMat = new THREE.MeshStandardMaterial({ 
        color: bookColors[(i + 3) % bookColors.length],
        roughness: 0.7,
        metalness: 0.0
      });
      const book = new THREE.Mesh(bookGeo, bookMat);
      book.position.set(bookX + i * 0.08, 0.45, 0);
      book.castShadow = true;
      group.add(book);
    }
    for (let i = 0; i < 3; i++) {
      const bookMat = new THREE.MeshStandardMaterial({ 
        color: bookColors[(i + 5) % bookColors.length],
        roughness: 0.7,
        metalness: 0.0
      });
      const book = new THREE.Mesh(bookGeo, bookMat);
      book.position.set(bookX + 0.1 + i * 0.08, 0.75, 0);
      book.castShadow = true;
      group.add(book);
    }

    return group;
  }

  private createLampGeometry(): THREE.Group {
    const group = new THREE.Group();

    const baseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.03, 16);
    const metalMat = new THREE.MeshStandardMaterial({ 
      color: 0x444444,
      roughness: 0.3,
      metalness: 0.7
    });
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.y = 0.015;
    base.castShadow = true;
    group.add(base);

    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8);
    const pole = new THREE.Mesh(poleGeo, metalMat);
    pole.position.y = 0.53;
    pole.castShadow = true;
    group.add(pole);

    const shadeGeo = new THREE.ConeGeometry(0.18, 0.25, 16, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({ 
      color: 0xF5F0E8,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide,
      emissive: 0xFFF8E7,
      emissiveIntensity: 0.3
    });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.y = 1.15;
    shade.castShadow = true;
    group.add(shade);

    const bulbGeo = new THREE.SphereGeometry(0.05, 12, 12);
    const bulbMat = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      emissive: 0xFFF8E7,
      emissiveIntensity: 1.0
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 1.05;
    group.add(bulb);

    const light = new THREE.PointLight(0xFFF8E7, 0.5, 3, 1);
    light.position.y = 1.05;
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    group.add(light);

    return group;
  }

  private createShadowMesh(): THREE.Mesh {
    const shadowGeo = new THREE.PlaneGeometry(0.8, 0.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    shadow.renderOrder = 1;
    return shadow;
  }

  private createHighlight(color: number, opacity: number): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.2, 1.2, 1.2));
    const lineMat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity
    });
    return new THREE.LineSegments(edges, lineMat);
  }

  createFurniture(type: FurnitureType, position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): FurnitureItem | null {
    let geometry: THREE.Group;
    
    switch (type) {
      case 'table':
        geometry = this.createTableGeometry();
        break;
      case 'chair':
        geometry = this.createChairGeometry();
        break;
      case 'sofa':
        geometry = this.createSofaGeometry();
        break;
      case 'bed':
        geometry = this.createBedGeometry();
        break;
      case 'bookshelf':
        geometry = this.createBookshelfGeometry();
        break;
      case 'lamp':
        geometry = this.createLampGeometry();
        break;
      default:
        return null;
    }

    const snappedX = Math.round(position.x / GRID_SIZE) * GRID_SIZE;
    const snappedZ = Math.round(position.z / GRID_SIZE) * GRID_SIZE;
    const clampedX = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, snappedX));
    const clampedZ = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, snappedZ));
    
    geometry.position.set(clampedX, 0, clampedZ);
    
    const shadow = this.createShadowMesh();
    shadow.position.x = clampedX;
    shadow.position.z = clampedZ;
    this.scene.add(shadow);

    const group = new THREE.Group();
    group.add(geometry);
    group.userData = { furnitureId: this.createId() };
    this.scene.add(group);

    const item: FurnitureItem = {
      id: group.userData.furnitureId,
      type: type,
      name: FURNITURE_NAMES[type],
      group: group,
      highlight: null,
      shadow: shadow,
      targetPosition: new THREE.Vector3(clampedX, 0, clampedZ),
      targetRotation: 0
    };

    this.items.push(item);
    return item;
  }

  getItems(): FurnitureItem[] {
    return this.items;
  }

  getSelectedItem(): FurnitureItem | null {
    return this.selectedItem;
  }

  selectItem(item: FurnitureItem | null): void {
    if (this.selectedItem && this.selectedItem !== item) {
      this.removeHighlight(this.selectedItem);
    }

    this.selectedItem = item;

    if (item) {
      this.addHighlight(item, 0xE8A87C, 1.0);
    }
  }

  setHoveredItem(item: FurnitureItem | null): void {
    if (this.hoveredItem && this.hoveredItem !== item && this.hoveredItem !== this.selectedItem) {
      this.removeHighlight(this.hoveredItem);
    }

    this.hoveredItem = item;

    if (item && item !== this.selectedItem) {
      this.addHighlight(item, 0x7B8FA6, 0.6);
    }
  }

  private addHighlight(item: FurnitureItem, color: number, opacity: number): void {
    if (item.highlight) {
      this.scene.remove(item.highlight);
    }

    const highlight = this.createHighlight(color, opacity);
    
    const bbox = new THREE.Box3().setFromObject(item.group);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bbox.getCenter(center);
    bbox.getSize(size);

    highlight.scale.set(size.x * 1.05, size.y * 1.05, size.z * 1.05);
    highlight.position.copy(center);

    item.group.add(highlight);
    item.highlight = highlight;
  }

  private removeHighlight(item: FurnitureItem): void {
    if (item.highlight) {
      item.group.remove(item.highlight);
      this.scene.remove(item.highlight);
      item.highlight.geometry.dispose();
      (item.highlight.material as THREE.Material).dispose();
      item.highlight = null;
    }
  }

  moveItem(item: FurnitureItem, targetX: number, targetZ: number): void {
    const clampedX = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, targetX));
    const clampedZ = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, targetZ));
    item.targetPosition.set(clampedX, 0, clampedZ);
  }

  rotateItem(item: FurnitureItem, delta: number): number {
    item.targetRotation += delta;
    return item.targetRotation;
  }

  deleteItem(item: FurnitureItem): void {
    this.removeHighlight(item);

    this.scene.remove(item.group);
    this.scene.remove(item.shadow);

    item.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    if (item.shadow.geometry) item.shadow.geometry.dispose();
    if (item.shadow.material) {
      if (Array.isArray(item.shadow.material)) {
        item.shadow.material.forEach(m => m.dispose());
      } else {
        (item.shadow.material as THREE.Material).dispose();
      }
    }

    const idx = this.items.indexOf(item);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }

    if (this.selectedItem === item) {
      this.selectedItem = null;
    }
    if (this.hoveredItem === item) {
      this.hoveredItem = null;
    }
  }

  snapItemToGrid(item: FurnitureItem): void {
    const snappedX = Math.round(item.targetPosition.x / GRID_SIZE) * GRID_SIZE;
    const snappedZ = Math.round(item.targetPosition.z / GRID_SIZE) * GRID_SIZE;
    const clampedX = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, snappedX));
    const clampedZ = Math.max(-ROOM_HALF, Math.min(ROOM_HALF, snappedZ));
    item.targetPosition.set(clampedX, 0, clampedZ);

    const snappedRotation = Math.round(item.targetRotation / (Math.PI / 4)) * (Math.PI / 4);
    item.targetRotation = snappedRotation;
  }

  update(deltaTime: number): void {
    const lerpFactor = 0.15;

    this.items.forEach(item => {
      item.group.position.x += (item.targetPosition.x - item.group.position.x) * lerpFactor;
      item.group.position.z += (item.targetPosition.z - item.group.position.z) * lerpFactor;

      item.group.rotation.y += (item.targetRotation - item.group.rotation.y) * lerpFactor;

      item.shadow.position.x = item.group.position.x;
      item.shadow.position.z = item.group.position.z;
      const distance = Math.sqrt(item.group.position.x * item.group.position.x + item.group.position.z * item.group.position.z);
      const shadowMat = item.shadow.material as THREE.MeshBasicMaterial;
      shadowMat.opacity = 0.25 - distance * 0.015;
    });
  }

  findItemByGroup(group: THREE.Object3D): FurnitureItem | null {
    let current: THREE.Object3D | null = group;
    while (current) {
      const found = this.items.find(item => item.group === current);
      if (found) return found;
      current = current.parent;
    }
    return null;
  }
}
