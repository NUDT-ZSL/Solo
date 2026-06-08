import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CosmicEngine } from './CosmicEngine';
import { mountUI } from './UIPanel';

const canvas = document.getElementById('cosmos-canvas') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui-root') as HTMLElement;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020210, 0.004);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 200;
controls.enablePan = true;
controls.panSpeed = 0.5;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 1.0;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0x111133, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x4466aa, 1.0, 200);
pointLight.position.set(0, 20, 0);
scene.add(pointLight);

const engine = new CosmicEngine(scene);
engine.build();

const defaultCameraPos = camera.position.clone();
const defaultTarget = controls.target.clone();

const ui = mountUI(uiRoot, {
  onRoamSpeedChange: (v: number) => { engine.roamSpeed = v; },
  onSignalStrengthChange: (v: number) => { engine.signalStrength = v; },
  onStarDensityChange: (v: number) => {
    engine.starDensity = v;
    engine.rebuild();
  },
  onResetView: () => {
    camera.position.copy(defaultCameraPos);
    controls.target.copy(defaultTarget);
    controls.update();
  },
});

engine.onBodyClicked = (data) => {
  ui.selectBody(data);
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  engine.handleClick(mouse, camera);
});

let lastTime = performance.now();
let frameCount = 0;
let fps = 60;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  frameCount++;
  if (frameCount % 30 === 0) {
    fps = Math.round(1 / delta);
  }

  controls.update();
  engine.update(Math.min(delta, 0.05));
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

window.addEventListener('contextmenu', (e) => e.preventDefault());
