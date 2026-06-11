import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { InteractionManager } from './interaction';
import { UIControls } from './controls';

const app = document.getElementById('app')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000005);
scene.fog = new THREE.FogExp2(0x000005, 0.008);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 30, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000005, 1);
app.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const particleSystem = new ParticleSystem(50000);
scene.add(particleSystem.points);
scene.add(particleSystem.tempPoints);
scene.add(particleSystem.starField);

const interaction = new InteractionManager(camera, renderer.domElement, particleSystem);
const uiControls = new UIControls(app, particleSystem);

let mouseX = 0;
let mouseY = 0;

interaction.onParticleHover = (info) => {
  uiControls.showHoverInfo(info, mouseX, mouseY);
};

renderer.domElement.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const clock = new THREE.Clock();
let elapsedTime = 0;
let lastRenderTime = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  elapsedTime += deltaTime;

  interaction.update(deltaTime);
  particleSystem.update(deltaTime, elapsedTime);

  const renderStart = performance.now();
  renderer.render(scene, camera);
  lastRenderTime = performance.now() - renderStart;

  uiControls.updateStats(deltaTime, lastRenderTime);
}

animate();
