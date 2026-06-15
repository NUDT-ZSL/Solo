import * as THREE from 'three';
import { createScene, ShipwreckInfo } from './scene';
import { SonarSystem } from './sonar';
import { Player } from './player';
import { UIManager, MissionData } from './ui';

const CONTAINER = document.getElementById('game-container')!;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
CONTAINER.insertBefore(renderer.domElement, CONTAINER.firstChild);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 35, -28);
camera.lookAt(0, 0, 0);

const { scene, terrainData, shipwrecks, reefs, detectableObjects, updateParticles } = createScene();

const sonar = new SonarSystem(scene, terrainData, detectableObjects);
sonar.setShipwrecks(shipwrecks);
sonar.setReefs(reefs);

const player = new Player(scene, terrainData);

const ui = new UIManager();
ui.setWorldSize(terrainData.width);

const mouse = new THREE.Vector2();
const mouseWorld = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

let mouseDown = false;
let discoveredCount = 0;
const totalShipwrecks = shipwrecks.length;
let gameComplete = false;

const goldFlashes: { mesh: THREE.Mesh; startTime: number; duration: number }[] = [];

function onMouseMove(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  updateMouseWorld();
}

function updateMouseWorld(): void {
  raycaster.setFromCamera(mouse, camera);
  const intersect = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, intersect)) {
    mouseWorld.copy(intersect);
  }
}

function onMouseDown(event: MouseEvent): void {
  if (event.button === 0) {
    mouseDown = true;
  }
}

function onMouseUp(event: MouseEvent): void {
  if (event.button === 0) {
    mouseDown = false;
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.code === 'Space') {
    event.preventDefault();
    fireSonarPulse();
  }
}

function fireSonarPulse(): void {
  const playerPos = player.getPosition();
  const playerDir = player.getDirection();
  sonar.fireManualPulse(playerPos, playerDir);
  checkShipwreckDiscovery();
}

function checkShipwreckDiscovery(): void {
  if (gameComplete) return;

  const playerPos = player.getPosition();
  const playerDir = player.getDirection();

  for (const sw of shipwrecks) {
    if (sw.discovered) continue;

    const dist = playerPos.distanceTo(sw.position);
    if (dist > 18) continue;

    const dirToSw = Math.atan2(
      sw.position.x - playerPos.x,
      sw.position.z - playerPos.z
    );
    let angleDiff = dirToSw - playerDir;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const inSector = Math.abs(angleDiff) < (60 * Math.PI) / 180;
    const inRange = dist < 15;

    if (inSector && inRange) {
      markShipwreck(sw);
    }
  }

  if (discoveredCount >= totalShipwrecks && !gameComplete) {
    gameComplete = true;
  }
}

function markShipwreck(sw: ShipwreckInfo): void {
  sw.discovered = true;
  discoveredCount++;

  createGoldFlash(sw.position.clone().add(new THREE.Vector3(0, 2, 0)));

  setTimeout(() => {
    fadeOutShipwreck(sw);
  }, 600);
}

function createGoldFlash(position: THREE.Vector3): void {
  const geo = new THREE.SphereGeometry(3, 24, 20);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(geo, mat);
  flash.position.copy(position);
  scene.add(flash);
  goldFlashes.push({ mesh: flash, startTime: performance.now(), duration: 1200 });
}

function fadeOutShipwreck(sw: ShipwreckInfo): void {
  const startTime = performance.now();
  const duration = 1500;
  const meshes: THREE.Mesh[] = [];
  sw.mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child);
    }
  });

  for (const m of meshes) {
    const mat = m.material as THREE.MeshPhongMaterial;
    mat.transparent = true;
  }

  function animateFade() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, elapsed / duration);
    for (const m of meshes) {
      const mat = m.material as THREE.MeshPhongMaterial;
      mat.opacity = 1 - progress;
    }
    if (progress < 1) {
      requestAnimationFrame(animateFade);
    } else {
      scene.remove(sw.mesh);
    }
  }
  requestAnimationFrame(animateFade);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener('keydown', onKeyDown);
window.addEventListener('resize', onResize);
window.addEventListener('contextmenu', (e) => e.preventDefault());

const cameraOffset = new THREE.Vector3(-25, 32, -25);

let lastTime = performance.now();
let frameCount = 0;
let fpsTime = 0;

function gameLoop(currentTime: number): void {
  const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  frameCount++;
  fpsTime += delta;
  if (fpsTime >= 1) {
    fpsTime = 0;
    frameCount = 0;
  }

  updateMouseWorld();

  player.update(delta, mouseWorld, mouseDown);

  const playerPos = player.getPosition();
  const playerDir = player.getDirection();

  const sonarData = sonar.update(delta, playerPos, playerDir);

  updateParticles(delta);

  updateGoldFlashes();

  const targetCamPos = new THREE.Vector3().addVectors(playerPos, cameraOffset);
  camera.position.lerp(targetCamPos, Math.min(1, delta * 2.5));
  camera.lookAt(playerPos.x, playerPos.y + 1, playerPos.z);

  const playerDisplayData = player.getDisplayData(sonarData.cooldown, sonarData.cooldownMax);
  const markers = sonar.getMapMarkers();

  const missionData: MissionData = {
    discovered: discoveredCount,
    total: totalShipwrecks,
    complete: gameComplete,
  };

  ui.update(sonarData, playerDisplayData, missionData, markers);

  renderer.render(scene, camera);

  requestAnimationFrame(gameLoop);
}

function updateGoldFlashes(): void {
  const now = performance.now();
  for (let i = goldFlashes.length - 1; i >= 0; i--) {
    const flash = goldFlashes[i];
    const elapsed = now - flash.startTime;
    const progress = Math.min(1, elapsed / flash.duration);

    if (progress >= 1) {
      scene.remove(flash.mesh);
      flash.mesh.geometry.dispose();
      (flash.mesh.material as THREE.Material).dispose();
      goldFlashes.splice(i, 1);
      continue;
    }

    const scale = 1 + progress * 2.5;
    flash.mesh.scale.setScalar(scale);

    const mat = flash.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.9 * (1 - progress);
  }
}

requestAnimationFrame(gameLoop);
