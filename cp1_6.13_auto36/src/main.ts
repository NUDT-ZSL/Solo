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
import { initUIPanel, updateInfoPanel } from './uiPanel';

const INITIAL_CAMERA_POS = new THREE.Vector3(0, 0, 300);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

function init(): void {
  const container = document.getElementById('canvas-container')!;

  scene = new THREE.Scene();
  scene.background = createGradientTexture();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.copy(INITIAL_CAMERA_POS);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = INITIAL_CAMERA_POS.z * MIN_ZOOM;
  controls.maxDistance = INITIAL_CAMERA_POS.z * MAX_ZOOM;
  controls.enablePan = false;

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 2 };
  mouse = new THREE.Vector2();

  createStarField(scene);

  createConstellations(scene, (data) => {
    updateInfoPanel(data);
  });

  initUIPanel(
    (season) => {
      updateSeason(season);
    },
    () => {},
    () => {
      resetView();
    }
  );

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onMouseClick);

  animate();
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
  return texture;
}

function onResize(): void {
  const w = Math.max(window.innerWidth, 800);
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  handleHover(raycaster);
}

function onMouseClick(_event: MouseEvent): void {
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
