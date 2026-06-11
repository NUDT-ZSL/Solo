import * as THREE from 'three';
import { TERRAIN_SIZE, TERRAIN_RESOLUTION } from './terrain';

export interface TreeTransform {
  matrix: THREE.Matrix4;
  canopyScale: number;
}

export interface VegetationResult {
  transforms: TreeTransform[];
  treeCount: number;
}

export interface VegetationParams {
  heightMap: number[][];
  density: number;
  seed: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getHeightAt(heightMap: number[][], x: number, z: number): number {
  const halfSize = TERRAIN_SIZE / 2;
  const fx = ((x + halfSize) / TERRAIN_SIZE) * (TERRAIN_RESOLUTION - 1);
  const fz = ((z + halfSize) / TERRAIN_SIZE) * (TERRAIN_RESOLUTION - 1);

  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const x1 = Math.min(x0 + 1, TERRAIN_RESOLUTION - 1);
  const z1 = Math.min(z0 + 1, TERRAIN_RESOLUTION - 1);

  const tx = fx - x0;
  const tz = fz - z0;

  const h00 = heightMap[z0][x0];
  const h10 = heightMap[z0][x1];
  const h01 = heightMap[z1][x0];
  const h11 = heightMap[z1][x1];

  const h0 = h00 * (1 - tx) + h10 * tx;
  const h1 = h01 * (1 - tx) + h11 * tx;

  return h0 * (1 - tz) + h1 * tz;
}

function calculateSlope(heightMap: number[][], x: number, z: number): number {
  const halfSize = TERRAIN_SIZE / 2;
  const step = TERRAIN_SIZE / (TERRAIN_RESOLUTION - 1);

  const fx = ((x + halfSize) / TERRAIN_SIZE) * (TERRAIN_RESOLUTION - 1);
  const fz = ((z + halfSize) / TERRAIN_SIZE) * (TERRAIN_RESOLUTION - 1);

  const ix = Math.max(1, Math.min(Math.round(fx), TERRAIN_RESOLUTION - 2));
  const iz = Math.max(1, Math.min(Math.round(fz), TERRAIN_RESOLUTION - 2));

  const hL = heightMap[iz][ix - 1];
  const hR = heightMap[iz][ix + 1];
  const hD = heightMap[iz - 1][ix];
  const hU = heightMap[iz + 1][ix];

  const dx = (hR - hL) / (2 * step);
  const dz = (hU - hD) / (2 * step);

  const slopeRad = Math.atan(Math.sqrt(dx * dx + dz * dz));
  return (slopeRad * 180) / Math.PI;
}

export function generateVegetation(params: VegetationParams): VegetationResult {
  const { heightMap, density, seed } = params;
  const rand = seededRandom(seed * 17 + 7919);

  const transforms: TreeTransform[] = [];
  const maxTrees = 500;
  const targetCount = Math.floor((density / 20) * maxTrees);

  const halfSize = TERRAIN_SIZE / 2;
  const margin = 1;
  const maxAttempts = targetCount * 25;

  let attempts = 0;
  let placed = 0;

  while (placed < targetCount && attempts < maxAttempts) {
    attempts++;

    const x = (rand() - 0.5) * (TERRAIN_SIZE - margin * 2);
    const z = (rand() - 0.5) * (TERRAIN_SIZE - margin * 2);

    const height = getHeightAt(heightMap, x, z);
    const normalizedHeight = height / 4;

    if (normalizedHeight < 0.2 || normalizedHeight > 0.8) {
      continue;
    }

    const slope = calculateSlope(heightMap, x, z);
    if (slope > 30) {
      continue;
    }

    const rotation = rand() * Math.PI * 2;
    const baseScale = 0.8 + rand() * 0.6;
    const canopyScale = 0.1 + rand() * 0.2;

    const matrix = new THREE.Matrix4();

    const translateMatrix = new THREE.Matrix4().makeTranslation(x, height, z);
    const rotateMatrix = new THREE.Matrix4().makeRotationY(rotation);
    const scaleMatrix = new THREE.Matrix4().makeScale(baseScale, baseScale, baseScale);

    matrix.multiplyMatrices(translateMatrix, rotateMatrix);
    matrix.multiplyMatrices(matrix, scaleMatrix);

    transforms.push({ matrix, canopyScale });
    placed++;
  }

  return {
    transforms,
    treeCount: transforms.length
  };
}

export interface TreeGeometries {
  trunkGeometry: THREE.CylinderGeometry;
  canopyGeometry: THREE.IcosahedronGeometry;
}

export interface TreeMaterials {
  trunkMaterial: THREE.MeshStandardMaterial;
  canopyMaterial: THREE.MeshStandardMaterial;
}

export function createTreeAssets(): { geometries: TreeGeometries; materials: TreeMaterials } {
  const trunkGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6, 1);
  trunkGeometry.translate(0, 0.3, 0);

  const canopyGeometry = new THREE.IcosahedronGeometry(1, 1);
  canopyGeometry.translate(0, 1.0, 0);

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true
  });

  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: true
  });

  return {
    geometries: { trunkGeometry, canopyGeometry },
    materials: { trunkMaterial, canopyMaterial }
  };
}

export function buildInstancedTrees(
  transforms: TreeTransform[],
  assets: { geometries: TreeGeometries; materials: TreeMaterials }
): { trunkMesh: THREE.InstancedMesh; canopyMesh: THREE.InstancedMesh } {
  const count = transforms.length;

  const trunkMesh = new THREE.InstancedMesh(
    assets.geometries.trunkGeometry,
    assets.materials.trunkMaterial,
    Math.max(count, 1)
  );

  const canopyMesh = new THREE.InstancedMesh(
    assets.geometries.canopyGeometry,
    assets.materials.canopyMaterial,
    Math.max(count, 1)
  );

  const tmpMatrix = new THREE.Matrix4();
  const canopyScaleMatrix = new THREE.Matrix4();

  for (let i = 0; i < count; i++) {
    const t = transforms[i];
    trunkMesh.setMatrixAt(i, t.matrix);

    canopyScaleMatrix.makeScale(t.canopyScale, t.canopyScale * 1.2, t.canopyScale);
    tmpMatrix.copy(t.matrix).multiply(canopyScaleMatrix);
    canopyMesh.setMatrixAt(i, tmpMatrix);
  }

  if (count === 0) {
    trunkMesh.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));
    canopyMesh.setMatrixAt(0, new THREE.Matrix4().makeScale(0, 0, 0));
  }

  trunkMesh.instanceMatrix.needsUpdate = true;
  canopyMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.count = Math.max(count, 1);
  canopyMesh.count = Math.max(count, 1);

  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  canopyMesh.castShadow = true;
  canopyMesh.receiveShadow = true;

  return { trunkMesh, canopyMesh };
}
