import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { StardustEngine } from './StardustEngine';
import { SoundSynthesizer } from './SoundSynthesizer';
import { PARTICLE_COLORS } from './ParticleUnit';
import type { ParticleUnit } from './ParticleUnit';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 15;
controls.maxDistance = 150;
controls.enablePan = false;

const ambientLight = new THREE.AmbientLight(0x111122, 0.5);
scene.add(ambientLight);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.8,
  0.6,
  0.2,
);
composer.addPass(bloomPass);

function createBackgroundStars(count: number): void {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 200 + Math.random() * 300;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
  });
  scene.add(new THREE.Points(geometry, material));
}
createBackgroundStars(2000);

const synthesizer = new SoundSynthesizer();
const engine = new StardustEngine(scene, synthesizer);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let selectedParticle: ParticleUnit | null = null;

const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedVal = document.getElementById('speed-val') as HTMLSpanElement;
const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
const densityVal = document.getElementById('density-val') as HTMLSpanElement;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const volumeVal = document.getElementById('volume-val') as HTMLSpanElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const infoCard = document.getElementById('info-card') as HTMLDivElement;
const infoColor = document.getElementById('info-color') as HTMLSpanElement;
const infoSize = document.getElementById('info-size') as HTMLSpanElement;
const infoCollapse = document.getElementById('info-collapse') as HTMLSpanElement;

speedSlider.addEventListener('input', () => {
  const val = parseFloat(speedSlider.value);
  speedVal.textContent = val.toFixed(1) + 'x';
  engine.setSpeedMultiplier(val);
});

densitySlider.addEventListener('input', () => {
  const val = parseInt(densitySlider.value, 10);
  densityVal.textContent = val.toString();
  engine.setDensity(val);
});

volumeSlider.addEventListener('input', () => {
  const val = parseFloat(volumeSlider.value);
  volumeVal.textContent = Math.round(val * 100) + '%';
  synthesizer.setVolume(val);
});

resetBtn.addEventListener('click', () => {
  camera.position.set(0, 10, 60);
  controls.target.set(0, 0, 0);
  controls.update();
});

function updateInfoCard(particle: ParticleUnit): void {
  const cfg = PARTICLE_COLORS[particle.colorGroup];
  infoColor.innerHTML = `<span class="color-swatch" style="background:${cfg.css};color:${cfg.css}"></span>${cfg.label}`;
  infoSize.textContent = particle.size.toFixed(2);
  if (particle.lastCollapseTime > 0) {
    const date = new Date(particle.lastCollapseTime);
    infoCollapse.textContent = date.toLocaleTimeString('zh-CN', { hour12: false });
  } else {
    infoCollapse.textContent = '暂无';
  }
  infoCard.classList.add('visible');
}

renderer.domElement.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const meshes = engine.getAllParticles().map(p => p.mesh);
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    const particle = engine.findParticleByMesh(hitMesh);
    if (particle) {
      selectedParticle = particle;
      engine.triggerPulse(particle);
      updateInfoCard(particle);
    }
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

let prevTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const deltaTime = Math.min((now - prevTime) / 1000, 0.1);
  prevTime = now;

  controls.update();
  engine.update(deltaTime);

  if (selectedParticle) {
    updateInfoCard(selectedParticle);
  }

  composer.render();
}

const loadingScreen = document.getElementById('loading-screen');
setTimeout(() => {
  loadingScreen?.classList.add('fade-out');
  setTimeout(() => loadingScreen?.remove(), 800);
}, 800);

animate();
