import * as THREE from 'three';
import {
  generateProteinStructure,
  getParticleColor,
  type Residue,
  type ProteinStructure,
} from './proteinModel';
import {
  setupInteraction,
  setupEventListeners,
  applyAutoRotate,
  animateCameraReset,
  createMeasurement,
  removeMeasurement,
  setInitialCameraPosition,
  type InteractionState,
  type Measurement,
} from './interaction';

const PARTICLE_COUNT = 3000;
const PARTICLE_MIN_DIST = 13;
const PARTICLE_MAX_DIST = 23;
const PARTICLE_MIN_SIZE = 3;
const PARTICLE_MAX_SIZE = 6;
const PARTICLE_MIN_ALPHA = 0.2;
const PARTICLE_MAX_ALPHA = 0.4;
const PULSE_PERIOD = 2000;
const PULSE_MIN_SCALE = 1.0;
const PULSE_MAX_SCALE = 1.2;

interface ParticleData {
  baseSize: number;
  phase: number;
  residueIndex: number;
  offset: THREE.Vector3;
}

let particleData: ParticleData[] = [];
let particleSystem: THREE.Points | null = null;
let currentMeasurement: Measurement | null = null;

function createParticleCloud(
  residues: Residue[],
  proteinGroup: THREE.Group
): THREE.Points {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const alphas = new Float32Array(PARTICLE_COUNT);

  particleData = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const residueIndex = Math.floor(Math.random() * residues.length);
    const residue = residues[residueIndex];
    const particleColor = getParticleColor(residue.type);
    const colorObj = new THREE.Color(particleColor);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = PARTICLE_MIN_DIST + Math.random() * (PARTICLE_MAX_DIST - PARTICLE_MIN_DIST);

    const ox = radius * Math.sin(phi) * Math.cos(theta);
    const oy = radius * Math.sin(phi) * Math.sin(theta);
    const oz = radius * Math.cos(phi);

    const offset = new THREE.Vector3(ox, oy, oz);
    const worldPos = new THREE.Vector3().copy(residue.position).add(offset);

    positions[i * 3] = worldPos.x;
    positions[i * 3 + 1] = worldPos.y;
    positions[i * 3 + 2] = worldPos.z;

    colors[i * 3] = colorObj.r;
    colors[i * 3 + 1] = colorObj.g;
    colors[i * 3 + 2] = colorObj.b;

    const size = PARTICLE_MIN_SIZE + Math.random() * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE);
    sizes[i] = size;

    alphas[i] = PARTICLE_MIN_ALPHA + Math.random() * (PARTICLE_MAX_ALPHA - PARTICLE_MIN_ALPHA);

    particleData.push({
      baseSize: size,
      phase: Math.random() * Math.PI * 2,
      residueIndex,
      offset,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPointMultiplier: { value: 1.0 },
    },
    vertexShader: `
      attribute float size;
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        if (dist > 0.5) discard;
        float alpha = vAlpha * smoothstep(0.5, 0.0, dist);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  const points = new THREE.Points(geometry, material);
  proteinGroup.add(points);
  return points;
}

function updateParticleCloud(residues: Residue[], time: number, proteinGroup: THREE.Group): void {
  if (!particleSystem) return;

  const geometry = particleSystem.geometry;
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const sizes = geometry.getAttribute('size') as THREE.BufferAttribute;
  const posArray = positions.array as Float32Array;
  const sizeArray = sizes.array as Float32Array;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const data = particleData[i];
    const residue = residues[data.residueIndex];

    const worldPos = new THREE.Vector3().copy(residue.position).add(data.offset);
    posArray[i * 3] = worldPos.x;
    posArray[i * 3 + 1] = worldPos.y;
    posArray[i * 3 + 2] = worldPos.z;

    const pulsePhase = (time / PULSE_PERIOD) * Math.PI * 2 + data.phase;
    const pulse = PULSE_MIN_SCALE + ((PULSE_MAX_SCALE - PULSE_MIN_SCALE) * (1 + Math.sin(pulsePhase))) / 2;
    sizeArray[i] = data.baseSize * pulse;
  }

  positions.needsUpdate = true;
  sizes.needsUpdate = true;
}

function createLighting(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 80, 50);
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
  fillLight.position.set(-50, -30, -50);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0x00ffff, 0.6, 200);
  rimLight.position.set(-60, 40, 60);
  scene.add(rimLight);

  const bottomLight = new THREE.PointLight(0xff6b35, 0.3, 150);
  bottomLight.position.set(0, -60, 0);
  scene.add(bottomLight);
}

function createBackground(scene: THREE.Scene): void {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  const geometry = new THREE.SphereGeometry(500, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(geometry, material);
  scene.add(sky);
}

function handleHoverChange(residue: Residue | null): void {
  // Placeholder for additional hover side effects if needed
}

function handleMeasurement(
  from: Residue,
  to: Residue,
  scene: THREE.Scene
): Measurement | null {
  if (currentMeasurement) {
    removeMeasurement(currentMeasurement, scene);
  }
  currentMeasurement = createMeasurement(from, to, scene);
  return currentMeasurement;
}

function handleClearMeasurement(scene: THREE.Scene): void {
  if (currentMeasurement) {
    removeMeasurement(currentMeasurement, scene);
    currentMeasurement = null;
  }
}

function init(): void {
  const canvasContainer = document.getElementById('canvas-container');
  const labelContainer = document.getElementById('label-container');
  const resetBtn = document.getElementById('reset-btn');

  if (!canvasContainer || !labelContainer) {
    console.error('Required container elements not found');
    return;
  }

  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  canvasContainer.appendChild(renderer.domElement);

  createBackground(scene);
  createLighting(scene);

  const protein: ProteinStructure = generateProteinStructure();
  scene.add(protein.group);

  particleSystem = createParticleCloud(protein.residues, protein.group);

  const state: InteractionState = setupInteraction(
    camera,
    renderer.domElement,
    canvasContainer,
    labelContainer
  );

  const listeners = setupEventListeners(
    state,
    renderer.domElement,
    camera,
    protein.residues,
    scene,
    protein.group,
    handleHoverChange,
    (from, to) => handleMeasurement(from, to, scene),
    () => handleClearMeasurement(scene)
  );

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      animateCameraReset(camera, state.controls, 500);
    });
  }

  window.addEventListener('resize', () => {
    const newWidth = canvasContainer.clientWidth;
    const newHeight = canvasContainer.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
    state.labelRenderer.setSize(newWidth, newHeight);
  });

  const clock = new THREE.Clock();

  function animate(): void {
    requestAnimationFrame(animate);
    const elapsedTime = performance.now();
    const deltaTime = clock.getDelta();

    applyAutoRotate(state, protein.group, deltaTime);
    state.controls.update();
    updateParticleCloud(protein.residues, elapsedTime, protein.group);

    renderer.render(scene, camera);
    state.labelRenderer.render(scene, camera);
  }

  animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
