import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { StationManager } from './StationManager';
import { LineManager } from './LineManager';
import { TrainSimulator } from './TrainSimulator';
import { UIPanel } from './UIPanel';
import type { StationData, LineData, MetroProjectData } from './types';

class MetroPlannerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private canvas: HTMLCanvasElement;
  private groundPlane: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private stationManager: StationManager;
  private lineManager: LineManager;
  private trainSimulator: TrainSimulator;
  private uiPanel: UIPanel;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseNDC: THREE.Vector2 = new THREE.Vector2();
  private mouseScreen: THREE.Vector2 = new THREE.Vector2();

  private isDragging: boolean = false;
  private isDraggingStation: boolean = false;
  private draggedStationId: string | null = null;
  private isConnecting: boolean = false;
  private connectStartStationId: string | null = null;
  private connectionLine: THREE.Line | null = null;
  private dragStartScreen: THREE.Vector2 = new THREE.Vector2();
  private readonly DRAG_THRESHOLD: number = 6;

  private previewProjection: THREE.Mesh | null = null;

  private defaultCameraPos: THREE.Vector3 = new THREE.Vector3(15, 15, 15);
  private defaultTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isAnimatingCamera: boolean = false;
  private cameraAnimStart: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private cameraAnimEnd: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private cameraAnimT: number = 0;
  private readonly CAMERA_ANIM_DURATION: number = 1;

  private clock: THREE.Clock = new THREE.Clock();
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;
  private fpsCounterEl: HTMLElement | null = null;
  private loadStartTime: number = performance.now();

  private fileInput: HTMLInputElement | null = null;

  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.fpsCounterEl = document.getElementById('fps-counter');

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer(this.canvas);
    this.composer = this.createComposer();
    this.controls = this.createControls();

    this.groundPlane = this.createGround();
    this.gridHelper = this.createGrid();
    this.scene.add(this.groundPlane);
    this.scene.add(this.gridHelper);

    this.setupLights();
    this.setupPreviewProjection();

    this.stationManager = new StationManager(this.scene, this.groundPlane);
    this.lineManager = new LineManager(this.scene, this.stationManager);
    this.trainSimulator = new TrainSimulator(this.scene, this.lineManager, this.stationManager);

    this.uiPanel = new UIPanel(document.body, {
      onRemoveStation: (id) => this.removeStation(id),
      onUpdateStationSize: (id, size) => {
        this.stationManager.updateStationSize(id, size);
        this.lineManager.regenerateAllTracks();
        this.refreshUI();
      },
      onUpdateStationColor: (id, color) => {
        this.stationManager.updateStationColor(id, color);
        this.refreshUI();
      },
      onUpdateLineName: (id, name) => {
        this.lineManager.updateLineName(id, name);
        this.refreshUI();
      },
      onUpdateLineColor: (id, color) => {
        this.lineManager.updateLineColor(id, color);
        this.refreshUI();
      },
      onUpdateLineOpacity: (id, opacity) => {
        this.lineManager.updateLineOpacity(id, opacity);
        this.refreshUI();
      },
      onRemoveLine: (id) => this.removeLine(id),
      onSpeedChange: (speed) => this.trainSimulator.setGlobalSpeedMultiplier(speed),
      onExport: () => this.exportData(),
      onImport: () => this.triggerFilePicker(),
      onToggleSimulation: () => this.toggleSimulation(),
      onResetView: () => this.resetCamera(),
      onClearAll: () => this.clearAll(),
    });

    this.setupInputHandlers();
    this.setupFileInput();
    this.setupDropHandlers();

    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.trainSimulator.startSimulation();
    this.uiPanel.setSimulationRunning(true);

    this.hideLoading();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    camera.position.copy(this.defaultCameraPos);
    camera.lookAt(this.defaultTarget);
    return camera;
  }

  private createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    return renderer;
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,
      0.4,
      0.85,
    );
    composer.addPass(bloomPass);
    return composer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.7;
    controls.minDistance = 3;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.copy(this.defaultTarget);
    controls.update();
    return controls;
  }

  private createGround(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(100, 100);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.userData.isGround = true;
    return mesh;
  }

  private createGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(100, 100, 0x3a3a5e, 0x2a2a4e);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    grid.position.y = 0.001;
    return grid;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.45);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x6488c8, 0.25);
    fillLight.position.set(-10, 15, -10);
    this.scene.add(fillLight);
  }

  private setupPreviewProjection(): void {
    const geo = new THREE.CircleGeometry(0.56, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x64c8ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.005;
    mesh.visible = false;
    this.previewProjection = mesh;
    this.scene.add(mesh);
  }

  private setupInputHandlers(): void {
    const canvas = this.canvas;

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.onContextMenu(e);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        this.resetCamera();
      }
    });
  }

  private setupFileInput(): void {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,application/json';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);
    this.fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.importData(file);
      if (this.fileInput) this.fileInput.value = '';
    });
  }

  private setupDropHandlers(): void {
    const overlay = document.getElementById('drop-overlay');
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        overlay?.classList.add('active');
      }
    });
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (e.clientX === 0 && e.clientY === 0) {
        overlay?.classList.remove('active');
      }
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      overlay?.classList.remove('active');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.json')) {
        this.importData(file);
      } else {
        this.uiPanel.showNotification('请拖入 JSON 格式的方案文件');
      }
    });
  }

  private updateMouseFromEvent(e: PointerEvent | MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.mouseScreen.set(e.clientX, e.clientY);
  }

  private getGroundIntersection(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const hits = this.raycaster.intersectObject(this.groundPlane, false);
    return hits.length > 0 ? hits[0].point.clone() : null;
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.updateMouseFromEvent(e);
    this.dragStartScreen.copy(this.mouseScreen);
    this.isDragging = true;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const stationHits = this.stationManager.raycastStations(this.raycaster);

    if (stationHits.length > 0) {
      this.isDraggingStation = true;
      this.draggedStationId = stationHits[0].id;
      this.connectStartStationId = stationHits[0].id;
      this.controls.enabled = false;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    this.updateMouseFromEvent(e);

    const groundPoint = this.getGroundIntersection();

    if (groundPoint && this.previewProjection) {
      this.previewProjection.position.set(groundPoint.x, 0.005, groundPoint.z);
      this.previewProjection.visible = !this.isDragging;
    } else if (this.previewProjection) {
      this.previewProjection.visible = false;
    }

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const stationHits = this.stationManager.raycastStations(this.raycaster);
    this.stationManager.setHovered(stationHits.length > 0 ? stationHits[0].id : null);

    if (this.isDragging && this.draggedStationId) {
      const moved = this.mouseScreen.distanceTo(this.dragStartScreen);
      if (moved > this.DRAG_THRESHOLD) {
        this.isConnecting = false;
      }
      if (groundPoint && this.isDraggingStation) {
        this.stationManager.moveStation(this.draggedStationId, groundPoint);
        this.lineManager.regenerateAllTracks();
      }
      if (this.connectStartStationId && moved > this.DRAG_THRESHOLD) {
        this.isConnecting = true;
        this.updateConnectionLine(groundPoint);
      }
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.button !== 0 && this.isDragging) return;
    const moved = this.isDragging ? this.mouseScreen.distanceTo(this.dragStartScreen) : 0;

    if (this.isDragging && moved <= this.DRAG_THRESHOLD && !this.draggedStationId) {
      this.updateMouseFromEvent(e);
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const stationHits = this.stationManager.raycastStations(this.raycaster);
      if (stationHits.length === 0) {
        const groundPoint = this.getGroundIntersection();
        if (groundPoint) {
          const station = this.stationManager.addStation(groundPoint);
          this.uiPanel.showNotification(`已创建 ${station.name}`);
          this.refreshUI();
        }
      }
    }

    if (this.isConnecting && this.connectStartStationId) {
      this.updateMouseFromEvent(e);
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const stationHits = this.stationManager.raycastStations(this.raycaster);
      const endId = stationHits.length > 0 ? stationHits[0].id : null;
      if (endId && endId !== this.connectStartStationId) {
        const line = this.lineManager.addLine([this.connectStartStationId, endId]);
        if (line) {
          this.trainSimulator.createTrainForLine(line.id, 0);
          this.uiPanel.showNotification(`已创建 ${line.name}`);
          this.refreshUI();
        }
      }
    }

    this.clearConnectionLine();
    this.isDragging = false;
    this.isDraggingStation = false;
    this.isConnecting = false;
    this.draggedStationId = null;
    this.connectStartStationId = null;
    this.controls.enabled = true;
  }

  private onContextMenu(e: MouseEvent): void {
    this.updateMouseFromEvent(e);
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const stationHits = this.stationManager.raycastStations(this.raycaster);
    if (stationHits.length > 0) {
      const id = stationHits[0].id;
      const station = this.stationManager.getStationById(id);
      this.removeStation(id);
      if (station) this.uiPanel.showNotification(`已删除 ${station.name}`);
    }
  }

  private updateConnectionLine(groundPoint: THREE.Vector3 | null): void {
    if (!this.connectStartStationId) return;
    const startGroup = this.stationManager.getStationGroup(this.connectStartStationId);
    if (!startGroup) return;
    const endPos = groundPoint ?? startGroup.position.clone();

    if (!this.connectionLine) {
      const startStation = this.stationManager.getStationById(this.connectStartStationId);
      const color = startStation ? new THREE.Color(startStation.color) : new THREE.Color(0x64c8ff);
      const geo = new THREE.BufferGeometry().setFromPoints([startGroup.position.clone(), endPos.clone()]);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        linewidth: 2,
      });
      this.connectionLine = new THREE.Line(geo, mat);
      this.scene.add(this.connectionLine);
    } else {
      const positions = this.connectionLine.geometry.attributes.position as THREE.BufferAttribute;
      positions.setXYZ(0, startGroup.position.x, startGroup.position.y, startGroup.position.z);
      positions.setXYZ(1, endPos.x, endPos.y, endPos.z);
      positions.needsUpdate = true;
      this.connectionLine.geometry.computeBoundingSphere();
    }
  }

  private clearConnectionLine(): void {
    if (this.connectionLine) {
      this.scene.remove(this.connectionLine);
      this.connectionLine.geometry.dispose();
      (this.connectionLine.material as THREE.Material).dispose();
      this.connectionLine = null;
    }
  }

  private removeStation(id: string): void {
    const removedLineIds = this.lineManager.removeLinesContainingStation(id);
    for (const lid of removedLineIds) {
      this.trainSimulator.removeTrainForLine(lid);
    }
    this.stationManager.removeStation(id);
    this.refreshUI();
  }

  private removeLine(id: string): void {
    this.trainSimulator.removeTrainForLine(id);
    this.lineManager.removeLine(id);
    this.refreshUI();
  }

  private toggleSimulation(): void {
    if (this.trainSimulator.isRunning()) {
      this.trainSimulator.stopSimulation();
      this.uiPanel.setSimulationRunning(false);
      this.uiPanel.showNotification('模拟已暂停');
    } else {
      this.trainSimulator.startSimulation();
      this.uiPanel.setSimulationRunning(true);
      this.uiPanel.showNotification('模拟已启动');
    }
  }

  private resetCamera(): void {
    this.cameraAnimStart = {
      pos: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
    this.cameraAnimEnd = {
      pos: this.defaultCameraPos.clone(),
      target: this.defaultTarget.clone(),
    };
    this.cameraAnimT = 0;
    this.isAnimatingCamera = true;
  }

  private updateCameraAnimation(delta: number): void {
    if (!this.isAnimatingCamera || !this.cameraAnimStart || !this.cameraAnimEnd) return;
    this.cameraAnimT = Math.min(1, this.cameraAnimT + delta / this.CAMERA_ANIM_DURATION);
    const t = this.easeInOutCubic(this.cameraAnimT);
    this.camera.position.lerpVectors(this.cameraAnimStart.pos, this.cameraAnimEnd.pos, t);
    this.controls.target.lerpVectors(this.cameraAnimStart.target, this.cameraAnimEnd.target, t);
    this.controls.update();
    if (this.cameraAnimT >= 1) {
      this.isAnimatingCamera = false;
      this.cameraAnimStart = null;
      this.cameraAnimEnd = null;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private clearAll(): void {
    if (!confirm('确定要清空所有站点和线路吗？此操作不可撤销。')) return;
    this.trainSimulator.clearAll();
    this.lineManager.clearAll();
    this.stationManager.clearAll();
    this.refreshUI();
    this.uiPanel.showNotification('已清空所有内容');
  }

  private refreshUI(): void {
    const stations = this.stationManager.getAllStations();
    const lines = this.lineManager.getAllLines();
    const stationNames = new Map<string, string>();
    for (const s of stations) stationNames.set(s.id, s.name);
    this.uiPanel.renderStationList(stations);
    this.uiPanel.renderLineList(lines, stationNames);
  }

  private triggerFilePicker(): void {
    this.fileInput?.click();
  }

  private exportData(): void {
    const data: MetroProjectData = {
      version: '1.0',
      exportedAt: Date.now(),
      stations: this.stationManager.getAllStations(),
      lines: this.lineManager.getAllLines(),
      trains: this.trainSimulator.getAllTrainStates(),
      settings: {
        globalSpeedMultiplier: this.trainSimulator.getGlobalSpeedMultiplier(),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metro-plan-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.uiPanel.showNotification('方案已导出为 JSON 文件');
  }

  private importData(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as MetroProjectData;
        if (data.version !== '1.0') {
          this.uiPanel.showNotification('不支持的文件版本');
          return;
        }
        this.trainSimulator.clearAll();
        this.lineManager.clearAll();
        this.stationManager.clearAll();

        let maxStationNum = 0;
        for (const sd of data.stations) {
          const pos = new THREE.Vector3(sd.position.x, sd.position.y ?? 0, sd.position.z);
          this.stationManager.addStation(pos, sd);
          const numMatch = sd.name.match(/站点(\d+)/);
          if (numMatch) maxStationNum = Math.max(maxStationNum, parseInt(numMatch[1]));
        }
        this.stationManager.restoreStationCounter(maxStationNum);

        const usedColors: string[] = [];
        let maxLineNum = 0;
        for (const ld of data.lines) {
          this.lineManager.restoreUsedColors([ld.color]);
          usedColors.push(ld.color);
          const line = this.lineManager.addLine(ld.stationIds);
          if (line) {
            this.lineManager.updateLineName(line.id, ld.name);
            this.lineManager.updateLineColor(line.id, ld.color);
            this.lineManager.updateLineOpacity(line.id, ld.opacity);
            const numMatch = ld.name.match(/(\d+)号线/);
            if (numMatch) maxLineNum = Math.max(maxLineNum, parseInt(numMatch[1]));
          }
        }
        this.lineManager.restoreUsedColors(usedColors);
        this.lineManager.restoreLineCounter(maxLineNum);

        if (data.settings?.globalSpeedMultiplier) {
          this.trainSimulator.setGlobalSpeedMultiplier(data.settings.globalSpeedMultiplier);
          this.uiPanel.setCurrentSpeed(data.settings.globalSpeedMultiplier);
        }

        const allLines = this.lineManager.getAllLines();
        for (const trainInfo of data.trains) {
          let matchedLineId = trainInfo.lineId;
          if (!this.lineManager.getLineById(matchedLineId)) {
            const idx = data.lines.findIndex(l => l.id === trainInfo.lineId);
            matchedLineId = allLines[idx]?.id ?? allLines[0]?.id;
          }
          if (matchedLineId) {
            this.trainSimulator.createTrainForLine(matchedLineId, trainInfo.progress);
          }
        }
        for (const line of allLines) {
          if (!data.trains.find(t => {
            const idx = data.lines.findIndex(l => l.id === t.lineId);
            return allLines[idx]?.id === line.id;
          })) {
            this.trainSimulator.createTrainForLine(line.id, 0);
          }
        }

        this.trainSimulator.startSimulation();
        this.uiPanel.setSimulationRunning(true);
        this.refreshUI();
        this.uiPanel.showNotification('方案导入成功');
      } catch (err) {
        console.error(err);
        this.uiPanel.showNotification('导入失败：文件格式无效');
      }
    };
    reader.readAsText(file);
  }

  private updateFps(delta: number): void {
    this.frameCount++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
      if (this.fpsCounterEl) {
        this.fpsCounterEl.textContent = `${this.currentFps} FPS`;
        this.fpsCounterEl.className = '';
        if (this.currentFps >= 55) this.fpsCounterEl.classList.add('ok');
        else if (this.currentFps >= 45) this.fpsCounterEl.classList.add('warn');
        else this.fpsCounterEl.classList.add('bad');
      }
    }
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => loading.classList.add('hidden'), 200);
    }
    const elapsed = performance.now() - this.loadStartTime;
    console.log(`[MetroPlanner] 场景加载完成，耗时 ${elapsed.toFixed(1)}ms`);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.updateCameraAnimation(delta);
    this.controls.update();
    this.trainSimulator.update(delta);
    this.composer.render();
    this.updateFps(delta);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.trainSimulator.dispose();
    this.lineManager.dispose();
    this.stationManager.dispose();
    this.uiPanel.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.fileInput?.remove();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MetroPlannerApp();
});
