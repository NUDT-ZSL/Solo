import * as THREE from 'three';

export type MaterialType = 'glass' | 'chrome';

interface MaterialState {
  color: THREE.Color;
  roughness: number;
  metalness: number;
  opacity: number;
  transparent: boolean;
  transmission: number;
  thickness: number;
  envMapIntensity: number;
  clearcoat: number;
  clearcoatRoughness: number;
  ior: number;
}

const GLASS_STATE: MaterialState = {
  color: new THREE.Color('#B0C4DE'),
  roughness: 0.2,
  metalness: 0.1,
  opacity: 0.65,
  transparent: true,
  transmission: 0.35,
  thickness: 0.5,
  envMapIntensity: 0.8,
  clearcoat: 0.3,
  clearcoatRoughness: 0.1,
  ior: 1.45
};

const CHROME_STATE: MaterialState = {
  color: new THREE.Color('#D8D8D8'),
  roughness: 0.05,
  metalness: 0.9,
  opacity: 1.0,
  transparent: false,
  transmission: 0,
  thickness: 0,
  envMapIntensity: 1.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.02,
  ior: 2.5
};

export class SculptureManager {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  geometry: THREE.BufferGeometry;
  materialType: MaterialType = 'glass';
  private transitionTarget: MaterialType = 'glass';
  private transitionProgress: number = 1;
  private transitionDuration: number = 0.8;
  private isTransitioning: boolean = false;
  private fromState: MaterialState;
  private toState: MaterialState;
  private tempColor: THREE.Color = new THREE.Color();

  constructor() {
    this.geometry = this.createSculptureGeometry(65);
    this.material = this.createMaterial(GLASS_STATE);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.fromState = { ...GLASS_STATE, color: GLASS_STATE.color.clone() };
    this.toState = { ...GLASS_STATE, color: GLASS_STATE.color.clone() };
  }

  private createSculptureGeometry(targetFaceCount: number): THREE.BufferGeometry {
    let detail = 1;
    const icosahedron = new THREE.IcosahedronGeometry(1.1, detail);
    let faceCount = (icosahedron.attributes.position.count / 3);

    while (faceCount < targetFaceCount * 0.7 && detail < 4) {
      detail++;
      icosahedron.dispose();
      const temp = new THREE.IcosahedronGeometry(1.1, detail);
      faceCount = (temp.attributes.position.count / 3);
      if (faceCount <= targetFaceCount * 1.3) {
        temp.dispose();
      } else {
        break;
      }
    }

    const finalDetail = Math.max(1, detail - 1);
    const geometry = new THREE.IcosahedronGeometry(1.1, finalDetail);

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const vertexCount = positions.count;

    for (let i = 0; i < vertexCount; i++) {
      vertex.fromBufferAttribute(positions, i);
      const length = vertex.length();
      const noise = 1 + (Math.sin(vertex.x * 3.7) * 0.08 +
                        Math.cos(vertex.y * 4.2) * 0.06 +
                        Math.sin(vertex.z * 3.1) * 0.07 +
                        (Math.random() - 0.5) * 0.08);
      vertex.normalize().multiplyScalar(length * noise);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
    geometry.center();

    return geometry;
  }

  private createMaterial(state: MaterialState): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: state.color.clone(),
      roughness: state.roughness,
      metalness: state.metalness,
      transparent: state.transparent,
      opacity: state.opacity,
      transmission: state.transmission,
      thickness: state.thickness,
      envMapIntensity: state.envMapIntensity,
      clearcoat: state.clearcoat,
      clearcoatRoughness: state.clearcoatRoughness,
      ior: state.ior,
      side: THREE.DoubleSide,
      depthWrite: !state.transparent
    });
  }

  private lerpState(from: MaterialState, to: MaterialState, t: number): void {
    this.tempColor.copy(from.color).lerp(to.color, t);
    this.material.color.copy(this.tempColor);
    this.material.roughness = from.roughness + (to.roughness - from.roughness) * t;
    this.material.metalness = from.metalness + (to.metalness - from.metalness) * t;
    this.material.opacity = from.opacity + (to.opacity - from.opacity) * t;
    this.material.transmission = from.transmission + (to.transmission - from.transmission) * t;
    this.material.thickness = from.thickness + (to.thickness - from.thickness) * t;
    this.material.envMapIntensity = from.envMapIntensity + (to.envMapIntensity - from.envMapIntensity) * t;
    this.material.clearcoat = from.clearcoat + (to.clearcoat - from.clearcoat) * t;
    this.material.clearcoatRoughness = from.clearcoatRoughness + (to.clearcoatRoughness - from.clearcoatRoughness) * t;
    this.material.ior = from.ior + (to.ior - from.ior) * t;
    this.material.transparent = to.opacity < 1 || t < 0.5 ? from.transparent : to.transparent;
    this.material.depthWrite = this.material.opacity > 0.95;
    this.material.needsUpdate = true;
  }

  setMaterialType(type: MaterialType, duration: number = 0.8): void {
    if (this.materialType === type && !this.isTransitioning) return;

    const currentState = this.cloneCurrentState();
    const targetState = type === 'glass' ? GLASS_STATE : CHROME_STATE;

    this.fromState = currentState;
    this.toState = { ...targetState, color: targetState.color.clone() };
    this.transitionTarget = type;
    this.transitionDuration = duration;
    this.transitionProgress = 0;
    this.isTransitioning = true;
  }

  private cloneCurrentState(): MaterialState {
    return {
      color: this.material.color.clone(),
      roughness: this.material.roughness,
      metalness: this.material.metalness,
      opacity: this.material.opacity,
      transparent: this.material.transparent,
      transmission: this.material.transmission,
      thickness: this.material.thickness,
      envMapIntensity: this.material.envMapIntensity,
      clearcoat: this.material.clearcoat,
      clearcoatRoughness: this.material.clearcoatRoughness,
      ior: this.material.ior
    };
  }

  updateMaterialTransition(delta: number): void {
    if (!this.isTransitioning) return;

    this.transitionProgress += delta / this.transitionDuration;

    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.isTransitioning = false;
      this.materialType = this.transitionTarget;
      this.lerpState(this.fromState, this.toState, 1);
    } else {
      const eased = this.easeInOutCubic(this.transitionProgress);
      this.lerpState(this.fromState, this.toState, eased);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  regenerateGeometry(faceCount: number): void {
    this.geometry.dispose();
    this.geometry = this.createSculptureGeometry(faceCount);
    this.mesh.geometry = this.geometry;
  }

  setRoughness(value: number): void {
    if (!this.isTransitioning) {
      this.material.roughness = value;
    }
  }

  getFaceCount(): number {
    return this.geometry.attributes.position.count / 3;
  }
}
