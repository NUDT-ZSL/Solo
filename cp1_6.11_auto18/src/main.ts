import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextTransformer, TransformResult } from './transformer';
import { StarSystem } from './starsystem';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let starSystem: StarSystem;
let containerEl: HTMLElement;
let inputCardEl: HTMLElement | null;
let textInputEl: HTMLTextAreaElement;
let counterEl: HTMLElement;
let transformBtnEl: HTMLButtonElement;
let speedSliderEl: HTMLInputElement;
let speedValueEl: HTMLElement;
let statStarsEl: HTMLElement;
let statClustersEl: HTMLElement;
let statFpsEl: HTMLElement;

const MIN_TEXT_LEN = 50;
const MAX_TEXT_LEN = 200;

let lastFrameTime = 0;
let fpsAccumulator = 0;
let fpsFrames = 0;
let fpsTimer = 0;
let currentTransform: TransformResult | null = null;

function init(): void {
  containerEl = document.getElementById('canvas-container')!;
  inputCardEl = document.getElementById('input-card');
  textInputEl = document.getElementById('text-input') as HTMLTextAreaElement;
  counterEl = document.getElementById('counter') as HTMLElement;
  transformBtnEl = document.getElementById('transform-btn') as HTMLButtonElement;
  speedSliderEl = document.getElementById('speed-slider') as HTMLInputElement;
  speedValueEl = document.getElementById('speed-value') as HTMLElement;
  statStarsEl = document.getElementById('stat-stars') as HTMLElement;
  statClustersEl = document.getElementById('stat-clusters') as HTMLElement;
  statFpsEl = document.getElementById('stat-fps') as HTMLElement;

  initThree();
  starSystem = new StarSystem(scene, {
    onProgress: (reached, total) => {
      // progress callback reserved
    },
    onComplete: () => {
      if (currentTransform) {
        statStarsEl.textContent = String(currentTransform.stars.length);
        statClustersEl.textContent = String(currentTransform.clusterCount);
      }
    },
  });

  bindUI();
  lastFrameTime = performance.now();
  requestAnimationFrame(animate);
}

function initThree(): void {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050816, 0.012);

  const w = window.innerWidth;
  const h = window.innerHeight;

  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500);
  camera.position.set(0, 5, 55);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  containerEl.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 20;
  controls.maxDistance = 120;
  controls.maxPolarAngle = Math.PI * 0.92;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  controls.target.set(2, -2, -3);

  const ambient = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffd700, 0.3);
  keyLight.position.set(30, 40, 20);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x4a90d9, 0.25);
  fillLight.position.set(-30, -10, -20);
  scene.add(fillLight);

  addBackgroundStars();

  window.addEventListener('resize', onResize);
}

function addBackgroundStars(): void {
  const bgCount = 600;
  const positions = new Float32Array(bgCount * 3);
  const colors = new Float32Array(bgCount * 3);
  const sizes = new Float32Array(bgCount);

  for (let i = 0; i < bgCount; i++) {
    const r = 140 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - 2 * Math.random());
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const roll = Math.random();
    let c = new THREE.Color(0xffffff);
    if (roll > 0.85) c.set(0xffd700);
    else if (roll > 0.7) c.set(0x4a90d9);
    colors[i * 3 + 0] = c.r * 0.7;
    colors[i * 3 + 1] = c.g * 0.7;
    colors[i * 3 + 2] = c.b * 0.7;

    sizes[i] = 0.6 + Math.random() * 1.6;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uPixelRatio;
      uniform float uTime;
      void main() {
        vColor = aColor;
        vTwinkle = 0.6 + 0.4 * sin(uTime * 2.0 + position.x * 0.1 + position.y * 0.08);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (200.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * vTwinkle, core * 0.85);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'bgStars';
  scene.add(points);
}

function getTextInputStartPosition(): THREE.Vector3 {
  if (!inputCardEl) return new THREE.Vector3(-35, 0, 0);

  const rect = inputCardEl.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.35;
  const centerY = rect.top + rect.height * 0.45;

  const ndcX = (centerX / window.innerWidth) * 2 - 1;
  const ndcY = -(centerY / window.innerHeight) * 2 + 1;

  const vec = new THREE.Vector3(ndcX, ndcY, 0.4);
  vec.unproject(camera);

  const dir = vec.sub(camera.position).normalize();
  const distance = 35;
  return camera.position.clone().add(dir.multiplyScalar(distance));
}

function bindUI(): void {
  textInputEl.addEventListener('input', onTextInput);
  transformBtnEl.addEventListener('click', onTransformClick);
  speedSliderEl.addEventListener('input', onSpeedChange);
  updateCounter();
  updateSpeedLabel();
}

function onTextInput(): void {
  updateCounter();
}

function updateCounter(): void {
  const len = textInputEl.value.length;
  counterEl.textContent = `${len} / ${MIN_TEXT_LEN}-${MAX_TEXT_LEN} 字`;
  counterEl.classList.remove('warn', 'error');

  if (len > MAX_TEXT_LEN) {
    counterEl.classList.add('error');
    transformBtnEl.disabled = true;
  } else if (len < MIN_TEXT_LEN) {
    if (len > 0) counterEl.classList.add('warn');
    transformBtnEl.disabled = true;
  } else {
    transformBtnEl.disabled = false;
  }
}

function onTransformClick(): void {
  const text = textInputEl.value;
  if (text.length < MIN_TEXT_LEN || text.length > MAX_TEXT_LEN + 100) return;

  transformBtnEl.disabled = true;
  transformBtnEl.textContent = '✦ 星 焰 点 亮 中… ✦';

  setTimeout(() => {
    const startPos = getTextInputStartPosition();
    currentTransform = TextTransformer.transform(text, startPos);
    starSystem.setStars(
      currentTransform.stars,
      currentTransform.connections,
      currentTransform.maxDelay,
      currentTransform.maxDuration
    );
    starSystem.setRotationSpeed(parseFloat(speedSliderEl.value));
    starSystem.start();

    statStarsEl.textContent = '0';
    statClustersEl.textContent = String(currentTransform.clusterCount);

    setTimeout(() => {
      transformBtnEl.disabled = false;
      transformBtnEl.textContent = '✦ 重 新 点 亮 ✦';
    }, 2500);
  }, 120);
}

function onSpeedChange(): void {
  const v = parseFloat(speedSliderEl.value);
  starSystem?.setRotationSpeed(v);
  updateSpeedLabel();
}

function updateSpeedLabel(): void {
  const v = parseFloat(speedSliderEl.value);
  speedValueEl.textContent = `${v.toFixed(1)}°/s`;
}

function onResize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animate(now: number): void {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;

  fpsAccumulator += 1 / dt;
  fpsFrames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    const fps = Math.round(fpsAccumulator / fpsFrames);
    statFpsEl.textContent = String(fps);
    fpsAccumulator = 0;
    fpsFrames = 0;
    fpsTimer = 0;
  }

  const bgStars = scene.getObjectByName('bgStars') as THREE.Points | undefined;
  if (bgStars && bgStars.material instanceof THREE.ShaderMaterial) {
    bgStars.material.uniforms.uTime.value = now / 1000;
    bgStars.rotation.y += dt * 0.015;
  }

  starSystem.update(now, dt);
  controls.update();
  renderer.render(scene, camera);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
