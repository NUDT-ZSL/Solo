import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AlgaeField } from './algaeField';
import { AudioManager, AudioFeatures } from './audioManager';
import { RippleEffect } from './rippleEffect';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private algaeField: AlgaeField | null = null;
  private rippleEffect: RippleEffect | null = null;
  private audioManager: AudioManager;
  private clock: THREE.Clock;
  private frameId: number = 0;
  private lastFrameTime: number = 0;
  private readonly TARGET_FPS = 60;
  private readonly FRAME_DURATION = 1000 / this.TARGET_FPS;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.audioManager = new AudioManager();
    this.clock = new THREE.Clock();

    this.setupLighting();
    this.setupGround();
    this.setupScene();
    this.setupWindowResizeHandler();
    this.setupStartButton();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    const defaultDistance = 200;
    const pitchAngle = THREE.MathUtils.degToRad(45);
    camera.position.set(
      0,
      Math.sin(pitchAngle) * defaultDistance,
      Math.cos(pitchAngle) * defaultDistance
    );
    camera.lookAt(0, 50, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      throw new Error('Canvas container not found');
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0A1C2E, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    canvasContainer.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;

    controls.minDistance = 100;
    controls.maxDistance = 500;

    const minPolar = THREE.MathUtils.degToRad(15);
    const maxPolar = THREE.MathUtils.degToRad(75);
    controls.minPolarAngle = minPolar;
    controls.maxPolarAngle = maxPolar;

    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.8;

    controls.target.set(0, 50, 0);
    controls.update();

    return controls;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x4ECDC4, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x4ECDC4, 1, 400, 2);
    pointLight1.position.set(-100, 100, -100);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFF6B6B, 0.6, 300, 2);
    pointLight2.position.set(100, 50, 100);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x6BCB77, 0.8, 350, 2);
    pointLight3.position.set(0, 150, 0);
    this.scene.add(pointLight3);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.CircleGeometry(350, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0A1C2E,
      transparent: true,
      opacity: 0.8,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(500, 50, 0x1A3A2A, 0x0F2A1F);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(gridHelper);
  }

  private setupScene(): void {
    this.rippleEffect = new RippleEffect(this.scene);
    this.algaeField = new AlgaeField(
      this.scene,
      this.camera,
      this.renderer,
      this.rippleEffect
    );

    this.setupFog();
    this.setupParticles();
  }

  private setupFog(): void {
    const fogColor = new THREE.Color(0x0A1C2E);
    this.scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.002);
  }

  private setupParticles(): void {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x4ECDC4);
    const color2 = new THREE.Color(0x6BCB77);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 300;
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * 200;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(angle) * radius;

      const colorT = Math.random();
      const color = color1.clone().lerp(color2, colorT);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.name = 'particles';
    this.scene.add(particles);
  }

  private setupWindowResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private setupStartButton(): void {
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) return;

    startBtn.addEventListener('click', async () => {
      const success = await this.audioManager.init();

      if (success) {
        this.audioManager.startSampling((features: AudioFeatures) => {
          this.algaeField?.updateAudioFeatures(features);
        });

        startBtn.style.transition = 'opacity 0.5s, transform 0.5s';
        startBtn.style.opacity = '0';
        startBtn.style.transform = 'translate(-50%, -50%) scale(0.9)';
        setTimeout(() => {
          startBtn.remove();
        }, 500);
      } else {
        startBtn.textContent = '麦克风访问被拒绝，仍可体验视觉效果';
        startBtn.style.background = 'linear-gradient(135deg, #666, #888)';
        setTimeout(() => {
          startBtn.style.opacity = '0';
          setTimeout(() => startBtn.remove(), 500);
        }, 2000);
      }
    });
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed < this.FRAME_DURATION - 1) {
      return;
    }

    const deltaTime = Math.min(this.clock.getDelta() * 1000, 50);
    this.lastFrameTime = now - (elapsed % this.FRAME_DURATION);

    this.controls.update();
    this.updateParticles(deltaTime);
    this.algaeField?.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
  };

  private updateParticles(_deltaTime: number): void {
    const particles = this.scene.getObjectByName('particles') as THREE.Points | undefined;
    if (!particles) return;

    const positions = particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const time = performance.now() * 0.001;

    for (let i = 0; i < posArray.length; i += 3) {
      const baseX = posArray[i];
      const baseZ = posArray[i + 2];

      posArray[i] = baseX + Math.sin(time + baseZ * 0.01) * 0.3;
      posArray[i + 2] = baseZ + Math.cos(time + baseX * 0.01) * 0.3;
      posArray[i + 1] += Math.sin(time * 2 + i * 0.1) * 0.02;

      if (posArray[i + 1] > 200) posArray[i + 1] = 0;
      if (posArray[i + 1] < 0) posArray[i + 1] = 200;
    }

    positions.needsUpdate = true;
  }

  destroy(): void {
    cancelAnimationFrame(this.frameId);
    this.audioManager.destroy();
    this.algaeField?.destroy();
    this.rippleEffect?.destroy();
    this.renderer.dispose();
  }
}

let app: Application | null = null;

const init = (): void => {
  try {
    app = new Application();
    app.start();
  } catch (error) {
    console.error('初始化失败:', error);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('beforeunload', () => {
  app?.destroy();
});
