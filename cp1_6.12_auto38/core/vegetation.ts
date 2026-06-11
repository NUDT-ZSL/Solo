import * as THREE from 'three';
import { TERRAIN_SIZE, TERRAIN_RESOLUTION, MAX_TOTAL_VERTICES } from './terrain';

export interface TreeTransform {
  position: THREE.Vector3;
  rotationY: number;
  baseScale: number;
  canopyRadius: number;
}

export interface VegetationResult {
  transforms: TreeTransform[];
  treeCount: number;
  perTreeVertices: number;
  totalTreeVertices: number;
}

export interface VegetationParams {
  heightMap: number[][];
  normalizedHeightMap: number[][];
  density: number;
  seed: number;
  vertexBudget?: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function getHeightAt(heightMap: number[][], worldX: number, worldZ: number): number {
  const halfSize = TERRAIN_SIZE / 2;
  const fx = ((worldX + halfSize) / TERRAIN_SIZE) * (TERRAIN_RESOLUTION - 1);
  const fz = ((worldZ + halfSize) / TERRAIN_SIZE) * (TERRAIN_RESOLUTION - 1);

  const fxClamped = clamp(fx, 0, TERRAIN_RESOLUTION - 1);
  const fzClamped = clamp(fz, 0, TERRAIN_RESOLUTION - 1);

  const x0 = Math.floor(fxClamped);
  const z0 = Math.floor(fzClamped);
  const x1 = Math.min(x0 + 1, TERRAIN_RESOLUTION - 1);
  const z1 = Math.min(z0 + 1, TERRAIN_RESOLUTION - 1);

  const tx = fxClamped - x0;
  const tz = fzClamped - z0;

  const h00 = heightMap[z0][x0];
  const h10 = heightMap[z0][x1];
  const h01 = heightMap[z1][x0];
  const h11 = heightMap[z1][x1];

  const h0 = h00 * (1 - tx) + h10 * tx;
  const h1 = h01 * (1 - tx) + h11 * tx;

  return h0 * (1 - tz) + h1 * tz;
}

export function calculateSlope(
  heightMap: number[][],
  worldX: number,
  worldZ: number
): number {
  const halfSize = TERRAIN_SIZE / 2;
  const cellSize = TERRAIN_SIZE / (TERRAIN_RESOLUTION - 1);

  const fx = ((worldX + halfSize) / TERRAIN_SIZE) * (TERRAIN_RESOLUTION - 1);
  const fz = ((worldZ + halfSize) / TERRAIN_SIZE) * (TERRAIN_RESOLUTION - 1);

  const ix = Math.round(clamp(fx, 1, TERRAIN_RESOLUTION - 2));
  const iz = Math.round(clamp(fz, 1, TERRAIN_RESOLUTION - 2));

  const hLeft = heightMap[iz][ix - 1];
  const hRight = heightMap[iz][ix + 1];
  const hDown = heightMap[iz - 1][ix];
  const hUp = heightMap[iz + 1][ix];

  const dhdx = (hRight - hLeft) / (2 * cellSize);
  const dhdz = (hUp - hDown) / (2 * cellSize);

  const gradientMagnitude = Math.sqrt(dhdx * dhdx + dhdz * dhdz);
  const slopeRadians = Math.atan(gradientMagnitude);
  return (slopeRadians * 180) / Math.PI;
}

export function generateVegetation(params: VegetationParams): VegetationResult {
  const { heightMap, normalizedHeightMap, density, seed, vertexBudget } = params;
  const rand = seededRandom(seed * 17 + 7919);

  const transforms: TreeTransform[] = [];
  const maxTreesByDensity = Math.floor((density / 20) * 500);

  const trunkVerts = 14;
  const canopyVerts = 42;
  const perTreeVertices = trunkVerts + canopyVerts;

  const availableBudget = vertexBudget ?? MAX_TOTAL_VERTICES - 16384;
  const maxTreesByBudget = Math.floor(availableBudget / perTreeVertices);
  const targetCount = Math.min(maxTreesByDensity, maxTreesByBudget, 500);

  const halfSize = TERRAIN_SIZE / 2;
  const margin = 0.8;
  const maxAttempts = targetCount * 30;

  let attempts = 0;
  let placed = 0;

  const MIN_HEIGHT = 0.2;
  const MAX_HEIGHT = 0.8;
  const MAX_SLOPE = 30;
  const MIN_CANOPY = 0.1;
  const MAX_CANOPY = 0.3;

  while (placed < targetCount && attempts < maxAttempts) {
    attempts++;

    const worldX = (rand() - 0.5) * (TERRAIN_SIZE - margin * 2);
    const worldZ = (rand() - 0.5) * (TERRAIN_SIZE - margin * 2);

    const normalizedHeight = getHeightAt(normalizedHeightMap, worldX, worldZ);
    if (normalizedHeight < MIN_HEIGHT || normalizedHeight > MAX_HEIGHT) {
      continue;
    }

    const slope = calculateSlope(heightMap, worldX, worldZ);
    if (slope > MAX_SLOPE) {
      continue;
    }

    const actualHeight = getHeightAt(heightMap, worldX, worldZ);
    const rotationY = rand() * Math.PI * 2;
    const baseScale = 0.7 + rand() * 0.5;
    const canopyRadius = MIN_CANOPY + rand() * (MAX_CANOPY - MIN_CANOPY);
    const clampedCanopy = clamp(canopyRadius, MIN_CANOPY, MAX_CANOPY);

    transforms.push({
      position: new THREE.Vector3(worldX, actualHeight, worldZ),
      rotationY,
      baseScale,
      canopyRadius: clampedCanopy
    });
    placed++;
  }

  return {
    transforms,
    treeCount: transforms.length,
    perTreeVertices,
    totalTreeVertices: transforms.length * perTreeVertices
  };
}

export interface TreeAsset {
  geometry: THREE.BufferGeometry;
  materials: THREE.MeshStandardMaterial[];
}

export function createMergedTreeAsset(): TreeAsset {
  const trunkGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 6, 1);
  trunkGeo.translate(0, 0.3, 0);

  const canopyGeo = new THREE.IcosahedronGeometry(1, 0);
  canopyGeo.translate(0, 1.0, 0);

  const merged = mergeGeometriesWithGroups([
    { geometry: trunkGeo, materialIndex: 0 },
    { geometry: canopyGeo, materialIndex: 1 }
  ]);

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true
  });

  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    roughness: 0.88,
    metalness: 0.0,
    flatShading: true
  });

  patchMaterialsForCanopyScale([trunkMaterial, canopyMaterial]);

  return {
    geometry: merged,
    materials: [trunkMaterial, canopyMaterial]
  };
}

function patchMaterialsForCanopyScale(materials: THREE.MeshStandardMaterial[]): void {
  materials.forEach((material) => {
    material.userData.canopyScalePatch = true;
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute float aCanopyMask;
attribute float aCanopyScale;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
if (aCanopyMask > 0.5) {
  vec3 canopyCenter = vec3(0.0, 1.0, 0.0);
  vec3 offset = transformed - canopyCenter;
  transformed = canopyCenter + offset * aCanopyScale;
}`
        );
    };
  });
}

interface GeometryGroup {
  geometry: THREE.BufferGeometry;
  materialIndex: number;
}

function mergeGeometriesWithGroups(groups: GeometryGroup[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allIndices: number[] = [];
  const allCanopyMask: number[] = [];
  const allCanopyScale: number[] = [];

  let indexOffset = 0;
  let vertexOffset = 0;

  for (const g of groups) {
    const geo = g.geometry;
    const isCanopy = g.materialIndex === 1;
    const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
    const posAttr = nonIndexed.getAttribute('position') as THREE.BufferAttribute;
    const normAttr = nonIndexed.getAttribute('normal') as THREE.BufferAttribute;

    for (let i = 0; i < posAttr.count; i++) {
      allPositions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      allNormals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
      allIndices.push(vertexOffset + i);
      allCanopyMask.push(isCanopy ? 1.0 : 0.0);
      allCanopyScale.push(1.0);
    }

    merged.addGroup(indexOffset, posAttr.count, g.materialIndex);
    indexOffset += posAttr.count;
    vertexOffset += posAttr.count;
  }

  merged.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
  merged.setAttribute('aCanopyMask', new THREE.Float32BufferAttribute(allCanopyMask, 1));
  merged.setAttribute('aCanopyScale', new THREE.Float32BufferAttribute(allCanopyScale, 1));
  merged.setIndex(allIndices);

  return merged;
}

export function buildMergedInstancedTrees(
  transforms: TreeTransform[],
  asset: TreeAsset
): THREE.InstancedMesh {
  const count = Math.max(transforms.length, 1);

  const instancedMesh = new THREE.InstancedMesh(
    asset.geometry,
    asset.materials,
    count
  );

  const tmpMatrix = new THREE.Matrix4();
  const tmpPos = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3();
  const tmpEuler = new THREE.Euler();

  const perInstanceCanopyScale = new Float32Array(count);

  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];

    tmpPos.copy(t.position);
    tmpEuler.set(0, t.rotationY, 0);
    tmpQuat.setFromEuler(tmpEuler);
    tmpScale.setScalar(t.baseScale);

    tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);

    instancedMesh.setMatrixAt(i, tmpMatrix);
    perInstanceCanopyScale[i] = t.canopyRadius;
  }

  if (transforms.length === 0) {
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    instancedMesh.setMatrixAt(0, zero);
    perInstanceCanopyScale[0] = 0;
  }

  instancedMesh.instanceMatrix.needsUpdate = true;

  const geometry = instancedMesh.geometry as THREE.BufferGeometry;
  const baseCanopyScale = geometry.getAttribute('aCanopyScale') as THREE.BufferAttribute;
  const instanceCanopyScaleAttr = new THREE.InstancedBufferAttribute(perInstanceCanopyScale, 1);
  geometry.setAttribute('aCanopyScale', instanceCanopyScaleAttr);
  geometry.getAttribute('aCanopyScale').needsUpdate = true;

  instancedMesh.count = count;
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;
  instancedMesh.frustumCulled = true;

  return instancedMesh;
}
