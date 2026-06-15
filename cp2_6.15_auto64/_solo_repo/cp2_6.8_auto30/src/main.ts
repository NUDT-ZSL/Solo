import * as THREE from 'three';
import { ParticleSystem, ColorTheme } from './particleSystem';
import { setupUI } from './ui';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;

  private isMouseDown = false;
  private mouseButton = 0;
  private isRightDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private mouseX = 0;
  private mouseY = 0;
  private prevMouseX = 0;
  private prevMouseY = 0;

  private cameraDistance = 12;
  private targetCameraDistance = 12;
  private cameraTheta = 0;
  private cameraPhi = 0.3;
  private targetTheta = 0;
  private targetPhi = 0.3;
  private cameraPanX = 0;
  private cameraPanZ = 0;
  private targetPanX = 0;
  private targetPanZ = 0;

  private sculptureMode = false;
  private raycaster: THREE.Raycaster;
  private plane: THREE.Plane;

  private readonly MIN_DISTANCE = 3;
  private readonly MAX_DISTANCE = 30;
  private readonly MIN_PHI = -Math.PI / 3;
  private readonly MAX_PHI = Math.PI / 3;
  private readonly ROTATION_DAMPING = 0.9;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    const { clientWidth, clientHeight } = this.container;
    this.camera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.1, 200);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem(this.scene, {
      maxParticles: 5000,
      emissionRate: 60,
      damping: 0.95,
      noiseAmount: 0.1,
      particleSize: 0.12,
      freezeDelay: 5,
    });

    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this.setupControls();
    this.bindEvents();
    this.updateCameraPosition();
    this.animate();
  }

  private setupControls(): void {
    setupUI(
      () => { this.particleSystem.clearAll(); },
      (theme: ColorTheme) => { this.particleSystem.setTheme(theme); }
    );
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        this.mouseButton = 0;
      } else if (e.button === 2) {
        this.isRightDragging = true;
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
      if (e.button === 2) this.isRightDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.prevMouseX = this.mouseX;
      this.prevMouseY = this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this.isRightDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dz = e.clientY - this.lastMouseY;
        const panSpeed = 0.01 * this.cameraDistance;
        const cosT = Math.cos(this.cameraTheta);
        const sinT = Math.sin(this.cameraTheta);
        this.targetPanX += (-dx * cosT - dz * sinT) * panSpeed;
        this.targetPanZ += (dx * sinT - dz * cosT) * panSpeed;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      } else if (!this.isMouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        if (Math.abs(dx) + Math.abs(dy) > 0.5) {
          this.targetTheta -= dx * 0.005;
          this.targetPhi += dy * 0.005;
          this.targetPhi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.targetPhi));
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
        }
      } else {
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.001);
      this.targetCameraDistance *= factor;
      this.targetCameraDistance = Math.max(this.MIN_DISTANCE, Math.min(this.MAX_DISTANCE, this.targetCameraDistance));
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.sculptureMode = !this.sculptureMode;
        this.particleSystem.setSculptureMode(this.sculptureMode);
      }
    });

    window.addEventListener('resize', () => {
      const { clientWidth, clientHeight } = this.container;
      this.camera.aspect = clientWidth / clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(clientWidth, clientHeight);
    });
  }

  private getMouseWorldPosition(): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((this.mouseX - rect.left) / rect.width) * 2 - 1,
      -((this.mouseY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.at(this.cameraDistance * 0.6, target);
    return target;
  }

  private getEmitDirection(): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const dx = (this.mouseX - this.prevMouseX) / rect.width;
    const dy = (this.mouseY - this.prevMouseY) / rect.height;
    const dir = new THREE.Vector3(dx * 4, -dy * 4, 0.5).normalize();
    dir.applyQuaternion(this.camera.quaternion);
    return dir;
  }

  private updateCameraPosition(): void {
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * (1 - this.ROTATION_DAMPING);
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * (1 - this.ROTATION_DAMPING);
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.1;
    this.cameraPanX += (this.targetPanX - this.cameraPanX) * 0.1;
    this.cameraPanZ += (this.targetPanZ - this.cameraPanZ) * 0.1;

    const r = this.cameraDistance;
    const x = r * Math.cos(this.cameraPhi) * Math.sin(this.cameraTheta) + this.cameraPanX;
    const y = r * Math.sin(this.cameraPhi);
    const z = r * Math.cos(this.cameraPhi) * Math.cos(this.cameraTheta) + this.cameraPanZ;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraPanX, 0, this.cameraPanZ);
  }

  private lastTime = performance.now();

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.updateCameraPosition();

    if (this.isMouseDown && this.mouseButton === 0) {
      const pos = this.getMouseWorldPosition();
      const dir = this.getEmitDirection();
      this.particleSystem.emitContinuous(pos, dir, dt);
    }

    this.particleSystem.update();
    this.renderer.render(this.scene, this.camera);
  };
}

new App();
