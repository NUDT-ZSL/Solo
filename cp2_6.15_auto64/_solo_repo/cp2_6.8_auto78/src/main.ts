import * as THREE from 'three';
import { UIManager } from './uiManager';
import {
  createSkeleton,
  updateSkeletonLOD,
  setSkeletonOpacity,
  animateLabelsIn,
  SkeletonResult
} from './skeletonModel';
import {
  DinosaurSpecies,
  DisplayMode,
  DINOSAURS,
  DINOSAUR_LIST,
  GEOLOGICAL_PERIODS,
  TIMELINE_START,
  TIMELINE_END
} from './data';

interface ViewportState {
  camera: THREE.PerspectiveCamera;
  skeleton: SkeletonResult | null;
  species: DinosaurSpecies;
  container: HTMLElement | null;
  rotX: number;
  rotY: number;
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  isPanning: boolean;
  lastX: number;
  lastY: number;
  sceneHolder: THREE.Group;
}

class DinosaurApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private viewports: [ViewportState, ViewportState];
  private uiManager: UIManager;
  private displayMode: DisplayMode = 'anatomy';
  private animationFrameId: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;
  private canvasContainer: HTMLElement | null = null;

  constructor() {
    const appRoot = document.getElementById('app')!;

    this.canvasContainer = document.createElement('div');
    this.canvasContainer.style.position = 'absolute';
    this.canvasContainer.style.top = '0';
    this.canvasContainer.style.left = '0';
    this.canvasContainer.style.width = '100%';
    this.canvasContainer.style.height = '100%';
    this.canvasContainer.style.pointerEvents = 'none';
    this.canvasContainer.style.zIndex = '1';
    appRoot.appendChild(this.canvasContainer);

    this.uiManager = new UIManager(appRoot, {
      onSpeciesSelect: this.handleSpeciesSelect.bind(this),
      onModeChange: this.handleModeChange.bind(this),
      onTimelineDragEnd: this.handleTimelineDragEnd.bind(this),
      onTimelineNodeClick: this.handleTimelineNodeClick.bind(this),
      onCloseModal: () => {}
    });

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.canvasContainer.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.setupLights();

    this.viewports = [
      this.createViewport(0),
      this.createViewport(1)
    ];

    this.setupViewportControls();

    setTimeout(() => {
      this.viewports[0].container = document.getElementById('viewport-0');
      this.viewports[1].container = document.getElementById('viewport-1');
      this.handleResize();

      const initial = this.uiManager.getSelectedSpecies();
      this.loadSpecies(0, initial[0]);
      this.loadSpecies(1, initial[1]);
      this.uiManager.updateViewportLabels(initial);
    }, 50);

    window.addEventListener('resize', this.handleResize.bind(this));

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(5, 8, 5);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    dir2.position.set(-5, 3, -5);
    this.scene.add(dir2);

    const rim = new THREE.DirectionalLight(0xd4a853, 0.25);
    rim.position.set(0, -2, -8);
    this.scene.add(rim);
  }

  private createViewport(idx: 0 | 1): ViewportState {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(0, 2, 12);
    camera.lookAt(0, 2, 0);

    const holder = new THREE.Group();
    this.scene.add(holder);

    return {
      camera,
      skeleton: null,
      species: this.uiManager.getSelectedSpecies()[idx],
      container: null,
      rotX: -0.15,
      rotY: idx === 0 ? 0.4 : -0.4,
      zoom: 1,
      panX: 0,
      panY: 0,
      isDragging: false,
      isPanning: false,
      lastX: 0,
      lastY: 0,
      sceneHolder: holder
    };
  }

  private setupViewportControls(): void {
    this.viewports.forEach((vp, idx) => {
      const tryGetContainer = () => {
        if (!vp.container) {
          vp.container = document.getElementById(`viewport-${idx}`);
        }
        return vp.container;
      };

      document.addEventListener('mousedown', (e) => {
        const container = tryGetContainer();
        if (!container) return;

        const target = e.target as HTMLElement;
        if (!container.contains(target)) return;

        e.preventDefault();
        this.uiManager.setActiveViewport(idx as 0 | 1);
        if (e.shiftKey) {
          vp.isPanning = true;
        } else {
          vp.isDragging = true;
        }
        vp.lastX = e.clientX;
        vp.lastY = e.clientY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!vp.isDragging && !vp.isPanning) return;
        const dx = e.clientX - vp.lastX;
        const dy = e.clientY - vp.lastY;

        if (vp.isDragging) {
          vp.rotY += dx * 0.008;
          vp.rotX += dy * 0.008;
          vp.rotX = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, vp.rotX));
        } else if (vp.isPanning) {
          vp.panX -= dx * 0.02 * (1 / vp.zoom);
          vp.panY += dy * 0.02 * (1 / vp.zoom);
          const maxPan = 8;
          vp.panX = Math.max(-maxPan, Math.min(maxPan, vp.panX));
          vp.panY = Math.max(-maxPan, Math.min(maxPan, vp.panY));
        }

        vp.lastX = e.clientX;
        vp.lastY = e.clientY;
      });

      document.addEventListener('wheel', (e) => {
        const container = tryGetContainer();
        if (!container) return;

        const target = e.target as HTMLElement;
        if (!container.contains(target)) return;

        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.08 : 0.92;
        vp.zoom = Math.max(0.5, Math.min(3, vp.zoom * factor));
      }, { passive: false });

      window.addEventListener('mouseup', () => {
        vp.isDragging = false;
        vp.isPanning = false;
      });
    });
  }

  private handleSpeciesSelect(viewport: 0 | 1, species: DinosaurSpecies): void {
    this.loadSpecies(viewport, species);
    this.uiManager.updateViewportLabels(this.uiManager.getSelectedSpecies());
  }

  private handleModeChange(mode: DisplayMode): void {
    this.displayMode = mode;
    this.viewports.forEach((vp, idx) => {
      this.loadSpecies(idx as 0 | 1, vp.species);
    });
  }

  private handleTimelineDragEnd(year: number): void {
    const sorted = [...DINOSAUR_LIST].sort((a, b) => {
      const aMid = (DINOSAURS[a].periodStart + DINOSAURS[a].periodEnd) / 2;
      const bMid = (DINOSAURS[b].periodStart + DINOSAURS[b].periodEnd) / 2;
      return Math.abs(aMid - year) - Math.abs(bMid - year);
    });

    if (sorted[0]) {
      this.animateSpeciesTransition(0, sorted[0]);
    }
    if (sorted[1]) {
      this.animateSpeciesTransition(1, sorted[1]);
    }

    const period = GEOLOGICAL_PERIODS.find(
      (p) => year <= p.start && year >= p.end
    );
    if (period) {
      this.uiManager.setTimelineBackgroundColor(period.color);
    }
  }

  private handleTimelineNodeClick(species: DinosaurSpecies): void {
    this.uiManager.showSpeciesModal(species);
    const dino = DINOSAURS[species];
    const midYear = (dino.periodStart + dino.periodEnd) / 2;
    this.uiManager.setTimelineYear(midYear);

    const period = GEOLOGICAL_PERIODS.find(
      (p) => midYear <= p.start && midYear >= p.end
    );
    if (period) {
      this.uiManager.setTimelineBackgroundColor(period.color);
    }
  }

  private loadSpecies(viewport: 0 | 1, species: DinosaurSpecies): void {
    const vp = this.viewports[viewport];
    if (vp.skeleton) {
      vp.sceneHolder.remove(vp.skeleton.group);
      vp.skeleton.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
    }

    vp.species = species;
    const skeleton = createSkeleton(species, this.displayMode);
    setSkeletonOpacity(skeleton, 0);
    vp.sceneHolder.add(skeleton.group);
    vp.skeleton = skeleton;

    const startTime = performance.now();
    const duration = 500;
    const fadeIn = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (vp.skeleton) {
        setSkeletonOpacity(vp.skeleton, eased);
      }
      if (progress < 1) {
        requestAnimationFrame(fadeIn);
      } else if (this.displayMode === 'anatomy' && vp.skeleton) {
        animateLabelsIn(vp.skeleton.labels, 0.3);
      }
    };
    requestAnimationFrame(fadeIn);
  }

  private animateSpeciesTransition(viewport: 0 | 1, species: DinosaurSpecies): void {
    const vp = this.viewports[viewport];
    if (vp.species === species) return;

    if (vp.skeleton) {
      const oldSkeleton = vp.skeleton;
      const startTime = performance.now();
      const duration = 250;
      const fadeOut = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setSkeletonOpacity(oldSkeleton, 1 - progress);
        if (progress < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          this.loadSpecies(viewport as 0 | 1, species);
          const selected = this.uiManager.getSelectedSpecies();
          selected[viewport] = species;
          this.uiManager.updateViewportLabels(selected);
        }
      };
      requestAnimationFrame(fadeOut);
    } else {
      this.loadSpecies(viewport as 0 | 1, species);
    }
  }

  private handleResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);

    this.viewports.forEach((vp) => {
      if (vp.container) {
        const rect = vp.container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          vp.camera.aspect = rect.width / rect.height;
          vp.camera.updateProjectionMatrix();
        }
      }
    });
    this.uiManager.renderTimeline();
  }

  private updateCamera(vp: ViewportState): void {
    const baseDistance = 12;
    const distance = baseDistance / vp.zoom;

    vp.camera.position.x = Math.sin(vp.rotY) * Math.cos(vp.rotX) * distance + vp.panX;
    vp.camera.position.y = Math.sin(vp.rotX) * distance + 2 + vp.panY;
    vp.camera.position.z = Math.cos(vp.rotY) * Math.cos(vp.rotX) * distance;
    vp.camera.lookAt(vp.panX, 2 + vp.panY, 0);
    vp.camera.up.set(0, 1, 0);

    if (vp.skeleton) {
      const distToCenter = vp.camera.position.length();
      updateSkeletonLOD(vp.skeleton, distToCenter);
    }
  }

  private renderViewport(vp: ViewportState): void {
    if (!vp.container) return;

    const rect = vp.container.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return;

    const rendererRect = this.renderer.domElement.getBoundingClientRect();
    const left = rect.left - rendererRect.left;
    const bottom = rendererRect.bottom - rect.bottom;
    const width = rect.width;
    const height = rect.height;

    this.renderer.setViewport(left, bottom, width, height);
    this.renderer.setScissor(left, bottom, width, height);
    this.renderer.setScissorTest(true);

    this.updateCamera(vp);
    vp.camera.aspect = width / Math.max(1, height);
    vp.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, vp.camera);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    this.renderer.setClearColor(0x0f0f1a, 1);
    this.renderer.clear();

    for (const vp of this.viewports) {
      this.renderViewport(vp);
    }

    this.renderer.setScissorTest(false);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new DinosaurApp();
});
