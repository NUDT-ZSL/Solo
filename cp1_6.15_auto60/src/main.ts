import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initParticles, updateParticles, getCurrentThemeName, getCurrentCount, ParticleConfig } from './particleSystem';
import { initUI, UIConfig } from './uiController';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;
let currentConfig: ParticleConfig;
let lastMouseX = 0;
let lastMouseY = 0;
let parallaxTime = 0;

function init(): void {
  const app = document.getElementById('app')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);
  scene.fog = new THREE.FogExp2(0x050510, 0.015);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 6);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  app.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 20;
  controls.enablePan = false;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  clock = new THREE.Clock();

  const uiConfig = initUI(handleUIChange, handleScreenshot);
  currentConfig = {
    count: uiConfig.particleCount,
    radius: uiConfig.spreadRadius,
    theme: uiConfig.colorTheme,
    rotationSpeed: uiConfig.rotationSpeed
  };

  initParticles(scene, currentConfig);

  setupStarfield();

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('mousemove', onMouseMove);

  animate();
}

function setupStarfield(): void {
  const starCount = 500;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const radius = 50 + Math.random() * 50;
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

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

function handleUIChange(uiConfig: UIConfig): void {
  currentConfig = {
    count: uiConfig.particleCount,
    radius: uiConfig.spreadRadius,
    theme: uiConfig.colorTheme,
    rotationSpeed: uiConfig.rotationSpeed
  };
}

function handleScreenshot(): void {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  const themeName = getCurrentThemeName();
  link.download = `nebula_${themeName}_${getCurrentCount()}.png`;
  link.href = dataURL;
  link.click();
}

function onMouseMove(event: MouseEvent): void {
  lastMouseX = (event.clientX / window.innerWidth) * 2 - 1;
  lastMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  updateParticles(currentConfig, deltaTime);

  parallaxTime += deltaTime;

  controls.update();

  renderer.render(scene, camera);
}

init();
