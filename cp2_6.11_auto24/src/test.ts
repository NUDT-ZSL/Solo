import {
  ParticlePool, samplePalette, hexToRgb, luminance,
  STRIDE, F_BASE_X, F_BASE_Y, F_X, F_Y, F_VX, F_VY,
  F_COLOR_R, F_COLOR_G, F_COLOR_B,
  F_BASE_COLOR_T, F_COLOR_OFFSET, F_ALPHA, F_SIZE, F_PHASE,
  F_RETURN_SX, F_RETURN_SY, F_BURST_TX, F_BURST_TY,
  F_FLASH_TIMER, F_STATE_TIMER,
  FLAG_STRIDE, FL_ACTIVE, FL_STATE, FL_IS_WARM,
  STATE_IDLE, STATE_BURSTING, STATE_RETURNING,
  POOL_SIZE
} from './particle.js';
import { Loom } from './loom.js';

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`✅ PASS: ${msg}`);
}

function testPoolAcquireRelease(): void {
  console.group('🧪 粒子对象池测试');
  const pool = new ParticlePool(100);
  assert(pool.activeCount() === 0, '初始活跃粒子应为0');
  assert(pool.size === 100, '池大小应为100');

  const idx1 = pool.acquire();
  assert(idx1 >= 0, 'acquire应返回有效索引');
  assert(pool.activeCount() === 1, 'acquire后活跃粒子应为1');
  const fb = idx1 * FLAG_STRIDE;
  assert(pool.flags[fb + FL_ACTIVE] === 1, 'acquire后active标志应为1');

  const indices: number[] = [idx1];
  for (let i = 1; i < 100; i++) {
    const idx = pool.acquire();
    assert(idx >= 0, `第${i + 1}次acquire应成功`);
    indices.push(idx);
  }
  assert(pool.activeCount() === 100, '100次acquire后活跃粒子应为100');

  const idxFail = pool.acquire();
  assert(idxFail === -1, '池满后acquire应返回-1');

  pool.release(indices[0]);
  assert(pool.activeCount() === 99, 'release后活跃粒子应为99');
  assert(pool.flags[indices[0] * FLAG_STRIDE + FL_ACTIVE] === 0, 'release后active标志应为0');

  const idxReused = pool.acquire();
  assert(idxReused === indices[0], 'release后acquire应复用刚释放的索引');
  assert(pool.activeCount() === 100, '复用后活跃粒子恢复为100');

  pool.release(indices[0]);
  pool.release(indices[1]);
  pool.release(indices[2]);
  assert(pool.activeCount() === 97, '释放3个后活跃粒子应为97');

  pool.reset();
  assert(pool.activeCount() === 0, 'reset后活跃粒子应为0');
  console.groupEnd();
}

function testBurstReuse(): void {
  console.group('🧪 爆裂粒子复用测试');
  const loom = new Loom();
  loom.setViewport(800, 600);
  loom.initParticles(2000);

  const countBefore = loom.pool.activeCount();
  console.log(`爆裂前活跃粒子: ${countBefore}`);

  loom.burstAt(loom.getWidth() / 2, loom.getHeight() / 2);
  const countAfterBurst = loom.pool.activeCount();
  console.log(`爆裂后活跃粒子: ${countAfterBurst}`);
  assert(countAfterBurst > countBefore, '爆裂后活跃粒子数应增加（幽灵粒子复用闲置槽位）');

  for (let i = 0; i < 200; i++) {
    loom.update(1 / 60);
  }
  const countAfterReturn = loom.pool.activeCount();
  console.log(`回归后活跃粒子: ${countAfterReturn}`);
  assert(countAfterReturn <= countBefore + 5, '幽灵粒子回归后应被release回收');

  console.log(`验证: 爆裂未创建新对象，复用池中闲置粒子 ✓`);
  console.groupEnd();
}

function testPerformance(): void {
  console.group('🧪 性能测试 (Performance API)');
  const loom = new Loom();
  loom.setViewport(1920, 1080);
  loom.initParticles(2000);

  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;
  const dt = 1 / 60;

  const frames = 300;
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    loom.update(dt);
    loom.render(ctx);
  }
  const t1 = performance.now();
  const avgMs2000 = (t1 - t0) / frames;
  const fps2000 = 1000 / avgMs2000;
  console.log(`2000粒子: 平均帧耗时 ${avgMs2000.toFixed(2)}ms, 约 ${fps2000.toFixed(1)} FPS`);
  assert(fps2000 >= 55, `2000粒子FPS应≥55 (实际${fps2000.toFixed(1)})`);

  loom.burstAt(loom.getWidth() / 2, loom.getHeight() / 2);
  const activeAfterBurst = loom.pool.activeCount();
  console.log(`爆裂后活跃粒子: ${activeAfterBurst}`);

  const t2 = performance.now();
  for (let i = 0; i < frames; i++) {
    loom.update(dt);
    loom.render(ctx);
  }
  const t3 = performance.now();
  const avgMsBurst = (t3 - t2) / frames;
  const fpsBurst = 1000 / avgMsBurst;
  console.log(`爆裂态粒子(${activeAfterBurst}): 平均帧耗时 ${avgMsBurst.toFixed(2)}ms, 约 ${fpsBurst.toFixed(1)} FPS`);
  assert(fpsBurst >= 45, `爆裂态FPS应≥45 (实际${fpsBurst.toFixed(1)})`);

  console.groupEnd();
}

function testTrailLifecycle(): void {
  console.group('🧪 轨迹线生命周期测试');
  const loom = new Loom();
  loom.setViewport(800, 600);
  loom.initParticles(2000);

  loom.addTrailPoint(100, 100);
  loom.addTrailPoint(110, 105);
  loom.addTrailPoint(120, 112);
  assert(loom.trails.length === 3, '添加3个轨迹点后长度应为3');
  assert(loom.trails[0].alpha === 1.0, '新轨迹点alpha应为1.0');
  assert(loom.trails[0].life === 1.0, '新轨迹点life应为1.0');

  for (let i = 0; i < 30; i++) {
    loom.update(1 / 60);
  }
  const after05s = loom.trails.length;
  const avgAlpha05 = loom.trails.reduce((s, t) => s + t.alpha, 0) / loom.trails.length;
  console.log(`0.5秒后: ${after05s}个轨迹点, 平均alpha ${avgAlpha05.toFixed(3)}`);
  assert(avgAlpha05 <= 0.55 && avgAlpha05 >= 0.4, `0.5秒后alpha应约0.5 (实际${avgAlpha05.toFixed(3)})`);

  for (let i = 0; i < 35; i++) {
    loom.update(1 / 60);
  }
  console.log(`1秒后: ${loom.trails.length}个轨迹点`);
  assert(loom.trails.length === 0, '1秒后所有轨迹点应被移除');

  console.groupEnd();
}

function testColorSpeedCycling(): void {
  console.group('🧪 颜色流速循环测试');
  const loom = new Loom();
  loom.setViewport(800, 600);
  loom.initParticles(2000);

  loom.setColorSpeed(0);
  loom.update(0);
  const data = loom.pool.data;
  const fl = loom.pool.flags;
  const tracked0: number[] = [];
  const colors0: Map<number, { r: number; g: number; b: number }> = new Map();
  for (let i = 0; i < loom.pool.size && tracked0.length < 10; i++) {
    const fb = i * FLAG_STRIDE;
    if (!fl[fb + FL_ACTIVE]) continue;
    const db = i * STRIDE;
    tracked0.push(i);
    colors0.set(i, { r: data[db + F_COLOR_R], g: data[db + F_COLOR_G], b: data[db + F_COLOR_B] });
  }

  for (let i = 0; i < 120; i++) {
    loom.update(1 / 60);
  }
  let colorChanged0 = false;
  for (const idx of tracked0) {
    const db = idx * STRIDE;
    const before = colors0.get(idx)!;
    const cr = data[db + F_COLOR_R];
    const cg = data[db + F_COLOR_G];
    if (Math.abs(cr - before.r) > 2 || Math.abs(cg - before.g) > 2) {
      colorChanged0 = true;
      break;
    }
  }
  assert(!colorChanged0, 'colorSpeed=0时2秒后颜色应不变');

  loom.setColorSpeed(5);
  const trackedIdx: number[] = [];
  const colorsBefore: Map<number, { r: number; g: number; b: number }> = new Map();
  for (let i = 0; i < loom.pool.size && trackedIdx.length < 20; i++) {
    const fb = i * FLAG_STRIDE;
    if (!fl[fb + FL_ACTIVE]) continue;
    const db = i * STRIDE;
    trackedIdx.push(i);
    colorsBefore.set(i, { r: data[db + F_COLOR_R], g: data[db + F_COLOR_G], b: data[db + F_COLOR_B] });
  }

  for (let i = 0; i < 120; i++) {
    loom.update(1 / 60);
  }
  let colorChanged5 = false;
  for (const idx of trackedIdx) {
    const db = idx * STRIDE;
    const fb = idx * FLAG_STRIDE;
    if (!fl[fb + FL_ACTIVE]) continue;
    const before = colorsBefore.get(idx)!;
    const cr = data[db + F_COLOR_R];
    const cg = data[db + F_COLOR_G];
    if (Math.abs(cr - before.r) > 5 || Math.abs(cg - before.g) > 5) {
      colorChanged5 = true;
      break;
    }
  }
  assert(colorChanged5, 'colorSpeed=5时2秒后颜色应发生明显变化');

  const warmPalette = [hexToRgb('#FF6B35'), hexToRgb('#FFD700')];
  const c0 = samplePalette(warmPalette, 0);
  const c025 = samplePalette(warmPalette, 0.25);
  const c05 = samplePalette(warmPalette, 0.5);
  const c1 = samplePalette(warmPalette, 1.0);
  assert(Math.abs(c0.r - c1.r) < 1 && Math.abs(c0.g - c1.g) < 1, '色盘索引0和1应返回相同颜色（循环）');
  assert(c025.r !== c0.r || c025.g !== c0.g, '色盘索引0.25应产生中间插值色');
  console.log(`色盘采样验证: t=0 → rgb(${c0.r|0},${c0.g|0},${c0.b|0}), t=0.25 → rgb(${c025.r|0},${c025.g|0},${c025.b|0}), t=0.5 → rgb(${c05.r|0},${c05.g|0},${c05.b|0})`);

  const bright = loom.getBrightestTrailColor();
  console.log(`最亮轨迹色: rgb(${bright.r|0},${bright.g|0},${bright.b|0}), 亮度=${luminance(bright).toFixed(1)}`);
  assert(bright.r === 255 && bright.g === 215, `最亮色应为#FFD700 (实际rgb(${bright.r|0},${bright.g|0},${bright.b|0}))`);

  console.groupEnd();
}

function testStrideContiguity(): void {
  console.group('🧪 结构化TypedArray连续性测试');
  const pool = new ParticlePool(10);
  const idx = pool.acquire();
  const db = idx * STRIDE;
  const fb = idx * FLAG_STRIDE;

  pool.data[db + F_BASE_X] = 100;
  pool.data[db + F_BASE_Y] = 200;
  pool.data[db + F_X] = 110;
  pool.data[db + F_Y] = 210;
  pool.data[db + F_SIZE] = 4;
  pool.data[db + F_PHASE] = 1.57;
  pool.data[db + F_BASE_COLOR_T] = 0.3;
  pool.data[db + F_COLOR_OFFSET] = 5.0;
  pool.data[db + F_COLOR_R] = 255;
  pool.data[db + F_COLOR_G] = 107;
  pool.data[db + F_COLOR_B] = 53;
  pool.flags[fb + FL_IS_WARM] = 1;
  pool.flags[fb + FL_ACTIVE] = 1;
  pool.flags[fb + FL_STATE] = STATE_IDLE;

  assert(pool.data[db + F_BASE_X] === 100, '读取baseX应正确');
  assert(pool.data[db + F_COLOR_R] === 255, '读取colorR应正确');
  assert(pool.flags[fb + FL_IS_WARM] === 1, '读取isWarm应正确');
  assert(pool.flags[fb + FL_STATE] === STATE_IDLE, '读取state应正确');

  const byteOffset = db * 4;
  const particleBytes = STRIDE * 4;
  console.log(`粒子${idx}数据偏移: ${byteOffset}字节, 每粒子占用: ${particleBytes}字节 (${STRIDE}个float)`);
  console.log(`标志偏移: ${fb}字节, 每粒子标志占用: ${FLAG_STRIDE}字节`);
  assert(particleBytes === 80, `每粒子应占80字节 (20×4), 实际${particleBytes}`);

  console.groupEnd();
}

export function runAllTests(): void {
  console.log('%c═══════════════════════════════════════', 'color: #FFD700; font-weight: bold');
  console.log('%c  星尘织机 - 自动化测试套件', 'color: #FFD700; font-weight: bold; font-size: 14px');
  console.log('%c═══════════════════════════════════════', 'color: #FFD700; font-weight: bold');

  try {
    testPoolAcquireRelease();
    testStrideContiguity();
    testBurstReuse();
    testTrailLifecycle();
    testColorSpeedCycling();
    testPerformance();

    console.log('%c═══════════════════════════════════════', 'color: #4ECDC4; font-weight: bold');
    console.log('%c  ✅ 全部测试通过', 'color: #4ECDC4; font-weight: bold; font-size: 14px');
    console.log('%c═══════════════════════════════════════', 'color: #4ECDC4; font-weight: bold');
  } catch (e) {
    console.error('测试中断:', e);
  }
}
