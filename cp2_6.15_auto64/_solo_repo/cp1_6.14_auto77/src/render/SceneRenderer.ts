import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { eventBus, Events, FractalData } from '../ui/EventBus';

const DEFAULT_CAMERA_POS = new THREE.Vector3(4, 3.5, 5);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const SCREENSHOT_WIDTH = 1920;
const SCREENSHOT_HEIGHT = 1080;

export class SceneRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private fractalMesh: THREE.Mesh | null = null;
  private wireframeMesh: THREE.LineSegments | null = null;

  private animating = true;
  private transitionProgress = 0;
  private pendingGeometry: THREE.BufferGeometry | null = null;
  private pendingWireframeGeometry: THREE.BufferGeometry | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d15);
    this.scene.fog = new THREE.Fog(0x0d0d15, 8, 18);

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.copy(DEFAULT_CAMERA_POS);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.copy(DEFAULT_TARGET);
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 15;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.minAzimuthAngle = -Math.PI;
    this.controls.maxAzimuthAngle = Math.PI;
    this.controls.update();

    this.setupLights();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(5, 8, 5);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6688ff, 0.35);
    rimLight.position.set(-4, 3, -5);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xff6f00, 0.25, 15);
    fillLight.position.set(-3, 4, 3);
    this.scene.add(fillLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize);

    eventBus.on(Events.RESET_VIEW, () => this.resetView());

    eventBus.on(Events.TAKE_SCREENSHOT, () => this.takeScreenshot());

    eventBus.on<FractalData>(Events.FRACTAL_DATA_READY, (data) => {
      this.updateFractal(data);
    });
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private resetView(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const duration = 800;
    const startTime = performance.now();

    const animateReset = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startPos, DEFAULT_CAMERA_POS, eased);
      this.controls.target.lerpVectors(startTarget, DEFAULT_TARGET, eased);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateReset);
      }
    };
    animateReset();
  }

  private takeScreenshot(): void {
    const originalW = this.renderer.domElement.width;
    const originalH = this.renderer.domElement.height;
    const originalAspect = this.camera.aspect;

    this.renderer.setSize(SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT, false);
    this.camera.aspect = SCREENSHOT_WIDTH / SCREENSHOT_HEIGHT;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `fractalforge_${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    this.renderer.setSize(originalW / this.renderer.getPixelRatio(), originalH / this.renderer.getPixelRatio(), false);
    this.camera.aspect = originalAspect;
    this.camera.updateProjectionMatrix();
  }

  private updateFractal(data: FractalData): void {
    const cleanData = this.sanitizeData(data);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(cleanData.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(cleanData.colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(cleanData.indices, 1));
    geometry.computeVertexNormals();

    const wireGeometry = new THREE.BufferGeometry();
    wireGeometry.setAttribute('position', new THREE.BufferAttribute(cleanData.wireframePositions, 3));

    this.pendingGeometry = geometry;
    this.pendingWireframeGeometry = wireGeometry;
    this.transitionProgress = 0;
  }

  private sanitizeData(data: FractalData): FractalData {
    const sanitizeArray = (arr: Float32Array | Uint32Array, clamp?: [number, number]) => {
      const result = new (arr.constructor as typeof Float32Array | typeof Uint32Array)(arr.length);
      for (let i = 0; i < arr.length; i++) {
        let v = arr[i];
        if (!isFinite(v) || isNaN(v)) v = 0;
        if (clamp) v = Math.max(clamp[0], Math.min(clamp[1], v)) as typeof v;
        result[i] = v;
      }
      return result as typeof arr;
    };

    return {
      positions: sanitizeArray(data.positions, [-10, 10]) as Float32Array,
      colors: sanitizeArray(data.colors, [0, 1]) as Float32Array,
      indices: data.indices,
      wireframePositions: sanitizeArray(data.wireframePositions, [-10, 10]) as Float32Array,
    };
  }

  private applyNewGeometry(): void {
    if (!this.pendingGeometry || !this.pendingWireframeGeometry) return;

    if (this.fractalMesh) {
      this.scene.remove(this.fractalMesh);
      this.fractalMesh.geometry.dispose();
      (this.fractalMesh.material as THREE.Material).dispose();
    }
    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.geometry.dispose();
      (this.wireframeMesh.material as THREE.Material).dispose();
    }

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.65,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    this.fractalMesh = new THREE.Mesh(this.pendingGeometry, material);
    this.scene.add(this.fractalMesh);

    const wireMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
    });
    this.wireframeMesh = new THREE.LineSegments(this.pendingWireframeGeometry, wireMaterial);
    this.scene.add(this.wireframeMesh);

    this.pendingGeometry = null;
    this.pendingWireframeGeometry = null;
  }

  private animate = (): void => {
    if (!this.animating) return;
    requestAnimationFrame(this.animate);

    if (this.pendingGeometry) {
      this.transitionProgress += 0.05;
      if (this.fractalMesh) {
        (this.fractalMesh.material as THREE.MeshStandardMaterial).opacity = Math.max(
          0,
          1 - this.transitionProgress * 2
        );
        (this.fractalMesh.material as THREE.MeshStandardMaterial).transparent = true;
      }
      if (this.wireframeMesh) {
        (this.wireframeMesh.material as THREE.LineBasicMaterial).opacity = Math.max(
          0,
          0.1 * (1 - this.transitionProgress * 2)
        );
      }
      if (this.transitionProgress >= 0.5) {
        this.applyNewGeometry();
        if (this.fractalMesh) {
          (this.fractalMesh.material as THREE.MeshStandardMaterial).opacity = 0;
          (this.fractalMesh.material as THREE.MeshStandardMaterial).transparent = true;
        }
        if (this.wireframeMesh) {
          (this.wireframeMesh.material as THREE.LineBasicMaterial).opacity = 0;
        }
      }
    } else if (this.fractalMesh && (this.fractalMesh.material as THREE.MeshStandardMaterial).transparent) {
      const mat = this.fractalMesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.min(1, mat.opacity + 0.06);
      if (this.wireframeMesh) {
        const wm = this.wireframeMesh.material as THREE.LineBasicMaterial;
        wm.opacity = Math.min(0.1, wm.opacity + 0.006);
      }
      if (mat.opacity >= 1) {
        mat.transparent = false;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.animating = false;
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
