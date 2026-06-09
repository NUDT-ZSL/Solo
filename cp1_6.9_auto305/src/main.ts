import * as THREE from 'three';
import { ClayModel } from './clayModel';
import { TextureRenderer } from './textureRenderer';
import { AnimationController } from './animationController';
import * as TWEEN from '@tweenjs/tween.js';

class ClayFlowLightApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private clayModel!: ClayModel;
  private textureRenderer!: TextureRenderer;
  private animationController!: AnimationController;

  private container: HTMLElement;
  private clock: THREE.Clock;

  private isMouseDown: boolean = false;
  private isMiddleDown: boolean = false;
  private isHoveringModel: boolean = false;

  private lastMousePos: { x: number; y: number; time: number } = { x: 0, y: 0, time: 0 };
  private currentPressure: number = 0;
  private targetPressure: number = 0;

  private cameraDistance: { value: number } = { value: 12 };
  private cameraTheta: { value: number } = { value: 0 };
  private cameraPhi: { value: number } = { value: Math.PI / 2 };

  private targetCameraDistance: number = 12;
  private targetCameraTheta: number = 0;
  private targetCameraPhi: number = Math.PI / 2;

  private minDistance: number = 3;
  private maxDistance: number = 20;
  private minPhi: number = (Math.PI / 180) * 30;
  private maxPhi: number = (Math.PI / 180) * 150;

  private lastMouseMoveTime: number = 0;
  private mouseMoveInterval: number = 1000 / 60;

  private uiPressureFill: HTMLElement;
  private uiPressureValue: HTMLElement;
  private uiVertexCount: HTMLElement;
  private uiHuePointer: HTMLElement;
  private uiHueValue: HTMLElement;
  private uiResetBtn: HTMLElement;

  private cameraTweens: TWEEN.Tween<any>[] = [];

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.uiPressureFill = document.getElementById('pressure-fill')!;
    this.uiPressureValue = document.getElementById('pressure-value')!;
    this.uiVertexCount = document.getElementById('vertex-count')!;
    this.uiHuePointer = document.getElementById('hue-pointer')!;
    this.uiHueValue = document.getElementById('hue-value')!;
    this.uiResetBtn = document.getElementById('reset-btn')!;

    this.initScene();
    this.initLights();

    this.clayModel = new ClayModel();
    this.scene.add(this.clayModel.getMesh());

    this.textureRenderer = new TextureRenderer(this.clayModel);
    this.animationController = new AnimationController(this.clayModel);

    this.initCamera();
    this.initRenderer();
    this.bindEvents();
    this.updateUI();

    this.animate();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const bgTexture = new THREE.CanvasTexture(canvas);
    this.scene.background = bgTexture;
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.02);
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(5, 10, 7);
    dirLight1.castShadow = true;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x4466ff, 0.4);
    dirLight2.position.set(-5, 5, -5);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xff6644, 0.5, 30);
    pointLight.position.set(0, 0, 8);
    this.scene.add(pointLight);
  }

  private initCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.updateCameraPosition();
  }

  private initRenderer(): void {
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
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
  }

  private updateCameraPosition(): void {
    const r = this.cameraDistance.value;
    const theta = this.cameraTheta.value;
    const phi = this.cameraPhi.value;

    this.camera.position.x = r * Math.sin(phi) * Math.cos(theta);
    this.camera.position.y = r * Math.cos(phi);
    this.camera.position.z = r * Math.sin(phi) * Math.sin(theta);
    this.camera.lookAt(0, 0, 0);
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    dom.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    dom.addEventListener('mousemove', (e) => this.onMouseMove(e));
    dom.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    dom.addEventListener('mouseenter', () => this.onMouseEnter());
    dom.addEventListener('mouseleave', () => this.onMouseLeave());

    this.uiResetBtn.addEventListener('click', () => this.onResetClick());
  }

  private onResize(): void {
    const minWidth = 800;
    const w = Math.max(window.innerWidth, minWidth);
    const h = window.innerHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.animationController.isResetting()) return;

    if (e.key === 'r' || e.key === 'R') {
      this.triggerReset();
    }
  }

  private onResetClick(): void {
    if (this.animationController.isResetting()) return;
    this.triggerReset();
  }

  private triggerReset(): void {
    this.animationController.triggerReset(() => {
      this.textureRenderer.reset();
      this.updateUI();
    });
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.animationController.isResetting()) return;

    this.updateMouseCoords(e);

    if (e.button === 0) {
      this.isMouseDown = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY, time: performance.now() };
      this.currentPressure = 0;
      this.targetPressure = 0;
      this.renderer.domElement.style.cursor = 'grabbing';
      this.animationController.triggerPulse();
    } else if (e.button === 1) {
      this.isMiddleDown = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY, time: performance.now() };
      e.preventDefault();
    } else if (e.button === 2) {
      this.textureRenderer.shiftHue(60);
      this.updateUI();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.isMouseDown = false;
      this.targetPressure = 0;
      if (this.isHoveringModel) {
        this.renderer.domElement.style.cursor = 'crosshair';
      } else {
        this.renderer.domElement.style.cursor = 'default';
      }
    } else if (e.button === 1) {
      this.isMiddleDown = false;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const now = performance.now();

    if (this.isMouseDown) {
      if (now - this.lastMouseMoveTime < this.mouseMoveInterval) {
        return;
      }
      this.lastMouseMoveTime = now;
    }

    this.updateMouseCoords(e);

    if (this.isMiddleDown) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;

      this.targetCameraTheta -= dx * 0.005;
      this.targetCameraPhi -= dy * 0.005;

      this.targetCameraPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetCameraPhi));

      this.applyCameraTweens();
      this.lastMousePos = { x: e.clientX, y: e.clientY, time: now };
    }

    this.checkHover();

    if (this.isMouseDown && this.isHoveringModel) {
      const dt = Math.max(1, now - this.lastMousePos.time) / 1000;
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;

      const newPressure = Math.min(1, speed / 500);
      this.targetPressure = newPressure;

      this.performPinch();
      this.lastMousePos = { x: e.clientX, y: e.clientY, time: now };
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (this.animationController.isResetting()) return;

    const delta = e.deltaY > 0 ? 1 : -1;
    const zoomSpeed = 1.2;

    this.targetCameraDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.targetCameraDistance * (delta > 0 ? zoomSpeed : 1 / zoomSpeed))
    );

    this.applyCameraTweens();
  }

  private onMouseEnter(): void {
    this.isHoveringModel = true;
  }

  private onMouseLeave(): void {
    this.isHoveringModel = false;
    this.isMouseDown = false;
    this.isMiddleDown = false;
    this.targetPressure = 0;
    this.renderer.domElement.style.cursor = 'default';
  }

  private updateMouseCoords(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.clayModel.getMesh());

    const wasHovering = this.isHoveringModel;
    this.isHoveringModel = intersects.length > 0;

    if (this.isHoveringModel && !wasHovering && !this.isMouseDown) {
      this.renderer.domElement.style.cursor = 'crosshair';
      this.animationController.startBreathe();
    } else if (!this.isHoveringModel && wasHovering && !this.isMouseDown) {
      this.renderer.domElement.style.cursor = 'default';
      this.animationController.stopBreathe();
    }
  }

  private performPinch(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.clayModel.getMesh());

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.clayModel.pinch(point, this.currentPressure, 2);
    }
  }

  private applyCameraTweens(): void {
    this.cameraTweens.forEach(t => t.stop());
    this.cameraTweens = [];

    const createTween = (
      obj: { value: number },
      target: number,
      duration: number = 300
    ): TWEEN.Tween<{ value: number }> => {
      return new TWEEN.Tween(obj)
        .to({ value: target }, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    };

    this.cameraTweens.push(createTween(this.cameraDistance, this.targetCameraDistance));
    this.cameraTweens.push(createTween(this.cameraTheta, this.targetCameraTheta));
    this.cameraTweens.push(createTween(this.cameraPhi, this.targetCameraPhi));
  }

  private updateUI(): void {
    const pressurePct = Math.round(this.currentPressure * 100);
    this.uiPressureFill.style.width = `${pressurePct}%`;
    this.uiPressureValue.textContent = `${pressurePct}%`;

    const hue = this.textureRenderer.getHueShift();
    this.uiHuePointer.style.transform = `rotate(${hue}deg)`;
    this.uiHueValue.textContent = `${Math.round(hue)}°`;

    this.uiVertexCount.textContent = this.clayModel.getAffectedCount().toString();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    this.currentPressure += (this.targetPressure - this.currentPressure) * 0.2;

    this.updateCameraPosition();
    this.animationController.update(deltaTime);
    this.textureRenderer.update(deltaTime);

    const state = this.animationController.getState();
    this.clayModel.updateBuffers(
      state.breathePhase,
      state.breatheAmount,
      state.pulseAmount
    );

    this.updateUI();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ClayFlowLightApp();
});
