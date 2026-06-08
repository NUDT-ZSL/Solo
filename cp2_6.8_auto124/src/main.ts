import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SculptureManager, TemplateType } from './SculptureManager';
import { ControlPanel } from './ControlPanel';
import { LightController } from './LightController';

const container = document.getElementById('canvas-container') as HTMLElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0b1a);
scene.fog = new THREE.FogExp2(0x0a0b1a, 0.04);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(7, 5, 9);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 25;
controls.enablePan = false;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x667eea, 0x1a1b2e, 0.4);
scene.add(hemiLight);

const backLight = new THREE.DirectionalLight(0x9f7aea, 0.4);
backLight.position.set(-5, 3, -5);
scene.add(backLight);

const starsGeom = new THREE.BufferGeometry();
const starCount = 800;
const positions = new Float32Array(starCount * 3);
const colors = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 40 + Math.random() * 40;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i * 3 + 2] = r * Math.cos(phi);
  const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.5, 0.6 + Math.random() * 0.3);
  colors[i * 3] = c.r;
  colors[i * 3 + 1] = c.g;
  colors[i * 3 + 2] = c.b;
}
starsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
starsGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const starsMat = new THREE.PointsMaterial({
  size: 0.15,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
});
const stars = new THREE.Points(starsGeom, starsMat);
scene.add(stars);

const sculptureManager = new SculptureManager(scene);
const controlPanel = new ControlPanel(sculptureManager);
const lightController = new LightController(scene, 'light-controller');

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hoveredMesh: THREE.Mesh | null = null;

function onPointerMove(event: PointerEvent): void {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const meshes = sculptureManager.sculptures.map((s) => s.mesh);
  const intersects = raycaster.intersectObjects(meshes, false);

  if (hoveredMesh) {
    const sc = sculptureManager.sculptures.find((s) => s.mesh === hoveredMesh);
    if (sc && sc !== sculptureManager.selectedSculpture) {
      (hoveredMesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x000000);
    }
    hoveredMesh = null;
  }

  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh;
    hoveredMesh = mesh;
    const sc = sculptureManager.sculptures.find((s) => s.mesh === mesh);
    if (sc && sc !== sculptureManager.selectedSculpture) {
      (mesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x111133);
    }
    renderer.domElement.style.cursor = 'pointer';
  } else {
    renderer.domElement.style.cursor = 'grab';
  }
}

function onClick(event: PointerEvent): void {
  if (event.button !== 0) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const meshes = sculptureManager.sculptures.map((s) => s.mesh);
  const intersects = raycaster.intersectObjects(meshes, false);

  if (intersects.length > 0) {
    sculptureManager.selectMesh(intersects[0].object as THREE.Mesh);
    controlPanel.show();
  } else {
    sculptureManager.deselectAll();
    controlPanel.hide();
  }
}

renderer.domElement.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('pointerdown', onClick);

document.querySelectorAll('.template-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const template = (btn as HTMLElement).dataset.template as TemplateType;
    document.querySelectorAll('.template-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    await sculptureManager.switchTemplate(template);
    controlPanel.hide();
  });
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const time = clock.getElapsedTime();

  controls.update();
  sculptureManager.update(delta, time);
  lightController.update(delta, time);
  stars.rotation.y = time * 0.01;
  stars.rotation.x = Math.sin(time * 0.005) * 0.1;

  renderer.render(scene, camera);
}

animate();

sculptureManager.buildTemplate('starRing');
