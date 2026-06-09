import * as THREE from 'three';

export interface VertexData {
  initialPosition: THREE.Vector3;
  initialNormal: THREE.Vector3;
  currentOffset: number;
  targetOffset: number;
}

export class ClayModel {
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private vertices: Float32Array;
  private normals: Float32Array;
  private colors: Float32Array;
  private vertexData: VertexData[] = [];
  private vertexCount: number = 0;
  private radius: number = 4;
  private widthSegments: number = 100;
  private heightSegments: number = 100;
  private affectedVertices: Set<number> = new Set();
  private breatheOffsets: Float32Array;
  private pulseOffsets: Float32Array;

  constructor() {
    this.geometry = new THREE.SphereGeometry(
      this.radius,
      this.widthSegments,
      this.heightSegments
    );

    this.vertices = this.geometry.attributes.position.array as Float32Array;
    this.normals = this.geometry.attributes.normal.array as Float32Array;
    this.vertexCount = this.vertices.length / 3;

    this.colors = new Float32Array(this.vertexCount * 4);
    this.breatheOffsets = new Float32Array(this.vertexCount);
    this.pulseOffsets = new Float32Array(this.vertexCount);

    this.initVertexData();
    this.initColors();
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 30,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      flatShading: false
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  private initVertexData(): void {
    for (let i = 0; i < this.vertexCount; i++) {
      const ix = i * 3;
      const pos = new THREE.Vector3(
        this.vertices[ix],
        this.vertices[ix + 1],
        this.vertices[ix + 2]
      );
      const normal = pos.clone().normalize();

      this.vertexData.push({
        initialPosition: pos.clone(),
        initialNormal: normal,
        currentOffset: 0,
        targetOffset: 0
      });
    }
  }

  private initColors(): void {
    const gray = new THREE.Color().setHSL(0, 0, 0.5);
    for (let i = 0; i < this.vertexCount; i++) {
      const ix = i * 4;
      this.colors[ix] = gray.r;
      this.colors[ix + 1] = gray.g;
      this.colors[ix + 2] = gray.b;
      this.colors[ix + 3] = 0.8;
    }
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getVertexData(): VertexData[] {
    return this.vertexData;
  }

  getVertexCount(): number {
    return this.vertexCount;
  }

  getColors(): Float32Array {
    return this.colors;
  }

  getAffectedCount(): number {
    return this.affectedVertices.size;
  }

  getBreatheOffsets(): Float32Array {
    return this.breatheOffsets;
  }

  getPulseOffsets(): Float32Array {
    return this.pulseOffsets;
  }

  pinch(
    worldPoint: THREE.Vector3,
    pressure: number,
    influenceRadius: number = 2
  ): number {
    const maxDisplacement = pressure * 8;
    const influenceSq = influenceRadius * influenceRadius;
    let newlyAffected = 0;

    for (let i = 0; i < this.vertexCount; i++) {
      const ix = i * 3;
      const vx = this.vertices[ix];
      const vy = this.vertices[ix + 1];
      const vz = this.vertices[ix + 2];

      const dx = vx - worldPoint.x;
      const dy = vy - worldPoint.y;
      const dz = vz - worldPoint.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < influenceSq) {
        const dist = Math.sqrt(distSq);
        const normalizedDist = dist / influenceRadius;
        const gaussianWeight = Math.exp(-(normalizedDist * normalizedDist) * 2);
        const displacement = maxDisplacement * gaussianWeight;

        const data = this.vertexData[i];
        data.targetOffset = Math.min(8, data.targetOffset + displacement);

        if (!this.affectedVertices.has(i)) {
          this.affectedVertices.add(i);
          newlyAffected++;
        }
      }
    }

    return newlyAffected;
  }

  updateBuffers(
    breathePhase: number = 0,
    breatheAmount: number = 0.3,
    pulseAmount: number = 0
  ): void {
    for (let i = 0; i < this.vertexCount; i++) {
      const ix = i * 3;
      const data = this.vertexData[i];

      data.currentOffset += (data.targetOffset - data.currentOffset) * 0.15;

      const breatheOffset = Math.sin(breathePhase + i * 0.01) * breatheAmount;
      this.breatheOffsets[i] = breatheOffset;

      const pulseOffset = -pulseAmount;
      this.pulseOffsets[i] = pulseOffset;

      const totalOffset = data.currentOffset + breatheOffset + pulseOffset;

      const pos = data.initialPosition;
      const normal = data.initialNormal;

      this.vertices[ix] = pos.x + normal.x * totalOffset;
      this.vertices[ix + 1] = pos.y + normal.y * totalOffset;
      this.vertices[ix + 2] = pos.z + normal.z * totalOffset;

      const nx = normal.x;
      const ny = normal.y;
      const nz = normal.z;
      this.normals[ix] = nx;
      this.normals[ix + 1] = ny;
      this.normals[ix + 2] = nz;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  updateColorsByOffset(hueShift: number = 0): void {
    for (let i = 0; i < this.vertexCount; i++) {
      const ix4 = i * 4;
      const offset = this.vertexData[i].currentOffset;

      let hue: number;
      let saturation: number = 0.8;
      let lightness: number = 0.6;

      if (offset <= 0.01) {
        hue = 0;
        saturation = 0;
        lightness = 0.5;
      } else {
        const clampedOffset = Math.min(8, Math.max(0, offset));
        hue = (clampedOffset / 8) * 240;
        hue = (hue + hueShift) % 360;
        if (hue < 0) hue += 360;
      }

      const color = new THREE.Color().setHSL(hue / 360, saturation, lightness);
      this.colors[ix4] = color.r;
      this.colors[ix4 + 1] = color.g;
      this.colors[ix4 + 2] = color.b;
      this.colors[ix4 + 3] = 0.8;
    }

    this.geometry.attributes.color.needsUpdate = true;
  }

  getResetPositions(): Float32Array {
    const result = new Float32Array(this.vertexCount * 3);
    for (let i = 0; i < this.vertexCount; i++) {
      const ix = i * 3;
      result[ix] = this.vertexData[i].initialPosition.x;
      result[ix + 1] = this.vertexData[i].initialPosition.y;
      result[ix + 2] = this.vertexData[i].initialPosition.z;
    }
    return result;
  }

  resetToInitial(): void {
    for (let i = 0; i < this.vertexCount; i++) {
      this.vertexData[i].currentOffset = 0;
      this.vertexData[i].targetOffset = 0;
    }
    this.affectedVertices.clear();
    this.initColors();
    this.updateBuffers();
  }

  getVertexOffset(i: number): number {
    return this.vertexData[i].currentOffset;
  }

  setVertexTargetOffset(i: number, offset: number): void {
    this.vertexData[i].targetOffset = offset;
  }

  isPointInsideInfluence(
    worldPoint: THREE.Vector3,
    vertexIndex: number,
    radius: number = 2
  ): boolean {
    const ix = vertexIndex * 3;
    const dx = this.vertices[ix] - worldPoint.x;
    const dy = this.vertices[ix + 1] - worldPoint.y;
    const dz = this.vertices[ix + 2] - worldPoint.z;
    return (dx * dx + dy * dy + dz * dz) < radius * radius;
  }
}
