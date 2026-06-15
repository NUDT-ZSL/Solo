import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export const HOULGLASS_CONFIG = {
  diameter: 12,
  radius: 6,
  height: 20,
  neckRadius: 0.6,
  glassOpacity: 0.35,
  glassIOR: 1.45,
  autoRotationSpeed: 0.5,
  flipDuration: 2500,
  cycleDuration: 60000,
};

export class Sandglass {
  public group: THREE.Group;
  public container: THREE.Group;
  public glassMaterial: THREE.MeshPhysicalMaterial;
  public isFlipping: boolean = false;
  public gravityDirection: number = -1;
  private skeleton!: THREE.LineSegments;
  private topGlow!: THREE.Mesh;
  private bottomGlow!: THREE.Mesh;
  private topConeMesh!: THREE.Mesh;
  private bottomConeMesh!: THREE.Mesh;

  constructor() {
    this.group = new THREE.Group();
    this.container = new THREE.Group();
    this.group.add(this.container);

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: HOULGLASS_CONFIG.glassOpacity,
      transmission: 0.6,
      roughness: 0.05,
      metalness: 0.0,
      ior: HOULGLASS_CONFIG.glassIOR,
      thickness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.buildGeometry();
    this.buildSkeleton();
    this.buildGlowRims();
  }

  private buildGeometry() {
    const { radius, height, neckRadius } = HOULGLASS_CONFIG;
    const halfHeight = height / 2;
    const midY = 0;

    const topConeGeo = new THREE.ConeGeometry(radius, halfHeight, 64, 1, true);
    topConeGeo.translate(0, halfHeight / 2, 0);
    this.topConeMesh = new THREE.Mesh(topConeGeo, this.glassMaterial);
    this.topConeMesh.castShadow = false;
    this.topConeMesh.receiveShadow = false;
    this.container.add(this.topConeMesh);

    const topCylinderGeo = new THREE.CylinderGeometry(neckRadius, radius, 0.05, 64);
    topCylinderGeo.translate(0, 0, 0);
    const topCylinder = new THREE.Mesh(topCylinderGeo, this.glassMaterial);
    this.container.add(topCylinder);

    const bottomCylinderGeo = new THREE.CylinderGeometry(radius, neckRadius, 0.05, 64);
    bottomCylinderGeo.translate(0, 0, 0);
    const bottomCylinder = new THREE.Mesh(bottomCylinderGeo, this.glassMaterial);
    this.container.add(bottomCylinder);

    const bottomConeGeo = new THREE.ConeGeometry(radius, halfHeight, 64, 1, true);
    bottomConeGeo.translate(0, -halfHeight / 2, 0);
    bottomConeGeo.scale(1, -1, 1);
    this.bottomConeMesh = new THREE.Mesh(bottomConeGeo, this.glassMaterial);
    this.bottomConeMesh.castShadow = false;
    this.bottomConeMesh.receiveShadow = false;
    this.container.add(this.bottomConeMesh);

    const topCapGeo = new THREE.CircleGeometry(radius, 64);
    topCapGeo.translate(0, halfHeight, 0);
    topCapGeo.rotateX(-Math.PI / 2);
    const topCap = new THREE.Mesh(topCapGeo, this.glassMaterial);
    this.container.add(topCap);

    const bottomCapGeo = new THREE.CircleGeometry(radius, 64);
    bottomCapGeo.translate(0, -halfHeight, 0);
    bottomCapGeo.rotateX(Math.PI / 2);
    const bottomCap = new THREE.Mesh(bottomCapGeo, this.glassMaterial);
    this.container.add(bottomCap);
  }

  private buildSkeleton() {
    const { radius, height } = HOULGLASS_CONFIG;
    const halfHeight = height / 2;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, halfHeight, z));
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(0, 0, 0));
      points.push(new THREE.Vector3(x, -halfHeight, z));
    }

    const skeletonGeo = new THREE.BufferGeometry().setFromPoints(points);
    const skeletonMat = new THREE.LineBasicMaterial({
      color: 0xc9a84c,
      transparent: true,
      opacity: 0.85,
    });
    this.skeleton = new THREE.LineSegments(skeletonGeo, skeletonMat);
    this.container.add(this.skeleton);
  }

  private buildGlowRims() {
    const { radius, height } = HOULGLASS_CONFIG;
    const halfHeight = height / 2;
    const glowThickness = 0.08;

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    const topRimGeo = new THREE.TorusGeometry(radius + glowThickness * 0.5, glowThickness, 16, 128);
    topRimGeo.rotateX(Math.PI / 2);
    topRimGeo.translate(0, halfHeight, 0);
    this.topGlow = new THREE.Mesh(topRimGeo, glowMat);
    this.container.add(this.topGlow);

    const bottomRimGeo = new THREE.TorusGeometry(radius + glowThickness * 0.5, glowThickness, 16, 128);
    bottomRimGeo.rotateX(Math.PI / 2);
    bottomRimGeo.translate(0, -halfHeight, 0);
    this.bottomGlow = new THREE.Mesh(bottomRimGeo, glowMat);
    this.container.add(this.bottomGlow);
  }

  public update(dt: number) {
    if (!this.isFlipping) {
      this.container.rotation.y += (HOULGLASS_CONFIG.autoRotationSpeed * Math.PI / 180) * dt;
    }
    TWEEN.update();
  }

  public flip(): Promise<void> {
    if (this.isFlipping) return Promise.resolve();
    this.isFlipping = true;

    return new Promise((resolve) => {
      const startRot = { x: this.container.rotation.x };
      const endRot = { x: startRot.x + Math.PI };

      new TWEEN.Tween(startRot)
        .to(endRot, HOULGLASS_CONFIG.flipDuration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          this.container.rotation.x = startRot.x;
        })
        .onComplete(() => {
          this.gravityDirection *= -1;
          this.isFlipping = false;
          resolve();
        })
        .start();
    });
  }

  public getTopChamberBounds() {
    const { radius, height, neckRadius } = HOULGLASS_CONFIG;
    const halfHeight = height / 2;
    return {
      maxY: halfHeight - 0.1,
      minY: neckRadius,
      neckRadius: neckRadius,
      topRadius: radius,
    };
  }

  public getBottomChamberBounds() {
    const { radius, height, neckRadius } = HOULGLASS_CONFIG;
    const halfHeight = height / 2;
    return {
      minY: -halfHeight + 0.1,
      maxY: -neckRadius,
      neckRadius: neckRadius,
      bottomRadius: radius,
    };
  }

  public getGravity(): THREE.Vector3 {
    return new THREE.Vector3(0, -9.8 * this.gravityDirection, 0);
  }
}
