import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TowerBuilder, TowerConfig, FloorParams, TowerStyle } from './TowerBuilder';
import { StructuralSimulation } from './StructuralSimulation';

const canvasContainer = document.getElementById('canvas-container')!;
const floorCountInput = document.getElementById('floor-count') as HTMLInputElement;
const floorCountValue = document.getElementById('floor-count-value')!;
const floorTabsContainer = document.getElementById('floor-tabs')!;
const floorSlidersContainer = document.getElementById('floor-sliders')!;
const styleButtons = document.querySelectorAll('.style-btn');
const windBtn = document.getElementById('wind-btn') as HTMLButtonElement;
const displacementText = document.getElementById('displacement-text')!;
const menuToggle = document.getElementById('menu-toggle')!;
const controlPanel = document.getElementById('control-panel')!;
const drawerOverlay = document.getElementById('drawer-overlay')!;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let pointLight: THREE.PointLight;
let lightHelper: THREE.Mesh;
let towerBuilder: TowerBuilder;
let simulation: StructuralSimulation;
let lightDragging = false;
let raycaster: THREE.Raycaster;
let pointer = new THREE.Vector2();

const state = {
  floorCount: 4,
  style: 'classic' as TowerStyle,
  activeTab: 0,
  floors: [] as FloorParams[],
};

function initFloors(count: number): void {
  const existing = state.floors;
  const result: FloorParams[] = [];
  for (let i = 0; i < count; i++) {
    if (existing[i]) {
      result.push(existing[i]);
    } else {
      result.push({
        height: 3,
        widthRatio: 1.0,
        rotation: 0,
      });
    }
  }
  state.floors = result;
  if (state.activeTab >= count) {
    state.activeTab = count - 1;
  }
}

function buildConfig(): TowerConfig {
  return {
    floorCount: state.floorCount,
    floors: state.floors,
    style: state.style,
  };
}

function initScene(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1A202C);

  const w = canvasContainer.clientWidth;
  const h = canvasContainer.clientHeight;

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.set(15, 12, 15);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  canvasContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.rotateSpeed = 0.5;
  controls.minDistance = 5;
  controls.maxDistance = 30;
  controls.target.set(0, 5, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  pointLight = new THREE.PointLight(0xffffff, 1.2, 100);
  pointLight.position.set(15, 20, 15);
  pointLight.castShadow = true;
  pointLight.shadow.mapSize.width = 1024;
  pointLight.shadow.mapSize.height = 1024;
  scene.add(pointLight);

  const lightSphereGeo = new THREE.SphereGeometry(0.4, 16, 16);
  const lightSphereMat = new THREE.MeshBasicMaterial({ color: 0xFFE066 });
  lightHelper = new THREE.Mesh(lightSphereGeo, lightSphereMat);
  lightHelper.position.copy(pointLight.position);
  lightHelper.userData.isLightHelper = true;
  scene.add(lightHelper);

  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xDFE6E9,
    roughness: 0.6,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(50, 50, 0x4A5568, 0x4A5568);
  gridHelper.position.y = 0.01;
  (gridHelper.material as THREE.Material).opacity = 0.3;
  (gridHelper.material as THREE.Material).transparent = true;
  scene.add(gridHelper);

  raycaster = new THREE.Raycaster();

  initFloors(state.floorCount);
  towerBuilder = new TowerBuilder(buildConfig());
  scene.add(towerBuilder.getGroup());

  simulation = new StructuralSimulation(towerBuilder.getGroup());
  simulation.setTotalHeight(towerBuilder.getTotalHeight());

  window.addEventListener('resize', onResize);
  addLightDragHandlers();
}

function onResize(): void {
  const w = canvasContainer.clientWidth;
  const h = canvasContainer.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function addLightDragHandlers(): void {
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (e) => {
    pointer.x = (e.clientX / canvas.clientWidth) * 2 - 1;
    pointer.y = -(e.clientY / canvas.clientHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(lightHelper);
    if (intersects.length > 0) {
      lightDragging = true;
      controls.enabled = false;
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!lightDragging) return;
    pointer.x = (e.clientX / canvas.clientWidth) * 2 - 1;
    pointer.y = -(e.clientY / canvas.clientHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -10);
    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      pointLight.position.copy(intersectPoint);
      lightHelper.position.copy(intersectPoint);
    }
  });

  const stopDrag = (e: PointerEvent) => {
    if (lightDragging) {
      lightDragging = false;
      controls.enabled = true;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
}

function renderFloorTabs(): void {
  floorTabsContainer.innerHTML = '';
  for (let i = 0; i < state.floorCount; i++) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (i === state.activeTab ? ' active' : '');
    btn.textContent = `第 ${i + 1} 层`;
    btn.addEventListener('click', () => {
      state.activeTab = i;
      renderFloorTabs();
      renderFloorSliders();
    });
    floorTabsContainer.appendChild(btn);
  }
}

function renderFloorSliders(): void {
  floorSlidersContainer.innerHTML = '';
  const floor = state.floors[state.activeTab];
  if (!floor) return;

  const sliderDefs = [
    { key: 'height', label: '高度', min: 1, max: 5, step: 0.1, value: floor.height },
    { key: 'widthRatio', label: '宽度比例', min: 0.6, max: 1.2, step: 0.05, value: floor.widthRatio },
    { key: 'rotation', label: '旋转角度', min: 0, max: 45, step: 1, value: floor.rotation },
  ] as const;

  sliderDefs.forEach((def) => {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const header = document.createElement('div');
    header.className = 'slider-header';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = def.label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.id = `floor-${state.activeTab}-${def.key}-value`;
    valueSpan.textContent = def.key === 'rotation' ? `${def.value}°` : def.value.toFixed(1);
    header.appendChild(labelSpan);
    header.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = def.min.toString();
    input.max = def.max.toString();
    input.step = def.step.toString();
    input.value = def.value.toString();

    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      (state.floors[state.activeTab] as any)[def.key] = v;
      valueSpan.textContent = def.key === 'rotation' ? `${v}°` : v.toFixed(1);
      rebuildTower();
    });

    group.appendChild(header);
    group.appendChild(input);
    floorSlidersContainer.appendChild(group);
  });
}

function rebuildTower(animate = false): void {
  scene.remove(towerBuilder.getGroup());
  simulation.reset();
  towerBuilder.rebuild(buildConfig());
  simulation = new StructuralSimulation(towerBuilder.getGroup());
  simulation.setTotalHeight(towerBuilder.getTotalHeight());
  scene.add(towerBuilder.getGroup());
  if (animate) {
    towerBuilder.playGrowAnimation();
  }
  updateDisplacement(0);
}

function updateDisplacement(mm: number): void {
  displacementText.textContent = `位移：${mm.toFixed(1)} mm`;
}

function bindEvents(): void {
  floorCountInput.addEventListener('input', () => {
    const v = parseInt(floorCountInput.value, 10);
    state.floorCount = v;
    floorCountValue.textContent = v.toString();
    initFloors(v);
    renderFloorTabs();
    renderFloorSliders();
    rebuildTower();
  });

  styleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      styleButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.style = (btn as HTMLElement).dataset.style as TowerStyle;
      rebuildTower(true);
    });
  });

  windBtn.addEventListener('click', () => {
    if (simulation.isActive()) return;
    windBtn.disabled = true;
    windBtn.textContent = '模拟中...';
    simulation.applyWindLoad({
      amplitude: 3,
      frequency: 0.5,
      damping: 0.3,
      duration: 5,
    });
    setTimeout(() => {
      windBtn.disabled = false;
      windBtn.textContent = '施加风荷载';
    }, 5000);
  });

  menuToggle.addEventListener('click', () => {
    controlPanel.classList.toggle('active');
    drawerOverlay.classList.toggle('active');
  });

  drawerOverlay.addEventListener('click', () => {
    controlPanel.classList.remove('active');
    drawerOverlay.classList.remove('active');
  });
}

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  controls.update();

  const disp = simulation.update(delta);
  updateDisplacement(disp);

  renderer.render(scene, camera);
}

function init(): void {
  initScene();
  renderFloorTabs();
  renderFloorSliders();
  bindEvents();
  animate();
}

init();
