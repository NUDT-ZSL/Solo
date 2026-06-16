import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PipeSystem, PipeMeshData } from './pipeSystem';
import { UIPanel } from './uiPanel';
import { COLORS, SCENE_CONFIG, PipeType } from './utils';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private pipeSystem: PipeSystem;
  private uiPanel: UIPanel;
  private container: HTMLElement;

  private clock: THREE.Clock;
  private animationId: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseOnPanel: boolean = false;
  private lockedPipe: PipeMeshData | null = null;
  private lockedScreenX: number = 0;
  private lockedScreenY: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container') || document.body;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(80, 100, 120);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 400;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.zoomSpeed = 0.8;

    this.setupLights();
    this.setupGround();

    this.pipeSystem = new PipeSystem(this.scene, this.camera);
    this.pipeSystem.generatePipes(4);

    this.pipeSystem.setOnHoverCallback((pipe, point) => {
      this.handlePipeHover(pipe, point);
    });

    this.pipeSystem.setOnClickCallback((pipe, point) => {
      this.handlePipeClick(pipe, point);
    });

    this.uiPanel = new UIPanel(this.container, {
      onTogglePipe: (type: PipeType, visible: boolean) => {
        this.pipeSystem.setPipeVisibility(type, visible);
      },
      onSearch: (id: string) => {
        return this.pipeSystem.flashPipeById(id);
      },
      onOpacityChange: (opacity: number) => {
        this.pipeSystem.setGlobalOpacity(opacity);
      }
    });

    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(80, 120, 60);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -150;
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2C3E50, 0.4);
    this.scene.add(hemisphereLight);
  }

  private setupGround(): void {
    const { GROUND_SIZE, GRID_DIVISIONS } = SCENE_CONFIG;

    const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.GROUND,
      transparent: true,
      opacity: COLORS.GROUND_OPACITY,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(
      GROUND_SIZE,
      GRID_DIVISIONS,
      COLORS.GRID,
      COLORS.GRID
    );
    gridHelper.position.y = 0.01;
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.6;
    this.scene.add(gridHelper);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    window.addEventListener('mousemove', (event) => {
      this.mouseX = event.clientX;
      this.mouseY = event.clientY;

      this.isMouseOnPanel = this.uiPanel.isPanelHovered(event.clientX, event.clientY);

      if (!this.isMouseOnPanel) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const normalizedY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.pipeSystem.updateMouse(normalizedX, normalizedY);
      } else if (!this.lockedPipe) {
        this.uiPanel.hideLabel();
      }
    });

    window.addEventListener('click', (event) => {
      if (this.isMouseOnPanel) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const normalizedY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.pipeSystem.updateMouse(normalizedX, normalizedY);
      this.pipeSystem.checkClick();
    });

    this.controls.addEventListener('zoom', () => {
    });
  }

  private handlePipeClick(pipe: PipeMeshData | null, point: THREE.Vector3 | null): void {
    if (pipe && point) {
      this.lockedPipe = pipe;
      const vector = point.clone().project(this.camera);
      this.lockedScreenX = (vector.x * 0.5 + 0.5) * window.innerWidth;
      this.lockedScreenY = (-vector.y * 0.5 + 0.5) * window.innerHeight;
      this.uiPanel.showLabel(pipe, this.lockedScreenX, this.lockedScreenY);
    } else {
      this.lockedPipe = null;
      this.uiPanel.hideLabel();
    }
  }

  private handlePipeHover(pipe: PipeMeshData | null, point: THREE.Vector3 | null): void {
    if (this.lockedPipe) return;

    if (pipe && point && !this.isMouseOnPanel) {
      const vector = point.clone().project(this.camera);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
      this.uiPanel.showLabel(pipe, x, y);
    } else {
      this.uiPanel.hideLabel();
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    this.controls.update();

    if (!this.isMouseOnPanel) {
      this.pipeSystem.checkHover();
    }

    this.pipeSystem.update(deltaTime);

    if (this.lockedPipe && !this.lockedPipe.isFlashing) {
      const centerPoint = this.lockedPipe.data.curve.getPointAt(0.5);
      const vector = centerPoint.clone().project(this.camera);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
      this.uiPanel.showLabel(this.lockedPipe, x, y);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.controls.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
