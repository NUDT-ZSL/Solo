import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Residue } from './proteinModel';

export interface InteractionState {
  autoRotate: boolean;
  userInteracting: boolean;
  hoveredResidue: Residue | null;
  shiftPressed: boolean;
  selectedForMeasurement: Residue[];
  labelRenderer: CSS2DRenderer;
  controls: OrbitControls;
}

export interface Measurement {
  line: THREE.Line;
  label: CSS2DObject;
  fromResidue: Residue;
  toResidue: Residue;
}

const HIGHLIGHT_SCALE = 1.3;
const DEFAULT_SCALE = 1.0;
const INITIAL_DISTANCE = 60;
const INITIAL_ELEVATION = 30;

export function setupInteraction(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  labelContainer: HTMLElement
): InteractionState {
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.0;
  controls.minDistance = INITIAL_DISTANCE * 0.5;
  controls.maxDistance = INITIAL_DISTANCE * 5;
  controls.enablePan = false;

  setInitialCameraPosition(camera, controls);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelContainer.appendChild(labelRenderer.domElement);

  return {
    autoRotate: false,
    userInteracting: false,
    hoveredResidue: null,
    shiftPressed: false,
    selectedForMeasurement: [],
    labelRenderer,
    controls,
  };
}

export function setInitialCameraPosition(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): void {
  const elevationRad = (INITIAL_ELEVATION * Math.PI) / 180;
  const x = INITIAL_DISTANCE * Math.cos(elevationRad) * Math.cos(Math.PI / 4);
  const y = INITIAL_DISTANCE * Math.sin(elevationRad);
  const z = INITIAL_DISTANCE * Math.cos(elevationRad) * Math.sin(Math.PI / 4);

  camera.position.set(x, y, z);
  controls.target.set(0, 0, 0);
  controls.update();
}

export function animateCameraReset(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  duration: number = 500
): Promise<void> {
  return new Promise((resolve) => {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();

    const elevationRad = (INITIAL_ELEVATION * Math.PI) / 180;
    const endX = INITIAL_DISTANCE * Math.cos(elevationRad) * Math.cos(Math.PI / 4);
    const endY = INITIAL_DISTANCE * Math.sin(elevationRad);
    const endZ = INITIAL_DISTANCE * Math.cos(elevationRad) * Math.sin(Math.PI / 4);
    const endPos = new THREE.Vector3(endX, endY, endZ);
    const endTarget = new THREE.Vector3(0, 0, 0);

    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      camera.position.lerpVectors(startPos, endPos, easeT);
      controls.target.lerpVectors(startTarget, endTarget, easeT);
      controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    animate();
  });
}

export function createResidueLabel(residue: Residue): CSS2DObject {
  const div = document.createElement('div');
  div.className = 'residue-label';
  div.innerHTML = `
    <div class="name">${residue.name}</div>
    <div class="type">${residue.typeLabel}</div>
    <div class="index">#${residue.index + 1}</div>
  `;
  const label = new CSS2DObject(div);
  label.position.copy(residue.position);
  label.position.y += 12;
  return label;
}

export function highlightResidue(residue: Residue | null, previous: Residue | null): void {
  if (previous && previous !== residue) {
    previous.sphere.scale.setScalar(DEFAULT_SCALE);
    (previous.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
    previous.glowMesh.visible = false;
  }

  if (residue) {
    residue.sphere.scale.setScalar(HIGHLIGHT_SCALE);
    residue.glowMesh.visible = true;
    const glowMat = residue.glowMesh.material as THREE.MeshBasicMaterial;
    glowMat.opacity = 0.5;
    glowMat.color.set(0x00FFFF);
  }
}

export function handleRaycast(
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  residues: Residue[],
  raycaster: THREE.Raycaster,
  mouse: THREE.Vector2
): Residue | null {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const meshes = residues.map((r) => r.sphere);
  const intersects = raycaster.intersectObjects(meshes, false);

  if (intersects.length > 0) {
    const hitMesh = intersects[0].object as THREE.Mesh;
    const index = hitMesh.userData.residueIndex;
    return residues[index] || null;
  }
  return null;
}

export function createMeasurement(
  from: Residue,
  to: Residue,
  scene: THREE.Scene
): Measurement {
  const points = [from.position.clone(), to.position.clone()];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0xFF00FF,
    dashSize: 4,
    gapSize: 4,
    linewidth: 1.5,
    transparent: true,
    opacity: 0.9,
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  scene.add(line);

  const distance = from.position.distanceTo(to.position).toFixed(1);
  const div = document.createElement('div');
  div.className = 'distance-label';
  div.textContent = `${distance} 单位`;
  const label = new CSS2DObject(div);
  const midPoint = new THREE.Vector3().addVectors(from.position, to.position).multiplyScalar(0.5);
  label.position.copy(midPoint);
  label.position.y += 5;
  scene.add(label);

  return { line, label, fromResidue: from, toResidue: to };
}

export function removeMeasurement(measurement: Measurement, scene: THREE.Scene): void {
  scene.remove(measurement.line);
  scene.remove(measurement.label);
  measurement.line.geometry.dispose();
  (measurement.line.material as THREE.Material).dispose();
  if (measurement.label.element.parentNode) {
    measurement.label.element.parentNode.removeChild(measurement.label.element);
  }
}

export function setupEventListeners(
  state: InteractionState,
  canvas: HTMLCanvasElement,
  camera: THREE.PerspectiveCamera,
  residues: Residue[],
  scene: THREE.Scene,
  proteinGroup: THREE.Group,
  onHoverChange: (residue: Residue | null) => void,
  onMeasurement: (from: Residue, to: Residue) => Measurement | null,
  onClearMeasurement: () => void
): { cleanup: () => void } {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let activeLabel: CSS2DObject | null = null;

  function updateHoverState(event: MouseEvent): void {
    const hit = handleRaycast(event, canvas, camera, residues, raycaster, mouse);

    if (hit !== state.hoveredResidue) {
      highlightResidue(hit, state.hoveredResidue);

      if (activeLabel) {
        scene.remove(activeLabel);
        if (activeLabel.element.parentNode) {
          activeLabel.element.parentNode.removeChild(activeLabel.element);
        }
        activeLabel = null;
      }

      if (hit) {
        activeLabel = createResidueLabel(hit);
        scene.add(activeLabel);
      }

      state.hoveredResidue = hit;
      onHoverChange(hit);
    }
  }

  function onMouseMove(event: MouseEvent): void {
    updateHoverState(event);
  }

  function onClick(event: MouseEvent): void {
    if (!state.shiftPressed) return;
    const hit = handleRaycast(event, canvas, camera, residues, raycaster, mouse);
    if (!hit) return;

    const selected = state.selectedForMeasurement;

    if (selected.length === 0 || selected.length === 2) {
      state.selectedForMeasurement = [hit];
      onClearMeasurement();
    } else if (selected.length === 1) {
      if (selected[0] !== hit) {
        state.selectedForMeasurement.push(hit);
        onMeasurement(selected[0], hit);
      }
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      state.autoRotate = !state.autoRotate;
    }
    if (event.key === 'Shift') {
      state.shiftPressed = true;
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Shift') {
      state.shiftPressed = false;
    }
  }

  function onControlStart(): void {
    state.userInteracting = true;
  }

  function onControlEnd(): void {
    state.userInteracting = false;
  }

  function onResize(): void {
    const parent = canvas.parentElement;
    if (parent) {
      state.labelRenderer.setSize(parent.clientWidth, parent.clientHeight);
    }
  }

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  state.controls.addEventListener('start', onControlStart);
  state.controls.addEventListener('end', onControlEnd);
  window.addEventListener('resize', onResize);

  return {
    cleanup: () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      state.controls.removeEventListener('start', onControlStart);
      state.controls.removeEventListener('end', onControlEnd);
      window.removeEventListener('resize', onResize);
      if (activeLabel) {
        scene.remove(activeLabel);
      }
    },
  };
}

export function applyAutoRotate(
  state: InteractionState,
  proteinGroup: THREE.Group,
  deltaTime: number
): void {
  if (state.autoRotate && !state.userInteracting) {
    const rotationSpeed = 0.5;
    const anglePerFrame = (rotationSpeed * Math.PI) / 180;
    proteinGroup.rotation.y += anglePerFrame;
  }
}
