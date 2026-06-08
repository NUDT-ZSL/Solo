import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CloudParticles } from './components/CloudParticles';
import { BeamEffect } from './components/BeamEffect';
import { ControlPanel } from './ui/ControlPanel';

class CloudSeaApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private cloudParticles: CloudParticles;
  private beamEffect: BeamEffect;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private mouseDownTime: number = 0;

  private defaultCameraPos = new THREE.Vector3(0, 15, 45);
  private defaultCameraTarget = new THREE.Vector3(0, 5, 0);

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultCameraTarget);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.defaultCameraTarget);
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI * 0.65;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.5;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupBackground();
    this.setupLighting();

    this.cloudParticles = new CloudParticles({
      count: 5000,
      flowSpeed: 0.8,
      beamIntensity: 0.6,
    });
    this.scene.add(this.cloudParticles.getObject());

    this.beamEffect = new BeamEffect(this.scene, 0.6);

    this.setupInteraction();
    this.setupControlPanel();
    this.setupResize();

    this.animate();
  }

  private setupBackground() {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const ctx = bgCanvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#c8b6e2');
    gradient.addColorStop(0.3, '#a8c4e0');
    gradient.addColorStop(0.6, '#7eb8d8');
    gradient.addColorStop(1, '#5a9fcf');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = bgTexture;

    this.scene.fog = new THREE.FogExp2(0x8ab4d8, 0.008);
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xc8d8f0, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff0e0, 0.8);
    dirLight.position.set(10, 30, 5);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffd4a8, 0.5, 60);
    pointLight.position.set(8, 25, 2);
    this.scene.add(pointLight);
  }

  private setupInteraction() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', () => {
      this.isDragging = false;
      this.mouseDownTime = performance.now();
    });

    canvas.addEventListener('pointermove', () => {
      this.isDragging = true;
    });

    canvas.addEventListener('pointerup', (event) => {
      const elapsed = performance.now() - this.mouseDownTime;
      const moved = this.isDragging;

      if (elapsed < 300 && !moved) {
        this.handleClick(event);
      }
      this.isDragging = false;
    });
  }

  private handleClick(event: PointerEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planePoint = new THREE.Vector3(0, 0, 0);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      intersection.y = Math.max(intersection.y, 0);
      this.beamEffect.triggerClick(intersection);
    }
  }

  private setupControlPanel() {
    new ControlPanel({
      onDensityChange: (value) => {
        this.cloudParticles.setCount(Math.round(value));
      },
      onFlowSpeedChange: (value) => {
        this.cloudParticles.setFlowSpeed(value);
      },
      onBeamIntensityChange: (value) => {
        this.cloudParticles.setBeamIntensity(value);
        this.beamEffect.setBeamIntensity(value);
      },
      onResetView: () => {
        this.animateCamera(this.defaultCameraPos, this.defaultCameraTarget);
      },
    });
  }

  private animateCamera(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const duration = 1000;
    const startTime = performance.now();

    const step = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  private setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();

    this.controls.update();
    this.cloudParticles.update(time);
    this.beamEffect.update(time);

    this.renderer.render(this.scene, this.camera);
  }
}

new CloudSeaApp();
