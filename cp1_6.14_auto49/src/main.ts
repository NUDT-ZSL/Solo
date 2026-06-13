import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { generateMolecules } from './moleculeData';
import { MoleculeVisualizer } from './visualizer';
import { UIController } from './uiController';

const container = document.getElementById('canvas-container')!;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 8, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404060, 1.2);
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight1.position.set(10, 20, 15);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0x8888ff, 0.4);
dirLight2.position.set(-10, -5, -10);
scene.add(dirLight2);

const pointLight = new THREE.PointLight(0xff6b6b, 0.5, 50);
pointLight.position.set(0, 15, 0);
scene.add(pointLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 50;
controls.enablePan = true;

const molecules = generateMolecules();
const visualizer = new MoleculeVisualizer(scene);
visualizer.buildMolecules(molecules);

let autoRotate = true;
const autoRotateSpeed = 0.005;

const ui = new UIController({
  onPlayPause: () => {
    autoRotate = !autoRotate;
  },
  onVolatilityChange: (value: number) => {
    visualizer.updateVolatilityScale(value);
  },
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event: MouseEvent) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const allAtomMeshes: THREE.Object3D[] = [];
  for (const mg of visualizer.getMoleculeGroups()) {
    allAtomMeshes.push(...mg.atomMeshes);
  }

  const intersects = raycaster.intersectObjects(allAtomMeshes, false);

  if (intersects.length > 0) {
    const molIndex = visualizer.getMoleculeAtIntersection(intersects[0]);
    if (molIndex >= 0) {
      if (visualizer.getSelectedIndex() === molIndex) {
        visualizer.clearHighlight();
        ui.clearDetail();
      } else {
        visualizer.highlightMolecule(molIndex);
        ui.showMoleculeDetail(molecules[molIndex]);
      }
    }
  } else {
    visualizer.clearHighlight();
    ui.clearDetail();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (autoRotate) {
    scene.rotation.y += autoRotateSpeed;
  }

  visualizer.update(dt);
  controls.update();
  renderer.render(scene, camera);
}

animate();
