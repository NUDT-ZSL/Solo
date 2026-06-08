import * as THREE from 'three';
import { RayEmitter } from './RayEmitter';
import { ParticleSystem } from './ParticleSystem';
import { UI } from './UI';

const app = document.getElementById('app')!;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
app.appendChild(renderer.domElement);

const rayEmitter = new RayEmitter(scene);
const particleSystem = new ParticleSystem(scene);
const ui = new UI(camera, renderer.domElement, rayEmitter, particleSystem);

const STAR_COUNT = 400;
const starGeo = new THREE.BufferGeometry();
const starPositions = new Float32Array(STAR_COUNT * 3);
const starAlphas = new Float32Array(STAR_COUNT);
const starSizes = new Float32Array(STAR_COUNT);
const starVelocities: { vx: number; vy: number; vz: number }[] = [];

for (let i = 0; i < STAR_COUNT; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 80;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
  starPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  starAlphas[i] = 0.2 + Math.random() * 0.4;
  starSizes[i] = 0.4 + Math.random() * 0.8;
  starVelocities.push({
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    vz: (Math.random() - 0.5) * 0.15,
  });
}

starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeo.setAttribute('aAlpha', new THREE.BufferAttribute(starAlphas, 1));
starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));

const starMat = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: /* glsl */ `
    attribute float aAlpha;
    attribute float aSize;
    varying float vAlpha;
    void main() {
      vAlpha = aAlpha;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (120.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 0.5, 6.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
      if (d > 1.0) discard;
      float glow = 1.0 - smoothstep(0.0, 1.0, d);
      glow = pow(glow, 2.0);
      gl_FragColor = vec4(0.85, 0.88, 1.0, glow * vAlpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

function updateStars(delta: number): void {
  const posAttr = starGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < STAR_COUNT; i++) {
    const v = starVelocities[i];
    let x = posAttr.getX(i) + v.vx * delta;
    let y = posAttr.getY(i) + v.vy * delta;
    let z = posAttr.getZ(i) + v.vz * delta;
    const bound = 40;
    if (x > bound) x -= bound * 2;
    if (x < -bound) x += bound * 2;
    if (y > bound) y -= bound * 2;
    if (y < -bound) y += bound * 2;
    if (z > bound) z -= bound * 2;
    if (z < -bound) z += bound * 2;
    posAttr.setXYZ(i, x, y, z);
  }
  posAttr.needsUpdate = true;
}

ui.onReset = () => {};

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  updateStars(delta);
  rayEmitter.update(delta);
  particleSystem.update(delta);

  renderer.render(scene, camera);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

requestAnimationFrame(() => {
  app.classList.add('visible');
});

animate();
