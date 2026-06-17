import * as THREE from 'three';
import EventBus from '../EventBus';

export class Environment {
  private scene: THREE.Scene;
  private eventBus: EventBus;
  private tableMaterial!: THREE.MeshStandardMaterial;
  private glassMaterial!: THREE.MeshPhysicalMaterial;
  private pulseAnimation: { active: boolean; startTime: number; baseColor: THREE.Color } = {
    active: false, startTime: 0, baseColor: new THREE.Color() };

  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.createRoom();
    this.bindEvents();
  }

  private createWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 80; i++) {
      const y = Math.random() * 512;
      const height = 2 + Math.random() * 6;
      const r = Math.floor(180 + Math.random() * 40);
      const g = Math.floor(140 + Math.random() * 40);
      const b = Math.floor(100 + Math.random() * 30);
      const a = 0.3 + Math.random() * 0.4;
      const color = `rgba(${r}, ${g}, ${b}, ${a})`;
      ctx.fillStyle = color;
      ctx.fillRect(0, y, 512, height);
    }
    for (let i = 0; i < 150; i++) {
      const y = Math.random() * 512;
      const width = 50 + Math.random() * 150;
      const x = Math.random() * (512 - width);
      const r = Math.floor(200 + Math.random() * 30);
      const g = Math.floor(160 + Math.random() * 30);
      const b = Math.floor(120 + Math.random() * 20);
      const a = 0.1 + Math.random() * 0.2;
      const color = `rgba(${r}, ${g}, ${b}, ${a})`;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + width * 0.3, y - 5, x + width * 0.7, y + 5, x + width, y);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 1.5);
    return texture;
  }

  private createWallTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#F0EAD6';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const alpha = 0.02 + Math.random() * 0.05;
      const r = Math.floor(200 + Math.random() * 30);
      const g = Math.floor(190 + Math.random() * 30);
      const b = Math.floor(170 + Math.random() * 30);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }
    return new THREE.CanvasTexture(canvas);
  }

  private createRoom(): void {
    const floorGeo = new THREE.PlaneGeometry(6, 3);
    const floorTex = this.createWoodTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0xd2b48c,
      roughness: 0.8,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallTex = this.createWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0xf0ead6,
      roughness: 0.9,
      metalness: 0.0,
    });

    const backWallGeo = new THREE.PlaneGeometry(6, 4);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 2, -1.5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const frontWallLeftGeo = new THREE.PlaneGeometry(2, 4);
    const frontWallLeft = new THREE.Mesh(frontWallLeftGeo, wallMat);
    frontWallLeft.position.set(-2, 2, 1.5);
    frontWallLeft.rotation.y = Math.PI;
    frontWallLeft.receiveShadow = true;
    this.scene.add(frontWallLeft);

    const frontWallRightGeo = new THREE.PlaneGeometry(2, 4);
    const frontWallRight = new THREE.Mesh(frontWallRightGeo, wallMat);
    frontWallRight.position.set(2, 2, 1.5);
    frontWallRight.rotation.y = Math.PI;
    frontWallRight.receiveShadow = true;
    this.scene.add(frontWallRight);

    const frontWallTopGeo = new THREE.PlaneGeometry(2, 1);
    const frontWallTop = new THREE.Mesh(frontWallTopGeo, wallMat);
    frontWallTop.position.set(0, 3.5, 1.5);
    frontWallTop.rotation.y = Math.PI;
    frontWallTop.receiveShadow = true;
    this.scene.add(frontWallTop);

    const frontWallBottomGeo = new THREE.PlaneGeometry(2, 1);
    const frontWallBottom = new THREE.Mesh(frontWallBottomGeo, wallMat);
    frontWallBottom.position.set(0, 0.5, 1.5);
    frontWallBottom.rotation.y = Math.PI;
    frontWallBottom.receiveShadow = true;
    this.scene.add(frontWallBottom);

    const leftWallGeo = new THREE.PlaneGeometry(3, 4);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-3, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWallGeo = new THREE.PlaneGeometry(3, 4);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(3, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      transmission: 0.5,
      roughness: 0.05,
      metalness: 0.0,
      thickness: 0.5,
    });
    const windowGeo = new THREE.PlaneGeometry(2, 2);
    const windowMesh = new THREE.Mesh(windowGeo, this.glassMaterial);
    windowMesh.position.set(0, 2, 1.49);
    windowMesh.rotation.y = Math.PI;
    this.scene.add(windowMesh);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.7,
      metalness: 0.1,
    });
    const frameThickness = 0.05;
    const frameDepth = 0.08;
    const windowFrameTop = new THREE.Mesh(
      new THREE.BoxGeometry(2 + frameThickness * 2, frameThickness, frameDepth)
    );
    windowFrameTop.material = frameMat;
    windowFrameTop.position.set(0, 3 + frameThickness / 2, 1.48);
    this.scene.add(windowFrameTop);
    const windowFrameBottom = windowFrameTop.clone();
    windowFrameBottom.position.set(0, 1 - frameThickness / 2, 1.48);
    this.scene.add(windowFrameBottom);
    const windowFrameLeft = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, 2, frameDepth)
    );
    windowFrameLeft.material = frameMat;
    windowFrameLeft.position.set(-1 - frameThickness / 2, 2, 1.48);
    this.scene.add(windowFrameLeft);
    const windowFrameRight = windowFrameLeft.clone();
    windowFrameRight.position.set(1 + frameThickness / 2, 2, 1.48);
    this.scene.add(windowFrameRight);

    this.tableMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.5,
      metalness: 0.0,
    });
    const tableTopGeo = new THREE.BoxGeometry(2, 0.1, 1);
    const tableTop = new THREE.Mesh(tableTopGeo, this.tableMaterial);
    tableTop.position.set(0, 0.8, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    this.scene.add(tableTop);

    const legGeo = new THREE.BoxGeometry(0.08, 0.7, 0.08);
    const legPositions = [
      [-0.9, 0.35, -0.4],
      [0.9, 0.35, -0.4],
      [-0.9, 0.35, 0.4],
      [0.9, 0.35, 0.4],
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, this.tableMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
    });
  }

  private bindEvents(): void {
    this.eventBus.on('TABLE_COLOR_CHANGE', (data) => {
      this.tableMaterial.color.set(data.color);
      this.triggerPulseAnimation();
    });
    this.eventBus.on('TABLE_ROUGHNESS_CHANGE', (data) => {
      this.tableMaterial.roughness = data.roughness;
      this.triggerPulseAnimation();
    });
    this.eventBus.on('TABLE_METALNESS_CHANGE', (data) => {
      this.tableMaterial.metalness = data.metalness;
      this.triggerPulseAnimation();
    });
    this.eventBus.on('GLASS_TRANSMISSION_CHANGE', (data) => {
      this.glassMaterial.transmission = data.transmission;
      this.glassMaterial.opacity = 0.9 - data.transmission * 0.6;
    });
  }

  private triggerPulseAnimation(): void {
    this.pulseAnimation.active = true;
    this.pulseAnimation.startTime = performance.now();
    this.pulseAnimation.baseColor.copy(this.tableMaterial.color);
  }

  public update(deltaTime: number): void {
    if (this.pulseAnimation.active) {
      const elapsed = (performance.now() - this.pulseAnimation.startTime) / 1000;
      const duration = 0.3;
      if (elapsed >= duration) {
        this.pulseAnimation.active = false;
        this.tableMaterial.emissive.setHex(0x000000);
      } else {
          const progress = elapsed / duration;
          const pulse = Math.sin(progress * Math.PI);
          const pulseColor = this.pulseAnimation.baseColor.clone().lerp(new THREE.Color(0xffffff), pulse * 0.3);
          this.tableMaterial.emissive.copy(pulseColor).multiplyScalar(pulse * 0.3);
        }
      }
    }
  }

export default Environment;