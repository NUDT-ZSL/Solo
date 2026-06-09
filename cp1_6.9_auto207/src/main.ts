import * as THREE from 'three';
import { RainbowBridge } from './bridge';
import { ParticleSystem } from './particles';
import { InteractionController } from './interaction';
import { UIController } from './ui';

const container = document.getElementById('canvas-container')!;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0014, 0.025);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 8, 28);
camera.lookAt(0, 4, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x402060, 0.6);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0xff88cc, 2.5, 80);
pointLight1.position.set(0, 15, 0);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x6688ff, 2, 80);
pointLight2.position.set(-15, 5, -10);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0xffcc66, 1.8, 80);
pointLight3.position.set(15, 5, -10);
scene.add(pointLight3);

function createBackgroundStars(): THREE.Points {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi) - 20;

    const hue = 0.65 + Math.random() * 0.35;
    const sat = 0.4 + Math.random() * 0.4;
    const light = 0.5 + Math.random() * 0.4;
    const color = new THREE.Color().setHSL(hue, sat, light);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 0.15 + Math.random() * 0.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}

const bgStars = createBackgroundStars();

const bridge = new RainbowBridge(scene);
const particles = new ParticleSystem(scene);
const interaction = new InteractionController(camera, renderer.domElement, bridge, particles);
const ui = new UIController(bridge, interaction);

let lastTime = performance.now();
function animate(currentTime: number) {
  requestAnimationFrame(animate);
  const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  bgStars.rotation.y += delta * 0.005;
  bridge.update(delta, interaction.cameraAngleY);
  particles.update(delta);
  interaction.update(delta);

  renderer.render(scene, camera);
}

animate(performance.now());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
