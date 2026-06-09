import * as THREE from 'three';
import { Nebula } from './nebula';
import { CameraControls } from './controls';
import { SupernovaManager } from './supernova';
import { computeAverageColor, updateFPS } from './utils';

const appContainer = document.getElementById('app');
if (!appContainer) {
  throw new Error('App container not found');
}

const particleCountEl = document.getElementById('particleCount');
const avgColorEl = document.getElementById('avgColor');
const supernovaPosEl = document.getElementById('supernovaPos');
const supernovaCountEl = document.getElementById('supernovaCount');

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let nebula: Nebula;
let controls: CameraControls;
let supernovaManager: SupernovaManager;
let lastTime = 0;
let lastUIUpdate = 0;
let animationId: number;

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  appContainer.appendChild(renderer.domElement);
  renderer.domElement.style.touchAction = 'none';

  nebula = new Nebula();
  scene.add(nebula.points);

  supernovaManager = new SupernovaManager();

  controls = new CameraControls(camera, renderer.domElement, scene, nebula, supernovaManager);

  controls.onSupernova(() => {
    updateUI(true);
  });

  updateUI(false);

  window.addEventListener('resize', onResize);

  animate(performance.now());
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateUI(force: boolean): void {
  if (!force && performance.now() - lastUIUpdate < 1000) return;
  lastUIUpdate = performance.now();

  if (particleCountEl) {
    particleCountEl.textContent = nebula.particleCount.toString();
  }

  if (avgColorEl) {
    const avgColor = computeAverageColor(nebula.data.colors);
    const hexColor = `#${avgColor.getHexString()}`;
    avgColorEl.style.background = hexColor;
  }

  if (supernovaCountEl) {
    supernovaCountEl.textContent = supernovaManager.count.toString();
  }

  if (supernovaPosEl) {
    if (supernovaManager.lastPosition) {
      const pos = supernovaManager.lastPosition;
      supernovaPosEl.textContent = `(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`;
    }
  }
}

function animate(time: number): void {
  animationId = requestAnimationFrame(animate);

  const deltaTime = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  updateFPS();

  controls.update();
  nebula.update(time, deltaTime);
  supernovaManager.update(time, deltaTime, scene);

  renderer.render(scene, camera);

  updateUI(false);
}

init();
