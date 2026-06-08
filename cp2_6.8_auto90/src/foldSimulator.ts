import * as THREE from 'three';
import { origamiModels, interpolateKeyframes, OrigamiModel } from './models';

export class FoldSimulator {
  private scene: THREE.Scene;
  private frontMesh!: THREE.Mesh;
  private backMesh!: THREE.Mesh;
  private wireframeMesh!: THREE.LineSegments;
  private baseGeometry!: THREE.PlaneGeometry;
  private wireframeGeometry!: THREE.BufferGeometry;
  private wireIndices!: Uint16Array;
  private currentModel!: OrigamiModel;
  private foldProgress: number = 0;
  private interpolatedOffsets!: Float32Array;
  private basePositions!: Float32Array;
  private frontMaterial!: THREE.MeshPhongMaterial;
  private backMaterial!: THREE.MeshPhongMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loadModel('crane');
  }

  loadModel(modelName: string): void {
    if (!origamiModels[modelName]) {
      console.warn(`Model '${modelName}' not found, using default 'crane'`);
      modelName = 'crane';
    }

    if (this.frontMesh) {
      this.scene.remove(this.frontMesh);
      this.frontMesh.geometry.dispose();
      (this.frontMesh.material as THREE.Material).dispose();
    }
    if (this.backMesh) {
      this.scene.remove(this.backMesh);
      this.backMesh.geometry.dispose();
      (this.backMesh.material as THREE.Material).dispose();
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.geometry.dispose();
      (this.wireframeMesh.material as THREE.Material).dispose();
    }

    this.currentModel = origamiModels[modelName];
    const { gridSize, paperSize } = this.currentModel;

    this.baseGeometry = new THREE.PlaneGeometry(
      paperSize,
      paperSize,
      gridSize,
      gridSize
    );

    const posAttr = this.baseGeometry.attributes.position as THREE.BufferAttribute;
    const vertCount = posAttr.count;
    this.basePositions = new Float32Array(posAttr.array as Float32Array);
    this.interpolatedOffsets = new Float32Array(vertCount * 3);

    this.frontMaterial = new THREE.MeshPhongMaterial({
      color: 0xFAF8F0,
      side: THREE.FrontSide,
      transparent: true,
      opacity: 0.92,
      shininess: 80,
      specular: new THREE.Color(0xFFFFFF),
      emissive: new THREE.Color(0x000000),
      flatShading: false
    });

    this.backMaterial = new THREE.MeshPhongMaterial({
      color: 0xE8E0D0,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.92,
      shininess: 60,
      specular: new THREE.Color(0xFFFFFF),
      emissive: new THREE.Color(0x000000),
      flatShading: false
    });

    this.frontMesh = new THREE.Mesh(this.baseGeometry, this.frontMaterial);
    this.frontMesh.castShadow = true;
    this.frontMesh.receiveShadow = true;
    this.scene.add(this.frontMesh);

    this.backMesh = new THREE.Mesh(this.baseGeometry, this.backMaterial);
    this.backMesh.castShadow = true;
    this.backMesh.receiveShadow = true;
    this.scene.add(this.backMesh);

    const tempWireGeo = new THREE.WireframeGeometry(this.baseGeometry);
    const tempPos = tempWireGeo.attributes.position.array as Float32Array;
    
    this.wireframeGeometry = new THREE.BufferGeometry();
    const wirePositions = new Float32Array(tempPos.length);
    this.wireframeGeometry.setAttribute('position', new THREE.BufferAttribute(wirePositions, 3));
    
    const geoIndex = this.baseGeometry.index;
    const indexCount = geoIndex ? geoIndex.count : (this.baseGeometry.attributes.position.count / 3) * 3;
    this.wireIndices = new Uint16Array(indexCount * 2);
    
    const baseIdx = geoIndex ? geoIndex.array : null;
    let wi = 0;
    const triCount = indexCount / 3;
    for (let t = 0; t < triCount; t++) {
      const i0 = baseIdx ? baseIdx[t * 3] : t * 3;
      const i1 = baseIdx ? baseIdx[t * 3 + 1] : t * 3 + 1;
      const i2 = baseIdx ? baseIdx[t * 3 + 2] : t * 3 + 2;
      this.wireIndices[wi++] = i0;
      this.wireIndices[wi++] = i1;
      this.wireIndices[wi++] = i1;
      this.wireIndices[wi++] = i2;
      this.wireIndices[wi++] = i2;
      this.wireIndices[wi++] = i0;
    }

    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0xC8C0B0,
      transparent: true,
      opacity: 0.55
    });
    this.wireframeMesh = new THREE.LineSegments(this.wireframeGeometry, wireframeMat);
    this.scene.add(this.wireframeMesh);

    this.setFoldProgress(0);
  }

  setFoldProgress(progress: number): void {
    this.foldProgress = Math.max(0, Math.min(1, progress));
    
    interpolateKeyframes(
      this.currentModel.keyframes,
      this.foldProgress,
      this.interpolatedOffsets
    );

    const posAttr = this.baseGeometry.attributes.position as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;

    for (let i = 0; i < this.basePositions.length; i += 3) {
      positions[i]     = this.basePositions[i]     + this.interpolatedOffsets[i];
      positions[i + 1] = this.basePositions[i + 1] + this.interpolatedOffsets[i + 1];
      positions[i + 2] = this.basePositions[i + 2] + this.interpolatedOffsets[i + 2];
    }

    this.baseGeometry.computeVertexNormals();
    posAttr.needsUpdate = true;

    const wirePosAttr = this.wireframeGeometry.attributes.position as THREE.BufferAttribute;
    const wirePositions = wirePosAttr.array as Float32Array;
    
    for (let i = 0; i < this.wireIndices.length; i++) {
      const vi = this.wireIndices[i] * 3;
      wirePositions[i * 3]     = this.basePositions[vi]     + this.interpolatedOffsets[vi];
      wirePositions[i * 3 + 1] = this.basePositions[vi + 1] + this.interpolatedOffsets[vi + 1];
      wirePositions[i * 3 + 2] = this.basePositions[vi + 2] + this.interpolatedOffsets[vi + 2];
    }
    wirePosAttr.needsUpdate = true;

    this.updateMaterialShading();
  }

  private updateMaterialShading(): void {
    const highlightIntensity = this.foldProgress;
    this.frontMaterial.specular = new THREE.Color(0xFFFFFF);
    this.frontMaterial.shininess = 60 + highlightIntensity * 60;
    
    this.backMaterial.specular = new THREE.Color(0xF5F0E8);
    this.backMaterial.shininess = 40 + highlightIntensity * 40;
  }

  getFoldProgress(): number {
    return this.foldProgress;
  }

  getCurrentModelName(): string {
    return this.currentModel.name;
  }

  reset(): void {
    this.setFoldProgress(0);
  }

  dispose(): void {
    if (this.frontMesh) {
      this.scene.remove(this.frontMesh);
      this.frontMesh.geometry.dispose();
      (this.frontMesh.material as THREE.Material).dispose();
    }
    if (this.backMesh) {
      this.scene.remove(this.backMesh);
      (this.backMesh.material as THREE.Material).dispose();
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.geometry.dispose();
      (this.wireframeMesh.material as THREE.Material).dispose();
    }
  }
}
