import * as THREE from 'three';
import { ParticleSystem, SimParams } from './particleSystem';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let particleSystem: ParticleSystem;
let particleMesh: THREE.InstancedMesh;
let highPolyGeometry: THREE.SphereGeometry;
let lowPolyGeometry: THREE.SphereGeometry;
let trailGeometries: THREE.BufferGeometry[] = [];
let trailMaterials: THREE.LineBasicMaterial[] = [];
let trailLines: THREE.Line[] = [];
let attractorMeshes: THREE.Mesh[] = [];
let attractorHalos: THREE.Mesh[] = [];
let lowQualityMode = false;

let simParams: SimParams = {
  gravityConstant: 1.0,
  decayExponent: 2.0,
  elasticity: 0.8,
  particleRadius: 0.15
};

let paused = false;
let frameCount = 0;
let lastFPSUpdate = performance.now();
let currentFPS = 60;
let lastEnergyUpdate = performance.now();
let currentEnergy = 0;

let isDraggingCamera = false;
let isDraggingAttractor = -1;
let lastMouseX = 0;
let lastMouseY = 0;
let cameraAngleY = 0.5;
let cameraAngleX = 0.3;
let cameraDistance = 20;
let cameraTarget = new THREE.Vector3(0, 0, 0);
let keys: Record<string, boolean> = {};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();

const appContainer = document.getElementById('app') as HTMLDivElement;

function init() {
  scene = new THREE.Scene();

  const canvas = document.createElement('canvas');
  appContainer.appendChild(canvas);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  updateCameraPosition();

  const ambientLight = new THREE.AmbientLight(0x6060a0, 0.6);
  scene.add(ambientLight);
  const pointLight1 = new THREE.PointLight(0x8080ff, 1, 50);
  pointLight1.position.set(10, 10, 10);
  scene.add(pointLight1);
  const pointLight2 = new THREE.PointLight(0xff8080, 0.6, 50);
  pointLight2.position.set(-10, -5, -10);
  scene.add(pointLight2);

  particleSystem = new ParticleSystem();

  highPolyGeometry = new THREE.SphereGeometry(simParams.particleRadius, 16, 12);
  lowPolyGeometry = new THREE.SphereGeometry(simParams.particleRadius, 8, 6);

  const particleMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.1,
    roughness: 0.4,
    transparent: true,
    opacity: 0.95,
    vertexColors: true
  });

  particleMesh = new THREE.InstancedMesh(highPolyGeometry, particleMaterial, particleSystem.getParticleCount());
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(particleMesh);

  const colors = new Float32Array(particleSystem.getParticleCount() * 3);
  for (let i = 0; i < particleSystem.getParticleCount() * 3; i++) colors[i] = 1;
  particleMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

  createAttractors();
  createTrails();
  setupEventListeners();
  animate();
}

function createAttractors() {
  const attractorGeom = new THREE.SphereGeometry(0.25, 24, 24);
  const haloGeom = new THREE.RingGeometry(0.3, 0.5, 32);
  const positions = particleSystem.attractors;

  for (let i = 0; i < 2; i++) {
    const attractorMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.9
    });
    const attractor = new THREE.Mesh(attractorGeom, attractorMat);
    attractor.position.copy(positions[i]);
    attractor.userData.isAttractor = true;
    attractor.userData.index = i;
    scene.add(attractor);
    attractorMeshes.push(attractor);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.position.copy(positions[i]);
    halo.lookAt(camera.position);
    scene.add(halo);
    attractorHalos.push(halo);
  }
}

function createTrails() {
  for (let i = 0; i < particleSystem.getParticleCount(); i++) {
    const positions = new Float32Array(particleSystem.getTrailLength() * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    const line = new THREE.Line(geom, mat);
    scene.add(line);
    trailGeometries.push(geom);
    trailMaterials.push(mat);
    trailLines.push(line);
  }
}

function updateTrails() {
  for (let i = 0; i < particleSystem.particles.length; i++) {
    const p = particleSystem.particles[i];
    const geom = trailGeometries[i];
    const mat = trailMaterials[i];
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;

    if (p.trail.length < 2) {
      geom.setDrawRange(0, 0);
      continue;
    }

    for (let j = 0; j < p.trail.length; j++) {
      positions[j * 3] = p.trail[j].x;
      positions[j * 3 + 1] = p.trail[j].y;
      positions[j * 3 + 2] = p.trail[j].z;
    }
    posAttr.needsUpdate = true;
    geom.setDrawRange(0, p.trail.length);

    const progress = 1 - (p.trail.length / particleSystem.getTrailLength());
    mat.opacity = 0.8 * progress;
    mat.color.copy(p.color);
  }
}

function updateParticles() {
  const dummy = new THREE.Object3D();
  const positions = particleSystem.getPositions();
  const colors = particleSystem.getColors();

  for (let i = 0; i < particleSystem.getParticleCount(); i++) {
    dummy.position.set(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2]
    );
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    particleMesh.setMatrixAt(i, dummy.matrix);
    particleMesh.setColorAt(i, new THREE.Color(
      colors[i * 3],
      colors[i * 3 + 1],
      colors[i * 3 + 2]
    ));
  }
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
}

function updateAttractors(time: number) {
  for (let i = 0; i < 2; i++) {
    attractorMeshes[i].position.copy(particleSystem.attractors[i]);
    const pulse = 0.1 * Math.sin(time * Math.PI) + 0.4;
    attractorHalos[i].position.copy(particleSystem.attractors[i]);
    attractorHalos[i].scale.setScalar(pulse / 0.4);
    attractorHalos[i].lookAt(camera.position);
    (attractorHalos[i].material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.3 * Math.abs(Math.sin(time * Math.PI));
  }
  updateAttractorLabels();
}

function updateAttractorLabels() {
  const labels = [
    document.getElementById('attractor1Label') as HTMLElement,
    document.getElementById('attractor2Label') as HTMLElement
  ];

  for (let i = 0; i < 2; i++) {
    const pos = particleSystem.attractors[i].clone();
    pos.project(camera);
    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
    labels[i].style.left = x + 'px';
    labels[i].style.top = y + 'px';
    labels[i].textContent = `A${i + 1}: (${particleSystem.attractors[i].x.toFixed(1)}, ${particleSystem.attractors[i].y.toFixed(1)}, ${particleSystem.attractors[i].z.toFixed(1)})`;
  }
}

function updateCameraPosition() {
  camera.position.x = cameraTarget.x + cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
  camera.position.y = cameraTarget.y + cameraDistance * Math.sin(cameraAngleX);
  camera.position.z = cameraTarget.z + cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
  camera.lookAt(cameraTarget);
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('wheel', onWheel);
  window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  document.getElementById('gSlider')?.addEventListener('input', (e) => {
    simParams.gravityConstant = parseFloat((e.target as HTMLInputElement).value);
    (document.getElementById('gValue') as HTMLElement).textContent = simParams.gravityConstant.toFixed(1);
  });
  document.getElementById('expSlider')?.addEventListener('input', (e) => {
    simParams.decayExponent = parseFloat((e.target as HTMLInputElement).value);
    (document.getElementById('expValue') as HTMLElement).textContent = simParams.decayExponent.toFixed(1);
  });
  document.getElementById('elasticSlider')?.addEventListener('input', (e) => {
    simParams.elasticity = parseFloat((e.target as HTMLInputElement).value);
    (document.getElementById('elasticValue') as HTMLElement).textContent = simParams.elasticity.toFixed(1);
  });
  document.getElementById('radiusSlider')?.addEventListener('input', (e) => {
    simParams.particleRadius = parseFloat((e.target as HTMLInputElement).value);
    (document.getElementById('radiusValue') as HTMLElement).textContent = simParams.particleRadius.toFixed(2);
    const scale = simParams.particleRadius / 0.15;
    highPolyGeometry = new THREE.SphereGeometry(simParams.particleRadius, 16, 12);
    lowPolyGeometry = new THREE.SphereGeometry(simParams.particleRadius, 8, 6);
    particleMesh.geometry = lowQualityMode ? lowPolyGeometry : highPolyGeometry;
    void scale;
  });

  document.getElementById('resetBtn')?.addEventListener('click', () => {
    particleSystem.reset();
  });
  document.getElementById('pauseBtn')?.addEventListener('click', () => {
    paused = !paused;
    const btn = document.getElementById('pauseBtn') as HTMLButtonElement;
    if (paused) btn.classList.remove('active');
    else btn.classList.add('active');
  });
  document.getElementById('topView')?.addEventListener('click', () => {
    cameraAngleX = Math.PI / 2 - 0.01;
    cameraAngleY = 0;
    cameraDistance = 25;
    updateCameraPosition();
  });
  document.getElementById('sideView')?.addEventListener('click', () => {
    cameraAngleX = 0;
    cameraAngleY = 0;
    cameraDistance = 25;
    updateCameraPosition();
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseDown(e: MouseEvent) {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects([...attractorMeshes, ...attractorHalos]);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !('isAttractor' in obj.userData)) {
      obj = obj.parent as THREE.Object3D;
    }
    if (obj && 'isAttractor' in obj.userData) {
      isDraggingAttractor = obj.userData.index;
      return;
    }
  }

  isDraggingCamera = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function onMouseMove(e: MouseEvent) {
  if (isDraggingAttractor >= 0) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    pos.x = THREE.MathUtils.clamp(pos.x, -8, 8);
    pos.y = THREE.MathUtils.clamp(pos.y, -8, 8);
    pos.z = THREE.MathUtils.clamp(pos.z, -8, 8);

    particleSystem.attractors[isDraggingAttractor].copy(pos);
    return;
  }

  if (isDraggingCamera) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    cameraAngleY -= dx * 0.005;
    cameraAngleX += dy * 0.005;
    cameraAngleX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraAngleX));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    updateCameraPosition();
  }
}

function onMouseUp() {
  isDraggingCamera = false;
  isDraggingAttractor = -1;
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  cameraDistance += e.deltaY * 0.02;
  cameraDistance = Math.max(10, Math.min(50, cameraDistance));
  updateCameraPosition();
}

function handleKeyboard() {
  const step = 0.15;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  if (keys['w']) cameraTarget.add(forward.clone().multiplyScalar(step));
  if (keys['s']) cameraTarget.add(forward.clone().multiplyScalar(-step));
  if (keys['a']) cameraTarget.add(right.clone().multiplyScalar(-step));
  if (keys['d']) cameraTarget.add(right.clone().multiplyScalar(step));
  updateCameraPosition();
}

function checkPerformance() {
  if (currentFPS < 30 && !lowQualityMode) {
    lowQualityMode = true;
    particleMesh.geometry = lowPolyGeometry;
  } else if (currentFPS > 45 && lowQualityMode) {
    lowQualityMode = false;
    particleMesh.geometry = highPolyGeometry;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();
  handleKeyboard();

  if (!paused) {
    particleSystem.update(simParams);
  }

  updateParticles();
  updateTrails();
  updateAttractors(time);

  frameCount++;
  const now = performance.now();
  if (now - lastFPSUpdate >= 500) {
    currentFPS = Math.round((frameCount * 1000) / (now - lastFPSUpdate));
    (document.getElementById('fpsDisplay') as HTMLElement).textContent = currentFPS.toString();
    frameCount = 0;
    lastFPSUpdate = now;
    checkPerformance();
  }

  if (now - lastEnergyUpdate >= 1000) {
    currentEnergy = particleSystem.getKineticEnergy();
    (document.getElementById('energyDisplay') as HTMLElement).textContent = currentEnergy.toFixed(1);
    lastEnergyUpdate = now;
  }

  renderer.render(scene, camera);
}

init();
