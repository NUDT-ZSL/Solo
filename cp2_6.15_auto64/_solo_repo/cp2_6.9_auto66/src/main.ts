import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OceanScene, OceanSceneConfig, ParticleInfo } from './OceanScene';
import { LayerType } from './ParticleSystem';

const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
const infoCard = document.getElementById('info-card') as HTMLDivElement;
const infoName = document.getElementById('info-name') as HTMLDivElement;
const infoDepth = document.getElementById('info-depth') as HTMLSpanElement;
const infoCoord = document.getElementById('info-coord') as HTMLSpanElement;
const infoCount = document.getElementById('info-count') as HTMLSpanElement;
const infoLayer = document.getElementById('info-layer') as HTMLSpanElement;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
const toggleBtns = document.querySelectorAll('.toggle-btn') as NodeListOf<HTMLButtonElement>;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(30, -10, 40);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0a0a0f, 1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 150;
controls.target.set(0, -15, 0);
controls.update();

const config: OceanSceneConfig = {
  shallowCount: 800,
  midCount: 600,
  deepCount: 400,
  boundsX: 20,
  boundsZ: 20,
  minDepth: -30,
  maxDepth: 0,
};

const oceanScene = new OceanScene(scene, camera, renderer, config);

function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleResize);

speedSlider.addEventListener('input', (e: Event) => {
  const target = e.target as HTMLInputElement;
  const speed = parseFloat(target.value);
  oceanScene.setSpeedMultiplier(speed);
  speedValue.textContent = `${speed.toFixed(1)}x`;
});

toggleBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const layer = btn.dataset.layer as LayerType;
    const isActive = btn.classList.toggle('active');
    oceanScene.setLayerVisibility(layer, isActive);
  });
});

function handleClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const info: ParticleInfo | null = oceanScene.handleClick(e.clientX, e.clientY, rect);

  if (info) {
    showInfoCard(info);
  } else {
    hideInfoCard();
  }
}

canvas.addEventListener('click', handleClick);

function showInfoCard(info: ParticleInfo): void {
  infoName.textContent = info.name;
  infoDepth.textContent = info.depthRange;
  infoCoord.textContent = `(${info.position.x.toFixed(2)}, ${info.position.y.toFixed(2)}, ${info.position.z.toFixed(2)})`;
  infoCount.textContent = info.count.toString();
  infoLayer.textContent = getLayerChineseName(info.layer);

  infoCard.classList.add('visible');
}

function hideInfoCard(): void {
  infoCard.classList.remove('visible');
}

function getLayerChineseName(layer: LayerType): string {
  switch (layer) {
    case 'shallow':
      return '浅层';
    case 'mid':
      return '中层';
    case 'deep':
      return '深层';
    default:
      return '-';
  }
}

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  controls.update();
  oceanScene.update(delta);
  renderer.render(scene, camera);
}

animate();
