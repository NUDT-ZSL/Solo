import * as THREE from 'three';

export interface PrismParams {
  rotationSpeed: number;
  symmetryAxes: number;
  colorOffset: number;
}

interface PrismData {
  mesh: THREE.Mesh;
  seedAngle: number;
  baseRadius: number;
  baseHeight: number;
  radiusJitter: number;
  heightJitter: number;
  orbitSpeed: number;
  spinSpeed: number;
  spinAxis: THREE.Vector3;
  symmetryIndex: number;
  baseColor: THREE.Color;
  isTetrahedron: boolean;
  size: number;
  lodLevel: number;
  targetAngle: number;
  currentAngle: number;
  initialSeedAngle: number;
  initialRadius: number;
  initialHeight: number;
  initialColor: THREE.Color;
}

const WARM_COLORS = [0xFF6B6B, 0xFFB347, 0xFFD93D];
const COOL_COLORS = [0x6BCB77, 0x4D96FF, 0x9B59B6];
const ALL_COLORS = [...WARM_COLORS, ...COOL_COLORS];

const BASE_ORBIT_PERIOD = 8;
const BASE_SPIN_PERIOD = 4;
const FRAGMENT_COUNT = 550;
const LOD_DISTANCE_THRESHOLD = 0.65;

export class Kaleidoscope {
  private group: THREE.Group;
  private prisms: PrismData[] = [];
  private params: PrismParams;
  private targetParams: PrismParams;
  private time: number = 0;
  private cameraDistance: number = 5;

  private isResetting: boolean = false;
  private resetProgress: number = 1;
  private resetDuration: number = 2;
  private resetStartStates: Array<{
    angle: number;
    radius: number;
    height: number;
    color: THREE.Color;
    seedAngle: number;
    symmetryIndex: number;
  }> = [];

  private previousAxes: number = 3;
  private axesTransitionProgress: number = 1;

  constructor() {
    this.group = new THREE.Group();
    this.params = {
      rotationSpeed: 1,
      symmetryAxes: 3,
      colorOffset: 0
    };
    this.targetParams = { ...this.params };
    this.previousAxes = 3;
    this.createPrisms();
  }

  private createPrisms(): void {
    const axes = this.params.symmetryAxes;
    const rings = 8;
    const fragmentsPerAxis = Math.ceil(FRAGMENT_COUNT / axes / rings);

    let index = 0;

    for (let ring = 0; ring < rings; ring++) {
      const ringRadius = 0.4 + (ring / rings) * 2.6;
      const fragmentsInRing = fragmentsPerAxis * axes;

      for (let i = 0; i < fragmentsInRing; i++) {
        if (this.prisms.length >= FRAGMENT_COUNT) break;

        const symmetryIndex = i % axes;
        const angleInGroup = Math.floor(i / axes) / fragmentsPerAxis * (Math.PI * 2 / axes);

        const size = 0.3 + Math.random() * 0.5;
        const isTetrahedron = Math.random() > 0.5;

        let geometry: THREE.BufferGeometry;
        if (isTetrahedron) {
          geometry = new THREE.TetrahedronGeometry(size);
        } else {
          geometry = new THREE.CylinderGeometry(size * 0.4, size * 0.4, size * 1.8, 3);
        }

        const colorIndex = Math.floor(Math.random() * ALL_COLORS.length);
        const baseColor = new THREE.Color(ALL_COLORS[colorIndex]);

        const material = new THREE.MeshPhongMaterial({
          color: baseColor.clone(),
          transparent: true,
          opacity: 0.85,
          shininess: 100,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);

        const seedAngle = symmetryIndex * (Math.PI * 2 / axes) + angleInGroup + (Math.random() - 0.5) * 0.15;
        const baseRadius = ringRadius + (Math.random() - 0.5) * 0.3;
        const baseHeight = (Math.random() - 0.5) * 3;
        const radiusJitter = Math.random() * 0.2;
        const heightJitter = Math.random() * 0.3;

        const orbitSpeed = 0.7 + Math.random() * 0.6;
        const spinDirection = Math.random() > 0.5 ? 1 : -1;
        const spinSpeed = spinDirection * (0.6 + Math.random() * 0.8);

        const spinAxis = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();

        const prism: PrismData = {
          mesh,
          seedAngle,
          baseRadius,
          baseHeight,
          radiusJitter,
          heightJitter,
          orbitSpeed,
          spinSpeed,
          spinAxis,
          symmetryIndex,
          baseColor: baseColor.clone(),
          isTetrahedron,
          size,
          lodLevel: 0,
          targetAngle: seedAngle,
          currentAngle: seedAngle,
          initialSeedAngle: seedAngle,
          initialRadius: baseRadius,
          initialHeight: baseHeight,
          initialColor: baseColor.clone()
        };

        this.prisms.push(prism);
        this.group.add(mesh);
        index++;
      }
    }
  }

  private recalculateSymmetryDistribution(newAxes: number): void {
    for (const prism of this.prisms) {
      const oldAngle = prism.seedAngle;
      const oldSymmetryIndex = prism.symmetryIndex;

      const angleInOldGroup = oldAngle - oldSymmetryIndex * (Math.PI * 2 / this.previousAxes);
      const normalizedAngle = angleInOldGroup / (Math.PI * 2 / this.previousAxes);

      const newSymmetryIndex = Math.floor(normalizedAngle * newAxes) % newAxes;
      const angleInNewGroup = (normalizedAngle * newAxes - newSymmetryIndex) * (Math.PI * 2 / newAxes);
      const newSeedAngle = newSymmetryIndex * (Math.PI * 2 / newAxes) + angleInNewGroup;

      prism.symmetryIndex = newSymmetryIndex;
      prism.targetAngle = newSeedAngle;
    }
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setParams(params: Partial<PrismParams>): void {
    if (params.symmetryAxes !== undefined && params.symmetryAxes !== this.targetParams.symmetryAxes) {
      this.previousAxes = this.params.symmetryAxes;
      this.axesTransitionProgress = 0;
      this.recalculateSymmetryDistribution(params.symmetryAxes);
    }
    this.targetParams = { ...this.targetParams, ...params };
  }

  public reset(): void {
    this.targetParams = {
      rotationSpeed: 1,
      symmetryAxes: 3,
      colorOffset: 0
    };

    if (this.params.symmetryAxes !== 3) {
      this.previousAxes = this.params.symmetryAxes;
      this.recalculateSymmetryDistribution(3);
    }

    this.isResetting = true;
    this.resetProgress = 0;

    this.resetStartStates = this.prisms.map(prism => ({
      angle: prism.currentAngle,
      radius: prism.baseRadius,
      height: prism.baseHeight,
      color: (prism.mesh.material as THREE.MeshPhongMaterial).color.clone(),
      seedAngle: prism.seedAngle,
      symmetryIndex: prism.symmetryIndex
    }));
  }

  public getParams(): PrismParams {
    return { ...this.params };
  }

  public setCameraDistance(distance: number): void {
    this.cameraDistance = distance;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    const lerpFactor = 1 - Math.pow(0.001, deltaTime);
    this.params.rotationSpeed = THREE.MathUtils.lerp(
      this.params.rotationSpeed,
      this.targetParams.rotationSpeed,
      lerpFactor
    );
    this.params.colorOffset = THREE.MathUtils.lerp(
      this.params.colorOffset,
      this.targetParams.colorOffset,
      lerpFactor
    );

    const oldAxes = this.params.symmetryAxes;
    const lerpedAxes = THREE.MathUtils.lerp(
      this.params.symmetryAxes,
      this.targetParams.symmetryAxes,
      lerpFactor * 2
    );
    this.params.symmetryAxes = Math.max(2, Math.min(6, Math.round(lerpedAxes)));

    if (this.axesTransitionProgress < 1) {
      this.axesTransitionProgress = Math.min(1, this.axesTransitionProgress + deltaTime * 1.5);
    }

    if (this.isResetting) {
      this.resetProgress = Math.min(1, this.resetProgress + deltaTime / this.resetDuration);
      if (this.resetProgress >= 1) {
        this.isResetting = false;
      }
    }

    const orbitAngularSpeed = (Math.PI * 2) / BASE_ORBIT_PERIOD * this.params.rotationSpeed;
    const spinAngularSpeed = (Math.PI * 2) / BASE_SPIN_PERIOD * this.params.rotationSpeed;

    const resetEased = this.easeInOutCubic(this.resetProgress);

    for (let i = 0; i < this.prisms.length; i++) {
      const prism = this.prisms[i];

      let targetSeedAngle = prism.targetAngle;
      if (this.axesTransitionProgress < 1) {
        targetSeedAngle = THREE.MathUtils.lerp(
          prism.seedAngle,
          prism.targetAngle,
          this.easeInOutCubic(this.axesTransitionProgress)
        );
      }

      if (this.isResetting && this.resetStartStates[i]) {
        const startState = this.resetStartStates[i];
        const resetAngle = THREE.MathUtils.lerp(startState.seedAngle, prism.initialSeedAngle, resetEased);
        targetSeedAngle = resetAngle;
      }

      const orbitAngle = this.time * orbitAngularSpeed * prism.orbitSpeed;
      const wobbleAngle = Math.sin(this.time * 1.5 + i * 0.4) * 0.05;
      const currentAngle = targetSeedAngle + orbitAngle + wobbleAngle;
      prism.currentAngle = currentAngle;

      let currentRadius = prism.baseRadius;
      let currentHeight = prism.baseHeight;

      if (this.isResetting && this.resetStartStates[i]) {
        const startState = this.resetStartStates[i];
        currentRadius = THREE.MathUtils.lerp(startState.radius, prism.initialRadius, resetEased);
        currentHeight = THREE.MathUtils.lerp(startState.height, prism.initialHeight, resetEased);
      }

      const radialWobble = Math.sin(this.time * 2 + i * 0.7) * prism.radiusJitter;
      const radius = currentRadius + radialWobble;
      const heightOffset = Math.sin(this.time * 1.2 + i * 0.5) * prism.heightJitter;

      const x = Math.cos(currentAngle) * radius;
      const z = Math.sin(currentAngle) * radius;
      const y = currentHeight + heightOffset;

      prism.mesh.position.set(x, y, z);

      const spinAngle = this.time * spinAngularSpeed * prism.spinSpeed;
      prism.mesh.setRotationFromAxisAngle(prism.spinAxis, spinAngle);

      this.updatePrismColor(prism, i);
      this.updateLOD(prism);
    }
  }

  private updatePrismColor(prism: PrismData, index: number): void {
    const material = prism.mesh.material as THREE.MeshPhongMaterial;

    let targetColor: THREE.Color;

    if (this.isResetting && this.resetStartStates[index]) {
      const startColor = this.resetStartStates[index].color;
      const resetEased = this.easeInOutCubic(this.resetProgress);
      targetColor = startColor.clone().lerp(prism.initialColor, resetEased);
    } else {
      const baseHSL = { h: 0, s: 0, l: 0 };
      prism.baseColor.getHSL(baseHSL);

      const offset = this.params.colorOffset + index * 0.015;
      const newHue = (baseHSL.h + offset / (Math.PI * 2)) % 1;

      targetColor = new THREE.Color().setHSL(newHue, baseHSL.s, baseHSL.l);
    }

    material.color.copy(targetColor);
  }

  private updateLOD(prism: PrismData): void {
    const distance = prism.mesh.position.length();
    const relativeDistance = distance / (this.cameraDistance * 1.5);

    let targetLOD = 0;
    if (FRAGMENT_COUNT > 500 && relativeDistance > LOD_DISTANCE_THRESHOLD) {
      targetLOD = 1;
    }

    if (targetLOD !== prism.lodLevel) {
      if (targetLOD === 1) {
        const newGeom = new THREE.PlaneGeometry(prism.size * 0.8, prism.size * 0.8);
        prism.mesh.geometry.dispose();
        prism.mesh.geometry = newGeom;
      } else {
        let geometry: THREE.BufferGeometry;
        if (prism.isTetrahedron) {
          geometry = new THREE.TetrahedronGeometry(prism.size);
        } else {
          geometry = new THREE.CylinderGeometry(prism.size * 0.4, prism.size * 0.4, prism.size * 1.8, 3);
        }
        prism.mesh.geometry.dispose();
        prism.mesh.geometry = geometry;
      }
      prism.lodLevel = targetLOD;
    }
  }

  public getPrismData(mesh: THREE.Mesh): { angle: number; color: string; group: number } | null {
    const prism = this.prisms.find(p => p.mesh === mesh);
    if (!prism) return null;

    const material = prism.mesh.material as THREE.MeshPhongMaterial;
    const angleDeg = ((prism.currentAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * (180 / Math.PI);

    return {
      angle: angleDeg,
      color: '#' + material.color.getHexString().toUpperCase(),
      group: prism.symmetryIndex + 1
    };
  }

  public getAllMeshes(): THREE.Mesh[] {
    return this.prisms.map(p => p.mesh);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    for (const prism of this.prisms) {
      prism.mesh.geometry.dispose();
      (prism.mesh.material as THREE.Material).dispose();
    }
    this.prisms = [];
  }
}
