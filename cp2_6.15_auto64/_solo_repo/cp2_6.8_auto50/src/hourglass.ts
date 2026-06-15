import * as THREE from 'three';

export class Hourglass {
  public group: THREE.Group;
  public glassGroup: THREE.Group;
  public outlineGroup: THREE.Group;
  public topCone: THREE.Mesh;
  public bottomCone: THREE.Mesh;
  public neck: THREE.Mesh;
  public isFlipping: boolean = false;
  public flipProgress: number = 0;
  public flipDuration: number = 2;
  public flipStartRotation: number = 0;
  public flipTargetRotation: number = Math.PI;
  public currentRotation: number = 0;
  public containerHeight: number = 4.5;
  public containerRadius: number = 1.8;
  public neckRadius: number = 0.12;
  public neckHeight: number = 0.4;
  public bottomFillRatio: number = 0;
  public topFillRatio: number = 1;

  constructor() {
    this.group = new THREE.Group();
    this.glassGroup = new THREE.Group();
    this.outlineGroup = new THREE.Group();
    this.group.add(this.glassGroup);
    this.group.add(this.outlineGroup);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      transmission: 0.85,
      roughness: 0.05,
      metalness: 0.0,
      ior: 1.5,
      thickness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide
    });

    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0x00D4FF,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });

    const topGeometry = new THREE.ConeGeometry(this.containerRadius, this.containerHeight / 2, 48, 1, true);
    this.topCone = new THREE.Mesh(topGeometry, glassMaterial);
    this.topCone.position.y = this.containerHeight / 4;
    this.glassGroup.add(this.topCone);
    this.addConeOutline(this.topCone, outlineMaterial, true);

    const bottomGeometry = new THREE.ConeGeometry(this.containerRadius, this.containerHeight / 2, 48, 1, true);
    this.bottomCone = new THREE.Mesh(bottomGeometry, glassMaterial);
    this.bottomCone.position.y = -this.containerHeight / 4;
    this.bottomCone.rotation.x = Math.PI;
    this.glassGroup.add(this.bottomCone);
    this.addConeOutline(this.bottomCone, outlineMaterial, false);

    const neckGeometry = new THREE.CylinderGeometry(this.neckRadius, this.neckRadius, this.neckHeight, 32);
    this.neck = new THREE.Mesh(neckGeometry, glassMaterial);
    this.neck.position.y = 0;
    this.glassGroup.add(this.neck);

    this.addNeckOutline(this.neck, outlineMaterial);
  }

  private addConeOutline(cone: THREE.Mesh, material: THREE.LineBasicMaterial, isTop: boolean): void {
    const segments = 64;
    const points: THREE.Vector3[] = [];
    const yOffset = isTop ? this.containerHeight / 4 : -this.containerHeight / 4;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * this.containerRadius,
        yOffset - (isTop ? this.containerHeight / 4 : -this.containerHeight / 4),
        Math.sin(angle) * this.containerRadius
      ));
    }
    const bottomRing = new THREE.BufferGeometry().setFromPoints(points);
    this.outlineGroup.add(new THREE.Line(bottomRing, material));

    const topPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      topPoints.push(new THREE.Vector3(
        Math.cos(angle) * this.neckRadius,
        yOffset + (isTop ? -this.containerHeight / 4 : this.containerHeight / 4),
        Math.sin(angle) * this.neckRadius
      ));
    }
    const topRing = new THREE.BufferGeometry().setFromPoints(topPoints);
    this.outlineGroup.add(new THREE.Line(topRing, material));

    const sideLines = 8;
    for (let i = 0; i < sideLines; i++) {
      const angle = (i / sideLines) * Math.PI * 2;
      const linePoints: THREE.Vector3[] = [
        new THREE.Vector3(
          Math.cos(angle) * this.containerRadius,
          yOffset - (isTop ? this.containerHeight / 4 : -this.containerHeight / 4),
          Math.sin(angle) * this.containerRadius
        ),
        new THREE.Vector3(
          Math.cos(angle) * this.neckRadius,
          yOffset + (isTop ? -this.containerHeight / 4 : this.containerHeight / 4),
          Math.sin(angle) * this.neckRadius
        )
      ];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      this.outlineGroup.add(new THREE.Line(lineGeometry, material));
    }
  }

  private addNeckOutline(neck: THREE.Mesh, material: THREE.LineBasicMaterial): void {
    const segments = 32;
    for (let y of [-this.neckHeight / 2, this.neckHeight / 2]) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * this.neckRadius,
          y,
          Math.sin(angle) * this.neckRadius
        ));
      }
      const ring = new THREE.BufferGeometry().setFromPoints(points);
      this.outlineGroup.add(new THREE.Line(ring, material));
    }
  }

  public startFlip(): void {
    if (this.isFlipping) return;
    this.isFlipping = true;
    this.flipProgress = 0;
    this.flipStartRotation = this.currentRotation;
    this.flipTargetRotation = this.flipStartRotation + Math.PI;
  }

  public update(delta: number): void {
    if (this.isFlipping) {
      this.flipProgress += delta / this.flipDuration;
      if (this.flipProgress >= 1) {
        this.flipProgress = 1;
        this.isFlipping = false;
        this.currentRotation = this.flipTargetRotation;
        const temp = this.bottomFillRatio;
        this.bottomFillRatio = this.topFillRatio;
        this.topFillRatio = temp;
      }
      const t = this.easeInOutCubic(this.flipProgress);
      this.currentRotation = this.flipStartRotation + (this.flipTargetRotation - this.flipStartRotation) * t;
      this.group.rotation.z = this.currentRotation;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getGravityDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, -1, 0);
    dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.currentRotation);
    return dir.normalize();
  }

  public isPointInside(position: THREE.Vector3, radius: number): boolean {
    const localPos = position.clone();
    this.group.worldToLocal(localPos);
    const y = localPos.y;
    const halfHeight = this.containerHeight / 2;

    if (y > this.neckHeight / 2) {
      const yTop = y - this.neckHeight / 2;
      const h = this.containerHeight / 2 - this.neckHeight / 2;
      const t = yTop / h;
      if (t < 0 || t > 1) return false;
      const r = this.neckRadius + (this.containerRadius - this.neckRadius) * t;
      const dist = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
      return dist < r - radius;
    } else if (y < -this.neckHeight / 2) {
      const yBottom = -y - this.neckHeight / 2;
      const h = this.containerHeight / 2 - this.neckHeight / 2;
      const t = yBottom / h;
      if (t < 0 || t > 1) return false;
      const r = this.neckRadius + (this.containerRadius - this.neckRadius) * t;
      const dist = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
      return dist < r - radius;
    } else {
      const dist = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
      return dist < this.neckRadius - radius;
    }
  }

  public clampPosition(position: THREE.Vector3, radius: number): THREE.Vector3 {
    const localPos = position.clone();
    this.group.worldToLocal(localPos);
    const y = localPos.y;
    let result = localPos.clone();
    const halfHeight = this.containerHeight / 2;
    const topLimit = halfHeight - this.neckHeight / 2;
    const bottomLimit = -halfHeight + this.neckHeight / 2;

    if (y > topLimit) {
      const yTop = y - this.neckHeight / 2;
      const h = this.containerHeight / 2 - this.neckHeight / 2;
      const t = Math.min(1, Math.max(0, yTop / h));
      const r = this.neckRadius + (this.containerRadius - this.neckRadius) * t;
      const dist = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
      if (dist >= r - radius) {
        const ratio = (r - radius) / Math.max(dist, 0.0001);
        result.x *= ratio;
        result.z *= ratio;
      }
      if (y > halfHeight - radius) {
        result.y = halfHeight - radius;
      }
    } else if (y < bottomLimit) {
      const yBottom = -y - this.neckHeight / 2;
      const h = this.containerHeight / 2 - this.neckHeight / 2;
      const t = Math.min(1, Math.max(0, yBottom / h));
      const r = this.neckRadius + (this.containerRadius - this.neckRadius) * t;
      const dist = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
      if (dist >= r - radius) {
        const ratio = (r - radius) / Math.max(dist, 0.0001);
        result.x *= ratio;
        result.z *= ratio;
      }
      if (y < -halfHeight + radius) {
        result.y = -halfHeight + radius;
      }
    } else {
      const dist = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
      if (dist >= this.neckRadius - radius) {
        const ratio = (this.neckRadius - radius) / Math.max(dist, 0.0001);
        result.x *= ratio;
        result.z *= ratio;
      }
    }

    this.group.localToWorld(result);
    return result;
  }

  public countParticlesInBottom(particlePositions: Float32Array): number {
    let count = 0;
    for (let i = 0; i < particlePositions.length; i += 3) {
      const localPos = new THREE.Vector3(
        particlePositions[i],
        particlePositions[i + 1],
        particlePositions[i + 2]
      );
      this.group.worldToLocal(localPos);
      if (localPos.y < 0) count++;
    }
    return count;
  }

  public getBottomCapacity(): number {
    return (1 / 3) * Math.PI * this.containerRadius * this.containerRadius * (this.containerHeight / 2);
  }

  public updateFillRatios(particleCount: number, particles: Float32Array, radii: Float32Array): void {
    let bottomVolume = 0;
    let topVolume = 0;
    for (let i = 0; i < particleCount; i++) {
      const localPos = new THREE.Vector3(
        particles[i * 3],
        particles[i * 3 + 1],
        particles[i * 3 + 2]
      );
      this.group.worldToLocal(localPos);
      const r = radii[i];
      const v = (4 / 3) * Math.PI * r * r * r;
      if (localPos.y < 0) {
        bottomVolume += v;
      } else {
        topVolume += v;
      }
    }
    const capacity = this.getBottomCapacity();
    this.bottomFillRatio = Math.min(1, bottomVolume / (capacity * 0.5));
    this.topFillRatio = Math.min(1, topVolume / (capacity * 0.5));
  }

  public isBottomFull(): boolean {
    return this.bottomFillRatio >= 0.8;
  }
}
