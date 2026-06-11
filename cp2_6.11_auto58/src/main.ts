import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StationManager, Station } from './StationManager';
import { LineManager, MetroLine } from './LineManager';
import { TrainSimulator } from './TrainSimulator';
import { UIPanel } from './UIPanel';

interface SceneExportData {
  stations: ReturnType<StationManager['exportData']>;
  lines: ReturnType<LineManager['exportData']>;
  simulator: ReturnType<TrainSimulator['exportData']>;
  version: string;
}

class MetroPlannerApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private ground: THREE.Mesh;
  private grid: THREE.GridHelper;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private stationManager: StationManager;
  private lineManager: LineManager;
  private trainSimulator: TrainSimulator;
  private uiPanel: UIPanel;

  private clock: THREE.Clock;
  private isDraggingStation: boolean = false;
  private draggedStation: Station | null = null;
  private dragStartPos: THREE.Vector2 = new THREE.Vector2();
  private isCreatingLine: boolean = false;
  private lineStartStation: Station | null = null;
  private tempLineMesh: THREE.Line | null = null;
  private hoverStation: Station | null = null;
  private fileInput: HTMLInputElement;

  private readonly DEFAULT_CAMERA_POS = new THREE.Vector3(15, 15, 15);
  private readonly DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 40, 100);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.DEFAULT_CAMERA_POS);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.copy(this.DEFAULT_CAMERA_TARGET);
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.ground = this.createGround();
    this.grid = this.createGrid();
    this.scene.add(this.ground, this.grid);
    this.setupLights();

    this.stationManager = new StationManager(this.scene);
    this.lineManager = new LineManager(this.scene, this.stationManager);
    this.trainSimulator = new TrainSimulator(this.scene, this.lineManager, this.stationManager);

    this.uiPanel = new UIPanel(
      document.getElementById('app')!,
      this.stationManager,
      this.lineManager,
      this.trainSimulator,
      {
        onExport: () => this.exportScene(),
        onImport: () => this.triggerImport(),
        onResetView: () => this.resetCamera(),
        onClearAll: () => this.clearAll()
      }
    );

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', (e) => this.handleFileImport(e));
    document.body.appendChild(this.fileInput);

    this.setupEventListeners();
    this.uiPanel.refreshAll();

    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.remove(), 500);
      }
    }, 300);

    this.animate();
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    return ground;
  }

  private createGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(100, 50, 0x3a3a5e, 0x2a2a4e);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.6;
    return grid;
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x64c8ff, 0.5, 50);
    pointLight1.position.set(-10, 10, -10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa29bfe, 0.4, 50);
    pointLight2.position.set(10, 8, 10);
    this.scene.add(pointLight2);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const dropZone = document.getElementById('file-drop-zone')!;
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('active');
    });
    window.addEventListener('dragleave', (e) => {
      if (e.clientX === 0 && e.clientY === 0) {
        dropZone.classList.remove('active');
      }
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('active');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.processFile(files[0]);
      }
    });
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectGround(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  private intersectStations(): Station | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const allMeshes: THREE.Object3D[] = [];
    for (const station of this.stationManager.getAllStations()) {
      allMeshes.push(station.cube);
    }
    const intersects = this.raycaster.intersectObjects(allMeshes, true);
    if (intersects.length > 0) {
      return this.stationManager.findStationByObject(intersects[0].object);
    }
    return null;
  }

  private onMouseDown(e: MouseEvent): void {
    this.updateMouse(e);

    if (e.button === 2) {
      const station = this.intersectStations();
      if (station) {
        for (const line of this.lineManager.getAllLines()) {
          this.lineManager.removeStationFromLine(line.id, station.id);
        }
        this.stationManager.removeStation(station.id);
        this.uiPanel.refreshAll();
        return;
      }
    }

    if (e.button === 0) {
      const station = this.intersectStations();
      if (station) {
        this.isDraggingStation = true;
        this.draggedStation = station;
        this.dragStartPos.set(e.clientX, e.clientY);
        this.controls.enabled = false;
        this.isCreatingLine = true;
        this.lineStartStation = station;
        return;
      }

      const point = this.intersectGround();
      if (point) {
        const color = this.uiPanel.getDefaultStationColor();
        const size = this.uiPanel.getDefaultStationSize();
        const newStation = this.stationManager.addStation(
          new THREE.Vector3(point.x, size / 2, point.z),
          color,
          size
        );
        this.uiPanel.refreshAll();
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e);

    const station = this.intersectStations();
    if (this.hoverStation && this.hoverStation !== station) {
      this.hoverStation.hideProjection();
      this.hoverStation = null;
    }
    if (station && station !== this.hoverStation) {
      station.showProjection();
      this.hoverStation = station;
    }

    if (this.isDraggingStation && this.draggedStation) {
      const dx = e.clientX - this.dragStartPos.x;
      const dy = e.clientY - this.dragStartPos.y;
      const movedEnough = Math.sqrt(dx * dx + dy * dy) > 3;

      if (movedEnough) {
        this.isCreatingLine = false;
        this.removeTempLine();
      }

      if (!this.isCreatingLine) {
        const point = this.intersectGround();
        if (point) {
          const size = this.draggedStation.size;
          this.stationManager.moveStation(
            this.draggedStation.id,
            new THREE.Vector3(point.x, size / 2, point.z)
          );
        }
      }

      if (this.isCreatingLine && this.lineStartStation) {
        this.updateTempLine(e);
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      if (this.isCreatingLine && this.lineStartStation) {
        this.updateMouse(e);
        const endStation = this.intersectStations();
        if (endStation && endStation.id !== this.lineStartStation.id) {
          let connected = false;
          for (const line of this.lineManager.getAllLines()) {
            const ids = line.stationIds;
            const startIdx = ids.indexOf(this.lineStartStation.id);
            const endIdx = ids.indexOf(endStation.id);
            if (startIdx !== -1 && endIdx !== -1 && Math.abs(startIdx - endIdx) === 1) {
              connected = true;
              break;
            }
            if (startIdx === ids.length - 1 && endIdx === 0) {
              connected = true;
              break;
            }
          }

          if (!connected) {
            let addedToExisting = false;
            for (const line of this.lineManager.getAllLines()) {
              const ids = line.stationIds;
              if (ids[ids.length - 1] === this.lineStartStation.id && !ids.includes(endStation.id)) {
                this.lineManager.addStationToLine(line.id, endStation.id);
                addedToExisting = true;
                break;
              }
              if (ids[0] === endStation.id && !ids.includes(this.lineStartStation.id)) {
                line.stationIds.unshift(this.lineStartStation.id);
                this.lineManager.rebuildLine(line.id);
                addedToExisting = true;
                break;
              }
            }

            if (!addedToExisting) {
              this.lineManager.createLine([this.lineStartStation.id, endStation.id]);
              this.trainSimulator.createTrainsForAllLines();
            }
            this.uiPanel.refreshAll();
          }
        }
      }

      this.removeTempLine();
    }

    this.isDraggingStation = false;
    this.draggedStation = null;
    this.isCreatingLine = false;
    this.lineStartStation = null;
    this.controls.enabled = true;
  }

  private updateTempLine(_e: MouseEvent): void {
    if (!this.lineStartStation) return;
    const point = this.intersectGround();
    if (!point) return;

    if (!this.tempLineMesh) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        this.lineStartStation.position,
        point
      ]);
      const material = new THREE.LineDashedMaterial({
        color: 0x64c8ff,
        dashSize: 0.3,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.8
      });
      this.tempLineMesh = new THREE.Line(geometry, material);
      this.tempLineMesh.computeLineDistances();
      this.scene.add(this.tempLineMesh);
    } else {
      const positions = this.tempLineMesh.geometry.attributes.position.array as Float32Array;
      positions[3] = point.x;
      positions[4] = point.y + this.lineStartStation.size / 2;
      positions[5] = point.z;
      this.tempLineMesh.geometry.attributes.position.needsUpdate = true;
      this.tempLineMesh.computeLineDistances();
    }
  }

  private removeTempLine(): void {
    if (this.tempLineMesh) {
      this.scene.remove(this.tempLineMesh);
      this.tempLineMesh.geometry.dispose();
      (this.tempLineMesh.material as THREE.Material).dispose();
      this.tempLineMesh = null;
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'r' || e.key === 'R') {
      this.resetCamera();
    }
  }

  private resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = this.DEFAULT_CAMERA_POS.clone();
    const endTarget = this.DEFAULT_CAMERA_TARGET.clone();
    const duration = 1000;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      this.camera.position.lerpVectors(startPos, endPos, ease);
      this.controls.target.lerpVectors(startTarget, endTarget, ease);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  private clearAll(): void {
    this.trainSimulator.clearAll();
    this.lineManager.clearAll();
    this.stationManager.clearAll();
    this.uiPanel.refreshAll();
  }

  private exportScene(): void {
    const data: SceneExportData = {
      stations: this.stationManager.exportData(),
      lines: this.lineManager.exportData(),
      simulator: this.trainSimulator.exportData(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metro-plan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private triggerImport(): void {
    this.fileInput.click();
  }

  private handleFileImport(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
    input.value = '';
  }

  private processFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as SceneExportData;
        if (!data.stations || !data.lines) {
          alert('无效的场景数据文件');
          return;
        }

        this.trainSimulator.clearAll();
        this.lineManager.clearAll();
        this.stationManager.clearAll();

        this.stationManager.importData(data.stations);
        this.lineManager.importData(data.lines);
        this.trainSimulator.createTrainsForAllLines();
        if (data.simulator) {
          this.trainSimulator.importData(data.simulator);
        }

        this.uiPanel.refreshAll();

        const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
        const speedValue = document.getElementById('speed-value');
        const speedTrack = document.getElementById('speed-track') as HTMLElement;
        if (speedSlider && speedValue && speedTrack) {
          speedSlider.value = String(this.trainSimulator.globalSpeed);
          speedValue.textContent = this.trainSimulator.globalSpeed.toFixed(1) + 'x';
          const pct = ((this.trainSimulator.globalSpeed - 0.5) / 2.5) * 100;
          speedTrack.style.width = pct + '%';
        }
      } catch (err) {
        alert('导入失败：无效的 JSON 文件');
        console.error(err);
      }
    };
    reader.readAsText(file);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.controls.update();
    this.trainSimulator.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MetroPlannerApp();
});
