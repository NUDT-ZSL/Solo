import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VoxelGrid } from '@voxel/VoxelGrid';
import { VoxelRenderer } from '@render/VoxelRenderer';
import { CutPlaneManager } from '@interaction/CutPlane';
import { ControlPanel } from '@ui/ControlPanel';
import type { Point3D, ProbeResult } from '@/types';
import { eventBus } from '@/utils/EventBus';
import './style.css';

class VoxelFlowApp {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private voxelGrid: VoxelGrid;
  private voxelRenderer: VoxelRenderer;
  private cutPlaneManager: CutPlaneManager;
  private controlPanel: ControlPanel;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private clock: THREE.Clock = new THREE.Clock();
  private frameCount: number = 0;
  private lastFpsTime: number = 0;

  private infoPanel: HTMLElement;
  private dropZone: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.infoPanel = document.getElementById('info-panel') as HTMLElement;
    this.dropZone = document.getElementById('drop-zone-overlay') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    this.camera.position.set(3, 3, 3);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x1a1a2e, 1);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 20;

    this.setupLights();
    this.setupHelpers();

    this.voxelGrid = new VoxelGrid(32);
    this.voxelRenderer = new VoxelRenderer(this.scene);
    this.cutPlaneManager = new CutPlaneManager(this.scene, this.camera, this.renderer);
    this.controlPanel = new ControlPanel();

    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(5, 10, 7);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x4a9eff, 0.4);
    dir2.position.set(-5, -3, -5);
    this.scene.add(dir2);

    const dir3 = new THREE.DirectionalLight(0xff8c42, 0.3);
    dir3.position.set(0, 5, -10);
    this.scene.add(dir3);
  }

  private setupHelpers(): void {
    const gridHelper = new THREE.GridHelper(6, 12, 0x2a2a4a, 0x1f1f3f);
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    eventBus.on('csv:loaded', (points: Point3D[]) => this.onDataLoaded(points));
    eventBus.on('csv:error', (msg: string) => console.error('[CSV Error]', msg));
    eventBus.on('cutplane:changed', () => this.voxelRenderer.updateInstances());
    eventBus.on('settings:changed', () => this.onSettingsChanged());

    this.controlPanel.onFileLoaded((points) => this.onDataLoaded(points as Point3D[]));
    this.controlPanel.onChange(() => this.onSettingsChanged());

    this.canvas.addEventListener('pointerdown', this.onCanvasClick.bind(this));

    this.setupDragAndDrop();
  }

  private setupDragAndDrop(): void {
    const app = document.getElementById('app')!;

    app.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('hidden');
    });
    app.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    app.addEventListener('dragleave', (e) => {
      const rect = app.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        this.dropZone.classList.add('hidden');
      }
    });
    app.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.dropZone.classList.add('hidden');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
          try {
            const points = await this.controlPanel.csvLoader.loadFromFile(file);
            this.onDataLoaded(points);
          } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to load CSV');
          }
        } else {
          alert('Please drop a CSV file');
        }
      }
    });
  }

  private onDataLoaded(points: Point3D[]): void {
    console.log(`[VoxelFlow] Loaded ${points.length} points`);
    this.voxelGrid.build(points);
    this.voxelRenderer.setVoxelGrid(this.voxelGrid);
    this.cutPlaneManager.setVoxelGrid(this.voxelGrid);

    const bb = this.voxelGrid.boundingBox;
    const center = new THREE.Vector3(
      (bb.minX + bb.maxX) / 2,
      (bb.minY + bb.maxY) / 2,
      (bb.minZ + bb.maxZ) / 2
    );
    const size = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY, bb.maxZ - bb.minZ);
    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + size * 1.5,
      center.y + size * 1.2,
      center.z + size * 1.5
    );
    this.controls.update();
    eventBus.emit('voxel:built');
  }

  private onSettingsChanged(): void {
    const s = this.controlPanel.settings;

    if (this.voxelGrid.resolution !== s.resolution) {
      this.voxelGrid.setResolution(s.resolution);
      this.voxelRenderer.rebuildMesh();
      this.cutPlaneManager.setVoxelGrid(this.voxelGrid);
    }

    this.voxelRenderer.setMappingMode(s.mappingMode);
    this.voxelRenderer.probeRadius = s.probeRadius;
    if (this.voxelRenderer.probeCenter) {
      this.voxelRenderer.setProbe(this.voxelRenderer.probeCenter, s.probeRadius);
      this.updateProbeInfo();
    }
    if (!s.probeEnabled) {
      this.voxelRenderer.setProbe(null, 0);
      this.infoPanel.classList.add('hidden');
    }

    this.cutPlaneManager.setPlaneEnabled('x', s.cutXEnabled);
    this.cutPlaneManager.setPlaneEnabled('y', s.cutYEnabled);
    this.cutPlaneManager.setPlaneEnabled('z', s.cutZEnabled);
    if (s.cutXEnabled) this.cutPlaneManager.setPlanePosition('x', s.cutXPosition, false);
    if (s.cutYEnabled) this.cutPlaneManager.setPlanePosition('y', s.cutYPosition, false);
    if (s.cutZEnabled) this.cutPlaneManager.setPlanePosition('z', s.cutZPosition, false);
  }

  private onCanvasClick(e: PointerEvent): void {
    if (!this.controlPanel.settings.probeEnabled) return;
    if (!this.voxelGrid || this.voxelGrid.voxels.size === 0) return;

    if (e.button !== 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const bb = this.voxelGrid.boundingBox;
    const size = Math.max(bb.maxX - bb.minX, bb.maxY - bb.minY, bb.maxZ - bb.minZ);
    const center = new THREE.Vector3(
      (bb.minX + bb.maxX) / 2,
      (bb.minY + bb.maxY) / 2,
      (bb.minZ + bb.maxZ) / 2
    );

    const box = new THREE.Box3(
      new THREE.Vector3(bb.minX, bb.minY, bb.minZ),
      new THREE.Vector3(bb.maxX, bb.maxY, bb.maxZ)
    );

    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectBox(box, hit)) {
      this.voxelRenderer.setProbe(hit, this.controlPanel.settings.probeRadius);
      this.updateProbeInfo();
    } else {
      const dir = this.raycaster.ray.direction.clone();
      const distance = size * 1.5;
      const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
      this.voxelRenderer.setProbe(pos, this.controlPanel.settings.probeRadius);
      this.updateProbeInfo();
    }
  }

  private updateProbeInfo(): void {
    if (!this.voxelRenderer.probeCenter || !this.voxelGrid) {
      this.infoPanel.classList.add('hidden');
      return;
    }

    const center = this.voxelRenderer.probeCenter;
    const radius = this.controlPanel.settings.probeRadius * this.voxelGrid.voxelSize;
    const voxels = this.voxelGrid.querySphere(center.x, center.y, center.z, radius);

    if (voxels.length === 0) {
      this.infoPanel.classList.add('hidden');
      return;
    }

    let minD = Infinity, maxD = -Infinity, sumD = 0;
    for (const v of voxels) {
      minD = Math.min(minD, v.density);
      maxD = Math.max(maxD, v.density);
      sumD += v.density;
    }
    const avgD = sumD / voxels.length;

    (document.getElementById('probe-x') as HTMLElement).textContent = center.x.toFixed(3);
    (document.getElementById('probe-y') as HTMLElement).textContent = center.y.toFixed(3);
    (document.getElementById('probe-z') as HTMLElement).textContent = center.z.toFixed(3);
    (document.getElementById('probe-count') as HTMLElement).textContent = String(voxels.length);
    (document.getElementById('probe-min') as HTMLElement).textContent = minD.toFixed(3);
    (document.getElementById('probe-max') as HTMLElement).textContent = maxD.toFixed(3);
    (document.getElementById('probe-avg') as HTMLElement).textContent = avgD.toFixed(3);

    this.infoPanel.classList.remove('hidden');

    const result: ProbeResult = {
      centerX: center.x,
      centerY: center.y,
      centerZ: center.z,
      voxels,
      minDensity: minD,
      maxDensity: maxD,
      avgDensity: avgD
    };
    eventBus.emit('probe:result', result);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();

    this.controls.update();
    this.voxelRenderer.update();

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime > 2000) {
      const fps = (this.frameCount * 1000) / (now - this.lastFpsTime);
      console.log(`[VoxelFlow] FPS: ${fps.toFixed(1)}`);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new VoxelFlowApp();
});
