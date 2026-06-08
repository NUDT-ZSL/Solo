import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createStars, updateStars } from './stars';
import {
  createConstellations,
  highlightConstellation,
  clearHighlight,
  getConstellationInfo
} from './constellations';
import {
  initUI,
  showInfoCard,
  hideInfoCard,
  setConstellationSelectValue,
  Events
} from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let hitTargets: THREE.Object3D[] = [];
let raycaster: THREE.Raycaster;
let pointer: THREE.Vector2;

let timeSpeed = 1;
let timePaused = true;
let accumulatedRotation = 0;
let currentHighlighted: string | null = null;

const clock = new THREE.Clock();

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 35);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.minPolarAngle = Math.PI / 2 - Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 2 + Math.PI / 4;
  controls.enablePan = false;

  createStars(scene);
  hitTargets = createConstellations(scene);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  initUI();
  bindEvents();
  animate();
}

function bindEvents(): void {
  window.addEventListener('resize', onWindowResize);
  window.addEventListener(Events.CONSTELLATION_SELECTED, onConstellationSelected as EventListener);
  window.addEventListener(Events.TIME_SPEED_CHANGE, onTimeSpeedChange as EventListener);
  window.addEventListener(Events.TIME_TOGGLE_PAUSE, onTimeTogglePause as EventListener);
  window.addEventListener(Events.TIME_RESET, onTimeReset as EventListener);
  window.addEventListener(Events.CLOSE_INFO_CARD, onCloseInfoCard as EventListener);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onConstellationSelected(e: CustomEvent<{ name: string | null }>): void {
  const name = e.detail.name;
  if (name) {
    const info = getConstellationInfo(name);
    if (info) {
      highlightConstellation(name);
      showInfoCard(info);
      currentHighlighted = name;
    }
  } else {
    clearHighlight();
    hideInfoCard();
    currentHighlighted = null;
  }
}

function onTimeSpeedChange(e: CustomEvent<{ speed: number }>): void {
  timeSpeed = e.detail.speed;
}

function onTimeTogglePause(e: CustomEvent<{ paused: boolean }>): void {
  timePaused = e.detail.paused;
}

function onTimeReset(): void {
  timePaused = true;
  timeSpeed = 1;
  accumulatedRotation = 0;
  scene.rotation.y = 0;
}

function onCloseInfoCard(): void {
  if (currentHighlighted) {
    clearHighlight();
    setConstellationSelectValue(null);
    currentHighlighted = null;
  }
}

let downX = 0;
let downY = 0;

function onPointerDown(event: PointerEvent): void {
  downX = event.clientX;
  downY = event.clientY;
  renderer.domElement.addEventListener('pointerup', onPointerUp);
}

function onPointerUp(event: PointerEvent): void {
  renderer.domElement.removeEventListener('pointerup', onPointerUp);
  const dx = Math.abs(event.clientX - downX);
  const dy = Math.abs(event.clientY - downY);
  if (dx > 5 || dy > 5) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(hitTargets, false);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    const name = obj.userData.constellationName as string | undefined;
    if (name) {
      const info = getConstellationInfo(name);
      if (info) {
        highlightConstellation(name);
        showInfoCard(info);
        setConstellationSelectValue(name);
        currentHighlighted = name;
      }
    }
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (!timePaused) {
    accumulatedRotation += delta * 0.08 * timeSpeed;
    scene.rotation.y = accumulatedRotation;
  }

  updateStars(elapsed);
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);
