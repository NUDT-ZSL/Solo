import * as THREE from 'three';
import {
  generateTerrainGeometry,
  createWater,
  updateWater,
  updateWaterLevel,
  TerrainParams,
  getWaterLevel,
  TerrainData
} from './terrain';
import { InteractionController } from './interaction';
import { GUIController, GUISettings, createInfoPanel } from './gui';
import { tweenManager, Easing, createFPSMonitor } from './animation';

const TERRAIN_SIZE = 100;
const TERRAIN_RESOLUTION = 128;
const TRANSITION_DURATION = 500;

interface TransitionState {
  startHeights: Float32Array;
  endHeights: Float32Array;
  startMin: number;
  startMax: number;
  endMin: number;
  endMax: number;
  startColors: Float32Array;
  endColors: Float32Array;
  cancelTween: (() => void) | null;
}

interface AppState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  interaction: InteractionController;
  gui: GUIController;
  infoPanel: ReturnType<typeof createInfoPanel>;
  terrainParams: TerrainParams;
  transition: TransitionState;
  fpsMonitor: ReturnType<typeof createFPSMonitor>;
  rebuildCount: number;
}

function createTransitionState(initial: TerrainData): TransitionState {
  const startHeights = new Float32Array(initial.heights);
  const startColors = new Float32Array(initial.colors);
  return {
    startHeights,
    endHeights: new Float32Array(initial.heights),
    startMin: initial.minHeight,
    startMax: initial.maxHeight,
    endMin: initial.minHeight,
    endMax: initial.maxHeight,
    startColors,
    endColors: new Float32Array(initial.colors),
    cancelTween: null
  };
}

function beginTerrainTransition(state: AppState): void {
  const newData = generateTerrainGeometry(state.terrainParams);

  const posArr = state.terrainMesh.geometry.attributes.position.array as Float32Array;
  const vertexCount = posArr.length / 3;
  for (let i = 0; i < vertexCount; i++) {
    state.transition.startHeights[i] = posArr[i * 3 + 1];
  }

  const srcColors = state.terrainMesh.geometry.attributes.color.array as Float32Array;
  state.transition.startColors.set(srcColors);

  state.transition.endHeights.set(newData.heights);
  state.transition.endColors.set(newData.colors);
  state.transition.startMin = state.transition.endMin;
  state.transition.startMax = state.transition.endMax;
  state.transition.endMin = newData.minHeight;
  state.transition.endMax = newData.maxHeight;

  if (state.transition.cancelTween) {
    state.transition.cancelTween();
    state.transition.cancelTween = null;
  }

  state.fpsMonitor.reset();
  state.rebuildCount++;

  const posAttr = state.terrainMesh.geometry.attributes.position;
  const colAttr = state.terrainMesh.geometry.attributes.color;
  const colArr = colAttr.array as Float32Array;

  state.transition.cancelTween = tweenManager.start({
    duration: TRANSITION_DURATION,
    easing: Easing.SmoothStep,
    onUpdate: (_progress, eased) => {
      const lerpMin = state.transition.startMin + (state.transition.endMin - state.transition.startMin) * eased;
      const lerpMax = state.transition.startMax + (state.transition.endMax - state.transition.startMax) * eased;

      for (let i = 0; i < vertexCount; i++) {
        const h = state.transition.startHeights[i] +
          (state.transition.endHeights[i] - state.transition.startHeights[i]) * eased;
        posArr[i * 3 + 1] = h;

        const sr = state.transition.startColors[i * 3];
        const sg = state.transition.startColors[i * 3 + 1];
        const sb = state.transition.startColors[i * 3 + 2];
        const er = state.transition.endColors[i * 3];
        const eg = state.transition.endColors[i * 3 + 1];
        const eb = state.transition.endColors[i * 3 + 2];
        colArr[i * 3] = sr + (er - sr) * eased;
        colArr[i * 3 + 1] = sg + (eg - sg) * eased;
        colArr[i * 3 + 2] = sb + (eb - sb) * eased;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      state.terrainMesh.geometry.computeVertexNormals();

      const waterY = getWaterLevel(lerpMin, lerpMax);
      updateWaterLevel(state.waterMesh, waterY);
    },
    onComplete: () => {
      state.transition.cancelTween = null;
      const minFps = state.fpsMonitor.getMinFPS();
      const maxFps = state.fpsMonitor.getMaxFPS();
      console.log(`[Terrain Rebuild #${state.rebuildCount}] FPS min=${minFps.toFixed(1)} max=${maxFps.toFixed(1)}`);
    }
  });

  newData.geometry.dispose();
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
  const angle1Rad = (-30 * Math.PI) / 180;
  dirLight1.position.set(
    Math.cos(angle1Rad) * 100,
    Math.sin(angle1Rad) * 100,
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
  const angle2Rad = (45 * Math.PI) / 180;
  dirLight2.position.set(
    Math.cos(angle2Rad) * 100,
    Math.sin(angle2Rad) * 100,
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

  const terrainData = generateTerrainGeometry(initialParams);

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    flatShading: false,
    shininess: 10
  });

  const terrainMesh = new THREE.Mesh(terrainData.geometry, material);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  scene.add(terrainMesh);

  const waterY = getWaterLevel(terrainData.minHeight, terrainData.maxHeight);
  const waterMesh = createWater(TERRAIN_SIZE, waterY);
  scene.add(waterMesh);

  const interaction = new InteractionController({
    camera,
    renderer,
    target: new THREE.Vector3(0, (terrainData.minHeight + terrainData.maxHeight) / 2, 0)
  });

  const infoPanel = createInfoPanel();
  const fpsMonitor = createFPSMonitor(45);

  fpsMonitor.onLowFPS((fps) => {
    console.warn(`[Low FPS] ${fps.toFixed(1)}fps detected`);
  });

  const initialGuiSettings: GUISettings = {
    heightScale: initialParams.heightScale,
    colorBlend: initialParams.colorBlend,
    fogDensity: 0.008
  };

  const transition = createTransitionState(terrainData);

  const state: Partial<AppState> = {};

  const gui = new GUIController(initialGuiSettings, (settings) => {
    const s = state as AppState;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = settings.fogDensity;
    }

    s.terrainParams.heightScale = settings.heightScale;
    s.terrainParams.colorBlend = settings.colorBlend;

    beginTerrainTransition(s);
  });

  Object.assign(state, {
    scene,
    camera,
    renderer,
    terrainMesh,
    waterMesh,
    interaction,
    gui,
    infoPanel,
    terrainParams: initialParams,
    transition,
    fpsMonitor,
    rebuildCount: 0
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return state as AppState;
}

function animate(state: AppState): void {
  const clock = new THREE.Clock();

  function loop(currentTime: number): void {
    requestAnimationFrame(loop);

    state.fpsMonitor.beginFrame();

    const deltaTime = clock.getDelta();

    state.interaction.update(deltaTime);

    updateWater(state.waterMesh, currentTime * 0.001);

    state.renderer.render(state.scene, state.camera);

    state.fpsMonitor.endFrame();
    state.infoPanel.updateFPS(state.fpsMonitor.getFPS());

    const pos = state.interaction.getCameraPosition();
    state.infoPanel.updatePosition(pos.x, pos.y, pos.z);
  }

  requestAnimationFrame(loop);
}

const appState = init();
animate(appState);
