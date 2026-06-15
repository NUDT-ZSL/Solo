import * as THREE from 'three';
import { generateTerrainGeometry, createWater, updateWater, TerrainParams, getTerrainColor } from './terrain';
import { InteractionController } from './interaction';
import { GUIController, GUISettings, createInfoPanel } from './gui';

const TERRAIN_SIZE = 100;
const TERRAIN_RESOLUTION = 128;
const TRANSITION_DURATION = 500;

interface AppState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  interaction: InteractionController;
  gui: GUIController;
  infoPanel: ReturnType<typeof createInfoPanel>;
  currentHeights: number[];
  targetHeights: number[];
  currentMinHeight: number;
  currentMaxHeight: number;
  targetMinHeight: number;
  targetMaxHeight: number;
  isTransitioning: boolean;
  transitionStart: number;
  terrainParams: TerrainParams;
}

function init(): AppState {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a1a2e');
  scene.fog = new THREE.FogExp2('#1a1a2e', 0.008);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(50, 40, 50);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight1.position.set(
    Math.cos(-Math.PI / 6) * 100,
    Math.sin(-Math.PI / 6) * 100,
    50
  );
  dirLight1.castShadow = true;
  dirLight1.shadow.mapSize.width = 2048;
  dirLight1.shadow.mapSize.height = 2048;
  dirLight1.shadow.camera.near = 0.5;
  dirLight1.shadow.camera.far = 500;
  dirLight1.shadow.camera.left = -100;
  dirLight1.shadow.camera.right = 100;
  dirLight1.shadow.camera.top = 100;
  dirLight1.shadow.camera.bottom = -100;
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight2.position.set(
    Math.cos(Math.PI / 4) * 100,
    Math.sin(Math.PI / 4) * 100,
    -50
  );
  scene.add(dirLight2);

  const initialParams: TerrainParams = {
    size: TERRAIN_SIZE,
    resolution: TERRAIN_RESOLUTION,
    heightScale: 1.5,
    frequency: 0.02,
    colorBlend: 0.5
  };

  const { geometry, minHeight, maxHeight, heights } = generateTerrainGeometry(initialParams);

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    flatShading: false,
    shininess: 10
  });

  const terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  scene.add(terrainMesh);

  const waterLevel = minHeight + (maxHeight - minHeight) * 0.2;
  const waterMesh = createWater(TERRAIN_SIZE, waterLevel);
  scene.add(waterMesh);

  const interaction = new InteractionController({
    camera,
    renderer,
    target: new THREE.Vector3(0, (minHeight + maxHeight) / 2, 0)
  });

  const infoPanel = createInfoPanel();

  const initialGuiSettings: GUISettings = {
    heightScale: initialParams.heightScale,
    colorBlend: initialParams.colorBlend,
    fogDensity: 0.008
  };

  let state: Partial<AppState> = {};

  const gui = new GUIController(initialGuiSettings, (settings) => {
    const s = state as AppState;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = settings.fogDensity;
    }

    s.terrainParams.heightScale = settings.heightScale;
    s.terrainParams.colorBlend = settings.colorBlend;

    startTerrainTransition(s);
  });

  state = {
    scene,
    camera,
    renderer,
    terrainMesh,
    waterMesh,
    interaction,
    gui,
    infoPanel,
    currentHeights: [...heights],
    targetHeights: [...heights],
    currentMinHeight: minHeight,
    currentMaxHeight: maxHeight,
    targetMinHeight: minHeight,
    targetMaxHeight: maxHeight,
    isTransitioning: false,
    transitionStart: 0,
    terrainParams: initialParams
  };

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return state as AppState;
}

function startTerrainTransition(state: AppState): void {
  const { geometry, minHeight, maxHeight, heights } = generateTerrainGeometry(state.terrainParams);

  state.targetHeights = heights;
  state.targetMinHeight = minHeight;
  state.targetMaxHeight = maxHeight;
  state.isTransitioning = true;
  state.transitionStart = performance.now();

  geometry.dispose();
}

function updateTerrainTransition(state: AppState, currentTime: number): void {
  if (!state.isTransitioning) return;

  const elapsed = currentTime - state.transitionStart;
  const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
  const smoothProgress = progress * progress * (3 - 2 * progress);

  const positions = state.terrainMesh.geometry.attributes.position;
  const colors = state.terrainMesh.geometry.attributes.color;
  const posArray = positions.array as Float32Array;
  const colorArray = colors.array as Float32Array;

  const lerpMin = state.currentMinHeight + (state.targetMinHeight - state.currentMinHeight) * smoothProgress;
  const lerpMax = state.currentMaxHeight + (state.targetMaxHeight - state.currentMaxHeight) * smoothProgress;

  for (let i = 0; i < state.currentHeights.length; i++) {
    const newHeight = state.currentHeights[i] + (state.targetHeights[i] - state.currentHeights[i]) * smoothProgress;
    posArray[i * 3 + 1] = newHeight;

    const color = getTerrainColor(newHeight, lerpMin, lerpMax, state.terrainParams.colorBlend);
    colorArray[i * 3] = color.r;
    colorArray[i * 3 + 1] = color.g;
    colorArray[i * 3 + 2] = color.b;
  }

  positions.needsUpdate = true;
  colors.needsUpdate = true;
  state.terrainMesh.geometry.computeVertexNormals();

  const waterLevel = lerpMin + (lerpMax - lerpMin) * 0.2;
  state.waterMesh.position.y = waterLevel;

  if (progress >= 1) {
    state.isTransitioning = false;
    state.currentHeights = [...state.targetHeights];
    state.currentMinHeight = state.targetMinHeight;
    state.currentMaxHeight = state.targetMaxHeight;
  }
}

function animate(state: AppState): void {
  const clock = new THREE.Clock();
  let lastFpsUpdate = 0;
  let frameCount = 0;

  function loop(currentTime: number): void {
    requestAnimationFrame(loop);

    const deltaTime = clock.getDelta();

    state.interaction.update(deltaTime);

    updateTerrainTransition(state, currentTime);

    updateWater(state.waterMesh, currentTime * 0.001);

    state.renderer.render(state.scene, state.camera);

    frameCount++;
    if (currentTime - lastFpsUpdate >= 1000) {
      const fps = (frameCount * 1000) / (currentTime - lastFpsUpdate);
      state.infoPanel.updateFPS(fps);
      frameCount = 0;
      lastFpsUpdate = currentTime;
    }

    const pos = state.interaction.getCameraPosition();
    state.infoPanel.updatePosition(pos.x, pos.y, pos.z);
  }

  requestAnimationFrame(loop);
}

const appState = init();
animate(appState);
