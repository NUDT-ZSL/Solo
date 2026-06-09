import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import TWEEN from '@tweenjs/tween.js';
import { ParticleSystem, type EjectedParticle } from './ParticleSystem';
import { ButterflyEmitter } from './ButterflyEmitter';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;

  private particleSystem!: ParticleSystem;
  private butterflyEmitter!: ButterflyEmitter;

  private fireflies: THREE.Points;
  private fireflyPositions: Float32Array;
  private fireflyVelocities: THREE.Vector3[];
  private fireflyCount: number = 50;

  private mouseScreen: THREE.Vector2 = new THREE.Vector2();
  private mouseWorldPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private mouseWorldPosition: THREE.Vector3 = new THREE.Vector3();
  private isMouseOverCanvas: boolean = false;

  private clock: THREE.Clock = new THREE.Clock();
  private fpsElement: HTMLElement | null = null;
  private cursorGlowElement: HTMLElement | null = null;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;

  private isMobile: boolean = false;
  private particleResetTimer: number = 0;

  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('app')!;
    this.isMobile = window.innerWidth < 768;
    this.fireflyCount = this.isMobile ? 30 : 50;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0818, 0.035);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2, 8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = this.isMobile ? 4 : 3;
    this.controls.maxDistance = 15;
    this.controls.target.set(0, 0, 0);
    this.controls.enablePan = false;

    this.raycaster = new THREE.Raycaster();

    this.setupLights();
    this.setupGround();
    this.fireflies = this.createFireflies();
    this.fireflyPositions = this.fireflies.geometry.attributes.position.array as Float32Array;
    this.fireflyVelocities = this.createFireflyVelocities();
    this.setupParticleSystem();
    this.setupUI();
    this.setupEventListeners();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x303050, 0.6);
    this.scene.add(ambient);

    const keyLight = new THREE.PointLight(0x8866ff, 1.2, 20, 2);
    keyLight.position.set(3, 4, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x6688ff, 0.8, 15, 2);
    fillLight.position.set(-4, 2, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xccaaff, 0.4);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.CircleGeometry(15, 48);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      transparent: true,
      opacity: 0.1,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -4;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private createFireflies(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.fireflyCount * 3);
    const colors = new Float32Array(this.fireflyCount * 3);
    const sizes = new Float32Array(this.fireflyCount);

    for (let i = 0; i < this.fireflyCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = Math.random() * 8 - 2;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;

      const hue = 0.15 + Math.random() * 0.15;
      const color = new THREE.Color().setHSL(hue, 0.8, 0.8);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0.04 + Math.random() * 0.06;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
      map: this.createSoftGlowTexture(),
      alphaTest: 0.01
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    return points;
  }

  private createSoftGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 200, 0.85)');
    gradient.addColorStop(0.45, 'rgba(255, 240, 150, 0.5)');
    gradient.addColorStop(0.65, 'rgba(255, 220, 100, 0.2)');
    gradient.addColorStop(0.85, 'rgba(255, 200, 80, 0.05)');
    gradient.addColorStop(1.0, 'rgba(255, 180, 50, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createFireflyVelocities(): THREE.Vector3[] {
    const velocities: THREE.Vector3[] = [];
    for (let i = 0; i < this.fireflyCount; i++) {
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.5
      ));
    }
    return velocities;
  }

  private updateFireflies(delta: number): void {
    for (let i = 0; i < this.fireflyCount; i++) {
      const i3 = i * 3;
      const vel = this.fireflyVelocities[i];

      vel.x += (Math.random() - 0.5) * 0.02;
      vel.y += (Math.random() - 0.5) * 0.02;
      vel.z += (Math.random() - 0.5) * 0.02;

      vel.clampLength(0, 0.3);

      this.fireflyPositions[i3] += vel.x * delta;
      this.fireflyPositions[i3 + 1] += vel.y * delta;
      this.fireflyPositions[i3 + 2] += vel.z * delta;

      if (this.fireflyPositions[i3] > 10 || this.fireflyPositions[i3] < -10) vel.x *= -1;
      if (this.fireflyPositions[i3 + 1] > 6 || this.fireflyPositions[i3 + 1] < -3) vel.y *= -1;
      if (this.fireflyPositions[i3 + 2] > 10 || this.fireflyPositions[i3 + 2] < -10) vel.z *= -1;
    }
    this.fireflies.geometry.attributes.position.needsUpdate = true;
  }

  private setupParticleSystem(): void {
    this.particleSystem = new ParticleSystem(this.scene, this.isMobile);
    this.butterflyEmitter = new ButterflyEmitter(this.scene, this.isMobile);

    this.particleSystem.onParticleEjected = (ejected: EjectedParticle) => {
      this.butterflyEmitter.spawnButterfly(ejected);
    };
  }

  private setupUI(): void {
    this.fpsElement = document.getElementById('fps-counter');
    this.cursorGlowElement = document.getElementById('cursor-glow');
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => {
      this.mouseScreen.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseScreen.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.isMouseOverCanvas = true;

      if (this.cursorGlowElement) {
        this.cursorGlowElement.style.left = e.clientX + 'px';
        this.cursorGlowElement.style.top = e.clientY + 'px';
        this.cursorGlowElement.classList.add('visible');
      }

      this.updateMouseWorldPosition();
    });

    canvas.addEventListener('mouseleave', () => {
      this.isMouseOverCanvas = false;
      this.particleSystem.setMouseWorldPosition(null);
      if (this.cursorGlowElement) {
        this.cursorGlowElement.classList.remove('visible');
      }
    });

    canvas.addEventListener('mouseenter', () => {
      this.isMouseOverCanvas = true;
    });

    canvas.addEventListener('click', (e) => {
      this.mouseScreen.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseScreen.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.updateMouseWorldPosition();
      this.particleSystem.triggerExplosion(this.mouseWorldPosition.clone());
    });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.mouseScreen.x = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouseScreen.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        this.isMouseOverCanvas = true;
        this.updateMouseWorldPosition();

        if (this.cursorGlowElement) {
          this.cursorGlowElement.style.left = touch.clientX + 'px';
          this.cursorGlowElement.style.top = touch.clientY + 'px';
          this.cursorGlowElement.classList.add('visible');
        }
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isMouseOverCanvas = false;
      this.particleSystem.setMouseWorldPosition(null);
      if (this.cursorGlowElement) {
        this.cursorGlowElement.classList.remove('visible');
      }
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.mouseScreen.x = (touch.clientX / window.innerWidth) * 2 - 1;
        this.mouseScreen.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        this.updateMouseWorldPosition();
        this.particleSystem.triggerExplosion(this.mouseWorldPosition.clone());
      }
    }, { passive: true });

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private updateMouseWorldPosition(): void {
    this.raycaster.setFromCamera(this.mouseScreen, this.camera);

    const dir = this.raycaster.ray.direction.clone().normalize();
    const origin = this.raycaster.ray.origin.clone();

    const targetDistance = origin.length();
    const target = origin.clone().add(dir.multiplyScalar(targetDistance * 0.6));

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const planeNormal = camDir.clone().negate();
    this.mouseWorldPlane.setFromNormalAndCoplanarPoint(
      planeNormal,
      new THREE.Vector3(0, 0, 0)
    );

    this.raycaster.ray.intersectPlane(this.mouseWorldPlane, this.mouseWorldPosition);

    if (!this.mouseWorldPosition) {
      this.mouseWorldPosition = target;
    }

    const dist = this.mouseWorldPosition.length();
    if (dist > 8) {
      this.mouseWorldPosition.normalize().multiplyScalar(8);
    }

    this.particleSystem.setMouseWorldPosition(this.mouseWorldPosition);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;
    if (wasMobile !== this.isMobile) {
      console.warn('Window crossed mobile threshold. Reload for optimized particle count.');
    }
  }

  private updateFPS(delta: number): void {
    this.frameCount++;
    this.fpsTime += delta;

    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      if (this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${this.currentFps}`;
      }
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    TWEEN.update();
    this.controls.update();

    this.updateFireflies(delta);
    this.particleSystem.update(delta);
    this.butterflyEmitter.update(delta);

    this.particleResetTimer += delta;
    if (this.particleResetTimer > 1.0) {
      this.particleResetTimer = 0;
      this.particleSystem.resetEjectedParticles(30);
    }

    this.renderer.render(this.scene, this.camera);
    this.updateFPS(delta);
  }

  public dispose(): void {
    this.particleSystem.dispose();
    this.butterflyEmitter.dispose();
    const fireflyMaterial = this.fireflies.material as THREE.PointsMaterial;
    if (fireflyMaterial.map) fireflyMaterial.map.dispose();
    (this.fireflies.geometry as THREE.BufferGeometry).dispose();
    fireflyMaterial.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
