import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GridPlane } from './GridPlane';
import { LightStrokeManager } from './LightStroke';
import { Palette } from './Palette';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private gridPlane: GridPlane;
  private strokeManager: LightStrokeManager;
  private palette: Palette;
  private isDrawing: boolean = false;
  private currentColor: string = '#FF3366';
  private clock: THREE.Clock;
  private lastPoint: THREE.Vector3 | null = null;

  constructor() {
    const containerEl = document.getElementById('canvas-container');
    if (!containerEl) throw new Error('Canvas container not found');
    this.container = containerEl;

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0A14);
    this.scene.fog = new THREE.FogExp2(0x0A0A14, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 10, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    this.gridPlane = new GridPlane();
    this.scene.add(this.gridPlane.mesh);

    this.strokeManager = new LightStrokeManager();
    this.scene.add(this.strokeManager.group);

    this.palette = new Palette('palette', (color) => {
      this.currentColor = color;
    });

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.strokeManager.clearAll();
      });
    }

    this.setupEvents();
    this.animate();
  }

  private setupEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', () => this.onPointerUp());
    canvas.addEventListener('pointerleave', () => this.onPointerUp());

    window.addEventListener('resize', () => this.onResize());
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;

    const point = this.gridPlane.getIntersection(
      e.clientX,
      e.clientY,
      this.camera,
      this.renderer.domElement
    );

    if (point) {
      this.isDrawing = true;
      this.controls.enabled = false;
      this.lastPoint = point.clone();
      this.strokeManager.startStroke(point, this.currentColor);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing) return;

    const point = this.gridPlane.getIntersection(
      e.clientX,
      e.clientY,
      this.camera,
      this.renderer.domElement
    );

    if (point) {
      if (this.lastPoint) {
        const dist = this.lastPoint.distanceTo(point);
        const steps = Math.max(1, Math.ceil(dist / 0.03));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const interpolated = new THREE.Vector3().lerpVectors(this.lastPoint, point, t);
          this.strokeManager.addPoint(interpolated);
        }
      } else {
        this.strokeManager.addPoint(point);
      }
      this.lastPoint = point.clone();
    }
  }

  private onPointerUp(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.lastPoint = null;
      this.strokeManager.endStroke();
      this.controls.enabled = true;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    this.controls.update();
    this.gridPlane.updateOpacity(this.camera);
    this.strokeManager.update();

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
