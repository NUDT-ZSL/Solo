import * as THREE from 'three';

export interface CoralConfig {
  position: THREE.Vector3;
  baseSize: number;
  hue: number;
  rotationSpeed: number;
  growDuration: number;
  floatAmplitude: number;
  floatPeriod: number;
  floatPhase: number;
}

export class Coral {
  public readonly group: THREE.Group;
  public readonly config: CoralConfig;
  private readonly branchMeshes: THREE.Mesh[] = [];
  private readonly glowSpheres: THREE.Mesh[] = [];
  private readonly coreMaterial: THREE.MeshStandardMaterial;
  private readonly glowMaterials: THREE.MeshBasicMaterial[] = [];

  private elapsedTime: number = 0;
  private growProgress: number = 0;
  private isGrown: boolean = false;

  private baseGlowIntensity: number = 0.8;
  private targetGlowIntensity: number = 0.8;
  private currentGlowIntensity: number = 0.8;
  private hoverTimer: number = 0;
  private isHovering: boolean = false;

  private readonly coreScale: number = 0.05;
  private readonly branchCount: number;

  private static readonly branchGeometry = new THREE.CylinderGeometry(0.03, 0.06, 1, 6);
  private static readonly glowGeometry = new THREE.SphereGeometry(0.08, 12, 12);

  constructor(config: CoralConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.position.copy(config.position);

    this.branchCount = 4 + Math.floor(Math.random() * 3);

    const color = new THREE.Color().setHSL(
      (config.hue % 360) / 360,
      0.65,
      0.55
    );

    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.55,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92
    });

    this.buildStructure(color);

    this.group.scale.setScalar(this.coreScale);
  }

  private buildStructure(color: THREE.Color): void {
    const coreGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const coreMesh = new THREE.Mesh(coreGeo, this.coreMaterial);
    this.group.add(coreMesh);
    this.branchMeshes.push(coreMesh);

    for (let i = 0; i < this.branchCount; i++) {
      this.createBranch(i, color);
    }
  }

  private createBranch(index: number, color: THREE.Color): void {
    const branchGroup = new THREE.Group();

    const angleStep = (Math.PI * 2) / this.branchCount;
    const baseAngle = angleStep * index + (Math.random() - 0.5) * 0.4;
    const tiltAngle = 0.3 + Math.random() * 0.5;

    branchGroup.rotation.set(
      Math.cos(baseAngle) * tiltAngle,
      baseAngle,
      Math.sin(baseAngle) * tiltAngle * 0.5
    );

    const branchLength = 0.6 + Math.random() * 0.6;

    const branchMesh = new THREE.Mesh(
      Coral.branchGeometry,
      this.coreMaterial.clone()
    );
    branchMesh.scale.set(1, branchLength, 1);
    branchMesh.position.y = branchLength / 2;
    branchGroup.add(branchMesh);
    this.branchMeshes.push(branchMesh);

    const glowColor = new THREE.Color().setHSL(
      ((this.config.hue + (Math.random() - 0.5) * 20) % 360) / 360,
      0.8,
      0.7
    );

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: this.baseGlowIntensity
    });

    const glowSphere = new THREE.Mesh(Coral.glowGeometry, glowMaterial);
    glowSphere.position.y = branchLength;
    branchGroup.add(glowSphere);
    this.glowSpheres.push(glowSphere);
    this.glowMaterials.push(glowMaterial);

    const subBranchCount = 1 + Math.floor(Math.random() * 2);
    for (let s = 0; s < subBranchCount; s++) {
      this.createSubBranch(branchGroup, branchLength, color);
    }

    this.group.add(branchGroup);
  }

  private createSubBranch(
    parent: THREE.Group,
    parentLength: number,
    color: THREE.Color
  ): void {
    const subGroup = new THREE.Group();

    const attachRatio = 0.5 + Math.random() * 0.4;
    subGroup.position.y = parentLength * attachRatio;
    subGroup.rotation.set(
      (Math.random() - 0.5) * 1.2,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.8
    );

    const subLength = 0.25 + Math.random() * 0.35;

    const subMesh = new THREE.Mesh(
      Coral.branchGeometry,
      this.coreMaterial.clone()
    );
    subMesh.scale.set(0.6, subLength, 0.6);
    subMesh.position.y = subLength / 2;
    subGroup.add(subMesh);
    this.branchMeshes.push(subMesh);

    const glowColor = new THREE.Color().setHSL(
      ((this.config.hue + (Math.random() - 0.5) * 30) % 360) / 360,
      0.75,
      0.72
    );

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: this.baseGlowIntensity * 0.9
    });

    const glowSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      glowMaterial
    );
    glowSphere.position.y = subLength;
    subGroup.add(glowSphere);
    this.glowSpheres.push(glowSphere);
    this.glowMaterials.push(glowMaterial);

    parent.add(subGroup);
  }

  public update(deltaTime: number, globalDriftOffset: THREE.Vector3): void {
    this.elapsedTime += deltaTime;

    if (!this.isGrown) {
      const rawProgress = Math.min(
        this.elapsedTime / this.config.growDuration,
        1.0
      );
      this.growProgress = this.easeOutCubic(rawProgress);
      const currentScale =
        this.coreScale + (this.config.baseSize - this.coreScale) * this.growProgress;
      this.group.scale.setScalar(currentScale);

      if (rawProgress >= 1.0) {
        this.isGrown = true;
      }
    }

    this.group.rotation.y += this.config.rotationSpeed * deltaTime;

    const floatY =
      Math.sin(
        (this.elapsedTime / this.config.floatPeriod) * Math.PI * 2 +
          this.config.floatPhase
      ) * this.config.floatAmplitude;

    this.group.position.x = this.config.position.x + globalDriftOffset.x;
    this.group.position.z = this.config.position.z + globalDriftOffset.z;
    this.group.position.y = this.config.position.y + globalDriftOffset.y + floatY;

    if (this.isHovering) {
      this.hoverTimer += deltaTime;
      if (this.hoverTimer >= 2.0) {
        this.isHovering = false;
        this.targetGlowIntensity = this.baseGlowIntensity;
        this.hoverTimer = 0;
      }
    }

    if (Math.abs(this.currentGlowIntensity - this.targetGlowIntensity) > 0.001) {
      this.currentGlowIntensity +=
        (this.targetGlowIntensity - this.currentGlowIntensity) *
        Math.min(deltaTime * 5, 1);
      this.updateGlowOpacity();
    }
  }

  private updateGlowOpacity(): void {
    for (let i = 0; i < this.glowMaterials.length; i++) {
      const baseOpacity = i === 0 ? this.baseGlowIntensity : this.baseGlowIntensity * 0.9;
      this.glowMaterials[i].opacity =
        baseOpacity + (this.currentGlowIntensity - this.baseGlowIntensity);
    }
  }

  public triggerHover(): void {
    this.isHovering = true;
    this.hoverTimer = 0;
    this.targetGlowIntensity = this.baseGlowIntensity * 1.5;
  }

  public getGlowSpherePositions(): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const worldPos = new THREE.Vector3();
    for (const sphere of this.glowSpheres) {
      sphere.getWorldPosition(worldPos);
      positions.push(worldPos.clone());
    }
    return positions;
  }

  public getAllMeshes(): THREE.Mesh[] {
    return [...this.branchMeshes, ...this.glowSpheres];
  }

  public isReadyForInteraction(): boolean {
    return this.growProgress > 0.3;
  }

  public dispose(): void {
    this.branchMeshes.forEach((mesh) => {
      if (mesh.geometry !== Coral.branchGeometry) {
        mesh.geometry.dispose();
      }
      (mesh.material as THREE.Material).dispose();
    });
    this.glowSpheres.forEach((sphere) => {
      sphere.geometry.dispose();
      (sphere.material as THREE.Material).dispose();
    });
    this.coreMaterial.dispose();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
