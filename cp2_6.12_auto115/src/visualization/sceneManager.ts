import * as THREE from 'three';
import type { StreetData, StreetDiff, SplitMode } from '../experiment/types';
import { createStreetSceneGroup, createBuildingMesh, createTreeMesh, lerpColor } from './modelBuilder';
import { computeInterpolatedBuilding } from '../experiment/dataModule';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private leftSceneGroup: THREE.Group;
  private rightSceneGroup: THREE.Group;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private originalData: StreetData | null = null;
  private diffData: StreetDiff | null = null;
  private animationProgress: number = 0;
  private buildingColor: string = '#8B4513';
  private greeneryDensity: number = 35;
  private lightAngle: number = 0;
  private splitMode: SplitMode = 'horizontal';
  private splitPosition: number = 50;
  private containerWidth: number = 800;
  private containerHeight: number = 600;
  private colorTransitionStart: number = 0;
  private colorTransitionEnd: number = 0;
  private targetBuildingColor: string = '#8B4513';
  private currentBuildingColor: string = '#8B4513';
  private animationFrameId: number | null = null;
  private onFrameCallback?: () => void;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.containerWidth / this.containerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 25, 40);
    this.camera.lookAt(0, 0, 0);

    this.leftSceneGroup = new THREE.Group();
    this.leftSceneGroup.name = 'leftScene';
    this.rightSceneGroup = new THREE.Group();
    this.rightSceneGroup.name = 'rightScene';

    this.scene.add(this.leftSceneGroup);
    this.scene.add(this.rightSceneGroup);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(30, 40, 30);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.left = -60;
    this.directionalLight.shadow.camera.right = 60;
    this.directionalLight.shadow.camera.top = 60;
    this.directionalLight.shadow.camera.bottom = -60;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 200;
    this.scene.add(this.directionalLight);
  }

  init(canvas: HTMLCanvasElement, width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.startAnimationLoop();
  }

  setOnFrameCallback(callback: () => void): void {
    this.onFrameCallback = callback;
  }

  loadStreetData(original: StreetData, diff: StreetDiff): void {
    this.originalData = original;
    this.diffData = diff;
    this.buildingColor = original.buildings[0]?.color || '#8B4513';
    this.currentBuildingColor = this.buildingColor;
    this.targetBuildingColor = this.buildingColor;
    this.greeneryDensity = original.greeneryDensity;
    this.lightAngle = original.lightAngle;

    this.rebuildScenes();
  }

  private rebuildScenes(): void {
    if (!this.originalData || !this.diffData) return;

    this.clearGroup(this.leftSceneGroup);
    this.clearGroup(this.rightSceneGroup);

    const leftData = computeInterpolatedBuilding(this.originalData, this.diffData, this.animationProgress);
    this.applyBuildingColor(leftData, this.currentBuildingColor);
    this.applyGreeneryDensity(leftData, this.greeneryDensity);

    const rightData = { ...this.originalData };
    this.applyBuildingColor(rightData, this.currentBuildingColor);

    const leftGroup = createStreetSceneGroup(
      leftData.buildings,
      leftData.trees,
      leftData.streetLights,
      leftData.streetWidth,
      leftData.streetLength,
      leftData.groundColor
    );
    this.leftSceneGroup.add(leftGroup);

    const rightGroup = createStreetSceneGroup(
      rightData.buildings,
      rightData.trees,
      rightData.streetLights,
      rightData.streetWidth,
      rightData.streetLength,
      rightData.groundColor
    );
    this.rightSceneGroup.add(rightGroup);

    this.updateSplitMode();
    this.updateLightAngle();
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Group) {
        this.clearGroup(child);
      }
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  private applyBuildingColor(data: StreetData, color: string): void {
    data.buildings.forEach(b => {
      b.color = color;
    });
  }

  private applyGreeneryDensity(data: StreetData, density: number): void {
    const maxTrees = data.trees.length + 10;
    const targetCount = Math.floor((density / 100) * maxTrees);
    const currentCount = data.trees.length;

    if (targetCount > currentCount) {
      const toAdd = targetCount - currentCount;
      for (let i = 0; i < toAdd; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const z = -30 + Math.random() * 60;
        const x = side * (2 + Math.random() * 4);
        data.trees.push({
          id: `tree-dynamic-${Date.now()}-${i}`,
          position: [x, -5, z],
          scale: 0.8 + Math.random() * 0.4,
          trunkColor: '#8B4513',
          foliageColor: '#228B22',
        });
      }
    } else if (targetCount < currentCount) {
      data.trees = data.trees.slice(0, targetCount);
    }
  }

  setAnimationProgress(progress: number): void {
    this.animationProgress = Math.max(0, Math.min(100, progress));
    if (this.originalData && this.diffData) {
      this.clearGroup(this.leftSceneGroup);
      const leftData = computeInterpolatedBuilding(this.originalData, this.diffData, this.animationProgress);
      this.applyBuildingColor(leftData, this.currentBuildingColor);
      this.applyGreeneryDensity(leftData, this.greeneryDensity);

      const leftGroup = createStreetSceneGroup(
        leftData.buildings,
        leftData.trees,
        leftData.streetLights,
        leftData.streetWidth,
        leftData.streetLength,
        leftData.groundColor
      );
      this.leftSceneGroup.add(leftGroup);
    }
  }

  setBuildingColor(color: string): void {
    this.targetBuildingColor = color;
    this.colorTransitionStart = performance.now();
    this.colorTransitionEnd = this.colorTransitionStart + 1000;
  }

  private updateColorTransition(): void {
    if (this.currentBuildingColor === this.targetBuildingColor) return;

    const now = performance.now();
    const t = Math.min(1, (now - this.colorTransitionStart) / (this.colorTransitionEnd - this.colorTransitionStart));
    const eased = this.easeInOutCubic(t);
    this.currentBuildingColor = lerpColor(this.buildingColor, this.targetBuildingColor, eased);

    if (t >= 1) {
      this.buildingColor = this.targetBuildingColor;
      this.currentBuildingColor = this.targetBuildingColor;
    }

    this.updateBuildingColorsInScene(this.leftSceneGroup, this.currentBuildingColor);
    this.updateBuildingColorsInScene(this.rightSceneGroup, this.currentBuildingColor);
  }

  private updateBuildingColorsInScene(group: THREE.Group, color: string): void {
    const threeColor = new THREE.Color(color);
    group.traverse(obj => {
      if (obj instanceof THREE.Mesh && obj.name === 'walls') {
        (obj.material as THREE.MeshStandardMaterial).color.copy(threeColor);
      }
    });
  }

  setGreeneryDensity(density: number): void {
    this.greeneryDensity = Math.max(0, Math.min(100, density));
    if (this.originalData && this.diffData) {
      const leftData = computeInterpolatedBuilding(this.originalData, this.diffData, this.animationProgress);
      this.applyGreeneryDensity(leftData, this.greeneryDensity);
      this.applyBuildingColor(leftData, this.currentBuildingColor);

      this.clearGroup(this.leftSceneGroup);
      const leftGroup = createStreetSceneGroup(
        leftData.buildings,
        leftData.trees,
        leftData.streetLights,
        leftData.streetWidth,
        leftData.streetLength,
        leftData.groundColor
      );
      this.leftSceneGroup.add(leftGroup);
    }
  }

  setLightAngle(angle: number): void {
    this.lightAngle = Math.max(-90, Math.min(90, angle));
    this.updateLightAngle();
  }

  private updateLightAngle(): void {
    const radians = (this.lightAngle * Math.PI) / 180;
    const radius = 50;
    const height = 40;

    this.directionalLight.position.x = Math.sin(radians) * radius;
    this.directionalLight.position.z = Math.cos(radians) * radius;
    this.directionalLight.position.y = height;
    this.directionalLight.lookAt(0, 0, 0);

    this.updateSkyColor();
  }

  private updateSkyColor(): void {
    const normalizedAngle = (this.lightAngle + 90) / 180;
    let skyColor: THREE.Color;

    if (normalizedAngle < 0.5) {
      const t = normalizedAngle / 0.5;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x9370db),
        new THREE.Color(0xffa500),
        t
      );
    } else {
      const t = (normalizedAngle - 0.5) / 0.5;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xffa500),
        new THREE.Color(0x87ceeb),
        t
      );
    }

    this.scene.background = skyColor;
  }

  setSplitMode(mode: SplitMode): void {
    this.splitMode = mode;
    this.updateSplitMode();
  }

  setSplitPosition(position: number): void {
    this.splitPosition = Math.max(0, Math.min(100, position));
    this.updateSplitMode();
  }

  private updateSplitMode(): void {
    const offset = this.splitMode === 'horizontal' 
      ? (this.splitPosition - 50) * 0.3
      : 0;
    const verticalOffset = this.splitMode === 'vertical'
      ? (this.splitPosition - 50) * 0.3
      : 0;

    this.leftSceneGroup.position.x = -15 + offset;
    this.leftSceneGroup.position.z = verticalOffset;
    this.rightSceneGroup.position.x = 15 + offset;
    this.rightSceneGroup.position.z = verticalOffset;

    if (this.splitMode === 'overlay') {
      this.leftSceneGroup.position.x = 0;
      this.rightSceneGroup.position.x = 0;
      this.leftSceneGroup.visible = true;
      this.rightSceneGroup.visible = true;
      this.rightSceneGroup.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          (obj.material as THREE.MeshStandardMaterial).transparent = true;
          (obj.material as THREE.MeshStandardMaterial).opacity = 0.6;
        }
      });
    } else {
      this.rightSceneGroup.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          (obj.material as THREE.MeshStandardMaterial).transparent = false;
          (obj.material as THREE.MeshStandardMaterial).opacity = 1.0;
        }
      });
    }
  }

  syncCamera(otherCamera: THREE.PerspectiveCamera): void {
    this.camera.position.copy(otherCamera.position);
    this.camera.rotation.copy(otherCamera.rotation);
    this.camera.updateProjectionMatrix();
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  resize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height);
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.updateColorTransition();
      this.animateTrees();
      this.render();
      this.onFrameCallback?.();
    };
    animate();
  }

  private animateTrees(): void {
    const time = performance.now() * 0.001;
    this.leftSceneGroup.traverse(obj => {
      if (obj instanceof THREE.Group && obj.name.startsWith('tree-')) {
        const foliage = obj.children.find(c => c.name === 'foliage');
        if (foliage) {
          foliage.rotation.y = Math.sin(time + obj.position.x) * 0.1;
        }
      }
    });
    this.rightSceneGroup.traverse(obj => {
      if (obj instanceof THREE.Group && obj.name.startsWith('tree-')) {
        const foliage = obj.children.find(c => c.name === 'foliage');
        if (foliage) {
          foliage.rotation.y = Math.sin(time + obj.position.x) * 0.1;
        }
      }
    });
  }

  private render(): void {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clearGroup(this.leftSceneGroup);
    this.clearGroup(this.rightSceneGroup);
    this.renderer?.dispose();
  }

  getState() {
    return {
      animationProgress: this.animationProgress,
      buildingColor: this.buildingColor,
      greeneryDensity: this.greeneryDensity,
      lightAngle: this.lightAngle,
      splitMode: this.splitMode,
      splitPosition: this.splitPosition,
    };
  }
}

export const sceneManager = new SceneManager();
