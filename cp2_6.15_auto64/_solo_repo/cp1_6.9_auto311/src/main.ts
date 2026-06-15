import * as THREE from 'three';
import { Sandglass, HOULGLASS_CONFIG } from './sandglass';
import { ParticleSystem } from './particles';
import { InteractionController } from './interaction';
import * as TWEEN from '@tweenjs/tween.js';

const app = document.getElementById('app')!;

const scene = new THREE.Scene();

function createGradientBackground(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0a0f2a');
  gradient.addColorStop(0.5, '#050714');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const bgTex = createGradientBackground();
scene.background = bgTex;

scene.fog = new THREE.FogExp2(0x050714, 0.015);

const ambientLight = new THREE.AmbientLight(0x222244, 0.6);
scene.add(ambientLight);

const rimLight = new THREE.DirectionalLight(0x6688ff, 0.4);
rimLight.position.set(5, 8, 10);
scene.add(rimLight);

const warmLight = new THREE.PointLight(0xff8844, 0.8, 80, 1.5);
warmLight.position.set(0, -8, 0);
scene.add(warmLight);

const coolLight = new THREE.PointLight(0x4488ff, 0.6, 80, 1.5);
coolLight.position.set(0, 8, 0);
scene.add(coolLight);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 5, 35);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
app.appendChild(renderer.domElement);

const sandglass = new Sandglass();
scene.add(sandglass.group);

const particles = new ParticleSystem(scene, sandglass);

const interaction = new InteractionController(camera, renderer, sandglass, particles, scene);

function responsiveScale() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  let scale = 1;
  if (w <= 1440) {
    scale = 0.85;
  }
  if (w <= 1024) {
    scale = 0.7;
  }
  if (w <= 768) {
    scale = 0.55;
  }
  sandglass.group.scale.set(scale, scale, scale);
}
responsiveScale();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  responsiveScale();
});

let cycleTimer = 0;
const CYCLE_MS = HOULGLASS_CONFIG.cycleDuration;

const clock = new THREE.Clock();
const MAX_DT = 1 / 20;

function animate() {
  requestAnimationFrame(animate);
  let dt = clock.getDelta();
  if (dt > MAX_DT) dt = MAX_DT;

  cycleTimer += dt * 1000;
  if (cycleTimer >= CYCLE_MS && !sandglass.isFlipping) {
    cycleTimer = 0;
    sandglass.flip().then(() => {
      particles.onFlip();
    });
  }

  sandglass.update(dt);
  interaction.update(dt);
  particles.update(dt);
  TWEEN.update();

  renderer.render(scene, camera);
}

animate();

(window as any).__sandglass = {
  sandglass,
  particles,
  scene,
  camera,
  renderer,
  interaction,
};
