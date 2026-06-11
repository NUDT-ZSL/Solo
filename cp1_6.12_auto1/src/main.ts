import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANET_CONFIGS, SCENE_CONFIG, SUN_CONFIG } from './data/planetData';
import { createAllOrbits } from './orbit';
import {
  PlanetObject,
  SunObject,
  createPlanet,
  createStarField,
  createSun,
  detectLowEndDevice,
  updatePlanet,
  updateSun
} from './models/planet';
import {
  CameraAnimation,
  createCameraAnimation,
  createOrbitControls,
  setupRaycaster,
  updateCameraAnimation
} from './controls';
import { UIManager, createPlanetLabel, updateLabelPosition } from './ui';

interface LabelEntry {
  div: HTMLDivElement;
  worldPosition: THREE.Vector3;
  distance: number;
  zIndex: number;
}

class SolarSystemApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private labelContainer: HTMLElement;
  private canvasContainer: HTMLElement;

  private sun!: SunObject;
  private planets: PlanetObject[] = [];
  private starField!: THREE.Points;
  private sunLabel!: HTMLDivElement;

  private uiManager: UIManager;
  private cameraAnimation: CameraAnimation | null = null;
  private isAnimatingCamera: boolean = false;
  private intersectObjects: THREE.Object3D[] = [];

  private intersectFn: (objects: THREE.Object3D[], recursive?: boolean) => THREE.Intersection[];

  private clock: THREE.Clock;
  private frameId: number = 0;
  private hoveredObject: THREE.Object3D | null = null;
  private clickHoldStart: number = 0;
  private isDragging: boolean = false;
  private isLowEnd: boolean = false;

  private tmpVec: THREE.Vector3 = new THREE.Vector3();
  private labelEntries: LabelEntry[] = [];

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;
    this.labelContainer = document.getElementById('label-container')!;

    this.isLowEnd = detectLowEndDevice();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = createOrbitControls(this.camera, this.renderer.domElement);
    this.clock = new THREE.Clock();

    const raycastData = setupRaycaster(this.camera, this.renderer.domElement);
    this.intersectFn = raycastData.intersect;

    this.uiManager = new UIManager({
      onTogglePause: () => {},
      onResetView: () => this.resetCameraView(),
      onToggleLabels: (_visible: boolean) => this.updateAllLabelsVisibility(),
      onCloseInfo: () => {}
    });

    this.applyPerformanceProfile();
    this.initScene();
    this.bindInteractionEvents();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  private applyPerformanceProfile(): void {
    if (this.isLowEnd) {
      const panels = document.querySelectorAll<HTMLElement>('#ui-panel, #info-panel');
      panels.forEach((panel) => {
        panel.style.backdropFilter = 'none';
        (panel.style as unknown as Record<string, string>)['webkitBackdropFilter'] = 'none';
        panel.style.background = 'rgba(15, 25, 50, 0.85)';
      });
    }
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000018);
    scene.fog = new THREE.FogExp2(0x000018, 0.0015);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(
      SCENE_CONFIG.defaultCameraPosition.x,
      SCENE_CONFIG.defaultCameraPosition.y,
      SCENE_CONFIG.defaultCameraPosition.z
    );
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isLowEnd,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isLowEnd ? 1 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    this.canvasContainer.appendChild(renderer.domElement);
    return renderer;
  }

  private initScene(): void {
    this.sun = createSun();
    this.scene.add(this.sun.group);
    this.intersectObjects.push(this.sun.mesh);

    this.planets = PLANET_CONFIGS.map((config: typeof PLANET_CONFIGS[number]) => {
      const planet = createPlanet(config);
      this.scene.add(planet.group);
      this.intersectObjects.push(planet.mesh);

      planet.labelDiv = createPlanetLabel(config.nameCN, this.labelContainer);

      return planet;
    });

    this.sunLabel = createPlanetLabel(SUN_CONFIG.nameCN, this.labelContainer);

    const orbitRadii: number[] = PLANET_CONFIGS.map((p: typeof PLANET_CONFIGS[number]) => p.orbitRadius);
    createAllOrbits(this.scene, orbitRadii);

    this.starField = createStarField(
      this.isLowEnd ? SCENE_CONFIG.starCount / 2 : SCENE_CONFIG.starCount,
      SCENE_CONFIG.starRadius
    );
    this.scene.add(this.starField);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.15);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);
  }

  private bindInteractionEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (_e: PointerEvent) => {
      this.isDragging = false;
      this.clickHoldStart = performance.now();
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.buttons !== 0) {
        this.isDragging = true;
      }
      this.handleHover();
    });

    canvas.addEventListener('pointerup', (_e: PointerEvent) => {
      const holdDuration = performance.now() - this.clickHoldStart;
      if (!this.isDragging && holdDuration < 250) {
        this.handleClick();
      }
    });

    canvas.addEventListener('contextmenu', (e: Event) => e.preventDefault());
  }

  private handleHover(): void {
    if (this.isAnimatingCamera) return;

    const intersects = this.intersectFn(this.intersectObjects, false);

    if (this.hoveredObject) {
      const mesh = this.hoveredObject as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
      if ('emissive' in mat && !mesh.userData.isSunMesh) {
        const planet = this.planets.find((p: PlanetObject) => p.mesh === mesh);
        if (planet) {
          mat.emissive.setHex(planet.config.emissive ?? 0x000000);
          mat.emissiveIntensity = planet.config.emissiveIntensity ?? 0;
        }
      }
      this.hoveredObject = null;
    }

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      this.hoveredObject = obj;
      const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
      if ('emissive' in mat && !(obj as THREE.Mesh).userData.isSunMesh) {
        mat.emissive.setHex(0x88aaff);
        mat.emissiveIntensity = 0.25;
      }
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  private handleClick(): void {
    if (this.isAnimatingCamera) return;

    const intersects = this.intersectFn(this.intersectObjects, false);
    if (intersects.length === 0) return;

    const clicked = intersects[0].object;

    if ((clicked as THREE.Mesh).userData.isSunMesh) {
      this.focusOnSun();
      this.uiManager.showSunInfo();
      return;
    }

    const planet = this.planets.find((p: PlanetObject) => p.mesh === clicked);
    if (planet) {
      this.focusOnPlanet(planet);
      this.uiManager.showPlanetInfo(planet.config);
    }
  }

  private startCameraAnimation(
    targetPos: THREE.Vector3,
    lookAtPos: THREE.Vector3,
    duration: number
  ): void {
    this.isAnimatingCamera = true;
    this.cameraAnimation = createCameraAnimation(
      this.controls,
      this.camera,
      targetPos,
      lookAtPos,
      duration
    );
  }

  private focusOnPlanet(planet: PlanetObject): void {
    const offset = planet.config.radius * 8;
    const worldPos = new THREE.Vector3();
    planet.group.getWorldPosition(worldPos);

    const dirToCamera = new THREE.Vector3()
      .subVectors(this.camera.position, worldPos)
      .normalize();

    const targetPos = worldPos
      .clone()
      .add(dirToCamera.multiplyScalar(Math.max(offset, 10)));

    targetPos.y += planet.config.radius * 2;

    this.startCameraAnimation(targetPos, worldPos, 600);
  }

  private focusOnSun(): void {
    const worldPos = new THREE.Vector3();
    this.sun.group.getWorldPosition(worldPos);

    const offset = 30;
    const dirToCamera = new THREE.Vector3()
      .subVectors(this.camera.position, worldPos)
      .normalize();

    const targetPos = worldPos
      .clone()
      .add(dirToCamera.multiplyScalar(offset));
    targetPos.y += 8;

    this.startCameraAnimation(targetPos, worldPos, 600);
  }

  private resetCameraView(): void {
    const targetPos = new THREE.Vector3(
      SCENE_CONFIG.defaultCameraPosition.x,
      SCENE_CONFIG.defaultCameraPosition.y,
      SCENE_CONFIG.defaultCameraPosition.z
    );
    const lookAtPos = new THREE.Vector3(
      SCENE_CONFIG.defaultCameraTarget.x,
      SCENE_CONFIG.defaultCameraTarget.y,
      SCENE_CONFIG.defaultCameraTarget.z
    );
    this.startCameraAnimation(targetPos, lookAtPos, 800);
    this.uiManager.hideInfoPanel();
  }

  private updateAllLabelsVisibility(): void {
    this.uiManager.updateLabelsVisibility(this.planets, this.sunLabel);
  }

  private updateLabels(): void {
    this.labelEntries = [];

    this.sun.group.getWorldPosition(this.tmpVec);
    const sunDist = this.tmpVec.distanceTo(this.camera.position);
    this.labelEntries.push({
      div: this.sunLabel,
      worldPosition: this.tmpVec.clone(),
      distance: sunDist,
      zIndex: 0
    });

    this.planets.forEach((planet: PlanetObject) => {
      if (!planet.labelDiv) return;
      planet.group.getWorldPosition(this.tmpVec);
      const dist = this.tmpVec.distanceTo(this.camera.position);
      this.labelEntries.push({
        div: planet.labelDiv,
        worldPosition: this.tmpVec.clone(),
        distance: dist,
        zIndex: 0
      });
    });

    this.labelEntries.sort((a: LabelEntry, b: LabelEntry) => a.distance - b.distance);

    this.labelEntries.forEach((entry: LabelEntry, index: number) => {
      entry.zIndex = index + 1;
      updateLabelPosition(entry.div, entry.worldPosition, this.camera, this.labelContainer);
      entry.div.style.zIndex = String(entry.zIndex);
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isLowEnd ? 1 : 2));
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const isPaused = this.uiManager.getPaused();

    updateSun(this.sun, delta, isPaused, this.camera);

    this.planets.forEach((planet: PlanetObject) => {
      updatePlanet(planet, delta, isPaused, 1);
    });

    if (this.cameraAnimation) {
      const animating = updateCameraAnimation(
        this.cameraAnimation,
        this.controls,
        this.camera
      );
      if (!animating && !this.cameraAnimation.active) {
        this.cameraAnimation = null;
        this.isAnimatingCamera = false;
      }
    }

    if (!this.cameraAnimation) {
      this.controls.update();
    }

    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  };

  public start(): void {
    this.clock.start();
    this.animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
  }
}

function bootstrap(): void {
  try {
    const app = new SolarSystemApp();
    app.start();
  } catch (err: unknown) {
    console.error('Failed to initialize solar system:', err);
    const loading = document.querySelector('.loading');
    if (loading) {
      (loading as HTMLElement).textContent = '初始化失败，请刷新页面重试';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
