import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GasRing } from './gasRing.js';
import { InteractionManager } from './interaction.js';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let gasRing: GasRing;
let interactionManager: InteractionManager;
let centralPlanet: THREE.Mesh;
let starsBackground: THREE.Points;

const clock = new THREE.Clock();
let elapsedTime = 0;

let uiPanel: HTMLDivElement;
let particleCountLabel: HTMLSpanElement;
let avgSpeedLabel: HTMLSpanElement;
let dominantColorBlock: HTMLDivElement;

init();
animate();

function init(): void {
  const container = document.getElementById('app')!;

  scene = new THREE.Scene();
  setupBackground();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 200, 400);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 100;
  controls.maxDistance = 500;
  controls.target.set(0, 0, 0);

  createCentralPlanet();
  gasRing = new GasRing();
  scene.add(gasRing.points);

  interactionManager = new InteractionManager(camera, renderer, scene, controls, gasRing);
  interactionManager.onSpeedChange((_speed: number) => {
    updateUI();
  });

  createUI();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1, 1000);
  pointLight.position.set(200, 200, 200);
  scene.add(pointLight);

  window.addEventListener('resize', onWindowResize);

  updateUI();
}

function setupBackground(): void {
  const starCount = 500;
  const positions = new Float32Array(starCount * 3);
  const alphas = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const radius = 800 + Math.random() * 400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    alphas[i] = 0.1 + Math.random() * 0.2;
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  starsBackground = new THREE.Points(starGeometry, starMaterial);
  scene.add(starsBackground);
}

function createCentralPlanet(): void {
  const geometry = new THREE.SphereGeometry(60, 64, 64);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#D4A574');
  gradient.addColorStop(0.5, '#C27A4A');
  gradient.addColorStop(1, '#8B5A2B');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 8; i++) {
    const y = Math.random() * 256;
    const height = 10 + Math.random() * 30;
    const bandGradient = ctx.createLinearGradient(0, y, 0, y + height);
    bandGradient.addColorStop(0, `rgba(212, 165, 116, ${0.3 + Math.random() * 0.3})`);
    bandGradient.addColorStop(0.5, `rgba(194, 122, 74, ${0.2 + Math.random() * 0.3})`);
    bandGradient.addColorStop(1, `rgba(139, 90, 43, ${0.3 + Math.random() * 0.3})`);
    ctx.fillStyle = bandGradient;
    ctx.fillRect(0, y, 512, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const material = new THREE.MeshPhongMaterial({
    map: texture,
    shininess: 10,
    specular: new THREE.Color(0x333333)
  });

  centralPlanet = new THREE.Mesh(geometry, material);
  scene.add(centralPlanet);
}

function createUI(): void {
  uiPanel = document.createElement('div');
  uiPanel.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(20, 20, 40, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 20px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    min-width: 200px;
    z-index: 100;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #E8E8F0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 10px;
  `;
  title.textContent = '星环数据面板';
  uiPanel.appendChild(title);

  const particleRow = document.createElement('div');
  particleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';
  const particleLabel = document.createElement('span');
  particleLabel.style.cssText = 'color: #A0A0B8;';
  particleLabel.textContent = '粒子总数:';
  particleCountLabel = document.createElement('span');
  particleCountLabel.style.cssText = 'font-weight: 600; color: #FFFFFF;';
  particleRow.appendChild(particleLabel);
  particleRow.appendChild(particleCountLabel);
  uiPanel.appendChild(particleRow);

  const speedRow = document.createElement('div');
  speedRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';
  const speedLabel = document.createElement('span');
  speedLabel.style.cssText = 'color: #A0A0B8;';
  speedLabel.textContent = '平均速度:';
  avgSpeedLabel = document.createElement('span');
  avgSpeedLabel.style.cssText = 'font-weight: 600; color: #FFFFFF;';
  speedRow.appendChild(speedLabel);
  speedRow.appendChild(avgSpeedLabel);
  uiPanel.appendChild(speedRow);

  const colorRow = document.createElement('div');
  colorRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
  const colorLabel = document.createElement('span');
  colorLabel.style.cssText = 'color: #A0A0B8;';
  colorLabel.textContent = '最亮区域:';
  dominantColorBlock = document.createElement('div');
  dominantColorBlock.style.cssText = `
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  colorRow.appendChild(colorLabel);
  colorRow.appendChild(dominantColorBlock);
  uiPanel.appendChild(colorRow);

  const hint = document.createElement('div');
  hint.style.cssText = `
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11px;
    color: #707090;
    line-height: 1.6;
  `;
  hint.innerHTML = `
    <div>拖拽: 旋转视角</div>
    <div>滚轮: 缩放</div>
    <div>Shift+拖拽: 调节速度</div>
    <div>点击星环: 引力扰动</div>
  `;
  uiPanel.appendChild(hint);

  document.body.appendChild(uiPanel);
}

function updateUI(): void {
  if (!uiPanel) return;

  particleCountLabel.textContent = gasRing.getParticleCount().toLocaleString();
  avgSpeedLabel.textContent = gasRing.getAverageSpeed().toFixed(2) + ' 转/秒';

  const color = gasRing.getDominantColor();
  dominantColorBlock.style.background = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (window.innerWidth < 768) {
    uiPanel.style.top = 'auto';
    uiPanel.style.right = 'auto';
    uiPanel.style.bottom = '20px';
    uiPanel.style.left = '50%';
    uiPanel.style.transform = 'translateX(-50%)';
    uiPanel.style.width = 'calc(100% - 40px)';
    uiPanel.style.maxWidth = '400px';
  } else {
    uiPanel.style.top = '20px';
    uiPanel.style.right = '20px';
    uiPanel.style.bottom = 'auto';
    uiPanel.style.left = 'auto';
    uiPanel.style.transform = 'none';
    uiPanel.style.width = 'auto';
    uiPanel.style.maxWidth = 'none';
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  elapsedTime += deltaTime;

  if (centralPlanet) {
    centralPlanet.rotation.y += deltaTime * 0.2;
  }

  gasRing.update(deltaTime, elapsedTime);
  interactionManager.update(elapsedTime);
  controls.update();

  if (Math.floor(elapsedTime * 10) % 5 === 0) {
    updateUI();
  }

  renderer.render(scene, camera);
}
