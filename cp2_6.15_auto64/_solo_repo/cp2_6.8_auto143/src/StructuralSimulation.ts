import * as THREE from 'three';

export interface WindConfig {
  amplitude: number;
  frequency: number;
  damping: number;
  duration: number;
}

export class StructuralSimulation {
  private towerGroup: THREE.Group;
  private active: boolean = false;
  private elapsed: number = 0;
  private config: WindConfig = {
    amplitude: 3,
    frequency: 0.5,
    damping: 0.3,
    duration: 5,
  };
  private currentAngle: number = 0;
  private originalMatrices: Map<THREE.Object3D, THREE.Matrix4> = new Map();
  private totalHeight: number = 10;

  constructor(towerGroup: THREE.Group) {
    this.towerGroup = towerGroup;
  }

  setTotalHeight(height: number): void {
    this.totalHeight = height;
  }

  applyWindLoad(config?: Partial<WindConfig>): void {
    if (this.active) return;

    this.config = { ...this.config, ...config };
    this.active = true;
    this.elapsed = 0;

    this.originalMatrices.clear();
    this.towerGroup.traverse((obj) => {
      this.originalMatrices.set(obj, obj.matrix.clone());
    });
  }

  isActive(): boolean {
    return this.active;
  }

  private saveMatrices(): void {
    this.originalMatrices.clear();
    this.towerGroup.children.forEach((child) => {
      child.updateMatrix();
      this.originalMatrices.set(child, child.matrix.clone());
      this.saveChildMatrices(child);
    });
  }

  private saveChildMatrices(parent: THREE.Object3D): void {
    parent.children.forEach((child) => {
      child.updateMatrix();
      this.originalMatrices.set(child, child.matrix.clone());
      this.saveChildMatrices(child);
    });
  }

  private restoreMatrices(): void {
    this.originalMatrices.forEach((matrix, obj) => {
      obj.matrix.copy(matrix);
      obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
    });
  }

  private applyDeformationToChildren(
    parent: THREE.Object3D,
    heightFromBase: number,
    angleRad: number,
    parentHeight: number
  ): void {
    parent.children.forEach((child) => {
      const original = this.originalMatrices.get(child);
      if (!original) return;

      const childHeightFromBase = heightFromBase;
      const sway = Math.tan(angleRad) * childHeightFromBase;
      const heightFactor = Math.min(1, childHeightFromBase / Math.max(1, this.totalHeight));
      const actualSway = sway * heightFactor;

      const originalPos = new THREE.Vector3();
      const originalQuat = new THREE.Quaternion();
      const originalScale = new THREE.Vector3();
      original.decompose(originalPos, originalQuat, originalScale);

      child.position.x = originalPos.x + actualSway;
      child.rotation.z = angleRad * heightFactor;
      child.updateMatrix();

      this.applyDeformationToChildren(
        child,
        childHeightFromBase + (child.userData?.originalHeight || parentHeight * 0.3),
        angleRad,
        parentHeight
      );
    });
  }

  update(deltaTime: number): number {
    if (!this.active) {
      this.currentAngle = 0;
      return 0;
    }

    this.elapsed += deltaTime;

    if (this.elapsed >= this.config.duration) {
      this.active = false;
      this.currentAngle = 0;
      this.restoreMatrices();
      return 0;
    }

    const { amplitude, frequency, damping } = this.config;
    const decay = Math.exp(-damping * this.elapsed);
    const angleDeg = amplitude * decay * Math.sin(2 * Math.PI * frequency * this.elapsed);
    this.currentAngle = angleDeg;

    const angleRad = THREE.MathUtils.degToRad(angleDeg);

    this.applyDeformationRecursive(this.towerGroup, 0, angleRad);

    const displacementMm = Math.tan(angleRad) * this.totalHeight * 100 * 0.5;
    return Math.abs(displacementMm);
  }

  private applyDeformationRecursive(
    obj: THREE.Object3D,
    heightFromBase: number,
    angleRad: number
  ): void {
    const original = this.originalMatrices.get(obj);
    if (original) {
      const originalPos = new THREE.Vector3();
      const originalQuat = new THREE.Quaternion();
      const originalScale = new THREE.Vector3();
      original.decompose(originalPos, originalQuat, originalScale);

      const heightFactor = Math.min(1, Math.max(0, heightFromBase) / Math.max(1, this.totalHeight));
      const sway = Math.tan(angleRad) * Math.max(0, heightFromBase) * heightFactor;

      obj.position.x = originalPos.x + sway;
      obj.rotation.z = angleRad * heightFactor * 0.7;
      obj.updateMatrix();
    }

    obj.children.forEach((child) => {
      const childHeight =
        (child.userData && child.userData.originalHeight) ||
        (child.position instanceof THREE.Vector3 ? 0 : 0);
      const childBaseHeight = heightFromBase + (child.userData?.baseY || child.position.y || 0);
      this.applyDeformationRecursive(
        child,
        Math.max(heightFromBase, childBaseHeight + childHeight),
        angleRad
      );
    });
  }

  getCurrentAngleDeg(): number {
    return this.currentAngle;
  }

  reset(): void {
    this.active = false;
    this.elapsed = 0;
    this.currentAngle = 0;
    this.restoreMatrices();
  }
}
