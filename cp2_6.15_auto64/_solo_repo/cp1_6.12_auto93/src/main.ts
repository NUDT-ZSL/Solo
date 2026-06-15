import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GardenManager, HabitData } from './garden';
import { UIManager } from './ui';

const STORAGE_KEY = 'crystal-habit-v1';

interface PersistedState {
  habits: HabitData[];
  lastReset: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PersistedState;
  } catch {
    /* ignore */
  }
  const demo: HabitData[] = [
    {
      id: uid(),
      name: '每日阅读30分钟',
      colorTheme: '#7c3aed',
      icon: '📚',
      streak: 3,
      todayDone: false,
      position: { x: 0, z: 0 },
    },
    {
      id: uid(),
      name: '晨间跑步',
      colorTheme: '#22c55e',
      icon: '🏃',
      streak: 8,
      todayDone: false,
      position: { x: 1.2, z: 0.6 },
    },
    {
      id: uid(),
      name: '喝8杯水',
      colorTheme: '#06b6d4',
      icon: '💧',
      streak: 22,
      todayDone: true,
      position: { x: -1.0, z: 0.9 },
    },
    {
      id: uid(),
      name: '冥想10分钟',
      colorTheme: '#ec4899',
      icon: '🧘',
      streak: 35,
      todayDone: false,
      position: { x: 0.3, z: -1.4 },
    },
    {
      id: uid(),
      name: '早睡早起',
      colorTheme: '#eab308',
      icon: '💤',
      streak: 0,
      todayDone: false,
      position: { x: -1.4, z: -0.8 },
    },
  ];
  return { habits: demo, lastReset: todayStr() };
}

function saveState(habits: HabitData[]): void {
  const state: PersistedState = { habits, lastReset: todayStr() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createGradientBackground(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.3,
    size * 0.1,
    size * 0.5,
    size * 0.6,
    size * 0.9
  );
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(0.4, '#1a1240');
  grad.addColorStop(0.75, '#0f0c29');
  grad.addColorStop(1, '#05030f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class App {
  private container: HTMLDivElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private garden: GardenManager;
  private ui: UIManager;
  private clock: THREE.Clock;
  private rafId = 0;

  constructor() {
    this.container = document.getElementById('scene-container') as HTMLDivElement;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = createGradientBackground();
    this.scene.fog = new THREE.FogExp2(0x0a0820, 0.045);

    this.camera = new THREE.PerspectiveCamera(
      52,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    const camDist = 9;
    const angle = (45 * Math.PI) / 180;
    this.camera.position.set(
      camDist * Math.cos(angle),
      camDist * Math.sin(angle),
      camDist * 0.6
    );
    this.camera.lookAt(0, 0.8, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = (85 * Math.PI) / 180;
    this.controls.minPolarAngle = (10 * Math.PI) / 180;
    this.controls.target.set(0, 0.6, 0);

    this.setupLights();

    this.garden = new GardenManager(this.scene);
    this.ui = new UIManager({
      onCheckIn: (id) => this.handleCheckIn(id),
      onAddHabit: (data) => this.handleAddHabit(data),
      onFocusHabit: (id) => this.ui.focusHabit(id),
    });

    const state = loadState();
    if (state.lastReset !== todayStr()) {
      state.habits.forEach((h) => (h.todayDone = false));
    }
    state.habits.forEach((habit) => {
      this.garden.addHabit(habit);
      this.ui.addHabitCard(habit);
      this.ui.updateHabitCard(habit);
    });

    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xb8a9ff, 0.55);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 8, 5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x7c3aed, 0.45);
    fill.position.set(-5, 3, -4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x22d3ee, 0.35);
    rim.position.set(2, 5, -6);
    this.scene.add(rim);

    const hemi = new THREE.HemisphereLight(0x4c1d95, 0x0a0a1a, 0.35);
    this.scene.add(hemi);
  }

  private handleCheckIn(id: string): void {
    this.garden.checkIn(id);
    const blessing = this.garden.getRandomBlessing();
    this.ui.showBlessing(blessing);
    this.save();
  }

  private handleAddHabit(data: {
    name: string;
    colorTheme: string;
    icon: string;
  }): void {
    const habit: HabitData = {
      id: uid(),
      name: data.name,
      colorTheme: data.colorTheme,
      icon: data.icon,
      streak: 0,
      todayDone: false,
      position: { x: 0, z: 0 },
    };
    this.garden.addHabit(habit);
    this.ui.addHabitCard(habit);
    this.ui.updateHabitCard(habit);
    this.save();
  }

  private save(): void {
    saveState(this.garden.getAllHabits());
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.garden.update(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.controls.dispose();
    this.renderer.dispose();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
