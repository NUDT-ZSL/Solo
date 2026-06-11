import * as THREE from 'three';

export interface KaleidoscopeParams {
  rotationSpeed: number;
  symmetryAxes: number;
  colorOffset: number;
}

export interface PrismInfo {
  id: number;
  group: number;
  rotationAngle: number;
  colorHex: string;
}

interface Prism {
  id: number;
  group: number;
  basePosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  startPosition: THREE.Vector3;
  size: number;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  rotationAxis: THREE.Vector3;
  rotationSpeed: number;
  rotationAngle: number;
  mesh: THREE.Mesh;
  lodLevel: number;
  geometryType: 'prism' | 'tetra' | 'plane';
  detailGeometry: THREE.BufferGeometry | null;
  simpleGeometry: THREE.BufferGeometry | null;
  morphProgress: number;
}

const WARM_COLORS = [0xFF6B6B, 0xFFB347, 0xFFD93D];
const COOL_COLORS = [0x6BCB77, 0x4D96FF, 0x9B59B6];
const ALL_COLORS = [...WARM_COLORS, ...COOL_COLORS];

const BASE_ROTATION_PERIOD = 8;
const SELF_ROTATION_PERIOD = 4;
const PRISM_COUNT = 300;
const CUBE_SIZE = 3.5;
const LOD_DISTANCE_THRESHOLD = 6;
const LOD_ENABLED = true;

export class Kaleidoscope {
  public group: THREE.Group;
  private prisms: Prism[] = [];
  private params: KaleidoscopeParams;
  private targetParams: KaleidoscopeParams;
  private yawAngle: number = 0;
  private morphing: boolean = false;
  private morphStartTime: number = 0;
  private morphDuration: number = 2000;
  private tempVector: THREE.Vector3 = new THREE.Vector3();
  private tempColor: THREE.Color = new THREE.Color();

  constructor() {
    this.group = new THREE.Group();
    this.params = {
      rotationSpeed: 1,
      symmetryAxes: 3,
      colorOffset: 0
    };
    this.targetParams = { ...this.params };
    this.createPrisms();
  }

  public getParams(): KaleidoscopeParams {
    return { ...this.params };
  }

  public setParam(key: keyof KaleidoscopeParams, value: number): void {
    if (this.targetParams[key] === value) return;
    this.targetParams[key] = value;

    if (key === 'symmetryAxes') {
      this.startMorph();
    }
  }

  public reset(): void {
    this.targetParams = {
      rotationSpeed: 1,
      symmetryAxes: 3,
      colorOffset: 0
    };
    this.startMorph();
  }

  private startMorph(): void {
    this.morphing = true;
    this.morphStartTime = performance.now();
    this.prisms.forEach((prism) => {
      prism.startPosition.copy(prism.mesh.position);
      prism.morphProgress = 0;
    });
    this.recalculateTargetPositions();
  }

  private createPrisms(): void {
    for (let i = 0; i < PRISM_COUNT; i++) {
      const prism = this.createPrism(i);
      this.prisms.push(prism);
      this.group.add(prism.mesh);
    }
    this.recalculateTargetPositions();
  }

  private createPrism(index: number): Prism {
    const size = 0.3 + Math.random() * 0.5;
    const colorIndex = Math.floor(Math.random() * ALL_COLORS.length);
    const baseColor = new THREE.Color(ALL_COLORS[colorIndex]);
    const currentColor = baseColor.clone();

    const isTetra = Math.random() > 0.5;
    const detailGeometry = isTetra
      ? this.createTetrahedronGeometry(size)
      : this.createTriangularPrismGeometry(size);
    const simpleGeometry = this.createPlaneGeometry(size);

    const material = new THREE.MeshStandardMaterial({
      color: currentColor,
      metalness: 0.3,
      roughness: 0.4,
      emissive: currentColor.clone().multiplyScalar(0.15),
      flatShading: true
    });

    const mesh = new THREE.Mesh(detailGeometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const rotationAxis = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();

    const group = index % this.params.symmetryAxes;

    return {
      id: index,
      group,
      basePosition: new THREE.Vector3(),
      targetPosition: new THREE.Vector3(),
      startPosition: new THREE.Vector3(),
      size,
      baseColor,
      currentColor,
      rotationAxis,
      rotationSpeed: Math.random() > 0.5 ? 1 : -1,
      rotationAngle: Math.random() * Math.PI * 2,
      mesh,
      lodLevel: 0,
      geometryType: isTetra ? 'tetra' : 'prism',
      detailGeometry,
      simpleGeometry,
      morphProgress: 0
    };
  }

  private createTriangularPrismGeometry(size: number): THREE.BufferGeometry {
    const h = size * 1.2;
    const r = size * 0.6;

    const vertices = new Float32Array(18);
    const normals = new Float32Array(18);
    const indices = [];

    const topY = h / 2;
    const bottomY = -h / 2;

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      vertices[i * 3] = x;
      vertices[i * 3 + 1] = topY;
      vertices[i * 3 + 2] = z;

      vertices[(i + 3) * 3] = x;
      vertices[(i + 3) * 3 + 1] = bottomY;
      vertices[(i + 3) * 3 + 2] = z;
    }

    for (let i = 0; i < 18; i++) {
      normals[i] = 0;
    }

    const faces = [
      [0, 1, 2],
      [3, 5, 4],
      [0, 3, 4],
      [0, 4, 1],
      [1, 4, 5],
      [1, 5, 2],
      [2, 5, 3],
      [2, 3, 0]
    ];

    const normal = new THREE.Vector3();
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();

    for (const face of faces) {
      indices.push(face[0], face[1], face[2]);

      v0.fromArray(vertices, face[0] * 3);
      v1.fromArray(vertices, face[1] * 3);
      v2.fromArray(vertices, face[2] * 3);

      const edge1 = v1.clone().sub(v0);
      const edge2 = v2.clone().sub(v0);
      normal.crossVectors(edge1, edge2).normalize();

      for (const vi of face) {
        normals[vi * 3] += normal.x;
        normals[vi * 3 + 1] += normal.y;
        normals[vi * 3 + 2] += normal.z;
      }
    }

    for (let i = 0; i < 6; i++) {
      const nx = normals[i * 3];
      const ny = normals[i * 3 + 1];
      const nz = normals[i * 3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    return geometry;
  }

  private createTetrahedronGeometry(size: number): THREE.BufferGeometry {
    const s = size * 0.8;
    const h = s * Math.sqrt(2 / 3);

    const vertices = new Float32Array([
      0, h * 0.75, 0,
      -s / 2, -h * 0.25, -s * Math.sqrt(3) / 6,
      s / 2, -h * 0.25, -s * Math.sqrt(3) / 6,
      0, -h * 0.25, s * Math.sqrt(3) / 3
    ]);

    const indices = [
      0, 2, 1,
      0, 3, 2,
      0, 1, 3,
      1, 2, 3
    ];

    const normals = new Float32Array(12);
    const normal = new THREE.Vector3();
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();

    for (let i = 0; i < 4; i++) {
      const i0 = indices[i * 3];
      const i1 = indices[i * 3 + 1];
      const i2 = indices[i * 3 + 2];

      v0.fromArray(vertices, i0 * 3);
      v1.fromArray(vertices, i1 * 3);
      v2.fromArray(vertices, i2 * 3);

      const edge1 = v1.clone().sub(v0);
      const edge2 = v2.clone().sub(v0);
      normal.crossVectors(edge1, edge2).normalize();

      for (const vi of [i0, i1, i2]) {
        normals[vi * 3] += normal.x;
        normals[vi * 3 + 1] += normal.y;
        normals[vi * 3 + 2] += normal.z;
      }
    }

    for (let i = 0; i < 4; i++) {
      const nx = normals[i * 3];
      const ny = normals[i * 3 + 1];
      const nz = normals[i * 3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    return geometry;
  }

  private createPlaneGeometry(size: number): THREE.BufferGeometry {
    const geometry = new THREE.PlaneGeometry(size * 0.8, size * 0.8);
    return geometry;
  }

  private recalculateTargetPositions(): void {
    const axes = this.targetParams.symmetryAxes;

    const basePositions = this.generateSymmetricBasePositions(axes);

    this.prisms.forEach((prism, index) => {
      const groupIndex = index % axes;
      const localIndex = Math.floor(index / axes);
      const baseIdx = localIndex % basePositions.length;

      const basePos = basePositions[baseIdx].clone();
      const rotatedPos = this.applySymmetryTransform(basePos, groupIndex, axes);

      prism.group = groupIndex;
      prism.targetPosition.copy(rotatedPos);
      prism.basePosition.copy(rotatedPos);

      if (!this.morphing) {
        prism.mesh.position.copy(rotatedPos);
        prism.startPosition.copy(rotatedPos);
      }
    });
  }

  private generateSymmetricBasePositions(axes: number): THREE.Vector3[] {
    const perGroup = Math.floor(PRISM_COUNT / axes);
    const positions: THREE.Vector3[] = [];
    const halfCube = CUBE_SIZE / 2;

    switch (axes) {
      case 2:
        for (let i = 0; i < perGroup; i++) {
          const t = i / perGroup;
          const phi = Math.acos(1 - 2 * t);
          const theta = Math.PI * (1 + Math.sqrt(5)) * i;

          const r = halfCube * 0.7 * (0.4 + 0.6 * Math.pow(Math.random(), 0.5));
          const x = r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.sin(phi) * Math.sin(theta) * 0.6;
          const z = r * Math.cos(phi);

          positions.push(new THREE.Vector3(
            Math.max(-halfCube, Math.min(halfCube, x)),
            Math.max(-halfCube, Math.min(halfCube, y)),
            Math.max(-halfCube, Math.min(halfCube, z))
          ));
        }
        break;

      case 3:
        for (let i = 0; i < perGroup; i++) {
          const ring = i % 8;
          const ringPos = Math.floor(i / 8) / Math.ceil(perGroup / 8);
          const angle = (ring / 8) * Math.PI * 2 + ringPos * Math.PI * 0.5;

          const radius = halfCube * (0.2 + ringPos * 0.75) * (0.8 + Math.random() * 0.4);
          const x = radius * Math.cos(angle) * 0.85;
          const z = radius * Math.sin(angle) * 0.85;
          const y = (ringPos - 0.5) * halfCube * 1.6 + (Math.random() - 0.5) * 0.3;

          positions.push(new THREE.Vector3(
            Math.max(-halfCube, Math.min(halfCube, x)),
            Math.max(-halfCube, Math.min(halfCube, y)),
            Math.max(-halfCube, Math.min(halfCube, z))
          ));
        }
        break;

      case 4:
        for (let i = 0; i < perGroup; i++) {
          const layer = i % 5;
          const layerPos = Math.floor(i / 5) / Math.ceil(perGroup / 5);
          const angle = (layer / 4) * Math.PI * 2 + layerPos * Math.PI;

          const radius = halfCube * (0.15 + layerPos * 0.85) * (0.85 + Math.random() * 0.3);
          const x = radius * Math.cos(angle) * 0.9;
          const z = radius * Math.sin(angle) * 0.9;
          const y = (Math.random() - 0.5) * halfCube * 1.2;

          positions.push(new THREE.Vector3(
            Math.max(-halfCube, Math.min(halfCube, x)),
            Math.max(-halfCube, Math.min(halfCube, y)),
            Math.max(-halfCube, Math.min(halfCube, z))
          ));
        }
        break;

      case 5:
        for (let i = 0; i < perGroup; i++) {
          const t = i / perGroup;
          const phi = Math.acos(1 - 2 * ((t + 0.1) % 1));
          const theta = Math.PI * (2 * (1 + Math.sqrt(5)) * i) % (Math.PI * 2);

          const r = halfCube * (0.3 + t * 0.7) * (0.75 + Math.random() * 0.5);
          const x = r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.sin(phi) * Math.sin(theta) * 0.7;
          const z = r * Math.cos(phi);

          positions.push(new THREE.Vector3(
            Math.max(-halfCube, Math.min(halfCube, x)),
            Math.max(-halfCube, Math.min(halfCube, y)),
            Math.max(-halfCube, Math.min(halfCube, z))
          ));
        }
        break;

      case 6:
      default:
        for (let i = 0; i < perGroup; i++) {
          const ring = i % 6;
          const radial = Math.floor(i / 6) / Math.ceil(perGroup / 6);
          const innerAngle = (ring / 6) * Math.PI * 2;
          const starOffset = (ring % 2 === 0) ? 1 : 0.6;

          const radius = halfCube * (0.15 + radial * 0.85) * starOffset * (0.85 + Math.random() * 0.3);
          const x = radius * Math.cos(innerAngle) * 0.95;
          const z = radius * Math.sin(innerAngle) * 0.95;
          const y = (radial - 0.5) * halfCube * 1.5 + (Math.random() - 0.5) * 0.4;

          positions.push(new THREE.Vector3(
            Math.max(-halfCube, Math.min(halfCube, x)),
            Math.max(-halfCube, Math.min(halfCube, y)),
            Math.max(-halfCube, Math.min(halfCube, z))
          ));
        }
        break;
    }

    return positions;
  }

  private applySymmetryTransform(pos: THREE.Vector3, groupIndex: number, axes: number): THREE.Vector3 {
    const angle = (groupIndex / axes) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const x = pos.x * cos - pos.z * sin;
    const z = pos.x * sin + pos.z * cos;
    let y = pos.y;

    if (axes === 2 && groupIndex === 1) {
      y = -y;
    } else if (axes === 4 && groupIndex >= 2) {
      y = -y * 0.8;
    } else if (axes === 5) {
      y += Math.sin(angle * 2) * 0.15;
    } else if (axes === 6) {
      const twist = Math.sin(angle * 3) * 0.2;
      y += twist;
    }

    return new THREE.Vector3(x, y, z);
  }

  public update(deltaTime: number, cameraPosition: THREE.Vector3): void {
    const now = performance.now();

    if (this.morphing) {
      const elapsed = now - this.morphStartTime;
      const progress = Math.min(elapsed / this.morphDuration, 1);
      const eased = this.easeInOutCubic(progress);

      this.prisms.forEach((prism) => {
        prism.mesh.position.lerpVectors(
          prism.startPosition,
          prism.targetPosition,
          eased
        );
      });

      if (progress >= 1) {
        this.morphing = false;
      }
    }

    const speedFactor = this.targetParams.rotationSpeed;
    this.yawAngle += (deltaTime / BASE_ROTATION_PERIOD) * Math.PI * 2 * speedFactor;
    this.group.rotation.y = this.yawAngle;

    this.prisms.forEach((prism) => {
      prism.rotationAngle +=
        (deltaTime / SELF_ROTATION_PERIOD) *
        Math.PI * 2 *
        prism.rotationSpeed *
        speedFactor;

      prism.mesh.setRotationFromAxisAngle(
        prism.rotationAxis,
        prism.rotationAngle
      );

      this.updateColor(prism);
      this.updateLOD(prism, cameraPosition);
    });

    this.params.symmetryAxes = this.targetParams.symmetryAxes;
    this.params.rotationSpeed = this.targetParams.rotationSpeed;
  }

  private updateColor(prism: Prism): void {
    const globalOffset = this.targetParams.colorOffset;
    const groupPhase = (prism.group / this.targetParams.symmetryAxes) * Math.PI * 2;
    const spatialPhase = (prism.basePosition.x + prism.basePosition.y + prism.basePosition.z) * 0.3;
    const totalOffset = globalOffset + groupPhase + spatialPhase;

    this.tempColor.copy(prism.baseColor);
    const hsl = { h: 0, s: 0, l: 0 };
    this.tempColor.getHSL(hsl);

    const hueShift = (totalOffset / (Math.PI * 2)) % 1;
    hsl.h = ((hsl.h + hueShift) % 1 + 1) % 1;

    const saturationBoost = Math.sin(globalOffset * 2) * 0.05;
    hsl.s = Math.max(0.4, Math.min(0.95, hsl.s + saturationBoost));

    const lightnessVariation = Math.sin(globalOffset + groupPhase) * 0.03;
    hsl.l = Math.max(0.35, Math.min(0.65, hsl.l + lightnessVariation));

    this.tempColor.setHSL(hsl.h, hsl.s, hsl.l);
    prism.currentColor.copy(this.tempColor);

    const material = prism.mesh.material as THREE.MeshStandardMaterial;
    material.color.copy(prism.currentColor);
    material.emissive.copy(prism.currentColor).multiplyScalar(0.15);
  }

  private updateLOD(prism: Prism, cameraPos: THREE.Vector3): void {
    if (!LOD_ENABLED) return;

    this.tempVector.copy(prism.mesh.position);
    this.group.localToWorld(this.tempVector);
    const distance = this.tempVector.distanceTo(cameraPos);

    const shouldSimplify = distance > LOD_DISTANCE_THRESHOLD;
    const targetLOD = shouldSimplify ? 1 : 0;

    if (prism.lodLevel !== targetLOD) {
      prism.lodLevel = targetLOD;
      if (targetLOD === 1 && prism.simpleGeometry) {
        prism.mesh.geometry = prism.simpleGeometry;
      } else if (targetLOD === 0 && prism.detailGeometry) {
        prism.mesh.geometry = prism.detailGeometry;
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getMeshes(): THREE.Mesh[] {
    return this.prisms.map((p) => p.mesh);
  }

  public getPrismInfo(mesh: THREE.Mesh): PrismInfo | null {
    const prism = this.prisms.find((p) => p.mesh === mesh);
    if (!prism) return null;

    return {
      id: prism.id,
      group: prism.group,
      rotationAngle: ((prism.rotationAngle * 180) / Math.PI) % 360,
      colorHex: '#' + prism.currentColor.getHexString()
    };
  }

  public dispose(): void {
    this.prisms.forEach((prism) => {
      prism.detailGeometry?.dispose();
      prism.simpleGeometry?.dispose();
      (prism.mesh.material as THREE.Material).dispose();
    });
    this.prisms = [];
  }
}
