import * as assert from 'node:assert/strict';
import {
  generateLSystem,
  parseBranches,
  isValidLSystemParams,
} from './lsystem.ts';
import type { LSystemParams, BranchSegment } from './lsystem.ts';

const DEFAULT_PARAMS: LSystemParams = {
  iterations: 5,
  trunkLength: 20,
  branchAngle: 30,
  lengthDecay: 0.75,
  leafDensity: 0.5,
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    testResults.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    testResults.push({ name, passed: false, error: message });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${message}`);
  }
}

test('generateLSystem: 默认公理规则，迭代3次正确', () => {
  const params: LSystemParams = { ...DEFAULT_PARAMS, iterations: 3 };
  const result = generateLSystem(params);
  
  let expected = 'F';
  for (let i = 0; i < 3; i++) {
    let next = '';
    for (const ch of expected) {
      next += ch === 'F' ? 'FF[+F][-F]' : ch;
    }
    expected = next;
  }
  
  assert.equal(result, expected, '迭代3次的L-system字符串应匹配预期');
  assert.ok(result.length > 0, '结果不应为空');
});

test('generateLSystem: 自定义公理和规则正确', () => {
  const params: LSystemParams = {
    ...DEFAULT_PARAMS,
    iterations: 2,
    axiom: 'X',
    rules: { X: 'F[+X]F[-X]+X', F: 'FF' },
  };
  
  const result = generateLSystem(params);
  
  let expected = 'X';
  for (let i = 0; i < 2; i++) {
    let next = '';
    for (const ch of expected) {
      next += params.rules?.[ch] ?? ch;
    }
    expected = next;
  }
  
  assert.equal(result, expected, '自定义规则迭代结果应匹配预期');
  assert.ok(result.includes('['), '结果应包含分支符号');
  assert.ok(result.includes(']'), '结果应包含分支结束符号');
});

test('parseBranches: 空字符串返回空数组', () => {
  const result = parseBranches(DEFAULT_PARAMS, '');
  assert.deepEqual(result, [], '空字符串应返回空数组');
});

test('parseBranches: 简单F字符串生成一个segment', () => {
  const params: LSystemParams = { ...DEFAULT_PARAMS, iterations: 3 };
  const result = parseBranches(params, 'F');
  
  assert.equal(result.length, 1, '应生成1个segment');
  
  const segment = result[0];
  assert.ok(segment.start, '应有start属性');
  assert.ok(segment.end, '应有end属性');
  assert.equal(segment.depth, 0, '深度应为0');
  assert.equal(segment.start.y, 0, '起始点Y坐标应为0');
  assert.ok(segment.end.y > 0, '结束点Y坐标应大于0');
});

test('parseBranches: 极端迭代次数3和8的边界处理', () => {
  const params3: LSystemParams = { ...DEFAULT_PARAMS, iterations: 3 };
  const params8: LSystemParams = { ...DEFAULT_PARAMS, iterations: 8 };
  
  const lSystem3 = generateLSystem(params3);
  const lSystem8 = generateLSystem(params8);
  
  const result3 = parseBranches(params3, lSystem3);
  const result8 = parseBranches(params8, lSystem8);
  
  assert.ok(result3.length > 0, '迭代3次应生成segments');
  assert.ok(result8.length > 0, '迭代8次应生成segments');
  assert.ok(result8.length > result3.length, '迭代8次应比迭代3次生成更多segments');
  
  const maxDepth3 = Math.max(...result3.map(s => s.depth));
  const maxDepth8 = Math.max(...result8.map(s => s.depth));
  
  assert.ok(maxDepth3 <= 3, '迭代3次的最大深度不应超过3');
  assert.ok(maxDepth8 <= 8, '迭代8次的最大深度不应超过8');
});

test('parseBranches: 迭代次数越界时自动clamp', () => {
  const paramsLow: LSystemParams = { ...DEFAULT_PARAMS, iterations: 1 };
  const paramsHigh: LSystemParams = { ...DEFAULT_PARAMS, iterations: 10 };
  
  const lSystemLow = generateLSystem(paramsLow);
  const lSystemHigh = generateLSystem(paramsHigh);
  
  const resultLow = parseBranches(paramsLow, lSystemLow);
  const resultHigh = parseBranches(paramsHigh, lSystemHigh);
  
  const maxDepthLow = Math.max(...resultLow.map(s => s.depth));
  const maxDepthHigh = Math.max(...resultHigh.map(s => s.depth));
  
  assert.ok(maxDepthLow >= 3, '迭代次数小于3时应强制设为3');
  assert.ok(maxDepthHigh <= 8, '迭代次数大于8时应强制设为8');
});

test('parseBranches: 小角度(10度)+高迭代时分支长度安全', () => {
  const params: LSystemParams = {
    ...DEFAULT_PARAMS,
    iterations: 7,
    branchAngle: 10,
    trunkLength: 1,
    lengthDecay: 0.5,
  };
  
  const lSystem = generateLSystem(params);
  const result = parseBranches(params, lSystem);
  
  assert.ok(result.length > 0, '应生成segments');
  
  for (const segment of result) {
    const length = segment.end.distanceTo(segment.start);
    assert.ok(length >= 0.5, `小角度高迭代时分支长度应>=0.5，实际为${length}`);
  }
});

test('parseBranches: 分支角度越界时自动clamp', () => {
  const paramsLow: LSystemParams = { ...DEFAULT_PARAMS, branchAngle: 5 };
  const paramsHigh: LSystemParams = { ...DEFAULT_PARAMS, branchAngle: 70 };
  
  const lSystem = 'F[+F]F[-F]';
  
  const resultLow = parseBranches(paramsLow, lSystem);
  const resultHigh = parseBranches(paramsHigh, lSystem);
  
  assert.ok(resultLow.length > 0, '角度过小应能正常生成segments');
  assert.ok(resultHigh.length > 0, '角度过大应能正常生成segments');
  
  const firstSegLow = resultLow[0];
  const secondSegLow = resultLow.find(s => s.depth === 1);
  assert.ok(secondSegLow, '应找到深度为1的segment');
  
  const angleLow = Math.atan2(
    secondSegLow.end.x - secondSegLow.start.x,
    secondSegLow.end.y - secondSegLow.start.y
  );
  const expectedMinAngle = (10 * Math.PI) / 180;
  assert.ok(Math.abs(angleLow) >= expectedMinAngle * 0.9, '角度应被clamp到至少10度');
});

test('parseBranches: 无有效F字符时返回空数组并警告', () => {
  const originalWarn = console.warn;
  let warnCalled = false;
  console.warn = () => { warnCalled = true; };
  
  try {
    const result = parseBranches(DEFAULT_PARAMS, '[]+-');
    assert.deepEqual(result, [], '无F字符时应返回空数组');
    assert.ok(warnCalled, '应调用console.warn发出警告');
  } finally {
    console.warn = originalWarn;
  }
});

test('parseBranches: 3D旋转符号支持', () => {
  const params: LSystemParams = { ...DEFAULT_PARAMS, iterations: 3 };
  
  const testCases = [
    { symbol: '&', axis: 'X', desc: '俯仰(绕X轴正方向)' },
    { symbol: '^', axis: 'X', desc: '滚转(绕X轴负方向)' },
    { symbol: '\\', axis: 'Y', desc: '绕Y轴正方向' },
    { symbol: '/', axis: 'Y', desc: '绕Y轴负方向' },
  ];
  
  for (const tc of testCases) {
    const lSystem = `F${tc.symbol}F`;
    const result = parseBranches(params, lSystem);
    
    assert.equal(result.length, 2, `${tc.desc}应生成2个segments`);
    
    const dir1 = result[0].end.clone().sub(result[0].start).normalize();
    const dir2 = result[1].end.clone().sub(result[1].start).normalize();
    
    const dot = dir1.dot(dir2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    
    assert.ok(angle > 0.01, `${tc.desc}应产生明显的方向变化`);
    
    if (tc.axis === 'X') {
      assert.ok(Math.abs(dir2.x) < 0.9, `${tc.desc}不应主要沿X轴方向`);
    }
  }
});

test('isValidLSystemParams: 有效参数判断', () => {
  const validParams: LSystemParams = {
    iterations: 5,
    trunkLength: 20,
    branchAngle: 30,
    lengthDecay: 0.75,
    leafDensity: 0.5,
  };
  
  assert.ok(isValidLSystemParams(validParams), '有效参数应返回true');
  
  const validWithOptional: LSystemParams = {
    ...validParams,
    axiom: 'X',
    rules: { X: 'F[+X]' },
  };
  
  assert.ok(isValidLSystemParams(validWithOptional), '带可选属性的有效参数应返回true');
});

test('isValidLSystemParams: 无效参数判断', () => {
  assert.ok(!isValidLSystemParams(null), 'null应返回false');
  assert.ok(!isValidLSystemParams(undefined), 'undefined应返回false');
  assert.ok(!isValidLSystemParams('string'), '字符串应返回false');
  assert.ok(!isValidLSystemParams(123), '数字应返回false');
  
  const missingIterations = {
    trunkLength: 20,
    branchAngle: 30,
    lengthDecay: 0.75,
    leafDensity: 0.5,
  };
  assert.ok(!isValidLSystemParams(missingIterations), '缺少iterations应返回false');
  
  const invalidTrunkLength: LSystemParams = { ...DEFAULT_PARAMS, trunkLength: -5 };
  assert.ok(!isValidLSystemParams(invalidTrunkLength), 'trunkLength为负应返回false');
  
  const invalidDecay: LSystemParams = { ...DEFAULT_PARAMS, lengthDecay: 1.5 };
  assert.ok(!isValidLSystemParams(invalidDecay), 'lengthDecay>1应返回false');
  
  const invalidDensity: LSystemParams = { ...DEFAULT_PARAMS, leafDensity: -0.1 };
  assert.ok(!isValidLSystemParams(invalidDensity), 'leafDensity为负应返回false');
  
  const invalidAxiom = { ...DEFAULT_PARAMS, axiom: 123 };
  assert.ok(!isValidLSystemParams(invalidAxiom), 'axiom为数字应返回false');
  
  const invalidRules = { ...DEFAULT_PARAMS, rules: { F: 123 } };
  assert.ok(!isValidLSystemParams(invalidRules), 'rules值为数字应返回false');
});

export function runTests(): void {
  console.log('\n=== L-System 单元测试 ===\n');
  
  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  
  console.log(`\n=== 测试结果: ${passed}/${total} 通过 ===`);
  
  if (passed < total) {
    console.log('\n失败的测试:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      console.log(`    ${r.error}`);
    });
    process.exitCode = 1;
  } else {
    console.log('\n所有测试通过! ✓');
    process.exitCode = 0;
  }
}

runTests();
