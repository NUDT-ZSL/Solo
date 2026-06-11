import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { VoxelData, SliceConfig, CameraSettings } from './types';

interface MorphState {
  targetPositions: Float32Array | null;
  startPositions: Float32Array | null;
  targetColors: Float32Array | null;
  startColors: Float32Array | null;
  startTime: number;
  duration: number;
  animating: boolean;
}

export type FPSCallback = (fps: number, voxelCount: number, algorithm: string) => void;
export type ClickCallback = (worldPos: { x: number; y: number; z: number } | null) => void;

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export class SceneManager {
  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private fractalMesh: THREE.InstancedMesh | null = null;
  private fractalGeometry: THREE.BoxGeometry | null = null;
  private fractalMaterial: THREE.MeshStandardMaterial | null = null;
  private sliceMesh: THREE.Mesh | null = null;
  private sliceGeometry: THREE.BufferGeometry | null = null;
  private holeMeshes: THREE.Mesh[] = [];
  private ambientLight: THREE.AmbientLight | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.PointLight | null = null;
  private rimLight: THREE.PointLight | null = null;

  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsAccum: number = 0;
  private fpsCallback: FPSCallback | null = null;
  private clickCallback: ClickCallback | null = null;
  private lastClickTime: number = 0;

  private morphState: MorphState = {
    targetPositions: null,
    startPositions: null,
    targetColors: null,
    startColors: null,
    startTime: 0,
    duration: 0,
    animating: false,
  };

  private currentVoxelCount: number = 0;
  private currentAlgorithm: string = 'mandelbulb';
  private cameraSettings: CameraSettings = { autoRotate: false, autoRotateSpeed: 1 };
  private currentData: VoxelData | null = null;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private dummyMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private dummyColor: THREE.Color = new THREE.Color();

  constructor() {
    this.fractalGeometry = new THREE.BoxGeometry(0.024, 0.024, 0.024);
    this.fractalMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.15,
      roughness: 0.55,
      transparent: true,
      opacity: 0.96,
    });
  }

  setFPSCallback(callback: FPSCallback): void {
    this.fpsCallback = callback;
  }

  setClickCallback(callback: ClickCallback): void {
    this.clickCallback = callback;
  }

  init(container: HTMLElement): void {
    this.container = container;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x0a0a1a, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.18);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    this.camera.position.set(2.5, 2.2, 3.5);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 12;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.target.set(0, 0, 0);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.45);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.keyLight.position.set(3, 4, 5);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.PointLight(0x6366f1, 0.6, 15);
    this.fillLight.position.set(-4, 3, 2);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0xe94560, 0.45, 15);
    this.rimLight.position.set(4, -2, -4);
    this.scene.add(this.rimLight);

    this.initEventListeners();
    this.startAnimationLoop();
  }

  private initEventListeners(): void {
    window.addEventListener('resize', this.handleResize);
    this.renderer?.domElement.addEventListener('pointerdown', this.handlePointerDown);
  }

  private handleResize = (): void => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private handlePointerDown = (e: PointerEvent): void => {
    const now = performance.now();
    this.lastClickTime = now;
    if (!this.renderer || !this.camera || !this.container) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    if (this.clickCallback && e.button === 0) {
      setTimeout(() => {
        if (Math.abs(performance.now() - now) < 250) {
          this.clickCallback?.({
            x: intersectPoint.x,
            y: intersectPoint.y,
            z: intersectPoint.z,
          });
        }
      }, 200);
    }
  };

  private startAnimationLoop(): void {
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsAccum = 0;
    const animate = (): void => {
      this.animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - this.lastTime) / 1000;
      this.lastTime = now;

      this.frameCount++;
      this.fpsAccum += delta;
      if (this.fpsAccum >= 0.5) {
        this.fps = this.frameCount / this.fpsAccum;
        this.frameCount = 0;
        this.fpsAccum = 0;
        if (this.fpsCallback) {
          this.fpsCallback(this.fps, this.currentVoxelCount, this.currentAlgorithm);
        }
      }

      this.updateMorph(delta);

      if (this.cameraSettings.autoRotate && this.controls) {
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = this.cameraSettings.autoRotateSpeed;
      } else if (this.controls) {
        this.controls.autoRotate = false;
      }

      this.controls?.update();

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  setAlgorithmName(name: string): void {
    this.currentAlgorithm = name;
  }

  updateFractal(data: VoxelData, animate: boolean = true): void {
    this.currentData = data;
    this.currentVoxelCount = data.count;

    if (!this.scene) return;

    if (this.fractalMesh) {
      this.scene.remove(this.fractalMesh);
      this.fractalMesh.dispose?.();
      if (this.fractalMesh.geometry !== this.fractalGeometry) {
        this.fractalMesh.geometry?.dispose?.();
      }
      this.fractalMesh = null;
    }

    if (data.count === 0) {
      return;
    }

    const maxInstanced = 800000;
    const instanceCount = Math.min(data.count, maxInstanced);

    this.fractalMesh = new THREE.InstancedMesh(
      this.fractalGeometry,
      this.fractalMaterial,
      instanceCount,
    );
    this.fractalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < instanceCount; i++) {
      const i3 = i * 3;
      this.dummyMatrix.makeTranslation(
        data.positions[i3], data.positions[i3 + 1], data.positions[i3 + 2]);
      this.fractalMesh.setMatrixAt(i, this.dummyMatrix);
      this.dummyColor.setRGB(data.colors[i3], data.colors[i3 + 1], data.colors[i3 + 2]);
      this.fractalMesh.setColorAt(i, this.dummyColor);
    }

    this.fractalMesh.instanceMatrix.needsUpdate = true;
    if (this.fractalMesh.instanceColor) {
      this.fractalMesh.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.fractalMesh);
  }

  private updateMorph(_delta: number): void {
  }

  setSlice(sliceResult: {
    positions: Float32Array;
    colors: Float32Array;
    vertexCount: number;
  } | null): void {
    if (!this.scene) return;

    if (this.sliceMesh) {
      this.scene.remove(this.sliceMesh);
      this.sliceMesh.geometry?.dispose?.();
      (this.sliceMesh.material as THREE.Material)?.dispose?.();
      this.sliceMesh = null;
    }
    if (this.sliceGeometry) {
      this.sliceGeometry.dispose();
      this.sliceGeometry = null;
    }

    if (!sliceResult || sliceResult.vertexCount === 0) return;

    this.sliceGeometry = new THREE.BufferGeometry();
    this.sliceGeometry.setAttribute('position', new THREE.BufferAttribute(sliceResult.positions, 3));
    this.sliceGeometry.setAttribute('color', new THREE.BufferAttribute(sliceResult.colors, 3));
    this.sliceGeometry.computeVertexNormals();

    const sliceMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });

    this.sliceMesh = new THREE.Mesh(this.sliceGeometry, sliceMaterial);
    this.scene.add(this.sliceMesh);
  }

  setCameraSettings(settings: Partial<CameraSettings>): void {
    this.cameraSettings = { ...this.cameraSettings, ...settings };
  }

  addHoleVisual(center: { x: number; y: number; z: number }, radius: number): void {
    if (!this.scene) return;

    const geometry = new THREE.SphereGeometry(radius, 32, 24);
    const material = new THREE.MeshBasicMaterial({
      color: 0xe94560,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(center.x, center.y, center.z);
    this.scene.add(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xe94560, transparent: true, opacity: 0.7 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.position.set(center.x, center.y, center.z);
    this.scene.add(wireframe);

    this.holeMeshes.push(mesh, wireframe);
  }

  clearHoleVisuals(): void {
    if (!this.scene) return;
    for (const mesh of this.holeMeshes) {
      this.scene.remove(mesh);
      mesh.geometry?.dispose?.();
      (mesh.material as THREE.Material)?.dispose?.();
    }
    this.holeMeshes = [];
  }

  async exportScreenshot(width: number, height: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.renderer || !this.scene || !this.camera) {
        reject(new Error('Renderer not initialized'));
        return;
      }

      const originalPixelRatio = this.renderer.getPixelRatio();
      const originalSize = new THREE.Vector2();
      this.renderer.getSize(originalSize);

      this.renderer.setPixelRatio(1);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);

      this.renderer.domElement.toBlob(
        (blob) => {
          this.renderer!.setPixelRatio(originalPixelRatio);
          this.renderer!.setSize(originalSize.x, originalSize.y, false);
          this.camera!.aspect = originalSize.x / originalSize.y;
          this.camera!.updateProjectionMatrix();
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0,
      );
    });
  }

  exportOBJ(): string {
    if (!this.currentData || this.currentData.count === 0) {
      return '';
    }

    const data = this.currentData;
    let obj = '# 3D Fractal Model - Exported from 3D Fractal Explorer\n';
    obj += `# Voxels: ${data.count}\n\n`;

    const voxelSize = 0.024;
    const halfSize = voxelSize / 2;
    let vertexOffset = 1;

    for (let i = 0; i < data.count; i++) {
      const i3 = i * 3;
      const cx = data.positions[i3];
      const cy = data.positions[i3 + 1];
      const cz = data.positions[i3 + 2];

      const r = Math.round(data.colors[i3] * 255);
      const g = Math.round(data.colors[i3 + 1] * 255);
      const b = Math.round(data.colors[i3 + 2] * 255);

      obj += `v ${cx - halfSize} ${cy - halfSize} ${cz - halfSize} ${r / 255} ${g / 255} ${b / 255}\n`;
      obj += `v ${cx + halfSize} ${cy - halfSize} ${cz - halfSize} ${r / 255} ${g / 255} ${b / 255}\n`;
      obj += `v ${cx + halfSize} ${cy - halfSize} ${cz + halfSize} ${r / 255} ${g / 255} ${b / 255}\n`;
      obj += `v ${cx - halfSize} ${cy - halfSize} ${cz + halfSize} ${r / 255} ${g / 255} ${b / 255}\n`;
      obj += `v ${cx - halfSize} ${cy + halfSize} ${cz - halfSize} ${r / 255} ${g / 255} ${b / 255}\n`;
      obj += `v ${cx + halfSize} ${cy + halfSize} ${cz - halfSize} ${r / 255} ${g / 255} ${b / 255}\n`;
      obj += `v ${cx + halfSize} ${cy + halfSize} ${cz + halfSize} ${r / 255} ${g / 255} ${b / 255}\n`;
      obj += `v ${cx - halfSize} ${cy + halfSize} ${cz + halfSize} ${r / 255} ${g / 255} ${b / 255}\n`;

      obj += `f ${vertexOffset} ${vertexOffset + 1} ${vertexOffset + 2} ${vertexOffset + 3}\n`;
      obj += `f ${vertexOffset + 7} ${vertexOffset + 6} ${vertexOffset + 5} ${vertexOffset + 4}\n`;
      obj += `f ${vertexOffset + 4} ${vertexOffset + 5} ${vertexOffset + 1} ${vertexOffset}\n`;
      obj += `f ${vertexOffset + 3} ${vertexOffset + 2} ${vertexOffset + 6} ${vertexOffset + 7}\n`;
      obj += `f ${vertexOffset + 4} ${vertexOffset} ${vertexOffset + 3} ${vertexOffset + 7}\n`;
      obj += `f ${vertexOffset + 1} ${vertexOffset + 5} ${vertexOffset + 6} ${vertexOffset + 2}\n`;

      vertexOffset += 8;
    }

    return obj;
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer?.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.container?.removeChild(this.renderer?.domElement as Node);
    this.controls?.dispose();
    this.fractalGeometry?.dispose();
    this.fractalMaterial?.dispose();
    this.renderer?.dispose();
  }
}
