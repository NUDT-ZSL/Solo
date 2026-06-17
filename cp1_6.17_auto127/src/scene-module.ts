import * as THREE from 'three';
import { LightParams, LightState } from './lighting-module';

export class SceneModule {
  private scene: THREE.Scene;
  private roomGroup: THREE.Group;
  private furnitureGroup: THREE.Group;
  private materials: THREE.Material[] = [];

  private wallMaterial: THREE.MeshStandardMaterial;
  private floorMaterial: THREE.MeshStandardMaterial;
  private sofaMaterial: THREE.MeshStandardMaterial;
  private glassMaterial: THREE.MeshPhysicalMaterial;
  private metalMaterial: THREE.MeshStandardMaterial;
  private windowMaterial: THREE.MeshPhysicalMaterial;
  private windowFrameMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.roomGroup = new THREE.Group();
    this.furnitureGroup = new THREE.Group();

    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      side: THREE.FrontSide,
      roughness: 0.85,
      metalness: 0.0
    });

    this.windowMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xADD8E6,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.7,
      thickness: 0.2,
      ior: 1.5
    });

    this.windowFrameMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.3
    });

    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xC4A882,
      roughness: 0.7,
      metalness: 0.1
    });

    this.sofaMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.0
    });

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xE0E7FF,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.6,
      thickness: 0.2,
      ior: 1.5
    });

    this.metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xC0C0C0,
      roughness: 0.3,
      metalness: 0.8
    });

    this.materials.push(
      this.wallMaterial,
      this.floorMaterial,
      this.sofaMaterial,
      this.glassMaterial,
      this.metalMaterial
    );

    this.createRoom();
    this.createFurniture();

    this.scene.add(this.roomGroup);
    this.scene.add(this.furnitureGroup);

    this.setupLightListener();
  }

  private createRoom(): void {
    const roomWidth = 10;
    const roomHeight = 3;
    const roomDepth = 8;

    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floor = new THREE.Mesh(floorGeo, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    const ceilingGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const ceiling = new THREE.Mesh(ceilingGeo, this.wallMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roomHeight;
    ceiling.receiveShadow = true;
    this.roomGroup.add(ceiling);

    this.createBackWallWithWindow(roomWidth, roomHeight, roomDepth);

    this.createWindowOnBackWall(roomWidth, roomHeight, roomDepth);

    const leftWallGeo = new THREE.PlaneGeometry(roomDepth, roomHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, this.wallMaterial);
    leftWall.position.x = -roomWidth / 2;
    leftWall.position.y = roomHeight / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    const rightWallGeo = new THREE.PlaneGeometry(roomDepth, roomHeight);
    const rightWall = new THREE.Mesh(rightWallGeo, this.wallMaterial);
    rightWall.position.x = roomWidth / 2;
    rightWall.position.y = roomHeight / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.roomGroup.add(rightWall);

    const frontWallGeo = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const frontWall = new THREE.Mesh(frontWallGeo, this.wallMaterial);
    frontWall.position.z = roomDepth / 2;
    frontWall.position.y = roomHeight / 2;
    frontWall.receiveShadow = true;
    this.roomGroup.add(frontWall);
  }

  private createBackWallWithWindow(roomWidth: number, roomHeight: number, roomDepth: number): void {
    const windowWidth = 3;
    const windowHeight = 2;
    const windowBottom = 0.5;
    const windowTop = windowBottom + windowHeight;
    const z = -roomDepth / 2;

    const topWallGeo = new THREE.PlaneGeometry(roomWidth, roomHeight - windowTop);
    const topWall = new THREE.Mesh(topWallGeo, this.wallMaterial);
    topWall.position.set(0, (windowTop + roomHeight) / 2, z);
    topWall.receiveShadow = true;
    this.roomGroup.add(topWall);

    const bottomWallGeo = new THREE.PlaneGeometry(roomWidth, windowBottom);
    const bottomWall = new THREE.Mesh(bottomWallGeo, this.wallMaterial);
    bottomWall.position.set(0, windowBottom / 2, z);
    bottomWall.receiveShadow = true;
    this.roomGroup.add(bottomWall);

    const sideWallWidth = (roomWidth - windowWidth) / 2;
    const leftWallGeo = new THREE.PlaneGeometry(sideWallWidth, windowHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, this.wallMaterial);
    leftWall.position.set(-roomWidth / 2 + sideWallWidth / 2, windowBottom + windowHeight / 2, z);
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    const rightWallGeo = new THREE.PlaneGeometry(sideWallWidth, windowHeight);
    const rightWall = new THREE.Mesh(rightWallGeo, this.wallMaterial);
    rightWall.position.set(roomWidth / 2 - sideWallWidth / 2, windowBottom + windowHeight / 2, z);
    rightWall.receiveShadow = true;
    this.roomGroup.add(rightWall);
  }

  private createWindowOnBackWall(roomWidth: number, roomHeight: number, roomDepth: number): void {
    const windowWidth = 3;
    const windowHeight = 2;
    const windowBottom = 0.5;
    const frameThickness = 0.08;
    const z = -roomDepth / 2 + 0.01;

    const glassGeo = new THREE.PlaneGeometry(windowWidth - frameThickness, windowHeight - frameThickness);
    const glass = new THREE.Mesh(glassGeo, this.windowMaterial);
    glass.position.set(0, windowBottom + windowHeight / 2, z);
    glass.receiveShadow = true;
    this.roomGroup.add(glass);

    const frameDepth = 0.06;
    const topFrameGeo = new THREE.BoxGeometry(windowWidth, frameThickness, frameDepth);
    const topFrame = new THREE.Mesh(topFrameGeo, this.windowFrameMaterial);
    topFrame.position.set(0, windowBottom + windowHeight - frameThickness / 2, z);
    topFrame.castShadow = true;
    topFrame.receiveShadow = true;
    this.roomGroup.add(topFrame);

    const bottomFrameGeo = new THREE.BoxGeometry(windowWidth, frameThickness, frameDepth);
    const bottomFrame = new THREE.Mesh(bottomFrameGeo, this.windowFrameMaterial);
    bottomFrame.position.set(0, windowBottom + frameThickness / 2, z);
    bottomFrame.castShadow = true;
    bottomFrame.receiveShadow = true;
    this.roomGroup.add(bottomFrame);

    const leftFrameGeo = new THREE.BoxGeometry(frameThickness, windowHeight, frameDepth);
    const leftFrame = new THREE.Mesh(leftFrameGeo, this.windowFrameMaterial);
    leftFrame.position.set(-windowWidth / 2 + frameThickness / 2, windowBottom + windowHeight / 2, z);
    leftFrame.castShadow = true;
    leftFrame.receiveShadow = true;
    this.roomGroup.add(leftFrame);

    const rightFrameGeo = new THREE.BoxGeometry(frameThickness, windowHeight, frameDepth);
    const rightFrame = new THREE.Mesh(rightFrameGeo, this.windowFrameMaterial);
    rightFrame.position.set(windowWidth / 2 - frameThickness / 2, windowBottom + windowHeight / 2, z);
    rightFrame.castShadow = true;
    rightFrame.receiveShadow = true;
    this.roomGroup.add(rightFrame);

    const mullionGeo = new THREE.BoxGeometry(frameThickness * 0.6, windowHeight - frameThickness, frameDepth * 0.8);
    const mullion = new THREE.Mesh(mullionGeo, this.windowFrameMaterial);
    mullion.position.set(0, windowBottom + windowHeight / 2, z);
    mullion.castShadow = true;
    mullion.receiveShadow = true;
    this.roomGroup.add(mullion);
  }

  private createFurniture(): void {
    this.createSofa();
    this.createCoffeeTable();
    this.createLamp();
  }

  private createSofa(): void {
    const sofaGroup = new THREE.Group();
    const width = 2;
    const depth = 1;
    const height = 0.8;
    const radius = 0.1;

    const seatGeo = this.createRoundedBox(width, height * 0.4, depth, radius);
    const seat = new THREE.Mesh(seatGeo, this.sofaMaterial);
    seat.position.y = height * 0.2;
    seat.castShadow = true;
    seat.receiveShadow = true;
    sofaGroup.add(seat);

    const backGeo = this.createRoundedBox(width, height * 0.6, depth * 0.25, radius);
    const back = new THREE.Mesh(backGeo, this.sofaMaterial);
    back.position.set(0, height * 0.5, -depth * 0.375);
    back.castShadow = true;
    back.receiveShadow = true;
    sofaGroup.add(back);

    const armWidth = 0.2;
    const armHeight = height * 0.6;
    const armDepth = depth * 0.8;

    const leftArmGeo = this.createRoundedBox(armWidth, armHeight, armDepth, radius * 0.8);
    const leftArm = new THREE.Mesh(leftArmGeo, this.sofaMaterial);
    leftArm.position.set(-width / 2 + armWidth / 2, armHeight / 2 + 0.05, 0);
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    sofaGroup.add(leftArm);

    const rightArmGeo = this.createRoundedBox(armWidth, armHeight, armDepth, radius * 0.8);
    const rightArm = new THREE.Mesh(rightArmGeo, this.sofaMaterial);
    rightArm.position.set(width / 2 - armWidth / 2, armHeight / 2 + 0.05, 0);
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    sofaGroup.add(rightArm);

    sofaGroup.position.set(0, 0, -2);
    this.furnitureGroup.add(sofaGroup);
  }

  private createCoffeeTable(): void {
    const tableGroup = new THREE.Group();
    const width = 1.2;
    const depth = 0.6;
    const height = 0.5;

    const topGeo = this.createRoundedBox(width, 0.05, depth, 0.03);
    const top = new THREE.Mesh(topGeo, this.glassMaterial);
    top.position.y = height - 0.025;
    top.castShadow = true;
    top.receiveShadow = true;
    tableGroup.add(top);

    const legRadius = 0.03;
    const legHeight = height - 0.05;
    const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 16);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.7,
      roughness: 0.3
    });

    const positions = [
      [-width / 2 + 0.08, -depth / 2 + 0.08],
      [width / 2 - 0.08, -depth / 2 + 0.08],
      [-width / 2 + 0.08, depth / 2 - 0.08],
      [width / 2 - 0.08, depth / 2 - 0.08]
    ];

    positions.forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMaterial);
      leg.position.set(x, legHeight / 2, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      tableGroup.add(leg);
    });

    tableGroup.position.set(0, 0, -0.5);
    this.furnitureGroup.add(tableGroup);
  }

  private createLamp(): void {
    const lampGroup = new THREE.Group();

    const baseRadius = 0.15;
    const baseHeight = 0.05;
    const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32);
    const base = new THREE.Mesh(baseGeo, this.metalMaterial);
    base.position.y = baseHeight / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    lampGroup.add(base);

    const poleRadius = 0.05;
    const poleHeight = 0.5;
    const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 16);
    const pole = new THREE.Mesh(poleGeo, this.metalMaterial);
    pole.position.y = baseHeight + poleHeight / 2;
    pole.castShadow = true;
    pole.receiveShadow = true;
    lampGroup.add(pole);

    const shadeTopRadius = 0.08;
    const shadeBottomRadius = 0.25;
    const shadeHeight = 0.2;
    const shadeGeo = new THREE.ConeGeometry(shadeBottomRadius, shadeHeight, 32, 1, true);
    const shade = new THREE.Mesh(shadeGeo, this.metalMaterial);
    shade.position.y = baseHeight + poleHeight + shadeHeight / 2;
    shade.castShadow = true;
    shade.receiveShadow = true;
    lampGroup.add(shade);

    lampGroup.position.set(3, 0, -2.5);
    this.furnitureGroup.add(lampGroup);
  }

  private createRoundedBox(width: number, height: number, depth: number, radius: number): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    const w = width;
    const h = height;
    const r = radius;

    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: radius * 0.5,
      bevelSize: radius * 0.5,
      bevelSegments: 4
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    return geometry;
  }

  private setupLightListener(): void {
    document.addEventListener('lightChanged', ((e: CustomEvent) => {
      const { state, params }: { state: LightState; params: LightParams } = e.detail;
      this.updateFromLightState(state, params);
    }) as EventListener);
  }

  private updateFromLightState(state: LightState, params: LightParams): void {
    this.materials.forEach(mat => {
      mat.needsUpdate = true;
    });
  }

  update(delta: number): void {
  }
}
