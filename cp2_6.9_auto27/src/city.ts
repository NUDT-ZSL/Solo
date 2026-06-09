import * as THREE from 'three';

export interface BuildingData {
  name: string;
  height: number;
  baseColor: THREE.Color;
  windows: THREE.Mesh[];
  roofLights: THREE.Mesh[];
  edges: THREE.LineSegments;
}

export interface CityResult {
  group: THREE.Group;
  buildings: Map<THREE.Mesh, BuildingData>;
  particles: THREE.Points;
  particleCount: number;
}

const BUILDING_COLORS = [
  0x1a1a2e,
  0x16213e,
  0x1f2847,
  0x2d1b4e,
  0x1b2a3f,
  0x242042,
];

const WINDOW_COLOR_DIM = 0x1a2a4a;
const GRID_SIZE = 15;
const CELL_SIZE = 2.2;
const BUILDING_MIN_H = 2;
const BUILDING_MAX_H = 10;
const WINDOW_SIZE = 0.18;
const WINDOW_GAP = 0.32;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function createBuilding(
  gridX: number,
  gridZ: number,
  letter: string,
  num: number
): { mesh: THREE.Mesh; data: BuildingData } {
  const height = rand(BUILDING_MIN_H, BUILDING_MAX_H);
  const width = rand(1.2, 1.8);
  const depth = rand(1.2, 1.8);

  const baseColorHex = BUILDING_COLORS[randInt(0, BUILDING_COLORS.length - 1)];
  const baseColor = new THREE.Color(baseColorHex);

  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.85,
    metalness: 0.15,
  });
  const building = new THREE.Mesh(geometry, material);
  building.castShadow = true;
  building.receiveShadow = true;

  const x = (gridX - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
  const z = (gridZ - GRID_SIZE / 2 + 0.5) * CELL_SIZE;
  building.position.set(x, height / 2, z);

  const edgeGeom = new THREE.EdgesGeometry(geometry);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0,
  });
  const edges = new THREE.LineSegments(edgeGeom, edgeMat);
  edges.position.copy(building.position);

  const windows: THREE.Mesh[] = [];
  const windowMatDim = new THREE.MeshBasicMaterial({
    color: WINDOW_COLOR_DIM,
  });

  const rows = Math.max(2, Math.floor(height / WINDOW_GAP) - 1);
  const colsW = Math.max(2, Math.floor(width / WINDOW_GAP) - 1);
  const colsD = Math.max(2, Math.floor(depth / WINDOW_GAP) - 1);

  const addWindow = (px: number, py: number, pz: number, ry: number) => {
    const winGeo = new THREE.PlaneGeometry(WINDOW_SIZE, WINDOW_SIZE);
    const winMat = windowMatDim.clone();
    const win = new THREE.Mesh(winGeo, winMat);
    win.position.set(px, py, pz);
    win.rotation.y = ry;
    building.add(win);
    windows.push(win);
  };

  for (let r = 0; r < rows; r++) {
    const wy = -height / 2 + WINDOW_GAP + r * WINDOW_GAP;
    for (let c = 0; c < colsW; c++) {
      const wx = -width / 2 + WINDOW_GAP + c * WINDOW_GAP;
      if (Math.random() > 0.35) addWindow(wx, wy, depth / 2 + 0.005, 0);
      if (Math.random() > 0.35) addWindow(wx, wy, -depth / 2 - 0.005, Math.PI);
    }
    for (let c = 0; c < colsD; c++) {
      const wz = -depth / 2 + WINDOW_GAP + c * WINDOW_GAP;
      if (Math.random() > 0.35) addWindow(-width / 2 - 0.005, wy, wz, Math.PI / 2);
      if (Math.random() > 0.35) addWindow(width / 2 + 0.005, wy, wz, -Math.PI / 2);
    }
  }

  const roofLights: THREE.Mesh[] = [];
  const roofLightCount = randInt(1, 4);
  for (let i = 0; i < roofLightCount; i++) {
    const lightGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 1,
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(
      rand(-width / 2 + 0.2, width / 2 - 0.2),
      height / 2 + 0.05,
      rand(-depth / 2 + 0.2, depth / 2 - 0.2)
    );
    (lightMat as any).blinkSpeed = rand(0.5, 2);
    (lightMat as any).blinkOffset = Math.random() * Math.PI * 2;
    building.add(light);
    roofLights.push(light);
  }

  const data: BuildingData = {
    name: `Building ${letter}-${num}`,
    height: parseFloat(height.toFixed(2)),
    baseColor: baseColor.clone(),
    windows,
    roofLights,
    edges,
  };

  return { mesh: building, data };
}

function createParticleSystem(isMobile: boolean): THREE.Points {
  const count = isMobile ? 150 : 320;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const radius = GRID_SIZE * CELL_SIZE * 0.9;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * (0.4 + Math.random() * 0.6);
    const y = rand(1, 14);
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * r;

    const isBlue = Math.random() > 0.5;
    if (isBlue) {
      colors[i * 3] = 0.2 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.4;
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    } else {
      colors[i * 3] = 0.5 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.2 + Math.random() * 0.3;
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    }
    sizes[i] = 0.08 + Math.random() * 0.12;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  return new THREE.Points(geom, mat);
}

function createGround(): THREE.Mesh {
  const size = GRID_SIZE * CELL_SIZE + 6;
  const geom = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a0d1a,
    roughness: 0.95,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(geom, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  return ground;
}

export function createCity(isMobile: boolean): CityResult {
  const group = new THREE.Group();
  const buildings = new Map<THREE.Mesh, BuildingData>();

  const ground = createGround();
  group.add(ground);

  const letters = 'ABCDEFGHIJKLMNO';
  for (let gx = 0; gx < GRID_SIZE; gx++) {
    for (let gz = 0; gz < GRID_SIZE; gz++) {
      if (Math.random() < 0.08) continue;
      const { mesh, data } = createBuilding(gx, gz, letters[gx], gz + 1);
      group.add(mesh);
      group.add(data.edges);
      buildings.set(mesh, data);
    }
  }

  const particles = createParticleSystem(isMobile);
  group.add(particles);

  return {
    group,
    buildings,
    particles,
    particleCount: (particles.geometry.attributes.position as THREE.BufferAttribute).count,
  };
}

export function updateRoofLights(
  buildings: Map<THREE.Mesh, BuildingData>,
  time: number
): void {
  buildings.forEach((data) => {
    data.roofLights.forEach((light) => {
      const mat = light.material as THREE.MeshBasicMaterial;
      const speed = (mat as any).blinkSpeed || 1;
      const offset = (mat as any).blinkOffset || 0;
      const val = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * speed + offset));
      mat.opacity = val;
    });
  });
}

export function updateParticles(particles: THREE.Points): void {
  particles.rotation.y += 0.002;
}
