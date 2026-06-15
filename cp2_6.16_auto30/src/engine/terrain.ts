import * as THREE from 'three';
import { ISceneManager } from './scene';

export interface ITerrainManager {
  update(delta: number, scrollSpeed: number): void;
  getCanyonWidth(z: number): number;
  getCanyonHalfWidth(): number;
  getWallPosition(isLeft: boolean, z: number): THREE.Vector3;
  logDebugInfo(): void;
}

export class TerrainManager implements ITerrainManager {
  private scene: ISceneManager;
  private leftWall: THREE.Mesh;
  private rightWall: THREE.Mesh;
  private ground: THREE.Mesh;
  private lavaTexture: THREE.CanvasTexture;
  private lavaCanvas: HTMLCanvasElement;
  private lavaCtx: CanvasRenderingContext2D;
  private time: number = 0;
  
  public readonly canyonHalfWidth: number = 10;
  public readonly canyonHalfWidthSafe: number = 7;
  private readonly segmentLength: number = 500;
  private readonly wallHeight: number = 40;
  private readonly wallThickness: number = 5;
  private noiseOffset: number = 0;
  private lavaOffset: number = 0;
  
  private debugMode: boolean = true;
  private debugTimer: number = 0;

  constructor(sceneManager: ISceneManager) {
    this.scene = sceneManager;
    this.lavaCanvas = document.createElement('canvas');
    this.lavaCanvas.width = 256;
    this.lavaCanvas.height = 256;
    this.lavaCtx = this.lavaCanvas.getContext('2d')!;
    
    this.generateLavaTexture();
    this.createTerrain();
    
    if (this.debugMode) {
      console.log('[TerrainManager] 初始化完成');
      console.log(`  峡谷半宽: ${this.canyonHalfWidth}, 安全半宽: ${this.canyonHalfWidthSafe}`);
      console.log(`  墙高: ${this.wallHeight}, 墙长: ${this.segmentLength}`);
      this.logDebugInfo();
    }
  }

  private perlinNoise(x: number, y: number, seed: number = 0): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  private smoothNoise(x: number, y: number, seed: number = 0): number {
    const corners = (this.perlinNoise(x - 1, y - 1, seed) + this.perlinNoise(x + 1, y - 1, seed) +
                     this.perlinNoise(x - 1, y + 1, seed) + this.perlinNoise(x + 1, y + 1, seed)) / 16;
    const sides = (this.perlinNoise(x - 1, y, seed) + this.perlinNoise(x + 1, y, seed) +
                   this.perlinNoise(x, y - 1, seed) + this.perlinNoise(x, y + 1, seed)) / 8;
    const center = this.perlinNoise(x, y, seed) / 4;
    return corners + sides + center;
  }

  private interpolatedNoise(x: number, y: number, seed: number = 0): number {
    const intX = Math.floor(x);
    const fracX = x - intX;
    const intY = Math.floor(y);
    const fracY = y - intY;

    const v1 = this.smoothNoise(intX, intY, seed);
    const v2 = this.smoothNoise(intX + 1, intY, seed);
    const v3 = this.smoothNoise(intX, intY + 1, seed);
    const v4 = this.smoothNoise(intX + 1, intY + 1, seed);

    const i1 = v1 * (1 - fracX) + v2 * fracX;
    const i2 = v3 * (1 - fracX) + v4 * fracX;

    return i1 * (1 - fracY) + i2 * fracY;
  }

  private fbmNoise(x: number, y: number, octaves: number = 4, seed: number = 0): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.interpolatedNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }

  private generateLavaTexture(): void {
    const ctx = this.lavaCtx;
    const w = this.lavaCanvas.width;
    const h = this.lavaCanvas.height;
    
    const imageData = ctx.createImageData(w, h);
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const noiseVal = this.fbmNoise(x * 0.02, y * 0.02, 3, 42);
        const idx = (y * w + x) * 4;
        
        const t = y / h;
        let r: number, g: number, b: number;
        
        if (noiseVal > 0.5) {
          r = Math.floor(62 + (191 - 62) * (1 - t));
          g = Math.floor(39 + (54 - 39) * (1 - t));
          b = Math.floor(35 + (12 - 35) * (1 - t));
        } else {
          r = Math.floor(62 + (230 - 62) * (1 - t));
          g = Math.floor(39 + (81 - 39) * (1 - t));
          b = Math.floor(35 + (0 - 35) * (1 - t));
        }
        
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  private updateLavaTexture(): void {
    const ctx = this.lavaCtx;
    const w = this.lavaCanvas.width;
    const h = this.lavaCanvas.height;
    
    const imageData = ctx.createImageData(w, h);
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const noiseVal = this.fbmNoise(x * 0.02 + this.lavaOffset, y * 0.02, 3, 42);
        const idx = (y * w + x) * 4;
        
        const t = y / h;
        let r: number, g: number, b: number;
        
        if (noiseVal > 0.5) {
          r = Math.floor(62 + (191 - 62) * (1 - t));
          g = Math.floor(39 + (54 - 39) * (1 - t));
          b = Math.floor(35 + (12 - 35) * (1 - t));
        } else {
          r = Math.floor(62 + (230 - 62) * (1 - t));
          g = Math.floor(39 + (81 - 39) * (1 - t));
          b = Math.floor(35 + (0 - 35) * (1 - t));
        }
        
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    this.lavaTexture.needsUpdate = true;
  }

  private createTerrain(): void {
    this.lavaTexture = new THREE.CanvasTexture(this.lavaCanvas);
    this.lavaTexture.wrapS = THREE.RepeatWrapping;
    this.lavaTexture.wrapT = THREE.RepeatWrapping;
    this.lavaTexture.repeat.set(2, 10);

    const wallMaterial = new THREE.MeshStandardMaterial({
      map: this.lavaTexture,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.15
    });

    const leftWallGeom = this.createWallGeometry(true);
    this.leftWall = new THREE.Mesh(leftWallGeom, wallMaterial);
    this.leftWall.position.set(-this.canyonHalfWidth - this.wallThickness / 2, -5, -this.segmentLength / 2);
    this.leftWall.rotation.y = Math.PI / 2;
    this.leftWall.receiveShadow = true;
    this.scene.addObject(this.leftWall);

    const rightWallGeom = this.createWallGeometry(false);
    this.rightWall = new THREE.Mesh(rightWallGeom, wallMaterial);
    this.rightWall.position.set(this.canyonHalfWidth + this.wallThickness / 2, -5, -this.segmentLength / 2);
    this.rightWall.rotation.y = -Math.PI / 2;
    this.rightWall.receiveShadow = true;
    this.scene.addObject(this.rightWall);

    const groundGeometry = new THREE.PlaneGeometry(this.canyonHalfWidth * 2 + 15, this.segmentLength, 30, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0a00,
      roughness: 0.95,
      metalness: 0.05
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -5;
    this.ground.position.z = -this.segmentLength / 2;
    this.ground.receiveShadow = true;
    this.scene.addObject(this.ground);

    if (this.debugMode) {
      console.log('[TerrainManager] 地形创建完成:');
      console.log(`  左墙位置: (${this.leftWall.position.x.toFixed(1)}, ${this.leftWall.position.y.toFixed(1)}, ${this.leftWall.position.z.toFixed(1)})`);
      console.log(`  右墙位置: (${this.rightWall.position.x.toFixed(1)}, ${this.rightWall.position.y.toFixed(1)}, ${this.rightWall.position.z.toFixed(1)})`);
      console.log(`  地面位置: (${this.ground.position.x.toFixed(1)}, ${this.ground.position.y.toFixed(1)}, ${this.ground.position.z.toFixed(1)})`);
    }
  }

  private createWallGeometry(isLeft: boolean): THREE.BufferGeometry {
    const geometry = new THREE.PlaneGeometry(this.segmentLength, this.wallHeight, 80, 25);
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      
      const noiseVal = this.fbmNoise(x * 0.015, y * 0.08, 4, isLeft ? 1 : 2);
      const displacement = noiseVal * 3;
      
      positions.setZ(i, displacement);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  public update(delta: number, scrollSpeed: number): void {
    this.time += delta;
    this.lavaOffset += delta * 0.5;
    this.noiseOffset += scrollSpeed * delta * 0.02;

    if (this.time > 0.08) {
      this.updateLavaTexture();
      this.time = 0;
    }

    if (this.debugMode) {
      this.debugTimer += delta;
      if (this.debugTimer > 5) {
        this.debugTimer = 0;
        this.logDebugInfo();
      }
    }

    this.lavaTexture.offset.y -= scrollSpeed * delta * 0.015;
    
    const leftPosAttr = this.leftWall.geometry.attributes.position;
    const rightPosAttr = this.rightWall.geometry.attributes.position;

    for (let i = 0; i < leftPosAttr.count; i++) {
      const x = leftPosAttr.getX(i);
      const y = leftPosAttr.getY(i);
      
      const noiseVal = this.fbmNoise(x * 0.015 + this.noiseOffset, y * 0.08, 4, 1);
      const displacement = noiseVal * 3;
      leftPosAttr.setZ(i, displacement);
    }
    leftPosAttr.needsUpdate = true;
    this.leftWall.geometry.computeVertexNormals();

    for (let i = 0; i < rightPosAttr.count; i++) {
      const x = rightPosAttr.getX(i);
      const y = rightPosAttr.getY(i);
      
      const noiseVal = this.fbmNoise(x * 0.015 + this.noiseOffset, y * 0.08, 4, 2);
      const displacement = noiseVal * 3;
      rightPosAttr.setZ(i, displacement);
    }
    rightPosAttr.needsUpdate = true;
    this.rightWall.geometry.computeVertexNormals();
    
    const groundPosAttr = this.ground.geometry.attributes.position;
    for (let i = 0; i < groundPosAttr.count; i++) {
      const x = groundPosAttr.getX(i);
      const y = groundPosAttr.getY(i);
      const noiseVal = this.fbmNoise(x * 0.05 + this.noiseOffset, y * 0.02, 3, 5);
      groundPosAttr.setZ(i, noiseVal * 1.5 - 0.5);
    }
    groundPosAttr.needsUpdate = true;
    this.ground.geometry.computeVertexNormals();
  }

  public getCanyonWidth(z: number): number {
    return this.canyonHalfWidth * 2;
  }

  public getCanyonHalfWidth(): number {
    return this.canyonHalfWidthSafe;
  }

  public getWallPosition(isLeft: boolean, z: number): THREE.Vector3 {
    const baseX = isLeft ? -this.canyonHalfWidth - this.wallThickness / 2 : this.canyonHalfWidth + this.wallThickness / 2;
    return new THREE.Vector3(baseX, -5, z);
  }

  public logDebugInfo(): void {
    const leftBox = new THREE.Box3().setFromObject(this.leftWall);
    const rightBox = new THREE.Box3().setFromObject(this.rightWall);
    
    console.log('[TerrainManager] 调试信息:');
    console.log(`  左墙包围盒: min(${leftBox.min.x.toFixed(1)}, ${leftBox.min.y.toFixed(1)}, ${leftBox.min.z.toFixed(1)}) -> max(${leftBox.max.x.toFixed(1)}, ${leftBox.max.y.toFixed(1)}, ${leftBox.max.z.toFixed(1)})`);
    console.log(`  右墙包围盒: min(${rightBox.min.x.toFixed(1)}, ${rightBox.min.y.toFixed(1)}, ${rightBox.min.z.toFixed(1)}) -> max(${rightBox.max.x.toFixed(1)}, ${rightBox.max.y.toFixed(1)}, ${rightBox.max.z.toFixed(1)})`);
    console.log(`  峡谷内部范围: X从-${this.canyonHalfWidthSafe}到${this.canyonHalfWidthSafe}`);
  }
}
