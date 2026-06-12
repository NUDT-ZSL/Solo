import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { parseCSV, parseManualInput, buildPathData, type TrackPoint, type PathData } from './path';
import { buildTerrain, type TerrainResult } from './terrain';
import { buildSidebar, updateStats, updateChart, type UICallbacks } from './ui';

const ANIMATION_DURATION = 8000;
const CAMERA_HEIGHT_FLOAT_RATIO = 0.2;
const PATH_LINE_WIDTH = 0.15;
const MIN_FPS = 50;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;
let pathLine: THREE.Mesh | null = null;
let terrainGroup: THREE.Group | null = null;
let isAnimating = false;
let animationStartTime = 0;
let animationPathData: PathData | null = null;
let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 60;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.Fog(0x1a1a2e, 50, 500);

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
  camera.position.set(0, 50, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enabled = false;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 100, 50);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x442200, 0.3);
  scene.add(hemiLight);

  const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x333333);
  gridHelper.position.y = -0.1;
  scene.add(gridHelper);

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);

  const callbacks: UICallbacks = {
    onPointsReady: handlePointsReady,
  };
  buildSidebar(callbacks);

  animate();
}

function onWindowResize(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function handlePointsReady(text: string): void {
  let points: TrackPoint[];
  if (text.includes(',') && (text.includes('\n') || text.split('\n').length > 1)) {
    if (text.toLowerCase().includes('lat') || text.toLowerCase().includes('lng') || text.toLowerCase().includes('ele')) {
      points = parseCSV(text);
    } else {
      const csvPoints = parseCSV(text);
      const manualPoints = parseManualInput(text);
      points = csvPoints.length > manualPoints.length ? csvPoints : manualPoints;
    }
  } else {
    points = parseManualInput(text);
  }

  if (points.length < 5) {
    alert('请至少输入5个坐标点');
    return;
  }

  const pathData = buildPathData(points);
  animationPathData = pathData;
  updateStats(pathData);
  updateChart(pathData);
  renderPath(pathData);
  renderTerrain(pathData);
  startCameraAnimation(pathData);
}

function renderPath(pathData: PathData): void {
  if (pathLine) {
    scene.remove(pathLine);
    pathLine.geometry.dispose();
    (pathLine.material as THREE.Material).dispose();
  }

  if (pathData.points.length < 2) return;

  const curve = new THREE.CatmullRomCurve3(pathData.points, false, 'catmullrom', 0.5);
  const geometry = new THREE.TubeGeometry(curve, Math.max(pathData.points.length * 2, 128), PATH_LINE_WIDTH / 2, 8, false);

  const colors = new Float32Array(geometry.attributes.position.count * 3);
  const positions = geometry.attributes.position.array as Float32Array;

  const minEle = pathData.minEle;
  const maxEle = pathData.maxEle;
  const eleRange = maxEle - minEle || 1;

  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const y = positions[i * 3 + 1];
    const t = Math.max(0, Math.min(1, (y - minEle) / eleRange));
    const c = altitudeColor(t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 30,
    specular: 0x222222,
  });

  pathLine = new THREE.Mesh(geometry, material);
  pathLine.castShadow = true;
  pathLine.receiveShadow = true;
  scene.add(pathLine);

  const box = new THREE.Box3().setFromObject(pathLine);
  const center = new THREE.Vector3();
  box.getCenter(center);
  controls.target.copy(center);
}

function altitudeColor(t: number): THREE.Color {
  const color = new THREE.Color();
  if (t < 0.25) {
    const s = t / 0.25;
    color.setRGB(0, s, 1 - s);
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    color.setRGB(s, 1, 0);
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    color.setRGB(1, 1 - s, 0);
  } else {
    const s = (t - 0.75) / 0.25;
    color.setRGB(1, 0, 0);
  }
  return color;
}

function renderTerrain(pathData: PathData): void {
  if (terrainGroup) {
    scene.remove(terrainGroup);
    terrainGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }

  terrainGroup = new THREE.Group();

  const terrainResult: TerrainResult = buildTerrain(pathData);
  terrainResult.mesh.receiveShadow = true;
  terrainGroup.add(terrainResult.mesh);
  terrainGroup.add(terrainResult.contourLines);

  scene.add(terrainGroup);
}

function startCameraAnimation(pathData: PathData): void {
  if (pathData.points.length < 2) return;

  isAnimating = true;
  controls.enabled = false;
  animationStartTime = performance.now();
}

function updateCameraAnimation(now: number, pathData: PathData): void {
  if (!isAnimating) return;

  const elapsed = now - animationStartTime;
  const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

  const angle = progress * Math.PI * 2;

  const points = pathData.points;
  const startPoint = points[0];
  const maxEle = pathData.maxEle;

  const bbox = new THREE.Box3().setFromPoints(points);
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const radius = Math.max(size.x, size.z) * 1.2 + 20;

  const floatPhase = Math.sin(progress * Math.PI * 2) * CAMERA_HEIGHT_FLOAT_RATIO * maxEle;
  const baseHeight = maxEle * (1 + CAMERA_HEIGHT_FLOAT_RATIO);
  const cameraHeight = baseHeight + floatPhase;

  const initialAngle = Math.PI / 4;

  camera.position.x = startPoint.x + Math.cos(initialAngle + angle) * radius;
  camera.position.y = cameraHeight;
  camera.position.z = startPoint.z + Math.sin(initialAngle + angle) * radius;

  const lookTarget = new THREE.Vector3(
    startPoint.x + (center.x - startPoint.x) * progress,
    startPoint.y + (maxEle / 2 - startPoint.y) * progress,
    startPoint.z + (center.z - startPoint.z) * progress
  );

  camera.lookAt(lookTarget);

  if (progress >= 1) {
    isAnimating = false;
    controls.target.copy(center);
    controls.enabled = true;
    camera.position.set(
      center.x + radius,
      maxEle * 0.8,
      center.z + radius * 0.5
    );
    controls.update();
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = clock.getDelta();

  frameCount++;
  if (now - lastFpsUpdate >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
    if (currentFps < MIN_FPS) {
      console.warn(`FPS dropped below ${MIN_FPS}: ${currentFps}`);
    }
  }

  if (isAnimating && animationPathData) {
    updateCameraAnimation(now, animationPathData);
  } else {
    controls.update();
  }

  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init);

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  init();
}
