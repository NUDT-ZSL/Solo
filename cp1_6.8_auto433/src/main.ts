import * as THREE from 'three';
import { ParticleSystem } from './particles';
import { CameraController, bindControls } from './controls';
import { themes, applyBackground } from './colors';

const canvas = document.createElement('canvas');
document.body.prepend(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const defaultTheme = themes.lava;
applyBackground(scene, defaultTheme);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(20, 12, 20);
camera.lookAt(0, 0, 0);

const particleSystem = new ParticleSystem(scene, defaultTheme);
const cameraController = new CameraController(camera, canvas);

bindControls(particleSystem, cameraController, scene);

let clickStartPos: { x: number; y: number } | null = null;
let clickStartTime: number = 0;

canvas.addEventListener('mousedown', (e) => {
  clickStartPos = { x: e.clientX, y: e.clientY };
  clickStartTime = performance.now();
});

canvas.addEventListener('mouseup', (e) => {
  if (!clickStartPos) return;
  const dx = e.clientX - clickStartPos.x;
  const dy = e.clientY - clickStartPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const elapsed = performance.now() - clickStartTime;

  if (dist < 5 && elapsed < 300) {
    const worldPos = cameraController.getClickWorldPosition(e);
    if (worldPos) {
      particleSystem.explodeAt(worldPos);
    }
  }

  clickStartPos = null;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  cameraController.update();
  particleSystem.update(dt);
  renderer.render(scene, camera);
}

animate();
