import { ParticleEngine, Starfield } from '../src/particleEngine';
import { ElementType } from '../src/runeRecognizer';

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

function assertTrue(v: boolean, msg?: string): void {
  if (!v) throw new Error(msg || 'Expected true');
}

console.log('\n' + '='.repeat(60));
console.log('符咒工坊 - 粒子引擎测试套件');
console.log('='.repeat(60));

console.log('\n📌 基础功能测试');
test('引擎初始化正常', () => {
  const engine = new ParticleEngine({ maxParticles: 100 });
  assertEqual(engine.getParticleCount(), 0);
});

test('maxParticles 限制生效', () => {
  const engine = new ParticleEngine({ maxParticles: 20 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  engine.spawnElementParticles('fire', 400, 300, 50, false);
  assertTrue(engine.getParticleCount() <= 20, `粒子数 ${engine.getParticleCount()} <= 20`);
});

test('单元素粒子生成', () => {
  const engine = new ParticleEngine({ maxParticles: 500 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  const elements: ElementType[] = ['fire', 'thunder', 'wind', 'earth'];
  for (const e of elements) {
    engine.clear();
    engine.spawnElementParticles(e, 400, 300, 50, false);
    assertEqual(engine.getParticleCount(), 50);
  }
});

test('组合粒子翻倍生成', () => {
  const engine = new ParticleEngine({ maxParticles: 500 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  engine.spawnComboParticles(['fire', 'wind'], 'fire-wind', 400, 300);
  assertTrue(engine.getParticleCount() >= 150, `组合粒子数 ${engine.getParticleCount()} >= 150`);
});

test('clear() 清空所有粒子', () => {
  const engine = new ParticleEngine({ maxParticles: 500 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  engine.spawnElementParticles('fire', 400, 300, 100, false);
  engine.clear();
  assertEqual(engine.getParticleCount(), 0);
});

console.log('\n📌 粒子更新测试');
test('update() 正常推进粒子生命周期', () => {
  const engine = new ParticleEngine({ maxParticles: 500 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  engine.spawnElementParticles('fire', 400, 300, 50, false);
  const initialCount = engine.getParticleCount();

  for (let i = 0; i < 600; i++) {
    engine.update(1 / 60);
  }
  assertTrue(engine.getParticleCount() < initialCount, `粒子数应减少: ${initialCount} -> ${engine.getParticleCount()}`);
});

test('FPS监控正常工作', () => {
  const engine = new ParticleEngine({ maxParticles: 100 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  for (let i = 0; i < 10; i++) {
    engine.update(1 / 60);
  }
  const fps = engine.getFps();
  assertTrue(fps > 0, `FPS ${fps} > 0`);
});

console.log('\n📌 性能测试（目标：500粒子60FPS）');
test('500粒子 update() 单帧 < 16ms', () => {
  const engine = new ParticleEngine({ maxParticles: 500 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  engine.spawnElementParticles('fire', 400, 300, 200, false);
  engine.spawnElementParticles('wind', 400, 300, 200, false);
  engine.spawnElementParticles('thunder', 400, 300, 100, false);
  assertTrue(engine.getParticleCount() === 500, `粒子数 = 500, 实际 = ${engine.getParticleCount()}`);

  const start = performance.now();
  for (let i = 0; i < 30; i++) {
    engine.update(1 / 60);
  }
  const elapsed = performance.now() - start;
  const avgFrame = elapsed / 30;
  assertTrue(avgFrame < 16, `平均帧耗时 ${avgFrame.toFixed(2)}ms < 16ms`);
});

test('火+风组合粒子 update() 性能', () => {
  const engine = new ParticleEngine({ maxParticles: 500 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  engine.spawnComboParticles(['fire', 'wind'], 'fire-wind', 400, 300);
  engine.spawnComboParticles(['thunder', 'earth'], 'thunder-earth', 400, 300);

  const start = performance.now();
  for (let i = 0; i < 30; i++) {
    engine.update(1 / 60);
  }
  const elapsed = performance.now() - start;
  const avgFrame = elapsed / 30;
  assertTrue(avgFrame < 16, `组合粒子平均帧耗时 ${avgFrame.toFixed(2)}ms < 16ms`);
});

console.log('\n📌 Starfield 星空背景测试');
test('星空初始化', () => {
  const sf = new Starfield(100);
  sf.resize(800, 600);
  sf.update(1 / 60);
  assertTrue(true, '无报错');
});

test('星空多帧更新无异常', () => {
  const sf = new Starfield(100);
  sf.resize(800, 600);
  for (let i = 0; i < 60; i++) {
    sf.update(1 / 60);
  }
  assertTrue(true, '多帧更新正常');
});

console.log('\n📌 LOD机制测试');
test('不同距离粒子LOD分级不报错', () => {
  const engine = new ParticleEngine({ maxParticles: 200 });
  engine.setCenter(400, 300);
  engine.setFocusPoint(400, 300);
  engine.spawnElementParticles('fire', 400, 300, 100, false);
  for (let i = 0; i < 30; i++) {
    engine.update(1 / 60);
  }
  assertTrue(true, 'LOD分级无异常');
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
