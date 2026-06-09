import * as THREE from 'three';
import { NebulaSystem } from './nebula';
import { StageSystem } from './stage';
import { CollisionSystem } from './collisions';
import { CameraControls } from './controls';

const app = document.getElementById('app') as HTMLDivElement;
if (!app) throw new Error('App container not found');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 80, 150);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0a0a1a, 1);
app.appendChild(renderer.domElement);

const nebula = new NebulaSystem(scene);
const stage = new StageSystem(scene, renderer.domElement, camera);
const collision = new CollisionSystem(scene);
const controls = new CameraControls(camera, renderer.domElement);

const starGeometry = new THREE.BufferGeometry();
const starCount = 400;
const starPositions = new Float32Array(starCount * 3);
const starAlphas = new Float32Array(starCount);
for (let i = 0; i < starCount; i++) {
  const r = 800 + Math.random() * 600;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3 + 2] = r * Math.cos(phi);
  starAlphas[i] = 0.3 + Math.random() * 0.3;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(starAlphas, 1));

const starMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }
  },
  vertexShader: `
    attribute float aAlpha;
    varying float vAlpha;
    uniform float uTime;
    void main() {
      vAlpha = aAlpha * (0.6 + 0.4 * sin(uTime * 0.8 + aAlpha * 12.566));
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = max(1.0, 2.0 / -mv.z * 200.0);
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.1, d) * vAlpha;
      gl_FragColor = vec4(1.0, 0.98, 0.95, a);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

let lastTime = performance.now();
let animTime = 0;

function animate() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  animTime += dt;

  controls.update();
  nebula.update(animTime, dt);
  stage.update(animTime, dt);
  collision.detectAndResolve(nebula, stage, animTime, dt);

  (starMaterial.uniforms.uTime as THREE.IUniform<number>).value = animTime;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
