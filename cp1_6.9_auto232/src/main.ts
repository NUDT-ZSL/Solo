import * as THREE from 'three';
import { AshParticleSystem } from './particles';
import { LavaCaveScene } from './scene';
import { InteractionManager } from './interaction';

const canvasContainer = document.getElementById('canvas-container');
if (!canvasContainer) {
  throw new Error('Canvas container not found');
}

const fpsCounter = document.getElementById('fps-counter');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0303, 0.035);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x080202, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasContainer.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x221010, 0.4);
scene.add(ambientLight);

const lavaGlowLight = new THREE.PointLight(0xff5520, 2.5, 35, 1.8);
lavaGlowLight.position.set(0, -2.5, 0);
scene.add(lavaGlowLight);

const rimLight = new THREE.DirectionalLight(0x442266, 0.35);
rimLight.position.set(0, 10, 5);
scene.add(rimLight);

const particleSystem = new AshParticleSystem(scene);
const caveScene = new LavaCaveScene(scene, particleSystem);
const interaction = new InteractionManager(camera, renderer, caveScene);

interaction.setOnCrystalClick((mesh: THREE.Mesh, elapsed: number) => {
  caveScene.triggerCrystalPulse(mesh, elapsed);
});

const clock = new THREE.Clock();
let elapsed = 0;

let frames = 0;
let lastFpsUpdate = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  elapsed += delta;

  interaction.update(delta);
  caveScene.update(delta, elapsed);
  particleSystem.update(delta, elapsed);

  const lightPulse = 0.9 + 0.1 * Math.sin(elapsed * 1.5);
  lavaGlowLight.intensity = 2.5 * lightPulse;
  const lightOffset = 1.2;
  lavaGlowLight.position.x = Math.cos(elapsed * 0.3) * lightOffset;
  lavaGlowLight.position.z = Math.sin(elapsed * 0.3) * lightOffset;

  renderer.render(scene, camera);

  frames++;
  const now = performance.now();
  const frameDelta = now - lastFpsUpdate;
  if (frameDelta >= 500) {
    const fps = (frames * 1000) / frameDelta;
    if (fpsCounter) {
      fpsCounter.textContent = `FPS: ${fps.toFixed(0)}`;
      fpsCounter.style.color = fps >= 50 ? '#7fff7f' : fps >= 30 ? '#ffdd44' : '#ff5555';
    }
    frames = 0;
    lastFpsUpdate = now;
  }
}

animate();

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

window.addEventListener('resize', onResize);

let invisibleTime = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    invisibleTime = performance.now();
  } else {
    const diff = (performance.now() - invisibleTime) / 1000;
    if (diff > 1) {
      clock.start();
      elapsed += diff;
    }
  }
});

window.addEventListener('beforeunload', () => {
  interaction.dispose();
  renderer.dispose();
});
