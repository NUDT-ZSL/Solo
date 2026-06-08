import { BrickData } from './BrickFactory';

export interface StabilityResult {
  unstableBrickIds: string[];
  stabilityScore: number;
}

export function getBrickFootprint(brick: BrickData): {
  minX: number; maxX: number; minZ: number; maxZ: number; topY: number; bottomY: number;
} {
  const rot = ((brick.rotation % 360) + 360) % 360;
  const w = (rot === 90 || rot === 270) ? brick.depth : brick.width;
  const d = (rot === 90 || rot === 270) ? brick.width : brick.depth;
  const halfW = w / 2;
  const halfD = d / 2;
  return {
    minX: brick.position.x - halfW,
    maxX: brick.position.x + halfW,
    minZ: brick.position.z - halfD,
    maxZ: brick.position.z + halfD,
    bottomY: brick.position.y,
    topY: brick.position.y + brick.height,
  };
}

function rectOverlapArea(
  a: { minX: number; maxX: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minZ: number; maxZ: number }
): number {
  const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapZ = Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
  return overlapX * overlapZ;
}

function getEffectiveFootprint(brick: BrickData): {
  minX: number; maxX: number; minZ: number; maxZ: number; area: number;
} {
  const fp = getBrickFootprint(brick);
  const area = (fp.maxX - fp.minX) * (fp.maxZ - fp.minZ);
  return {
    minX: fp.minX, maxX: fp.maxX, minZ: fp.minZ, maxZ: fp.maxZ, area,
  };
}

export function checkStability(bricks: BrickData[]): StabilityResult {
  if (bricks.length === 0) {
    return { unstableBrickIds: [], stabilityScore: 100 };
  }
  const unstableIds: string[] = [];
  const sorted = [...bricks].sort((a, b) => a.position.y - b.position.y);
  for (const brick of sorted) {
    if (brick.position.y <= 0.01) {
      brick.isStable = true;
      continue;
    }
    const brickFp = getEffectiveFootprint(brick);
    if (brickFp.area < 0.01) {
      brick.isStable = true;
      continue;
    }
    let totalSupportArea = 0;
    for (const other of bricks) {
      if (other.id === brick.id) continue;
      const otherFp = getBrickFootprint(other);
      const gap = brickFp.minX === undefined ? 0 : 0;
      if (brick.position.y - otherFp.topY <= 0.12 && brick.position.y - otherFp.topY >= -0.01) {
        const overlap = rectOverlapArea(
          { minX: brickFp.minX, maxX: brickFp.maxX, minZ: brickFp.minZ, maxZ: brickFp.maxZ },
          { minX: otherFp.minX, maxX: otherFp.maxX, minZ: otherFp.minZ, maxZ: otherFp.maxZ }
        );
        totalSupportArea += overlap;
        if (gap) { /* noop */ }
      }
    }
    const ratio = totalSupportArea / brickFp.area;
    if (ratio < 0.5) {
      brick.isStable = false;
      unstableIds.push(brick.id);
    } else {
      brick.isStable = true;
    }
  }
  const stableCount = bricks.filter(b => b.isStable).length;
  const score = Math.round((stableCount / bricks.length) * 100);
  return { unstableBrickIds: unstableIds, stabilityScore: score };
}

export function findStablePosition(
  brick: BrickData,
  bricks: BrickData[]
): { x: number; z: number; y: number } | null {
  const originalX = brick.position.x;
  const originalZ = brick.position.z;
  const originalY = brick.position.y;
  const candidates: { x: number; z: number; y: number; dist: number }[] = [];
  const searchRange = 6;
  for (let dx = -searchRange; dx <= searchRange; dx++) {
    for (let dz = -searchRange; dz <= searchRange; dz++) {
      for (let dy = 0; dy <= 5; dy++) {
        const testX = originalX + dx;
        const testZ = originalZ + dz;
        const testY = originalY - dy;
        if (testY < 0) continue;
        const testBrick: BrickData = {
          ...brick,
          position: { x: testX, y: testY, z: testZ },
        };
        if (checkPlacementValid(testBrick, bricks)) {
          const dist = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
          candidates.push({ x: testX, z: testZ, y: testY, dist });
        }
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.dist - b.dist);
  const best = candidates[0];
  return { x: best.x, y: best.y, z: best.z };
}

export function checkPlacementValid(testBrick: BrickData, bricks: BrickData[]): boolean {
  const testFp = getBrickFootprint(testBrick);
  for (const other of bricks) {
    if (other.id === testBrick.id) continue;
    const otherFp = getBrickFootprint(other);
    const overlapX = Math.min(testFp.maxX, otherFp.maxX) - Math.max(testFp.minX, otherFp.minX);
    const overlapZ = Math.min(testFp.maxZ, otherFp.maxZ) - Math.max(testFp.minZ, otherFp.minZ);
    const overlapY = Math.min(testFp.topY, otherFp.topY) - Math.max(testFp.bottomY, otherFp.bottomY);
    if (overlapX > 0.05 && overlapZ > 0.05 && overlapY > 0.05) {
      return false;
    }
  }
  if (testBrick.position.y <= 0.01) return true;
  const testEff = getEffectiveFootprint(testBrick);
  let totalSupport = 0;
  for (const other of bricks) {
    if (other.id === testBrick.id) continue;
    const otherFp = getBrickFootprint(other);
    if (testBrick.position.y - otherFp.topY <= 0.12 && testBrick.position.y - otherFp.topY >= -0.01) {
      totalSupport += rectOverlapArea(
        { minX: testEff.minX, maxX: testEff.maxX, minZ: testEff.minZ, maxZ: testEff.maxZ },
        { minX: otherFp.minX, maxX: otherFp.maxX, minZ: otherFp.minZ, maxZ: otherFp.maxZ }
      );
    }
  }
  const ratio = totalSupport / testEff.area;
  return ratio >= 0.5;
}

export function getBuildSuggestion(
  bricks: BrickData[]
): { type: string; position: { x: number; y: number; z: number }; rotation: number } | null {
  if (bricks.length === 0) {
    return {
      type: 'brick_2x2',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
    };
  }
  const topPositions: Map<string, { x: number; z: number; y: number; count: number }> = new Map();
  for (const brick of bricks) {
    const fp = getBrickFootprint(brick);
    const minX = Math.ceil(fp.minX);
    const maxX = Math.floor(fp.maxX - 0.01);
    const minZ = Math.ceil(fp.minZ);
    const maxZ = Math.floor(fp.maxZ - 0.01);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const key = `${x},${z}`;
        const existing = topPositions.get(key);
        if (!existing || fp.topY > existing.y) {
          topPositions.set(key, { x, z, y: fp.topY, count: 1 });
        } else {
          existing.count++;
        }
      }
    }
  }
  let best: { pos: { x: number; y: number; z: number }; score: number } | null = null;
  const sortedBricks = [...bricks].sort((a, b) => b.position.y - a.position.y);
  const centerY = sortedBricks.length > 0 ? sortedBricks[0].position.y : 0;
  for (const [, info] of topPositions) {
    const testBrick: BrickData = {
      id: 'suggest',
      type: 'brick_2x2',
      color: '#00FFFF',
      position: { x: info.x, y: info.y, z: info.z },
      rotation: 0,
      width: 2, depth: 2, height: 1,
      isStable: true,
    };
    if (checkPlacementValid(testBrick, bricks)) {
      const cx = 0;
      const cz = 0;
      const distToCenter = Math.abs(info.x - cx) + Math.abs(info.z - cz);
      const score = info.count * 10 + centerY * 5 - distToCenter;
      if (!best || score > best.score) {
        best = { pos: { x: info.x, y: info.y, z: info.z }, score };
      }
    }
  }
  if (!best) return null;
  return {
    type: 'brick_2x2',
    position: best.pos,
    rotation: 0,
  };
}
