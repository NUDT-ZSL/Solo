import * as THREE from 'three';
import { loadTerrainFromCSV, type TerrainObject } from './terrainLoader';
import {
  createTerrainRenderable,
  addMediumLOD,
  updateLOD,
  getHighestMesh,
  type TerrainRenderable,
} from './terrainRenderer';
import { createCameraController, type CameraController } from './cameraController';
import { createInteractionManager, type InteractionManager, type ProbeResult } from './interaction';
import { createContourGenerator, type ContourGenerator } from './contour';
import { createUIPanel, type UIPanelData } from './uiPanel';

const CSV_URL = '/data/terrain_1024.csv';
const SCALE_XZ = 500;
const SCALE_Y = 80;
const LOD_VERTEX_THRESHOLD = 1_000_000;
const FPS_LOW_THRESHOLD = 35;
const FPS_HIGH_THRESHOLD = 55;

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let cameraCtrl: CameraController;
let interaction: InteractionManager;
let contourGen: ContourGenerator;
let terrainRenderable: TerrainRenderable;
let highTerrain: TerrainObject;
let mediumTerrain: TerrainObject | null = null;
let uiPanel: ReturnType<typeof createUIPanel>;
let sceneContainer: HTMLElement;

let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;
let lastLODLevel: 'high' | 'medium' | 'low' = 'high';
let lodStableFrames = 0;
let autoLODEnabled = true;

async function init() {
  sceneContainer = document.getElementById('scene-container')!;
  const infoPanel = document.getElementById('info-panel')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d1a);
  scene.fog = new THREE.Fog(0x0d0d1a, 450, 900);

  cameraCtrl = createCameraController(
    sceneContainer.clientWidth,
    sceneContainer.clientHeight,
    sceneContainer
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  sceneContainer.insertBefore(renderer.domElement, sceneContainer.firstChild);

  interaction = createInteractionManager(scene);

  contourGen = createContourGenerator(scene);

  uiPanel = createUIPanel(infoPanel, {
    onResetCamera: () => {
      cameraCtrl.reset();
    },
    onToggleContours: (enabled: boolean) => {
      contourGen.setVisible(enabled);
      if (enabled && contourGen.lines.length === 0) {
        contourGen.generate(highTerrain.data, contourGen.interval);
      }
    },
    onContourIntervalChange: (interval: number) => {
      contourGen.interval = interval;
      if (contourGen.enabled) {
        contourGen.generate(highTerrain.data, interval);
      }
    },
  });

  highTerrain = await loadTerrainFromCSV(CSV_URL, SCALE_XZ, SCALE_Y, 1);
  terrainRenderable = createTerrainRenderable(highTerrain);
  scene.add(terrainRenderable.group);

  const mesh = getHighestMesh(terrainRenderable);
  if (mesh) {
    interaction.setTerrainMesh(mesh, highTerrain.data);
  }

  if (highTerrain.data.vertexCount > LOD_VERTEX_THRESHOLD) {
    mediumTerrain = await loadTerrainFromCSV(CSV_URL, SCALE_XZ, SCALE_Y, 2);
    addMediumLOD(terrainRenderable, mediumTerrain, 250);
    autoLODEnabled = true;
    lastLODLevel = 'medium';
  }

  sceneContainer.addEventListener('mousemove', (e) => {
    interaction.updateMousePosition(e, sceneContainer);
  });

  sceneContainer.addEventListener('mouseleave', () => {
    interaction.setMarkerVisible(false);
    uiPanel.hideProbe();
  });

  window.addEventListener('resize', () => {
    const w = sceneContainer.clientWidth;
    const h = sceneContainer.clientHeight;
    cameraCtrl.resize(w, h);
    renderer.setSize(w, h);
  });

  animate();
}

function updateProbeTooltip(probe: ProbeResult): void {
  if (!probe.isValid) {
    uiPanel.hideProbe();
    return;
  }

  const projected = probe.position.clone().project(cameraCtrl.camera);
  const rect = renderer.domElement.getBoundingClientRect();
  const sx = (projected.x * 0.5 + 0.5) * rect.width;
  const sy = (-projected.y * 0.5 + 0.5) * rect.height;

  const tooltip = document.getElementById('probe-tooltip');
  if (tooltip) {
    tooltip.style.left = `${Math.min(sx + 16, rect.width - 160)}px`;
    tooltip.style.top = `${Math.max(sy - 30, 10)}px`;
  }

  uiPanel.updateProbe(probe.position.x, probe.position.y, probe.position.z, probe.elevation);
}

function checkAutoLOD(fps: number): void {
  if (!autoLODEnabled) return;

  lodStableFrames++;
  if (lodStableFrames < 60) return;

  const current = terrainRenderable.currentLOD;

  if (fps < FPS_LOW_THRESHOLD && current === 'high' && mediumTerrain) {
    terrainRenderable.lod.levels[0].distance = 300;
    terrainRenderable.lod.levels[1].distance = 0;
    lodStableFrames = 0;
    uiPanel.showLODIndicator('medium', mediumTerrain.data.vertexCount);
  } else if (fps > FPS_HIGH_THRESHOLD && current === 'medium' && mediumTerrain) {
    terrainRenderable.lod.levels[0].distance = 0;
    terrainRenderable.lod.levels[1].distance = 300;
    lodStableFrames = 0;
    uiPanel.showLODIndicator('high', highTerrain.data.vertexCount);
  }
}

function animate() {
  requestAnimationFrame(animate);

  cameraCtrl.update();

  const lodLevel = updateLOD(terrainRenderable, cameraCtrl.camera);
  if (lodLevel !== lastLODLevel) {
    lastLODLevel = lodLevel;
    const vc = lodLevel === 'high'
      ? highTerrain.data.vertexCount
      : mediumTerrain?.data.vertexCount || highTerrain.data.vertexCount;
    uiPanel.showLODIndicator(lodLevel, vc);
  }

  const probeResult = interaction.probeTerrain(cameraCtrl.camera);
  updateProbeTooltip(probeResult);

  renderer.render(scene, cameraCtrl.camera);

  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    currentFps = Math.round(frameCount * 1000 / (now - lastFpsTime));
    frameCount = 0;
    lastFpsTime = now;

    checkAutoLOD(currentFps);

    const uiData: UIPanelData = {
      cameraX: cameraCtrl.camera.position.x,
      cameraY: cameraCtrl.camera.position.y,
      cameraZ: cameraCtrl.camera.position.z,
      minElevation: highTerrain.data.minElevation,
      maxElevation: highTerrain.data.maxElevation,
      vertexCount: lastLODLevel === 'high'
        ? highTerrain.data.vertexCount
        : mediumTerrain?.data.vertexCount || highTerrain.data.vertexCount,
      fps: currentFps,
      lodLevel: lastLODLevel,
      contourEnabled: contourGen.enabled,
      contourInterval: contourGen.interval,
    };
    uiPanel.update(uiData);
  } else if (frameCount % 6 === 0) {
    const uiData: UIPanelData = {
      cameraX: cameraCtrl.camera.position.x,
      cameraY: cameraCtrl.camera.position.y,
      cameraZ: cameraCtrl.camera.position.z,
      minElevation: highTerrain.data.minElevation,
      maxElevation: highTerrain.data.maxElevation,
      vertexCount: lastLODLevel === 'high'
        ? highTerrain.data.vertexCount
        : mediumTerrain?.data.vertexCount || highTerrain.data.vertexCount,
      fps: currentFps,
      lodLevel: lastLODLevel,
      contourEnabled: contourGen.enabled,
      contourInterval: contourGen.interval,
    };
    uiPanel.update(uiData);
  }
}

init().catch((err) => {
  console.error('Failed to initialize terrain explorer:', err);
});
