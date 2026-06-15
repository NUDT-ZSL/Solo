import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ELEMENTS,
  ElementCube,
  ElementData,
  CATEGORY_COLORS,
  createElementCube,
  createAtomModel,
  animateAtomModel,
  createStars,
  searchElement,
  getGridPosition,
} from './elements';
import {
  ReactionLine,
  Particle,
  CameraTween,
  createReactionLines,
  createParticle,
  updateParticle,
  createFilterBar,
  applyFilter,
  getReactionPartners,
  highlightRingPulse,
  updateCameraTween,
  projectToScreen,
} from './interactions';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1628);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 22, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app')!.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI / 2.1;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
mainLight.position.set(15, 25, 15);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.left = -30;
mainLight.shadow.camera.right = 30;
mainLight.shadow.camera.top = 30;
mainLight.shadow.camera.bottom = -30;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x6699ff, 0.35);
fillLight.position.set(-10, 10, -10);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xff9966, 0.5, 80);
rimLight.position.set(-15, 8, -15);
scene.add(rimLight);

const stars = createStars(20);
scene.add(stars);

const elementCubes: ElementCube[] = [];
const elementMap = new Map<string, ElementCube>();
const hoverableMeshes: THREE.Object3D[] = [];

ELEMENTS.forEach(element => {
  const cube = createElementCube(element);
  elementCubes.push(cube);
  elementMap.set(element.symbol, cube);
  scene.add(cube.group);
  hoverableMeshes.push(cube.mesh);
});

const reactionLines = createReactionLines(elementMap, scene);
reactionLines.forEach(rl => hoverableMeshes.push(rl.line));

const particles: Particle[] = [];

const cameraTween: CameraTween = {
  startPos: new THREE.Vector3(),
  endPos: new THREE.Vector3(),
  startTarget: new THREE.Vector3(),
  endTarget: new THREE.Vector3(),
  progress: 0,
  duration: 1.5,
  active: false,
};

let hoveredCube: ElementCube | null = null;
let selectedCube: ElementCube | null = null;
let currentFilter = 'all';
let highlightFlashCube: ElementCube | null = null;
let highlightFlashTimer = 0;
let hoveredReactionLine: ReactionLine | null = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const elementLabel = document.getElementById('elementLabel')!;
const reactionLabel = document.getElementById('reactionLabel')!;
const detailPanel = document.getElementById('detailPanel')!;
const searchInput = document.getElementById('searchInput') as HTMLInputElement;

function updateDetailPanel(cube: ElementCube | null): void {
  if (!cube) {
    detailPanel.classList.remove('show');
    return;
  }

  const data = cube.data;
  detailPanel.classList.add('show');
  (document.getElementById('detailSymbol') as HTMLElement).textContent = data.symbol;
  (document.getElementById('detailSymbol') as HTMLElement).style.background =
    '#' + CATEGORY_COLORS[data.category].toString(16).padStart(6, '0');
  (document.getElementById('detailNameCN') as HTMLElement).textContent = data.nameCN;
  (document.getElementById('detailNameEN') as HTMLElement).textContent = data.nameEN;
  (document.getElementById('detailNumber') as HTMLElement).textContent = data.number.toString();
  (document.getElementById('detailMass') as HTMLElement).textContent = data.mass.toString();
  (document.getElementById('detailElectron') as HTMLElement).textContent = data.electronConfig;
  (document.getElementById('detailValence') as HTMLElement).textContent = data.valence;
}

function deselectCube(): void {
  if (selectedCube) {
    selectedCube.isSelected = false;
    selectedCube.targetScale = 1;
    if (selectedCube.atomModel) {
      scene.remove(selectedCube.atomModel);
      selectedCube.atomModel = undefined;
    }
    if (selectedCube.highlightRing) {
      (selectedCube.highlightRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    selectedCube = null;
  }
  updateDetailPanel(null);
}

function selectCube(cube: ElementCube): void {
  deselectCube();
  selectedCube = cube;
  cube.isSelected = true;
  cube.targetScale = 1.3;

  const atomPos = cube.basePosition.clone();
  atomPos.y += 3.5;
  const atomModel = createAtomModel(cube.data, atomPos);
  cube.atomModel = atomModel;
  scene.add(atomModel);

  if (cube.highlightRing) {
    (cube.highlightRing.material as THREE.MeshBasicMaterial).opacity = 0.9;
  }

  updateDetailPanel(cube);
}

function flyToElement(element: ElementData): void {
  const cube = elementMap.get(element.symbol);
  if (!cube) return;

  const targetPos = cube.basePosition.clone();
  const cameraOffset = new THREE.Vector3(0, 6, 9);

  cameraTween.startPos.copy(camera.position);
  cameraTween.startTarget.copy(controls.target);
  cameraTween.endPos.copy(targetPos).add(cameraOffset);
  cameraTween.endTarget.copy(targetPos);
  cameraTween.progress = 0;
  cameraTween.duration = 1.5;
  cameraTween.active = true;

  highlightFlashCube = cube;
  highlightFlashTimer = 3;

  selectCube(cube);
}

function handleMouseMove(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function handleClick(): void {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hoverableMeshes, false);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (obj.userData.element) {
      const cube = elementMap.get((obj.userData.element as ElementData).symbol);
      if (cube) selectCube(cube);
    }
  }
}

function handleResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

renderer.domElement.addEventListener('mousemove', handleMouseMove);
renderer.domElement.addEventListener('click', handleClick);
window.addEventListener('resize', handleResize);

document.getElementById('closeDetail')!.addEventListener('click', deselectCube);

document.getElementById('showReactions')!.addEventListener('click', () => {
  if (!selectedCube) return;
  const partners = getReactionPartners(selectedCube.data);
  partners.forEach(symbol => {
    const partner = elementMap.get(symbol);
    if (partner) {
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const from = selectedCube!.basePosition.clone();
          from.y += 1;
          const to = partner.basePosition.clone();
          to.y += 1;
          from.x += (Math.random() - 0.5) * 0.5;
          from.z += (Math.random() - 0.5) * 0.5;
          const particle = createParticle(from, to, 4 + Math.random() * 2);
          particles.push(particle);
          scene.add(particle.mesh);
        }, i * 80);
      }
    }
  });
});

searchInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    const found = searchElement(searchInput.value);
    if (found) {
      flyToElement(found);
      searchInput.blur();
    }
  }
});

createFilterBar(key => {
  currentFilter = key;
});

const clock = new THREE.Clock();
let floatTime = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.1);
  floatTime += deltaTime;

  stars.rotation.y += deltaTime * 0.008;
  stars.rotation.x += deltaTime * 0.003;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(hoverableMeshes, false);

  let newHoveredCube: ElementCube | null = null;
  let newHoveredReaction: ReactionLine | null = null;

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (obj.userData.element) {
      const data = obj.userData.element as ElementData;
      newHoveredCube = elementMap.get(data.symbol) || null;
    } else if (obj.userData.isReactionLine) {
      const reactionData = obj.userData.reactionData;
      newHoveredReaction = reactionLines.find(
        r => r.fromSymbol === reactionData.from && r.toSymbol === reactionData.to
      ) || null;
    }
  }

  if (newHoveredCube !== hoveredCube) {
    if (hoveredCube && !hoveredCube.isSelected) {
      hoveredCube.targetScale = 1;
    }
    if (newHoveredCube) {
      newHoveredCube.targetScale = 1.2;
    }
    hoveredCube = newHoveredCube;
  }

  if (newHoveredReaction !== hoveredReactionLine) {
    if (hoveredReactionLine) {
      const mat = hoveredReactionLine.line.material as THREE.LineDashedMaterial;
      mat.color.setHex(0x6c7a89);
      mat.opacity = 0.6;
    }
    if (newHoveredReaction) {
      const mat = newHoveredReaction.line.material as THREE.LineDashedMaterial;
      mat.color.setHex(0xffffff);
      mat.opacity = 1;
    }
    hoveredReactionLine = newHoveredReaction;
  }

  elementCubes.forEach(cube => {
    const currentScale = cube.mesh.scale.x;
    const newScale = currentScale + (cube.targetScale - currentScale) * Math.min(1, deltaTime * 8);
    cube.mesh.scale.setScalar(newScale);

    if (cube.highlightRing) {
      cube.highlightRing.scale.setScalar(newScale);
    }

    let floatY = 0;
    if (!cube.isFiltered && currentFilter !== 'all') {
      floatY = Math.sin(floatTime * 2 + cube.data.number * 0.5) * 0.1;
    } else if (cube.isFiltered && currentFilter !== 'all') {
      floatY = 0.3;
    }

    cube.mesh.position.y = cube.basePosition.y + floatY;
    if (cube.highlightRing) {
      cube.highlightRing.position.y = cube.basePosition.y + floatY + 0.01;
    }

    if (cube.atomModel) {
      animateAtomModel(cube.atomModel, deltaTime);
    }
  });

  applyFilter(elementCubes, currentFilter, deltaTime);

  if (highlightFlashCube && highlightFlashTimer > 0) {
    highlightFlashTimer -= deltaTime;
    highlightRingPulse(highlightFlashCube, floatTime, 1);
    if (highlightFlashTimer <= 0) {
      highlightRingPulse(highlightFlashCube, 0, 0);
      highlightFlashCube = null;
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const alive = updateParticle(particles[i], deltaTime);
    if (!alive) {
      scene.remove(particles[i].mesh);
      particles[i].mesh.geometry.dispose();
      (particles[i].mesh.material as THREE.Material).dispose();
      particles.splice(i, 1);
    }
  }

  updateCameraTween(cameraTween, camera, controls.target, deltaTime);

  if (hoveredCube) {
    const screenPos = projectToScreen(
      hoveredCube.mesh.position.clone().add(new THREE.Vector3(0, 1.8, 0)),
      camera,
      window.innerWidth,
      window.innerHeight
    );
    if (screenPos.visible) {
      elementLabel.style.left = screenPos.x + 'px';
      elementLabel.style.top = screenPos.y + 'px';
      elementLabel.innerHTML = `${hoveredCube.data.symbol}<small>${hoveredCube.data.number} · ${hoveredCube.data.nameCN}</small>`;
      elementLabel.classList.add('show');
    } else {
      elementLabel.classList.remove('show');
    }
  } else {
    elementLabel.classList.remove('show');
  }

  if (hoveredReactionLine) {
    const screenPos = projectToScreen(
      hoveredReactionLine.midpoint.clone().add(new THREE.Vector3(0, 0.5, 0)),
      camera,
      window.innerWidth,
      window.innerHeight
    );
    if (screenPos.visible) {
      reactionLabel.style.left = screenPos.x + 'px';
      reactionLabel.style.top = screenPos.y + 'px';
      reactionLabel.textContent = hoveredReactionLine.equation;
      reactionLabel.classList.add('show');
    } else {
      reactionLabel.classList.remove('show');
    }
  } else {
    reactionLabel.classList.remove('show');
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
