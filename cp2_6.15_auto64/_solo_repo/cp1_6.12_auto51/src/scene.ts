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
const TERRAIN_SEGMENTS = 120;
const NOISE_SCALE = 0.035;
const HEIGHT_MIN = -1.0;
const HEIGHT_MAX = 4.0;

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
      const n2 = noise2D(x * NOISE_SCALE * 2.5, z * NOISE_SCALE * 2.5) * 0.35;
      const n3 = noise2D(x * NOISE_SCALE * 5.5, z * NOISE_SCALE * 5.5) * 0.12;
      const h = (n1 + n2 + n3) * 0.5 + 0.5;
      const height = HEIGHT_MIN + h * (HEIGHT_MAX - HEIGHT_MIN);
      heightMap[i][j] = height;
      positions.setY(idx, height);

      const t = (height - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN);
      const deepBlue = { r: 0.05, g: 0.15, b: 0.35 };
      const darkGreen = { r: 0.08, g: 0.35, b: 0.25 };
      colors[idx * 3] = deepBlue.r + (darkGreen.r - deepBlue.r) * t;
      colors[idx * 3 + 1] = deepBlue.g + (darkGreen.g - deepBlue.g) * t;
      colors[idx * 3 + 2] = deepBlue.b + (darkGreen.b - deepBlue.b) * t;
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 8,
    flatShading: false,
    side: THREE.DoubleSide,
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

function createTrench(terrainMesh: THREE.Mesh): void {
  const geometry = terrainMesh.geometry;
  const positions = geometry.attributes.position;
  const colors = geometry.attributes.color;
  const halfSize = TERRAIN_SIZE / 2;

  const trenchAngle = randRange(-0.4, 0.4);
  const cosA = Math.cos(trenchAngle);
  const sinA = Math.sin(trenchAngle);
  const trenchCenterZ = randRange(-15, 15);
  const trenchWidth = randRange(3.5, 5.5);
  const trenchDepth = randRange(2.5, 4.0);

  for (let idx = 0; idx < positions.count; idx++) {
    const x = positions.getX(idx);
    const z = positions.getZ(idx);
    const rz = z * cosA - x * sinA;
    const dist = Math.abs(rz - trenchCenterZ);

    if (dist < trenchWidth) {
      const factor = 1.0 - dist / trenchWidth;
      const depth = trenchDepth * factor * factor;
      const currentY = positions.getY(idx);
      const newY = currentY - depth;
      positions.setY(idx, newY);

      const darken = Math.min(1, factor * 0.8);
      const r = colors.getX(idx) * (1 - darken * 0.5);
      const g = colors.getY(idx) * (1 - darken * 0.3);
      const b = colors.getZ(idx) * (1 - darken * 0.1);
      colors.setXYZ(idx, r, g, b);
    }
  }

  positions.needsUpdate = true;
  colors.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createShipwreck(scene: THREE.Scene, position: THREE.Vector3, terrainData: TerrainData): ShipwreckInfo {
  const group = new THREE.Group();

  const hullWidth = 4.5;
  const hullHeight = 1.0;
  const hullDepth = 1.8;

  const hullGeo = new THREE.BoxGeometry(hullWidth, hullHeight, hullDepth);
  const hullMat = new THREE.MeshPhongMaterial({
    color: 0x6b4423,
    shininess: 3,
    flatShading: false,
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = hullHeight / 2;
  group.add(hull);

  const keelShape = new THREE.Shape();
  keelShape.moveTo(-hullWidth / 2, 0);
  keelShape.lineTo(hullWidth / 2, 0);
  keelShape.lineTo(0, -hullHeight * 1.2);
  keelShape.lineTo(-hullWidth / 2, 0);

  const keelGeo = new THREE.ExtrudeGeometry(keelShape, {
    depth: hullDepth * 0.6,
    bevelEnabled: false,
  });
  const keelMat = new THREE.MeshPhongMaterial({
    color: 0x4a2f15,
    shininess: 2,
  });
  const keel = new THREE.Mesh(keelGeo, keelMat);
  keel.position.set(0, 0, -hullDepth * 0.3);
  group.add(keel);

  const deckGeo = new THREE.BoxGeometry(hullWidth * 0.6, 0.3, hullDepth * 0.7);
  const deckMat = new THREE.MeshPhongMaterial({ color: 0x7a5433, shininess: 4 });
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.y = hullHeight + 0.15;
  deck.position.x = -hullWidth * 0.1;
  group.add(deck);

  const cabinGeo = new THREE.BoxGeometry(hullWidth * 0.3, 0.6, hullDepth * 0.5);
  const cabinMat = new THREE.MeshPhongMaterial({ color: 0x8b6239, shininess: 5 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.set(-hullWidth * 0.2, hullHeight + 0.3 + 0.3, 0);
  group.add(cabin);

  const mastGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.5, 6);
  const mastMat = new THREE.MeshPhongMaterial({ color: 0x5a3a1a });
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.set(hullWidth * 0.15, hullHeight + 0.3 + 1.75, 0);
  group.add(mast);

  const crowGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const crowMat = new THREE.MeshPhongMaterial({ color: 0x6b4423 });
  const crow = new THREE.Mesh(crowGeo, crowMat);
  crow.position.set(hullWidth * 0.15, hullHeight + 0.3 + 3.2, 0);
  group.add(crow);

  const debrisCount = Math.floor(randRange(2, 4));
  for (let i = 0; i < debrisCount; i++) {
    const dSize = randRange(0.2, 0.5);
    const dGeo = new THREE.BoxGeometry(dSize, dSize * 0.3, dSize * 0.8);
    const dMat = new THREE.MeshPhongMaterial({ color: 0x5a3a1a });
    const debris = new THREE.Mesh(dGeo, dMat);
    debris.position.set(
      randRange(-hullWidth * 0.6, hullWidth * 0.6),
      -0.1,
      randRange(-hullDepth * 0.8, hullDepth * 0.8)
    );
    debris.rotation.set(
      randRange(0, Math.PI),
      randRange(0, Math.PI),
      randRange(0, Math.PI / 4)
    );
    group.add(debris);
  }

  const highlightGeo = new THREE.SphereGeometry(3.5, 20, 16);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
  highlightMesh.position.y = 1.5;
  group.add(highlightMesh);

  const terrainH = terrainData.getHeight(position.x, position.z);
  group.position.set(position.x, terrainH - 0.2, position.z);
  group.rotation.y = randRange(0, Math.PI * 2);
  group.rotation.z = randRange(-0.15, 0.15);
  scene.add(group);

  return {
    mesh: group,
    position: new THREE.Vector3(position.x, terrainH, position.z),
    discovered: false,
    id: 0,
    highlightMesh,
  };
}

function createReef(scene: THREE.Scene, position: THREE.Vector3, terrainData: TerrainData): ReefInfo {
  const group = new THREE.Group();
  const count = Math.floor(randRange(3, 7));

  const colors = [0x3a5a3a, 0x4a6a4a, 0x2a4a3a, 0x5a7a5a, 0x3a6a4a];

  for (let i = 0; i < count; i++) {
    const r = randRange(0.6, 1.8);
    const geo = new THREE.SphereGeometry(r, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const colorIdx = Math.floor(Math.random() * colors.length);
    const mat = new THREE.MeshPhongMaterial({
      color: colors[colorIdx],
      shininess: 12,
      flatShading: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(randRange(-2, 2), 0, randRange(-2, 2));
    m.scale.y = randRange(0.4, 1.0);
    m.scale.x = randRange(0.8, 1.2);
    m.scale.z = randRange(0.8, 1.2);
    group.add(m);
  }

  const terrainH = terrainData.getHeight(position.x, position.z);
  group.position.set(position.x, terrainH, position.z);
  scene.add(group);

  return {
    mesh: group,
    position: new THREE.Vector3(position.x, terrainH, position.z),
  };
}

function createUnderwaterParticles(scene: THREE.Scene): THREE.Points {
  const count = 1200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = randRange(-TERRAIN_SIZE / 2, TERRAIN_SIZE / 2);
    positions[i * 3 + 1] = randRange(0.5, 20);
    positions[i * 3 + 2] = randRange(-TERRAIN_SIZE / 2, TERRAIN_SIZE / 2);

    const c = randRange(0.3, 0.8);
    colors[i * 3] = 0.3 + c * 0.3;
    colors[i * 3 + 1] = 0.6 + c * 0.2;
    colors[i * 3 + 2] = 0.9 + c * 0.1;

    sizes[i] = randRange(0.05, 0.25);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.18,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);
  return points;
}

function generateRandomPositions(
  count: number,
  minDist: number,
  existingPositions: THREE.Vector3[]
): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  const halfSize = TERRAIN_SIZE / 2 - 10;
  let attempts = 0;

  while (result.length < count && attempts < 2000) {
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
  scene.background = new THREE.Color(0x082038);
  scene.fog = new THREE.FogExp2(0x082038, 0.015);

  const ambientLight = new THREE.AmbientLight(0x3366aa, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x6699cc, 0.9);
  dirLight.position.set(15, 35, 20);
  scene.add(dirLight);

  const blueLight = new THREE.PointLight(0x4488cc, 1.5, 100);
  blueLight.position.set(0, 25, 0);
  scene.add(blueLight);

  const hemiLight = new THREE.HemisphereLight(0x5599dd, 0x2a6a5a, 0.5);
  scene.add(hemiLight);

  const { mesh: terrain, terrainData } = createTerrain(scene);
  createTrench(terrain);

  const shipwreckCount = Math.floor(randRange(3, 6));
  const reefCount = Math.floor(randRange(6, 11));

  const existingPositions: THREE.Vector3[] = [];
  const shipwreckPositions = generateRandomPositions(shipwreckCount, 12, existingPositions);
  existingPositions.push(...shipwreckPositions);

  const reefPositions = generateRandomPositions(reefCount, 7, existingPositions);
  existingPositions.push(...reefPositions);

  const shipwrecks: ShipwreckInfo[] = shipwreckPositions.map((pos, idx) => {
    const info = createShipwreck(scene, pos, terrainData);
    info.id = idx;
    return info;
  });

  const reefs: ReefInfo[] = reefPositions.map((pos) => createReef(scene, pos, terrainData));

  const particles = createUnderwaterParticles(scene);

  const detectableObjects: THREE.Object3D[] = [terrain];
  shipwrecks.forEach((sw) => detectableObjects.push(sw.mesh));
  reefs.forEach((r) => detectableObjects.push(r.mesh));

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
      const time = performance.now() * 0.001;

      for (let i = 0; i < posAttr.count; i++) {
        const i3 = i * 3;
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);

        y += Math.sin(time * 0.8 + i * 0.1) * 0.005;
        x += Math.sin(time * 0.5 + i * 0.13) * 0.004;
        z += Math.cos(time * 0.6 + i * 0.11) * 0.004;

        if (y > 15) y = 0.5;
        if (y < 0.5) y = 15;

        const halfSize = TERRAIN_SIZE / 2;
        if (x > halfSize) x = -halfSize;
        if (x < -halfSize) x = halfSize;
        if (z > halfSize) z = -halfSize;
        if (z < -halfSize) z = halfSize;

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    },
  };
}
