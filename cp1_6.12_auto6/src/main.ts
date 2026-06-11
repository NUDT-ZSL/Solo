import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { molecules, moleculeList } from './data';
import type { MoleculeData } from './data';
import {
  createMoleculeGroup,
  createSelectionRing,
  fadeInMolecule,
  updateBondAnimation,
  updateSelectionRing,
  type MoleculeGroup
} from './molecule';
import {
  createControlPanel,
  createInfoCard,
  setupRaycaster,
  getAtomInfo,
  type InfoCard
} from './ui';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let canvasContainer: HTMLElement;
let currentMolecule: MoleculeGroup | null = null;
let selectionRing: THREE.Mesh | null = null;
let infoCard: InfoCard;
let panelControls: {
  panel: HTMLElement;
  setActiveButton: (moleculeId: string) => void;
  updateFPS: (fps: number) => void;
};
let raycasterHandler: ReturnType<typeof setupRaycaster>;

const clock = new THREE.Clock();
let frameCount = 0;
let fpsTime = 0;
let currentFPS = 60;

function init(): void {
  canvasContainer = document.getElementById('canvas-container')!;

  scene = new THREE.Scene();
  scene.background = null;
  scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

  const width = window.innerWidth;
  const height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  canvasContainer.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 2;
  controls.maxDistance = 15;
  controls.enablePan = false;

  setupLights();

  panelControls = createControlPanel(moleculeList, handleMoleculeSelect);
  infoCard = createInfoCard();
  raycasterHandler = setupRaycaster(renderer.domElement);

  loadMolecule('h2o');

  window.addEventListener('resize', handleResize);
  document.addEventListener('click', handleDocumentClick);

  animate();
}

function setupLights(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(5, 5, 5);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0x88aaff, 0.6);
  directionalLight2.position.set(-5, -3, 3);
  scene.add(directionalLight2);

  const pointLight = new THREE.PointLight(0x00d4ff, 0.5, 20);
  pointLight.position.set(0, 2, 5);
  scene.add(pointLight);
}

function handleMoleculeSelect(moleculeId: string): void {
  loadMolecule(moleculeId);
}

async function loadMolecule(moleculeId: string): Promise<void> {
  const moleculeData: MoleculeData = molecules[moleculeId];
  if (!moleculeData) return;

  if (currentMolecule) {
    scene.remove(currentMolecule);
    currentMolecule.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  if (selectionRing) {
    scene.remove(selectionRing);
    selectionRing.geometry.dispose();
    (selectionRing.material as THREE.Material).dispose();
    selectionRing = null;
  }

  infoCard.hide();

  currentMolecule = createMoleculeGroup(moleculeData);
  scene.add(currentMolecule);

  panelControls.setActiveButton(moleculeId);

  raycasterHandler.update(
    camera,
    currentMolecule.userData.atoms,
    (atom, idx, _evt) => handleAtomClick(atom, idx)
  );

  await fadeInMolecule(currentMolecule, 800);
}

function handleAtomClick(atom: THREE.Mesh, atomIndex: number): void {
  if (!currentMolecule) return;

  const moleculeData = currentMolecule.userData.moleculeData;
  const atomData = moleculeData.atoms[atomIndex];

  if (selectionRing) {
    scene.remove(selectionRing);
    selectionRing.geometry.dispose();
    (selectionRing.material as THREE.Material).dispose();
    selectionRing = null;
  }

  selectionRing = createSelectionRing(atom);
  scene.add(selectionRing);

  const atomInfo = getAtomInfo(atomData, atomIndex, moleculeData);
  infoCard.update(atomInfo);
}

function handleDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (
    !target.closest('.info-card') &&
    !target.closest('canvas') &&
    !target.closest('.control-panel')
  ) {
    infoCard.hide();
    if (selectionRing) {
      scene.remove(selectionRing);
      selectionRing.geometry.dispose();
      (selectionRing.material as THREE.Material).dispose();
      selectionRing = null;
    }
  }
}

function handleResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  frameCount++;
  fpsTime += deltaTime;
  if (fpsTime >= 1) {
    currentFPS = frameCount / fpsTime;
    panelControls.updateFPS(currentFPS);
    frameCount = 0;
    fpsTime = 0;
  }

  if (currentMolecule) {
    updateBondAnimation(elapsedTime, currentMolecule.userData.bonds);

    currentMolecule.userData.atoms.forEach((atom) => {
      if (atom.material instanceof THREE.ShaderMaterial) {
        atom.material.uniforms.uTime.value = elapsedTime;
      }
    });
  }

  if (selectionRing && currentMolecule) {
    const targetAtom = selectionRing.userData.targetAtom as THREE.Mesh;
    updateSelectionRing(selectionRing, elapsedTime, targetAtom.position);
  }

  controls.update();
  renderer.render(scene, camera);
}

init();
