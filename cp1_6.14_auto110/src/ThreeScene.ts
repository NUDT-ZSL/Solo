import * as THREE from "three";
import {
  ConfigData,
  ContinentData,
  PlateBoundaryData,
  interpolateContinent,
  interpolateBoundary,
  continentCentroid,
} from "./dataLoader";

interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLDivElement;
  globe: THREE.Mesh;
  continents: Map<string, THREE.Mesh>;
  boundaries: Map<string, THREE.Line>;
  boundaryData: Map<string, PlateBoundaryData>;
  continentData: Map<string, ContinentData>;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  stars: THREE.Points;
  controls: OrbitControlsState;
  animationId: number;
  isDragging: boolean;
  lastMouseDown: number;
  lastMouseDownPos: { x: number; y: number };
  flying: boolean;
  flyTarget?: {
    startPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endPos: THREE.Vector3;
    endTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  };
  infoCard: HTMLDivElement | null;
  hoveredBoundary: string | null;
  onClickBoundary: (data: PlateBoundaryData, screenX: number, screenY: number) => void;
  onHoverBoundary: (data: PlateBoundaryData | null, screenX: number, screenY: number) => void;
  onDoubleClickContinent: (continentId: string) => void;
  currentTime: number;
}

interface OrbitControlsState {
  target: THREE.Vector3;
  spherical: { radius: number; theta: number; phi: number };
}

type ViewMode = "free" | "paleo";

let ctx: SceneContext | null = null;
let currentViewMode: ViewMode = "free";

const BOUNDARY_COLORS: Record<string, number> = {
  convergent: 0xff6b6b,
  divergent: 0x51cf66,
  transform: 0xffd43b,
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createStars(): THREE.Points {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const opacities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = 50 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 1 + Math.random() * 2;
    opacities[i] = 0.3 + Math.random() * 0.5;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geom.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const cctx = canvas.getContext("2d")!;
  const grad = cctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  cctx.fillStyle = grad;
  cctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);

  const mat = new THREE.PointsMaterial({
    size: 0.2,
    map: tex,
    transparent: true,
    vertexColors: false,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 1,
  });

  return new THREE.Points(geom, mat);
}

function createGlobe(): THREE.Mesh {
  const geom = new THREE.SphereGeometry(2, 64, 64);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const cctx = canvas.getContext("2d")!;
  const bg = cctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, "#1a3a5c");
  bg.addColorStop(0.5, "#1e4a7a");
  bg.addColorStop(1, "#12283f");
  cctx.fillStyle = bg;
  cctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 120; i++) {
    cctx.fillStyle = `rgba(180,220,255,${0.03 + Math.random() * 0.05})`;
    cctx.beginPath();
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 20 + Math.random() * 80;
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);

  const mat = new THREE.MeshPhongMaterial({
    map: tex,
    shininess: 5,
    specular: 0x223344,
  });
  return new THREE.Mesh(geom, mat);
}

function createContinentMesh(data: ContinentData, time: number): THREE.Mesh {
  const positions = interpolateContinent(data, time);
  const count = positions.length / 3;
  const indices: number[] = [];
  const cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < count; i++) {
    cx += positions[i * 3];
    cy += positions[i * 3 + 1];
    cz += positions[i * 3 + 2];
  }
  const cix = new Float32Array(3);
  cix[0] = cx / count;
  cix[1] = cy / count;
  cix[2] = cz / count;
  const clen = Math.sqrt(cix[0] ** 2 + cix[1] ** 2 + cix[2] ** 2);
  cix[0] = (cix[0] / clen) * 2.01;
  cix[1] = (cix[1] / clen) * 2.01;
  cix[2] = (cix[2] / clen) * 2.01;
  const centerIdx = count;
  const fullPositions = new Float32Array((count + 1) * 3);
  for (let i = 0; i < count; i++) {
    fullPositions[i * 3] = positions[i * 3];
    fullPositions[i * 3 + 1] = positions[i * 3 + 1];
    fullPositions[i * 3 + 2] = positions[i * 3 + 2];
  }
  fullPositions[centerIdx * 3] = cix[0];
  fullPositions[centerIdx * 3 + 1] = cix[1];
  fullPositions[centerIdx * 3 + 2] = cix[2];

  for (let i = 0; i < count; i++) {
    const a = i;
    const b = (i + 1) % count;
    indices.push(a, b, centerIdx);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(fullPositions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    color: data.color || 0x4a8c6f,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    shininess: 20,
    specular: 0x112233,
    wireframe: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData.continentId = data.id;
  mesh.userData.continentName = data.name;
  return mesh;
}

function createBoundaryMesh(data: PlateBoundaryData, time: number): THREE.Line {
  const positions = interpolateBoundary(data, time);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const color = BOUNDARY_COLORS[data.type] || 0xffffff;
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    linewidth: 2,
  });
  const line = new THREE.Line(geom, mat);
  line.userData.boundaryId = data.id;
  line.userData.boundaryData = data;
  return line;
}

interface InitOptions {
  onClickBoundary: (data: PlateBoundaryData, x: number, y: number) => void;
  onHoverBoundary: (data: PlateBoundaryData | null, x: number, y: number) => void;
  onDoubleClickContinent: (continentId: string) => void;
}

export function init(container: HTMLDivElement, options: InitOptions): void {
  const scene = new THREE.Scene();
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = 2;
  bgCanvas.height = 256;
  const bgc = bgCanvas.getContext("2d")!;
  const g = bgc.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#1a1a3a");
  g.addColorStop(1, "#0a0a1a");
  bgc.fillStyle = g;
  bgc.fillRect(0, 0, 2, 256);
  const bgTex = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTex;

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(0, 2.5, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.cursor = "grab";

  const amb = new THREE.AmbientLight(0x6677aa, 0.7);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffeedd, 0.9);
  dir.position.set(5, 6, 4);
  scene.add(dir);
  const dir2 = new THREE.DirectionalLight(0x8899cc, 0.3);
  dir2.position.set(-4, -2, -5);
  scene.add(dir2);

  const stars = createStars();
  scene.add(stars);

  const globe = createGlobe();
  scene.add(globe);

  ctx = {
    scene,
    camera,
    renderer,
    container,
    globe,
    continents: new Map(),
    boundaries: new Map(),
    boundaryData: new Map(),
    continentData: new Map(),
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    stars,
    controls: {
      target: new THREE.Vector3(0, 0, 0),
      spherical: { radius: 6, theta: 0, phi: Math.PI / 2.5 },
    },
    animationId: 0,
    isDragging: false,
    lastMouseDown: 0,
    lastMouseDownPos: { x: 0, y: 0 },
    flying: false,
    infoCard: null,
    hoveredBoundary: null,
    onClickBoundary: options.onClickBoundary,
    onHoverBoundary: options.onHoverBoundary,
    onDoubleClickContinent: options.onDoubleClickContinent,
    currentTime: 0,
  };

  updateCameraFromSpherical();
  attachEventListeners();
  animate();
}

function updateCameraFromSpherical(): void {
  if (!ctx) return;
  const { spherical, target } = ctx.controls;
  const { radius, theta, phi } = spherical;
  ctx.camera.position.set(
    target.x + radius * Math.sin(phi) * Math.cos(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.sin(theta)
  );
  ctx.camera.lookAt(target);
}

let lastMoveX = 0;
let lastMoveY = 0;
let clickStartX = 0;
let clickStartY = 0;
let moveDelta = 0;

function attachEventListeners(): void {
  if (!ctx) return;
  const canvas = ctx.renderer.domElement;
  const c = ctx;

  canvas.addEventListener("mousedown", (e) => {
    c.isDragging = true;
    c.lastMouseDown = performance.now();
    clickStartX = e.clientX;
    clickStartY = e.clientY;
    c.lastMouseDownPos = { x: e.clientX, y: e.clientY };
    lastMoveX = e.clientX;
    lastMoveY = e.clientY;
    moveDelta = 0;
    canvas.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", (e) => {
    if (!c.isDragging) return;
    c.isDragging = false;
    canvas.style.cursor = "grab";
    const dx = e.clientX - clickStartX;
    const dy = e.clientY - clickStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) {
      handleClick(e);
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (c.isDragging && !c.flying) {
      const dx = e.clientX - lastMoveX;
      const dy = e.clientY - lastMoveY;
      moveDelta += Math.abs(dx) + Math.abs(dy);
      c.controls.spherical.theta -= dx * 0.005;
      c.controls.spherical.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, c.controls.spherical.phi - dy * 0.005)
      );
      updateCameraFromSpherical();
      lastMoveX = e.clientX;
      lastMoveY = e.clientY;
    }
    handleHover(e);
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.08 : 0.92;
    c.controls.spherical.radius = Math.max(2.5, Math.min(15, c.controls.spherical.radius * delta));
    updateCameraFromSpherical();
  }, { passive: false });

  canvas.addEventListener("dblclick", (e) => {
    handleDoubleClick(e);
  });

  window.addEventListener("resize", onResize);
}

function onResize(): void {
  if (!ctx) return;
  const w = ctx.container.clientWidth;
  const h = ctx.container.clientHeight;
  ctx.camera.aspect = w / h;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(w, h);
}

function handleClick(e: MouseEvent): void {
  if (!ctx) return;
  updateRaycaster(e);
  const boundaryMeshes = Array.from(ctx.boundaries.values());
  const hits = ctx.raycaster.intersectObjects(boundaryMeshes, false);
  if (hits.length > 0) {
    const line = hits[0].object as THREE.Line;
    const data: PlateBoundaryData = line.userData.boundaryData;
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ctx.onClickBoundary(data, e.clientX - rect.left, e.clientY - rect.top);
  }
}

function handleDoubleClick(e: MouseEvent): void {
  if (!ctx) return;
  updateRaycaster(e);
  const continentMeshes = Array.from(ctx.continents.values());
  const hits = ctx.raycaster.intersectObjects(continentMeshes, false);
  if (hits.length > 0) {
    const mesh = hits[0].object as THREE.Mesh;
    const id: string = mesh.userData.continentId;
    ctx.onDoubleClickContinent(id);
  }
}

function handleHover(e: MouseEvent): void {
  if (!ctx) return;
  updateRaycaster(e);
  const boundaryMeshes = Array.from(ctx.boundaries.values());
  const hits = ctx.raycaster.intersectObjects(boundaryMeshes, false);
  if (hits.length > 0) {
    const line = hits[0].object as THREE.Line;
    const data: PlateBoundaryData = line.userData.boundaryData;
    if (ctx.hoveredBoundary !== data.id) {
      ctx.hoveredBoundary = data.id;
      highlightBoundary(data.id);
      ctx.renderer.domElement.style.cursor = "pointer";
    }
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    ctx.onHoverBoundary(data, e.clientX - rect.left, e.clientY - rect.top);
  } else {
    if (ctx.hoveredBoundary) {
      unhighlightBoundary(ctx.hoveredBoundary);
      ctx.hoveredBoundary = null;
      ctx.renderer.domElement.style.cursor = "grab";
    }
    ctx.onHoverBoundary(null, e.clientX, e.clientY);
  }
}

function updateRaycaster(e: MouseEvent): void {
  if (!ctx) return;
  const rect = ctx.renderer.domElement.getBoundingClientRect();
  ctx.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  ctx.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
}

function highlightBoundary(id: string): void {
  if (!ctx) return;
  const line = ctx.boundaries.get(id);
  if (line && line.material instanceof THREE.LineBasicMaterial) {
    line.material.opacity = 1;
  }
  ctx.boundaries.forEach((l, bid) => {
    if (bid !== id && l.material instanceof THREE.LineBasicMaterial) {
      l.material.opacity = 0.35;
    }
  });
}

function unhighlightBoundary(id: string): void {
  if (!ctx) return;
  ctx.boundaries.forEach((l) => {
    if (l.material instanceof THREE.LineBasicMaterial) {
      l.material.opacity = 0.85;
    }
  });
}

function animate(): void {
  if (!ctx) return;
  ctx.animationId = requestAnimationFrame(animate);

  ctx.stars.rotation.y += 0.0005;
  ctx.stars.rotation.x += 0.0002;

  if (ctx.flying && ctx.flyTarget) {
    const now = performance.now();
    let t = (now - ctx.flyTarget.startTime) / ctx.flyTarget.duration;
    if (t >= 1) {
      t = 1;
      ctx.flying = false;
    }
    const et = easeInOutCubic(t);
    ctx.camera.position.lerpVectors(ctx.flyTarget.startPos, ctx.flyTarget.endPos, et);
    const tv = new THREE.Vector3().lerpVectors(ctx.flyTarget.startTarget, ctx.flyTarget.endTarget, et);
    ctx.camera.lookAt(tv);
    const dir = new THREE.Vector3().subVectors(ctx.camera.position, tv);
    ctx.controls.spherical.radius = dir.length();
    ctx.controls.spherical.theta = Math.atan2(dir.z, dir.x);
    ctx.controls.spherical.phi = Math.acos(dir.y / dir.length());
    ctx.controls.target.copy(tv);
  }

  ctx.renderer.render(ctx.scene, ctx.camera);
}

export function loadData(config: ConfigData): void {
  if (!ctx) return;
  ctx.continents.forEach((m) => {
    ctx!.scene.remove(m);
    m.geometry.dispose();
    if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
    else m.material.dispose();
  });
  ctx.continents.clear();
  ctx.boundaries.forEach((l) => {
    ctx!.scene.remove(l);
    l.geometry.dispose();
    if (Array.isArray(l.material)) l.material.forEach((x) => x.dispose());
    else l.material.dispose();
  });
  ctx.boundaries.clear();
  ctx.boundaryData.clear();
  ctx.continentData.clear();

  const t = ctx.currentTime;
  for (const cd of config.continents) {
    ctx.continentData.set(cd.id, cd);
    const mesh = createContinentMesh(cd, t);
    ctx.scene.add(mesh);
    ctx.continents.set(cd.id, mesh);
  }
  for (const bd of config.plateBoundaries) {
    ctx.boundaryData.set(bd.id, bd);
    const line = createBoundaryMesh(bd, t);
    ctx.scene.add(line);
    ctx.boundaries.set(bd.id, line);
  }
}

export function updateContinents(time: number): void {
  if (!ctx) return;
  ctx.currentTime = time;
  ctx.continents.forEach((mesh, id) => {
    const data = ctx!.continentData.get(id);
    if (!data) return;
    const positions = interpolateContinent(data, time);
    const count = positions.length / 3;
    const cx = 0, cy = 0, cz = 0;
    let cxa = 0, cya = 0, cza = 0;
    for (let i = 0; i < count; i++) {
      cxa += positions[i * 3];
      cya += positions[i * 3 + 1];
      cza += positions[i * 3 + 2];
    }
    cxa /= count; cya /= count; cza /= count;
    const clen = Math.sqrt(cxa ** 2 + cya ** 2 + cza ** 2);
    const cix = (cxa / clen) * 2.01;
    const ciy = (cya / clen) * 2.01;
    const ciz = (cza / clen) * 2.01;
    const centerIdx = count;
    const full = new Float32Array((count + 1) * 3);
    for (let i = 0; i < count; i++) {
      full[i * 3] = positions[i * 3];
      full[i * 3 + 1] = positions[i * 3 + 1];
      full[i * 3 + 2] = positions[i * 3 + 2];
    }
    full[centerIdx * 3] = cix;
    full[centerIdx * 3 + 1] = ciy;
    full[centerIdx * 3 + 2] = ciz;
    mesh.geometry.setAttribute("position", new THREE.BufferAttribute(full, 3));
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  });

  ctx.boundaries.forEach((line, id) => {
    const data = ctx!.boundaryData.get(id);
    if (!data) return;
    const positions = interpolateBoundary(data, time);
    line.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    line.geometry.attributes.position.needsUpdate = true;
  });

  if (currentViewMode === "paleo") {
    updatePaleoView();
  }
}

export function flyToPlate(continentId: string): void {
  if (!ctx) return;
  const data = ctx.continentData.get(continentId);
  if (!data) return;
  const [cx, cy, cz] = continentCentroid(data, ctx.currentTime);
  const center = new THREE.Vector3(cx, cy, cz);
  const len = center.length();
  const dir = center.clone().normalize();
  const dist = 5.5;
  const endPos = dir.clone().multiplyScalar(dist);
  const endTarget = new THREE.Vector3(0, 0, 0);

  ctx.flying = true;
  ctx.flyTarget = {
    startPos: ctx.camera.position.clone(),
    startTarget: ctx.controls.target.clone(),
    endPos,
    endTarget,
    startTime: performance.now(),
    duration: 1500,
  };
}

export function setViewMode(mode: ViewMode): void {
  if (!ctx) return;
  currentViewMode = mode;
  if (mode === "paleo") {
    updatePaleoView();
  }
}

function updatePaleoView(): void {
  if (!ctx) return;
  let totalX = 0, totalY = 0, totalZ = 0, count = 0;
  ctx.continents.forEach((mesh, id) => {
    const data = ctx!.continentData.get(id);
    if (!data || data.id === "antarctica") return;
    const [x, y, z] = continentCentroid(data, ctx!.currentTime);
    totalX += x;
    totalY += y;
    totalZ += z;
    count++;
  });
  if (count === 0) return;
  const cx = totalX / count;
  const cy = totalY / count;
  const cz = totalZ / count;
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
  if (len === 0) return;
  const dir = new THREE.Vector3(cx / len, cy / len, cz / len);
  const dist = 8;
  const endPos = dir.clone().multiplyScalar(dist);
  const endTarget = new THREE.Vector3(0, 0, 0);

  ctx.flying = true;
  ctx.flyTarget = {
    startPos: ctx.camera.position.clone(),
    startTarget: ctx.controls.target.clone(),
    endPos,
    endTarget,
    startTime: performance.now(),
    duration: 1200,
  };
}

export function dispose(): void {
  if (!ctx) return;
  cancelAnimationFrame(ctx.animationId);
  window.removeEventListener("resize", onResize);
  ctx.renderer.dispose();
  if (ctx.renderer.domElement.parentElement === ctx.container) {
    ctx.container.removeChild(ctx.renderer.domElement);
  }
  ctx.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
  ctx = null;
}
