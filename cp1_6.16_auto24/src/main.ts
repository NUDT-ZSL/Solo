import * as THREE from 'three';
import { GUI } from 'dat.gui';
import {
  TerrainGenerator,
  type NoiseParams,
  type TerrainPreset,
  TERRAIN_PRESETS
} from './terrain';
import { MarkerManager } from './marker';

interface CameraState {
  isRotating: boolean;
  isPanning: boolean;
}

interface DampingConfig {
  rotation: number;
  pan: number;
  zoom: number;
}

class TerrainEditorApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private terrain: TerrainGenerator;
  private markerManager: MarkerManager;
  private gui: GUI;

  private currentParams: NoiseParams = {
    frequency: 0.03,
    amplitude: 3,
    octaves: 4
  };
  private currentPreset: TerrainPreset | null = null;
  private pendingPreset: TerrainPreset | null = null;
  private gridSize: 128 | 64 = 128;

  private cameraTarget: THREE.Vector3;
  private spherical: THREE.Spherical;
  private targetSpherical: THREE.Spherical;
  private cameraPanOffset: THREE.Vector3;
  private targetPanOffset: THREE.Vector3;

  private camState: CameraState = { isRotating: false, isPanning: false };
  private pointerDown: boolean = false;
  private pointerButton: number = -1;
  private lastPointerPos: { x: number; y: number } = { x: 0, y: 0 };

  private velocity: { theta: number; phi: number; radius: number } = { theta: 0, phi: 0, radius: 0 };
  private panVelocity: THREE.Vector2 = new THREE.Vector2();
  private damping: DampingConfig = {
    rotation: 0.90,
    pan: 0.92,
    zoom: 0.88
  };

  private clock: THREE.Clock;
  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private currentFps: number = 0;
  private regenerateDebounce: number | null = null;
  private presetButtonsLocked: boolean = false;
  private isLoading: boolean = false;

  private animationId: number = 0;
  private resizeObserver: ResizeObserver;
  private loadingIndicatorEl: HTMLElement | null = null;

  constructor() {
    this.clock = new THREE.Clock();
    this.fpsLastTime = performance.now();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.006);

    const container = document.getElementById('app')!;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.spherical = new THREE.Spherical(85, Math.PI / 3.5, Math.PI / 4);
    this.targetSpherical = this.spherical.clone();
    this.cameraPanOffset = new THREE.Vector3();
    this.targetPanOffset = new THREE.Vector3();
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);
    (this.renderer.domElement as HTMLElement).style.touchAction = 'none';

    this.loadingIndicatorEl = document.getElementById('loading-indicator');

    this.setupLighting();
    this.setupEnvironment();

    this.terrain = new TerrainGenerator(100, this.gridSize, 42);
    this.terrain.onTransitionStart = () => this.onTerrainTransitionStart();
    this.terrain.onTransitionComplete = () => this.onTerrainTransitionComplete();
    this.terrain.onExpandComplete = () => this.onTerrainExpandComplete();
    this.scene.add(this.terrain.createMesh(this.currentParams));
    this.setLoading(true);

    this.markerManager = new MarkerManager(this.scene, this.camera, this.renderer, this.terrain);
    this.markerManager.setMarkerCountCallback((c) => this.updateMarkerCountUI(c));
    this.markerManager.setCameraStateChecker(() => ({ ...this.camState }));
    const crosshair = document.getElementById('crosshair');
    if (crosshair) this.markerManager.setCrosshairElement(crosshair);
    this.markerManager.attachInput();

    this.gui = this.createGUI();
    this.setupPresetButtons();
    this.bindInput();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    window.addEventListener('resize', this.handleResize);

    this.updateUI();
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x404055, 0.6);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x3d2817, 0.35);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xFFF4E6, 1.8);
    sun.position.set(60, 90, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6B8E9F, 0.35);
    fill.position.set(-50, 40, -30);
    this.scene.add(fill);
  }

  private setupEnvironment(): void {
    const groundGeo = new THREE.CircleGeometry(180, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 1,
      metalness: 0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(200, 50, 0x222222, 0x151515);
    gridHelper.position.y = -0.49;
    this.scene.add(gridHelper);
  }

  private createGUI(): GUI {
    const gui = new GUI({ title: '🎨 地形控制面板', width: 280 });
    (gui.domElement.parentElement as HTMLElement).style.margin = '16px';

    const noiseFolder = gui.addFolder('噪声参数');
    noiseFolder.open();

    noiseFolder
      .add(this.currentParams, 'frequency', 0.01, 0.1, 0.001)
      .name('频率 Frequency')
      .onChange(() => this.scheduleRegenerate(false))
      .listen();

    noiseFolder
      .add(this.currentParams, 'amplitude', 1, 5, 0.1)
      .name('幅度 Amplitude')
      .onChange(() => this.scheduleRegenerate(false))
      .listen();

    noiseFolder
      .add(this.currentParams, 'octaves', 1, 6, 1)
      .name('八度 Octaves')
      .onChange(() => this.scheduleRegenerate(false))
      .listen();

    const meshFolder = gui.addFolder('网格设置');
    meshFolder.add({ grid: this.gridSize }, 'grid', { '高性能 64×64': 64, '标准 128×128': 128 })
      .name('网格精度')
      .onChange((v: number) => {
        this.gridSize = v as 64 | 128;
        this.recreateTerrain();
      });

    const markerFolder = gui.addFolder('标记工具');
    markerFolder.add({ clear: () => this.markerManager.clearMarkers() }, 'clear')
      .name('清除所有标记');

    const actions = {
      '重新生成（新种子）': () => {
        this.setLoading(true);
        const params = { ...this.currentParams };
        this.terrain.dispose();
        this.terrain = new TerrainGenerator(100, this.gridSize, Math.random() * 99999);
        this.terrain.onTransitionStart = () => this.onTerrainTransitionStart();
        this.terrain.onTransitionComplete = () => this.onTerrainTransitionComplete();
        this.terrain.onExpandComplete = () => this.onTerrainExpandComplete();
        const mesh = this.terrain.createMesh(params, this.currentPreset || undefined);
        this.scene.add(mesh);
        this.updateMarkerTerrainRef();
        this.updateUI();
      }
    };
    gui.add(actions, '重新生成（新种子）');

    return gui;
  }

  private updateMarkerTerrainRef(): void {
    this.markerManager.detachInput();
    const oldCount = this.markerManager.getMarkerCount();
    const markers = this.markerManager.getMarkers();
    this.markerManager.clearMarkers();

    const newMarkerMgr = new MarkerManager(this.scene, this.camera, this.renderer, this.terrain);
    newMarkerMgr.setMarkerCountCallback((c) => this.updateMarkerCountUI(c));
    newMarkerMgr.setCameraStateChecker(() => ({ ...this.camState }));
    const crosshair = document.getElementById('crosshair');
    if (crosshair) newMarkerMgr.setCrosshairElement(crosshair);

    markers.forEach(m => {
      const h = this.terrain.getHeightAt(m.position.x, m.position.z);
      if (h !== null) {
        newMarkerMgr.addMarkerAt(new THREE.Vector3(m.position.x, h, m.position.z));
      }
    });

    newMarkerMgr.attachInput();
    this.markerManager.dispose();
    this.markerManager = newMarkerMgr;
    if (oldCount !== this.markerManager.getMarkerCount()) {
      this.updateMarkerCountUI(this.markerManager.getMarkerCount());
    }
  }

  private setupPresetButtons(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.preset-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset as TerrainPreset;
        if (!preset || this.presetButtonsLocked) return;
        this.applyPreset(preset);
      });
    });
  }

  private applyPreset(preset: TerrainPreset): void {
    this.pendingPreset = preset;
    const params = TERRAIN_PRESETS[preset];
    Object.assign(this.currentParams, params);
    this.setPresetButtonsVisual(preset);
    this.terrain.regenerate(this.currentParams, preset, true);
  }

  private setPresetButtonsVisual(activePreset: TerrainPreset | null): void {
    document.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === activePreset);
    });
  }

  private setPresetButtonsDisabled(disabled: boolean): void {
    this.presetButtonsLocked = disabled;
    document.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(btn => {
      (btn as HTMLButtonElement).disabled = disabled;
      btn.style.opacity = disabled ? '0.55' : '1';
      btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });
  }

  private onTerrainTransitionStart(): void {
    this.setLoading(true);
    this.setPresetButtonsDisabled(true);
  }

  private onTerrainTransitionComplete(): void {
    if (this.pendingPreset) {
      this.currentPreset = this.pendingPreset;
      this.pendingPreset = null;
    }
    this.setPresetButtonsDisabled(false);
    this.setLoading(false);
    this.updateUI();
  }

  private onTerrainExpandComplete(): void {
    this.setLoading(false);
    this.updateUI();
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    if (this.loadingIndicatorEl) {
      this.loadingIndicatorEl.style.display = loading ? 'flex' : 'none';
    }
    const vertEl = document.getElementById('info-verts');
    const loadingText = document.getElementById('loading-text');
    if (loading) {
      if (vertEl) vertEl.style.visibility = 'hidden';
      if (loadingText) {
        loadingText.style.display = 'inline';
      }
    } else {
      if (vertEl) vertEl.style.visibility = 'visible';
      if (loadingText) loadingText.style.display = 'none';
    }
  }

  private scheduleRegenerate(smooth: boolean): void {
    if (this.currentPreset !== null) {
      this.currentPreset = null;
      this.setPresetButtonsVisual(null);
    }

    if (this.regenerateDebounce !== null) {
      window.clearTimeout(this.regenerateDebounce);
    }

    this.setLoading(true);
    this.regenerateDebounce = window.setTimeout(() => {
      const bigChange = this.currentParams.octaves >= 5;
      this.terrain.regenerate(this.currentParams, undefined, smooth);
      if (!smooth || !bigChange) {
        this.setLoading(false);
      }
      this.updateUI();
      this.regenerateDebounce = null;
    }, 150);
  }

  private recreateTerrain(): void {
    const oldMesh = this.terrain.getMesh();
    if (oldMesh) this.scene.remove(oldMesh);
    const params = { ...this.currentParams };
    this.terrain.dispose();
    this.terrain = new TerrainGenerator(100, this.gridSize, Math.random() * 99999);
    this.terrain.onTransitionStart = () => this.onTerrainTransitionStart();
    this.terrain.onTransitionComplete = () => this.onTerrainTransitionComplete();
    this.terrain.onExpandComplete = () => this.onTerrainExpandComplete();
    const mesh = this.terrain.createMesh(params, this.currentPreset || undefined);
    this.scene.add(mesh);
    this.setLoading(true);
    this.updateMarkerTerrainRef();
    this.updateUI();
  }

  private bindInput(): void {
    const dom = this.renderer.domElement as HTMLElement;

    dom.addEventListener('pointerdown', (e) => {
      this.pointerDown = true;
      this.pointerButton = e.button;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
      if (e.button === 0) this.camState.isRotating = true;
      if (e.button === 2) {
        this.camState.isPanning = true;
        dom.setPointerCapture(e.pointerId);
      }
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.pointerDown) return;
      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      this.lastPointerPos = { x: e.clientX, y: e.clientY };

      if (this.camState.isRotating && this.pointerButton === 0) {
        const rotSpeed = 0.005;
        this.velocity.theta = -dx * rotSpeed;
        this.velocity.phi = -dy * rotSpeed;
      }

      if (this.camState.isPanning) {
        const panSpeed = 0.08;
        this.panVelocity.set(-dx * panSpeed, dy * panSpeed);
      }
    });

    const endDrag = (e: PointerEvent) => {
      this.pointerDown = false;
      this.camState.isRotating = false;
      this.camState.isPanning = false;
      this.pointerButton = -1;
      try { dom.releasePointerCapture(e.pointerId); } catch {}
    };

    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointercancel', endDrag);
    dom.addEventListener('pointerleave', endDrag);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.0012;
      this.velocity.radius = -e.deltaY * zoomSpeed * this.targetSpherical.radius;
    }, { passive: false });
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    const target = this.cameraTarget.clone().add(this.cameraPanOffset);
    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  }

  private updateCamera(delta: number): void {
    if (!this.camState.isRotating) {
      this.velocity.theta *= this.damping.rotation;
      this.velocity.phi *= this.damping.rotation;
    }
    this.targetSpherical.theta += this.velocity.theta;
    this.targetSpherical.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, this.targetSpherical.phi + this.velocity.phi));

    if (!this.camState.isPanning) {
      this.panVelocity.multiplyScalar(this.damping.pan);
    }
    if (Math.abs(this.panVelocity.x) > 0.0001 || Math.abs(this.panVelocity.y) > 0.0001) {
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      this.camera.getWorldDirection(right);
      right.cross(up).normalize();
      const pan = right.multiplyScalar(this.panVelocity.x)
        .add(up.clone().multiplyScalar(this.panVelocity.y));
      this.targetPanOffset.add(pan);
    }

    this.velocity.radius *= this.damping.zoom;
    this.targetSpherical.radius = Math.max(20, Math.min(250, this.targetSpherical.radius + this.velocity.radius));

    const lerpFactor = 1 - Math.pow(0.001, delta);
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * lerpFactor;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * lerpFactor;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * lerpFactor;
    this.cameraPanOffset.lerp(this.targetPanOffset, lerpFactor);
    this.spherical.makeSafe();

    this.updateCameraPosition();
  }

  private handleResize = (): void => {
    const container = document.getElementById('app')!;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private updateUI(): void {
    const freqEl = document.getElementById('stat-freq');
    const ampEl = document.getElementById('stat-amp');
    const octEl = document.getElementById('stat-oct');
    const maxEl = document.getElementById('info-max');
    const minEl = document.getElementById('info-min');
    const vertEl = document.getElementById('info-verts');

    if (freqEl) freqEl.textContent = this.currentParams.frequency.toFixed(3);
    if (ampEl) ampEl.textContent = this.currentParams.amplitude.toFixed(2);
    if (octEl) octEl.textContent = this.currentParams.octaves.toString();
    if (maxEl) maxEl.textContent = this.terrain.stats.maxHeight.toFixed(2);
    if (minEl) minEl.textContent = this.terrain.stats.minHeight.toFixed(2);
    if (vertEl) vertEl.textContent = this.terrain.stats.vertexCount.toLocaleString();
  }

  private updateMarkerCountUI(count: number): void {
    const el = document.getElementById('info-markers');
    if (el) el.textContent = count.toString();
  }

  private updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 500) {
      this.currentFps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastTime));
      this.fpsFrames = 0;
      this.fpsLastTime = now;
      const fpsEl = document.getElementById('stat-fps');
      if (fpsEl) {
        fpsEl.textContent = this.currentFps.toString();
        fpsEl.style.color = this.currentFps >= 50 ? '#4CAF50' : this.currentFps >= 30 ? '#FFC107' : '#F44336';
      }
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.updateCamera(delta);
    this.terrain.update(delta);
    this.markerManager.update(delta);
    this.updateFPS();

    const now = performance.now();
    if (Math.floor(now / 300) % 2 === 0) {
      this.updateUI();
    }

    this.renderer.render(this.scene, this.camera);
  };

  start(): void {
    this.animate();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.handleResize);
    this.gui.destroy();
    this.markerManager.dispose();
    this.terrain.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new TerrainEditorApp();
  app.start();
  (window as any).__terrainApp = app;
});
