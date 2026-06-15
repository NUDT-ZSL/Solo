import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ControlPanel, DEFAULT_PARAMS } from './control-panel';
import { AtriumBuilder } from './atrium-builder';

const app = document.getElementById('app')!;
const viewport = document.getElementById('viewport')!;

viewport.style.background = 'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)';

const scene = new THREE.Scene();

function createSkyDome(scene: THREE.Scene): void {
  const skyGeo = new THREE.SphereGeometry(120, 32, 16);
  const topColor = new THREE.Color(0x0f172a);
  const bottomColor = new THREE.Color(0xe2e8f0);

  const positions = skyGeo.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const radius = skyGeo.parameters.radius;
    const t = (y / radius + 1) / 2;
    const color = new THREE.Color().lerpColors(bottomColor, topColor, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: topColor },
      bottomColor: { value: bottomColor },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
        vec3 color = mix(bottomColor, topColor, smoothstep(0.0, 1.0, t));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'skyDome';
  scene.add(sky);
}

createSkyDome(scene);

scene.fog = new THREE.FogExp2(0x0f172a, 0.008);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
camera.position.set(18, 14, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

function createEnvironmentMap(renderer: THREE.WebGLRenderer): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.4, '#1e3a5f');
  grad.addColorStop(0.7, '#60a5fa');
  grad.addColorStop(0.85, '#93c5fd');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  texture.dispose();
  pmremGenerator.dispose();

  return envMap;
}

const envMap = createEnvironmentMap(renderer);
scene.environment = envMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 8, 0);
controls.minDistance = 5;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI * 0.48;
controls.update();

const ambientLight = new THREE.AmbientLight(0x475569, 1.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xe2e8f0, 2.0);
dirLight.position.set(15, 25, 10);
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x1e293b, 0.8);
scene.add(hemiLight);

const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.6);
fillLight.position.set(-10, 8, -10);
scene.add(fillLight);

const atriumBuilder = new AtriumBuilder(scene);
atriumBuilder.buildInitial(DEFAULT_PARAMS);

const controlPanel = new ControlPanel(
  app,
  viewport,
  (params) => {
    atriumBuilder.transitionTo(params);
    controlPanel.updateDataCards(params);
  },
  () => {
    atriumBuilder.transitionTo(DEFAULT_PARAMS);
    controlPanel.setParams(DEFAULT_PARAMS);
    controlPanel.updateDataCards(DEFAULT_PARAMS);
  }
);

function resize(): void {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener('resize', resize);
resize();

function animate(): void {
  requestAnimationFrame(animate);
  atriumBuilder.update();
  controls.update();
  renderer.render(scene, camera);
}

animate();
