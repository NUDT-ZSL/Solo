import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CloudPatternGenerator, type PatternParams } from './pattern';
import { UIPanel, type SurfaceType } from './ui';

const DEFAULT_PARAMS: PatternParams = {
  curl: 50,
  density: 30,
  colorShift: 0,
  flowSpeed: 0.05
};

const DEFAULT_SURFACE: SurfaceType = 'cylinder';

class CloudPatternLoom {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private patternGenerator: CloudPatternGenerator;
  private uiPanel: UIPanel;

  private currentMesh: THREE.Mesh | null = null;
  private currentSurface: SurfaceType = DEFAULT_SURFACE;
  private params: PatternParams = { ...DEFAULT_PARAMS };

  private stars: THREE.Points | null = null;
  private flowOffset: number = 0;
  private isTransitioning: boolean = false;
  private isFlashing: boolean = false;

  private animationId: number | null = null;
  private clock: THREE.Clock;

  private fpsHistory: number[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private textureGenTimes: number[] = [];
  private debugPanel: HTMLDivElement | null = null;
  private showDebugPanel: boolean = false;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.patternGenerator = new CloudPatternGenerator(this.params);
    this.uiPanel = new UIPanel(this.params, this.currentSurface, {
      onParamsChange: this.handleParamsChange.bind(this),
      onSurfaceChange: this.handleSurfaceChange.bind(this),
      onReset: this.handleReset.bind(this)
    });

    this.init();
  }

  private init(): void {
    this.setupLighting();
    this.createStarfield();
    this.createSurface(this.currentSurface);
    this.createDebugPanel();
    this.setupEventListeners();
    this.animate();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x0a0a14, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.enablePan = false;
    return controls;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6c63ff, 0.5);
    fillLight.position.set(-5, -3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6584, 0.3);
    rimLight.position.set(0, 5, -5);
    this.scene.add(rimLight);
  }

  private createStarfield(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness * 1.1;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  private createSurface(type: SurfaceType): void {
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      (this.currentMesh.material as THREE.Material).dispose();
    }

    let geometry: THREE.BufferGeometry;

    switch (type) {
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(2, 2, 3, 64, 32);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(2.5, 64, 64);
        break;
      case 'torusKnot':
        geometry = new THREE.TorusKnotGeometry(2, 0.8, 128, 32);
        break;
      default:
        geometry = new THREE.CylinderGeometry(2, 2, 3, 64, 32);
    }

    const texture = this.patternGenerator.getTexture();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      roughness: 0.4,
      metalness: 0.1
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);
  }

  private createDebugPanel(): void {
    this.debugPanel = document.createElement('div');
    this.debugPanel.style.position = 'fixed';
    this.debugPanel.style.top = '10px';
    this.debugPanel.style.right = '10px';
    this.debugPanel.style.padding = '12px 16px';
    this.debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    this.debugPanel.style.color = '#ffffff';
    this.debugPanel.style.fontFamily = 'monospace';
    this.debugPanel.style.fontSize = '13px';
    this.debugPanel.style.lineHeight = '1.6';
    this.debugPanel.style.borderRadius = '6px';
    this.debugPanel.style.pointerEvents = 'none';
    this.debugPanel.style.zIndex = '1000';
    this.debugPanel.style.display = 'none';
    document.body.appendChild(this.debugPanel);
  }

  private updateDebugPanel(fps: number, avgTextureTime: number): void {
    if (!this.debugPanel || !this.showDebugPanel) return;

    const surfaceNames: Record<SurfaceType, string> = {
      cylinder: '圆柱体',
      sphere: '球体',
      torusKnot: '环面纽结'
    };

    this.debugPanel.innerHTML = `
      <div><strong>性能监控</strong></div>
      <div>帧率: ${fps.toFixed(1)} FPS</div>
      <div>纹理耗时: ${avgTextureTime.toFixed(2)} ms</div>
      <div>曲面类型: ${surfaceNames[this.currentSurface] || this.currentSurface}</div>
    `;
  }

  private handleParamsChange(params: Partial<PatternParams>): void {
    const oldFlowSpeed = this.params.flowSpeed;
    this.params = { ...this.params, ...params };

    if (params.curl !== undefined || params.density !== undefined || params.colorShift !== undefined) {
      const startTime = performance.now();
      this.patternGenerator.updateParams(this.params);
      const elapsed = performance.now() - startTime;

      this.textureGenTimes.push(elapsed);
      if (this.textureGenTimes.length > 10) {
        this.textureGenTimes.shift();
      }

      if (elapsed > 50) {
        console.warn(`纹理生成耗时 ${elapsed.toFixed(2)}ms，超过50ms阈值`);
      }
    }

    if (params.flowSpeed !== undefined && oldFlowSpeed !== params.flowSpeed) {
    }
  }

  private handleSurfaceChange(surface: SurfaceType): void {
    if (this.isTransitioning || surface === this.currentSurface) return;
    this.isTransitioning = true;

    this.transitionSurface(surface);
  }

  private transitionSurface(targetSurface: SurfaceType): void {
    const halfDuration = 250;
    const oldMesh = this.currentMesh;

    const fadeOut = (startTime: number) => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / halfDuration, 1);

      if (oldMesh) {
        (oldMesh.material as THREE.MeshStandardMaterial).opacity = 1 - progress;
      }

      if (progress < 1) {
        requestAnimationFrame(() => fadeOut(startTime));
      } else {
        this.currentSurface = targetSurface;
        this.createSurface(targetSurface);
        if (this.currentMesh) {
          (this.currentMesh.material as THREE.MeshStandardMaterial).opacity = 0;
        }

        const fadeInStartTime = performance.now();
        const fadeIn = () => {
          const elapsed = performance.now() - fadeInStartTime;
          const progress = Math.min(elapsed / halfDuration, 1);

          if (this.currentMesh) {
            (this.currentMesh.material as THREE.MeshStandardMaterial).opacity = progress;
          }

          if (progress < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            this.isTransitioning = false;
            if (this.currentMesh) {
              (this.currentMesh.material as THREE.MeshStandardMaterial).opacity = 1;
            }
          }
        };
        fadeIn();
      }
    };

    fadeOut(performance.now());
  }

  private handleReset(): void {
    this.params = { ...DEFAULT_PARAMS };
    this.currentSurface = DEFAULT_SURFACE;

    this.patternGenerator.updateParams(this.params);
    this.uiPanel.setParams(this.params);
    this.uiPanel.setSurface(this.currentSurface);

    this.createSurface(this.currentSurface);
    this.flashAnimation();
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private flashAnimation(): void {
    if (this.isFlashing || !this.currentMesh) return;
    this.isFlashing = true;

    const halfDuration = 150;
    const material = this.currentMesh.material as THREE.MeshStandardMaterial;

    const fadeOut = (startTime: number) => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / halfDuration, 1);
      const easedProgress = this.easeInOutQuad(progress);
      material.opacity = 1 - easedProgress * 0.5;

      if (progress < 1) {
        requestAnimationFrame(() => fadeOut(startTime));
      } else {
        const fadeInStartTime = performance.now();
        const fadeIn = () => {
          const elapsed = performance.now() - fadeInStartTime;
          const progress = Math.min(elapsed / halfDuration, 1);
          const easedProgress = this.easeInOutQuad(progress);
          material.opacity = 0.5 + easedProgress * 0.5;

          if (progress < 1) {
            requestAnimationFrame(fadeIn);
          } else {
            material.opacity = 1;
            this.isFlashing = false;
          }
        };
        fadeIn();
      }
    };

    fadeOut(performance.now());
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'd') {
      this.toggleDebugPanel();
    }
  }

  private toggleDebugPanel(): void {
    this.showDebugPanel = !this.showDebugPanel;
    if (this.debugPanel) {
      this.debugPanel.style.display = this.showDebugPanel ? 'block' : 'none';
    }
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      const fps = 1000 / frameTime;

      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 30) {
        this.fpsHistory.shift();
      }

      this.frameCount++;
      if (this.frameCount % 60 === 0) {
        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        if (avgFps < 55) {
          console.warn(`低FPS警告: 平均 ${avgFps.toFixed(1)} FPS`);
        } else {
          console.log(`FPS: ${avgFps.toFixed(1)}`);
        }
      }
    }
    this.lastFrameTime = now;

    const delta = this.clock.getDelta();

    this.flowOffset += this.params.flowSpeed * delta * 60;

    if (this.currentMesh && !this.isTransitioning && !this.isFlashing) {
      const material = this.currentMesh.material as THREE.MeshStandardMaterial;
      if (material.map) {
        material.map.offset.y = this.flowOffset;
        material.map.needsUpdate = true;
      }
    }

    if (this.currentMesh && !this.isTransitioning) {
      this.currentMesh.rotation.y += 0.002;
    }

    if (this.stars) {
      this.stars.rotation.y += 0.0001;
      this.stars.rotation.x += 0.00005;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.showDebugPanel) {
      const avgFps = this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
        : 0;
      const avgTextureTime = this.textureGenTimes.length > 0
        ? this.textureGenTimes.reduce((a, b) => a + b, 0) / this.textureGenTimes.length
        : 0;
      this.updateDebugPanel(avgFps, avgTextureTime);
    }
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.patternGenerator.dispose();

    if (this.currentMesh) {
      this.currentMesh.geometry.dispose();
      (this.currentMesh.material as THREE.Material).dispose();
    }

    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
    }

    if (this.debugPanel) {
      document.body.removeChild(this.debugPanel);
      this.debugPanel = null;
    }

    this.renderer.dispose();
    this.controls.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CloudPatternLoom();
});
