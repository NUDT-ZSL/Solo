import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface CameraAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
}

export function createOrbitControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.panSpeed = 0.6;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.9;
  controls.minDistance = 10;
  controls.maxDistance = 400;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI - 0.05;
  controls.screenSpacePanning = false;
  controls.target.set(0, 0, 0);

  return controls;
}

export function createCameraAnimation(
  controls: OrbitControls,
  camera: THREE.PerspectiveCamera,
  targetPosition: THREE.Vector3,
  lookAtPosition: THREE.Vector3,
  duration: number = 600
): CameraAnimation {
  return {
    active: true,
    startTime: performance.now(),
    duration,
    startPosition: camera.position.clone(),
    endPosition: targetPosition.clone(),
    startTarget: controls.target.clone(),
    endTarget: lookAtPosition.clone()
  };
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function updateCameraAnimation(
  animation: CameraAnimation,
  controls: OrbitControls,
  camera: THREE.PerspectiveCamera
): boolean {
  if (!animation.active) return false;

  const elapsed = performance.now() - animation.startTime;
  const progress = Math.min(elapsed / animation.duration, 1);
  const eased = easeInOutCubic(progress);

  camera.position.lerpVectors(
    animation.startPosition,
    animation.endPosition,
    eased
  );
  controls.target.lerpVectors(
    animation.startTarget,
    animation.endTarget,
    eased
  );

  if (progress >= 1) {
    animation.active = false;
    camera.position.copy(animation.endPosition);
    controls.target.copy(animation.endTarget);
    return false;
  }

  return true;
}

export function setupRaycaster(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): {
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  intersect: (
    objects: THREE.Object3D[],
    recursive?: boolean
  ) => THREE.Intersection[];
} {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const intersect = (objects: THREE.Object3D[], recursive: boolean = true) => {
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(objects, recursive);
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  domElement.addEventListener('pointermove', onPointerMove, { passive: true });

  return { raycaster, mouse, intersect };
}
