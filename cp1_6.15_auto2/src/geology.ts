export interface Stratum {
  id: number;
  name: string;
  color: string;
  thickness: number;
  depthTop: number;
  depthBottom: number;
  lithology: string;
  age: string;
  roughness: number;
  seed: number;
}

export interface StratumStats {
  avgThickness: number;
  minDepth: number;
  maxDepth: number;
  estimatedArea: number;
}

export interface CutPlaneParams {
  position: number;
  isActive: boolean;
  opacity: number;
}

const STRATUM_COLORS = ['#D2B48C', '#8B7355', '#696969', '#4F4F4F', '#2F4F4F'];
const STRATUM_NAMES = ['第四系表层', '新近系沉积层', '白垩系岩层', '侏罗系基岩', '古生界深部'];
const LITHOLOGIES = [
  '砂质黏土、砾石层，孔隙度高，含水丰富',
  '泥岩、粉砂岩互层，可见水平层理构造',
  '厚层石灰岩、白云岩，局部含燧石结核',
  '火山碎屑岩、花岗岩侵入体，节理发育',
  '片麻岩、混合岩，高级区域变质作用'
];
const AGES = ['全新世 Qh', '新近纪 N', '白垩纪 K', '侏罗纪 J', '古生代 Pz'];

const SCENE_SIZE = 12;
const MAX_ROUGHNESS = 0.5;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function noise2D(x: number, z: number, seed: number): number {
  const s1 = seed;
  const s2 = seed * 2.3;
  const s3 = seed * 5.7;
  const s4 = seed * 11.3;
  const s5 = seed * 17.9;

  const n1 = Math.sin(x * 0.6 + s1) * Math.cos(z * 0.55 + s2);
  const n2 = Math.sin(x * 1.3 + s3) * Math.cos(z * 1.1 + s1) * 0.5;
  const n3 = Math.sin(x * 2.7 + s2) * Math.cos(z * 2.4 + s4) * 0.25;
  const n4 = Math.sin(x * 0.9 + s5) * Math.cos(z * 0.7 + s3) * 0.35;
  const n5 = Math.sin(x * 3.1 + s4) * Math.cos(z * 2.9 + s5) * 0.12;

  return (n1 + n2 + n3 + n4 + n5) / 2.22;
}

export function getTerrainHeight(x: number, z: number, seed: number, roughness: number): number {
  const normalizedNoise = noise2D(x, z, seed);
  return normalizedNoise * MAX_ROUGHNESS * roughness;
}

export function getTerrainHeightArray(
  widthSegments: number,
  depthSegments: number,
  seed: number,
  roughness: number
): Float32Array {
  const heights = new Float32Array((widthSegments + 1) * (depthSegments + 1));
  const stepX = SCENE_SIZE / widthSegments;
  const stepZ = SCENE_SIZE / depthSegments;
  const halfSize = SCENE_SIZE / 2;

  for (let iz = 0; iz <= depthSegments; iz++) {
    for (let ix = 0; ix <= widthSegments; ix++) {
      const x = ix * stepX - halfSize;
      const z = iz * stepZ - halfSize;
      heights[iz * (widthSegments + 1) + ix] = getTerrainHeight(x, z, seed, roughness);
    }
  }
  return heights;
}

export function createStrata(): Stratum[] {
  const strata: Stratum[] = [];
  let currentDepth = 0;

  for (let i = 0; i < 5; i++) {
    const thickness = 0.5 + seededRandom(i * 3.7 + 1.0) * 2.5;
    const seed = seededRandom(i * 7.3 + 2.5) * 100;
    const stratum: Stratum = {
      id: i,
      name: STRATUM_NAMES[i],
      color: STRATUM_COLORS[i],
      thickness,
      depthTop: currentDepth,
      depthBottom: currentDepth + thickness,
      lithology: LITHOLOGIES[i],
      age: AGES[i],
      roughness: 0.7 + seededRandom(i * 5.1 + 0.9) * 0.6,
      seed
    };
    strata.push(stratum);
    currentDepth += thickness;
  }
  return strata;
}

export function depthToWorld(depth: number): number {
  return -depth;
}

export function worldToDepth(worldY: number): number {
  return -worldY;
}

export function calculateCutThickness(
  stratum: Stratum,
  cutXPercent: number
): number {
  const cutX = (cutXPercent / 100 - 0.5) * SCENE_SIZE;
  const seed = stratum.seed;
  const rough = stratum.roughness;

  let maxThickness = stratum.thickness;
  const samples = 10;
  let total = 0;

  for (let i = 0; i < samples; i++) {
    const z = (i / (samples - 1) - 0.5) * SCENE_SIZE;
    const topNoise = getTerrainHeight(cutX, z, seed, rough);
    const bottomNoise = getTerrainHeight(cutX, z, seed + 3.1, rough * 0.8);
    const visualThickness = stratum.thickness + (topNoise - bottomNoise) * 0.3;
    total += visualThickness;
    if (visualThickness > maxThickness) maxThickness = visualThickness;
  }

  return total / samples;
}

export function getStratumAtPoint(
  strata: Stratum[],
  worldX: number,
  worldY: number,
  worldZ: number
): { stratum: Stratum; depth: number } | null {
  const depth = worldToDepth(worldY);

  for (let i = strata.length - 1; i >= 0; i--) {
    const s = strata[i];
    const topNoise = getTerrainHeight(worldX, worldZ, s.seed, s.roughness);
    const bottomNoise = getTerrainHeight(worldX, worldZ, s.seed + 3.1, s.roughness * 0.8);
    const adjTop = s.depthTop - topNoise;
    const adjBottom = s.depthBottom - bottomNoise * 0.3;

    if (depth >= adjTop && depth <= adjBottom + 0.5) {
      return { stratum: s, depth };
    }
  }

  for (const s of strata) {
    if (depth >= s.depthTop - 0.5 && depth <= s.depthBottom + 0.5) {
      return { stratum: s, depth };
    }
  }

  if (strata.length > 0) {
    return { stratum: strata[Math.min(strata.length - 1, Math.max(0, Math.floor(depth / 2)))] , depth };
  }
  return null;
}

export function getStratumStats(stratum: Stratum): StratumStats {
  const samples = 50;
  let totalThickness = 0;
  let minDepth = Infinity;
  let maxDepth = -Infinity;

  for (let ix = 0; ix < samples; ix++) {
    for (let iz = 0; iz < samples; iz++) {
      const x = (ix / (samples - 1) - 0.5) * SCENE_SIZE;
      const z = (iz / (samples - 1) - 0.5) * SCENE_SIZE;
      const topNoise = getTerrainHeight(x, z, stratum.seed, stratum.roughness);
      const bottomNoise = getTerrainHeight(x, z, stratum.seed + 3.1, stratum.roughness * 0.8);
      const visualThickness = stratum.thickness + (topNoise - bottomNoise) * 0.3;

      totalThickness += visualThickness;
      const actualTop = stratum.depthTop - topNoise;
      const actualBottom = stratum.depthBottom - bottomNoise * 0.3;
      if (actualTop < minDepth) minDepth = actualTop;
      if (actualBottom > maxDepth) maxDepth = actualBottom;
    }
  }

  const avgThickness = totalThickness / (samples * samples);
  const estimatedArea = SCENE_SIZE * SCENE_SIZE * (1 + stratum.roughness * 0.15);

  return {
    avgThickness: Math.round(avgThickness * 100) / 100,
    minDepth: Math.round(Math.max(0, minDepth) * 100) / 100,
    maxDepth: Math.round(maxDepth * 100) / 100,
    estimatedArea: Math.round(estimatedArea * 100) / 100
  };
}

export function percentToWorldX(percent: number): number {
  return (percent / 100 - 0.5) * SCENE_SIZE;
}

export const WORLD_SIZE = SCENE_SIZE;
