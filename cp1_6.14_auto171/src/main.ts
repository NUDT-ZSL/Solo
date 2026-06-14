import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ControlPanel, DEFAULT_PARAMS } from './control-panel';
import { AtriumBuilder } from './atrium-builder';

const app = document.getElementById('app')!;
const viewport = document.getElementById('viewport')!;

const scene = new THREE.Scene();

const bgCanvas = document.createElement('canvas');
bgCanvas.width = 2;
bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d')!;
const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
gradient.addColorStop(0, '#0f172a');
gradient.addColorStop(1, '#e2e8f0');
bgCtx.fillStyle = gradient;
bgCtx.fillRect(0, 0, 2, 512);
const bgTexture = new THREE.CanvasTexture(bgCanvas);
scene.background = bgTexture;

scene.fog = new THREE.FogExp2(0x0f172a, 0.012);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
camera.position.set(18, 14, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 8, 0);
controls.minDistance = 5;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI * 0.48;
controls.update();

const ambientLight = new THREE.AmbientLight(0x475569, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xe2e8f0, 2.0);
dirLight.position.set(15, 25, 10);
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x1e293b, 0.8);
scene.add(hemiLight);

const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.6);
fillLight.position.set(-10, 8, -10);
scene.add(fillLight);

const atriumBuilder = new AtriumBuilder(scene);
atriumBuilder.buildInitial(DEFAULT_PARAMS);

const controlPanel = new ControlPanel(
  app,
  viewport,
  (params) => {
    atriumBuilder.transitionTo(params);
    controlPanel.updateDataCards(params);
  },
  () => {
    atriumBuilder.transitionTo(DEFAULT_PARAMS);
    controlPanel.setParams(DEFAULT_PARAMS);
    controlPanel.updateDataCards(DEFAULT_PARAMS);
  }
);

function resize(): void {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener('resize', resize);
resize();

function animate(): void {
  requestAnimationFrame(animate);
  atriumBuilder.update();
  controls.update();
  renderer.render(scene, camera);
}

animate();
