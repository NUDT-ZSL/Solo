import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TreeGenerator } from './TreeGenerator';
import { ControlPanel, TreeParams } from './ControlPanel';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let tree: TreeGenerator;
let controlPanel: ControlPanel;
let ambientLight: THREE.AmbientLight;
let clock: THREE.Clock;
let fpsCounter: HTMLElement;
let frameCount: number = 0;
let lastFpsTime: number = 0;

const GRID_RADIUS = 10;

function init(): void {
  const container = document.getElementById('canvas-container')!;
  const loadingEl = document.getElementById('loading')!;

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(6, 4, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI * 2 / 3;
  controls.target.set(0, 2, 0);
  controls.minDistance = 3;
  controls.maxDistance = 30;

  createGroundGrid();
  createLights();

  clock = new THREE.Clock();

  fpsCounter = document.getElementById('fps-counter')!;

  tree = new TreeGenerator(scene, {
    depth: 5,
    angleRange: 30,
    trunkHeight: 2,
    trunkRadius: 0.15,
    lengthRatio: 0.65,
    radiusRatio: 0.7,
    minBranches: 2,
    maxBranches: 4
  });

  const initialParams: TreeParams = {
    depth: 5,
    angleRange: 30,
    trunkHeight: 2,
    windEnabled: false,
    windAmplitude: 0.15
  };

  tree.generate();

  controlPanel = new ControlPanel(
    initialParams,
    onParamsChange,
    onWindToggle
  );

  window.addEventListener('resize', onWindowResize);

  setTimeout(() => {
    loadingEl.classList.add('hidden');
  }, 300);

  animate();
}

function createGroundGrid(): void {
  const gridGroup = new THREE.Group();

  const gridDivisions = 40;
  const gridSize = GRID_RADIUS * 2;

  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x4A5568, 0x4A5568);
  const gridMaterial = gridHelper.material as THREE.Material;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.2;
  gridGroup.add(gridHelper);

  const circleGeo = new THREE.RingGeometry(0, GRID_RADIUS, 64);
  const circleMat = new THREE.MeshBasicMaterial({
    color: 0x0B132B,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  const ground = new THREE.Mesh(circleGeo, circleMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001;
  gridGroup.add(ground);

  scene.add(gridGroup);
}

function createLights(): void {
  ambientLight = new THREE.AmbientLight(0xFFE4B5, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
  dirLight.position.set(5, 10, 7);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x8888FF, 0.3);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);
}

function onParamsChange(params: TreeParams): void {
  tree.setConfig({
    depth: params.depth,
    angleRange: params.angleRange,
    trunkHeight: params.trunkHeight
  });
  tree.regrow();
}

function onWindToggle(enabled: boolean, amplitude: number): void {
  tree.setWind(enabled, amplitude);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateFPS(delta: number): void {
  frameCount++;
  lastFpsTime += delta;
  if (lastFpsTime >= 0.5) {
    const fps = Math.round(frameCount / lastFpsTime);
    fpsCounter.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastFpsTime = 0;
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  controls.update();

  const lightAngle = elapsed * 0.1;
  ambientLight.position.set(
    Math.sin(lightAngle) * 2,
    1,
    Math.cos(lightAngle) * 2
  );

  tree.update(delta);

  updateFPS(delta);

  renderer.render(scene, camera);
}

init();
