import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { TerrainData } from './terrainLoader';

export interface ProbeResult {
  position: THREE.Vector3;
  elevation: number;
  uv: THREE.Vector2;
  isValid: boolean;
}

export interface InteractionManager {
  controls: OrbitControls;
  probeMarker: THREE.Mesh;
  contourGroup: THREE.Group;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  contourEnabled: boolean;
  contourInterval: number;
  terrainData: TerrainData | null;
  terrainMesh: THREE.Mesh | null;
  camera: THREE.PerspectiveCamera;
  defaultCameraPos: THREE.Vector3;
  defaultTarget: THREE.Vector3;
  isResetting: boolean;
  resetStartTime: number;
  resetDuration: number;
  resetFromPos: THREE.Vector3;
  resetFromTarget: THREE.Vector3;
  dispose: () => void;
}

export function createInteractionManager(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  scene: THREE.Scene
): InteractionManager {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.0;
  controls.panSpeed = 0.8;
  controls.minDistance = 30;
  controls.maxDistance = 600;
  controls.maxPolarAngle = Math.PI * 0.48;

  const defaultCameraPos = new THREE.Vector3(0, 200, 280);
  const defaultTarget = new THREE.Vector3(0, 0, 0);
  camera.position.copy(defaultCameraPos);
  controls.target.copy(defaultTarget);
  controls.update();

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-9999, -9999);

  const probeGeometry = new THREE.RingGeometry(3, 5, 48);
  const probeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff88,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const probeMarker = new THREE.Mesh(probeGeometry, probeMaterial);
  probeMarker.visible = false;
  probeMarker.renderOrder = 999;
  scene.add(probeMarker);

  const contourGroup = new THREE.Group();
  contourGroup.name = 'contourGroup';
  contourGroup.visible = false;
  scene.add(contourGroup);

  const mgr: InteractionManager = {
    controls,
    probeMarker,
    contourGroup,
    raycaster,
    mouse,
    contourEnabled: false,
    contourInterval: 50,
    terrainData: null,
    terrainMesh: null,
    camera,
    defaultCameraPos,
    defaultTarget,
    isResetting: false,
    resetStartTime: 0,
    resetDuration: 1500,
    resetFromPos: new THREE.Vector3(),
    resetFromTarget: new THREE.Vector3(),
    dispose: () => {
      controls.dispose();
      probeGeometry.dispose();
      probeMaterial.dispose();
    },
  };

  return mgr;
}

export function probeTerrain(mgr: InteractionManager, sceneContainer: HTMLElement): ProbeResult {
  if (!mgr.terrainMesh || !mgr.terrainData) {
    return { position: new THREE.Vector3(), elevation: 0, uv: new THREE.Vector2(), isValid: false };
  }

  mgr.raycaster.setFromCamera(mgr.mouse, mgr.camera);
  const intersects = mgr.raycaster.intersectObject(mgr.terrainMesh, false);

  if (intersects.length === 0) {
    mgr.probeMarker.visible = false;
    return { position: new THREE.Vector3(), elevation: 0, uv: new THREE.Vector2(), isValid: false };
  }

  const hit = intersects[0];
  const point = hit.point;
  const uv = hit.uv || new THREE.Vector2();

  const data = mgr.terrainData;
  const elevRange = data.maxElevation - data.minElevation || 1;
  const normalizedY = (point.y) / 80;
  const elevation = data.minElevation + normalizedY * elevRange;

  mgr.probeMarker.position.copy(point);
  mgr.probeMarker.position.y += 0.5;
  mgr.probeMarker.lookAt(
    point.x,
    point.y + 100,
    point.z
  );
  mgr.probeMarker.visible = true;

  return { position: point, elevation, uv, isValid: true };
}

export function generateContours(mgr: InteractionManager): void {
  if (!mgr.terrainData || !mgr.terrainMesh) return;

  clearContours(mgr);

  const data = mgr.terrainData;
  const interval = mgr.contourInterval;
  const minLevel = Math.ceil(data.minElevation / interval) * interval;
  const maxLevel = Math.floor(data.maxElevation / interval) * interval;

  const positions = data.positions;
  const w = data.width;
  const h = data.height;
  const elevRange = data.maxElevation - data.minElevation || 1;

  for (let level = minLevel; level <= maxLevel; level += interval) {
    const segments: THREE.Vector3[][] = [];
    const t = (level - data.minElevation) / elevRange;

    for (let gz = 0; gz < h - 1; gz++) {
      for (let gx = 0; gx < w - 1; gx++) {
        const idx00 = gz * w + gx;
        const idx10 = gz * w + gx + 1;
        const idx01 = (gz + 1) * w + gx;
        const idx11 = (gz + 1) * w + gx + 1;

        const y00 = (positions[idx00 * 3 + 1] / 80) * elevRange + data.minElevation;
        const y10 = (positions[idx10 * 3 + 1] / 80) * elevRange + data.minElevation;
        const y01 = (positions[idx01 * 3 + 1] / 80) * elevRange + data.minElevation;
        const y11 = (positions[idx11 * 3 + 1] / 80) * elevRange + data.minElevation;

        const edges: [number, number, number, number][] = [
          [gx, gz, gx + 1, gz, y00, y10],
          [gx + 1, gz, gx + 1, gz + 1, y10, y11],
          [gx + 1, gz + 1, gx, gz + 1, y11, y01],
          [gx, gz + 1, gx, gz, y01, y00],
        ];

        const crossings: THREE.Vector3[] = [];

        for (const [x1, z1, x2, z2, v1, v2] of edges) {
          if ((v1 - level) * (v2 - level) < 0) {
            const frac = (level - v1) / (v2 - v1);
            const cx = x1 + frac * (x2 - x1);
            const cz = z1 + frac * (z2 - z1);
            const pIdx1 = z1 * w + x1;
            const pIdx2 = z2 * w + x2;
            const py1 = positions[pIdx1 * 3 + 1];
            const py2 = positions[pIdx2 * 3 + 1];
            const cy = py1 + frac * (py2 - py1) + 0.15;
            crossings.push(new THREE.Vector3(
              (cx / (w - 1) - 0.5) * 500,
              cy,
              (cz / (h - 1) - 0.5) * 500
            ));
          }
        }

        if (crossings.length >= 2) {
          segments.push(crossings);
        }
      }
    }

    if (segments.length === 0) continue;

    const points: THREE.Vector3[] = [];
    for (const seg of segments) {
      for (const p of seg) {
        points.push(p);
      }
      points.push(new THREE.Vector3(NaN, NaN, NaN));
    }

    const validPoints = points.filter(p => !isNaN(p.x));
    if (validPoints.length < 2) continue;

    const r = t;
    const color = new THREE.Color();
    color.setHSL((1 - r) * 0.66, 1.0, 0.55);

    for (const seg of segments) {
      if (seg.length < 2) continue;
      const lineGeo = new THREE.BufferGeometry().setFromPoints(seg);
      const lineMat = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.85,
        linewidth: 1,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.renderOrder = 100;
      mgr.contourGroup.add(line);

      const glowGeo = new THREE.BufferGeometry().setFromPoints(seg);
      const glowMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(0.3, 0.5, 1.0),
        transparent: true,
        opacity: 0.25,
        linewidth: 1,
      });
      const glowLine = new THREE.Line(glowGeo, glowMat);
      glowLine.renderOrder = 99;
      glowLine.scale.set(1.02, 1.02, 1.02);
      mgr.contourGroup.add(glowLine);
    }
  }
}

export function clearContours(mgr: InteractionManager): void {
  while (mgr.contourGroup.children.length > 0) {
    const child = mgr.contourGroup.children[0];
    if (child instanceof THREE.Line) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
    mgr.contourGroup.remove(child);
  }
}

export function toggleContours(mgr: InteractionManager, enabled: boolean): void {
  mgr.contourEnabled = enabled;
  mgr.contourGroup.visible = enabled;
  if (enabled && mgr.contourGroup.children.length === 0) {
    generateContours(mgr);
  }
}

export function resetCamera(mgr: InteractionManager): void {
  mgr.isResetting = true;
  mgr.resetStartTime = performance.now();
  mgr.resetFromPos.copy(mgr.camera.position);
  mgr.resetFromTarget.copy(mgr.controls.target);
}

export function updateCameraReset(mgr: InteractionManager): boolean {
  if (!mgr.isResetting) return false;
  const elapsed = performance.now() - mgr.resetStartTime;
  const t = Math.min(elapsed / mgr.resetDuration, 1);
  const eased = 1 - Math.pow(1 - t, 3);

  mgr.camera.position.lerpVectors(mgr.resetFromPos, mgr.defaultCameraPos, eased);
  mgr.controls.target.lerpVectors(mgr.resetFromTarget, mgr.defaultTarget, eased);
  mgr.controls.update();

  if (t >= 1) {
    mgr.isResetting = false;
  }
  return true;
}

export function updateMousePosition(mgr: InteractionManager, event: MouseEvent, container: HTMLElement): void {
  const rect = container.getBoundingClientRect();
  mgr.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mgr.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}
