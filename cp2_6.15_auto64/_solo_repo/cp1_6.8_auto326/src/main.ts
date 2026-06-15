import * as THREE from 'three';
import { StarField } from './scene/StarField';
import { OrbitControls } from './controls/OrbitControls';
import { ControlPanel } from './ui/ControlPanel';

class StarOrbitDrift {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private starField: StarField;
  private controlPanel: ControlPanel;

  private animationId = 0;
  private lastClickTime = 0;
  private lastClickMouse = new THREE.Vector2();

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.scene.fog = new THREE.FogExp2(0x0a0014, 0.004);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 20, 60);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.starField = new StarField(this.scene);

    this.controlPanel = new ControlPanel({
      onFlowSpeedChange: (speed) => this.starField.setFlowSpeed(speed),
      onTrackDensityChange: (density) => this.starField.setTrackDensity(density),
      onShowTrajectoryChange: (show) => this.starField.setShowTrajectoryLines(show),
    });

    this.createBackground();
    this.setupEventListeners();
    this.animate();
  }

  private createBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
    gradient.addColorStop(0, '#0a0020');
    gradient.addColorStop(0.4, '#060012');
    gradient.addColorStop(0.7, '#030008');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onClick(event: MouseEvent): void {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    this.lastClickMouse.copy(mouse);

    const now = performance.now();
    if (now - this.lastClickTime < 300) {
      return;
    }
    this.lastClickTime = now;

    const trackIndex = this.starField.getTrackAtMouse(mouse, this.camera);
    if (trackIndex >= 0) {
      this.starField.triggerPulse(trackIndex);
    }
  }

  private onDoubleClick(event: MouseEvent): void {
    event.preventDefault();

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const direction = raycaster.ray.direction.clone();
    const origin = raycaster.ray.origin.clone();
    const shockwaveOrigin = origin.add(direction.multiplyScalar(30));

    this.starField.createShockwave(shockwaveOrigin);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    this.controls.update();
    this.starField.update();

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    this.starField.dispose();
    this.controlPanel.dispose();
    this.renderer.dispose();
  }
}

new StarOrbitDrift();
