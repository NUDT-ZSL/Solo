import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WorkerManager from './worker-manager';
import AudioCapture from './audio-capture';
import WaveSurface from './wave-surface';

const container = document.getElementById('canvas-container')!;
const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
const freqRangeSelect = document.getElementById('freq-range') as HTMLSelectElement;
const fpsDisplay = document.getElementById('fps-display')!;
const volumeBar = document.getElementById('volume-bar')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0f0f2a');
scene.fog = new THREE.FogExp2('#0f0f2a', 0.02);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 10, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight('#4466aa', 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight('#ffffff', 1.0);
directionalLight.position.set(10, 15, 10);
scene.add(directionalLight);

const pointLight1 = new THREE.PointLight('#7c3aed', 1.5, 30);
pointLight1.position.set(-8, 5, -8);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight('#1e3a8a', 1.2, 30);
pointLight2.position.set(8, 5, 8);
scene.add(pointLight2);

const gridHelper = new THREE.GridHelper(20, 20, '#1a1a3e', '#1a1a3e');
gridHelper.position.y = -2.5;
scene.add(gridHelper);

const workerManager = new WorkerManager();
const audioCapture = new AudioCapture(workerManager);
const waveSurface = new WaveSurface();
scene.add(waveSurface.getMesh());

let latestFrequencyData = new Uint8Array(32);
let currentVolume = 0;

audioCapture.onAudioData((bands, volume) => {
  latestFrequencyData = bands;
  currentVolume = volume;
});

toggleBtn.addEventListener('click', async () => {
  if (audioCapture.isCapturing()) {
    audioCapture.stop();
    toggleBtn.textContent = 'Start';
    toggleBtn.classList.remove('active');
  } else {
    try {
      await audioCapture.start();
      toggleBtn.textContent = 'Stop';
      toggleBtn.classList.add('active');
    } catch {
      toggleBtn.textContent = 'Start';
      toggleBtn.classList.remove('active');
    }
  }
});

freqRangeSelect.addEventListener('change', () => {
  const range = freqRangeSelect.value;
  audioCapture.setFrequencyRange(range);
});

let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;
let lastFrameTime = performance.now();

function updateFps(): void {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsTime = now;

    let color: string;
    if (currentFps > 45) {
      color = '#22c55e';
    } else if (currentFps >= 30) {
      color = '#eab308';
    } else {
      color = '#ef4444';
    }
    fpsDisplay.textContent = `FPS: ${currentFps}`;
    fpsDisplay.style.color = color;
  }
}

function updateVolumeBar(): void {
  const percent = Math.min(100, currentVolume * 100);
  volumeBar.style.width = `${percent}%`;
}

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const deltaTime = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  waveSurface.update(latestFrequencyData, deltaTime);

  pointLight1.position.x = Math.sin(now * 0.001) * 10;
  pointLight1.position.z = Math.cos(now * 0.001) * 10;
  pointLight2.position.x = Math.cos(now * 0.0008) * 10;
  pointLight2.position.z = Math.sin(now * 0.0008) * 10;

  controls.update();
  renderer.render(scene, camera);

  updateFps();
  updateVolumeBar();
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('beforeunload', () => {
  audioCapture.destroy();
  workerManager.destroy();
  waveSurface.dispose();
  renderer.dispose();
});
