import { CollisionSystem } from './CollisionSystem';

interface Collidable {
  id: string;
  x: number;
  y: number;
  radius: number;
}

function checkCircleCollision(a: Collidable, b: Collidable): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < a.radius + b.radius;
}

function bruteForceCheck(
  playerBullets: Collidable[],
  enemies: Collidable[],
  enemyBullets: Collidable[],
  player: Collidable
): { aId: string; bId: string; aType: string; bType: string }[] {
  const events: { aId: string; bId: string; aType: string; bType: string }[] = [];

  for (const pb of playerBullets) {
    for (const e of enemies) {
      if (checkCircleCollision(pb, e)) {
        events.push({ aId: pb.id, bId: e.id, aType: 'playerBullet', bType: 'enemy' });
      }
    }
  }

  for (const eb of enemyBullets) {
    if (checkCircleCollision(player, eb)) {
      events.push({ aId: player.id, bId: eb.id, aType: 'player', bType: 'enemyBullet' });
    }
  }

  for (const e of enemies) {
    if (checkCircleCollision(player, e)) {
      events.push({ aId: player.id, bId: e.id, aType: 'player', bType: 'enemy' });
    }
  }

  return events;
}

function testCorrectness() {
  console.log('=== 碰撞检测正确性测试 ===\n');

  let allPassed = true;

  function runTest(name: string, playerBullets: Collidable[], enemies: Collidable[], enemyBullets: Collidable[], player: Collidable) {
    const collisionSystem = new CollisionSystem(40);
    const optimized = collisionSystem.checkCollisions(playerBullets, enemies, enemyBullets, player);
    const brute = bruteForceCheck(playerBullets, enemies, enemyBullets, player);

    const optSet = new Set(optimized.map(e => `${e.aType}_${e.aId}_${e.bType}_${e.bId}`));
    const bruteSet = new Set(brute.map(e => `${e.aType}_${e.aId}_${e.bType}_${e.bId}`));

    let missing = 0;
    let extra = 0;

    for (const item of bruteSet) {
      if (!optSet.has(item)) {
        missing++;
      }
    }

    for (const item of optSet) {
      if (!bruteSet.has(item)) {
        extra++;
      }
    }

    const passed = missing === 0 && extra === 0;
    console.log(`测试: ${name}`);
    console.log(`  暴力算法检测到: ${brute.length} 个碰撞`);
    console.log(`  优化算法检测到: ${optimized.length} 个碰撞`);
    console.log(`  漏检: ${missing} 个`);
    console.log(`  误检: ${extra} 个`);
    console.log(`  结果: ${passed ? '✓ 通过' : '✗ 失败'}\n`);

    if (!passed) allPassed = false;
  }

  const player: Collidable = { id: 'player', x: 100, y: 300, radius: 12 };

  runTest(
    '单颗子弹与敌人碰撞',
    [{ id: 'pb1', x: 200, y: 300, radius: 3 }],
    [{ id: 'e1', x: 210, y: 300, radius: 20 }],
    [],
    player
  );

  runTest(
    '单颗子弹与敌人不碰撞',
    [{ id: 'pb1', x: 200, y: 300, radius: 3 }],
    [{ id: 'e1', x: 300, y: 300, radius: 20 }],
    [],
    player
  );

  runTest(
    '玩家与敌人子弹碰撞',
    [],
    [],
    [{ id: 'eb1', x: 105, y: 300, radius: 4 }],
    player
  );

  runTest(
    '玩家与敌人碰撞',
    [],
    [{ id: 'e1', x: 110, y: 300, radius: 20 }],
    [],
    player
  );

  const randomPlayerBullets: Collidable[] = [];
  const randomEnemies: Collidable[] = [];
  const randomEnemyBullets: Collidable[] = [];

  for (let i = 0; i < 50; i++) {
    randomPlayerBullets.push({
      id: `pb_${i}`,
      x: Math.random() * 400,
      y: Math.random() * 400,
      radius: 3
    });
  }
  for (let i = 0; i < 20; i++) {
    randomEnemies.push({
      id: `e_${i}`,
      x: Math.random() * 400,
      y: Math.random() * 400,
      radius: 15 + Math.random() * 25
    });
  }
  for (let i = 0; i < 50; i++) {
    randomEnemyBullets.push({
      id: `eb_${i}`,
      x: Math.random() * 400,
      y: Math.random() * 400,
      radius: 4
    });
  }

  runTest('随机分布对象', randomPlayerBullets, randomEnemies, randomEnemyBullets, player);

  const edgeCasesBullets: Collidable[] = [
    { id: 'pb_boundary1', x: 39.9, y: 200, radius: 3 },
    { id: 'pb_boundary2', x: 40.1, y: 200, radius: 3 },
  ];
  const edgeCasesEnemies: Collidable[] = [
    { id: 'e_boundary1', x: 50, y: 200, radius: 20 },
  ];

  runTest('格子边界对象', edgeCasesBullets, edgeCasesEnemies, [], player);

  const bigObjBullets: Collidable[] = [
    { id: 'pb_big1', x: 100, y: 100, radius: 3 },
  ];
  const bigObjEnemies: Collidable[] = [
    { id: 'e_big1', x: 130, y: 100, radius: 40 },
  ];

  runTest('大对象（boss级别）', bigObjBullets, bigObjEnemies, [], player);

  console.log('============================');
  console.log(`总体结果: ${allPassed ? '✓ 所有测试通过' : '✗ 部分测试失败'}`);

  return allPassed;
}

testCorrectness();
