import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainGenerator } from './TerrainGenerator';
import { EnvironmentManager } from './EnvironmentManager';
import { InteractionHandler, EditMode, PlaceTool } from './InteractionHandler';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrain: TerrainGenerator;
  private environment: EnvironmentManager;
  private interaction: InteractionHandler;

  private clock: THREE.Clock;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#87CEEB');
    this.scene.fog = new THREE.Fog('#87CEEB', 50, 120);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(30, 25, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 80;
    this.controls.target.set(0, 0, 0);

    this.terrain = new TerrainGenerator(80, 100, 2);
    this.scene.add(this.terrain.getMesh());

    this.environment = new EnvironmentManager(this.scene, this.terrain);

    this.interaction = new InteractionHandler(
      this.camera,
      this.renderer,
      this.scene,
      this.terrain,
      this.environment
    );

    this.setupLighting();
    this.setupSky();
    this.setupUI();

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#fff5e6', 1.2);
    dirLight.position.set(30, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight('#87CEEB', '#8D6E63', 0.3);
    this.scene.add(hemiLight);
  }

  private setupSky(): void {
    const skyGeo = new THREE.SphereGeometry(200, 16, 16);

    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 bottomColor = vec3(0.529, 0.808, 0.922);
        vec3 topColor = vec3(0.118, 0.227, 0.373);
        vec3 color = mix(bottomColor, topColor, max(h, 0.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  private setupUI(): void {
    const heightSlider = document.getElementById('height-scale') as HTMLInputElement;
    const heightVal = document.getElementById('height-scale-val')!;
    heightSlider?.addEventListener('input', () => {
      const val = parseFloat(heightSlider.value);
      heightVal.textContent = val.toFixed(1);
      this.terrain.setHeightScale(val);
    });

    const densitySlider = document.getElementById('density') as HTMLInputElement;
    const densityVal = document.getElementById('density-val')!;
    densitySlider?.addEventListener('input', () => {
      const val = parseFloat(densitySlider.value);
      densityVal.textContent = val.toFixed(1);
      this.environment.setDensity(val);
    });

    const radiusSlider = document.getElementById('edit-radius') as HTMLInputElement;
    const radiusVal = document.getElementById('edit-radius-val')!;
    radiusSlider?.addEventListener('input', () => {
      const val = parseFloat(radiusSlider.value);
      radiusVal.textContent = val.toFixed(1);
      this.interaction.setEditRadius(val);
    });

    const strengthSlider = document.getElementById('edit-strength') as HTMLInputElement;
    const strengthVal = document.getElementById('edit-strength-val')!;
    strengthSlider?.addEventListener('input', () => {
      const val = parseFloat(strengthSlider.value);
      strengthVal.textContent = val.toFixed(1);
      this.interaction.setEditStrength(val);
    });

    document.getElementById('btn-clear')?.addEventListener('click', () => {
      this.environment.clearAll();
      this.interaction.cancelRiverPlacement();
    });

    const modeBar = document.getElementById('mode-bar')!;
    const toolBar = document.getElementById('tool-bar')!;
    modeBar.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        modeBar.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = (btn as HTMLElement).dataset.mode as EditMode;
        this.interaction.setEditMode(mode);
        toolBar.style.display = mode === 'place' ? 'flex' : 'none';
        if (mode !== 'place') {
          this.interaction.cancelRiverPlacement();
        }
      });
    });

    toolBar.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        toolBar.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = (btn as HTMLElement).dataset.tool as PlaceTool;
        this.interaction.setPlaceTool(tool);
        this.interaction.cancelRiverPlacement();
      });
    });

    const panel = document.getElementById('control-panel')!;
    const panelToggle = document.getElementById('panel-toggle')!;

    const checkMobile = () => {
      if (window.innerWidth < 768) {
        panel.classList.add('collapsed');
        panelToggle.style.display = 'block';
      }
    };
    checkMobile();

    panelToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.remove('collapsed');
    });

    panel.addEventListener('click', (e) => {
      if (window.innerWidth < 768 && e.target === panel) {
        panel.classList.add('collapsed');
      }
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth < 768 && !panel.contains(e.target as Node)) {
        panel.classList.add('collapsed');
      }
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();
    this.interaction.updateParticles(delta);
    this.environment.updateRiverFlow(delta);
    this.environment.animateTrees(elapsed);

    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTime);
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }
}

new App();
