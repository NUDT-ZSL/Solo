/**
 * 应用主入口模块
 * 
 * 职责：初始化Three.js场景、相机、渲染器，管理主循环和参数面板事件，
 *      整合pattern.ts和ui.ts模块，协调整个应用的运行
 * 
 * 数据流向：
 *   UI事件（ui.ts）→ 参数变化（main.ts）→ 纹理更新（pattern.ts）
 *   → 材质更新 → 触发渲染循环 → 屏幕显示
 * 
 * 调用关系：
 *   - 导入并实例化 pattern.ts 的 CloudPatternGenerator
 *     - 调用 patternGenerator.setParams() 响应参数变化
 *     - 调用 patternGenerator.update() 每帧更新纹理流动
 *     - 调用 patternGenerator.getTexture() 获取纹理用于材质
 *   - 导入并实例化 ui.ts 的 UIPanel
 *     - 传入 handleParamChange 回调接收参数变化
 *     - 传入 handleShapeChange 回调接收形状切换
 *     - 传入 handleReset 回调接收重置事件
 *   - 使用 Three.js 库进行三维渲染
 *   - 使用 OrbitControls 实现视角交互
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CloudPatternGenerator, type PatternParams } from './pattern';
import { UIPanel, type ShapeType, DEFAULT_PARAMS } from './ui';

class CloudLoomApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private canvasContainer: HTMLElement;

  private patternGenerator: CloudPatternGenerator;

  private currentMesh: THREE.Mesh | null = null;
  private currentShape: ShapeType = 'cylinder';
  private transitionProgress: number = 1;
  private isTransitioning: boolean = false;
  private targetShape: ShapeType | null = null;
  private oldMesh: THREE.Mesh | null = null;
  private readonly TRANSITION_DURATION: number = 0.5;

  private resetFlashProgress: number = 1;
  private isResetFlashing: boolean = false;
  private readonly FLASH_DURATION: number = 0.3;

  private clock: THREE.Clock;
  private animationId: number | null = null;

  private starField: THREE.Points | null = null;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a15);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvasContainer.clientWidth / this.canvasContainer.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.canvasContainer.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0, 0);

    this.clock = new THREE.Clock();

    const initialParams: PatternParams = {
      curl: DEFAULT_PARAMS.curl,
      density: DEFAULT_PARAMS.density,
      hueOffset: DEFAULT_PARAMS.hueOffset,
      flowSpeed: DEFAULT_PARAMS.flowSpeed
    };

    this.patternGenerator = new CloudPatternGenerator(initialParams);

    new UIPanel(
      this.handleParamChange.bind(this),
      this.handleShapeChange.bind(this),
      this.handleReset.bind(this)
    );

    this.createStarField();
    this.addLights();
    this.createShape('cylinder');

    window.addEventListener('resize', this.handleResize.bind(this));

    this.handleResponsiveLayout();
    window.addEventListener('resize', this.handleResponsiveLayout.bind(this));
  }

  private createStarField(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const color = new THREE.Color();
      color.setHSL(0.6 + Math.random() * 0.2, 0.3 + Math.random() * 0.3, 0.6 + Math.random() * 0.4);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.starField = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.starField);
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6c63ff, 0.4);
    fillLight.position.set(-5, 3, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6584, 0.3);
    rimLight.position.set(0, -3, 5);
    this.scene.add(rimLight);
  }

  private createGeometry(shape: ShapeType): THREE.BufferGeometry {
    switch (shape) {
      case 'cylinder':
        return new THREE.CylinderGeometry(2, 2, 3, 64, 32);
      case 'sphere':
        return new THREE.SphereGeometry(2.5, 64, 64);
      case 'torusKnot':
        return new THREE.TorusKnotGeometry(2, 0.8, 128, 32);
      default:
        return new THREE.CylinderGeometry(2, 2, 3, 64, 32);
    }
  }

  private createShape(shape: ShapeType, startOpacity: number = 1): THREE.Mesh {
    const geometry = this.createGeometry(shape);
    const texture = this.patternGenerator.getTexture();

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: startOpacity,
      roughness: 0.4,
      metalness: 0.1,
      emissive: new THREE.Color(0x111122),
      emissiveIntensity: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI * 0.1;
    this.scene.add(mesh);

    return mesh;
  }

  private handleParamChange(params: Partial<PatternParams>): void {
    this.patternGenerator.setParams(params);

    if (this.currentMesh) {
      const material = this.currentMesh.material as THREE.MeshStandardMaterial;
      material.map = this.patternGenerator.getTexture();
      material.needsUpdate = true;
    }

    if (this.oldMesh) {
      const material = this.oldMesh.material as THREE.MeshStandardMaterial;
      material.map = this.patternGenerator.getTexture();
      material.needsUpdate = true;
    }
  }

  private handleShapeChange(shape: ShapeType): void {
    if (shape === this.currentShape || this.isTransitioning) return;

    this.targetShape = shape;
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.oldMesh = this.currentMesh;

    const newMesh = this.createShape(shape, 0);
    newMesh.scale.setScalar(0.85);
    this.currentMesh = newMesh;
  }

  private handleReset(): void {
    if (this.currentShape !== 'cylinder') {
      setTimeout(() => {
        this.handleShapeChange('cylinder');
      }, 100);
    }

    this.isResetFlashing = true;
    this.resetFlashProgress = 0;
  }

  private handleResize(): void {
    const width = this.canvasContainer.clientWidth;
    const height = this.canvasContainer.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private handleResponsiveLayout(): void {
    const width = window.innerWidth;
    const canvasContainer = document.getElementById('canvas-container');

    if (canvasContainer) {
      if (width <= 768) {
        canvasContainer.style.top = '60px';
        canvasContainer.style.height = 'calc(100% - 60px)';
      } else {
        canvasContainer.style.top = '0';
        canvasContainer.style.height = '100%';
      }
    }

    this.handleResize();
  }

  private updateTransition(deltaTime: number): void {
    if (!this.isTransitioning || !this.oldMesh || !this.currentMesh) return;

    this.transitionProgress += deltaTime / this.TRANSITION_DURATION;

    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.isTransitioning = false;

      if (this.oldMesh) {
        this.scene.remove(this.oldMesh);
        (this.oldMesh.geometry as THREE.BufferGeometry).dispose();
        (this.oldMesh.material as THREE.Material).dispose();
        this.oldMesh = null;
      }

      this.currentShape = this.targetShape!;
      this.targetShape = null;
      (this.currentMesh.material as THREE.MeshStandardMaterial).opacity = 1;
      this.currentMesh.scale.setScalar(1);
      return;
    }

    const t = this.transitionProgress;

    const fadeOutT = this.easeInOutCubic(Math.min(t * 2, 1));
    const fadeInT = this.easeInOutCubic(Math.max((t - 0.2) * 1.25, 0));

    if (this.oldMesh) {
      const oldMaterial = this.oldMesh.material as THREE.MeshStandardMaterial;
      oldMaterial.opacity = 1 - fadeOutT;
      oldMaterial.transparent = true;
      this.oldMesh.scale.setScalar(1 - fadeOutT * 0.15);
      this.oldMesh.rotation.y += deltaTime * 0.8;
    }

    const newMaterial = this.currentMesh.material as THREE.MeshStandardMaterial;
    newMaterial.opacity = fadeInT;
    newMaterial.transparent = true;
    const scale = 0.85 + fadeInT * 0.15;
    this.currentMesh.scale.setScalar(scale);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateResetFlash(deltaTime: number): void {
    if (!this.isResetFlashing) return;

    this.resetFlashProgress += deltaTime / this.FLASH_DURATION;

    if (this.resetFlashProgress >= 1) {
      this.resetFlashProgress = 1;
      this.isResetFlashing = false;
      if (this.currentMesh) {
        const material = this.currentMesh.material as THREE.MeshStandardMaterial;
        material.opacity = 1;
        material.transparent = true;
      }
      return;
    }

    const t = this.resetFlashProgress;
    const flashT = t < 0.5 ? t * 2 : (1 - t) * 2;
    const opacity = 1 - flashT * 0.5;

    if (this.currentMesh) {
      const material = this.currentMesh.material as THREE.MeshStandardMaterial;
      material.opacity = opacity;
      material.transparent = true;
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.patternGenerator.update(deltaTime);

    if (this.currentMesh) {
      const material = this.currentMesh.material as THREE.MeshStandardMaterial;
      if (material.map) {
        material.map.needsUpdate = true;
      }
    }

    this.updateTransition(deltaTime);
    this.updateResetFlash(deltaTime);

    if (this.starField) {
      this.starField.rotation.y += deltaTime * 0.02;
    }

    if (this.currentMesh && !this.isTransitioning) {
      this.currentMesh.rotation.y += deltaTime * 0.1;
    }

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    this.clock.start();
    this.animate();
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('resize', this.handleResponsiveLayout.bind(this));

    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      (this.currentMesh.material as THREE.Material).dispose();
    }

    if (this.oldMesh) {
      this.scene.remove(this.oldMesh);
      this.oldMesh.geometry.dispose();
      (this.oldMesh.material as THREE.Material).dispose();
    }

    if (this.starField) {
      this.scene.remove(this.starField);
      this.starField.geometry.dispose();
      (this.starField.material as THREE.Material).dispose();
    }

    this.patternGenerator.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

const app = new CloudLoomApp();
app.start();
