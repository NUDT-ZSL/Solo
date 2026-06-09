import * as THREE from 'three';

export interface TerrainData {
  group: THREE.Group;
  heightMap: Float32Array;
  gridSize: number;
  cellSize: number;
  totalArea: number;
  objects: Array<{
    mesh: THREE.Mesh;
    originalColor: THREE.Color;
    originalOpacity: number;
    baseY: number;
    type: 'building' | 'tree' | 'road' | 'terrain';
  }>;
}

const GRID_SIZE = 200;
const CELL_SIZE = 1;
const TERRAIN_SIZE = GRID_SIZE * CELL_SIZE;

function noise(x: number, z: number, seed: number = 0): number {
  const n = Math.sin(x * 0.05 + seed) * Math.cos(z * 0.05 + seed * 0.7) * 0.5
         + Math.sin(x * 0.1 + 1.3 + seed) * Math.cos(z * 0.08 + 0.9 + seed) * 0.3
         + Math.sin(x * 0.02 + seed * 0.3) * Math.cos(z * 0.02 + seed * 0.5) * 0.2;
  return (n + 1) * 0.5;
}

function getTerrainHeight(x: number, z: number): number {
  let height = 0;

  height += noise(x, z, 1.0) * 8;

  const hillX = 40;
  const hillZ = -30;
  const hillDist = Math.sqrt((x - hillX) ** 2 + (z - hillZ) ** 2);
  if (hillDist < 50) {
    height += Math.cos((hillDist / 50) * Math.PI * 0.5) * 22;
  }

  const centerX = 0;
  const centerZ = 0;
  const distFromCenter = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2);
  height -= distFromCenter * 0.02;

  const seaX = 80;
  const seaZ = 60;
  const seaDist = Math.sqrt((x - seaX) ** 2 + (z - seaZ) ** 2);
  if (seaDist < 80) {
    height -= (1 - seaDist / 80) * 6;
  }

  return Math.max(0, Math.min(30, height));
}

function createGroundMesh(): { mesh: THREE.Mesh; heightMap: Float32Array } {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const heightMap = new Float32Array(GRID_SIZE * GRID_SIZE);
  const colors: number[] = [];

  const grassColor = new THREE.Color(0x7ec850);
  const sandColor = new THREE.Color(0xf5deb3);
  const rockColor = new THREE.Color(0x8b7355);
  const waterColor = new THREE.Color(0x4a90a4);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = getTerrainHeight(x, z);
    positions.setY(i, height);

    const gx = Math.floor((x + TERRAIN_SIZE / 2) / CELL_SIZE);
    const gz = Math.floor((z + TERRAIN_SIZE / 2) / CELL_SIZE);
    if (gx >= 0 && gx < GRID_SIZE && gz >= 0 && gz < GRID_SIZE) {
      heightMap[gz * GRID_SIZE + gx] = height;
    }

    let color = grassColor.clone();
    if (height < 1.5) {
      color = waterColor.clone();
    } else if (height < 3) {
      color = sandColor.clone().lerp(waterColor, (3 - height) / 1.5);
    } else if (height < 5) {
      color = grassColor.clone().lerp(sandColor, (5 - height) / 2);
    } else if (height > 18) {
      color = rockColor.clone().lerp(grassColor, Math.min(1, (30 - height) / 12));
    }

    const variation = (Math.random() - 0.5) * 0.08;
    color.offsetHSL(0, 0, variation);

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'ground';

  return { mesh, heightMap };
}

function createRoad(points: THREE.Vector3[], width: number = 4): THREE.Mesh {
  const shape = new THREE.Shape();
  const halfWidth = width / 2;

  const roadPoints: THREE.Vector2[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    roadPoints.push(new THREE.Vector2(p.x, p.z));
  }

  const leftPoints: THREE.Vector2[] = [];
  const rightPoints: THREE.Vector2[] = [];

  for (let i = 0; i < roadPoints.length; i++) {
    const curr = roadPoints[i];
    const prev = roadPoints[Math.max(0, i - 1)];
    const next = roadPoints[Math.min(roadPoints.length - 1, i + 1)];

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    leftPoints.push(new THREE.Vector2(curr.x + nx * halfWidth, curr.y + ny * halfWidth));
    rightPoints.push(new THREE.Vector2(curr.x - nx * halfWidth, curr.y - ny * halfWidth));
  }

  shape.moveTo(leftPoints[0].x, leftPoints[0].y);
  for (let i = 1; i < leftPoints.length; i++) {
    shape.lineTo(leftPoints[i].x, leftPoints[i].y);
  }
  for (let i = rightPoints.length - 1; i >= 0; i--) {
    shape.lineTo(rightPoints[i].x, rightPoints[i].y);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    positions.setY(i, getTerrainHeight(x, z) + 0.15);
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    color: 0x5a5a5a,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'road';

  return mesh;
}

function createRoadPaths(): THREE.Mesh[] {
  const roads: THREE.Mesh[] = [];

  const road1: THREE.Vector3[] = [];
  for (let t = 0; t <= 1; t += 0.05) {
    const x = -70 + t * 140;
    const z = 30 + Math.sin(t * Math.PI * 1.5) * 20;
    road1.push(new THREE.Vector3(x, 0, z));
  }
  roads.push(createRoad(road1, 5));

  const road2: THREE.Vector3[] = [];
  for (let t = 0; t <= 1; t += 0.05) {
    const x = -40 + Math.sin(t * Math.PI) * 25;
    const z = -60 + t * 120;
    road2.push(new THREE.Vector3(x, 0, z));
  }
  roads.push(createRoad(road2, 4));

  const road3: THREE.Vector3[] = [];
  for (let t = 0; t <= 1; t += 0.05) {
    const x = 40 + t * 30;
    const z = -50 + Math.cos(t * Math.PI * 1.2) * 30;
    road3.push(new THREE.Vector3(x, 0, z));
  }
  roads.push(createRoad(road3, 4));

  return roads;
}

function createBuilding(x: number, z: number, height: number, width: number, depth: number): THREE.Group {
  const group = new THREE.Group();
  const baseY = getTerrainHeight(x, z);

  const bodyGeo = new THREE.BoxGeometry(width, height, depth);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc4 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, baseY + height / 2 + 0.2, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = 'building_body';
  group.add(body);

  const roofHeight = height * 0.25;
  const roofGeo = new THREE.ConeGeometry(width * 0.75, roofHeight, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, baseY + height + roofHeight / 2 + 0.2, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.name = 'building_roof';
  group.add(roof);

  return group;
}

function createBuildings(): THREE.Group[] {
  const buildings: THREE.Group[] = [];

  const configs = [
    { x: -10, z: 10, h: 6, w: 10, d: 8 },
    { x: 15, z: 20, h: 5, w: 8, d: 7 },
    { x: -25, z: -10, h: 7, w: 12, d: 10 },
    { x: 5, z: -30, h: 4, w: 7, d: 6 },
    { x: 30, z: -5, h: 5.5, w: 9, d: 8 },
  ];

  for (const cfg of configs) {
    const b = createBuilding(cfg.x, cfg.z, cfg.h, cfg.w, cfg.d);
    buildings.push(b);
  }

  return buildings;
}

function createTree(x: number, z: number, scale: number = 1): THREE.Group {
  const group = new THREE.Group();
  const baseY = getTerrainHeight(x, z);

  const trunkHeight = 2 * scale;
  const trunkRadius = 0.25 * scale;
  const trunkGeo = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(0, baseY + trunkHeight / 2, 0);
  trunk.castShadow = true;
  trunk.name = 'tree_trunk';
  group.add(trunk);

  const crownRadius = 1.5 * scale;
  const crownHeight = 3 * scale;
  const crownGeo = new THREE.ConeGeometry(crownRadius, crownHeight, 7);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2d6a2d });
  const crown = new THREE.Mesh(crownGeo, crownMat);
  crown.position.set(0, baseY + trunkHeight + crownHeight / 2, 0);
  crown.castShadow = true;
  crown.name = 'tree_crown';
  group.add(crown);

  const crown2Geo = new THREE.ConeGeometry(crownRadius * 0.7, crownHeight * 0.7, 7);
  const crown2 = new THREE.Mesh(crown2Geo, crownMat);
  crown2.position.set(0, baseY + trunkHeight + crownHeight * 0.8, 0);
  crown2.castShadow = true;
  group.add(crown2);

  return group;
}

function createTrees(): THREE.Group[] {
  const trees: THREE.Group[] = [];

  const positions = [
    { x: -50, z: 30, s: 1.0 },
    { x: -45, z: 40, s: 0.8 },
    { x: 50, z: -20, s: 1.1 },
    { x: 55, z: -30, s: 0.9 },
    { x: -20, z: 50, s: 1.0 },
    { x: -30, z: 55, s: 0.7 },
    { x: 25, z: 50, s: 1.2 },
    { x: -60, z: -10, s: 0.9 },
    { x: 60, z: 25, s: 1.0 },
    { x: 0, z: -50, s: 0.85 },
  ];

  for (const p of positions) {
    trees.push(createTree(p.x, p.z, p.s));
  }

  return trees;
}

export function buildTerrain(): TerrainData {
  const group = new THREE.Group();
  group.name = 'terrain';

  const { mesh: groundMesh, heightMap } = createGroundMesh();
  group.add(groundMesh);

  const roads = createRoadPaths();
  for (const road of roads) {
    group.add(road);
  }

  const buildings = createBuildings();
  for (const b of buildings) {
    group.add(b);
  }

  const trees = createTrees();
  for (const t of trees) {
    group.add(t);
  }

  const objects: TerrainData['objects'] = [];

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshLambertMaterial;
      let objType: TerrainData['objects'][0]['type'] = 'terrain';

      if (obj.name.includes('building')) objType = 'building';
      else if (obj.name.includes('tree') || obj.name.includes('trunk') || obj.name.includes('crown')) objType = 'tree';
      else if (obj.name.includes('road')) objType = 'road';

      const box = new THREE.Box3().setFromObject(obj);
      const baseY = box.min.y;

      objects.push({
        mesh: obj,
        originalColor: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
        originalOpacity: mat.opacity ?? 1,
        baseY,
        type: objType,
      });
    }
  });

  let landArea = 0;
  for (let i = 0; i < heightMap.length; i++) {
    if (heightMap[i] > 0) {
      landArea += CELL_SIZE * CELL_SIZE;
    }
  }

  return {
    group,
    heightMap,
    gridSize: GRID_SIZE,
    cellSize: CELL_SIZE,
    totalArea: landArea,
    objects,
  };
}
