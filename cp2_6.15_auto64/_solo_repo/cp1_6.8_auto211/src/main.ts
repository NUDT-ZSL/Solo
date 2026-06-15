import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { StarField } from './scene/StarField';
import { LightBrush } from './scene/LightBrush';
import { ParticleBurst } from './scene/ParticleBurst';
import { ControlPanel } from './UI/ControlPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private starField: StarField;
  private lightBrush: LightBrush;
  private particleBurst: ParticleBurst;
  private clock = new THREE.Clock();
  private isDrawing = false;
  private mouseDownTime = 0;
  private mouseDownPos = { x: 0, y: 0 };
  private fadeOverlay: HTMLDivElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 50);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 150;
    this.controls.enablePan = false;

    this.starField = new StarField(this.scene);
    this.lightBrush = new LightBrush(this.scene);
    this.particleBurst = new ParticleBurst(this.scene);

    this.fadeOverlay = this.createFadeOverlay();

    new ControlPanel({
      onLineWidthChange: (w) => this.lightBrush.setLineWidth(w),
      onSpreadSpeedChange: (s) => this.particleBurst.setSpreadSpeed(s),
      onReset: () => this.reset(),
    });

    this.bindEvents();
    this.animate();
  }

  private createFadeOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 200;
      background: #000000;
      pointer-events: none;
      transition: opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.style.opacity = '0';
    });
    setTimeout(() => overlay.remove(), 2000);
    return overlay;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this.mouseDownTime = Date.now();
      this.mouseDownPos = { x: e.clientX, y: e.clientY };

      if (e.button === 0) {
        const mouse = this.getNormalizedMouse(e);
        const hitPoint = this.lightBrush.hitTest(mouse.x, mouse.y, this.camera);

        if (hitPoint) {
          const colors = this.lightBrush.getTrailColorAt(hitPoint);
          if (colors) {
            this.particleBurst.emit(hitPoint, colors.start, colors.end);
            this.lightBrush.removeTrailAt(hitPoint);
          }
        } else {
          this.isDrawing = true;
          this.controls.enabled = false;
          this.lightBrush.startStroke(mouse.x, mouse.y, this.camera);
        }
      }
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isDrawing) {
        const mouse = this.getNormalizedMouse(e);
        this.lightBrush.continueStroke(mouse.x, mouse.y, this.camera);
      }
    });

    canvas.addEventListener('pointerup', (e: PointerEvent) => {
      if (this.isDrawing) {
        this.lightBrush.endStroke();
        this.isDrawing = false;
        this.controls.enabled = true;
      }
    });

    canvas.addEventListener('pointerleave', () => {
      if (this.isDrawing) {
        this.lightBrush.endStroke();
        this.isDrawing = false;
        this.controls.enabled = true;
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private getNormalizedMouse(e: PointerEvent): { x: number; y: number } {
    return {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1,
    };
  }

  private reset(): void {
    this.lightBrush.clearAll();
    this.particleBurst.clearAll();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.controls.update();
    this.starField.update();
    this.lightBrush.update();
    this.particleBurst.update(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
