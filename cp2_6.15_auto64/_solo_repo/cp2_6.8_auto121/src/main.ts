import * as THREE from 'three';
import { Jellyfish } from './jellyfish';
import { ParticleSystem, ParticleDensity } from './particleSystem';
import { UIController } from './ui';

const COLOR_PALETTE = [
  new THREE.Color(0xE2E8F0),
  new THREE.Color(0xB794F4),
  new THREE.Color(0xFC8181),
  new THREE.Color(0x63B3ED),
  new THREE.Color(0x68D391)
];

class JellyfishApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private jellyfishList: Jellyfish[] = [];
  private particleSystem: ParticleSystem;
  private ui: UIController;

  private cameraAngle: number = 0;
  private cameraRadius: number = 80;
  private cameraHeight: number = 40;
  private autoRotate: boolean = true;

  private isDragging: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private cameraYaw: number = 0;
  private cameraPitch: number = Math.PI / 6;
  private targetCameraYaw: number = 0;
  private targetCameraPitch: number = Math.PI / 6;

  private ambientLight: THREE.AmbientLight;
  private pointLight1: THREE.PointLight;
  private pointLight2: THREE.PointLight;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0B1D);
    this.scene.fog = new THREE.FogExp2(0x0A0B1D, 0.008);

    const app = document.getElementById('app')!;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    app.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.ambientLight = new THREE.AmbientLight(0x334466, 0.5);
    this.scene.add(this.ambientLight);

    this.pointLight1 = new THREE.PointLight(0x63B3ED, 1.5, 100);
    this.pointLight1.position.set(30, 40, 30);
    this.scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0xB794F4, 1.0, 100);
    this.pointLight2.position.set(-30, 20, -30);
    this.scene.add(this.pointLight2);

    this.particleSystem = new ParticleSystem('medium');
    this.scene.add(this.particleSystem.points);

    this.createJellyfish();

    this.ui = new UIController({
      onSpeedChange: (value: number) => {
        for (const jf of this.jellyfishList) jf.setGlobalSpeed(value);
      },
      onBreathChange: (value: number) => {
        for (const jf of this.jellyfishList) jf.setGlobalBreath(value);
      },
      onDensityChange: (value: ParticleDensity) => {
        this.particleSystem.setDensity(value);
      },
      onJellyfishClick: () => {}
    });

    this.ui.setupCanvasInteraction(this.renderer.domElement, this.jellyfishList, this.camera);

    this.setupCameraControls();
    this.setupResize();
    this.updateCameraPosition();

    this.animate();
  }

  private createJellyfish(): void {
    const count = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const diameter = 20 + Math.random() * 20;
      const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 10 + Math.random() * 35;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.3) * 30,
        Math.sin(angle) * radius
      );

      const colorHex = '#' + color.getHexString().toUpperCase();
      const jellyfish = new Jellyfish({ position, diameter, color, colorName: colorHex });
      this.jellyfishList.push(jellyfish);
      this.scene.add(jellyfish.mesh);
    }
  }

  private setupCameraControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const hovered = this.checkJellyfishHover(e);
      if (!hovered) {
        this.isDragging = true;
        this.autoRotate = false;
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;
      this.targetCameraYaw -= dx * 0.005;
      this.targetCameraPitch += dy * 0.005;
      this.targetCameraPitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.targetCameraPitch));
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });

    canvas.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      canvas.releasePointerCapture(e.pointerId);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.cameraRadius = Math.max(25, Math.min(180, this.cameraRadius * zoomFactor));
    }, { passive: false });

    canvas.addEventListener('dblclick', () => {
      this.autoRotate = true;
    });
  }

  private checkJellyfishHover(e: PointerEvent): boolean {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const allObjects: THREE.Object3D[] = [];
    for (const jf of this.jellyfishList) {
      allObjects.push(...jf.getClickableObjects());
    }
    const intersects = raycaster.intersectObjects(allObjects, true);
    return intersects.length > 0;
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private updateCameraPosition(): void {
    this.cameraYaw += (this.targetCameraYaw - this.cameraYaw) * 0.1;
    this.cameraPitch += (this.targetCameraPitch - this.cameraPitch) * 0.1;

    const x = this.cameraRadius * Math.cos(this.cameraPitch) * Math.sin(this.cameraYaw);
    const y = this.cameraRadius * Math.sin(this.cameraPitch);
    const z = this.cameraRadius * Math.cos(this.cameraPitch) * Math.cos(this.cameraYaw);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    if (this.autoRotate) {
      const orbitSpeed = (2 * Math.PI) / 40;
      this.targetCameraYaw += orbitSpeed * deltaTime;
      this.cameraYaw = this.targetCameraYaw;
      this.targetCameraPitch = Math.PI / 6;
    }

    this.updateCameraPosition();

    for (const jf of this.jellyfishList) {
      jf.update(deltaTime, elapsedTime, this.jellyfishList);
    }

    this.particleSystem.update(elapsedTime);

    this.ui.update();

    this.pointLight1.position.x = Math.sin(elapsedTime * 0.3) * 40;
    this.pointLight1.position.z = Math.cos(elapsedTime * 0.3) * 40;

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    for (const jf of this.jellyfishList) {
      this.scene.remove(jf.mesh);
      jf.dispose();
    }
    this.scene.remove(this.particleSystem.points);
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new JellyfishApp();
});
