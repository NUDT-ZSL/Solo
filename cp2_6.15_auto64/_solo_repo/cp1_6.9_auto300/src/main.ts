import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Bamboo, type Shockwave } from './bamboo';
import { Wind } from './wind';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let bamboos: Bamboo[] = [];
let wind: Wind;
let dynamicLight: THREE.PointLight;
let stardust: THREE.Points;
let shockwaves: Shockwave[] = [];
let clock: THREE.Clock;
let mouseNDC: THREE.Vector2 = new THREE.Vector2(0, 0);
let lightTargetPos: THREE.Vector3 = new THREE.Vector3(0, 30, 0);
let container: HTMLElement;
let customCursor: HTMLElement;
let shockwaveEl: HTMLElement;
let shockwaveAnimFrame: number = 0;
const BAMBOO_COUNT = 20;
const STARDUST_COUNT = 200;

function init(): void {
  container = document.getElementById('canvas-container')!;
  customCursor = document.getElementById('custom-cursor')!;
  shockwaveEl = document.getElementById('shockwave')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

  const aspect = window.innerWidth / window.innerHeight;
  const fov = calculateFOV(window.innerWidth);
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 2000);
  camera.position.set(0, 50, 100);
  camera.lookAt(0, 30, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.minDistance = 40;
  controls.maxDistance = 250;
  controls.target.set(0, 30, 0);
  controls.autoRotate = false;

  const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambientLight);

  dynamicLight = new THREE.PointLight(0xffeedd, 1.0, 300, 1.5);
  dynamicLight.position.set(0, 30, 0);
  scene.add(dynamicLight);

  const hemiLight = new THREE.HemisphereLight(0x88aa88, 0x1a1a2e, 0.35);
  scene.add(hemiLight);

  wind = new Wind();
  createBamboos();
  createStardust();
  clock = new THREE.Clock();

  setupEventListeners();
  animate();
}

function calculateFOV(width: number): number {
  const t = THREE.MathUtils.clamp((width - 768) / (1920 - 768), 0, 1);
  return THREE.MathUtils.lerp(45, 60, t);
}

function createBamboos(): void {
  const radius = 50;
  const minDist = 8;
  const positions: THREE.Vector3[] = [];

  let attempts = 0;
  while (positions.length < BAMBOO_COUNT && attempts < BAMBOO_COUNT * 50) {
    attempts++;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;

    let valid = true;
    for (const pos of positions) {
      const dx = pos.x - x;
      const dz = pos.z - z;
      if (Math.sqrt(dx * dx + dz * dz) < minDist) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    positions.push(new THREE.Vector3(x, 0, z));
  }

  for (let i = 0; i < positions.length; i++) {
    const height = 45 + Math.random() * 30;
    const bamboo = new Bamboo(positions[i], height, i);
    bamboos.push(bamboo);
    scene.add(bamboo.mesh);
  }
}

function createStardust(): void {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STARDUST_COUNT * 3);
  const colors = new Float32Array(STARDUST_COUNT * 3);
  const sizes = new Float32Array(STARDUST_COUNT);
  const velocities: THREE.Vector3[] = [];

  for (let i = 0; i < STARDUST_COUNT; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = 10 + Math.random() * 80;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const blueShade = 0.6 + Math.random() * 0.4;
    colors[i * 3] = 0.5 + Math.random() * 0.2;
    colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
    colors[i * 3 + 2] = blueShade;

    sizes[i] = 1 + Math.random() * 2;

    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.1
    ));
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false
  });

  stardust = new THREE.Points(geometry, material);
  (stardust.geometry as any).velocities = velocities;
  scene.add(stardust);
}

function setupEventListeners(): void {
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);
  document.addEventListener('pointermove', onPointerMove);
}

function onWindowResize(): void {
  const fov = calculateFOV(window.innerWidth);
  camera.fov = fov;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event: MouseEvent): void {
  mouseNDC.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(event.clientY / window.innerHeight) * 2 + 1;
  customCursor.style.left = event.clientX + 'px';
  customCursor.style.top = event.clientY + 'px';
  customCursor.style.display = 'block';

  lightTargetPos.x = mouseNDC.x * 50;
  lightTargetPos.z = mouseNDC.y * 50;
  lightTargetPos.y = 30 + Math.sin(Date.now() * 0.0005) * 10;
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') {
    customCursor.style.display = 'none';
  }
}

function onClick(event: MouseEvent): void {
  wind.updateMouse(mouseNDC.x, mouseNDC.y, camera);
  const center = wind.mouseWorld.clone();
  center.y = 30;

  shockwaves.push({
    center: center,
    radius: 0,
    maxRadius: 80,
    strength: 1,
    progress: 0,
    duration: 1.5,
    elapsed: 0
  });

  playShockwaveVisual(event.clientX, event.clientY);
}

function playShockwaveVisual(x: number, y: number): void {
  if (shockwaveAnimFrame) {
    cancelAnimationFrame(shockwaveAnimFrame);
  }

  const duration = 600;
  const maxSize = 120;
  const startTime = performance.now();

  shockwaveEl.style.left = x + 'px';
  shockwaveEl.style.top = y + 'px';
  shockwaveEl.style.width = '0px';
  shockwaveEl.style.height = '0px';
  shockwaveEl.style.opacity = '1';
  shockwaveEl.style.border = '2px solid rgba(255, 215, 0, 0.9)';

  function animate_() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const size = t * maxSize;
    const opacity = 1 - t;

    shockwaveEl.style.width = size + 'px';
    shockwaveEl.style.height = size + 'px';
    shockwaveEl.style.opacity = String(opacity);
    const borderAlpha = 0.9 * (1 - t);
    shockwaveEl.style.border = `2px solid rgba(255, 215, 0, ${borderAlpha})`;

    if (t < 1) {
      shockwaveAnimFrame = requestAnimationFrame(animate_);
    } else {
      shockwaveEl.style.opacity = '0';
    }
  }

  shockwaveAnimFrame = requestAnimationFrame(animate_);
}

function updateLight(deltaTime: number): void {
  dynamicLight.position.lerp(lightTargetPos, Math.min(deltaTime * 0.8, 1));

  const lightPhase = (Date.now() * 0.0003) % 1;
  const warmColor = new THREE.Color(0xffcc88);
  const coolColor = new THREE.Color(0xeeefff);
  const colorBlend = (Math.sin(lightPhase * Math.PI * 2) + 1) / 2;

  const currentColor = warmColor.clone().lerp(coolColor, colorBlend);
  dynamicLight.color.copy(currentColor);
  dynamicLight.intensity = 0.8 + 0.4 * ((Math.sin(Date.now() * 0.0007) + 1) / 2);
}

function updateStardust(deltaTime: number): void {
  const positions = stardust.geometry.attributes.position.array as Float32Array;
  const velocities = (stardust.geometry as any).velocities as THREE.Vector3[];

  for (let i = 0; i < STARDUST_COUNT; i++) {
    positions[i * 3] += velocities[i].x * deltaTime * 10;
    positions[i * 3 + 1] += velocities[i].y * deltaTime * 10;
    positions[i * 3 + 2] += velocities[i].z * deltaTime * 10;

    if (Math.abs(positions[i * 3]) > 200) velocities[i].x *= -1;
    if (positions[i * 3 + 1] > 100 || positions[i * 3 + 1] < 0) velocities[i].y *= -1;
    if (Math.abs(positions[i * 3 + 2]) > 200) velocities[i].z *= -1;
  }

  stardust.geometry.attributes.position.needsUpdate = true;
  stardust.rotation.y += deltaTime * 0.01;
}

function updateShockwaves(deltaTime: number): void {
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.elapsed += deltaTime;
    sw.progress = sw.elapsed / sw.duration;
    sw.radius = sw.progress * sw.maxRadius;

    if (sw.progress >= 1) {
      shockwaves.splice(i, 1);
    }
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);

  controls.update();

  wind.updateMouse(mouseNDC.x, mouseNDC.y, camera);
  wind.update(deltaTime, bamboos);

  updateLight(deltaTime);
  updateShockwaves(deltaTime);
  updateStardust(deltaTime);

  const lightDir = new THREE.Vector3()
    .subVectors(dynamicLight.position, new THREE.Vector3(0, 30, 0))
    .normalize();

  for (const bamboo of bamboos) {
    bamboo.update(deltaTime, lightDir, shockwaves);
  }

  renderer.render(scene, camera);
}

init();
