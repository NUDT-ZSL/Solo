import * as THREE from 'three';
import { generateCardData } from './cardData';
import { setupCards, CardObject, ORBIT_RADIUS_X, ORBIT_RADIUS_Z, CARD_COUNT } from './cardSetup';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cards: CardObject[] = [];

let cameraAngle = -0.3;
let targetCameraAngle = -0.3;
let cameraDistance = 15;
let targetCameraDistance = 15;
const CAMERA_HEIGHT = 2;

let isDragging = false;
let dragStartX = 0;
let dragStartAngle = 0;
let hasDragged = false;
const DRAG_THRESHOLD = 5;

let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let hoveredCard: CardObject | null = null;
let selectedCard: CardObject | null = null;

let cardGroup: THREE.Group;

let isCameraAnimating = false;
let cameraAnimProgress = 0;
let cameraAnimDuration = 0.5;
let cameraStartPos = new THREE.Vector3();
let cameraEndPos = new THREE.Vector3();
let cameraStartLookAt = new THREE.Vector3();
let cameraEndLookAt = new THREE.Vector3();

let currentCardIndex = 0;

const CARD_COUNTER = document.getElementById('card-counter')!;

function init(): void {
  const container = document.getElementById('app')!;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  updateCameraPosition();
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  setupLights();

  const cardDataList = generateCardData();
  cards = setupCards(cardDataList);

  cardGroup = new THREE.Group();
  cards.forEach(card => {
    cardGroup.add(card.group);
  });
  scene.add(cardGroup);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  setupEventListeners();

  updateCurrentCardIndex();

  animate();
}

function updateCameraPosition(): void {
  camera.position.x = Math.cos(cameraAngle) * cameraDistance;
  camera.position.z = Math.sin(cameraAngle) * cameraDistance;
  camera.position.y = CAMERA_HEIGHT;
}

function setupLights(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const warmLight = new THREE.DirectionalLight(0xffeedd, 0.6);
  warmLight.position.set(5, 8, 5);
  scene.add(warmLight);

  const coolLight = new THREE.DirectionalLight(0xaabbff, 0.5);
  coolLight.position.set(-5, -3, 5);
  scene.add(coolLight);
}

function setupEventListeners(): void {
  const canvas = renderer.domElement;

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  canvas.addEventListener('wheel', onMouseWheel, { passive: false });

  canvas.addEventListener('click', onCardClick);

  window.addEventListener('keydown', onKeyDown);

  window.addEventListener('resize', onWindowResize);
}

function onMouseDown(event: MouseEvent): void {
  if (event.button === 0 && !selectedCard) {
    isDragging = true;
    hasDragged = false;
    dragStartX = event.clientX;
    dragStartAngle = targetCameraAngle;
  }
}

function onMouseMove(event: MouseEvent): void {
  if (isDragging) {
    const deltaX = event.clientX - dragStartX;
    if (Math.abs(deltaX) > DRAG_THRESHOLD) {
      hasDragged = true;
    }
    targetCameraAngle = dragStartAngle - deltaX * 0.005;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  if (!isDragging) {
    checkHover();
  }
}

function onMouseUp(): void {
  isDragging = false;
}

function onMouseWheel(event: WheelEvent): void {
  event.preventDefault();
  targetCameraDistance += event.deltaY * 0.01;
  targetCameraDistance = Math.max(5, Math.min(25, targetCameraDistance));
}

function getCardFromMesh(mesh: THREE.Object3D): CardObject | undefined {
  return cards.find(card => {
    if (card.frontMesh === mesh) return true;
    if (card.glowMesh === mesh) return true;
    if (card.edgeMesh === mesh) return true;
    if (card.group === mesh) return true;
    return false;
  });
}

function checkHover(): void {
  if (selectedCard) return;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(cardGroup, true);

  if (intersects.length > 0) {
    let foundCard: CardObject | undefined;
    for (const intersect of intersects) {
      foundCard = getCardFromMesh(intersect.object);
      if (foundCard) break;
    }

    if (foundCard && foundCard !== hoveredCard) {
      if (hoveredCard && hoveredCard !== foundCard) {
        hoveredCard.isHovered = false;
      }
      hoveredCard = foundCard;
      foundCard.isHovered = true;
      document.body.style.cursor = 'pointer';
    }
  } else {
    if (hoveredCard) {
      hoveredCard.isHovered = false;
      hoveredCard = null;
      document.body.style.cursor = 'default';
    }
  }
}

function onCardClick(): void {
  if (hasDragged || isCameraAnimating) return;

  if (selectedCard) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(selectedCard.group, true);

    if (intersects.length > 0) {
      toggleCardFlip(selectedCard);
    } else {
      toggleCardFlip(selectedCard);
    }
    return;
  }

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(cardGroup, true);

  if (intersects.length > 0) {
    let clickedCard: CardObject | undefined;
    for (const intersect of intersects) {
      clickedCard = getCardFromMesh(intersect.object);
      if (clickedCard) break;
    }

    if (clickedCard) {
      toggleCardFlip(clickedCard);
    }
  }
}

function toggleCardFlip(card: CardObject): void {
  card.isFlipped = !card.isFlipped;
  card.targetFlip = card.isFlipped ? Math.PI : 0;

  if (card.isFlipped) {
    selectedCard = card;
    cards.forEach(c => {
      if (c !== card) {
        const materials = c.frontMesh.material as THREE.MeshStandardMaterial[];
        materials.forEach(m => {
          m.transparent = true;
          m.opacity = 0.3;
        });
        (c.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    });
    startCameraAnimation(card);
    currentCardIndex = cards.indexOf(card);
    updateCardCounter(currentCardIndex);
  } else {
    selectedCard = null;
    cards.forEach(c => {
      const materials = c.frontMesh.material as THREE.MeshStandardMaterial[];
      materials.forEach(m => {
        m.transparent = false;
        m.opacity = 1;
      });
    });
    isCameraAnimating = false;
    targetCameraAngle = cameraAngle;
  }
}

function startCameraAnimation(card: CardObject): void {
  isCameraAnimating = true;
  cameraAnimProgress = 0;
  cameraAnimDuration = 0.6;

  cameraStartPos.copy(camera.position);
  cameraStartLookAt.set(0, 0, 0);

  const cardWorldPos = new THREE.Vector3();
  card.group.getWorldPosition(cardWorldPos);

  const cardNormal = new THREE.Vector3(0, 0, 1);
  cardNormal.applyQuaternion(card.group.quaternion);
  cardNormal.normalize();

  cameraEndPos.copy(cardWorldPos).add(cardNormal.multiplyScalar(6));
  cameraEndPos.y = CAMERA_HEIGHT;

  cameraEndLookAt.copy(cardWorldPos);
}

function onKeyDown(event: KeyboardEvent): void {
  if (selectedCard) {
    if (event.key === 'Escape' || event.key === ' ') {
      toggleCardFlip(selectedCard);
    }
    return;
  }

  if (isCameraAnimating) return;

  if (event.key === 'ArrowLeft') {
    navigateCard(-1);
  } else if (event.key === 'ArrowRight') {
    navigateCard(1);
  }
}

function navigateCard(direction: number): void {
  const newIndex = (currentCardIndex + direction + CARD_COUNT) % CARD_COUNT;
  currentCardIndex = newIndex;
  updateCardCounter(newIndex);
  startFocusAnimation(newIndex);
}

function startFocusAnimation(index: number): void {
  isCameraAnimating = true;
  cameraAnimProgress = 0;
  cameraAnimDuration = 0.5;

  cameraStartPos.copy(camera.position);
  cameraStartLookAt.set(0, 0, 0);

  const cardAngle = (index / CARD_COUNT) * Math.PI * 2;
  const targetAngle = cardAngle + Math.PI;

  const targetX = Math.cos(targetAngle) * cameraDistance;
  const targetZ = Math.sin(targetAngle) * cameraDistance;

  cameraEndPos.set(targetX, CAMERA_HEIGHT, targetZ);
  cameraEndLookAt.set(0, 0, 0);

  targetCameraAngle = targetAngle;
}

function cubicBezier(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateCardCounter(index: number): void {
  CARD_COUNTER.textContent = `Card ${index + 1} of ${CARD_COUNT}`;
}

function updateCards(deltaTime: number): void {
  const hoverSpeed = 8;
  const flipSpeed = 5;

  cards.forEach((card) => {
    const targetHoverProgress = card.isHovered || card === selectedCard ? 1 : 0;
    card.hoverProgress += (targetHoverProgress - card.hoverProgress) * hoverSpeed * deltaTime;

    const hoverOffset = card.hoverProgress * 0.3;
    const hoverScale = 1 + card.hoverProgress * 0.05;

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(card.group.quaternion);
    forward.normalize();

    const targetPos = card.originalPosition.clone().add(forward.multiplyScalar(hoverOffset));
    card.group.position.lerp(targetPos, 0.15);

    card.group.scale.setScalar(hoverScale);

    card.currentFlip += (card.targetFlip - card.currentFlip) * flipSpeed * deltaTime;
    card.frontMesh.rotation.y = card.currentFlip;

    const glowIntensity = card.hoverProgress * 0.5 + (card.isFlipped ? 0.3 : 0);
    const glowMaterial = card.glowMesh.material as THREE.MeshBasicMaterial;
    glowMaterial.opacity = glowIntensity;

    const edgeMaterial = card.edgeMesh.material as THREE.LineBasicMaterial;
    edgeMaterial.opacity = card.hoverProgress * 0.9;

    const materials = card.frontMesh.material as THREE.MeshStandardMaterial[];
    const emissiveIntensity = card.hoverProgress * 0.3 + (card.isFlipped ? 0.2 : 0);
    materials.forEach((m, i) => {
      if (i === 4 || i === 5) {
        m.emissiveIntensity = emissiveIntensity;
      }
    });
  });
}

function updateCamera(deltaTime: number): void {
  if (isCameraAnimating) {
    cameraAnimProgress += deltaTime / cameraAnimDuration;
    if (cameraAnimProgress >= 1) {
      cameraAnimProgress = 1;
      isCameraAnimating = false;
    }

    const t = cubicBezier(cameraAnimProgress);
    camera.position.lerpVectors(cameraStartPos, cameraEndPos, t);

    const currentLookAt = new THREE.Vector3().lerpVectors(cameraStartLookAt, cameraEndLookAt, t);
    camera.lookAt(currentLookAt);
  } else if (!selectedCard) {
    cameraAngle += (targetCameraAngle - cameraAngle) * 0.08;
    cameraDistance += (targetCameraDistance - cameraDistance) * 0.08;
    updateCameraPosition();
    camera.lookAt(0, 0, 0);

    updateCurrentCardIndex();
  }
}

function updateCurrentCardIndex(): void {
  let maxDot = -Infinity;
  let closestIndex = 0;

  cards.forEach((card, index) => {
    const cardWorldPos = new THREE.Vector3();
    card.group.getWorldPosition(cardWorldPos);

    const toCamera = new THREE.Vector3().subVectors(camera.position, cardWorldPos);
    toCamera.normalize();

    const cardNormal = new THREE.Vector3(0, 0, 1);
    cardNormal.applyQuaternion(card.group.quaternion);
    cardNormal.normalize();

    const dot = cardNormal.dot(toCamera);
    if (dot > maxDot) {
      maxDot = dot;
      closestIndex = index;
    }
  });

  if (closestIndex !== currentCardIndex) {
    currentCardIndex = closestIndex;
    updateCardCounter(currentCardIndex);
  }
}

let lastTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  updateCards(deltaTime);
  updateCamera(deltaTime);

  renderer.render(scene, camera);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
