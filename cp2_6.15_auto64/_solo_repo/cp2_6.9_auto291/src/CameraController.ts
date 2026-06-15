import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BuildingMesh } from './types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private animationDuration: number = 2000;
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private startTarget: THREE.Vector3 = new THREE.Vector3();
  private endPosition: THREE.Vector3 = new THREE.Vector3();
  private endTarget: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.set(0, 2, 0);
  }

  public focusOnBuilding(building: BuildingMesh): void {
    const buildingPos = building.position.clone();
    buildingPos.y = building.scale.y / 2;

    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);
    cameraDir.y = 0;
    cameraDir.normalize();

    const angleOffset = (15 * Math.PI) / 180;
    const cos = Math.cos(angleOffset);
    const sin = Math.sin(angleOffset);
    const rotatedDir = new THREE.Vector3(
      cameraDir.x * cos - cameraDir.z * sin,
      0,
      cameraDir.x * sin + cameraDir.z * cos
    );

    const distance = 5;
    const targetHeight = building.scale.y / 2 + 1;

    this.endPosition.copy(buildingPos);
    this.endPosition.addScaledVector(rotatedDir, distance);
    this.endPosition.y = buildingPos.y + 2;

    this.endTarget.set(buildingPos.x, targetHeight, buildingPos.z);

    this.startPosition.copy(this.camera.position);
    this.startTarget.copy(this.controls.target);

    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.controls.enabled = false;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public update(): void {
    if (this.isAnimating) {
      const currentTime = performance.now();
      const elapsed = currentTime - this.animationStartTime;
      const t = Math.min(elapsed / this.animationDuration, 1);
      const easedT = this.easeOut(t);

      this.camera.position.lerpVectors(this.startPosition, this.endPosition, easedT);
      this.controls.target.lerpVectors(this.startTarget, this.endTarget, easedT);

      if (t >= 1) {
        this.isAnimating = false;
        this.controls.enabled = true;
      }
    }

    this.controls.update();
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public dispose(): void {
    this.controls.dispose();
  }
}
