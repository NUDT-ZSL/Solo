import * as THREE from 'three';
import { createSolarSystem, SolarSystem, PlanetObject } from './solarsystem';
import { initUI, showInfoPanel, hideInfoPanel, UICallbacks } from './ui';

const INITIAL_CAMERA_POS = new THREE.Vector3(0, 60, 120);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let solarSystem: SolarSystem;
let speedMultiplier = 1.0;

let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let targetAzimuth = Math.atan2(INITIAL_CAMERA_POS.x, INITIAL_CAMERA_POS.z);
let targetPolar = Math.acos(INITIAL_CAMERA_POS.y / INITIAL_CAMERA_POS.length());
let currentAzimuth = targetAzimuth;
let currentPolar = targetPolar;
let targetDistance = INITIAL_CAMERA_POS.length();
let currentDistance = targetDistance;
const DAMPING = 0.9;

const clock = new THREE.Clock();

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    throw new Error('Canvas container not found');
  }

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.copy(INITIAL_CAMERA_POS);
  camera.lookAt(CAMERA_TARGET);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  solarSystem = createSolarSystem();
  scene.add(solarSystem.sunGroup);
  scene.add(solarSystem.planetsGroup);
  scene.add(solarSystem.orbitsGroup);
  scene.add(solarSystem.stars);

  const callbacks: UICallbacks = {
    onSpeedChange: (mult: number) => {
      speedMultiplier = mult;
    },
    onToggleOrbits: (visible: boolean) => {
      solarSystem.orbitsGroup.visible = visible;
    },
    onResetView: resetCamera,
    onPlanetClick: () => {}
  };

  initUI(callbacks);
  bindInteractionEvents(renderer.domElement);
  window.addEventListener('resize', onResize);

  animate();
}

function resetCamera(): void {
  targetAzimuth = Math.atan2(INITIAL_CAMERA_POS.x, INITIAL_CAMERA_POS.z);
  targetPolar = Math.acos(INITIAL_CAMERA_POS.y / INITIAL_CAMERA_POS.length());
  targetDistance = INITIAL_CAMERA_POS.length();
  hideInfoPanel();
}

function updateCamera(): void {
  currentAzimuth += (targetAzimuth - currentAzimuth) * (1 - DAMPING);
  currentPolar += (targetPolar - currentPolar) * (1 - DAMPING);
  currentDistance += (targetDistance - currentDistance) * (1 - DAMPING);

  const x = currentDistance * Math.sin(currentPolar) * Math.sin(currentAzimuth);
  const y = currentDistance * Math.cos(currentPolar);
  const z = currentDistance * Math.sin(currentPolar) * Math.cos(currentAzimuth);

  camera.position.set(x, y, z);
  camera.lookAt(CAMERA_TARGET);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function handlePlanetClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const meshes = solarSystem.planetObjects.map((p: PlanetObject) => p.mesh);
  const intersects = raycaster.intersectObjects(meshes, false);

  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object;
    const planet = solarSystem.planetObjects.find(
      (p: PlanetObject) => p.mesh === clickedMesh
    );
    if (planet) {
      showInfoPanel(planet.info, event.clientX, event.clientY);
      return;
    }
  }
  hideInfoPanel();
}

function bindInteractionEvents(domElement: HTMLCanvasElement): void {
  domElement.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button === 0) {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    }
  });

  window.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button === 0 && isDragging) {
      const dx = Math.abs(e.clientX - previousMouseX);
      const dy = Math.abs(e.clientY - previousMouseY);
      if (dx < 3 && dy < 3) {
        handlePlanetClick(e);
      }
      isDragging = false;
    }
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - previousMouseX;
    const deltaY = e.clientY - previousMouseY;

    targetAzimuth -= deltaX * 0.005;
    targetPolar -= deltaY * 0.005;

    const polarMin = Math.PI / 180 * 5;
    const polarMax = Math.PI / 180 * 175;
    targetPolar = Math.max(polarMin, Math.min(polarMax, targetPolar));

    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
  });

  domElement.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    targetDistance *= 1 + e.deltaY * zoomSpeed;
    targetDistance = Math.max(10, Math.min(200, targetDistance));
  }, { passive: false });
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  solarSystem.update(delta, speedMultiplier);
  updateCamera();

  renderer.render(scene, camera);
}

init();
