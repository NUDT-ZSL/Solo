import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CompoundEye } from './CompoundEye';
import { SceneManager } from './SceneManager';

type ViewMode = 'insect' | 'macro' | 'free';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private compoundEye: CompoundEye;
  private sceneManager: SceneManager;
  private clock: THREE.Clock;

  private viewMode: ViewMode = 'free';
  private container: HTMLElement;

  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private lastDetectionUpdate: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(3, 3, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);

    this.setupLights();

    this.sceneManager = new SceneManager();
    this.scene.add(this.sceneManager.group);

    this.compoundEye = new CompoundEye(200, 0.6, 1.0);
    this.compoundEye.group.position.set(-2.5, 0.5, 0);
    this.compoundEye.group.lookAt(0, 0, 0);
    this.scene.add(this.compoundEye.group);

    this.setupUI();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xFF8C00, 0.5, 20);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x8866FF, 0.4, 20);
    rimLight.position.set(3, -2, -4);
    this.scene.add(rimLight);

    const eyeLight = new THREE.PointLight(0xFFD700, 0.8, 5);
    eyeLight.position.set(-2.5, 0.5, 0);
    this.scene.add(eyeLight);
  }

  private setupUI(): void {
    this.setupSlider('ommatidia-count', 'ommatidia-value', 'ommatidia-fill', 50, 500, 200, (val) => {
      this.compoundEye.count = val;
    });

    this.setupSlider('curvature', 'curvature-value', 'curvature-fill', 0.2, 1.0, 0.6, (val) => {
      this.compoundEye.curvature = val;
    }, 2);

    this.setupSlider('sensitivity', 'sensitivity-value', 'sensitivity-fill', 0.1, 2.0, 1.0, (val) => {
      this.compoundEye.sensitivity = val;
    }, 1);

    this.setupSlider('temperature', 'temperature-value', 'temperature-fill', 0.3, 2.0, 1.0, (val) => {
      this.sceneManager.temperature = val;
    }, 1);

    const vividToggle = document.getElementById('vivid-toggle')!;
    vividToggle.addEventListener('click', () => {
      vividToggle.classList.toggle('active');
      this.sceneManager.vivid = vividToggle.classList.contains('active');
    });

    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setViewMode((btn as HTMLElement).dataset.view as ViewMode);

        btn.animate(
          [
            { boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.7)' },
            { boxShadow: '0 0 0 10px rgba(255, 215, 0, 0)' }
          ],
          { duration: 600, easing: 'ease-out' }
        );
      });
    });
  }

  private setupSlider(
    inputId: string,
    valueId: string,
    fillId: string,
    min: number,
    max: number,
    defaultValue: number,
    onChange: (value: number) => void,
    decimals: number = 0
  ): void {
    const slider = document.getElementById(inputId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId)!;
    const fill = document.getElementById(fillId)!;

    const updateFill = () => {
      const percent = ((parseFloat(slider.value) - min) / (max - min)) * 100;
      fill.style.width = `${percent}%`;
      const val = parseFloat(slider.value);
      valueDisplay.textContent = decimals > 0 ? val.toFixed(decimals) : val.toString();
    };

    slider.addEventListener('input', () => {
      updateFill();
      onChange(parseFloat(slider.value));
    });

    updateFill();
  }

  private setViewMode(mode: ViewMode): void {
    this.viewMode = mode;

    switch (mode) {
      case 'insect': {
        this.controls.enabled = false;
        const eyePos = new THREE.Vector3();
        this.compoundEye.group.getWorldPosition(eyePos);
        const eyeDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.compoundEye.group.quaternion);
        this.camera.position.copy(eyePos).add(eyeDir.clone().multiplyScalar(-1));
        this.camera.lookAt(eyePos.clone().add(eyeDir.multiplyScalar(5)));
        this.camera.fov = 120;
        this.camera.updateProjectionMatrix();
        break;
      }
      case 'macro': {
        this.controls.enabled = false;
        this.camera.position.set(0, 6, 6);
        this.camera.lookAt(0, 0, 0);
        this.camera.fov = 45;
        this.camera.updateProjectionMatrix();
        break;
      }
      case 'free': {
        this.controls.enabled = true;
        this.camera.position.set(3, 3, 5);
        this.camera.fov = 60;
        this.camera.updateProjectionMatrix();
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        break;
      }
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      const fpsEl = document.getElementById('fps-counter')!;
      fpsEl.textContent = `FPS: ${fps}`;
      if (fps >= 50) {
        fpsEl.style.color = '#7CFC00';
      } else if (fps >= 30) {
        fpsEl.style.color = '#FFD700';
      } else {
        fpsEl.style.color = '#FF4444';
      }
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private updateDetectionInfo(): void {
    const now = performance.now();
    if (now - this.lastDetectionUpdate < 200) return;
    this.lastDetectionUpdate = now;

    const result = this.compoundEye.detectObjects(this.sceneManager.getAllObjects());

    document.getElementById('detected-count')!.textContent = result.detectedCount.toString();
    document.getElementById('nearest-distance')!.textContent =
      result.nearestDistance >= 0 ? result.nearestDistance.toFixed(2) : '--';

    const hexColor = '#' + result.averageColor.getHexString();
    const avgColorEl = document.getElementById('avg-color')!;
    avgColorEl.textContent = hexColor.toUpperCase();
    avgColorEl.style.color = hexColor;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.sceneManager.update(delta);
    this.compoundEye.update(delta);

    if (this.viewMode === 'insect') {
      const eyePos = new THREE.Vector3();
      this.compoundEye.group.getWorldPosition(eyePos);
      const eyeDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.compoundEye.group.quaternion);
      const targetPos = eyePos.clone().add(eyeDir.clone().multiplyScalar(-1));
      this.camera.position.lerp(targetPos, 0.1);
      const lookTarget = eyePos.clone().add(eyeDir.multiplyScalar(5));
      this.camera.lookAt(lookTarget);
    } else if (this.viewMode === 'free') {
      this.controls.update();
    }

    this.updateFPS();
    this.updateDetectionInfo();

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.compoundEye.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
