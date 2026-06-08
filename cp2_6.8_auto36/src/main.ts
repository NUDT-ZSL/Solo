
import * as THREE from 'three';
import { Galaxy, DEFAULT_PARAMS } from './galaxy';
import { createControls } from './controls';

const STAR_COUNT = 300;
const DEFAULT_AZIMUTH = 0.6;
const DEFAULT_POLAR = 0.35;
const DEFAULT_DISTANCE = 40;
const MIN_DISTANCE = 5;
const MAX_DISTANCE = 80;
const MIN_POLAR = -Math.PI / 2 + 0.05;
const MAX_POLAR = Math.PI / 2 - 0.05;

class GalaxyApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private galaxy: Galaxy;
  private clock: THREE.Clock;

  private azimuth: number = DEFAULT_AZIMUTH;
  private polar: number = DEFAULT_POLAR;
  private distance: number = DEFAULT_DISTANCE;
  private targetAzimuth: number = DEFAULT_AZIMUTH;
  private targetPolar: number = DEFAULT_POLAR;
  private targetDistance: number = DEFAULT_DISTANCE;

  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.galaxy = new Galaxy(DEFAULT_PARAMS);

    this.scene.add(this.galaxy.points);
    this.drawStaticStars();
    this.setupControls();
    this.setupEventListeners();
    this.animate();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition(camera);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const container = document.getElementById('canvas-container') as HTMLDivElement;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    return renderer;
  }

  private drawStaticStars(): void {
    const canvas = document.getElementById('starfield') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < STAR_COUNT; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 0.5 + Math.random() * 1.5;
        const alpha = 0.2 + Math.random() * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      }
    };
    resize();
    window.addEventListener('resize', resize);
  }

  private setupControls(): void {
    const controls = createControls();
    controls.onChange((params) => {
      this.galaxy.setParams(params);
    });
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.lastPointerX;
      const deltaY = e.clientY - this.lastPointerY;
      this.targetAzimuth -= deltaX * 0.005;
      this.targetPolar += deltaY * 0.005;
      this.targetPolar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, this.targetPolar));
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      this.isDragging = false;
      canvas.releasePointerCapture(e.pointerId);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      this.targetDistance *= zoomFactor;
      this.targetDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.targetDistance));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.targetAzimuth = 0;
        this.targetPolar = MAX_POLAR * 0.98;
      } else if (e.code === 'KeyR') {
        this.targetAzimuth = DEFAULT_AZIMUTH;
        this.targetPolar = DEFAULT_POLAR;
        this.targetDistance = DEFAULT_DISTANCE;
      }
    };

    const onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
  }

  private updateCameraPosition(camera: THREE.PerspectiveCamera): void {
    const x = Math.sin(this.azimuth) * Math.cos(this.polar) * this.distance;
    const y = Math.sin(this.polar) * this.distance;
    const z = Math.cos(this.azimuth) * Math.cos(this.polar) * this.distance;
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    const lerpFactor = 1 - Math.exp(-deltaTime / 0.15);

    this.azimuth += (this.targetAzimuth - this.azimuth) * lerpFactor;
    this.polar += (this.targetPolar - this.polar) * lerpFactor;
    this.distance += (this.targetDistance - this.distance) * lerpFactor;

    this.updateCameraPosition(this.camera);
    this.galaxy.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new GalaxyApp();
});
