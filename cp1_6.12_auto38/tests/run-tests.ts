import { generateTerrain, TERRAIN_RESOLUTION, TERRAIN_SIZE, MAX_TOTAL_VERTICES } from '../core/terrain';
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

function assertGte(actual: number, threshold: number, message: string): void {
  if (actual < threshold) {
    throw new Error(`${message}. Expected >= ${threshold}, got ${actual}`);
  }
}

function assertLte(actual: number, threshold: number, message: string): void {
  if (actual > threshold) {
    throw new Error(`${message}. Expected <= ${threshold}, got ${actual}`);
  }
}

console.log('\n=== 地形生成器单元测试 ===\n');

console.log('\n[core/terrain.ts - 高度图生成测试]');

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
  assertGte(min, 0 - 1e-6, `最小归一化高度 ${min} 小于 0`);
  assertLte(max, 1 + 1e-6, `最大归一化高度 ${max} 大于 1`);
});

test('高度图四角及边缘值应有效且非 NaN/Infinity', () => {
  const result = generateTerrain({ noiseFrequency: 1.5, flatness: 0.7, seed: 7 });
  const checkPoints: [number, number][] = [
    [0, 0],
    [TERRAIN_RESOLUTION - 1, 0],
    [0, TERRAIN_RESOLUTION - 1],
    [TERRAIN_RESOLUTION - 1, TERRAIN_RESOLUTION - 1],
    [1, 1],
    [TERRAIN_RESOLUTION - 2, TERRAIN_RESOLUTION - 2],
    [0, 64],
    [64, 0],
    [TERRAIN_RESOLUTION - 1, 64],
    [64, TERRAIN_RESOLUTION - 1]
  ];
  for (const [x, z] of checkPoints) {
    const v = result.heightMap[z][x];
    assert(!isNaN(v), `边缘点 (${x},${z}) 高度为 NaN`);
    assert(isFinite(v), `边缘点 (${x},${z}) 高度非有限值`);
    assertGte(v, 0, `边缘点 (${x},${z}) 高度 ${v} 不应为负`);
  }
});

test('高度图边缘与内部不应有突变异常值', () => {
  const result = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 55 });
  for (let z = 1; z < TERRAIN_RESOLUTION - 1; z++) {
    for (let x = 1; x < TERRAIN_RESOLUTION - 1; x++) {
      const h = result.heightMap[z][x];
      const neighbors = [
        result.heightMap[z - 1][x],
        result.heightMap[z + 1][x],
        result.heightMap[z][x - 1],
        result.heightMap[z][x + 1]
      ];
      for (const nh of neighbors) {
        const diff = Math.abs(h - nh);
        assertLte(diff, 2.0, `点(${x},${z})与邻居高度差 ${diff.toFixed(3)} 过大, h=${h.toFixed(3)}, nh=${nh.toFixed(3)}`);
      }
    }
  }
});

test('相同种子应生成完全相同的高度图（确定性）', () => {
  const r1 = generateTerrain({ noiseFrequency: 2.5, flatness: 0.4, seed: 12345 });
  const r2 = generateTerrain({ noiseFrequency: 2.5, flatness: 0.4, seed: 12345 });
  for (let z = 0; z < TERRAIN_RESOLUTION; z += 4) {
    for (let x = 0; x < TERRAIN_RESOLUTION; x += 4) {
      assertClose(
        r1.heightMap[z][x],
        r2.heightMap[z][x],
        1e-10,
        `同种子点 (${x},${z}) 高度不一致`
      );
    }
  }
});

test('地形顶点数应为 128x128 = 16384', () => {
  const result = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 1 });
  assert(result.vertexCount === 16384, `顶点数应为 16384, 实际 ${result.vertexCount}`);
});

test('顶点预算应保证地形+树木总顶点 ≤ 50000', () => {
  const result = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 1 });
  assertGte(result.treeVertexBudget, 0, '树木顶点预算应非负');
  assertLte(result.vertexCount + result.treeVertexBudget, MAX_TOTAL_VERTICES, `地形+树木预算 ${result.vertexCount + result.treeVertexBudget} 超过 ${MAX_TOTAL_VERTICES}`);
});

test('平整度参数影响高度分布：低平整度方差更大', () => {
  const flat = generateTerrain({ noiseFrequency: 2, flatness: 0.95, seed: 50 });
  const steep = generateTerrain({ noiseFrequency: 2, flatness: 0.15, seed: 50 });
  let steepVar = 0, flatVar = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    const x = Math.floor(Math.random() * TERRAIN_RESOLUTION);
    const z = Math.floor(Math.random() * TERRAIN_RESOLUTION);
    steepVar += Math.abs(steep.normalizedHeightMap[z][x] - 0.5);
    flatVar += Math.abs(flat.normalizedHeightMap[z][x] - 0.5);
  }
  steepVar /= N;
  flatVar /= N;
  assertGte(steepVar, flatVar * 1.05, `陡峭方差 ${steepVar.toFixed(4)} 应大于平坦方差 ${flatVar.toFixed(4)}`);
});

console.log('\n[core/vegetation.ts - 坡度计算测试]');

test('平坦地面坡度应接近 0°', () => {
  const flatMap: number[][] = [];
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    flatMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      flatMap[z][x] = 2.0;
    }
  }
  const slope = calculateSlope(flatMap, 0, 0);
  assertClose(slope, 0, 0.1, `平坦地面坡度 ${slope}° 应接近 0°`);
});

test('45度斜坡梯度法计算应接近 45°', () => {
  const slopeMap: number[][] = [];
  const cellSize = TERRAIN_SIZE / (TERRAIN_RESOLUTION - 1);
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    slopeMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      slopeMap[z][x] = x * cellSize;
    }
  }
  const slope = calculateSlope(slopeMap, 0, 0);
  assert(slope >= 40 && slope <= 50, `45° 斜坡坡度 ${slope.toFixed(2)}° 应在 40-50° 范围`);
});

test('已知坡度精确验证: 坡度=1.0的斜面应约45°', () => {
  const slopeMap: number[][] = [];
  const cellSize = TERRAIN_SIZE / (TERRAIN_RESOLUTION - 1);
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    slopeMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      slopeMap[z][x] = x * cellSize * 1.0;
    }
  }
  const slope = calculateSlope(slopeMap, 0, 0);
  const expectedDeg = (Math.atan(1.0) * 180) / Math.PI;
  assertClose(slope, expectedDeg, 2.0, `梯度=1.0的斜面坡度 ${slope.toFixed(2)}° 应接近 ${expectedDeg.toFixed(2)}°`);
});

test('垂直悬崖坡度应接近 90°', () => {
  const cliffMap: number[][] = [];
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    cliffMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      cliffMap[z][x] = x < TERRAIN_RESOLUTION / 2 ? 0 : 100;
    }
  }
  const slope = calculateSlope(cliffMap, 0, 0);
  assert(slope >= 60, `垂直悬崖坡度 ${slope.toFixed(1)}° 应 ≥ 60°`);
});

console.log('\n[core/vegetation.ts - 高度插值与植被分布测试]');

test('getHeightAt 角落插值应返回正确高度', () => {
  const testMap: number[][] = [];
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    testMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      testMap[z][x] = x + z * 2;
    }
  }
  const half = TERRAIN_SIZE / 2;
  const v00 = getHeightAt(testMap, -half, -half);
  assertClose(v00, 0, 0.5, `左下角插值 ${v00} 应接近 0`);
});

test('getHeightAt 边界外查询应被夹紧不崩溃', () => {
  const testMap: number[][] = [];
  for (let z = 0; z < TERRAIN_RESOLUTION; z++) {
    testMap[z] = [];
    for (let x = 0; x < TERRAIN_RESOLUTION; x++) {
      testMap[z][x] = 1;
    }
  }
  const outOfBounds = getHeightAt(testMap, -999, 999);
  assert(isFinite(outOfBounds) && !isNaN(outOfBounds), `边界外查询返回 ${outOfBounds} 应为有效数值`);
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
  assert(veg.totalTreeVertices === 0, `密度0时树木顶点应为0`);
});

test('陡坡区域(>30°)不应生成任何树木', () => {
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
    assertLte(slope, 31, `树木 (${t.position.x.toFixed(2)},${t.position.z.toFixed(2)}) 在陡坡 ${slope.toFixed(1)}°`);
  }
});

test('树木位置归一化高度应严格在 [0.2, 0.8] 内', () => {
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
    assertGte(nh, 0.2 - 0.01, `树木归一化高度 ${nh.toFixed(4)} < 0.2`);
    assertLte(nh, 0.8 + 0.01, `树木归一化高度 ${nh.toFixed(4)} > 0.8`);
  }
});

test('树冠半径应严格在 [0.1, 0.3] 范围内', () => {
  const terrain = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 303 });
  const veg = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 20,
    seed: 777,
    vertexBudget: terrain.treeVertexBudget
  });
  for (const t of veg.transforms) {
    assertGte(t.canopyRadius, 0.1, `树冠半径 ${t.canopyRadius} < 0.1`);
    assertLte(t.canopyRadius, 0.3, `树冠半径 ${t.canopyRadius} > 0.3`);
  }
});

test('树木总数不应超过 500', () => {
  const terrain = generateTerrain({ noiseFrequency: 1, flatness: 0.8, seed: 1 });
  const veg = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 20,
    seed: 42,
    vertexBudget: 50000
  });
  assertLte(veg.treeCount, 500, `树木数量 ${veg.treeCount} 超过 500`);
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
  assertLte(veg.totalTreeVertices, budget + 100, `树木顶点 ${veg.totalTreeVertices} 超出预算 ${budget}`);
});

test('地形+树木总顶点数应控制在 50000 以内', () => {
  const terrain = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 1 });
  const veg = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 20,
    seed: 42,
    vertexBudget: terrain.treeVertexBudget
  });
  const totalVertices = terrain.vertexCount + veg.totalTreeVertices;
  assertLte(totalVertices, MAX_TOTAL_VERTICES, `总顶点 ${totalVertices} 超过 ${MAX_TOTAL_VERTICES}`);
  console.log(`    地形顶点: ${terrain.vertexCount}, 树木顶点: ${veg.totalTreeVertices}, 总计: ${totalVertices}`);
});

test('不同种子产生不同的树木分布', () => {
  const terrain = generateTerrain({ noiseFrequency: 2, flatness: 0.5, seed: 1 });
  const v1 = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 15,
    seed: 100,
    vertexBudget: terrain.treeVertexBudget
  });
  const v2 = generateVegetation({
    heightMap: terrain.heightMap,
    normalizedHeightMap: terrain.normalizedHeightMap,
    density: 15,
    seed: 200,
    vertexBudget: terrain.treeVertexBudget
  });
  let sameCount = 0;
  const minLen = Math.min(v1.transforms.length, v2.transforms.length);
  for (let i = 0; i < minLen; i++) {
    if (Math.abs(v1.transforms[i].position.x - v2.transforms[i].position.x) < 0.001 &&
        Math.abs(v1.transforms[i].position.z - v2.transforms[i].position.z) < 0.001) {
      sameCount++;
    }
  }
  assert(sameCount < minLen * 0.5, `不同种子产生 ${sameCount}/${minLen} 相同位置，应显著不同`);
});

console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);

process.exit(failed > 0 ? 1 : 0);
