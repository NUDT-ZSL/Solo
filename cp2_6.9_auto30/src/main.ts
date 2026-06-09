import * as THREE from 'three';
import { PointCloudManager, HighlightedPoint } from './pointCloud';
import { InteractionManager, ViewType, ToolType } from './interaction';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let pointCloud: PointCloudManager;
let interaction: InteractionManager;
let animationId: number;
const clock = new THREE.Clock();

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) throw new Error('Canvas container not found');

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0c, 0.015);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  pointCloud = new PointCloudManager(scene);

  interaction = new InteractionManager(camera, renderer, pointCloud, {
    onProgressChange: updateProgress,
    onReconstruct: () => {},
    onPointPicked: updatePointInfo
  });

  pointCloud.onHighlightChange = (points: HighlightedPoint[]) => {
    const countEl = document.getElementById('info-count');
    if (countEl) countEl.textContent = `${points.length} / 20`;
  };

  setupUI();
  window.addEventListener('resize', onWindowResize);
  animate();
}

function setupUI(): void {
  const viewBtns = document.querySelectorAll('.view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const view = target.dataset.view as ViewType;
      if (!view) return;

      viewBtns.forEach(b => b.classList.remove('active'));
      target.classList.add('active');
      interaction.switchView(view);
    });
  });

  const pickBtn = document.getElementById('pick-btn');
  const rotateBtn = document.getElementById('rotate-btn');

  const setTool = (tool: ToolType) => {
    interaction.setTool(tool);
    pickBtn?.classList.toggle('active', tool === 'pick');
    rotateBtn?.classList.toggle('active', tool === 'rotate');
  };

  pickBtn?.addEventListener('click', () => setTool('pick'));
  rotateBtn?.addEventListener('click', () => setTool('rotate'));
}

function updateProgress(current: number, total: number): void {
  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');

  if (fill) {
    const pct = (current / total) * 100;
    fill.style.width = `${pct}%`;
  }
  if (label) {
    label.textContent = `关键点收集进度：${current} / ${total}`;
  }
}

function updatePointInfo(point: HighlightedPoint | null): void {
  const statusEl = document.getElementById('info-status');
  const xEl = document.getElementById('info-x');
  const yEl = document.getElementById('info-y');
  const zEl = document.getElementById('info-z');
  const swatchEl = document.getElementById('color-swatch') as HTMLSpanElement | null;
  const rgbEl = document.getElementById('color-rgb');

  if (!statusEl || !xEl || !yEl || !zEl || !swatchEl || !rgbEl) return;

  if (point) {
    statusEl.textContent = '已选择';
    statusEl.style.color = '#ffd54f';
    xEl.textContent = point.position.x.toFixed(2);
    yEl.textContent = point.position.y.toFixed(2);
    zEl.textContent = point.position.z.toFixed(2);

    const r = Math.round(point.color.r * 255);
    const g = Math.round(point.color.g * 255);
    const b = Math.round(point.color.b * 255);
    swatchEl.style.background = `rgb(${r}, ${g}, ${b})`;
    rgbEl.textContent = `${r}, ${g}, ${b}`;
  } else {
    statusEl.textContent = '未选择';
    statusEl.style.color = '';
    xEl.textContent = '--';
    yEl.textContent = '--';
    zEl.textContent = '--';
    swatchEl.style.background = '#333';
    rgbEl.textContent = '--';
  }
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  animationId = requestAnimationFrame(animate);
  const delta = clock.getDelta();

  interaction.update(delta);
  pointCloud.update(delta, camera);

  renderer.render(scene, camera);
}

function dispose(): void {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  interaction.dispose();
  pointCloud.dispose();
  renderer.dispose();
}

init();

window.addEventListener('beforeunload', dispose);
