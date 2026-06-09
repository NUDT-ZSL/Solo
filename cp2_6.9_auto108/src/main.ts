import * as THREE from 'three';
import { createCave, CaveSystem } from './cave';
import { createCreatures, CreatureSystem, Creature } from './creatures';
import { createUI, UIControllers, UIUpdateData } from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let caveSystem: CaveSystem;
let creatureSystem: CreatureSystem;
let ui: ReturnType<typeof createUI>;

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraDistance = 8;
let cameraTheta = 0;
let cameraPhi = Math.PI / 3;
const cameraTarget = new THREE.Vector3(0, 0, 0);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let lastTime = 0;
let frameCount = 0;
let fpsAccumulator = 0;
let currentFPS = 60;

let globalLightIntensity = 100;
let creatureDensity = 100;
let isDayMode = false;
let animationEnabled = true;
let dayModeTimer: number | null = null;

const controllers: UIControllers = {
  get globalLightIntensity() { return globalLightIntensity; },
  set globalLightIntensity(v: number) { globalLightIntensity = v; },
  get creatureDensity() { return creatureDensity; },
  set creatureDensity(v: number) { creatureDensity = v; },
  get isDayMode() { return isDayMode; },
  set isDayMode(v: boolean) { isDayMode = v; },
  get animationEnabled() { return animationEnabled; },
  set animationEnabled(v: boolean) { animationEnabled = v; },

  onLightChange: (value: number) => {
    caveSystem.setGlobalLightIntensity(value);
    creatureSystem.setGlobalLightIntensity(value);
  },

  onDensityChange: (value: number) => {
    creatureSystem.setCreatureDensity(value);
  },

  onDayNightToggle: (isDay: boolean) => {
    isDayMode = isDay;
    caveSystem.setDayNightMode(isDay);

    if (isDay && dayModeTimer === null) {
      dayModeTimer = window.setTimeout(() => {
        isDayMode = false;
        caveSystem.setDayNightMode(false);
        const dayBtn = document.getElementById('day-btn') as HTMLButtonElement;
        const nightBtn = document.getElementById('night-btn') as HTMLButtonElement;
        if (dayBtn) dayBtn.classList.remove('active');
        if (nightBtn) nightBtn.classList.add('active');
        dayModeTimer = null;
      }, 10000);
    } else if (!isDay && dayModeTimer !== null) {
      clearTimeout(dayModeTimer);
      dayModeTimer = null;
    }
  },

  onAnimationToggle: (enabled: boolean) => {
    animationEnabled = enabled;
  },
};

function init() {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.08);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  updateCameraPosition();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  caveSystem = createCave();
  scene.add(caveSystem.group);

  const riverPath = caveSystem.getRiverPath();
  creatureSystem = createCreatures(riverPath);
  scene.add(creatureSystem.group);

  ui = createUI(controllers);

  setupEventListeners();

  lastTime = performance.now();
  animate();
}

function updateCameraPosition() {
  camera.position.x = cameraTarget.x + cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
  camera.position.y = cameraTarget.y + cameraDistance * Math.cos(cameraPhi);
  camera.position.z = cameraTarget.z + cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta);
  camera.lookAt(cameraTarget);
}

function setupEventListeners() {
  const canvas = renderer.domElement;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cameraTheta += deltaX * 0.005;
      cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi + deltaY * 0.005));

      updateCameraPosition();
      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraDistance = Math.max(2, Math.min(20, cameraDistance + e.deltaY * 0.01));
    updateCameraPosition();
  }, { passive: false });

  canvas.addEventListener('click', (e) => {
    if (isDragging) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    creatureSystem.handleClick(raycaster);
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartDistance = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      previousMousePosition = { x: touchStartX, y: touchStartY };
      isDragging = true;
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchStartDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      cameraTheta += deltaX * 0.005;
      cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi + deltaY * 0.005));

      updateCameraPosition();
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const delta = touchStartDistance - distance;
      cameraDistance = Math.max(2, Math.min(20, cameraDistance + delta * 0.05));
      updateCameraPosition();
      touchStartDistance = distance;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      isDragging = false;
    }
  });

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  const elapsedSeconds = currentTime / 1000;

  frameCount++;
  fpsAccumulator += deltaTime;
  if (fpsAccumulator >= 0.5) {
    currentFPS = frameCount / fpsAccumulator;
    frameCount = 0;
    fpsAccumulator = 0;
  }

  caveSystem.update(deltaTime, elapsedSeconds);
  creatureSystem.update(deltaTime, elapsedSeconds, animationEnabled, isDayMode);

  const resolutionScale = creatureSystem.getParticleResolutionScale();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) / resolutionScale);

  const selectedCreature = creatureSystem.getSelectedCreature();
  let selectedType: string | null = null;
  let selectedBrightness: number | null = null;
  let selectedScreenPos: { x: number; y: number } | null = null;

  if (selectedCreature) {
    selectedType = selectedCreature.type;
    selectedBrightness = selectedCreature.currentBrightness;
    selectedScreenPos = creatureSystem.getScreenPosition(
      selectedCreature,
      camera,
      window.innerWidth,
      window.innerHeight
    );
  }

  const stats = creatureSystem.getCreatureStats();

  const uiData: UIUpdateData = {
    totalCreatures: stats.total,
    fungusCount: stats.fungus,
    wormCount: stats.worm,
    mothCount: stats.moth,
    avgBrightness: stats.avgBrightness,
    fps: currentFPS,
    selectedCreatureType: selectedType,
    selectedCreatureBrightness: selectedBrightness,
    selectedCreatureScreenPos: selectedScreenPos,
  };

  ui.update(uiData, currentTime);

  renderer.render(scene, camera);
  lastTime = currentTime;
}

init();
