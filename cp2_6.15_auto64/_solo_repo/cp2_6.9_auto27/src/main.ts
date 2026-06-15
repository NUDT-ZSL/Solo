import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createCity,
  updateRoofLights,
  updateParticles,
  BuildingData,
} from './city';
import {
  updateAnimations,
  updateHoverEffects,
} from './animation';
import { InteractionManager } from './interaction';
import './styles.css';

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
}

function generateStarfield(): void {
  const canvas = document.getElementById('starfield') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
  };

  const stars: { x: number; y: number; r: number; a: number }[] = [];
  const starCount = Math.floor((window.innerWidth * window.innerHeight) / 4000);

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.3 + 0.2,
      a: Math.random() * Math.PI * 2,
    });
  }

  const draw = () => {
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#03030a');
    grad.addColorStop(0.5, '#07071a');
    grad.addColorStop(1, '#0a0a22');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const time = performance.now() * 0.001;
    stars.forEach((s) => {
      const twinkle = 0.5 + 0.5 * Math.sin(time * 1.5 + s.a);
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 230, 255, ${0.3 + 0.7 * twinkle})`;
      ctx.fill();
    });

    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(i * 1.3 + time * 0.05) * 0.5 + 0.5) * w;
      const y = (Math.cos(i * 0.9 + time * 0.03) * 0.5 + 0.5) * h;
      const r = 60 + Math.sin(time + i) * 20;
      const hue = i % 2 === 0 ? '220, 80, 255' : '80, 140, 255';
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(${hue}, 0.04)`);
      rg.addColorStop(1, `rgba(${hue}, 0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  };

  window.addEventListener('resize', resize);
  resize();

  const animate = () => {
    draw();
    requestAnimationFrame(animate);
  };
  animate();
}

function setupPanel(): (data: BuildingData) => void {
  const panel = document.getElementById('control-panel');
  const nameEl = document.getElementById('building-name');
  const infoEl = document.getElementById('building-info');
  const closeBtn = document.getElementById('close-btn');

  const hide = () => {
    if (panel) panel.classList.add('hidden');
  };

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hide();
    });
  }

  return (data: BuildingData) => {
    if (!panel || !nameEl || !infoEl) return;
    nameEl.textContent = data.name;
    infoEl.textContent = `Height: ${data.height.toFixed(2)} units`;
    panel.classList.remove('hidden');
  };
}

async function requestFullscreen(): Promise<void> {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    }
  } catch {
    // Fullscreen may be blocked by browser - ignore silently
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private interaction!: InteractionManager;
  private cityGroup: THREE.Group;
  private buildings!: Map<THREE.Mesh, BuildingData>;
  private particles!: THREE.Points;
  private showBuildingInfo!: (data: BuildingData) => void;
  private clock: THREE.Clock;
  private introStart: number;
  private introDone = false;
  private initialGroupY = 0;

  constructor() {
    this.clock = new THREE.Clock();
    this.introStart = performance.now();

    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) throw new Error('#app element not found');

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050510, 0.015);

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
    this.camera.position.set(22, 18, 22);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
    this.container.style.cursor = 'grab';

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2.15;
    this.controls.target.set(0, 3, 0);
    this.controls.update();

    this.cityGroup = new THREE.Group();
    this.scene.add(this.cityGroup);

    this.setupLights();
    this.buildCity();
    this.showBuildingInfo = setupPanel();
    this.setupInteraction();

    window.addEventListener('resize', this.onResize);

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x1a2240, 0.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x3344aa, 0x0a0a15, 0.35);
    this.scene.add(hemi);

    const moon = new THREE.DirectionalLight(0x8faaff, 0.7);
    moon.position.set(18, 30, 12);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 100;
    const s = 35;
    moon.shadow.camera.left = -s;
    moon.shadow.camera.right = s;
    moon.shadow.camera.top = s;
    moon.shadow.camera.bottom = -s;
    this.scene.add(moon);

    const fill = new THREE.PointLight(0x4466ff, 0.6, 80);
    fill.position.set(-15, 10, -15);
    this.scene.add(fill);

    const fill2 = new THREE.PointLight(0x6644ff, 0.5, 80);
    fill2.position.set(15, 8, -15);
    this.scene.add(fill2);
  }

  private buildCity(): void {
    const isMobile = isMobileDevice();
    const result = createCity(isMobile);
    this.cityGroup.add(result.group);
    this.buildings = result.buildings;
    this.particles = result.particles;
    this.initialGroupY = -18;
    this.cityGroup.position.y = this.initialGroupY;
  }

  private setupInteraction(): void {
    this.interaction = new InteractionManager(
      this.camera,
      this.renderer.domElement,
      this.buildings,
      {
        onBuildingClick: (data) => this.showBuildingInfo(data),
      }
    );
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(0.05, this.clock.getDelta());
    const time = this.clock.getElapsedTime();

    if (!this.introDone) {
      const t = Math.min(1, (performance.now() - this.introStart) / 1000);
      const y = this.initialGroupY + (0 - this.initialGroupY) * easeOutCubic(t);
      this.cityGroup.position.y = y;
      if (t >= 1) this.introDone = true;
    }

    this.controls.update();
    updateRoofLights(this.buildings, time);
    updateParticles(this.particles);
    updateAnimations();
    updateHoverEffects(delta);

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.interaction.dispose();
    this.renderer.dispose();
  }
}

generateStarfield();

let app: App | null = null;

const start = async () => {
  try {
    app = new App();
  } catch (err) {
    console.error('Failed to start app:', err);
  }
};

const initOnInteract = () => {
  document.removeEventListener('click', initOnInteract);
  document.removeEventListener('touchstart', initOnInteract);
  document.removeEventListener('keydown', initOnInteract);
  requestFullscreen();
};

document.addEventListener('click', initOnInteract);
document.addEventListener('touchstart', initOnInteract);
document.addEventListener('keydown', initOnInteract);

start();
