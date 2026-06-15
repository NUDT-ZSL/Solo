import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DataStore } from './dataStore';
import { ModelManager } from './modelManager';
import { GUIManager } from './guiManager';

class App {
  private readonly containerEl: HTMLElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly clock: THREE.Clock;

  private readonly dataStore: DataStore;
  private readonly modelManager: ModelManager;
  private readonly guiManager: GUIManager;

  private rafId: number | null;
  private isSwitching: boolean;

  constructor() {
    this.containerEl = document.getElementById('scene-container')!;
    if (!this.containerEl) {
      throw new Error('找不到 #scene-container 元素');
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 10, 28);

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.containerEl.clientWidth / this.containerEl.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2.2, 6.5);
    this.camera.lookAt(0, 1.2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.containerEl.clientWidth, this.containerEl.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.containerEl.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 14;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 1.2, 0);
    this.controls.autoRotate = false;
    this.controls.update();

    this.clock = new THREE.Clock();
    this.rafId = null;
    this.isSwitching = false;

    this.setupLights();
    this.setupEnvironment();
    this.setupGround();

    this.dataStore = new DataStore();
    this.modelManager = new ModelManager(this.scene);
    this.guiManager = new GUIManager({
      dataStore: this.dataStore,
      onSelectArtifact: (index) => this.switchToArtifact(index)
    });

    this.bindControlsEvents();
    this.bindWindowResize();
    this.bindKeyboardShortcuts();

    this.dataStore.onChange((artifact, index) => {
      this.guiManager.updateContent(artifact);
      this.guiManager.highlightListItem(index);
      this.guiManager.scrollListItemIntoView(index);
    });

    window.addEventListener('beforeunload', () => this.dispose());
  }

  async start(): Promise<void> {
    this.guiManager.showProgress();
    try {
      const artifact = this.dataStore.getCurrentArtifact();
      this.guiManager.updateProgress(2, artifact.name);
      await this.modelManager.switchModel(artifact, (p, n) => {
        this.guiManager.updateProgress(p, n);
      });
      this.guiManager.hideProgress();
    } catch (err) {
      console.error('[App] 初始模型加载失败:', err);
      this.guiManager.hideProgress();
    }
    this.guiManager.togglePanel(true);
    this.loop();
  }

  private async switchToArtifact(index: number): Promise<void> {
    if (this.isSwitching) return;
    if (index === this.dataStore.getCurrentIndex()) return;
    this.isSwitching = true;
    this.guiManager.showProgress();
    try {
      const artifact = this.dataStore.switchTo(index);
      await this.modelManager.switchModel(artifact, (p, n) => {
        this.guiManager.updateProgress(p, n);
      });
    } catch (err) {
      console.error('[App] 切换文物失败:', err);
    } finally {
      this.guiManager.hideProgress();
      this.isSwitching = false;
    }
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xc9b896, 0.42);
    this.scene.add(ambient);

    const fillLight = new THREE.DirectionalLight(0xf5e6c8, 0.55);
    fillLight.position.set(-5, 3, -4);
    fillLight.castShadow = false;
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe0b0, 0.35);
    rimLight.position.set(4, 2.5, -6);
    this.scene.add(rimLight);

    const spot = new THREE.SpotLight(0xfff2d4, 2.2, 22, Math.PI / 4.8, 0.42, 1.1);
    spot.position.set(0, 6.5, 4.2);
    spot.target.position.set(0, 1.2, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.camera.near = 0.5;
    spot.shadow.camera.far = 20;
    spot.shadow.camera.fov = 50;
    spot.shadow.bias = -0.0005;
    spot.shadow.radius = 6;
    spot.shadow.normalBias = 0.02;
    this.scene.add(spot);
    this.scene.add(spot.target);

    const underLight = new THREE.PointLight(0xd4a24a, 0.4, 10, 2);
    underLight.position.set(0, -0.5, 0);
    this.scene.add(underLight);
  }

  private setupEnvironment(): void {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x2a2238);

    const warmLight1 = new THREE.PointLight(0xffd89e, 2.5, 50);
    warmLight1.position.set(10, 8, 10);
    envScene.add(warmLight1);

    const warmLight2 = new THREE.PointLight(0xffb878, 1.8, 50);
    warmLight2.position.set(-10, 5, -8);
    envScene.add(warmLight2);

    const fillEnv = new THREE.HemisphereLight(0xfff0d8, 0x2a1a3a, 0.8);
    envScene.add(fillEnv);

    for (let i = 0; i < 6; i++) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 6),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.1, 0.4, 0.6 + Math.random() * 0.2),
          side: THREE.DoubleSide
        })
      );
      const angle = (i / 6) * Math.PI * 2;
      const radius = 15;
      panel.position.set(
        Math.cos(angle) * radius,
        3 + Math.random() * 4,
        Math.sin(angle) * radius
      );
      panel.lookAt(0, 4, 0);
      envScene.add(panel);
    }

    const envTexture = pmrem.fromScene(envScene, 0.04).texture;
    this.scene.environment = envTexture;

    pmrem.dispose();
  }

  private setupGround(): void {
    const groundGeo = new THREE.CircleGeometry(10, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x141424,
      metalness: 0.2,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const ringGeo = new THREE.RingGeometry(2.2, 2.4, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc9a74b,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    this.scene.add(ring);

    const glowGeo = new THREE.CircleGeometry(2.1, 64);
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d')!;
    const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(201,167,75,0.35)');
    grad.addColorStop(0.5, 'rgba(201,167,75,0.08)');
    grad.addColorStop(1, 'rgba(201,167,75,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.01;
    this.scene.add(glow);
  }

  private bindControlsEvents(): void {
    let interacting = false;
    const onStart = () => {
      interacting = true;
      this.modelManager.pauseAutoRotate(2500);
    };
    const onEnd = () => {
      if (interacting) {
        interacting = false;
        this.modelManager.pauseAutoRotate(2000);
      }
    };
    this.controls.addEventListener('start', onStart);
    this.controls.addEventListener('end', onEnd);
    this.controls.addEventListener('change', () => {
      this.modelManager.pauseAutoRotate(1500);
    });
  }

  private bindWindowResize(): void {
    const handler = () => {
      const w = this.containerEl.clientWidth;
      const h = this.containerEl.clientHeight;
      if (w <= 0 || h <= 0) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.switchToArtifact(
            (this.dataStore.getCurrentIndex() - 1 + this.dataStore.getArtifactCount()) %
              this.dataStore.getArtifactCount()
          );
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.switchToArtifact(
            (this.dataStore.getCurrentIndex() + 1) % this.dataStore.getArtifactCount()
          );
          break;
        case ' ':
          e.preventDefault();
          this.guiManager.togglePanel();
          break;
      }
    });
  }

  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const delta = this.clock.getDelta();
    this.controls.update();
    this.modelManager.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.modelManager.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m?.dispose?.();
      }
    });
    if (this.renderer.domElement.parentNode === this.containerEl) {
      this.containerEl.removeChild(this.renderer.domElement);
    }
  }
}

function bootstrap(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  async function run(): Promise<void> {
    try {
      const app = new App();
      await app.start();
    } catch (err) {
      console.error('[App] 启动失败:', err);
      const container = document.getElementById('scene-container');
      if (container) {
        container.innerHTML =
          '<div style="color:#c9a74b;padding:40px;text-align:center;font-family:sans-serif;">应用启动失败，请刷新重试</div>';
      }
    }
  }
}

bootstrap();
