import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CrystalGrid } from './crystalGrid';
import { InteractionManager, DistortMode } from './interaction';
import { AnimationLoop } from './animationLoop';

const CRYSTAL_RADIUS = 0.3;
const CRYSTAL_SPACING = 0.5;
const CAMERA_FOV = 45;

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private grid: CrystalGrid;
  private interaction: InteractionManager;
  private loop: AnimationLoop;
  private canvas: HTMLCanvasElement;
  private baseCameraPos: THREE.Vector3 = new THREE.Vector3(20, 15, 20);
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3(20, 15, 20);
  private backgroundScene: THREE.Scene;
  private backgroundCamera: THREE.OrthographicCamera;
  private hudElements: {
    hover: HTMLElement;
    distort: HTMLElement;
    selected: HTMLElement;
    fps: HTMLElement;
  };

  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.hudElements = {
      hover: document.getElementById('hud-hover')!,
      distort: document.getElementById('hud-distort')!,
      selected: document.getElementById('hud-selected')!,
      fps: document.getElementById('hud-fps')!,
    };

    const { scene, camera, renderer, controls } = this.initThree();
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.controls = controls;

    this.backgroundScene = new THREE.Scene();
    this.backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.setupBackground();

    this.grid = new CrystalGrid();
    this.interaction = new InteractionManager();
    this.loop = new AnimationLoop();

    this.scene.add(this.grid.group);

    this.setupInteraction();
    this.setupLoop();
    this.setupResponsive();
    this.handleResize();

    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('beforeunload', this.dispose.bind(this));

    this.loop.start();
  }

  private initThree() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0f0a20, 25, 80);

    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.autoClear = false;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(12, 22, 14);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.25);
    fillLight.position.set(-10, 8, -8);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(0, 0, 0);
    controls.update();

    return { scene, camera, renderer, controls };
  }

  private setupBackground(): void {
    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color('#0B132B') },
        bottomColor: { value: new THREE.Color('#1F0B3A') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          vec3 c = mix(bottomColor, topColor, smoothstep(0.0, 1.0, vUv.y));
          float vignette = smoothstep(1.2, 0.3, length(vUv - 0.5));
          c = mix(c * 0.85, c, vignette);
          gl_FragColor = vec4(c, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.backgroundScene.add(mesh);
  }

  private setupInteraction(): void {
    this.interaction.attach(this.camera, this.canvas, this.grid);

    this.interaction.onHoverChange = (row, col) => {
      if (row === null || col === null) {
        this.hudElements.hover.textContent = '—';
      } else {
        this.hudElements.hover.textContent = `第${row + 1}行 第${col + 1}列`;
      }
    };

    this.interaction.onSelectChange = (idx) => {
      if (idx === null) {
        this.hudElements.selected.textContent = '无';
      } else {
        this.hudElements.selected.textContent = `#${idx.toString().padStart(3, '0')}`;
      }
    };

    this.interaction.onDistortModeChange = (mode: DistortMode) => {
      const map: Record<DistortMode, string> = {
        none: '无',
        waveLeft: '波浪左倾',
        waveRight: '波浪右倾',
        centerUp: '中心膨胀',
        centerDown: '中心压缩',
      };
      this.hudElements.distort.textContent = map[mode];
    };
  }

  private setupLoop(): void {
    this.loop.onFpsUpdate = (fps) => {
      this.hudElements.fps.textContent = `${fps.toFixed(0)} FPS`;
    };

    this.loop.onUpdate = (dt, _elapsed) => {
      this.interaction.update(dt);
      this.grid.update(dt, this.interaction.state);

      const lerpFactor = 1 - Math.pow(0.001, dt);
      this.camera.position.lerp(this.targetCameraPos, lerpFactor * 0.3);
      this.controls.update();

      this.renderer.clear();
      this.renderer.render(this.backgroundScene, this.backgroundCamera);
      this.renderer.render(this.scene, this.camera);
    };
  }

  private setupResponsive(): void {
    const size = this.computeGridSize();
    this.grid.build(size);
    const pos = this.computeCameraPosition(size);
    this.baseCameraPos.copy(pos);
    this.targetCameraPos.copy(pos);
    this.camera.position.copy(pos);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private computeGridSize(): number {
    const w = window.innerWidth;
    if (w >= 1024) return 15;
    if (w >= 768) return 12;
    return 8;
  }

  private computeCameraPosition(gridSize: number): THREE.Vector3 {
    const step = CRYSTAL_RADIUS * 2 + CRYSTAL_SPACING;
    const totalWidth = gridSize * step;
    const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV);
    const aspect = window.innerWidth / window.innerHeight;
    const visibleWidth = totalWidth * 1.4;
    const dist = visibleWidth / (2 * Math.tan(fovRad / 2) * Math.min(aspect, 1));
    const y = dist * 0.62;
    return new THREE.Vector3(dist * 0.9, y, dist * 0.9);
  }

  private lastGridSize: number = 0;
  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const size = this.computeGridSize();
    if (size !== this.lastGridSize) {
      this.lastGridSize = size;
      this.interaction.state.hoverIndex = null;
      this.interaction.state.selectedIndex = null;
      this.grid.build(size);
      const hudHover = this.hudElements.hover;
      const hudSelected = this.hudElements.selected;
      hudHover.textContent = '—';
      hudSelected.textContent = '无';
    }
    const pos = this.computeCameraPosition(size);
    this.baseCameraPos.copy(pos);
    this.targetCameraPos.copy(pos);
  }

  private dispose(): void {
    this.loop.dispose();
    this.interaction.dispose();
    this.grid.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
