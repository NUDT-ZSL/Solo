import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export interface TerrainData {
  getHeight(x: number, z: number): number;
  width: number;
  depth: number;
  offsetX: number;
  offsetZ: number;
}

export interface ShipwreckInfo {
  mesh: THREE.Group;
  position: THREE.Vector3;
  discovered: boolean;
  id: number;
  highlightMesh: THREE.Mesh | null;
}

export interface ReefInfo {
  mesh: THREE.Group;
  position: THREE.Vector3;
}

export interface SceneResult {
  scene: THREE.Scene;
  terrain: THREE.Mesh;
  terrainData: TerrainData;
  shipwrecks: ShipwreckInfo[];
  reefs: ReefInfo[];
  particles: THREE.Points;
  updateParticles: (delta: number) => void;
  detectableObjects: THREE.Object3D[];
}

const TERRAIN_SIZE = 100;
const TERRAIN_SEGMENTS = 100;
const NOISE_SCALE = 0.04;
const HEIGHT_MIN = 0.5;
const HEIGHT_MAX = 2.0;

function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createTerrain(scene: THREE.Scene): { mesh: THREE.Mesh; terrainData: TerrainData } {
  const noise2D = createNoise2D();
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  const halfSize = TERRAIN_SIZE / 2;
  const heightMap: number[][] = [];

  for (let i = 0; i <= TERRAIN_SEGMENTS; i++) {
    heightMap[i] = [];
    for (let j = 0; j <= TERRAIN_SEGMENTS; j++) {
      const idx = i * (TERRAIN_SEGMENTS + 1) + j;
      const x = positions.getX(idx);
      const z = positions.getZ(idx);
      const n1 = noise2D(x * NOISE_SCALE, z * NOISE_SCALE);
      const n2 = noise2D(x * NOISE_SCALE * 2.3, z * NOISE_SCALE * 2.3) * 0.4;
      const n3 = noise2D(x * NOISE_SCALE * 5.0, z * NOISE_SCALE * 5.0) * 0.15;
      const h = (n1 + n2 + n3) * 0.5 + 0.5;
      const height = HEIGHT_MIN + h * (HEIGHT_MAX - HEIGHT_MIN);
      heightMap[i][j] = height;
      positions.setY(idx, height);

      const t = (height - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN);
      colors[idx * 3] = 0.0 + t * 0.02;
      colors[idx * 3 + 1] = 0.1 + t * 0.2;
      colors[idx * 3 + 2] = 0.3 + t * 0.1;
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 10,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const terrainData: TerrainData = {
    getHeight(x: number, z: number): number {
      const gi = ((x + halfSize) / TERRAIN_SIZE) * TERRAIN_SEGMENTS;
      const gj = ((z + halfSize) / TERRAIN_SIZE) * TERRAIN_SEGMENTS;
      const i = Math.max(0, Math.min(TERRAIN_SEGMENTS - 1, Math.floor(gi)));
      const j = Math.max(0, Math.min(TERRAIN_SEGMENTS - 1, Math.floor(gj)));
      const fi = gi - i;
      const fj = gj - j;
      const i1 = Math.min(i + 1, TERRAIN_SEGMENTS);
      const j1 = Math.min(j + 1, TERRAIN_SEGMENTS);
      const h00 = heightMap[i][j];
      const h10 = heightMap[i1][j];
      const h01 = heightMap[i][j1];
      const h11 = heightMap[i1][j1];
      const h0 = h00 * (1 - fi) + h10 * fi;
      const h1 = h01 * (1 - fi) + h11 * fi;
      return h0 * (1 - fj) + h1 * fj;
    },
    width: TERRAIN_SIZE,
    depth: TERRAIN_SIZE,
    offsetX: -halfSize,
    offsetZ: -halfSize,
  };

  return { mesh, terrainData };
}

function createTrench(terrainData: TerrainData, terrainMesh: THREE.Mesh): void {
  const geometry = terrainMesh.geometry;
  const positions = geometry.attributes.position;
  const halfSize = TERRAIN_SIZE / 2;

  const trenchAngle = randRange(-0.3, 0.3);
  const cosA = Math.cos(trenchAngle);
  const sinA = Math.sin(trenchAngle);
  const trenchCenterZ = randRange(-10, 10);
  const trenchWidth = 3.0;
  const trenchDepth = 2.0;

  for (let idx = 0; idx < positions.count; idx++) {
    const x = positions.getX(idx);
    const z = positions.getZ(idx);
    const rz = z * cosA - x * sinA;
    const dist = Math.abs(rz - trenchCenterZ);
    if (dist < trenchWidth) {
      const factor = 1.0 - dist / trenchWidth;
      const depth = trenchDepth * factor * factor;
      const currentY = positions.getY(idx);
      positions.setY(idx, currentY - depth);
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createShipwreck(scene: THREE.Scene, position: THREE.Vector3, terrainData: TerrainData): ShipwreckInfo {
  const group = new THREE.Group();
  const hullGeo = new THREE.BoxGeometry(4, 1.2, 1.5);
  const hullMat = new THREE.MeshPhongMaterial({ color: 0x5a3a1a, shininess: 5 });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.6;
  group.add(hull);

  const keelShape = new THREE.Shape();
  keelShape.moveTo(-2, 0);
  keelShape.lineTo(2, 0);
  keelShape.lineTo(0, -1.2);
  keelShape.lineTo(-2, 0);
  const keelGeo = new THREE.ExtrudeGeometry(keelShape, { depth: 1.5, bevelEnabled: false });
  const keelMat = new THREE.MeshPhongMaterial({ color: 0x4a2a0a });
  const keel = new THREE.Mesh(keelGeo, keelMat);
  keel.position.set(0, 0, -0.75);
  group.add(keel);

  const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6);
  const mastMat = new THREE.MeshPhongMaterial({ color: 0x6a4a2a });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(0.5, 1.85, 0);
  group.add(mast);

  const highlightGeo = new THREE.SphereGeometry(3, 16, 16);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
  highlightMesh.position.y = 1;
  group.add(highlightMesh);

  const terrainH = terrainData.getHeight(position.x, position.z);
  group.position.set(position.x, terrainH + 0.1, position.z);
  group.rotation.y = randRange(0, Math.PI * 2);
  scene.add(group);

  return { mesh: group, position: new THREE.Vector3(position.x, terrainH, position.z), discovered: false, id: 0, highlightMesh };
}

function createReef(scene: THREE.Scene, position: THREE.Vector3, terrainData: TerrainData): ReefInfo {
  const group = new THREE.Group();
  const count = Math.floor(randRange(2, 5));
  for (let i = 0; i < count; i++) {
    const r = randRange(0.5, 1.5);
    const geo = new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({ color: 0x3a5a3a + Math.floor(randRange(0, 0x101010)), shininess: 15 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(randRange(-1.5, 1.5), 0, randRange(-1.5, 1.5));
    m.scale.y = randRange(0.5, 1.2);
    group.add(m);
  }

  const terrainH = terrainData.getHeight(position.x, position.z);
  group.position.set(position.x, terrainH, position.z);
  scene.add(group);

  return { mesh: group, position: new THREE.Vector3(position.x, terrainH, position.z) };
}

function createUnderwaterParticles(scene: THREE.Scene): THREE.Points {
  const count = 500;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = randRange(-TERRAIN_SIZE / 2, TERRAIN_SIZE / 2);
    positions[i * 3 + 1] = randRange(1, 12);
    positions[i * 3 + 2] = randRange(-TERRAIN_SIZE / 2, TERRAIN_SIZE / 2);
    sizes[i] = randRange(0.05, 0.2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color: 0x4488cc,
    size: 0.15,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return points;
}

function generateRandomPositions(count: number, minDist: number, existingPositions: THREE.Vector3[]): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  const halfSize = TERRAIN_SIZE / 2 - 8;
  let attempts = 0;
  while (result.length < count && attempts < 1000) {
    attempts++;
    const pos = new THREE.Vector3(randRange(-halfSize, halfSize), 0, randRange(-halfSize, halfSize));
    let tooClose = false;
    for (const existing of [...existingPositions, ...result]) {
      if (pos.distanceTo(existing) < minDist) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      result.push(pos);
    }
  }
  return result;
}

export function createScene(): SceneResult {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x041225);
  scene.fog = new THREE.FogExp2(0x041225, 0.018);

  const ambientLight = new THREE.AmbientLight(0x1a3050, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x3366aa, 0.5);
  dirLight.position.set(20, 30, 10);
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0x2244aa, 0.8, 60);
  pointLight.position.set(0, 15, 0);
  scene.add(pointLight);

  const { mesh: terrain, terrainData } = createTerrain(scene);
  createTrench(terrainData, terrain);

  const shipwreckCount = Math.floor(randRange(3, 6));
  const reefCount = Math.floor(randRange(6, 11));

  const existingPositions: THREE.Vector3[] = [];
  const shipwreckPositions = generateRandomPositions(shipwreckCount, 10, existingPositions);
  existingPositions.push(...shipwreckPositions);

  const reefPositions = generateRandomPositions(reefCount, 6, existingPositions);
  existingPositions.push(...reefPositions);

  const shipwrecks: ShipwreckInfo[] = shipwreckPositions.map((pos, idx) => {
    const info = createShipwreck(scene, pos, terrainData);
    info.id = idx;
    return info;
  });

  const reefs: ReefInfo[] = reefPositions.map(pos => createReef(scene, pos, terrainData));

  const particles = createUnderwaterParticles(scene);

  const detectableObjects: THREE.Object3D[] = [terrain];
  shipwrecks.forEach(sw => detectableObjects.push(sw.mesh));
  reefs.forEach(r => detectableObjects.push(r.mesh));

  return {
    scene,
    terrain,
    terrainData,
    shipwrecks,
    reefs,
    particles,
    detectableObjects,
    updateParticles(delta: number) {
      const posAttr = particles.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i);
        y += Math.sin(Date.now() * 0.0005 + i) * 0.003;
        y = Math.max(0.5, Math.min(12, y));
        posAttr.setY(i, y);

        let x = posAttr.getX(i);
        x += Math.sin(Date.now() * 0.0003 + i * 0.7) * 0.002;
        posAttr.setX(i, x);
      }
      posAttr.needsUpdate = true;
    },
  };
}
