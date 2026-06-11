import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Artifact, MaterialPreset } from './dataStore';

export type LoadProgressCallback = (percent: number, artifactName: string) => void;
export type LoadCompleteCallback = () => void;

type AnimationState = {
  model: THREE.Group;
  startTime: number;
  duration: number;
  type: 'fadeIn' | 'fadeOut';
  onComplete?: () => void;
};

type MaterialInfo = {
  originalOpacity: number;
  originalTransparent: boolean;
};

const AUTO_ROTATE_SPEED_DEG = 5;
const AUTO_ROTATE_SPEED_RAD = (AUTO_ROTATE_SPEED_DEG * Math.PI) / 180;
const FADE_DURATION = 500;
const FADE_OUT_SCALE = 0.8;

export class ModelManager {
  private readonly scene: THREE.Scene;
  private readonly loader: GLTFLoader;
  private readonly cache: Map<string, THREE.Group>;
  private currentModel: THREE.Group | null;
  private pendingFadeOut: AnimationState | null;
  private pendingFadeIn: AnimationState | null;
  private materialCache: WeakMap<THREE.Material, MaterialInfo>;

  private isAutoRotating: boolean;
  private autoRotateResumeTime: number;
  private readonly autoRotatePauseDefault: number;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.currentModel = null;
    this.pendingFadeOut = null;
    this.pendingFadeIn = null;
    this.materialCache = new WeakMap();

    this.isAutoRotating = true;
    this.autoRotateResumeTime = 0;
    this.autoRotatePauseDefault = 2000;
  }

  async loadModel(
    artifact: Artifact,
    onProgress?: LoadProgressCallback,
    onComplete?: LoadCompleteCallback
  ): Promise<THREE.Group> {
    const cached = this.cache.get(artifact.id);
    if (cached) {
      if (onProgress) {
        onProgress(100, artifact.name);
      }
      await this.simulateShortDelay();
      const clone = cached.clone(true);
      this.prepareMaterials(clone);
      onComplete?.();
      return clone;
    }

    return new Promise<THREE.Group>((resolve, reject) => {
      let lastProgress = 0;
      const progressInterval = setInterval(() => {
        if (lastProgress < 90) {
          lastProgress = Math.min(90, lastProgress + Math.random() * 8 + 2);
          onProgress?.(lastProgress, artifact.name);
        }
      }, 150);

      this.loader.load(
        artifact.modelPath,
        (gltf) => {
          clearInterval(progressInterval);
          const model = gltf.scene || gltf.scenes?.[0];
          if (!model) {
            reject(new Error(`模型加载失败：${artifact.name} - 未找到场景数据`));
            return;
          }
          onProgress?.(100, artifact.name);
          this.prepareMaterials(model);
          this.centerModel(model, artifact);
          this.applyMaterialPreset(model, artifact.materialPreset);
          const cacheClone = model.clone(true);
          this.cache.set(artifact.id, cacheClone);
          onComplete?.();
          resolve(model);
        },
        (event) => {
          if (event.total > 0) {
            clearInterval(progressInterval);
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress?.(percent, artifact.name);
          }
        },
        (error) => {
          clearInterval(progressInterval);
          console.warn(`[ModelManager] GLB加载失败，使用占位模型: ${artifact.modelPath}`, error);
          const placeholder = this.buildPlaceholderModel(artifact);
          this.cache.set(artifact.id, placeholder.clone(true));
          onProgress?.(100, artifact.name);
          onComplete?.();
          resolve(placeholder);
        }
      );
    });
  }

  async switchModel(
    artifact: Artifact,
    onProgress?: LoadProgressCallback
  ): Promise<void> {
    if (this.pendingFadeIn?.model) {
      this.scene.remove(this.pendingFadeIn.model);
      this.disposeModel(this.pendingFadeIn.model);
      this.pendingFadeIn = null;
    }

    const oldModel = this.currentModel;
    const [newModel] = await Promise.all([
      this.loadModel(artifact, onProgress),
      oldModel ? this.fadeOutModel(oldModel) : Promise.resolve()
    ]);

    this.currentModel = newModel;
    this.scene.add(newModel);
    await this.fadeInModel(newModel);
  }

  pauseAutoRotate(durationMs: number = this.autoRotatePauseDefault): void {
    this.isAutoRotating = false;
    this.autoRotateResumeTime = performance.now() + durationMs;
  }

  update(delta: number): void {
    if (!this.isAutoRotating && performance.now() >= this.autoRotateResumeTime) {
      this.isAutoRotating = true;
    }

    if (this.isAutoRotating && this.currentModel) {
      this.currentModel.rotation.y += AUTO_ROTATE_SPEED_RAD * delta;
    }

    this.tickAnimations();
  }

  centerModel(model: THREE.Group, artifact: Artifact): void {
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    model.position.sub(center);

    const targetSize = 2.8;
    const maxDim = Math.max(size.x, size.y, size.z);
    const baseScale = maxDim > 0 ? targetSize / maxDim : 1;
    const finalScale = baseScale * artifact.scale;
    model.scale.setScalar(finalScale);

    const reBox = new THREE.Box3().setFromObject(model);
    const reCenter = new THREE.Vector3();
    reBox.getCenter(reCenter);
    model.position.y -= reCenter.y;
    model.position.y += reBox.getSize(new THREE.Vector3()).y / 2;
  }

  applyMaterialPreset(model: THREE.Group, preset: MaterialPreset): void {
    const presetParams: Record<MaterialPreset, { metalness: number; roughness: number; envMapIntensity: number; }> = {
      bronze: { metalness: 0.88, roughness: 0.28, envMapIntensity: 1.1 },
      porcelain: { metalness: 0.08, roughness: 0.12, envMapIntensity: 1.6 },
      jade: { metalness: 0.15, roughness: 0.2, envMapIntensity: 1.3 },
      iron: { metalness: 0.9, roughness: 0.35, envMapIntensity: 0.9 }
    };
    const params = presetParams[preset];

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          mat.metalness = params.metalness;
          mat.roughness = params.roughness;
          mat.envMapIntensity = params.envMapIntensity;
          mat.needsUpdate = true;
        }
      }
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }

  dispose(): void {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.disposeModel(this.currentModel);
      this.currentModel = null;
    }
    for (const cached of this.cache.values()) {
      this.disposeModel(cached);
    }
    this.cache.clear();
  }

  getCurrentModel(): THREE.Group | null {
    return this.currentModel;
  }

  private prepareMaterials(model: THREE.Group): void {
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!this.materialCache.has(mat)) {
          this.materialCache.set(mat, {
            originalOpacity: (mat as THREE.Material & { opacity?: number }).opacity ?? 1,
            originalTransparent: !!(mat as THREE.Material & { transparent?: boolean }).transparent
          });
        }
        (mat as THREE.Material & { transparent: boolean }).transparent = true;
      }
    });
  }

  private setModelOpacity(model: THREE.Group, opacity: number): void {
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        const info = this.materialCache.get(mat);
        const original = info?.originalOpacity ?? 1;
        (mat as THREE.Material & { opacity: number }).opacity = original * opacity;
      }
    });
  }

  private setModelScale(model: THREE.Group, target: THREE.Vector3, baseScale: THREE.Vector3, progress: number): void {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    model.scale.lerpVectors(baseScale, target, p);
  }

  private fadeOutModel(model: THREE.Group): Promise<void> {
    return new Promise((resolve) => {
      const baseScale = model.scale.clone();
      const targetScale = baseScale.clone().multiplyScalar(FADE_OUT_SCALE);
      this.pendingFadeOut = {
        model,
        startTime: performance.now(),
        duration: FADE_DURATION,
        type: 'fadeOut',
        onComplete: () => {
          this.scene.remove(model);
          this.disposeModel(model);
          if (this.currentModel === model) {
            this.currentModel = null;
          }
          this.pendingFadeOut = null;
          resolve();
        }
      };
      (this.pendingFadeOut as unknown as { baseScale: THREE.Vector3; targetScale: THREE.Vector3 }).baseScale = baseScale;
      (this.pendingFadeOut as unknown as { baseScale: THREE.Vector3; targetScale: THREE.Vector3 }).targetScale = targetScale;
    });
  }

  private fadeInModel(model: THREE.Group): Promise<void> {
    return new Promise((resolve) => {
      const targetScale = model.scale.clone();
      const baseScale = targetScale.clone().multiplyScalar(FADE_OUT_SCALE);
      model.scale.copy(baseScale);
      this.setModelOpacity(model, 0);
      this.pendingFadeIn = {
        model,
        startTime: performance.now(),
        duration: FADE_DURATION,
        type: 'fadeIn',
        onComplete: () => {
          this.pendingFadeIn = null;
          resolve();
        }
      };
      (this.pendingFadeIn as unknown as { baseScale: THREE.Vector3; targetScale: THREE.Vector3 }).baseScale = baseScale;
      (this.pendingFadeIn as unknown as { baseScale: THREE.Vector3; targetScale: THREE.Vector3 }).targetScale = targetScale;
    });
  }

  private tickAnimations(): void {
    const now = performance.now();
    for (const state of [this.pendingFadeOut, this.pendingFadeIn]) {
      if (!state) continue;
      const elapsed = now - state.startTime;
      const rawProgress = THREE.MathUtils.clamp(elapsed / state.duration, 0, 1);
      const eased = this.easeInOut(rawProgress);
      const { baseScale, targetScale } = state as unknown as { baseScale: THREE.Vector3; targetScale: THREE.Vector3 };

      if (state.type === 'fadeOut') {
        this.setModelOpacity(state.model, 1 - eased);
        this.setModelScale(state.model, targetScale, baseScale, eased);
      } else {
        this.setModelOpacity(state.model, eased);
        this.setModelScale(state.model, targetScale, baseScale, eased);
      }

      if (rawProgress >= 1) {
        state.onComplete?.();
      }
    }
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private simulateShortDelay(): Promise<void> {
    return new Promise((res) => setTimeout(res, 150));
  }

  private disposeModel(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of mats) mat?.dispose();
      }
    });
  }

  private buildPlaceholderModel(artifact: Artifact): THREE.Group {
    const group = new THREE.Group();
    group.name = `placeholder-${artifact.id}`;
    const preset = artifact.materialPreset;
    const materialParams = this.getPlaceholderMaterialParams(preset);

    switch (artifact.placeholderType) {
      case 'vase':
        this.buildVasePlaceholder(group, materialParams);
        break;
      case 'ding':
        this.buildDingPlaceholder(group, materialParams);
        break;
      case 'jade':
        this.buildJadePlaceholder(group, materialParams);
        break;
      case 'sword':
        this.buildSwordPlaceholder(group, materialParams);
        break;
    }

    this.applyMaterialPreset(group, preset);
    this.centerModel(group, artifact);
    return group;
  }

  private getPlaceholderMaterialParams(preset: MaterialPreset): { color: number; emissive?: number; } {
    switch (preset) {
      case 'bronze':
        return { color: 0x8a6d3b, emissive: 0x1a1408 };
      case 'porcelain':
        return { color: 0xf0ebe0, emissive: 0x080a18 };
      case 'jade':
        return { color: 0xc9e4c3, emissive: 0x0a1810 };
      case 'iron':
        return { color: 0x5a5a60, emissive: 0x101018 };
    }
  }

  private buildVasePlaceholder(group: THREE.Group, params: { color: number; emissive?: number }): void {
    const mat = new THREE.MeshStandardMaterial({
      color: params.color,
      emissive: params.emissive ?? 0x000000,
      metalness: 0.2,
      roughness: 0.15
    });
    const blueMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a8a,
      metalness: 0.1,
      roughness: 0.2
    });

    const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 32), mat);
    mouth.position.y = 2.15;
    group.add(mouth);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.5, 32), mat);
    neck.position.y = 1.8;
    group.add(neck);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.85, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2.3), mat);
    shoulder.position.y = 1.3;
    shoulder.scale.y = 0.7;
    group.add(shoulder);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 32), mat);
    body.position.y = 0.7;
    body.scale.set(1, 1.1, 1);
    group.add(body);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.03, 12, 32),
        blueMat
      );
      ring.position.set(
        Math.cos(angle) * 0.7,
        0.7 + Math.sin(i * 1.2) * 0.2,
        Math.sin(angle) * 0.7
      );
      ring.rotation.y = -angle;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.3, 32), mat);
    waist.position.y = 0.05;
    group.add(waist);

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.3, 32), mat);
    foot.position.y = -0.25;
    group.add(foot);
  }

  private buildDingPlaceholder(group: THREE.Group, params: { color: number; emissive?: number }): void {
    const mat = new THREE.MeshStandardMaterial({
      color: params.color,
      emissive: params.emissive ?? 0x000000,
      metalness: 0.85,
      roughness: 0.3
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x5a4020,
      metalness: 0.7,
      roughness: 0.45
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 1.6), mat);
    body.position.y = 0.3;
    group.add(body);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.15, 1.75), darkMat);
    rim.position.y = 1.02;
    group.add(rim);

    const ear1 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 12, 24, Math.PI), darkMat);
    ear1.position.set(-1.1, 1.1, 0);
    ear1.rotation.z = Math.PI / 2;
    group.add(ear1);

    const ear2 = ear1.clone();
    ear2.position.x = 1.1;
    group.add(ear2);

    const footPositions: [number, number][] = [
      [-0.7, -0.7],
      [0.7, -0.7],
      [-0.7, 0.7],
      [0.7, 0.7]
    ];
    for (const [x, z] of footPositions) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), darkMat);
      foot.position.set(x, -0.7, z);
      group.add(foot);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 4), darkMat);
      tip.position.set(x, -1.2, z);
      tip.rotation.y = Math.PI / 4;
      group.add(tip);
    }

    for (let i = 0; i < 8; i++) {
      const pattern = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.06, 0.02, 32, 8),
        darkMat
      );
      pattern.position.set(
        -0.8 + (i % 4) * 0.55,
        0.3 + Math.floor(i / 4) * 0.35,
        0.81
      );
      pattern.scale.y = 0.5;
      group.add(pattern);
    }
  }

  private buildJadePlaceholder(group: THREE.Group, params: { color: number; emissive?: number }): void {
    const mat = new THREE.MeshStandardMaterial({
      color: params.color,
      emissive: params.emissive ?? 0x000000,
      metalness: 0.15,
      roughness: 0.18,
      transparent: true,
      opacity: 0.9
    });
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x9dc498,
      metalness: 0.1,
      roughness: 0.22,
      transparent: true,
      opacity: 0.85
    });

    const outer = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.32, 32, 64), mat);
    outer.rotation.x = Math.PI / 2;
    group.add(outer);

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const grain = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xbfe0b8,
          metalness: 0.1,
          roughness: 0.2,
          transparent: true,
          opacity: 0.7
        })
      );
      grain.position.set(
        Math.cos(angle) * 1.2,
        Math.sin(angle) * 0.18,
        Math.sin(angle) * 1.2
      );
      group.add(grain);
    }

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 64), innerMat);
    inner.rotation.x = Math.PI / 2;
    group.add(inner);

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const dragon = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.15, 0.035, 48, 12, 2, 5),
        innerMat
      );
      dragon.position.set(
        Math.cos(angle) * 0.35,
        0.08,
        Math.sin(angle) * 0.35
      );
      dragon.rotation.set(Math.PI / 2, 0, angle);
      group.add(dragon);
    }
  }

  private buildSwordPlaceholder(group: THREE.Group, params: { color: number; emissive?: number }): void {
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x7a8090,
      emissive: 0x0a0c14,
      metalness: 0.92,
      roughness: 0.18
    });
    const hiltMat = new THREE.MeshStandardMaterial({
      color: params.color,
      emissive: params.emissive ?? 0x000000,
      metalness: 0.8,
      roughness: 0.32
    });
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x3a6ea8,
      emissive: 0x0a1828,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85
    });

    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.quadraticCurveTo(0.1, 1.2, 0, 2.5);
    bladeShape.quadraticCurveTo(-0.1, 1.2, 0, 0);
    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.01,
      bevelSegments: 2
    });
    bladeGeo.center();
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 1.45;
    blade.rotation.x = Math.PI / 2;
    group.add(blade);

    const ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 2.4, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x5a6070,
        metalness: 0.9,
        roughness: 0.25
      })
    );
    ridge.position.y = 1.45;
    group.add(ridge);

    for (let i = 0; i < 12; i++) {
      const y = 0.4 + i * 0.18;
      const pattern = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.08, 0.12),
        hiltMat
      );
      pattern.position.set((i % 2 === 0 ? -1 : 1) * 0.07, y, 0);
      group.add(pattern);
    }

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.25), hiltMat);
    guard.position.y = 0.1;
    group.add(guard);

    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), gemMat);
    gem.position.y = 0.12;
    group.add(gem);

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.7, 16),
      new THREE.MeshStandardMaterial({
        color: 0x3a2a18,
        metalness: 0.1,
        roughness: 0.7
      })
    );
    handle.position.y = -0.3;
    group.add(handle);

    for (let i = 0; i < 5; i++) {
      const wrap = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.012, 8, 24),
        hiltMat
      );
      wrap.position.y = -0.05 - i * 0.13;
      wrap.rotation.x = Math.PI / 2;
      group.add(wrap);
    }

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), hiltMat);
    pommel.position.y = -0.7;
    pommel.scale.y = 0.8;
    group.add(pommel);
  }
}
