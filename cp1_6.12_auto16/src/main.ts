import * as THREE from 'three';
import { loadTerrainFromCSV, type TerrainObject } from './terrainLoader';
import { createTerrainRenderable, checkAndApplyLOD, type TerrainRendererResult, type LODState } from './terrainRenderer';
import {
  createInteractionManager,
  probeTerrain,
  toggleContours,
  resetCamera,
  updateCameraReset,
  updateMousePosition,
  generateContours,
  clearContours,
  type InteractionManager,
} from './interaction';
import { createUIPanel, type UIPanelData } from './uiPanel';

const CSV_URL = '/data/terrain_1024.csv';
const SCALE_XZ = 500;
const SCALE_Y = 80;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let interaction: InteractionManager;
let terrainRenderable: TerrainRendererResult;
let currentTerrain: TerrainObject;
let lodState: LODState;
let uiPanel: ReturnType<typeof createUIPanel>;

let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

async function init() {
  const sceneContainer = document.getElementById('scene-container')!;
  const infoPanel = document.getElementById('info-panel')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d1a);
  scene.fog = new THREE.Fog(0x0d0d1a, 400, 800);

  camera = new THREE.PerspectiveCamera(60, sceneContainer.clientWidth / sceneContainer.clientHeight, 0.5, 2000);
  camera.position.set(0, 200, 280);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  sceneContainer.insertBefore(renderer.domElement, sceneContainer.firstChild);

  interaction = createInteractionManager(camera, renderer.domElement, scene);

  uiPanel = createUIPanel(infoPanel, {
    onResetCamera: () => {
      resetCamera(interaction);
    },
    onToggleContours: (enabled: boolean) => {
      toggleContours(interaction, enabled);
      if (enabled && interaction.contourGroup.children.length === 0) {
        generateContours(interaction);
      }
    },
    onContourIntervalChange: (interval: number) => {
      interaction.contourInterval = interval;
      if (interaction.contourEnabled) {
        clearContours(interaction);
        generateContours(interaction);
      }
    },
  });

  currentTerrain = await loadTerrainFromCSV(CSV_URL, SCALE_XZ, SCALE_Y, 1);
  terrainRenderable = createTerrainRenderable(currentTerrain);
  scene.add(terrainRenderable.group);

  interaction.terrainData = currentTerrain.data;
  interaction.terrainMesh = terrainRenderable.mesh;

  lodState = checkAndApplyLOD(
    currentTerrain,
    terrainRenderable,
    CSV_URL,
    SCALE_XZ,
    SCALE_Y,
    (newTerrain, newRenderer) => {
      currentTerrain = newTerrain;
      terrainRenderable = newRenderer;
      interaction.terrainData = newTerrain.data;
      interaction.terrainMesh = newRenderer.mesh;
      lodState = { currentLevel: 'medium', vertexCount: newTerrain.data.vertexCount, switchTime: performance.now() };

      const lodIndicator = document.getElementById('lod-indicator')!;
      lodIndicator.textContent = `LOD: 中等 (${newTerrain.data.vertexCount.toLocaleString()} 顶点)`;
      lodIndicator.classList.add('visible');
      setTimeout(() => lodIndicator.classList.remove('visible'), 3000);
    }
  );

  sceneContainer.addEventListener('mousemove', (e) => {
    updateMousePosition(interaction, e, sceneContainer);
  });

  sceneContainer.addEventListener('mouseleave', () => {
    interaction.probeMarker.visible = false;
    const tooltip = document.getElementById('probe-tooltip')!;
    tooltip.classList.remove('visible');
  });

  window.addEventListener('resize', () => {
    const w = sceneContainer.clientWidth;
    const h = sceneContainer.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  updateCameraReset(interaction);
  interaction.controls.update();

  const probeResult = probeTerrain(interaction, document.getElementById('scene-container')!);
  const tooltip = document.getElementById('probe-tooltip')!;
  if (probeResult.isValid) {
    const p = probeResult.position;
    tooltip.innerHTML = `X: ${p.x.toFixed(1)}&nbsp;&nbsp;Y: ${p.y.toFixed(1)}&nbsp;&nbsp;Z: ${p.z.toFixed(1)}<br/>海拔: ${probeResult.elevation.toFixed(1)} m`;
    tooltip.classList.add('visible');

    const rect = (renderer.domElement as HTMLElement).getBoundingClientRect();
    const projected = probeResult.position.clone().project(camera);
    const sx = (projected.x * 0.5 + 0.5) * rect.width;
    const sy = (-projected.y * 0.5 + 0.5) * rect.height;
    tooltip.style.left = `${sx + 16}px`;
    tooltip.style.top = `${sy - 30}px`;
  } else {
    tooltip.classList.remove('visible');
  }

  renderer.render(scene, camera);

  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    currentFps = Math.round(frameCount * 1000 / (now - lastFpsTime));
    frameCount = 0;
    lastFpsTime = now;

    uiPanel.update({
      cameraX: camera.position.x,
      cameraY: camera.position.y,
      cameraZ: camera.position.z,
      minElevation: currentTerrain.data.minElevation,
      maxElevation: currentTerrain.data.maxElevation,
      vertexCount: currentTerrain.data.vertexCount,
      fps: currentFps,
      lodState,
      contourEnabled: interaction.contourEnabled,
    });
  } else if (frameCount % 10 === 0) {
    uiPanel.update({
      cameraX: camera.position.x,
      cameraY: camera.position.y,
      cameraZ: camera.position.z,
      minElevation: currentTerrain.data.minElevation,
      maxElevation: currentTerrain.data.maxElevation,
      vertexCount: currentTerrain.data.vertexCount,
      fps: currentFps,
      lodState,
      contourEnabled: interaction.contourEnabled,
    });
  }
}

init().catch((err) => {
  console.error('Failed to initialize terrain explorer:', err);
});
