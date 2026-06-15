import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createStarField } from './starField';
import {
  createConstellations,
  updateSeason,
  handleHover,
  handleClick,
  updateAnimations,
} from './constellation';
import { initUIPanel, updateInfoPanel, playRipple } from './uiPanel';

const INITIAL_CAMERA_POS = new THREE.Vector3(0, 0, 300);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ASPECT_RATIO = 16 / 9;
const MIN_WIDTH = 800;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

function init(): void {
  const container = document.getElementById('canvas-container')!;
  container.style.background = '#05051a';
  container.style.overflow = 'hidden';

  document.documentElement.style.minWidth = MIN_WIDTH + 'px';
  document.body.style.minWidth = MIN_WIDTH + 'px';

  scene = new THREE.Scene();
  scene.background = createGradientTexture();

  const { w, h } = computeRenderSize();
  camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
  camera.position.copy(INITIAL_CAMERA_POS);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  applyCanvasLetterboxStyle();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = INITIAL_CAMERA_POS.z * MIN_ZOOM;
  controls.maxDistance = INITIAL_CAMERA_POS.z * MAX_ZOOM;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 5 };
  mouse = new THREE.Vector2();

  createStarField(scene);

  createConstellations(
    scene,
    (data) => {
      updateInfoPanel(data);
    },
    () => {
      playRipple();
    }
  );

  initUIPanel(
    (season) => {
      updateSeason(season);
    },
    () => {
      resetView();
    },
    () => {
      playRipple();
    }
  );

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onMouseClick);

  animate();
}

function computeRenderSize(): { w: number; h: number } {
  const bodyW = Math.max(document.documentElement.clientWidth, MIN_WIDTH);
  const winH = window.innerHeight;

  let w: number;
  let h: number;
  const ratio = bodyW / winH;

  if (ratio > ASPECT_RATIO) {
    h = winH;
    w = Math.round(h * ASPECT_RATIO);
  } else {
    w = bodyW;
    h = Math.round(w / ASPECT_RATIO);
  }
  return { w, h };
}

function applyCanvasLetterboxStyle(): void {
  if (!renderer) return;
  const canvas = renderer.domElement;
  const { w, h } = computeRenderSize();
  const bodyW = Math.max(document.documentElement.clientWidth, MIN_WIDTH);

  const left = (bodyW - w) / 2;
  const top = (window.innerHeight - h) / 2;

  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.style.position = 'absolute';
  canvas.style.left = left + 'px';
  canvas.style.top = top + 'px';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
}

function createGradientTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#0f0f2e');
  gradient.addColorStop(1, '#05051a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function onResize(): void {
  const { w, h } = computeRenderSize();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  applyCanvasLetterboxStyle();
}

function getCanvasLogicalSize(): { w: number; h: number; left: number; top: number } {
  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  return { w: rect.width, h: rect.height, left: rect.left, top: rect.top };
}

function onMouseMove(event: MouseEvent): void {
  const { w, h, left, top } = getCanvasLogicalSize();
  mouse.x = ((event.clientX - left) / w) * 2 - 1;
  mouse.y = -(((event.clientY - top) / h) * 2 - 1);

  raycaster.setFromCamera(mouse, camera);
  handleHover(raycaster);
}

function onMouseClick(event: MouseEvent): void {
  const { w, h, left, top } = getCanvasLogicalSize();
  mouse.x = ((event.clientX - left) / w) * 2 - 1;
  mouse.y = -(((event.clientY - top) / h) * 2 - 1);

  raycaster.setFromCamera(mouse, camera);
  handleClick(raycaster);
}

function resetView(): void {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const endPos = INITIAL_CAMERA_POS.clone();
  const endTarget = new THREE.Vector3(0, 0, 0);
  const startTime = performance.now();
  const duration = 1000;

  function animateReset(): void {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(animateReset);
    }
  }

  animateReset();
}

function animate(): void {
  requestAnimationFrame(animate);
  controls.update();
  updateAnimations();
  renderer.render(scene, camera);
}

init();
