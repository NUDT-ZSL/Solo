import * as THREE from 'three';
import { Hourglass } from './hourglass';
import { ParticleSystem } from './particles';
import { Magnet } from './magnet';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private hourglass: Hourglass;
  private particles: ParticleSystem;
  private magnet: Magnet;
  private clock: THREE.Clock;
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAzimuth: number = 0.5;
  private cameraElevation: number = 0.4;
  private cameraDistance: number = 9;
  private targetAzimuth: number = 0.5;
  private targetElevation: number = 0.4;
  private targetDistance: number = 9;
  private cameraEaseFactor: number = 0.15;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private pointLight1: THREE.PointLight;
  private pointLight2: THREE.PointLight;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private flipCooldown: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initObjects();
    this.initControls();
    this.initResponsive();
    this.setupEventListeners();
    this.hideLoading();
    this.animate();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1A1A2E);
    this.scene.fog = new THREE.FogExp2(0x1A1A2E, 0.03);
  }

  private initCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.cos(this.cameraElevation) * Math.sin(this.cameraAzimuth);
    const y = this.cameraDistance * Math.sin(this.cameraElevation);
    const z = this.cameraDistance * Math.cos(this.cameraElevation) * Math.cos(this.cameraAzimuth);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x1A1A2E);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 8, 5);
    this.scene.add(this.directionalLight);

    this.pointLight1 = new THREE.PointLight(0x00D4FF, 1.5, 15, 2);
    this.pointLight1.position.set(-4, 3, -4);
    this.scene.add(this.pointLight1);

    this.pointLight2 = new THREE.PointLight(0xFF3366, 1.2, 12, 2);
    this.pointLight2.position.set(4, -2, 3);
    this.scene.add(this.pointLight2);
  }

  private initObjects(): void {
    this.hourglass = new Hourglass();
    this.scene.add(this.hourglass.group);

    this.particles = new ParticleSystem(1000);
    this.scene.add(this.particles.instancedMesh);

    this.magnet = new Magnet(this.camera, this.renderer.domElement);
    this.scene.add(this.magnet.group);
  }

  private initControls(): void {
    const magnetForceSlider = document.getElementById('magnet-force') as HTMLInputElement;
    const gravitySlider = document.getElementById('gravity') as HTMLInputElement;
    const particleSizeSlider = document.getElementById('particle-size') as HTMLInputElement;

    this.updateSliderFill(magnetForceSlider);
    this.updateSliderFill(gravitySlider);
    this.updateSliderFill(particleSizeSlider);

    magnetForceSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.particles.magneticForce = value;
      document.getElementById('magnet-force-value')!.textContent = value.toFixed(1);
      this.updateSliderFill(e.target as HTMLInputElement);
    });

    gravitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.particles.gravity = value;
      document.getElementById('gravity-value')!.textContent = value.toFixed(2);
      this.updateSliderFill(e.target as HTMLInputElement);
    });

    particleSizeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.particles.setParticleSizeMultiplier(value / 0.125);
      document.getElementById('particle-size-value')!.textContent = value.toFixed(3);
      this.updateSliderFill(e.target as HTMLInputElement);
    });
  }

  private updateSliderFill(slider: HTMLInputElement): void {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percentage = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--value', `${percentage}%`);
  }

  private initResponsive(): void {
    this.updateControlsLayout();
    window.addEventListener('resize', () => {
      this.onWindowResize();
      this.updateControlsLayout();
    });
  }

  private updateControlsLayout(): void {
    const controls = document.getElementById('controls');
    if (!controls) return;
    if (window.innerWidth < 1280 || window.innerHeight < 720) {
      controls.classList.remove('full');
      controls.classList.add('compact');
    } else {
      controls.classList.remove('compact');
      controls.classList.add('full');
    }
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const mouse = this.getNormalizedMouse(e);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.magnet.sphere, false);
      if (intersects.length === 0) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.clientX, y: e.clientY };
        dom.style.cursor = 'grabbing';
      }
    });

    dom.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.targetAzimuth -= deltaX * 0.005;
      this.targetElevation += deltaY * 0.005;
      this.targetElevation = Math.max(-1.2, Math.min(1.2, this.targetElevation));
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    const endDrag = () => {
      this.isDragging = false;
    };

    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointerleave', endDrag);

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetDistance += e.deltaY * 0.005;
      this.targetDistance = Math.max(5, Math.min(18, this.targetDistance));
    }, { passive: false });
  }

  private getNormalizedMouse(event: PointerEvent): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  private showError(message: string): void {
    const error = document.getElementById('error');
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
  }

  private updateFPS(delta: number): void {
    this.frameCount++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.frameCount / this.fpsTime);
      const fpsElement = document.getElementById('fps');
      if (fpsElement) {
        fpsElement.textContent = `FPS: ${fps}`;
      }
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    try {
      const delta = Math.min(this.clock.getDelta(), 0.05);

      this.cameraAzimuth += (this.targetAzimuth - this.cameraAzimuth) * this.cameraEaseFactor;
      this.cameraElevation += (this.targetElevation - this.cameraElevation) * this.cameraEaseFactor;
      this.cameraDistance += (this.targetDistance - this.cameraDistance) * this.cameraEaseFactor;
      this.updateCameraPosition();

      this.hourglass.update(delta);
      this.magnet.update(delta);

      const magnetPos = this.magnet.getWorldPosition();
      this.particles.update(delta, this.hourglass, magnetPos, this.magnet.isActive());

      this.pointLight2.position.copy(magnetPos);

      if (this.flipCooldown > 0) {
        this.flipCooldown -= delta;
      }

      if (!this.hourglass.isFlipping && this.flipCooldown <= 0) {
        this.hourglass.updateFillRatios(
          this.particles.data.count,
          this.particles.data.positions,
          this.particles.data.radii
        );
        if (this.hourglass.isBottomFull()) {
          this.hourglass.startFlip();
          this.flipCooldown = 3;
        }
      }

      this.updateFPS(delta);
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      console.error('Animation error:', err);
      this.showError(`渲染错误: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (err) {
    console.error('Initialization error:', err);
    const error = document.getElementById('error');
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    if (error) {
      error.textContent = `初始化失败: ${err instanceof Error ? err.message : String(err)}`;
      error.style.display = 'block';
    }
  }
});

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error || e.message);
});
