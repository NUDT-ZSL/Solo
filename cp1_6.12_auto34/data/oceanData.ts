// ============================================================================
// data/oceanData.ts - 洋流数据模块
// 职责：模拟生成全球三大洋流区域（北大西洋、南太平洋、印度洋）的三维洋流数据
// 数据流向：本模块输出数据 → src/oceanRenderer.ts 消费数据进行渲染
// 调用关系：被 oceanRenderer.ts 导入调用 getOceanCurrentData(depth)
// ============================================================================

import * as THREE from 'three';

export interface OceanCurrentData {
  region: string;
  depth: number;
  position: THREE.Vector3[];
  direction: THREE.Vector3[];
  speed: number[];
}

export type DepthLayer = 'surface' | 'middle' | 'deep';

export const DEPTH_VALUES: Record<DepthLayer, number> = {
  surface: 0,
  middle: 500,
  deep: 1500
};

export const DEPTH_LABELS: Record<DepthLayer, string> = {
  surface: '表层 0m',
  middle: '中层 500m',
  deep: '深层 1500m'
};

interface RegionConfig {
  name: string;
  centerX: number;
  centerZ: number;
  radius: number;
  rotationBase: number;
  arrowCount: number;
  particleCount: number;
}

const REGIONS: RegionConfig[] = [
  { name: '北大西洋洋流', centerX: -25, centerZ: -25, radius: 20, rotationBase: Math.PI / 6, arrowCount: 70, particleCount: 700 },
  { name: '南太平洋洋流', centerX: 25, centerZ: 25, radius: 22, rotationBase: -Math.PI / 4, arrowCount: 70, particleCount: 700 },
  { name: '印度洋洋流', centerX: 15, centerZ: -10, radius: 15, rotationBase: Math.PI / 3, arrowCount: 60, particleCount: 600 }
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function generateRegionData(
  config: RegionConfig,
  depth: number,
  depthFactor: number,
  seedOffset: number
): OceanCurrentData {
  const positions: THREE.Vector3[] = [];
  const directions: THREE.Vector3[] = [];
  const speeds: number[] = [];

  const yOffset = -depth * 0.02;

  for (let i = 0; i < config.arrowCount; i++) {
    const seed = seedOffset + i * 137.5;
    const angle = seededRandom(seed) * Math.PI * 2;
    const distRatio = Math.pow(seededRandom(seed + 1), 0.5);
    const dist = distRatio * config.radius * 0.9;

    const x = config.centerX + Math.cos(angle) * dist;
    const z = config.centerZ + Math.sin(angle) * dist;

    const swirlAngle = config.rotationBase + angle + distRatio * Math.PI * 0.5;
    const tangentAngle = angle + Math.PI / 2 + Math.sin(distRatio * Math.PI * 2) * 0.3;

    const dirX = Math.cos(tangentAngle) * Math.cos(swirlAngle * 0.1);
    const dirZ = Math.sin(tangentAngle) * Math.cos(swirlAngle * 0.1);
    const dirY = Math.sin(swirlAngle * 0.05) * 0.2;

    const dir = new THREE.Vector3(dirX, dirY, dirZ).normalize();

    const baseSpeed = lerp(0.5, 5.0, (1.0 - depthFactor) * 0.6 + seededRandom(seed + 2) * 0.4);
    const speedAtRadius = baseSpeed * (0.5 + 0.5 * Math.sin(distRatio * Math.PI));

    positions.push(new THREE.Vector3(x, yOffset, z));
    directions.push(dir);
    speeds.push(speedAtRadius);
  }

  return {
    region: config.name,
    depth,
    position: positions,
    direction: directions,
    speed: speeds
  };
}

export function getDepthFactor(depth: number): number {
  return Math.min(1, depth / 1500);
}

export function getOceanCurrentData(depthLayer: DepthLayer): OceanCurrentData[] {
  const depth = DEPTH_VALUES[depthLayer];
  const depthFactor = getDepthFactor(depth);

  return REGIONS.map((config, idx) =>
    generateRegionData(config, depth, depthFactor, idx * 1000 + depth)
  );
}

export function getParticlePathData(depthLayer: DepthLayer): {
  region: string;
  startPositions: THREE.Vector3[];
  velocities: THREE.Vector3[];
}[] {
  const depth = DEPTH_VALUES[depthLayer];
  const yOffset = -depth * 0.02;

  return REGIONS.map((config, idx) => {
    const starts: THREE.Vector3[] = [];
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < config.particleCount; i++) {
      const seed = idx * 10000 + i * 73.3;
      const angle = seededRandom(seed) * Math.PI * 2;
      const distRatio = seededRandom(seed + 1);
      const dist = distRatio * config.radius * 0.95;

      const x = config.centerX + Math.cos(angle) * dist;
      const z = config.centerZ + Math.sin(angle) * dist;

      const tangentAngle = angle + Math.PI / 2 + Math.sin(distRatio * Math.PI * 2) * 0.3;
      const swirl = config.rotationBase;

      const vx = Math.cos(tangentAngle) * Math.cos(swirl * 0.1);
      const vz = Math.sin(tangentAngle) * Math.cos(swirl * 0.1);
      const vy = Math.sin(swirl * 0.05 + distRatio * Math.PI) * 0.1;

      const speed = lerp(0.3, 2.5, (1.0 - getDepthFactor(depth)) * 0.5 + seededRandom(seed + 2) * 0.5);
      const vel = new THREE.Vector3(vx, vy, vz).normalize().multiplyScalar(speed);

      starts.push(new THREE.Vector3(x, yOffset + (seededRandom(seed + 3) - 0.5) * 2, z));
      velocities.push(vel);
    }

    return {
      region: config.name,
      startPositions: starts,
      velocities
    };
  });
}

export const REGION_CENTERS: { name: string; center: THREE.Vector3; radius: number }[] = REGIONS.map(r => ({
  name: r.name,
  center: new THREE.Vector3(r.centerX, 0, r.centerZ),
  radius: r.radius
}));
