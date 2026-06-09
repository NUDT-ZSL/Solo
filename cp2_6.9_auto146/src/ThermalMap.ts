import * as THREE from 'three';
import { PipeSystem } from './PipeSystem';

export class ThermalMap {
  public group: THREE.Group;
  public floorThermalMesh: THREE.Mesh | null = null;
  public wallThermalMeshes: THREE.Mesh[] = [];
  
  private scene: THREE.Scene;
  private pipeSystem: PipeSystem;
  
  public visible = true;
  
  private furnacePos = new THREE.Vector3(-4.5, 0, -3.5);
  private ATTENUATION = 0.8;
  private FURNACE_RADIUS = 2;
  
  private thermalTextures: Map<string, THREE.DataTexture> = new Map();
  private lastUpdateTime = 0;
  private UPDATE_INTERVAL = 100;
  private cachedData: Float32Array | null = null;

  private readonly FLOOR_WIDTH = 10;
  private readonly FLOOR_DEPTH = 8;
  private readonly WALL_HEIGHT = 3;
  private readonly TEXTURE_WIDTH = 64;
  private readonly TEXTURE_HEIGHT = 64;

  constructor(scene: THREE.Scene, pipeSystem: PipeSystem) {
    this.scene = scene;
    this.pipeSystem = pipeSystem;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    
    this.createFloorThermalMap();
    this.createWallThermalMaps();
  }

  private createThermalTexture(width: number, height: number, surfaceType: 'floor' | 'wall', surfacePos?: THREE.Vector3): THREE.DataTexture {
    const data = new Float32Array(width * height * 4);
    this.generateThermalData(data, width, height, surfaceType, surfacePos);
    
    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    
    return texture;
  }

  private generateThermalData(
    data: Float32Array, 
    width: number, 
    height: number, 
    surfaceType: 'floor' | 'wall',
    surfacePos?: THREE.Vector3
  ): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        let worldPos: THREE.Vector3;
        
        if (surfaceType === 'floor') {
          worldPos = new THREE.Vector3(
            (x / width - 0.5) * this.FLOOR_WIDTH,
            0.01,
            (y / height - 0.5) * this.FLOOR_DEPTH
          );
        } else {
          worldPos = surfacePos ? surfacePos.clone() : new THREE.Vector3();
          if (surfacePos) {
            if (Math.abs(surfacePos.x) > 4) {
              worldPos.z = (x / width - 0.5) * this.FLOOR_DEPTH;
              worldPos.y = y / height * this.WALL_HEIGHT;
              worldPos.x = surfacePos.x;
            } else {
              worldPos.x = (x / width - 0.5) * this.FLOOR_WIDTH;
              worldPos.y = y / height * this.WALL_HEIGHT;
              worldPos.z = surfacePos.z;
            }
          }
        }
        
        const temperature = this.calculateTemperature(worldPos);
        const color = this.temperatureToColor(temperature);
        
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 0.4;
      }
    }
  }

  private calculateTemperature(point: THREE.Vector3): number {
    const distToFurnace = point.distanceTo(this.furnacePos);
    
    let furnaceTemp = 0;
    if (distToFurnace < this.FURNACE_RADIUS) {
      furnaceTemp = 90 * (1 - distToFurnace / this.FURNACE_RADIUS);
    }
    
    const pipeTemp = this.pipeSystem.getTemperatureAtPoint(point);
    const distAttenuation = Math.pow(this.ATTENUATION, distToFurnace);
    
    const finalTemp = Math.max(furnaceTemp * distAttenuation, pipeTemp * 0.7);
    return Math.max(20, Math.min(90, finalTemp));
  }

  private temperatureToColor(temperature: number): THREE.Color {
    const t = Math.max(0, Math.min(1, (temperature - 20) / 70));
    
    const color = new THREE.Color();
    if (t < 0.25) {
      color.setRGB(0, 0.2, t * 4);
    } else if (t < 0.5) {
      color.setRGB(0, (t - 0.25) * 4, 1);
    } else if (t < 0.75) {
      color.setRGB((t - 0.5) * 4, 1, 1 - (t - 0.5) * 4);
    } else {
      color.setRGB(1, 1 - (t - 0.75) * 4, 0);
    }
    
    return color;
  }

  private createFloorThermalMap(): void {
    const geometry = new THREE.PlaneGeometry(this.FLOOR_WIDTH, this.FLOOR_DEPTH);
    const texture = this.createThermalTexture(this.TEXTURE_WIDTH, this.TEXTURE_HEIGHT, 'floor');
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    
    this.floorThermalMesh = new THREE.Mesh(geometry, material);
    this.floorThermalMesh.rotation.x = -Math.PI / 2;
    this.floorThermalMesh.position.y = 0.02;
    this.floorThermalMesh.visible = this.visible;
    this.floorThermalMesh.userData = { type: 'thermal-floor' };
    this.group.add(this.floorThermalMesh);
    
    this.thermalTextures.set('floor', texture);
  }

  private createWallThermalMaps(): void {
    const wallConfigs = [
      { pos: new THREE.Vector3(0, this.WALL_HEIGHT / 2, -this.FLOOR_DEPTH / 2), width: this.FLOOR_WIDTH, height: this.WALL_HEIGHT, rotY: 0, name: 'back' },
      { pos: new THREE.Vector3(0, this.WALL_HEIGHT / 2, this.FLOOR_DEPTH / 2), width: this.FLOOR_WIDTH, height: this.WALL_HEIGHT, rotY: Math.PI, name: 'front' },
      { pos: new THREE.Vector3(-this.FLOOR_WIDTH / 2, this.WALL_HEIGHT / 2, 0), width: this.FLOOR_DEPTH, height: this.WALL_HEIGHT, rotY: Math.PI / 2, name: 'left' },
      { pos: new THREE.Vector3(this.FLOOR_WIDTH / 2, this.WALL_HEIGHT / 2, 0), width: this.FLOOR_DEPTH, height: this.WALL_HEIGHT, rotY: -Math.PI / 2, name: 'right' }
    ];

    wallConfigs.forEach((config) => {
      const geometry = new THREE.PlaneGeometry(config.width, config.height);
      const texture = this.createThermalTexture(this.TEXTURE_WIDTH, this.TEXTURE_HEIGHT, 'wall', config.pos);
      
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(config.pos);
      mesh.rotation.y = config.rotY;
      mesh.visible = this.visible;
      mesh.userData = { type: 'thermal-wall', name: config.name };
      this.group.add(mesh);
      this.wallThermalMeshes.push(mesh);
      
      this.thermalTextures.set(`wall-${config.name}`, texture);
    });
  }

  public update(currentTime: number): void {
    if (currentTime - this.lastUpdateTime < this.UPDATE_INTERVAL) return;
    this.lastUpdateTime = currentTime;
    
    this.updateFloorTexture();
    this.updateWallTextures();
  }

  private updateFloorTexture(): void {
    const texture = this.thermalTextures.get('floor');
    if (!texture) return;
    
    const data = texture.image.data as unknown as Float32Array;
    this.generateThermalData(data, this.TEXTURE_WIDTH, this.TEXTURE_HEIGHT, 'floor');
    texture.needsUpdate = true;
  }

  private updateWallTextures(): void {
    const wallConfigs = [
      { pos: new THREE.Vector3(0, this.WALL_HEIGHT / 2, -this.FLOOR_DEPTH / 2), name: 'back' },
      { pos: new THREE.Vector3(0, this.WALL_HEIGHT / 2, this.FLOOR_DEPTH / 2), name: 'front' },
      { pos: new THREE.Vector3(-this.FLOOR_WIDTH / 2, this.WALL_HEIGHT / 2, 0), name: 'left' },
      { pos: new THREE.Vector3(this.FLOOR_WIDTH / 2, this.WALL_HEIGHT / 2, 0), name: 'right' }
    ];

    wallConfigs.forEach((config) => {
      const texture = this.thermalTextures.get(`wall-${config.name}`);
      if (!texture) return;
      
      const data = texture.image.data as unknown as Float32Array;
      this.generateThermalData(data, this.TEXTURE_WIDTH, this.TEXTURE_HEIGHT, 'wall', config.pos);
      texture.needsUpdate = true;
    });
  }

  public toggle(): boolean {
    this.visible = !this.visible;
    
    if (this.floorThermalMesh) {
      this.floorThermalMesh.visible = this.visible;
    }
    
    this.wallThermalMeshes.forEach((mesh) => {
      mesh.visible = this.visible;
    });
    
    return this.visible;
  }

  public getTemperatureAtWorldPosition(point: THREE.Vector3): number {
    return this.calculateTemperature(point);
  }

  public dispose(): void {
    this.thermalTextures.forEach((texture) => {
      texture.dispose();
    });
    this.thermalTextures.clear();
    
    if (this.floorThermalMesh) {
      this.floorThermalMesh.geometry.dispose();
      (this.floorThermalMesh.material as THREE.Material).dispose();
    }
    
    this.wallThermalMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
  }
}
