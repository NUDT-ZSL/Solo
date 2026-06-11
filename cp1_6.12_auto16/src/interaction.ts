import * as THREE from 'three';
import type { TerrainData } from './terrainLoader';

export interface ProbeResult {
  position: THREE.Vector3;
  elevation: number;
  uv: THREE.Vector2;
  isValid: boolean;
}

export interface InteractionManager {
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  probeMarker: THREE.Mesh;
  probeRing: THREE.Mesh;
  terrainMesh: THREE.Mesh | null;
  terrainData: TerrainData | null;
  updateMousePosition: (event: MouseEvent, container: HTMLElement) => void;
  probeTerrain: (camera: THREE.Camera) => ProbeResult;
  setTerrainMesh: (mesh: THREE.Mesh, data: TerrainData) => void;
  setMarkerVisible: (visible: boolean) => void;
  dispose: () => void;
}

export function createInteractionManager(scene: THREE.Scene): InteractionManager {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-9999, -9999);

  const ringGeo = new THREE.RingGeometry(2.5, 4.5, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffff66,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const probeRing = new THREE.Mesh(ringGeo, ringMat);
  probeRing.visible = false;
  probeRing.renderOrder = 999;
  scene.add(probeRing);

  const innerRingGeo = new THREE.RingGeometry(0.2, 0.6, 32);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0xffff88,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const probeMarker = new THREE.Mesh(innerRingGeo, innerRingMat);
  probeMarker.visible = false;
  probeMarker.renderOrder = 1000;
  scene.add(probeMarker);

  const mgr: InteractionManager = {
    raycaster,
    mouse,
    probeMarker,
    probeRing,
    terrainMesh: null,
    terrainData: null,

    updateMousePosition(event: MouseEvent, container: HTMLElement) {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    },

    setTerrainMesh(mesh: THREE.Mesh, data: TerrainData) {
      mgr.terrainMesh = mesh;
      mgr.terrainData = data;
    },

    setMarkerVisible(visible: boolean) {
      probeRing.visible = visible;
      probeMarker.visible = visible;
    },

    probeTerrain(camera: THREE.Camera): ProbeResult {
      if (!mgr.terrainMesh || !mgr.terrainData) {
        probeRing.visible = false;
        probeMarker.visible = false;
        return {
          position: new THREE.Vector3(),
          elevation: 0,
          uv: new THREE.Vector2(),
          isValid: false,
        };
      }

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(mgr.terrainMesh, false);

      if (intersects.length === 0) {
        probeRing.visible = false;
        probeMarker.visible = false;
        return {
          position: new THREE.Vector3(),
          elevation: 0,
          uv: new THREE.Vector2(),
          isValid: false,
        };
      }

      const hit = intersects[0];
      const point = hit.point;
      const uv = hit.uv || new THREE.Vector2();

      const data = mgr.terrainData;
      const elevRange = data.maxElevation - data.minElevation || 1;
      const normalizedY = point.y / data.scaleY;
      const elevation = data.minElevation + normalizedY * elevRange;

      probeRing.position.copy(point);
      probeRing.position.y += 0.5;
      probeRing.lookAt(point.x, point.y + 100, point.z);
      probeRing.visible = true;

      probeMarker.position.copy(point);
      probeMarker.position.y += 0.6;
      probeMarker.lookAt(point.x, point.y + 100, point.z);
      probeMarker.visible = true;

      return {
        position: point,
        elevation,
        uv,
        isValid: true,
      };
    },

    dispose() {
      ringGeo.dispose();
      ringMat.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
    },
  };

  return mgr;
}
