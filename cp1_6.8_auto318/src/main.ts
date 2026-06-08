import * as THREE from 'three';
import { StarField } from './scene/StarField';
import { OrbitControls } from './controls/OrbitControls';
import { ControlPanel } from './ui/ControlPanel';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private starField: StarField;
  private controlPanel: ControlPanel;
  private clock: THREE.Clock;

  private clickTimer: number | null = null;
  private clickDelay = 250;

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x050010, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050010, 0.008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500,
    );

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.starField = new StarField(this.scene);

    this.controlPanel = new ControlPanel({
      onFlowSpeedChange: (v) => this.starField.setFlowSpeed(v),
      onOrbitDensityChange: (v) => this.starField.setOrbitDensity(v),
      onShowTrajectoryChange: (v) => this.starField.setShowTrajectoryLines(v),
    });

    this.clock = new THREE.Clock();

    this.addBackground();
    this.setupEvents();
    this.animate();
  }

  private addBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0015');
    gradient.addColorStop(0.5, '#050010');
    gradient.addColorStop(1, '#100020');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = tex;
  }

  private setupEvents() {
    window.addEventListener('resize', this.onResize);

    this.renderer.domElement.addEventListener('click', this.onClick);
    this.renderer.domElement.addEventListener('dblclick', this.onDblClick);
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.starField.onResize(Math.min(window.devicePixelRatio, 2));
  };

  private onClick = (e: MouseEvent) => {
    if (this.clickTimer !== null) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
      return;
    }

    this.clickTimer = window.setTimeout(() => {
      this.clickTimer = null;
      const ndc = this.controls.getNDC(e.clientX, e.clientY);
      const orbitIdx = this.starField.raycastOrbit(ndc.x, ndc.y, this.camera);
      if (orbitIdx >= 0) {
        this.starField.triggerPulse(orbitIdx);
      }
    }, this.clickDelay);
  };

  private onDblClick = (e: MouseEvent) => {
    if (this.clickTimer !== null) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }

    const ndc = this.controls.getNDC(e.clientX, e.clientY);
    const worldPos = this.starField.getWorldPosition(ndc.x, ndc.y, this.camera);
    this.starField.triggerShockwave(worldPos);
  };

  private animate = () => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.controls.update();
    this.starField.update(dt);
    this.controlPanel.update(dt);

    this.renderer.render(this.scene, this.camera);
  };
}

new App();
