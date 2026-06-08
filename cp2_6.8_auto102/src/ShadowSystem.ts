import * as THREE from 'three';
import { BuildingObject } from './BuildingSystem';
import { SunSystem } from './SunSystem';

export class ShadowSystem {
  private scene: THREE.Scene;
  private sunSystem: SunSystem;
  private ground: THREE.Mesh | null = null;
  private lastUpdateTime: number = 0;
  private readonly updateInterval: number = 100;

  constructor(scene: THREE.Scene, sunSystem: SunSystem) {
    this.scene = scene;
    this.sunSystem = sunSystem;
  }

  public createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(80, 80);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      roughness: 0.9,
      metalness: 0.0
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const gridHelper = new THREE.GridHelper(80, 80, 0xCBD5E0, 0xCBD5E0);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.6;
    this.scene.add(gridHelper);
  }

  public setupShadowMapping(buildings: BuildingObject[]): void {
    const light = this.sunSystem.directionalLight;

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.type = THREE.PCFSoftShadowMap;

    const d = 50;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 200;
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;

    if (light.shadow.camera instanceof THREE.OrthographicCamera) {
      light.shadow.camera.updateProjectionMatrix();
    }

    buildings.forEach((b) => {
      b.mesh.castShadow = true;
      b.mesh.receiveShadow = true;
    });

    if (this.ground) {
      this.ground.receiveShadow = true;
    }
  }

  public update(currentTime: number, force: boolean = false): void {
    if (!force && currentTime - this.lastUpdateTime < this.updateInterval) {
      this.sunSystem.directionalLight.shadow.needsUpdate = false;
      return;
    }

    this.sunSystem.directionalLight.shadow.needsUpdate = true;
    this.lastUpdateTime = currentTime;
  }

  public forceUpdate(): void {
    this.sunSystem.directionalLight.shadow.needsUpdate = true;
    this.lastUpdateTime = performance.now();
  }

  public getGround(): THREE.Mesh | null {
    return this.ground;
  }
}
