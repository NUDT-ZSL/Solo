import * as THREE from 'three';

export interface SurfaceInfo {
  id: string;
  name: string;
  mesh: THREE.Mesh;
  originalColor: THREE.Color;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  animating: boolean;
  animationStart: number;
  animationDuration: number;
}

export interface RoomTemplate {
  name: string;
  displayName: string;
  surfaces: { id: string; name: string; color: string; type: string }[];
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    name: 'nordic-living',
    displayName: '北欧风客厅',
    surfaces: [
      { id: 'wall-north', name: '北墙', color: '#ffffff', type: 'wall' },
      { id: 'wall-east', name: '东墙', color: '#ffffff', type: 'wall' },
      { id: 'wall-west', name: '西墙', color: '#ffffff', type: 'wall' },
      { id: 'floor', name: '地板', color: '#d9b68a', type: 'floor' },
      { id: 'ceiling', name: '天花板', color: '#f5f5f5', type: 'ceiling' },
      { id: 'table', name: '桌子', color: '#8b7355', type: 'furniture' },
      { id: 'chair', name: '椅子', color: '#6b8e23', type: 'furniture' },
      { id: 'bookshelf', name: '书架', color: '#a0522d', type: 'furniture' },
      { id: 'lamp', name: '吊灯', color: '#2c2c2c', type: 'furniture' },
      { id: 'plant-pot', name: '花盆', color: '#cd853f', type: 'decoration' }
    ]
  },
  {
    name: 'japanese-bedroom',
    displayName: '日式榻榻米卧室',
    surfaces: [
      { id: 'wall-north', name: '北墙', color: '#ffffff', type: 'wall' },
      { id: 'wall-east', name: '东墙', color: '#ffffff', type: 'wall' },
      { id: 'wall-west', name: '西墙', color: '#ffffff', type: 'wall' },
      { id: 'floor', name: '榻榻米', color: '#c4a35a', type: 'floor' },
      { id: 'ceiling', name: '天花板', color: '#faf0e6', type: 'ceiling' },
      { id: 'table', name: '矮桌', color: '#8b4513', type: 'furniture' },
      { id: 'chair', name: '坐垫', color: '#dc143c', type: 'furniture' },
      { id: 'bookshelf', name: '书架', color: '#deb887', type: 'furniture' },
      { id: 'lamp', name: '落地灯', color: '#f5deb3', type: 'furniture' },
      { id: 'plant-pot', name: '盆栽', color: '#228b22', type: 'decoration' }
    ]
  },
  {
    name: 'industrial-studio',
    displayName: '工业风工作室',
    surfaces: [
      { id: 'wall-north', name: '北墙', color: '#ffffff', type: 'wall' },
      { id: 'wall-east', name: '东墙', color: '#ffffff', type: 'wall' },
      { id: 'wall-west', name: '西墙', color: '#ffffff', type: 'wall' },
      { id: 'floor', name: '水泥地', color: '#808080', type: 'floor' },
      { id: 'ceiling', name: '天花板', color: '#3c3c3c', type: 'ceiling' },
      { id: 'table', name: '工作台', color: '#4a4a4a', type: 'furniture' },
      { id: 'chair', name: '办公椅', color: '#1a1a1a', type: 'furniture' },
      { id: 'bookshelf', name: '铁架', color: '#696969', type: 'furniture' },
      { id: 'lamp', name: '工业灯', color: '#2f2f2f', type: 'furniture' },
      { id: 'plant-pot', name: '绿植', color: '#2e8b57', type: 'decoration' }
    ]
  }
];

export class RoomManager {
  private scene: THREE.Scene;
  private surfaces: Map<string, SurfaceInfo> = new Map();
  private highlightMesh: THREE.Mesh | null = null;
  private selectedSurfaceId: string | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private windowLight: THREE.PointLight | null = null;
  private currentRoomName: string = '';
  private roomGroup: THREE.Group = new THREE.Group();
  private onSurfaceClicked: (surfaceId: string | null) => void;

  constructor(scene: THREE.Scene, onSurfaceClicked: (surfaceId: string | null) => void) {
    this.scene = scene;
    this.onSurfaceClicked = onSurfaceClicked;
    this.scene.add(this.roomGroup);
    this.setupLights();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this.directionalLight);

    this.windowLight = new THREE.PointLight(0xffeedd, 1, 20);
    this.windowLight.position.set(-4, 3, 0);
    this.scene.add(this.windowLight);
  }

  public setupRoom(roomName: string): void {
    this.clearRoom();
    this.currentRoomName = roomName;

    const template = ROOM_TEMPLATES.find(t => t.name === roomName);
    if (!template) return;

    this.createRoomGeometry(roomName, template);
  }

  private clearRoom(): void {
    while (this.roomGroup.children.length > 0) {
      const child = this.roomGroup.children[0];
      this.roomGroup.remove(child);
    }
    this.surfaces.clear();
    this.selectedSurfaceId = null;
    this.highlightMesh = null;
  }

  private createRoomGeometry(roomName: string, template: RoomTemplate): void {
    const roomWidth = 10;
    const roomDepth = 8;
    const roomHeight = 4;

    const wallThickness = 0.2;
    const floorY = 0;

    const wallNorthGeo = new THREE.BoxGeometry(roomWidth, roomHeight, wallThickness);
    const wallNorthMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1
    });
    const wallNorth = new THREE.Mesh(wallNorthGeo, wallNorthMat);
    wallNorth.position.set(0, roomHeight / 2, -roomDepth / 2);
    wallNorth.receiveShadow = true;
    this.roomGroup.add(wallNorth);
    this.registerSurface('wall-north', '北墙', wallNorth, '#ffffff');

    const wallEastGeo = new THREE.BoxGeometry(wallThickness, roomHeight, roomDepth);
    const wallEastMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1
    });
    const wallEast = new THREE.Mesh(wallEastGeo, wallEastMat);
    wallEast.position.set(roomWidth / 2, roomHeight / 2, 0);
    wallEast.receiveShadow = true;
    this.roomGroup.add(wallEast);
    this.registerSurface('wall-east', '东墙', wallEast, '#ffffff');

    const wallWestGeo = new THREE.BoxGeometry(wallThickness, roomHeight, roomDepth);
    const wallWestMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1
    });
    const wallWest = new THREE.Mesh(wallWestGeo, wallWestMat);
    wallWest.position.set(-roomWidth / 2, roomHeight / 2, 0);
    wallWest.receiveShadow = true;
    this.roomGroup.add(wallWest);
    this.registerSurface('wall-west', '西墙', wallWest, '#ffffff');

    const windowGeo = new THREE.PlaneGeometry(2, 2.5);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      emissive: 0x87ceeb,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6
    });
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    windowMesh.position.set(-roomWidth / 2 + 0.01, roomHeight / 2, 0);
    windowMesh.rotation.y = Math.PI / 2;
    this.roomGroup.add(windowMesh);

    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xd9b68a,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);
    this.registerSurface('floor', '地板', floor, '#d9b68a');

    const ceilingGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      side: THREE.DoubleSide
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roomHeight;
    this.roomGroup.add(ceiling);
    this.registerSurface('ceiling', '天花板', ceiling, '#f5f5f5');

    if (roomName === 'nordic-living') {
      this.createNordicFurniture(roomWidth, roomDepth, roomHeight);
    } else if (roomName === 'japanese-bedroom') {
      this.createJapaneseFurniture(roomWidth, roomDepth, roomHeight);
    } else if (roomName === 'industrial-studio') {
      this.createIndustrialFurniture(roomWidth, roomDepth, roomHeight);
    }
  }

  private createNordicFurniture(width: number, depth: number, height: number): void {
    const tableGeo = new THREE.BoxGeometry(2, 0.1, 1);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.6, -1);
    table.castShadow = true;
    table.receiveShadow = true;
    this.roomGroup.add(table);

    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5);
    const legPositions = [
      [-0.9, 0.25, -0.45],
      [0.9, 0.25, -0.45],
      [-0.9, 0.25, -1.55],
      [0.9, 0.25, -1.55]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      this.roomGroup.add(leg);
    });
    this.registerSurface('table', '桌子', table, '#8b7355');

    const chairGeo = new THREE.BoxGeometry(0.5, 0.05, 0.5);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.6 });
    const chair = new THREE.Mesh(chairGeo, chairMat);
    chair.position.set(1.5, 0.45, -1);
    chair.castShadow = true;
    this.roomGroup.add(chair);

    const chairBackGeo = new THREE.BoxGeometry(0.5, 0.5, 0.05);
    const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
    chairBack.position.set(1.5, 0.7, -0.77);
    chairBack.castShadow = true;
    this.roomGroup.add(chairBack);
    this.registerSurface('chair', '椅子', chair, '#6b8e23');

    const shelfGeo = new THREE.BoxGeometry(1.5, 2.5, 0.3);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.7 });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(3.5, 1.25, -3.5);
    shelf.castShadow = true;
    this.roomGroup.add(shelf);

    for (let i = 0; i < 4; i++) {
      const shelfBoardGeo = new THREE.BoxGeometry(1.4, 0.05, 0.25);
      const shelfBoard = new THREE.Mesh(shelfBoardGeo, shelfMat);
      shelfBoard.position.set(3.5, 0.3 + i * 0.6, -3.5);
      this.roomGroup.add(shelfBoard);
    }
    this.registerSurface('bookshelf', '书架', shelf, '#a0522d');

    const lampCordGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.5);
    const lampCordMat = new THREE.MeshStandardMaterial({ color: 0x2c2c2c });
    const lampCord = new THREE.Mesh(lampCordGeo, lampCordMat);
    lampCord.position.set(0, 3.25, 0);
    this.roomGroup.add(lampCord);

    const lampShadeGeo = new THREE.ConeGeometry(0.5, 0.6, 32, 1, true);
    const lampShadeMat = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      side: THREE.DoubleSide,
      emissive: 0xfff8e7,
      emissiveIntensity: 0.2
    });
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
    lampShade.position.set(0, 2.2, 0);
    lampShade.castShadow = true;
    this.roomGroup.add(lampShade);
    this.registerSurface('lamp', '吊灯', lampShade, '#2c2c2c');

    const bulbLight = new THREE.PointLight(0xfff8e7, 0.8, 8);
    bulbLight.position.set(0, 2.2, 0);
    this.roomGroup.add(bulbLight);

    const potGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 16);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.8 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(-3, 0.25, 3);
    pot.castShadow = true;
    this.roomGroup.add(pot);
    this.registerSurface('plant-pot', '花盆', pot, '#cd853f');

    const leavesGeo = new THREE.SphereGeometry(0.6, 8, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.9 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(-3, 0.9, 3);
    leaves.castShadow = true;
    this.roomGroup.add(leaves);
  }

  private createJapaneseFurniture(width: number, depth: number, height: number): void {
    const tatamiMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a, roughness: 0.9 });
    const floor = this.surfaces.get('floor');
    if (floor) {
      (floor.mesh.material as THREE.MeshStandardMaterial).color.set(0xc4a35a);
      floor.currentColor = new THREE.Color(0xc4a35a);
      floor.originalColor = new THREE.Color(0xc4a35a);
    }

    const tableGeo = new THREE.BoxGeometry(1.5, 0.1, 1);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.3, 0);
    table.castShadow = true;
    this.roomGroup.add(table);

    const jLegGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2);
    [[-0.65, 0.1, -0.4], [0.65, 0.1, -0.4], [-0.65, 0.1, 0.4], [0.65, 0.1, 0.4]].forEach(pos => {
      const leg = new THREE.Mesh(jLegGeo, tableMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      this.roomGroup.add(leg);
    });
    this.registerSurface('table', '矮桌', table, '#8b4513');

    const cushionGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0xdc143c, roughness: 0.8 });
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.set(1.5, 0.05, 0);
    cushion.castShadow = true;
    this.roomGroup.add(cushion);
    this.registerSurface('chair', '坐垫', cushion, '#dc143c');

    const shelfGeo = new THREE.BoxGeometry(1.2, 2, 0.25);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
    const shelf = new THREE.Mesh(shelfGeo, shelfMat);
    shelf.position.set(4, 1, -3.5);
    shelf.castShadow = true;
    this.roomGroup.add(shelf);
    this.registerSurface('bookshelf', '书架', shelf, '#deb887');

    const lampBaseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.1, 16);
    const lampBaseMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const lampBase = new THREE.Mesh(lampBaseGeo, lampBaseMat);
    lampBase.position.set(-3, 0.05, -2);
    this.roomGroup.add(lampBase);

    const lampPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5);
    const lampPole = new THREE.Mesh(lampPoleGeo, lampBaseMat);
    lampPole.position.set(-3, 0.8, -2);
    this.roomGroup.add(lampPole);

    const lampShadeGeo = new THREE.CylinderGeometry(0.2, 0.35, 0.4, 16, 1, true);
    const lampShadeMat = new THREE.MeshStandardMaterial({
      color: 0xf5deb3,
      side: THREE.DoubleSide,
      emissive: 0xfff0d0,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    });
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
    lampShade.position.set(-3, 1.7, -2);
    lampShade.castShadow = true;
    this.roomGroup.add(lampShade);
    this.registerSurface('lamp', '落地灯', lampShade, '#f5deb3');

    const floorLampLight = new THREE.PointLight(0xfff0d0, 0.6, 6);
    floorLampLight.position.set(-3, 1.6, -2);
    this.roomGroup.add(floorLampLight);

    const potGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.4, 16);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(3.5, 0.2, 3);
    pot.castShadow = true;
    this.roomGroup.add(pot);
    this.registerSurface('plant-pot', '盆栽', pot, '#228b22');

    const leavesGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.9 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(3.5, 0.75, 3);
    leaves.castShadow = true;
    this.roomGroup.add(leaves);
  }

  private createIndustrialFurniture(width: number, depth: number, height: number): void {
    const floor = this.surfaces.get('floor');
    if (floor) {
      (floor.mesh.material as THREE.MeshStandardMaterial).color.set(0x808080);
      (floor.mesh.material as THREE.MeshStandardMaterial).roughness = 0.9;
      floor.currentColor = new THREE.Color(0x808080);
      floor.originalColor = new THREE.Color(0x808080);
    }

    const ceiling = this.surfaces.get('ceiling');
    if (ceiling) {
      (ceiling.mesh.material as THREE.MeshStandardMaterial).color.set(0x3c3c3c);
      ceiling.currentColor = new THREE.Color(0x3c3c3c);
      ceiling.originalColor = new THREE.Color(0x3c3c3c);
    }

    const tableGeo = new THREE.BoxGeometry(2.5, 0.1, 1.2);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.6, metalness: 0.3 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, 0.8, -1);
    table.castShadow = true;
    table.receiveShadow = true;
    this.roomGroup.add(table);

    const iLegGeo = new THREE.BoxGeometry(0.08, 0.7, 0.08);
    [[-1.15, 0.35, -0.5], [1.15, 0.35, -0.5], [-1.15, 0.35, -1.5], [1.15, 0.35, -1.5]].forEach(pos => {
      const leg = new THREE.Mesh(iLegGeo, tableMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      this.roomGroup.add(leg);
    });
    this.registerSurface('table', '工作台', table, '#4a4a4a');

    const chairSeatGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.2 });
    const chairSeat = new THREE.Mesh(chairSeatGeo, chairMat);
    chairSeat.position.set(2, 0.55, -1);
    chairSeat.castShadow = true;
    this.roomGroup.add(chairSeat);

    const chairBackGeo = new THREE.BoxGeometry(0.6, 0.6, 0.08);
    const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
    chairBack.position.set(2, 0.85, -0.7);
    chairBack.castShadow = true;
    this.roomGroup.add(chairBack);

    const chairLegGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45);
    [[-0.2, 0.225, -0.2], [0.2, 0.225, -0.2], [-0.2, 0.225, 0.2], [0.2, 0.225, 0.2]].forEach(pos => {
      const leg = new THREE.Mesh(chairLegGeo, chairMat);
      leg.position.set(2 + pos[0], pos[1], -1 + pos[2]);
      leg.castShadow = true;
      this.roomGroup.add(leg);
    });
    this.registerSurface('chair', '办公椅', chairSeat, '#1a1a1a');

    const shelfFrameGeo = new THREE.BoxGeometry(1.5, 2.8, 0.4);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.5, metalness: 0.4 });
    const shelfFrame = new THREE.Mesh(shelfFrameGeo, shelfMat);
    shelfFrame.position.set(4, 1.4, -3.5);
    shelfFrame.castShadow = true;
    this.roomGroup.add(shelfFrame);

    for (let i = 0; i < 5; i++) {
      const shelfBoardGeo = new THREE.BoxGeometry(1.4, 0.03, 0.35);
      const shelfBoard = new THREE.Mesh(shelfBoardGeo, shelfMat);
      shelfBoard.position.set(4, 0.2 + i * 0.55, -3.5);
      this.roomGroup.add(shelfBoard);
    }
    this.registerSurface('bookshelf', '铁架', shelfFrame, '#696969');

    const lampCordGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.8);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, metalness: 0.6 });
    const lampCord = new THREE.Mesh(lampCordGeo, lampMat);
    lampCord.position.set(0, 3.1, 0);
    this.roomGroup.add(lampCord);

    const lampShadeGeo = new THREE.CylinderGeometry(0.1, 0.5, 0.8, 16, 1, true);
    const lampShade = new THREE.Mesh(lampShadeGeo, lampMat);
    lampShade.position.set(0, 2.4, 0);
    lampShade.castShadow = true;
    this.roomGroup.add(lampShade);
    this.registerSurface('lamp', '工业灯', lampShade, '#2f2f2f');

    const bulbLight = new THREE.PointLight(0xfff0e0, 1, 10);
    bulbLight.position.set(0, 2.1, 0);
    this.roomGroup.add(bulbLight);

    const potGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.6, 16);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.8 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(-3.5, 0.3, 2.5);
    pot.castShadow = true;
    this.roomGroup.add(pot);
    this.registerSurface('plant-pot', '绿植', pot, '#2e8b57');

    const leavesGeo = new THREE.SphereGeometry(0.7, 8, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(-3.5, 1, 2.5);
    leaves.castShadow = true;
    this.roomGroup.add(leaves);
  }

  private registerSurface(id: string, name: string, mesh: THREE.Mesh, colorHex: string): void {
    const color = new THREE.Color(colorHex);
    this.surfaces.set(id, {
      id,
      name,
      mesh,
      originalColor: color.clone(),
      currentColor: color.clone(),
      targetColor: color.clone(),
      animating: false,
      animationStart: 0,
      animationDuration: 300
    });
  }

  public setColor(surfaceId: string, colorHex: string): void {
    const surface = this.surfaces.get(surfaceId);
    if (!surface) return;

    surface.targetColor = new THREE.Color(colorHex);
    surface.currentColor = (surface.mesh.material as THREE.MeshStandardMaterial).color.clone();
    surface.animating = true;
    surface.animationStart = performance.now();
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    this.surfaces.forEach(surface => {
      if (surface.animating) {
        const elapsed = now - surface.animationStart;
        const progress = Math.min(elapsed / surface.animationDuration, 1);
        const eased = this.easeInOutCubic(progress);

        const r = surface.currentColor.r + (surface.targetColor.r - surface.currentColor.r) * eased;
        const g = surface.currentColor.g + (surface.targetColor.g - surface.currentColor.g) * eased;
        const b = surface.currentColor.b + (surface.targetColor.b - surface.currentColor.b) * eased;

        (surface.mesh.material as THREE.MeshStandardMaterial).color.setRGB(r, g, b);

        if (progress >= 1) {
          surface.animating = false;
          surface.currentColor = surface.targetColor.clone();
        }
      }
    });
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public updateLighting(timeOfDay: number): void {
    const normalizedTime = (timeOfDay - 8) / 12;

    let warmColor = new THREE.Color(0xffa54f);
    let coolColor = new THREE.Color(0x87ceeb);
    let neutralColor = new THREE.Color(0xfff8e7);

    let sunColor: THREE.Color;
    let sunIntensity: number;
    let ambientIntensity: number;
    let windowEmissive: THREE.Color;
    let windowIntensity: number;

    if (normalizedTime < 0.25) {
      const t = normalizedTime / 0.25;
      sunColor = warmColor.clone().lerp(neutralColor, t);
      sunIntensity = 0.3 + t * 0.5;
      ambientIntensity = 0.2 + t * 0.2;
      windowEmissive = warmColor.clone();
      windowIntensity = 0.5 + t * 0.3;
    } else if (normalizedTime < 0.75) {
      const t = (normalizedTime - 0.25) / 0.5;
      sunColor = neutralColor.clone().lerp(coolColor, t * 0.5);
      sunIntensity = 0.8;
      ambientIntensity = 0.4;
      windowEmissive = coolColor.clone();
      windowIntensity = 0.8;
    } else {
      const t = (normalizedTime - 0.75) / 0.25;
      sunColor = coolColor.clone().lerp(warmColor, t);
      sunIntensity = 0.8 - t * 0.5;
      ambientIntensity = 0.4 - t * 0.2;
      windowEmissive = warmColor.clone();
      windowIntensity = 0.8 - t * 0.5;
    }

    if (this.directionalLight) {
      this.directionalLight.color = sunColor;
      this.directionalLight.intensity = sunIntensity;
    }

    if (this.ambientLight) {
      this.ambientLight.intensity = ambientIntensity;
    }

    if (this.windowLight) {
      this.windowLight.color = windowEmissive;
      this.windowLight.intensity = windowIntensity;
    }
  }

  public selectSurface(surfaceId: string | null): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh = null;
    }

    this.selectedSurfaceId = surfaceId;

    if (surfaceId) {
      const surface = this.surfaces.get(surfaceId);
      if (surface) {
        const highlightGeo = surface.mesh.geometry.clone();
        const highlightMat = new THREE.MeshBasicMaterial({
          color: 0x42a5f5,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          wireframe: false
        });
        this.highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
        this.highlightMesh.position.copy(surface.mesh.position);
        this.highlightMesh.rotation.copy(surface.mesh.rotation);
        this.highlightMesh.scale.copy(surface.mesh.scale).multiplyScalar(1.02);
        this.scene.add(this.highlightMesh);

        const edges = new THREE.EdgesGeometry(highlightGeo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x42a5f5, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edges, lineMat);
        wireframe.position.copy(this.highlightMesh.position);
        wireframe.rotation.copy(this.highlightMesh.rotation);
        wireframe.scale.copy(this.highlightMesh.scale);
        this.highlightMesh.add(wireframe);
      }
    }

    this.onSurfaceClicked(surfaceId);
  }

  public getSelectedSurfaceId(): string | null {
    return this.selectedSurfaceId;
  }

  public getSurfaces(): Map<string, SurfaceInfo> {
    return this.surfaces;
  }

  public getSurfaceName(surfaceId: string): string {
    const surface = this.surfaces.get(surfaceId);
    return surface ? surface.name : '';
  }

  public getCurrentRoomName(): string {
    return this.currentRoomName;
  }

  public getRoomGroup(): THREE.Group {
    return this.roomGroup;
  }
}
