import * as THREE from 'three';

const STEM_SEGMENT_COUNT = 6;
const STEM_HEIGHT_PER_SEGMENT = 1.0 / STEM_SEGMENT_COUNT;
const STEM_BASE_RADIUS = 0.05;
const LEAF_SEGMENT_COUNT = 4;
const LEAF_LENGTH = 0.5;
const LEAF_WIDTH = 0.3;

export interface EnvironmentState {
  lightIntensity: number;
  soilMoisture: number;
  lightPosition: THREE.Vector3;
}

export class Plant {
  public readonly group: THREE.Group;
  private stemSegments: THREE.Mesh[] = [];
  private stemPivots: THREE.Object3D[] = [];
  private leftLeafMeshes: THREE.Mesh[] = [];
  private rightLeafMeshes: THREE.Mesh[] = [];
  private stemBaseRotations: { x: number; z: number }[] = [];
  private stemTargetRotations: { x: number; z: number }[] = [];
  private currentStemRadius: number = STEM_BASE_RADIUS;
  private targetStemRadius: number = STEM_BASE_RADIUS;
  private currentLeafScale: number = 1.0;
  private targetLeafScale: number = 1.0;
  private currentLeafCurvature: number = 0.0;
  private targetLeafCurvature: number = 0.0;
  private flower?: THREE.Group;
  private isFlowering: boolean = false;
  private flowerTimer: number = 0;
  private flowerScale: number = 0;
  private targetFlowerScale: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.createStem();
    this.createLeaves();
  }

  private createStem(): void {
    for (let i = 0; i < STEM_SEGMENT_COUNT; i++) {
      const pivot = new THREE.Object3D();
      const geometry = new THREE.CylinderGeometry(
        STEM_BASE_RADIUS,
        STEM_BASE_RADIUS,
        STEM_HEIGHT_PER_SEGMENT,
        12
      );

      const positions = geometry.attributes.position;
      const colors: number[] = [];
      const colorTop = new THREE.Color('#4CAF50');
      const colorBottom = new THREE.Color('#2E7D32');

      for (let j = 0; j < positions.count; j++) {
        const y = positions.getY(j) / STEM_HEIGHT_PER_SEGMENT + 0.5;
        const t = (i + y) / STEM_SEGMENT_COUNT;
        const color = colorBottom.clone().lerp(colorTop, t);
        colors.push(color.r, color.g, color.b);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.7,
        metalness: 0.0,
        flatShading: false
      });

      const segment = new THREE.Mesh(geometry, material);
      segment.position.y = STEM_HEIGHT_PER_SEGMENT / 2;
      segment.castShadow = true;
      segment.receiveShadow = true;

      pivot.add(segment);

      if (i === 0) {
        this.group.add(pivot);
      } else {
        pivot.position.y = STEM_HEIGHT_PER_SEGMENT;
        this.stemPivots[i - 1].add(pivot);
      }

      this.stemPivots.push(pivot);
      this.stemSegments.push(segment);
      this.stemBaseRotations.push({ x: 0, z: 0 });
      this.stemTargetRotations.push({ x: 0, z: 0 });
    }
  }

  private createLeaves(): void {
    const createLeaf = (): THREE.Mesh[] => {
      const meshes: THREE.Mesh[] = [];
      for (let i = 0; i < LEAF_SEGMENT_COUNT; i++) {
        const segLen = LEAF_LENGTH / LEAF_SEGMENT_COUNT;
        const widthTaper = 1 - Math.abs((i + 0.5) / LEAF_SEGMENT_COUNT - 0.5) * 1.2;
        const segWidth = Math.max(LEAF_WIDTH * widthTaper, 0.02);

        const geometry = new THREE.PlaneGeometry(segWidth, segLen, 3, 2);
        const positions = geometry.attributes.position;
        for (let j = 0; j < positions.count; j++) {
          positions.setY(j, positions.getY(j) + segLen / 2);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
          color: 0x81C784,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          roughness: 0.6,
          metalness: 0.0
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes.push(mesh);
      }

      for (let i = 1; i < LEAF_SEGMENT_COUNT; i++) {
        meshes[i].position.y = LEAF_LENGTH / LEAF_SEGMENT_COUNT;
        meshes[i - 1].add(meshes[i]);
      }
      return meshes;
    };

    this.leftLeafMeshes = createLeaf();
    this.rightLeafMeshes = createLeaf();

    const leafAttachmentIndex = Math.floor(STEM_SEGMENT_COUNT * 0.5);
    const attachmentPivot = this.stemPivots[leafAttachmentIndex];
    const attachmentSegment = this.stemSegments[leafAttachmentIndex];

    const leftPivot = new THREE.Object3D();
    leftPivot.rotation.z = Math.PI / 2.5;
    leftPivot.rotation.x = -0.3;
    leftPivot.position.set(STEM_BASE_RADIUS * 0.5, STEM_HEIGHT_PER_SEGMENT * 0.7, 0);
    leftPivot.add(this.leftLeafMeshes[0]);
    attachmentSegment.add(leftPivot);

    const rightPivot = new THREE.Object3D();
    rightPivot.rotation.z = -Math.PI / 2.5;
    rightPivot.rotation.x = -0.3;
    rightPivot.position.set(-STEM_BASE_RADIUS * 0.5, STEM_HEIGHT_PER_SEGMENT * 0.7, 0);
    rightPivot.add(this.rightLeafMeshes[0]);
    attachmentSegment.add(rightPivot);
  }

  private createFlower(): void {
    if (this.flower) return;

    this.flower = new THREE.Group();
    const petalCount = 6;

    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalGeometry = new THREE.SphereGeometry(0.08, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      petalGeometry.scale(1, 0.3, 2);

      const hue = 0.9 + Math.random() * 0.1;
      const saturation = 0.7 + Math.random() * 0.3;
      const lightness = 0.5 + Math.random() * 0.2;
      const color = new THREE.Color().setHSL(hue, saturation, lightness);

      const petalMaterial = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.0
      });

      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      petal.position.set(
        Math.cos(angle) * 0.1,
        0,
        Math.sin(angle) * 0.1
      );
      petal.rotation.y = -angle;
      petal.rotation.x = -0.2;
      petal.castShadow = true;
      this.flower.add(petal);
    }

    const centerGeometry = new THREE.SphereGeometry(0.05, 12, 12);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD54F,
      emissive: 0xFFA000,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.1
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.castShadow = true;
    this.flower.add(center);

    const topSegment = this.stemSegments[STEM_SEGMENT_COUNT - 1];
    this.flower.position.y = STEM_HEIGHT_PER_SEGMENT * 0.6;
    this.flower.scale.setScalar(0);
    topSegment.add(this.flower);
  }

  public update(deltaTime: number, env: EnvironmentState): { flowerProgress: number; flowering: boolean } {
    this.updateLightTracking(deltaTime, env);
    this.updateMorphology(deltaTime, env);
    this.updateFlower(deltaTime, env);
    this.applyCurvature();
    return {
      flowerProgress: this.isFlowering && this.flower ? this.flowerScale : Math.min(this.flowerTimer / 60, 1),
      flowering: this.isFlowering
    };
  }

  private updateLightTracking(deltaTime: number, env: EnvironmentState): void {
    const tipWorldPos = new THREE.Vector3();
    const tipSegment = this.stemSegments[STEM_SEGMENT_COUNT - 1];
    tipSegment.getWorldPosition(tipWorldPos);

    const toLight = new THREE.Vector3().subVectors(env.lightPosition, tipWorldPos);
    toLight.y = Math.max(toLight.y, 0.1);
    toLight.normalize();

    for (let i = 0; i < STEM_SEGMENT_COUNT; i++) {
      const weight = (i + 1) / STEM_SEGMENT_COUNT;
      const maxAngle = 0.35 * weight;

      const targetX = THREE.MathUtils.clamp(-toLight.y * maxAngle, -maxAngle, maxAngle);
      const targetZ = THREE.MathUtils.clamp(toLight.x * maxAngle * 1.5, -maxAngle, maxAngle);

      this.stemTargetRotations[i].x = targetX;
      this.stemTargetRotations[i].z = targetZ;

      const rotSpeed = 0.02 * 60;
      this.stemBaseRotations[i].x = THREE.MathUtils.damp(
        this.stemBaseRotations[i].x,
        this.stemTargetRotations[i].x,
        rotSpeed,
        deltaTime
      );
      this.stemBaseRotations[i].z = THREE.MathUtils.damp(
        this.stemBaseRotations[i].z,
        this.stemTargetRotations[i].z,
        rotSpeed,
        deltaTime
      );

      this.stemPivots[i].rotation.x = this.stemBaseRotations[i].x;
      this.stemPivots[i].rotation.z = this.stemBaseRotations[i].z;
    }
  }

  private updateMorphology(deltaTime: number, env: EnvironmentState): void {
    const lightNorm = THREE.MathUtils.clamp(env.lightIntensity / 2.0, 0, 1);
    this.targetStemRadius = STEM_BASE_RADIUS * (0.6 + lightNorm * 0.8);
    this.targetLeafScale = 0.6 + lightNorm * 0.8;

    const moistureNorm = THREE.MathUtils.clamp(env.soilMoisture / 100, 0, 1);
    this.targetLeafCurvature = (1 - moistureNorm) * 0.8;

    const changeRate = 0.01 * 60;
    this.currentStemRadius = THREE.MathUtils.damp(
      this.currentStemRadius, this.targetStemRadius, changeRate, deltaTime
    );
    this.currentLeafScale = THREE.MathUtils.damp(
      this.currentLeafScale, this.targetLeafScale, changeRate, deltaTime
    );
    this.currentLeafCurvature = THREE.MathUtils.damp(
      this.currentLeafCurvature, this.targetLeafCurvature, changeRate, deltaTime
    );

    for (const seg of this.stemSegments) {
      const geo = seg.geometry as THREE.CylinderGeometry;
      const positions = geo.attributes.position;
      const params = (geo as any).parameters;
      const originalTop = params?.radiusTop ?? STEM_BASE_RADIUS;
      const originalBottom = params?.radiusBottom ?? STEM_BASE_RADIUS;
      const scale = this.currentStemRadius / STEM_BASE_RADIUS;

      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        const x = positions.getX(i);
        const z = positions.getZ(i);
        if (Math.abs(y - STEM_HEIGHT_PER_SEGMENT / 2) < 0.001 ||
            Math.abs(y + STEM_HEIGHT_PER_SEGMENT / 2) < 0.001) {
          const origR = Math.sqrt(x * x + z * z) || 0.0001;
          const angle = Math.atan2(z, x);
          positions.setX(i, Math.cos(angle) * this.currentStemRadius);
          positions.setZ(i, Math.sin(angle) * this.currentStemRadius);
        }
      }
      positions.needsUpdate = true;
      geo.computeVertexNormals();
    }

    const applyScale = (meshes: THREE.Mesh[]) => {
      for (let i = 0; i < meshes.length; i++) {
        const t = i / LEAF_SEGMENT_COUNT;
        const taperScale = 0.7 + t * 0.6;
        meshes[i].scale.setScalar(this.currentLeafScale * taperScale);
      }
    };
    applyScale(this.leftLeafMeshes);
    applyScale(this.rightLeafMeshes);
  }

  private applyCurvature(): void {
    const applyLeafCurvature = (meshes: THREE.Mesh[]) => {
      for (let i = 1; i < meshes.length; i++) {
        const curvature = this.currentLeafCurvature * 0.3;
        meshes[i].rotation.x = curvature * i;
        meshes[i].rotation.z = curvature * 0.5 * i;
      }
    };
    applyLeafCurvature(this.leftLeafMeshes);
    applyLeafCurvature(this.rightLeafMeshes);
  }

  private updateFlower(deltaTime: number, env: EnvironmentState): void {
    const canFlower = env.lightIntensity < 0.3 && env.soilMoisture > 80;

    if (canFlower && !this.isFlowering) {
      this.flowerTimer += deltaTime;
      if (this.flowerTimer >= 60) {
        this.isFlowering = true;
        this.targetFlowerScale = 1;
        this.createFlower();
      }
    } else if (!canFlower && !this.isFlowering) {
      this.flowerTimer = Math.max(0, this.flowerTimer - deltaTime * 0.5);
    }

    if (this.isFlowering) {
      if (canFlower) {
        this.targetFlowerScale = 1;
      } else {
        this.targetFlowerScale = 0;
      }

      const flowerSpeed = 0.8;
      this.flowerScale = THREE.MathUtils.damp(
        this.flowerScale, this.targetFlowerScale, flowerSpeed, deltaTime
      );

      if (this.flower) {
        this.flower.scale.setScalar(this.flowerScale);
        if (this.flowerScale < 0.01 && this.targetFlowerScale === 0) {
          this.isFlowering = false;
          this.flowerTimer = 0;
          if (this.flower.parent) {
            this.flower.parent.remove(this.flower);
          }
          this.flower = undefined;
        }
      }
    }
  }

  public getTipWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    const top = this.stemSegments[STEM_SEGMENT_COUNT - 1];
    top.getWorldPosition(pos);
    pos.y += STEM_HEIGHT_PER_SEGMENT * 0.5;
    return pos;
  }
}
