import {
  recognizeRune,
  getElementName,
  getElementColor,
  getElementEmoji,
  getCombinedElement,
  getComboType,
  ElementType,
  Point
} from '../src/runeRecognizer';

type TestFn = () => void | Promise<void>;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

function test(name: string, fn: TestFn): void {
  const start = performance.now();
  try {
    fn();
    const duration = performance.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`  ✓ ${name} (${duration.toFixed(1)}ms)`);
  } catch (e) {
    const duration = performance.now() - start;
    const error = e instanceof Error ? e.message : String(e);
    results.push({ name, passed: false, error, duration });
    console.log(`  ✗ ${name}\n      ${error}`);
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNotNull(v: unknown, msg?: string): void {
  if (v === null || v === undefined) {
    throw new Error(msg || 'Expected non-null value');
  }
}

function assertCloseTo(actual: number, expected: number, tolerance: number, msg?: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg || 'Value not close enough'}: expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

function assertTrue(v: boolean, msg?: string): void {
  if (!v) throw new Error(msg || 'Expected true');
}

function generateCircle(cx: number, cy: number, r: number, segments: number = 40): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return points;
}

function generateWavyLine(startX: number, startY: number, length: number, amplitude: number, segments: number = 40): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = startX + t * length;
    const y = startY + Math.sin(t * Math.PI * 6) * amplitude;
    points.push({ x, y });
  }
  return points;
}

function generateSpiral(cx: number, cy: number, turns: number = 3, segments: number = 80): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2 * turns;
    const r = 10 + t * 80;
    points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return points;
}

function generateCrossed(cx: number, cy: number, r: number): Point[] {
  const points: Point[] = [];
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    points.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r
    });
  }
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    points.push({
      x: cx - r * 0.8 + t * r * 1.6,
      y: cy + r * 0.6
    });
  }
  return points;
}

function addNoise(points: Point[], noiseLevel: number): Point[] {
  return points.map(p => ({
    x: p.x + (Math.random() - 0.5) * noiseLevel,
    y: p.y + (Math.random() - 0.5) * noiseLevel
  }));
}

console.log('\n' + '='.repeat(60));
console.log('符咒工坊 - 符文识别测试套件');
console.log('='.repeat(60));

console.log('\n📌 元素元数据测试');
test('getElementName 返回正确元素名', () => {
  assertEqual(getElementName('fire'), '火');
  assertEqual(getElementName('thunder'), '雷');
  assertEqual(getElementName('wind'), '风');
  assertEqual(getElementName('earth'), '土');
});

test('getElementColor 返回合法颜色对', () => {
  const fireColor = getElementColor('fire');
  assertTrue(fireColor.start.startsWith('#') && fireColor.end.startsWith('#'), '颜色格式正确');
  const keys: ElementType[] = ['fire', 'thunder', 'wind', 'earth'];
  for (const k of keys) {
    const c = getElementColor(k);
    assertEqual(c.start.length, 7);
    assertEqual(c.end.length, 7);
  }
});

test('getElementEmoji 返回正确表情符号', () => {
  assertEqual(getElementEmoji('fire'), '🔥');
  assertEqual(getElementEmoji('thunder'), '⚡');
  assertEqual(getElementEmoji('wind'), '🌀');
  assertEqual(getElementEmoji('earth'), '🪨');
});

console.log('\n📌 基础符文识别测试');
test('火元素识别 - 闭合环形状', () => {
  const circle = generateCircle(200, 200, 100, 50);
  const line = [];
  for (let i = 0; i <= 15; i++) {
    line.push({ x: 200 + i * 2, y: 100 + i * 4 });
  }
  const result = recognizeRune([...circle, ...line]);
  assertNotNull(result.element);
  assertEqual(result.element, 'fire');
  assertTrue(result.confidence >= 0.3, `置信度应 >= 0.3, 当前 ${result.confidence}`);
});

test('雷元素识别 - 锯齿波浪', () => {
  const wavy = generateWavyLine(50, 200, 300, 40, 60);
  const result = recognizeRune(wavy);
  assertNotNull(result.element);
  assertEqual(result.element, 'thunder');
  assertTrue(result.confidence >= 0.3, `置信度应 >= 0.3, 当前 ${result.confidence}`);
});

test('风元素识别 - 螺旋', () => {
  const spiral = generateSpiral(200, 200, 3, 100);
  const result = recognizeRune(spiral);
  assertNotNull(result.element);
  assertEqual(result.element, 'wind');
  assertTrue(result.confidence >= 0.3, `置信度应 >= 0.3, 当前 ${result.confidence}`);
});

test('土元素识别 - 交叉环', () => {
  const crossed = generateCrossed(200, 200, 80);
  const result = recognizeRune(crossed);
  assertNotNull(result.element);
  assertEqual(result.element, 'earth');
  assertTrue(result.confidence >= 0.3, `置信度应 >= 0.3, 当前 ${result.confidence}`);
});

console.log('\n📌 噪声鲁棒性测试');
test('火元素 - 轻微噪声仍正确识别', () => {
  const circle = generateCircle(200, 200, 100, 50);
  const line: Point[] = [];
  for (let i = 0; i <= 15; i++) {
    line.push({ x: 200 + i * 2, y: 100 + i * 4 });
  }
  const noisy = addNoise([...circle, ...line], 6);
  const result = recognizeRune(noisy);
  assertNotNull(result.element);
  assertEqual(result.element, 'fire');
});

test('雷元素 - 轻微噪声仍正确识别', () => {
  const wavy = generateWavyLine(50, 200, 300, 40, 60);
  const noisy = addNoise(wavy, 6);
  const result = recognizeRune(noisy);
  assertNotNull(result.element);
  assertEqual(result.element, 'thunder');
});

test('风元素 - 轻微噪声仍正确识别', () => {
  const spiral = generateSpiral(200, 200, 3, 100);
  const noisy = addNoise(spiral, 6);
  const result = recognizeRune(noisy);
  assertNotNull(result.element);
  assertEqual(result.element, 'wind');
});

test('极短输入应返回 null', () => {
  const shortPoints: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  const result = recognizeRune(shortPoints);
  assertEqual(result.element, null);
});

console.log('\n📌 组合符文测试');
test('getComboType - 火+风组合', () => {
  const type = getComboType(['fire', 'wind']);
  assertEqual(type, 'fire-wind');
});

test('getComboType - 雷+土组合', () => {
  const type = getComboType(['thunder', 'earth']);
  assertEqual(type, 'earth-thunder');
});

test('getComboType - 单元素返回 null', () => {
  const type = getComboType(['fire']);
  assertEqual(type, null);
});

test('getCombinedElement - 火+风=爆燃火焰漩涡', () => {
  const combo = getCombinedElement(['fire', 'wind']);
  assertNotNull(combo);
  assertEqual(combo.name, '爆燃火焰漩涡');
  assertEqual(combo.comboType, 'fire-wind');
});

test('getCombinedElement - 雷+土=晶体电网', () => {
  const combo = getCombinedElement(['thunder', 'earth']);
  assertNotNull(combo);
  assertEqual(combo.name, '晶体电网');
});

test('getCombinedElement - 火+土=熔岩喷发', () => {
  const combo = getCombinedElement(['fire', 'earth']);
  assertNotNull(combo);
  assertEqual(combo.name, '熔岩喷发');
});

test('getCombinedElement - 雷+风=电磁风暴', () => {
  const combo = getCombinedElement(['thunder', 'wind']);
  assertNotNull(combo);
  assertEqual(combo.name, '电磁风暴');
});

test('getCombinedElement - 风+土=沙尘暴', () => {
  const combo = getCombinedElement(['wind', 'earth']);
  assertNotNull(combo);
  assertEqual(combo.name, '沙尘暴');
});

test('getCombinedElement - 火+雷=雷火风暴', () => {
  const combo = getCombinedElement(['fire', 'thunder']);
  assertNotNull(combo);
  assertEqual(combo.name, '雷火风暴');
});

console.log('\n📌 识别性能测试');
test('识别耗时应 < 200ms（中等复杂度符文）', () => {
  const complexRune = generateSpiral(200, 200, 3, 150);
  const start = performance.now();
  const result = recognizeRune(complexRune);
  const elapsed = performance.now() - start;
  assertNotNull(result.element);
  assertTrue(elapsed < 200, `识别耗时 ${elapsed.toFixed(0)}ms < 200ms`);
});

test('识别耗时应 < 200ms（大量点）', () => {
  const manyPoints: Point[] = [];
  for (let i = 0; i < 500; i++) {
    const t = i / 500;
    manyPoints.push({
      x: 200 + Math.cos(t * Math.PI * 10) * (50 + t * 50),
      y: 200 + Math.sin(t * Math.PI * 10) * (50 + t * 50)
    });
  }
  const start = performance.now();
  recognizeRune(manyPoints);
  const elapsed = performance.now() - start;
  assertTrue(elapsed < 200, `500点识别耗时 ${elapsed.toFixed(0)}ms < 200ms`);
});

console.log('\n📌 特征提取验证');
test('圆形闭合度高', () => {
  const circle = generateCircle(200, 200, 100, 60);
  const result = recognizeRune(circle);
  assertTrue(result.features.closedness > 0.5, `闭合度 ${result.features.closedness} > 0.5`);
});

test('波浪线波浪度高', () => {
  const wavy = generateWavyLine(50, 200, 300, 40, 80);
  const result = recognizeRune(wavy);
  assertTrue(result.features.waviness > 0.3, `波浪度 ${result.features.waviness} > 0.3`);
});

test('螺旋旋转数高', () => {
  const spiral = generateSpiral(200, 200, 3, 100);
  const result = recognizeRune(spiral);
  assertTrue(result.features.rotations > 1.5, `旋转数 ${result.features.rotations} > 1.5`);
  assertTrue(result.features.spiralness > 0.4, `螺旋度 ${result.features.spiralness} > 0.4`);
});

console.log('\n' + '='.repeat(60));
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const totalTime = results.reduce((s, r) => s + r.duration, 0);
console.log(`测试结果: 通过 ${passed}/${results.length}, 失败 ${failed}, 总耗时 ${totalTime.toFixed(1)}ms`);
console.log('='.repeat(60) + '\n');

if (failed > 0) {
  console.log('失败用例详情:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
}
