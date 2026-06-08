import * as THREE from 'three';
import { TidalNetwork } from './tidalNetwork';
import { InteractionManager } from './interaction';
import { createControlPanel } from './ui';
import './style.css';

const DEFAULT_PARTICLE_COUNT = 1500;
const DEFAULT_TIDAL_SPEED = 1.0;
const DEFAULT_CONNECTION_DISTANCE = 5;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020a1a, 0.008);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 22, 38);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0x1a3a5c, 0.3);
scene.add(ambientLight);

const network = new TidalNetwork(scene, {
  particleCount: DEFAULT_PARTICLE_COUNT,
  tidalSpeed: DEFAULT_TIDAL_SPEED,
  connectionDistance: DEFAULT_CONNECTION_DISTANCE,
});

const interaction = new InteractionManager(camera, canvas, network);

createControlPanel({
  particleCount: DEFAULT_PARTICLE_COUNT,
  tidalSpeed: DEFAULT_TIDAL_SPEED,
  connectionDistance: DEFAULT_CONNECTION_DISTANCE,
  onParticleCountChange: (v) => network.setParticleCount(v),
  onTidalSpeedChange: (v) => network.setTidalSpeed(v),
  onConnectionDistanceChange: (v) => network.setConnectionDistance(v),
  onReset: () => {
    network.resetLayout();
  },
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  interaction.update(delta);
  network.update(delta);

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
