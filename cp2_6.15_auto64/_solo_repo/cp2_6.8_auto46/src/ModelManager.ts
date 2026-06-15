import * as THREE from 'three';

export type GeometryType = 'sphere' | 'cube' | 'torus';

export interface MaterialParams {
  roughness: number;
  metalness: number;
  aoMapIntensity: number;
}

const DEFAULT_PARAMS: MaterialParams = {
  roughness: 0.5,
  metalness: 0.0,
  aoMapIntensity: 0.3
};

const GEOMETRY_CONFIGS: Record<GeometryType, () => THREE.BufferGeometry> = {
  sphere: () => new THREE.SphereGeometry(2, 64, 64),
  cube: () => new THREE.BoxGeometry(2.5, 2.5, 2.5, 1, 1, 1),
  torus: () => new THREE.TorusGeometry(1.5, 0.6, 32, 100)
};

export class ModelManager {
  private scene: THREE.Scene;
  private currentMesh: THREE.Mesh | null = null;
  private currentGeometryType: GeometryType = 'sphere';
  private material: THREE.MeshStandardMaterial;
  private materialParams: MaterialParams = { ...DEFAULT_PARAMS };
  private fadeAnimationId: number | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.material = this.createMaterial();
    this.createInitialModel();
  }

  private createMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: this.materialParams.roughness,
      metalness: this.materialParams.metalness,
      aoMapIntensity: this.materialParams.aoMapIntensity
    });

    const aoMap = this.createAmbientOcclusionMap();
    material.aoMap = aoMap;
    material.needsUpdate = true;

    return material;
  }

  private createAmbientOcclusionMap(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.7, '#cccccc');
    gradient.addColorStop(1, '#666666');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
  }

  private createInitialModel(): void {
    const geometry = GEOMETRY_CONFIGS.sphere();
    this.currentMesh = new THREE.Mesh(geometry, this.material);
    this.currentMesh.castShadow = true;
    this.currentMesh.receiveShadow = true;
    this.scene.add(this.currentMesh);
  }

  public switchGeometry(type: GeometryType): Promise<void> {
    return new Promise((resolve) => {
      if (type === this.currentGeometryType || !this.currentMesh) {
        resolve();
        return;
      }

      if (this.fadeAnimationId !== null) {
        cancelAnimationFrame(this.fadeAnimationId);
      }

      const oldMesh = this.currentMesh;
      const oldMaterial = this.material.clone();
      oldMesh.material = oldMaterial;

      const newGeometry = GEOMETRY_CONFIGS[type]();
      const newMaterial = this.material.clone();
      newMaterial.transparent = true;
      newMaterial.opacity = 0;

      const newMesh = new THREE.Mesh(newGeometry, newMaterial);
      newMesh.castShadow = true;
      newMesh.receiveShadow = true;
      this.scene.add(newMesh);

      const fadeDuration = 300;
      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / fadeDuration, 1);

        if (progress < 0.5) {
          const fadeOutProgress = progress * 2;
          oldMaterial.opacity = 1 - fadeOutProgress;
          oldMaterial.transparent = true;
        } else {
          if (oldMesh.parent) {
            this.scene.remove(oldMesh);
            oldMesh.geometry.dispose();
            (oldMesh.material as THREE.Material).dispose();
          }
          const fadeInProgress = (progress - 0.5) * 2;
          newMaterial.opacity = fadeInProgress;
        }

        if (progress < 1) {
          this.fadeAnimationId = requestAnimationFrame(animate);
        } else {
          newMaterial.transparent = false;
          newMaterial.opacity = 1;
          this.currentMesh = newMesh;
          this.currentGeometryType = type;
          this.material = newMaterial;
          this.material.needsUpdate = true;
          this.fadeAnimationId = null;
          resolve();
        }
      };

      animate();
    });
  }

  public updateMaterialParams(params: Partial<MaterialParams>): void {
    this.materialParams = { ...this.materialParams, ...params };

    if (params.roughness !== undefined) {
      this.material.roughness = params.roughness;
    }
    if (params.metalness !== undefined) {
      this.material.metalness = params.metalness;
    }
    if (params.aoMapIntensity !== undefined) {
      this.material.aoMapIntensity = params.aoMapIntensity;
    }

    this.material.needsUpdate = true;
  }

  public getMaterialParams(): MaterialParams {
    return { ...this.materialParams };
  }

  public getCurrentGeometryType(): GeometryType {
    return this.currentGeometryType;
  }

  public reset(): void {
    this.switchGeometry('sphere').then(() => {
      this.updateMaterialParams({ ...DEFAULT_PARAMS });
    });
  }

  public dispose(): void {
    if (this.fadeAnimationId !== null) {
      cancelAnimationFrame(this.fadeAnimationId);
    }
    if (this.currentMesh) {
      this.currentMesh.geometry.dispose();
      this.material.dispose();
      this.scene.remove(this.currentMesh);
    }
  }
}
