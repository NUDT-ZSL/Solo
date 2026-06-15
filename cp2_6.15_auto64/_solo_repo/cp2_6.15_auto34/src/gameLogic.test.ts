import { checkSphereCollision, v3, getParticleRenderState } from './gameLogic';
import type { Vector3, Particle } from './gameLogic';

function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`✓ ${msg}`);
    } else {
      failed++;
      console.error(`✗ ${msg}`);
    }
  }

  function approxEqual(a: number, b: number, epsilon = 0.0001): boolean {
    return Math.abs(a - b) < epsilon;
  }

  console.log('\n=== 碰撞检测单元测试 ===\n');

  const p0: Vector3 = { x: 0, y: 0, z: 0 };

  console.log('1. 基础重叠测试:');
  assert(
    checkSphereCollision(p0, 1, { x: 0, y: 0, z: 0 }, 1) === true,
    '两个球心重合的球体(半径各1)应碰撞',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 0, y: 0, z: 0 }, 0.5) === true,
    '小球完全在大球内部应碰撞',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 1.5, y: 0, z: 0 }, 1) === true,
    '球心距1.5小于半径和2应碰撞',
  );

  console.log('\n2. 刚好接触与分离测试:');
  assert(
    checkSphereCollision(p0, 1, { x: 2, y: 0, z: 0 }, 1) === false,
    '球心距等于半径和时(=2)不应碰撞(严格小于)',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 1.99, y: 0, z: 0 }, 1) === true,
    '球心距略小于半径和(1.99)应碰撞',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 2.01, y: 0, z: 0 }, 1) === false,
    '球心距略大于半径和(2.01)不应碰撞',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 10, y: 0, z: 0 }, 1) === false,
    '相距很远的球体不应碰撞',
  );

  console.log('\n3. 三维空间各轴测试:');
  assert(
    checkSphereCollision(p0, 1, { x: 0, y: 1.5, z: 0 }, 1) === true,
    'Y轴方向靠近应碰撞',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 0, y: 0, z: 1.5 }, 1) === true,
    'Z轴方向靠近应碰撞',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 0, y: 3, z: 0 }, 1) === false,
    'Y轴方向远离不应碰撞',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 1, y: 1, z: 1 }, 1) === true,
    '对角线方向(√3≈1.73<2)应碰撞',
  );
  assert(
    checkSphereCollision(p0, 1, { x: 2, y: 2, z: 0 }, 1) === false,
    '对角线方向(√8≈2.83>2)不应碰撞',
  );

  console.log('\n4. 相切边界测试:');
  assert(
    checkSphereCollision(p0, 2, { x: 5, y: 0, z: 0 }, 3) === false,
    '两球外切(距离=5=2+3)严格小于不成立，不算碰撞(只算重叠区域)',
  );
  assert(
    checkSphereCollision(p0, 5, { x: 2, y: 0, z: 0 }, 3) === true,
    '两球内切(距离=2，r1+r2=8，2<8)球体重叠，应碰撞',
  );
  assert(
    checkSphereCollision(p0, 5, { x: 1.99, y: 0, z: 0 }, 3) === true,
    '小球接近内切(距离1.99<8)，球体重叠，应碰撞',
  );
  assert(
    checkSphereCollision(p0, 2, { x: 4.99, y: 0, z: 0 }, 3) === true,
    '两球接近外切(距离4.99<5)，球体重叠，应碰撞',
  );
  assert(
    checkSphereCollision(p0, 2, { x: 5.01, y: 0, z: 0 }, 3) === false,
    '两球刚分离(距离5.01>半径和5)，不碰撞',
  );
  assert(
    checkSphereCollision(p0, 5, { x: 2.01, y: 0, z: 0 }, 3) === true,
    '小球部分在大球外(距离2.01<8)，两球仍重叠，应碰撞',
  );
  assert(
    checkSphereCollision(p0, 5, { x: 8.1, y: 0, z: 0 }, 3) === false,
    '小球完全分离(距离8.1>8)，不碰撞',
  );

  console.log('\n5. 包含场景测试:');
  assert(
    checkSphereCollision(p0, 5, { x: 0, y: 0, z: 0 }, 2) === true,
    '小球在大球中心，完全包含应碰撞',
  );
  assert(
    checkSphereCollision(p0, 10, { x: 3, y: 4, z: 0 }, 2) === true,
    '小球距中心5，大球半径10，小球半径2，5+2=7<10，完全包含应碰撞',
  );
  assert(
    checkSphereCollision(p0, 10, { x: 8, y: 0, z: 0 }, 1.5) === true,
    '小球距中心8，大球半径10，小球半径1.5，8+1.5=9.5<10，包含应碰撞',
  );
  assert(
    checkSphereCollision(p0, 5, { x: 9, y: 0, z: 0 }, 3) === false,
    '小球距中心9，大球半径5，小球半径3，9>5+3=8，分离不碰撞',
  );

  console.log('\n6. 零半径/极小值边界测试:');
  assert(
    checkSphereCollision(p0, 0, p0, 0) === false,
    '两个半径为0的球心重合点不应碰撞',
  );
  assert(
    checkSphereCollision(p0, 0.001, { x: 0.001, y: 0, z: 0 }, 0.001) === true,
    '极小半径和距离(0.001<0.002)应碰撞',
  );
  assert(
    checkSphereCollision({ x: 100, y: 100, z: 100 }, 5, { x: 100, y: 100, z: 110 }, 5) === false,
    '大坐标精确测试: 距离10等于半径和(5+5)，严格小于不成立，不碰撞',
  );
  assert(
    checkSphereCollision({ x: 100, y: 100, z: 100 }, 5, { x: 100, y: 100, z: 109 }, 5) === true,
    '大坐标精确测试: 距离9小于半径和10，应碰撞',
  );
  assert(
    checkSphereCollision({ x: 100, y: 100, z: 100 }, 5, { x: 100, y: 100, z: 105 }, 5) === true,
    '大坐标精确测试: 距离5小于半径和10，球体重叠，应碰撞',
  );

  console.log('\n5. 向量辅助函数测试:');
  assert(approxEqual(v3.length({ x: 3, y: 4, z: 0 }), 5), 'v3.length 对3-4-5三角形应返回5');
  assert(approxEqual(v3.length({ x: 0, y: 0, z: 0 }), 0), 'v3.length 零向量应返回0');
  assert(approxEqual(v3.distSq(p0, { x: 3, y: 4, z: 0 }), 25), 'v3.distSq 应返回25');

  const n = v3.normalize({ x: 3, y: 0, z: 0 });
  assert(approxEqual(n.x, 1) && approxEqual(n.y, 0) && approxEqual(n.z, 0), 'v3.normalize X轴单位化正确');

  const add = v3.add({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
  assert(add.x === 5 && add.y === 7 && add.z === 9, 'v3.add 计算正确');

  const sub = v3.sub({ x: 5, y: 5, z: 5 }, { x: 2, y: 3, z: 1 });
  assert(sub.x === 3 && sub.y === 2 && sub.z === 4, 'v3.sub 计算正确');

  const scl = v3.scale({ x: 1, y: 2, z: 3 }, 2);
  assert(scl.x === 2 && scl.y === 4 && scl.z === 6, 'v3.scale 计算正确');

  console.log('\n6. 粒子渲染状态测试:');
  const testParticle: Particle = {
    id: 'test',
    active: true,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    life: 0.5,
    maxLife: 1,
    startColor: '#ff4400',
    endColor: '#ffaa00',
    startSize: 4,
    endSize: 0,
    type: 'explosion',
  };

  const stateHalf = getParticleRenderState({ ...testParticle, life: 0.5, maxLife: 1 });
  assert(approxEqual(stateHalf.size, 2, 0.01), '生命中期(0.5/1)粒子大小应约为2');

  const stateStart = getParticleRenderState({ ...testParticle, life: 1, maxLife: 1 });
  assert(approxEqual(stateStart.size, 4, 0.01), '生命开始(1/1)粒子大小应为4');
  assert(stateStart.color.toLowerCase() === '#ff4400', '生命开始颜色应为#ff4400');

  const stateEnd = getParticleRenderState({ ...testParticle, life: 0.001, maxLife: 1 });
  assert(stateEnd.size < 0.05, '生命接近结束粒子大小应接近0');
  assert(stateEnd.color.toLowerCase().startsWith('#ffa'), '生命结束颜色应接近#ffaa00');

  console.log(`\n=== 测试结果: 通过 ${passed} / ${passed + failed} ===\n`);
  return failed === 0;
}

if (typeof window !== 'undefined') {
  (window as any).__runGameLogicTests = runTests;
}

export { runTests };
