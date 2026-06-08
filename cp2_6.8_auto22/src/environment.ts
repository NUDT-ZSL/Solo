import * as THREE from 'three';

export type FloorMaterialType = 'tile' | 'wood' | 'carpet';

export const WALL_COLOR_PRESETS = [
  0xF5F5F5,
  0xE8DED0,
  0xD4C5B5,
  0x8FA6A0,
  0x7B8FA6,
  0xA69889
];

export class EnvironmentManager {
  private scene: THREE.Scene;
  private walls: THREE.Mesh[] = [];
  private floor: THREE.Mesh;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private currentWallColor: THREE.Color;
  private targetWallColor: THREE.Color;
  private colorTransitionProgress: number = 1;
  private colorTransitionDuration: number = 0.5;
  private isTransitioning: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentWallColor = new THREE.Color(WALL_COLOR_PRESETS[0]);
    this.targetWallColor = new THREE.Color(WALL_COLOR_PRESETS[0]);

    this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    this.directionalLight.position.set(3, 5, 3);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 15;
    this.directionalLight.shadow.camera.left = -3;
    this.directionalLight.shadow.camera.right = 3;
    this.directionalLight.shadow.camera.top = 3;
    this.directionalLight.shadow.camera.bottom = -3;
    this.scene.add(this.directionalLight);

    this.createRoom();
    this.floor = this.createFloor('tile');
  }

  private createRoom(): void {
    const roomSize = 4;
    const wallHeight = 2.5;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: this.currentWallColor,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const backWallGeo = new THREE.PlaneGeometry(roomSize, wallHeight);
    const backWall = new THREE.Mesh(backWallGeo, wallMaterial.clone());
    backWall.position.set(0, wallHeight / 2, -roomSize / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    this.walls.push(backWall);

    const leftWallGeo = new THREE.PlaneGeometry(roomSize, wallHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMaterial.clone());
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-roomSize / 2, wallHeight / 2, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);
    this.walls.push(leftWall);

    const rightWallGeo = new THREE.PlaneGeometry(roomSize, wallHeight);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMaterial.clone());
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(roomSize / 2, wallHeight / 2, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);
    this.walls.push(rightWall);

    const gridHelper = new THREE.GridHelper(roomSize, 16, 0xCCCCCC, 0xDDDDDD);
    gridHelper.position.y = 0.001;
    this.scene.add(gridHelper);
  }

  private createTileTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#D0D0D0';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      const pos = (i / 4) * 256;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(256, pos);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  private createWoodTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#C4A77D';
    ctx.fillRect(0, 0, 512, 512);

    const plankCount = 4;
    for (let i = 0; i < plankCount; i++) {
      const y = (i / plankCount) * 512;
      const shade = i % 2 === 0 ? '#B8956A' : '#CDB38B';
      ctx.fillStyle = shade;
      ctx.fillRect(0, y, 512, 512 / plankCount - 2);
      
      for (let j = 0; j < 20; j++) {
        const gx = Math.random() * 512;
        const gy = y + Math.random() * (512 / plankCount - 2);
        const gSize = 2 + Math.random() * 4;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(139, 115, 85, 0.3)' : 'rgba(180, 150, 100, 0.3)';
        ctx.beginPath();
        ctx.ellipse(gx, gy, gSize * 2, gSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;
    for (let i = 1; i < plankCount; i++) {
      const y = (i / plankCount) * 512 - 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  private createCarpetTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#A89F91';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const alpha = Math.random() * 0.3;
      const shade = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    ctx.strokeStyle = 'rgba(150, 140, 120, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.lineTo(Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    return texture;
  }

  private createFloor(materialType: FloorMaterialType): THREE.Mesh {
    if (this.floor) {
      this.scene.remove(this.floor);
      this.floor.geometry.dispose();
      if (this.floor.material instanceof THREE.Material) {
        if ((this.floor.material as THREE.MeshStandardMaterial).map) {
          (this.floor.material as THREE.MeshStandardMaterial).map!.dispose();
        }
        this.floor.material.dispose();
      }
    }

    const roomSize = 4;
    const floorGeo = new THREE.PlaneGeometry(roomSize, roomSize);
    
    let texture: THREE.Texture;
    let materialColor: number;
    let roughness: number;

    switch (materialType) {
      case 'tile':
        texture = this.createTileTexture();
        materialColor = 0xFFFFFF;
        roughness = 0.3;
        break;
      case 'wood':
        texture = this.createWoodTexture();
        materialColor = 0xFFFFFF;
        roughness = 0.6;
        break;
      case 'carpet':
        texture = this.createCarpetTexture();
        materialColor = 0xFFFFFF;
        roughness = 0.95;
        break;
      default:
        texture = this.createTileTexture();
        materialColor = 0xFFFFFF;
        roughness = 0.5;
    }

    const floorMat = new THREE.MeshStandardMaterial({
      color: materialColor,
      map: texture,
      roughness: roughness,
      metalness: 0.0
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    return floor;
  }

  setWallColor(colorHex: number): void {
    this.targetWallColor = new THREE.Color(colorHex);
    this.colorTransitionProgress = 0;
    this.isTransitioning = true;
  }

  setFloorMaterial(type: FloorMaterialType): void {
    const oldPosition = this.floor ? this.floor.position.clone() : new THREE.Vector3(0, 0, 0);
    this.floor = this.createFloor(type);
    this.floor.position.copy(oldPosition);
  }

  setLightIntensity(intensity: number): void {
    const clamped = Math.max(0.5, Math.min(2.0, intensity));
    this.ambientLight.intensity = 0.3 + clamped * 0.2;
    this.directionalLight.intensity = 0.5 + clamped * 0.5;
  }

  update(deltaTime: number): void {
    if (this.isTransitioning && this.colorTransitionProgress < 1) {
      this.colorTransitionProgress += deltaTime / this.colorTransitionDuration;
      
      if (this.colorTransitionProgress >= 1) {
        this.colorTransitionProgress = 1;
        this.isTransitioning = false;
        this.currentWallColor.copy(this.targetWallColor);
      }

      const t = this.colorTransitionProgress;
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const interpolatedColor = this.currentWallColor.clone().lerp(this.targetWallColor, eased);

      this.walls.forEach(wall => {
        const mat = wall.material as THREE.MeshStandardMaterial;
        mat.color.copy(interpolatedColor);
      });
    }
  }

  getFloorMesh(): THREE.Mesh {
    return this.floor;
  }
}
