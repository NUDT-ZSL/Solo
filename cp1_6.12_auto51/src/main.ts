import * as THREE from 'three';
import { createScene, ShipwreckInfo } from './scene';
import { SonarSystem } from './sonar';
import { Player } from './player';
import { UIManager, MissionData } from './ui';

const CONTAINER = document.getElementById('game-container')!;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
CONTAINER.insertBefore(renderer.domElement, CONTAINER.firstChild);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 25, -20);
camera.lookAt(0, 0, 0);

const { scene, terrainData, shipwrecks, reefs, particles, detectableObjects, updateParticles } = createScene();

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

function onMouseMove(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  updateMouseWorld();
}

function updateMouseWorld(): void {
  raycaster.setFromCamera(mouse, camera);
  const intersect = new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane, intersect);
  if (intersect) {
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
    sonar.triggerManualPulse(player.getPosition(), player.getDirection());
    checkShipwreckDiscovery();
  }
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

const HIGHLIGHT_DURATION = 0.5;
let discoveredCount = 0;
const totalShipwrecks = shipwrecks.length;
let gameComplete = false;

const activeHighlights: { mesh: THREE.Mesh; timer: number }[] = [];

function checkShipwreckDiscovery(): void {
  if (gameComplete) return;

  const playerPos = player.getPosition();
  for (const sw of shipwrecks) {
    if (sw.discovered) continue;

    const dist = playerPos.distanceTo(sw.position);
    if (dist < 18) {
      const dirToSw = Math.atan2(
        sw.position.x - playerPos.x,
        sw.position.z - playerPos.z
      );
      const playerDir = player.getDirection();
      let angleDiff = dirToSw - playerDir;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < (60 * Math.PI) / 180) {
        sw.discovered = true;
        discoveredCount++;

        if (sw.highlightMesh) {
          const hl = sw.highlightMesh;
          const mat = hl.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.7;
          activeHighlights.push({ mesh: hl, timer: HIGHLIGHT_DURATION });
        }

        startGoldFlash(sw);

        setTimeout(() => {
          fadeOutShipwreck(sw);
        }, 800);
      }
    }
  }

  if (discoveredCount >= totalShipwrecks && !gameComplete) {
    gameComplete = true;
  }
}

function startGoldFlash(sw: ShipwreckInfo): void {
  const pos = sw.position.clone();
  pos.y += 2;
  const geo = new THREE.SphereGeometry(2, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const flash = new THREE.Mesh(geo, mat);
  flash.position.copy(pos);
  scene.add(flash);

  const startTime = performance.now();
  function animateFlash() {
    const elapsed = (performance.now() - startTime) / 1000;
    if (elapsed > 0.8) {
      scene.remove(flash);
      flash.geometry.dispose();
      (flash.material as THREE.Material).dispose();
      return;
    }
    const scale = 1 + elapsed * 2;
    flash.scale.setScalar(scale);
    (flash.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - elapsed / 0.8);
    requestAnimationFrame(animateFlash);
  }
  requestAnimationFrame(animateFlash);
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

  function animateFade() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, elapsed / duration);
    for (const m of meshes) {
      const mat = m.material as THREE.MeshPhongMaterial;
      if (!mat.transparent) {
        mat.transparent = true;
      }
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

const cameraOffset = new THREE.Vector3(-18, 22, -18);
const cameraLookOffset = new THREE.Vector3(0, -2, 0);

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const delta = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  updateMouseWorld();

  player.update(delta, mouseWorld, mouseDown);

  const playerPos = player.getPosition();
  const playerDir = player.getDirection();

  const sonarData = sonar.update(delta, playerPos, playerDir);

  updateParticles(delta);

  for (let i = activeHighlights.length - 1; i >= 0; i--) {
    activeHighlights[i].timer -= delta;
    const hl = activeHighlights[i];
    const mat = hl.mesh.material as THREE.MeshBasicMaterial;
    if (hl.timer > 0) {
      mat.opacity = 0.5 * (hl.timer / HIGHLIGHT_DURATION);
    } else {
      mat.opacity = 0;
      activeHighlights.splice(i, 1);
    }
  }

  const targetCamPos = new THREE.Vector3().addVectors(playerPos, cameraOffset);
  camera.position.lerp(targetCamPos, Math.min(1, delta * 3));
  const lookTarget = new THREE.Vector3().addVectors(playerPos, cameraLookOffset);
  camera.lookAt(lookTarget);

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

requestAnimationFrame(gameLoop);
