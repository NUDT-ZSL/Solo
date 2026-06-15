import { CollisionSystem } from './CollisionSystem';

interface Collidable {
  id: string;
  x: number;
  y: number;
  radius: number;
}

function benchmark() {
  const collisionSystem = new CollisionSystem(40);

  const playerBullets: Collidable[] = [];
  const enemies: Collidable[] = [];
  const enemyBullets: Collidable[] = [];
  const player: Collidable = { id: 'player', x: 100, y: 300, radius: 12 };

  for (let i = 0; i < 200; i++) {
    playerBullets.push({
      id: `pb_${i}`,
      x: Math.random() * 800,
      y: Math.random() * 600,
      radius: 3
    });
  }

  for (let i = 0; i < 20; i++) {
    enemies.push({
      id: `e_${i}`,
      x: Math.random() * 800,
      y: Math.random() * 600,
      radius: 20 + Math.random() * 20
    });
  }

  for (let i = 0; i < 200; i++) {
    enemyBullets.push({
      id: `eb_${i}`,
      x: Math.random() * 800,
      y: Math.random() * 600,
      radius: 4
    });
  }

  const iterations = 1000;
  let totalTime = 0;
  let totalEvents = 0;

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < playerBullets.length; i++) {
      playerBullets[i].x += (Math.random() - 0.5) * 10;
      playerBullets[i].y += (Math.random() - 0.5) * 10;
    }
    for (let i = 0; i < enemyBullets.length; i++) {
      enemyBullets[i].x += (Math.random() - 0.5) * 10;
      enemyBullets[i].y += (Math.random() - 0.5) * 10;
    }
    player.x += (Math.random() - 0.5) * 5;
    player.y += (Math.random() - 0.5) * 5;

    const start = performance.now();
    const events = collisionSystem.checkCollisions(playerBullets, enemies, enemyBullets, player);
    const end = performance.now();

    totalTime += end - start;
    totalEvents += events.length;
  }

  const avgTime = totalTime / iterations;
  const avgEvents = totalEvents / iterations;
  const fps = 1000 / avgTime;

  console.log('=== 碰撞检测性能基准测试 ===');
  console.log(`玩家子弹: ${playerBullets.length} 颗`);
  console.log(`敌人: ${enemies.length} 个`);
  console.log(`敌人子弹: ${enemyBullets.length} 颗`);
  console.log(`总对象数: ${playerBullets.length + enemies.length + enemyBullets.length + 1}`);
  console.log(`迭代次数: ${iterations}`);
  console.log(`平均耗时: ${avgTime.toFixed(4)}ms`);
  console.log(`平均碰撞事件: ${avgEvents.toFixed(2)}`);
  console.log(`理论 FPS: ${fps.toFixed(0)}`);
  console.log(`30FPS 预算: ${(1000/30).toFixed(2)}ms`);
  console.log(`是否达标: ${avgTime < 1000/30 ? '✓ 是' : '✗ 否'}`);
  console.log('============================');
}

benchmark();
