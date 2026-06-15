import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AudioAnalyzer } from './AudioAnalyzer';
import { ParticleSystem } from './ParticleSystem';
import { UI } from './UI';

const PARTICLE_CLICK_THRESHOLD = 5;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private audioAnalyzer: AudioAnalyzer;
  private particleSystem: ParticleSystem;
  private ui: UI;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private starField: THREE.Points;
  private defaultCameraPosition = new THREE.Vector3(0, 5, 15);
  private defaultCameraTarget = new THREE.Vector3(0, 0, 0);

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0520, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.defaultCameraPosition);
    this.camera.lookAt(this.defaultCameraTarget);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.target.copy(this.defaultCameraTarget);

    this.addLights();
    this.starField = this.createStarField();
    this.audioAnalyzer = new AudioAnalyzer();
    this.particleSystem = new ParticleSystem(this.scene);
    this.ui = new UI(this.audioAnalyzer, this.particleSystem);
    this.ui.setResetCameraCallback(() => this.resetCamera());

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.5 };

    this.clock = new THREE.Clock();

    this.setupClickHandler();
    this.setupResize();
    this.animate();
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0x1a0a2e, 0.3);
    this.scene.add(ambientLight);

    const centerLight = new THREE.PointLight(0x9b30ff, 1.5, 30);
    centerLight.position.set(0, 0, 0);
    this.scene.add(centerLight);

    const topLight = new THREE.PointLight(0x00e5a0, 0.5, 20);
    topLight.position.set(0, 8, 0);
    this.scene.add(topLight);
  }

  private createStarField(): THREE.Points {
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 30 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.3 + Math.random() * 0.7;
      const tint = Math.random();
      if (tint < 0.3) {
        colors[i * 3 + 0] = brightness * 0.7;
        colors[i * 3 + 1] = brightness * 0.7;
        colors[i * 3 + 2] = brightness;
      } else if (tint < 0.5) {
        colors[i * 3 + 0] = brightness;
        colors[i * 3 + 1] = brightness * 0.85;
        colors[i * 3 + 2] = brightness * 0.7;
      } else {
        colors[i * 3 + 0] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      }

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
    return stars;
  }

  private setupClickHandler(): void {
    let mouseDownTime = 0;
    let mouseDownPos = { x: 0, y: 0 };

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      mouseDownTime = performance.now();
      mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const elapsed = performance.now() - mouseDownTime;
      const dx = e.clientX - mouseDownPos.x;
      const dy = e.clientY - mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (elapsed < 300 && dist < PARTICLE_CLICK_THRESHOLD) {
        this.handleParticleClick(e);
      }
    });
  }

  private handleParticleClick(event: PointerEvent): void {
    if (!this.audioAnalyzer.isPlaying) return;

    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.particleSystem.getObject());

    if (intersects.length > 0) {
      const features = this.audioAnalyzer.getFeatures();
      this.ui.showInfoCard(features);
    }
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private resetCamera(): void {
    this.camera.position.copy(this.defaultCameraPosition);
    this.controls.target.copy(this.defaultCameraTarget);
    this.controls.update();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();

    this.rotateStarField(elapsed);

    if (!this.ui.paused) {
      const features = this.audioAnalyzer.getFeatures();
      this.particleSystem.update(features, delta);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private rotateStarField(elapsed: number): void {
    this.starField.rotation.y = elapsed * 0.005;
    this.starField.rotation.x = Math.sin(elapsed * 0.003) * 0.02;
  }
}

new App();
