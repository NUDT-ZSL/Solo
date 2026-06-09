import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Galaxy, GalaxyPreset } from './galaxy';
import { AudioAnalyzer } from './audioAnalyzer';

const container = document.getElementById('canvas-container')!;
const fpsValue = document.getElementById('fps-value')!;
const particleCountEl = document.getElementById('particle-count')!;
const btnAudio = document.getElementById('btn-audio') as HTMLButtonElement;
const btnSpiral = document.getElementById('btn-spiral') as HTMLButtonElement;
const btnGlobular = document.getElementById('btn-globular') as HTMLButtonElement;
const btnIrregular = document.getElementById('btn-irregular') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let galaxy: Galaxy;
let audioAnalyzer: AudioAnalyzer;

const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = performance.now();

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 8, 25);
const INITIAL_TARGET = new THREE.Vector3(0, 0, 0);

function init(): void {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(INITIAL_CAMERA_POSITION);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0a1a, 1);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 100;
  controls.target.copy(INITIAL_TARGET);
  controls.update();

  audioAnalyzer = new AudioAnalyzer();
  galaxy = new Galaxy(audioAnalyzer, 20000);
  scene.add(galaxy.points);

  particleCountEl.textContent = galaxy.particleCount.toLocaleString();

  addAmbientStars();
  setupEventListeners();
  animate();
}

function addAmbientStars(): void {
  const starCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const radius = 100 + Math.random() * 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

function setupEventListeners(): void {
  window.addEventListener('resize', onWindowResize);

  btnAudio.addEventListener('click', toggleAudio);

  btnSpiral.addEventListener('click', () => setPreset('spiral'));
  btnGlobular.addEventListener('click', () => setPreset('globular'));
  btnIrregular.addEventListener('click', () => setPreset('irregular'));

  btnReset.addEventListener('click', resetCamera);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function toggleAudio(): Promise<void> {
  if (audioAnalyzer.getActive()) {
    audioAnalyzer.stop();
    btnAudio.classList.remove('active');
  } else {
    const success = await audioAnalyzer.start();
    if (success) {
      btnAudio.classList.add('active');
    }
  }
}

function setPreset(preset: GalaxyPreset): void {
  galaxy.setPreset(preset);
  updatePresetButtons(preset);
}

function updatePresetButtons(activePreset: GalaxyPreset): void {
  btnSpiral.classList.toggle('active', activePreset === 'spiral');
  btnGlobular.classList.toggle('active', activePreset === 'globular');
  btnIrregular.classList.toggle('active', activePreset === 'irregular');
}

function resetCamera(): void {
  camera.position.copy(INITIAL_CAMERA_POSITION);
  controls.target.copy(INITIAL_TARGET);
  controls.update();
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  if (audioAnalyzer.getActive()) {
    audioAnalyzer.update();
  }

  galaxy.update(deltaTime);
  controls.update();
  renderer.render(scene, camera);

  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    fpsValue.textContent = frameCount.toString();
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

init();
