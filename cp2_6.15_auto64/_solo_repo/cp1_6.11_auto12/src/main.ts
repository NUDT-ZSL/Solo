import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ReliefScene, type ReliefParams } from './reliefScene';
import { UIControls } from './uiControls';
import { getPresetStars, parseStarData, type Star } from './starData';

const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
const panelContainer = document.getElementById('panel-container') as HTMLElement;
const hoverLabel = document.getElementById('hover-label') as HTMLElement;
const hiddenFileInput = document.getElementById('hidden-file-input') as HTMLInputElement;
const loadingScreen = document.getElementById('loading-screen') as HTMLElement;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8.5, 11);
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth - 280, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI / 2 + 0.3;
controls.target.set(0, 0.5, 0);

const reliefScene = new ReliefScene(scene);

const initialStars = getPresetStars('orion');
reliefScene.setStars(initialStars);

let userInteracting = false;
let interactionTimeout: ReturnType<typeof setTimeout> | null = null;
controls.addEventListener('start', () => {
  userInteracting = true;
  if (interactionTimeout) clearTimeout(interactionTimeout);
});
controls.addEventListener('end', () => {
  interactionTimeout = setTimeout(() => { userInteracting = false; }, 400);
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredStarIndex = -1;

function updatePointerFromEvent(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function onCanvasMove(e: MouseEvent): void {
  updatePointerFromEvent(e);
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(reliefScene.getBumpMeshes(), false);
  let newIndex = -1;
  if (intersects.length > 0) {
    const idx = intersects[0].object.userData.starIndex;
    if (typeof idx === 'number') newIndex = idx;
  }
  if (newIndex !== hoveredStarIndex) {
    hoveredStarIndex = newIndex;
    reliefScene.highlightStar(newIndex);
    if (newIndex >= 0) {
      const star = reliefScene.getStar(newIndex);
      const worldPos = reliefScene.getStarWorldPosition(newIndex);
      if (star && worldPos) {
        const proj = worldPos.clone().project(camera);
        const rect = canvas.getBoundingClientRect();
        const screenX = (proj.x * 0.5 + 0.5) * rect.width + rect.left;
        const screenY = (-proj.y * 0.5 + 0.5) * rect.height + rect.top;
        const magStr = star.magnitude.toFixed(2);
        const distStr = star.distance > 0 ? `${star.distance} 光年` : '未知';
        const content = `<strong>${star.name}</strong><br/>光谱: ${star.spectralType}型 · 星等: ${magStr}<br/>距离: ${distStr}`;
        ui.showHoverLabel(screenX, screenY, content);
      }
    } else {
      ui.hideHoverLabel();
    }
  } else if (newIndex >= 0) {
    const worldPos = reliefScene.getStarWorldPosition(newIndex);
    if (worldPos) {
      const proj = worldPos.clone().project(camera);
      const rect = canvas.getBoundingClientRect();
      const screenX = (proj.x * 0.5 + 0.5) * rect.width + rect.left;
      const screenY = (-proj.y * 0.5 + 0.5) * rect.height + rect.top;
      ui.showHoverLabel(screenX, screenY, hoverLabel.innerHTML);
    }
  }
}
canvas.addEventListener('mousemove', onCanvasMove);
canvas.addEventListener('mouseleave', () => {
  hoveredStarIndex = -1;
  reliefScene.highlightStar(-1);
  ui.hideHoverLabel();
});

const ui = new UIControls(panelContainer, hoverLabel, {
  onParamChange: (key, value) => {
    reliefScene.updateParams({ [key]: value } as Partial<ReliefParams>);
  },
  onPresetSelect: (key) => {
    const stars = getPresetStars(key);
    reliefScene.setStars(stars);
    ui.setSelectedPreset(key);
  },
  onUploadClick: () => {
    hiddenFileInput.value = '';
    hiddenFileInput.click();
  },
  onSavePreset: () => {
    const params = reliefScene.getParams();
    const blob = new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stardust-preset.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  onLoadPreset: () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as Partial<ReliefParams>;
          reliefScene.updateParams(data);
          (Object.keys(data) as Array<keyof ReliefParams>).forEach(k => {
            const v = data[k];
            if (v !== undefined) ui.setParamValue(k, v);
          });
        } catch {
          alert('预设文件解析失败');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
});

hiddenFileInput.addEventListener('change', () => {
  const file = hiddenFileInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const stars: Star[] = parseStarData(reader.result as string);
      reliefScene.setStars(stars);
    } catch (e) {
      alert(e instanceof Error ? e.message : '星图数据解析失败');
    }
  };
  reader.readAsText(file);
});

function onResize(): void {
  const panelWidth = panelContainer.offsetWidth;
  const w = window.innerWidth - panelWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

const startTime = performance.now();
function animate(): void {
  requestAnimationFrame(animate);
  const elapsed = performance.now() - startTime;
  controls.update();
  reliefScene.animate(elapsed, userInteracting);
  renderer.render(scene, camera);
}

function hideLoading(): void {
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    setTimeout(() => { loadingScreen.style.display = 'none'; }, 800);
  }, 600);
}

onResize();
animate();
hideLoading();
