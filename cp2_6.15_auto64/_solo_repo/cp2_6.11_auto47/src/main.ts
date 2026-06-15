import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleMemorySystem } from './particleMemory';
import { initUI } from './ui';

const INITIAL_CAMERA_POS = new THREE.Vector3(0, 5, 20);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

class CrystalMemoryApp {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private particleSystem: ParticleMemorySystem;
  private clock: THREE.Clock;
  private isAnimatingCamera: boolean = false;
  private cameraAnimStart: THREE.Vector3 = new THREE.Vector3();
  private cameraAnimTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraAnimLookStart: THREE.Vector3 = new THREE.Vector3();
  private cameraAnimLookTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraAnimDuration: number = 0;
  private cameraAnimElapsed: number = 0;
  private isResettingCamera: boolean = false;
  private resetAnimElapsed: number = 0;
  private resetAnimDuration: number = 800;

  constructor() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.copy(INITIAL_CAMERA_POS);
    this.camera.lookAt(INITIAL_CAMERA_TARGET);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    const container = document.getElementById('canvas-container')!;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.2;
    this.controls.enablePan = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;

    this.particleSystem = new ParticleMemorySystem(this.scene);
    this.clock = new THREE.Clock();

    this.addAmbientEffects();
    this.setupEventListeners();
    this.initUIIntegration();

    this.hideLoadingScreen();
    this.animate();
  }

  private addAmbientEffects(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      const brightness = 0.3 + Math.random() * 0.5;
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness;
      starColors[i * 3 + 2] = brightness + Math.random() * 0.2;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.isAnimatingCamera) return;
      this.particleSystem.handleMouseClick(e, this.camera, this.renderer.domElement);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'r' || e.key === 'R') {
        this.resetCamera();
      } else if (e.key === 'c' || e.key === 'C') {
        this.particleSystem.clearHighlight();
      } else if (e.key === 'Escape') {
        const collapsed = this.particleSystem.getCollapsedCluster();
        if (collapsed) {
          this.particleSystem.expandClusterById(collapsed.id);
        }
      }
    });
  }

  private initUIIntegration(): void {
    initUI(this.particleSystem);

    (window as any).__crystalMemoryNavigate = (clusterId: string) => {
      this.navigateToCluster(clusterId);
    };
  }

  private navigateToCluster(clusterId: string): void {
    const cluster = this.particleSystem.getClusterById(clusterId);
    if (!cluster) return;

    const dir = new THREE.Vector3().subVectors(this.camera.position, cluster.center).normalize();
    const targetPos = cluster.center.clone().add(dir.multiplyScalar(8));

    this.cameraAnimStart.copy(this.camera.position);
    this.cameraAnimTarget.copy(targetPos);
    this.cameraAnimLookStart.copy(this.controls.target);
    this.cameraAnimLookTarget.copy(cluster.center);
    this.cameraAnimDuration = 500;
    this.cameraAnimElapsed = 0;
    this.isAnimatingCamera = true;
    this.isResettingCamera = false;

    this.particleSystem.highlightCluster(clusterId);
  }

  private resetCamera(): void {
    this.cameraAnimStart.copy(this.camera.position);
    this.cameraAnimTarget.copy(INITIAL_CAMERA_POS);
    this.cameraAnimLookStart.copy(this.controls.target);
    this.cameraAnimLookTarget.copy(INITIAL_CAMERA_TARGET);
    this.cameraAnimDuration = this.resetAnimDuration;
    this.cameraAnimElapsed = 0;
    this.isAnimatingCamera = true;
    this.isResettingCamera = true;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateCameraAnimation(deltaMs: number): void {
    if (!this.isAnimatingCamera) return;

    this.cameraAnimElapsed += deltaMs;
    const progress = Math.min(this.cameraAnimElapsed / this.cameraAnimDuration, 1);
    const eased = this.easeOutCubic(progress);

    this.camera.position.lerpVectors(this.cameraAnimStart, this.cameraAnimTarget, eased);
    this.controls.target.lerpVectors(this.cameraAnimLookStart, this.cameraAnimLookTarget, eased);

    if (progress >= 1) {
      this.isAnimatingCamera = false;
      if (this.isResettingCamera) {
        this.camera.position.copy(INITIAL_CAMERA_POS);
        this.controls.target.copy(INITIAL_CAMERA_TARGET);
      }
    }
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loading = document.getElementById('loading-screen');
      if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 800);
      }
    }, 500);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = performance.now();

    this.updateCameraAnimation(delta * 1000);
    this.particleSystem.update(time, delta * 1000);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new CrystalMemoryApp();
