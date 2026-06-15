import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createStrata,
  getTerrainHeightArray,
  depthToWorld,
  getStratumAtPoint,
  getStratumStats,
  percentToWorldX,
  WORLD_SIZE
} from './geology';
import type { Stratum } from './geology';
import {
  initUI,
  showInfoPanel,
  updateStatsPanel,
  updateSelectedStratumUI
} from './ui';

const STRATUM_SEGMENTS = 64;
const MAX_PARTICLES = 2000;
const HIGHLIGHT_COLOR = new THREE.Color(0xFFD700);
const BREATH_MIN = 0.8;
const BREATH_MAX = 1.0;
const BREATH_PERIOD = 0.5;
const HIGHLIGHT_DURATION = 0.1;
const CAMERA_DISTANCE = 18;

interface StratumMeshGroup {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  originalColor: THREE.Color;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  colorLerpT: number;
  isHighlighted: boolean;
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let strata: Stratum[];
let stratumMeshGroups: StratumMeshGroup[] = [];
let particleSystems: THREE.Points[] = [];
let cutPlaneMesh: THREE.Mesh | null = null;
let cutPlaneHelper: THREE.LineSegments | null = null;
let gridHelper: THREE.GridHelper;
let selectedStratumId: number | null = null;
let animationTime = 0;
let canvas: HTMLCanvasElement;
let isDragging = false;
let downX = 0;
let downY = 0;
let downTime = 0;

interface ColorTransition {
  from: THREE.Color;
  to: THREE.Color;
  elapsed: number;
  duration: number;
}
const colorTransitions: Map<number, ColorTransition> = new Map();

function main(): void {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element #root not found');
    return;
  }

  strata = createStrata();
  initThreeScene(root);
  createSceneContent();
  initUI(root, strata, {
    onStratumSelect: handleStratumSelect,
    onDepthRangeChange: handleDepthRangeChange,
    onCutChange: handleCutChange,
    onResetView: handleResetView,
    onToggleFilter: () => {}
  });

  animate();
}

function initThreeScene(root: HTMLElement): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0D1117);
  scene.fog = new THREE.Fog(0x0D1117, 25, 60);

  const fov = 50;
  const aspect = root.clientWidth / root.clientHeight;
  camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  const initAngle = Math.PI / 4;
  camera.position.set(
    Math.cos(initAngle) * CAMERA_DISTANCE,
    CAMERA_DISTANCE * 0.75,
    Math.sin(initAngle) * CAMERA_DISTANCE
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(root.clientWidth, root.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  root.appendChild(canvas);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.0;
  controls.panSpeed = 0.8;
  controls.minDistance = 6;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.target.set(0, -strata[strata.length - 1].depthBottom / 2, 0);

  raycaster = new THREE.Raycaster();
  raycaster.params.Mesh = { threshold: 0.01 };
  mouse = new THREE.Vector2();

  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(10, 15, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 15;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 60;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.25);
  fillLight.position.set(-8, 6, -6);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0x6699ff, 0.6, 30);
  rimLight.position.set(0, 0, -12);
  scene.add(rimLight);

  window.addEventListener('resize', onWindowResize);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
}

function createSceneContent(): void {
  const totalDepth = strata[strata.length - 1].depthBottom;

  gridHelper = new THREE.GridHelper(
    WORLD_SIZE * 1.2,
    24,
    0x1E3A5F,
    0x162844
  );
  gridHelper.position.y = depthToWorld(totalDepth) - 0.01;
  scene.add(gridHelper);

  const frameEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(WORLD_SIZE, totalDepth, WORLD_SIZE)),
    new THREE.LineBasicMaterial({ color: 0x1E3A5F, transparent: true, opacity: 0.4 })
  );
  frameEdges.position.y = depthToWorld(totalDepth / 2);
  scene.add(frameEdges);

  for (const s of strata) {
    createStratumMesh(s);
  }

  createCutPlane();
  createParticles();
}

function createStratumMesh(s: Stratum): void {
  const geometry = new THREE.PlaneGeometry(
    WORLD_SIZE,
    WORLD_SIZE,
    STRATUM_SEGMENTS,
    STRATUM_SEGMENTS
  );
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const topHeights = getTerrainHeightArray(
    STRATUM_SEGMENTS,
    STRATUM_SEGMENTS,
    s.seed,
    s.roughness
  );
  const bottomHeights = getTerrainHeightArray(
    STRATUM_SEGMENTS,
    STRATUM_SEGMENTS,
    s.seed + 3.1,
    s.roughness * 0.8
  );

  const half = WORLD_SIZE / 2;
  const stepX = WORLD_SIZE / STRATUM_SEGMENTS;
  const stepZ = WORLD_SIZE / STRATUM_SEGMENTS;
  const gridN = STRATUM_SEGMENTS + 1;
  const idxMap: number[][] = [];

  for (let v = 0; v < posAttr.count; v++) {
    const x = posAttr.getX(v);
    const z = posAttr.getZ(v);
    const ix = Math.round((x + half) / stepX);
    const iz = Math.round((z + half) / stepZ);
    const safeIx = Math.max(0, Math.min(STRATUM_SEGMENTS, ix));
    const safeIz = Math.max(0, Math.min(STRATUM_SEGMENTS, iz));
    const noiseTop = topHeights[safeIz * gridN + safeIx];
    posAttr.setY(v, depthToWorld(s.depthTop) - noiseTop);
    if (!idxMap[safeIz]) idxMap[safeIz] = [];
    idxMap[safeIz][safeIx] = v;
  }

  const vertexCount = posAttr.count;
  const indexCount = geometry.index ? geometry.index.count : 0;
  const bottomIndices: number[] = [];
  const sideIndices: number[] = [];
  const topIndices: number[] = [];

  if (geometry.index) {
    for (let i = 0; i < indexCount; i++) {
      topIndices.push(geometry.index.getX(i));
    }
  }

  const bottomStartIdx = vertexCount;
  for (let iz = 0; iz <= STRATUM_SEGMENTS; iz++) {
    for (let ix = 0; ix <= STRATUM_SEGMENTS; ix++) {
      const noiseBot = bottomHeights[iz * gridN + ix] * 0.3;
      const x = ix * stepX - half;
      const z = iz * stepZ - half;
      posAttr.setXYZ(bottomStartIdx + iz * gridN + ix, x, depthToWorld(s.depthBottom) - noiseBot, z);
    }
  }

  for (let iz = 0; iz < STRATUM_SEGMENTS; iz++) {
    for (let ix = 0; ix < STRATUM_SEGMENTS; ix++) {
      const i00 = bottomStartIdx + iz * gridN + ix;
      const i10 = bottomStartIdx + iz * gridN + ix + 1;
      const i01 = bottomStartIdx + (iz + 1) * gridN + ix;
      const i11 = bottomStartIdx + (iz + 1) * gridN + ix + 1;
      bottomIndices.push(i00, i11, i10);
      bottomIndices.push(i00, i01, i11);
    }
  }

  for (let ix = 0; ix < STRATUM_SEGMENTS; ix++) {
    const t00 = idxMap[0][ix];
    const t10 = idxMap[0][ix + 1];
    const b00 = bottomStartIdx + 0 * gridN + ix;
    const b10 = bottomStartIdx + 0 * gridN + ix + 1;
    sideIndices.push(t00, b00, t10);
    sideIndices.push(t10, b00, b10);

    const t01 = idxMap[STRATUM_SEGMENTS][ix];
    const t11 = idxMap[STRATUM_SEGMENTS][ix + 1];
    const b01 = bottomStartIdx + STRATUM_SEGMENTS * gridN + ix;
    const b11 = bottomStartIdx + STRATUM_SEGMENTS * gridN + ix + 1;
    sideIndices.push(t01, t11, b01);
    sideIndices.push(t11, b11, b01);
  }

  for (let iz = 0; iz < STRATUM_SEGMENTS; iz++) {
    const t00 = idxMap[iz][0];
    const t01 = idxMap[iz + 1][0];
    const b00 = bottomStartIdx + iz * gridN + 0;
    const b01 = bottomStartIdx + (iz + 1) * gridN + 0;
    sideIndices.push(t00, t01, b00);
    sideIndices.push(t01, b01, b00);

    const t10 = idxMap[iz][STRATUM_SEGMENTS];
    const t11 = idxMap[iz + 1][STRATUM_SEGMENTS];
    const b10 = bottomStartIdx + iz * gridN + STRATUM_SEGMENTS;
    const b11 = bottomStartIdx + (iz + 1) * gridN + STRATUM_SEGMENTS;
    sideIndices.push(t10, b10, t11);
    sideIndices.push(t11, b10, b11);
  }

  const allIndices = [...topIndices, ...bottomIndices, ...sideIndices];
  posAttr.needsUpdate = true;

  geometry.setIndex(allIndices);
  geometry.computeVertexNormals();

  const color = new THREE.Color(s.color);
  const material = new THREE.MeshStandardMaterial({
    color: color.clone(),
    roughness: 0.85 + s.roughness * 0.1,
    metalness: 0.05 + (s.id / strata.length) * 0.08,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1.0,
    flatShading: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.userData = { stratumId: s.id };

  scene.add(mesh);

  stratumMeshGroups.push({
    mesh,
    material,
    originalColor: color.clone(),
    currentColor: color.clone(),
    targetColor: color.clone(),
    colorLerpT: 1.0,
    isHighlighted: false
  });
}

function createCutPlane(): void {
  const totalDepth = strata[strata.length - 1].depthBottom + 1;

  const planeGeom = new THREE.PlaneGeometry(WORLD_SIZE * 1.05, totalDepth * 1.5, 1, 1);
  const planeMat = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  cutPlaneMesh = new THREE.Mesh(planeGeom, planeMat);
  cutPlaneMesh.position.x = percentToWorldX(50);
  cutPlaneMesh.rotation.y = Math.PI / 2;
  cutPlaneMesh.position.y = depthToWorld(totalDepth / 2);
  cutPlaneMesh.visible = false;
  scene.add(cutPlaneMesh);

  const edgeGeom = new THREE.BufferGeometry();
  const hw = WORLD_SIZE * 1.05 / 2;
  const hd = totalDepth * 1.5 / 2;
  const edgePts = new Float32Array([
    0, -hd, -hw, 0, hd, -hw,
    0, hd, -hw, 0, hd, hw,
    0, hd, hw, 0, -hd, hw,
    0, -hd, hw, 0, -hd, -hw
  ]);
  edgeGeom.setAttribute('position', new THREE.BufferAttribute(edgePts, 3));
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x4A90D9, transparent: true, opacity: 0.8 });
  const helper = new THREE.LineSegments(edgeGeom, edgeMat);
  if (cutPlaneMesh) {
    helper.position.copy(cutPlaneMesh.position);
  }
  helper.visible = false;
  cutPlaneHelper = helper;
  scene.add(helper);
}

function createParticles(): void {
  const perStratum = Math.floor(MAX_PARTICLES / strata.length);

  for (const s of strata) {
    const count = perStratum;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color(s.color);
    const half = WORLD_SIZE / 2;
    const depths = getTerrainHeightArray(20, 20, s.seed, s.roughness);

    for (let i = 0; i < count; i++) {
      const px = (Math.random() - 0.5) * WORLD_SIZE * 0.98;
      const pz = (Math.random() - 0.5) * WORLD_SIZE * 0.98;
      const ix = Math.round(((px + half) / WORLD_SIZE) * 20);
      const iz = Math.round(((pz + half) / WORLD_SIZE) * 20);
      const safeIx = Math.max(0, Math.min(20, ix));
      const safeIz = Math.max(0, Math.min(20, iz));
      const noiseTop = depths[safeIz * 21 + safeIx];
      const noiseBot = getTerrainHeightArray(20, 20, s.seed + 3.1, s.roughness * 0.8)[safeIz * 21 + safeIx] * 0.3;
      const midDepth = (s.depthTop + s.depthBottom) / 2 + (noiseTop + noiseBot) * 0.3;
      const jitter = (Math.random() - 0.5) * s.thickness * 0.6;

      positions[i * 3] = px;
      positions[i * 3 + 1] = depthToWorld(midDepth + jitter);
      positions[i * 3 + 2] = pz;

      const tint = 0.85 + Math.random() * 0.3;
      colors[i * 3] = color.r * tint;
      colors[i * 3 + 1] = color.g * tint;
      colors[i * 3 + 2] = color.b * tint;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    const pts = new THREE.Points(geom, mat);
    pts.userData = { stratumId: s.id };
    scene.add(pts);
    particleSystems.push(pts);
  }
}

function handleStratumSelect(id: number | null): void {
  selectedStratumId = id;
  updateSelectedStratumUI(id);
  if (id === null) {
    updateStatsPanel(null);
  } else {
    const s = strata.find((st) => st.id === id);
    if (s) updateStatsPanel(getStratumStats(s));
  }
}

function handleDepthRangeChange(_min: number, _max: number): void {
}

function handleCutChange(percent: number): void {
  const worldX = percentToWorldX(percent);
  const active = percent > 0 && percent < 100;

  if (cutPlaneMesh) {
    cutPlaneMesh.visible = active;
    cutPlaneMesh.position.x = worldX;
    (cutPlaneMesh.material as THREE.MeshBasicMaterial).opacity = active ? 0.3 : 0.0;
  }
  if (cutPlaneHelper) {
    cutPlaneHelper.visible = active;
    cutPlaneHelper.position.x = worldX;
  }

  for (const group of stratumMeshGroups) {
    const shouldHighlight = active;
    if (shouldHighlight && Math.abs(worldX) < WORLD_SIZE / 2 + 1) {
      if (!group.isHighlighted) {
        startColorTransition(group, HIGHLIGHT_COLOR);
      }
    } else {
      if (group.isHighlighted) {
        startColorTransition(group, group.originalColor);
      }
    }
  }
}

function startColorTransition(group: StratumMeshGroup, targetColor: THREE.Color): void {
  const isHighlighting = targetColor === HIGHLIGHT_COLOR;
  group.isHighlighted = isHighlighting;
  colorTransitions.set(group.mesh.userData.stratumId, {
    from: group.currentColor.clone(),
    to: targetColor.clone(),
    elapsed: 0,
    duration: HIGHLIGHT_DURATION
  });
  group.targetColor = targetColor.clone();
  group.colorLerpT = 0;
}

function updateColorTransitions(dt: number): void {
  const toRemove: number[] = [];

  colorTransitions.forEach((t, id) => {
    t.elapsed += dt;
    const k = Math.min(1, t.elapsed / t.duration);
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

    const group = stratumMeshGroups.find((g) => g.mesh.userData.stratumId === id);
    if (group) {
      group.currentColor.copy(t.from).lerp(t.to, ease);
      group.material.color.copy(group.currentColor);
      group.colorLerpT = ease;
    }

    if (k >= 1) toRemove.push(id);
  });

  for (const id of toRemove) colorTransitions.delete(id);
}

function handleResetView(): void {
  const initAngle = Math.PI / 4;
  camera.position.set(
    Math.cos(initAngle) * CAMERA_DISTANCE,
    CAMERA_DISTANCE * 0.75,
    Math.sin(initAngle) * CAMERA_DISTANCE
  );
  const totalDepth = strata[strata.length - 1].depthBottom;
  controls.target.set(0, -totalDepth / 2, 0);
  controls.update();
}

function onWindowResize(): void {
  const root = document.getElementById('root');
  if (!root) return;
  const w = root.clientWidth;
  const h = root.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function onPointerDown(e: PointerEvent): void {
  isDragging = false;
  downX = e.clientX;
  downY = e.clientY;
  downTime = performance.now();
}

function onPointerMove(e: PointerEvent): void {
  if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) {
    isDragging = true;
  }
}

function onPointerUp(e: PointerEvent): void {
  const elapsed = performance.now() - downTime;
  const moved = Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4;

  if (!moved && elapsed < 350) {
    handleCanvasClick(e);
  }
}

function handleCanvasClick(e: PointerEvent): void {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const meshes = stratumMeshGroups.map((g) => g.mesh);
  const hits = raycaster.intersectObjects(meshes, false);

  if (hits.length > 0) {
    const hit = hits[0];
    const point = hit.point;
    const result = getStratumAtPoint(strata, point.x, point.y, point.z);

    if (result) {
      showInfoPanel({
        stratum: result.stratum,
        depth: result.depth,
        screenX: e.clientX,
        screenY: e.clientY
      });
      handleStratumSelect(result.stratum.id);
    }
  }
}

function updateBreathingAnimation(dt: number): void {
  animationTime += dt;

  if (selectedStratumId === null) {
    for (const group of stratumMeshGroups) {
      group.material.opacity = 1.0;
      group.material.transparent = true;
    }
    for (const p of particleSystems) {
      (p.material as THREE.PointsMaterial).opacity = 0.9;
    }
    return;
  }

  const cycle = (animationTime % (BREATH_PERIOD * 2)) / BREATH_PERIOD;
  const triangleWave = cycle < 1 ? cycle : 2 - cycle;
  const breathOpacity = BREATH_MIN + (BREATH_MAX - BREATH_MIN) * triangleWave;

  for (const group of stratumMeshGroups) {
    const isSelected = group.mesh.userData.stratumId === selectedStratumId;
    group.material.transparent = true;
    if (isSelected) {
      group.material.opacity = breathOpacity;
    } else {
      group.material.opacity = 0.2;
    }
  }

  for (const p of particleSystems) {
    const mat = p.material as THREE.PointsMaterial;
    const isSelected = p.userData.stratumId === selectedStratumId;
    mat.transparent = true;
    if (isSelected) {
      mat.opacity = breathOpacity * 0.95;
    } else {
      mat.opacity = 0.15;
    }
  }
}

let lastFrameTime = 0;
let frameCount = 0;
let fpsAccum = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  let dt = (now - lastFrameTime) / 1000;
  if (dt > 0.05) dt = 0.05;
  lastFrameTime = now;

  fpsAccum += dt;
  frameCount++;
  if (fpsAccum >= 2) {
    fpsAccum = 0;
    frameCount = 0;
  }

  controls.update();
  updateBreathingAnimation(dt);
  updateColorTransitions(dt);

  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', main);
if (document.readyState !== 'loading') {
  main();
}
