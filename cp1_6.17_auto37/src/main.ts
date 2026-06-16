import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { calculateTemperature, type HeatParams, getGridSize } from './heatModel';
import { SceneUpdater, type BuildingCell, type GroundCell } from './sceneUpdater';

const GRID_SIZE = getGridSize();
const CELL_SIZE = 20;
const BUILDING_MIN_HEIGHT = 10;
const BUILDING_MAX_HEIGHT = 30;
const BUILDING_MIN_WIDTH = 8;
const BUILDING_MAX_WIDTH = 12;

const FLOAT_AMPLITUDE = 0.1;
const FLOAT_PERIOD = 2;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;

let buildings: BuildingCell[][] = [];
let groundPlanes: GroundCell[][] = [];
let sceneUpdater: SceneUpdater;

let currentParams: HeatParams = {
  buildingDensity: 0.5,
  greeneryRate: 0.3,
  surfaceAlbedo: 0.5
};

let tempBarFill: HTMLElement;
let tempMaxLabel: HTMLElement;
let tempMinLabel: HTMLElement;
let densityValue: HTMLElement;
let greeneryValue: HTMLElement;
let albedoValue: HTMLElement;

let currentMinTemp = 20;
let currentMaxTemp = 35;
let targetMinTemp = 20;
let targetMaxTemp = 35;
let tempBarTransitionProgress = 1;
const TEMP_BAR_TRANSITION_DURATION = 0.2;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    throw new Error('Canvas container not found');
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0D1117');

  camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(80, 70, 80);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 40;
  controls.maxDistance = 200;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.target.set(0, 0, 0);

  clock = new THREE.Clock();

  setupLights();
  createCityGrid();
  addGridHelper();

  sceneUpdater = new SceneUpdater(buildings, groundPlanes, GRID_SIZE);

  setupUI();

  window.addEventListener('resize', onWindowResize);

  updateTemperature();
  animate();
}

function setupLights(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(50, 80, 50);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -80;
  directionalLight.shadow.camera.right = 80;
  directionalLight.shadow.camera.top = 80;
  directionalLight.shadow.camera.bottom = -80;
  scene.add(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1f, 0.3);
  scene.add(hemisphereLight);
}

function createCityGrid(): void {
  const offset = (GRID_SIZE - 1) * CELL_SIZE / 2;

  for (let i = 0; i < GRID_SIZE; i++) {
    buildings[i] = [];
    groundPlanes[i] = [];

    for (let j = 0; j < GRID_SIZE; j++) {
      const x = j * CELL_SIZE - offset;
      const z = i * CELL_SIZE - offset;

      const groundGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.95, CELL_SIZE * 0.95);
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x81C784,
        roughness: 0.85,
        metalness: 0.05
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(x, 0, z);
      ground.receiveShadow = true;
      scene.add(ground);
      groundPlanes[i][j] = { mesh: ground };

      const buildingWidth = BUILDING_MIN_WIDTH + Math.random() * (BUILDING_MAX_WIDTH - BUILDING_MIN_WIDTH);
      const buildingDepth = BUILDING_MIN_WIDTH + Math.random() * (BUILDING_MAX_WIDTH - BUILDING_MIN_WIDTH);
      const buildingHeight = BUILDING_MIN_HEIGHT + Math.random() * (BUILDING_MAX_HEIGHT - BUILDING_MIN_HEIGHT);

      const buildingGeometry = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0x1B5E20,
        roughness: 0.7,
        metalness: 0.1
      });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.set(x, buildingHeight / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);

      buildings[i][j] = {
        mesh: building,
        baseY: buildingHeight / 2
      };
    }
  }
}

function addGridHelper(): void {
  const gridSize = GRID_SIZE * CELL_SIZE;
  const gridDivisions = GRID_SIZE;
  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x21262D, 0x21262D);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

function setupUI(): void {
  const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
  const greenerySlider = document.getElementById('greenery-slider') as HTMLInputElement;
  const albedoSlider = document.getElementById('albedo-slider') as HTMLInputElement;

  densityValue = document.getElementById('density-value')!;
  greeneryValue = document.getElementById('greenery-value')!;
  albedoValue = document.getElementById('albedo-value')!;

  tempBarFill = document.getElementById('temp-bar-fill')!;
  tempMaxLabel = document.getElementById('temp-max')!;
  tempMinLabel = document.getElementById('temp-min')!;

  densitySlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    currentParams.buildingDensity = value;
    updateValueDisplay(densityValue, value.toFixed(1));
    updateTemperature();
  });

  greenerySlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    currentParams.greeneryRate = value;
    updateValueDisplay(greeneryValue, value.toFixed(2));
    updateTemperature();
  });

  albedoSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    currentParams.surfaceAlbedo = value;
    updateValueDisplay(albedoValue, value.toFixed(1));
    updateTemperature();
  });
}

function updateValueDisplay(element: HTMLElement, value: string): void {
  element.textContent = value;
  element.classList.remove('bump');
  void element.offsetWidth;
  element.classList.add('bump');
  setTimeout(() => {
    element.classList.remove('bump');
  }, 200);
}

function updateTemperature(): void {
  const result = calculateTemperature(currentParams);

  sceneUpdater.updateTemperatures(result.matrix, result.minTemp, result.maxTemp);

  targetMinTemp = result.minTemp;
  targetMaxTemp = result.maxTemp;
  tempBarTransitionProgress = 0;

  updateTempLabel(tempMaxLabel, result.maxTemp);
  updateTempLabel(tempMinLabel, result.minTemp);
}

function updateTempLabel(element: HTMLElement, temp: number): void {
  element.textContent = `${temp.toFixed(1)}°`;
  element.classList.remove('bump');
  void element.offsetWidth;
  element.classList.add('bump');
  setTimeout(() => {
    element.classList.remove('bump');
  }, 200);
}

function updateTempBar(deltaTime: number): void {
  if (tempBarTransitionProgress < 1) {
    tempBarTransitionProgress += deltaTime / TEMP_BAR_TRANSITION_DURATION;
    if (tempBarTransitionProgress > 1) {
      tempBarTransitionProgress = 1;
    }

    const t = elasticOut(tempBarTransitionProgress);
    currentMinTemp = currentMinTemp + (targetMinTemp - currentMinTemp) * t;
    currentMaxTemp = currentMaxTemp + (targetMaxTemp - currentMaxTemp) * t;
  }

  const overallMin = 18;
  const overallMax = 40;
  const overallRange = overallMax - overallMin;

  const minRatio = (currentMinTemp - overallMin) / overallRange;
  const maxRatio = (currentMaxTemp - overallMin) / overallRange;

  const barHeight = (maxRatio - minRatio) * 100;
  const barBottom = minRatio * 100;

  tempBarFill.style.height = `${Math.max(5, barHeight)}%`;
  tempBarFill.style.bottom = `${barBottom}%`;
}

function elasticOut(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function updateBuildingFloat(time: number): void {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const building = buildings[i][j];
      const phase = (i + j) * 0.3;
      const offset = Math.sin((time / FLOAT_PERIOD) * Math.PI * 2 + phase) * FLOAT_AMPLITUDE;
      building.mesh.position.y = building.baseY + offset;
    }
  }
}

function onWindowResize(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  controls.update();
  sceneUpdater.update(deltaTime);
  updateBuildingFloat(elapsedTime);
  updateTempBar(deltaTime);

  renderer.render(scene, camera);
}

init();
