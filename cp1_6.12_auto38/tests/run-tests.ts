import { generateTerrain, TERRAIN_RESOLUTION, MAX_TOTAL_VERTICES } from '../core/terrain';
import {
  generateVegetation,
  getHeightAt,
  calculateSlope
} from '../core/vegetation';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true, message: 'OK' });
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    results.push({ name, passed: false, message: e.message || String(e) });
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message || e}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertClose(actual: number, expected: number, epsilon: number, message: string): void {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message}. Expected ${expected} ± ${epsilon}, got ${actual}`);
  }
}

console.log('\n=== 地形生成器单元测试 ===\n');

console.log('\n[core/terrain.ts - 高度图测试]');

test('地形生成应输出 128x128 高度图', () => {
  const result = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 42 });
  assert(result.heightMap.length === TERRAIN_RESOLUTION, `高度图行数应为 ${TERRAIN_RESOLUTION}, 实际 ${result.heightMap.length}`);
  assert(result.heightMap[0].length === TERRAIN_RESOLUTION, `高度图列数应为 ${TERRAIN_RESOLUTION}, 实际 ${result.heightMap[0].length}`);
});

test('归一化高度图所有值应在 [0, 1] 范围内', () => {
  const result = generateTerrain({ noiseFrequency: 3, flatness: 0.3, seed: 999 });
  let min = Infinity;
  let max = -Infinity;
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      const v = result.normalizedHeightMap[z][x];
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  assert(min >= 0 - 1e-6, `最小归一化高度 ${min} 小于 0`);
  assert(max <= 1 + 1e-6, `最大归一化高度 ${max} 大于 1`);
});

test('高度图边缘(边界)值应有效且非 NaN', () => {
  const result = generateTerrain({ noiseFrequency: 1.5, flatness: 0.7, seed: 7 });
  const checkPoints: [number, number][] = [
    [0, 0],
    [TERRAIN_RESOLUTION - 1, 0],
    [0, TERRAIN_RESOLUTION - 1],
    [TERRAIN_RESOLUTION - 1, TERRAIN_RESOLUTION - 1],
    [TERRAIN_RESOLUTION / 2, 0],
    [0, TERRAIN_RESOLUTION / 2],
    [TERRAIN_RESOLUTION - 1, TERRAIN_RESOLUTION / 2],
    [TERRAIN_RESOLUTION / 2, TERRAIN_RESOLUTION - 1]
  ];
  for (const [x, z] of checkPoints) {
    const v = result.heightMap[z][x];
    assert(!isNaN(v), `边缘点 (${x},${z}) 高度为 NaN`);
    assert(isFinite(v), `边缘点 (${x},${z}) 高度非有限值`);
  }
});

test('相同种子应生成相同的高度图（确定性）', () => {
  const r1 = generateTerrain({ noiseFrequency: 2.5, flatness: 0.4, seed: 12345 });
  const r2 = generateTerrain({ noiseFrequency: 2.5, flatness: 0.4, seed: 12345 });
  for (let z = 0; z < TERRAIN_RESOLUTION; z += 8) {
    for (let x = 0; x < TERRAIN_RESOLUTION; x += 8) {
      assertClose(
        r1.heightMap[z][x],
        r2.heightMap[z][x],
        1e-9,
        `同种子点 (${x},${z}) 高度不一致`
      );
    }
  }
});

test('地形顶点数应为 128x128 = 16384', () => {
  const result = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 1 });
  assert(result.vertexCount === 16384, `顶点数应为 16384, 实际 ${result.vertexCount}`);
  assert(result.treeVertexBudget > 0, '树木顶点预算应为正数');
  assert(result.vertexCount + result.treeVertexBudget <= MAX_TOTAL_VERTICES + 1, '总顶点预算超标');
});

test('平整度参数应影响高度变化：小平整度更陡峭', () => {
  const flat = generateTerrain({ noiseFrequency: 2, flatness: 0.95, seed: 50 });
  const steep = generateTerrain({ noiseFrequency: 2, flatness: 0.15, seed: 50 });

  let steepVariance = 0;
  let flatVariance = 0;
  const samples = 200;
  for (let i = 0; i < samples; i++) {
    const x = Math.floor(Math.random() * TERRAIN_RESOLUTION);
    const z = Math.floor(Math.random() * TERRAIN_RESOLUTION);
    steepVariance += Math.abs(steep.normalizedHeightMap[z][x] - 0.5);
    flatVariance += Math.abs(flat.normalizedHeightMap[z][x] - 0.5);
  }
  steepVariance /= samples;
  flatVariance /= samples;

  assert(steepVariance > flatVariance * 1.1, `平整度参数失效: 陡峭方差 ${steepVariance} 不应小于 平坦方差 ${flatVariance}`);
});

console.log('\n[core/vegetation.ts - 坡度与植被分布测试]');

test('平坦地面坡度计算应接近 0 度', () => {
  const flatMap: number[][] = [];
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    flatMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      flatMap[z][x] = 2.0;
    }
  }
  const slope = calculateSlope(flatMap, 0, 0);
  assertClose(slope, 0, 0.5, `平坦地面坡度 ${slope}° 应接近 0°`);
});

test('45度斜坡坡度计算应接近 45 度', () => {
  const slopeMap: number[][] = [];
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    slopeMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      slopeMap[z][x] = x * 0.15625;
    }
  }
  const slope = calculateSlope(slopeMap, 0, 0);
  assert(slope >= 40 && slope <= 50, `45° 斜坡坡度 ${slope}° 应在 40-50° 范围`);
});

test('getHeightAt 双线性插值在角落应返回正确高度', () => {
  const testMap: number[][] = [];
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    testMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      testMap[z][x] = x + z * 2;
    }
  }
  const half = 10;
  const v00 = getHeightAt(testMap, -half, -half);
  const v11 = getHeightAt(testMap, half - 0.01, half - 0.01);
  assertClose(v00, 0, 0.5, `左下角插值 ${v00} 应接近 0`);
  const expectedV11 = (TERRAIN_RESOLUTION - 1) + (TERRAIN_RESOLUTION - 1) * 2;
  assertClose(v11, expectedV11, 2, `右上角插值 ${v11} 应接近 ${expectedV11}`);
});

test('密度为 0 时应生成 0 棵树', () => {
  const terrain = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 88 });
  const veg = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 0,
    seed: 1,
    vertexBudget: 30000
  });
  assert(veg.treeCount === 0, `密度0时应生成0棵树，实际 ${veg.treeCount}`);
});

test('陡坡区域(>30°)不应生成树木', () => {
  const steepMap: number[][] = [];
  const normMap: number[][] = [];
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    steepMap[z] = [];
    normMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      steepMap[z][x] = Math.abs(x - TERRAIN_RESOLUTION / 2) * 0.5;
      const nh = 0.4 + 0.2 * Math.sin(x * 0.01);
      normMap[z][x] = Math.max(0.2, Math.min(0.8, nh));
    }
  }

  const veg = generateVegetation({
    heightMap: steepMap,
    normalizedHeightMap: normMap,
    density: 20,
    seed: 42,
    vertexBudget: 30000
  });

  for (const t of veg.transforms) {
    const slope = calculateSlope(steepMap, t.position.x, t.position.z);
    assert(slope <= 30.5, `树木 ${t.position.x.toFixed(2)},${t.position.z.toFixed(2)} 生成在陡坡 ${slope.toFixed(1)}°`);
  }
});

test('树木高度应在归一化 [0.2, 0.8] 范围内', () => {
  const terrain = generateTerrain({ noiseFrequency: 2.5, flatness: 0.4, seed: 2024 });
  const veg = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 15,
    seed: 101,
    vertexBudget: terrain.treeVertexBudget
  });

  for (const t of veg.transforms) {
    const nh = getHeightAt(terrain.normalizedHeightMap, t.position.x, t.position.z);
    assert(nh >= 0.195 && nh <= 0.805, `树木高度归一化值 ${nh.toFixed(3)} 超出 [0.2, 0.8] 容差范围`);
  }
});

test('树冠半径应严格在 [0.1, 0.3] 之间', () => {
  const terrain = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 303 });
  const veg = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 20,
    seed: 777,
    vertexBudget: terrain.treeVertexBudget
  });

  for (const t of veg.transforms) {
    assert(
      t.canopyRadius >= 0.0999 && t.canopyRadius <= 0.3001,
      `树冠半径 ${t.canopyRadius} 超出 [0.1, 0.3] 范围`
    );
  }
});

test('总树木顶点数不应超过顶点预算', () => {
  const terrain = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 1 });
  const budget = 5000;
  const veg = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 20,
    seed: 1,
    vertexBudget: budget
  });
  assert(veg.totalTreeVertices <= budget + 56, `树木顶点 ${veg.totalTreeVertices} 超出预算 ${budget}`);
});

console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);

process.exit(failed > 0 ? 1 : 0);
