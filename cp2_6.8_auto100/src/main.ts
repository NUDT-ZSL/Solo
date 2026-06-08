import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioController, type FrequencyData } from './audioController';
import { ParticleFountain } from './particleFountain';

const STAR_COUNT = 50;
const RESET_DURATION = 1000;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let audioController: AudioController;
let particleFountain: ParticleFountain;
let starField: THREE.Points;
let starGeometry: THREE.BufferGeometry;

const initialCameraPosition = new THREE.Vector3(0, 2, 10);
const initialCameraTarget = new THREE.Vector3(0, 0, 0);

let isResetting = false;
let resetStart = 0;
const resetFromPos = new THREE.Vector3();
const resetFromTarget = new THREE.Vector3();

const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const playIcon = document.getElementById('play-icon') as SVGSVGElement;
const pauseIcon = document.getElementById('pause-icon') as SVGSVGElement;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const volumeValue = document.getElementById('volume-value') as HTMLSpanElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const fileNameDisplay = document.getElementById('file-name') as HTMLDivElement;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function init(): void {
  const container = document.getElementById('canvas-container') as HTMLDivElement;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0F0F23, 0.02);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(initialCameraPosition);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.target.copy(initialCameraTarget);
  controls.minDistance = 3;
  controls.maxDistance = 30;
  controls.update();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0x8B5CF6, 1, 30);
  pointLight.position.set(5, 5, 5);
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0x00D4FF, 0.8, 30);
  pointLight2.position.set(-5, 3, -5);
  scene.add(pointLight2);

  createStarField();

  particleFountain = new ParticleFountain(scene);

  audioController = new AudioController();
  audioController.setVolume(parseInt(volumeSlider.value, 10));

  bindEvents();

  animate();
}

function createStarField(): void {
  starGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 20 + Math.random() * 10;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.03,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false
  });

  starField = new THREE.Points(starGeometry, starMaterial);
  scene.add(starField);
}

function bindEvents(): void {
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      await audioController.loadFile(file);
      fileNameDisplay.textContent = file.name;
      fileNameDisplay.classList.add('has-file');
      playBtn.disabled = false;
      audioController.play();
      updatePlayButtonState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '文件加载失败';
      fileNameDisplay.textContent = msg;
      fileNameDisplay.classList.remove('has-file');
      playBtn.disabled = true;
    }
  });

  playBtn.addEventListener('click', () => {
    if (!audioController.hasAudio) return;

    if (audioController.isPlaying) {
      audioController.pause();
    } else {
      audioController.play();
    }
    updatePlayButtonState();
  });

  volumeSlider.addEventListener('input', () => {
    const val = parseInt(volumeSlider.value, 10);
    volumeValue.textContent = `${val}%`;
    audioController.setVolume(val);
  });

  resetBtn.addEventListener('click', () => {
    if (isResetting) return;
    isResetting = true;
    resetStart = performance.now();
    resetFromPos.copy(camera.position);
    resetFromTarget.copy(controls.target);
  });

  window.addEventListener('resize', onResize);
}

function updatePlayButtonState(): void {
  if (audioController.isPlaying) {
    playBtn.classList.remove('paused');
    playBtn.classList.add('playing');
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
  } else {
    playBtn.classList.remove('playing');
    playBtn.classList.add('paused');
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

const clock = new THREE.Clock();
let elapsedTime = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  elapsedTime += delta;

  if (isResetting) {
    const t = Math.min(1, (performance.now() - resetStart) / RESET_DURATION);
    const eased = easeOutCubic(t);

    camera.position.lerpVectors(resetFromPos, initialCameraPosition, eased);
    controls.target.lerpVectors(resetFromTarget, initialCameraTarget, eased);

    if (t >= 1) {
      isResetting = false;
      camera.position.copy(initialCameraPosition);
      controls.target.copy(initialCameraTarget);
    }
  }

  controls.update();

  starField.rotation.y = elapsedTime * 0.02;
  const starPhase = elapsedTime * 0.5;
  let twinkleSum = 0;
  for (let i = 0; i < STAR_COUNT; i++) {
    const phase = starPhase + i * 0.3;
    twinkleSum += Math.sin(phase * Math.PI * 2 / 4);
  }
  const avgTwinkle = 0.5 + 0.5 * (twinkleSum / STAR_COUNT);
  (starField.material as THREE.PointsMaterial).opacity = 0.5 + avgTwinkle * 0.3;

  let freq: FrequencyData;
  if (audioController.hasAudio && audioController.isPlaying) {
    freq = audioController.getFrequencyData();
  } else {
    freq = { low: 0, mid: 0, high: 0, volume: 0 };
  }

  particleFountain.update(freq, delta);

  renderer.render(scene, camera);
}

init();
