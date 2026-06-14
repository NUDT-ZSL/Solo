import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { WaveForecastResponse, StationData } from "./data-service";

export interface TerrainContext {
  dispose: () => void;
  updateTerrain: (data: WaveForecastResponse) => void;
  onStationClick: (cb: (station: StationData) => void) => void;
  onStationHover: (cb: (station: StationData | null) => void) => void;
}

const GRID_SEG = 40;
const TERRAIN_SIZE = 10;
const STATION_RADIUS = 0.15;

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().copy(a).lerp(b, t);
}

function heightToColor(height: number): THREE.Color {
  const h = Math.max(-5, Math.min(5, height));
  const t = (h + 5) / 10;
  const deep = hexToRgb("#0f172a");
  const teal = hexToRgb("#2dd4bf");
  const white = hexToRgb("#f8fafc");
  if (t < 0.5) {
    return lerpColor(deep, teal, t * 2);
  }
  return lerpColor(teal, white, (t - 0.5) * 2);
}

function generateNormalMap(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = Math.sin(x * 0.08) * 0.5 + 0.5;
      const ny = Math.cos(y * 0.08) * 0.5 + 0.5;
      const nz = 0.7 + 0.3 * Math.sin((x + y) * 0.05);
      img.data[idx] = Math.floor(nx * 255);
      img.data[idx + 1] = Math.floor(ny * 255);
      img.data[idx + 2] = Math.floor(nz * 255);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function createTerrain(container: HTMLElement): TerrainContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#020617");

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  const dist = 14;
  camera.position.set(
    dist * Math.cos(Math.PI / 4),
    dist * Math.sin(Math.PI / 4),
    dist * Math.cos(Math.PI / 4)
  );
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI / 2.1;

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const polarHelper = new THREE.Group();
  const ringMat = new THREE.LineBasicMaterial({
    color: 0x334155,
    transparent: true,
    opacity: 0.6
  });
  for (let r = 1; r <= 5; r++) {
    const curve = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(64).map((p) => new THREE.Vector3(p.x, -0.05, p.y));
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    polarHelper.add(new THREE.Line(geom, ringMat));
  }
  for (let a = 0; a < 8; a++) {
    const angle = (a / 8) * Math.PI * 2;
    const points = [
      new THREE.Vector3(0, -0.05, 0),
      new THREE.Vector3(Math.cos(angle) * 5, -0.05, Math.sin(angle) * 5)
    ];
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    polarHelper.add(new THREE.Line(geom, ringMat));
  }
  scene.add(polarHelper);

  const terrainGeom = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    GRID_SEG,
    GRID_SEG
  );
  terrainGeom.rotateX(-Math.PI / 2);

  const colors = new Float32Array(terrainGeom.attributes.position.count * 3);
  terrainGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const normalMap = generateNormalMap(256);
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    normalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
    transparent: true,
    opacity: 0.95,
    roughness: 0.6,
    metalness: 0.1
  });
  const terrain = new THREE.Mesh(terrainGeom, terrainMat);
  scene.add(terrain);

  const stationGroup = new THREE.Group();
  scene.add(stationGroup);
  const stationMeshes: { mesh: THREE.Mesh; halo: THREE.Mesh; data: StationData }[] = [];
  const stationGeom = new THREE.SphereGeometry(STATION_RADIUS, 16, 16);
  const haloGeom = new THREE.SphereGeometry(STATION_RADIUS * 2, 16, 16);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let clickCb: ((s: StationData) => void) | null = null;
  let hoverCb: ((s: StationData | null) => void) | null = null;
  let hovered: typeof stationMeshes[number] | null = null;

  function onPointerMove(e: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      stationMeshes.map((s) => s.mesh),
      false
    );
    if (hits.length > 0) {
      const found = stationMeshes.find((s) => s.mesh === hits[0].object);
      if (found && found !== hovered) {
        if (hovered) resetStation(hovered);
        hovered = found;
        highlightStation(found);
        hoverCb?.(found.data);
        renderer.domElement.style.cursor = "pointer";
      }
    } else if (hovered) {
      resetStation(hovered);
      hovered = null;
      hoverCb?.(null);
      renderer.domElement.style.cursor = "";
    }
  }

  function onClick() {
    if (hovered && clickCb) clickCb(hovered.data);
  }

  function highlightStation(item: typeof stationMeshes[number]) {
    item.mesh.scale.setScalar(1.2);
    item.halo.visible = true;
  }

  function resetStation(item: typeof stationMeshes[number]) {
    item.mesh.scale.setScalar(1);
    item.halo.visible = false;
  }

  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("click", onClick);

  function buildStations(stations: StationData[]) {
    while (stationGroup.children.length > 0) {
      const c = stationGroup.children[0];
      stationGroup.remove(c);
    }
    stationMeshes.length = 0;
    hovered = null;

    stations.forEach((s) => {
      const x = ((s.lon - 120) / 60) * (TERRAIN_SIZE / 2);
      const z = ((s.lat - 30) / 40) * (TERRAIN_SIZE / 2);
      const y = 0.25;

      const mat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b
      });
      const mesh = new THREE.Mesh(stationGeom, mat);
      mesh.position.set(x, y, z);
      stationGroup.add(mesh);

      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25
      });
      const halo = new THREE.Mesh(haloGeom, haloMat);
      halo.position.copy(mesh.position);
      halo.visible = false;
      stationGroup.add(halo);

      stationMeshes.push({ mesh, halo, data: s });
    });
  }

  function applyTerrainData(data: WaveForecastResponse) {
    const pos = terrainGeom.attributes.position;
    const col = terrainGeom.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const h = data.grid[i]?.height ?? 0;
      pos.setY(i, h);
      const c = heightToColor(h);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    terrainGeom.computeVertexNormals();
    buildStations(data.stations);
  }

  let raf = 0;
  let startTime = performance.now();

  function animate() {
    raf = requestAnimationFrame(animate);
    const t = (performance.now() - startTime) / 1000;
    normalMap.offset.x = (t * 0.03) % 1;
    normalMap.offset.y = (t * 0.02) % 1;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  return {
    updateTerrain: applyTerrainData,
    onStationClick: (cb) => {
      clickCb = cb;
    },
    onStationHover: (cb) => {
      hoverCb = cb;
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      terrainGeom.dispose();
      terrainMat.dispose();
      normalMap.dispose();
      stationGeom.dispose();
      haloGeom.dispose();
      stationMeshes.forEach((s) => {
        (s.mesh.material as THREE.Material).dispose();
        (s.halo.material as THREE.Material).dispose();
      });
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    }
  };
}
