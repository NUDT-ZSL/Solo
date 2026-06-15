import * as THREE from 'three';

export interface CrystalBeadData {
  id: number;
  parentId: number | null;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  depth: number;
  age: number;
  branchCount: number;
  glowIntensity: number;
  resonanceTime: number;
  isGrowing: boolean;
  targetLength: number;
  currentLength: number;
  children: number[];
}

const COLOR_STOPS = [
  new THREE.Color(0x6a0dad),
  new THREE.Color(0x4b0082),
  new THREE.Color(0x00ced1),
  new THREE.Color(0x00fa9a),
  new THREE.Color(0xff6347),
  new THREE.Color(0xff4500),
];

export class CrystalBead {
  data: CrystalBeadData;
  mesh: THREE.Group;
  private coreMesh: THREE.Mesh;
  private glowMesh: THREE.Mesh;
  private coreMaterial: THREE.MeshStandardMaterial;
  private glowMaterial: THREE.MeshBasicMaterial;
  private baseColor: THREE.Color;
  private resonanceColor: THREE.Color;
  private flickerPhase: number;
  private baseRadius: number;

  constructor(data: CrystalBeadData) {
    this.data = data;
    this.mesh = new THREE.Group();
    this.flickerPhase = Math.random() * Math.PI * 2;
    this.baseRadius = Math.max(0.03, 0.15 - data.depth * 0.015);

    const t = Math.min(data.depth / 8, 1);
    const segment = t * (COLOR_STOPS.length - 1);
    const idx = Math.floor(segment);
    const frac = segment - idx;
    this.baseColor = new THREE.Color().lerpColors(
      COLOR_STOPS[Math.min(idx, COLOR_STOPS.length - 1)],
      COLOR_STOPS[Math.min(idx + 1, COLOR_STOPS.length - 1)],
      frac
    );
    this.resonanceColor = new THREE.Color().copy(this.baseColor);
    this.resonanceColor.offsetHSL(0, 0.4, 0.2);

    const geometry = new THREE.CylinderGeometry(
      this.baseRadius * 0.6,
      this.baseRadius,
      1,
      6,
      1
    );
    geometry.translate(0, 0.5, 0);

    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: this.baseColor,
      emissive: this.baseColor.clone().multiplyScalar(0.3),
      emissiveIntensity: 0.5,
      metalness: 0.7,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    this.coreMesh = new THREE.Mesh(geometry, this.coreMaterial);
    this.mesh.add(this.coreMesh);

    const glowGeo = new THREE.CylinderGeometry(
      this.baseRadius * 0.8,
      this.baseRadius * 1.2,
      1,
      6,
      1
    );
    glowGeo.translate(0, 0.5, 0);

    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: this.baseColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.mesh.add(this.glowMesh);

    this.mesh.position.copy(data.position);

    const up = new THREE.Vector3(0, 1, 0);
    const dir = data.direction.clone().normalize();
    if (Math.abs(dir.dot(up)) < 0.9999) {
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      this.mesh.quaternion.copy(quat);
    }

    this.coreMesh.scale.y = 0.01;
    this.glowMesh.scale.y = 0.01;
  }

  getGlowIntensity(): number {
    return this.data.glowIntensity;
  }

  getAge(): number {
    return this.data.age;
  }

  getBranchCount(): number {
    return this.data.branchCount;
  }

  triggerResonance() {
    this.data.resonanceTime = 0.5;
  }

  update(delta: number, glowMultiplier: number) {
    this.data.age += delta;

    if (this.data.isGrowing) {
      this.data.currentLength = Math.min(
        this.data.currentLength + delta * 2.0,
        this.data.targetLength
      );
      const scale = this.data.currentLength / this.data.targetLength;
      this.coreMesh.scale.y = scale;
      this.glowMesh.scale.y = scale;
      if (this.data.currentLength >= this.data.targetLength) {
        this.data.isGrowing = false;
      }
    }

    const flicker = Math.sin(this.data.age * 3.0 + this.flickerPhase) * 0.15 + 0.85;
    const pulse = Math.sin(this.data.age * 1.5 + this.flickerPhase) * 0.1 + 0.9;
    this.data.glowIntensity = Math.min(
      100,
      Math.round(flicker * pulse * glowMultiplier * 100)
    );

    const glowVal = (flicker * pulse * glowMultiplier * 0.6 + 0.2);
    this.coreMaterial.emissiveIntensity = glowVal;
    this.glowMaterial.opacity = glowVal * 0.2;

    if (this.data.resonanceTime > 0) {
      this.data.resonanceTime -= delta;
      const t = this.data.resonanceTime / 0.5;
      const shake = Math.sin(this.data.resonanceTime * 40) * 0.03 * t;
      this.mesh.position.x = this.data.position.x + shake;
      this.mesh.position.z = this.data.position.z + shake;

      this.coreMaterial.color.copy(this.resonanceColor);
      this.coreMaterial.emissive.copy(this.resonanceColor);
      this.coreMaterial.emissiveIntensity = glowVal + 0.5 * t;
    } else {
      this.mesh.position.copy(this.data.position);
      this.coreMaterial.color.copy(this.baseColor);
      this.coreMaterial.emissive.copy(this.baseColor).multiplyScalar(0.3);
    }
  }

  dispose() {
    this.coreMesh.geometry.dispose();
    this.coreMaterial.dispose();
    this.glowMesh.geometry.dispose();
    this.glowMaterial.dispose();
  }
}
