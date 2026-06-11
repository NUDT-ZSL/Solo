import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface CameraController {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  defaultPosition: THREE.Vector3;
  defaultTarget: THREE.Vector3;
  isResetting: boolean;
  resetStartTime: number;
  resetDuration: number;
  resetFromPos: THREE.Vector3;
  resetFromTarget: THREE.Vector3;
  reset: () => void;
  update: () => boolean;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export function createCameraController(
  width: number,
  height: number,
  domElement: HTMLElement
): CameraController {
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.5, 2000);
  const defaultPosition = new THREE.Vector3(0, 250, 320);
  const defaultTarget = new THREE.Vector3(0, 0, 0);
  camera.position.copy(defaultPosition);

  const controls = new OrbitControls(camera, domElement);
  controls.target.copy(defaultTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.7;
  controls.minDistance = 40;
  controls.maxDistance = 700;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.update();

  const ctrl: CameraController = {
    camera,
    controls,
    defaultPosition,
    defaultTarget,
    isResetting: false,
    resetStartTime: 0,
    resetDuration: 1500,
    resetFromPos: new THREE.Vector3(),
    resetFromTarget: new THREE.Vector3(),

    reset() {
      ctrl.isResetting = true;
      ctrl.resetStartTime = performance.now();
      ctrl.resetFromPos.copy(camera.position);
      ctrl.resetFromTarget.copy(controls.target);
    },

    update(): boolean {
      if (!ctrl.isResetting) {
        controls.update();
        return false;
      }

      const elapsed = performance.now() - ctrl.resetStartTime;
      const t = Math.min(elapsed / ctrl.resetDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      camera.position.lerpVectors(ctrl.resetFromPos, ctrl.defaultPosition, eased);
      controls.target.lerpVectors(ctrl.resetFromTarget, ctrl.defaultTarget, eased);
      controls.update();

      if (t >= 1) {
        ctrl.isResetting = false;
      }
      return true;
    },

    resize(width: number, height: number) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },

    dispose() {
      controls.dispose();
    },
  };

  return ctrl;
}
