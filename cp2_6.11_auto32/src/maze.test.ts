import { Maze } from './maze';

function runTests() {
  console.log('=== 迷宫算法验证测试 ===\n');

  const testSizes = [5, 10, 20];
  const testRounds = 10;

  for (const size of testSizes) {
    console.log(`测试 ${size}x${size} 迷宫:`);
    let totalGenTime = 0;
    let allConnected = true;

    for (let i = 0; i < testRounds; i++) {
      const start = performance.now();
      const maze = new Maze(size, size);
      const end = performance.now();
      totalGenTime += end - start;

      if (!maze.verifyConnectivity()) {
        allConnected = false;
        console.log(`  第 ${i + 1} 轮: 连通性验证失败!`);
      }
    }

    const avgTime = totalGenTime / testRounds;
    console.log(`  平均生成时间: ${avgTime.toFixed(3)}ms`);
    console.log(`  连通性: ${allConnected ? '全部通过 ✓' : '存在失败 ✗'}`);
    console.log(`  20x20 生成时间 < 500ms: ${size === 20 ? (avgTime < 500 ? '✓ 通过' : '✗ 超时') : 'N/A'}`);
    console.log('');
  }

  console.log('=== 碰撞检测测试 ===\n');
  const maze = new Maze(10, 10);
  const start = maze.getStartPosition();
  console.log(`起始位置: (${start.x.toFixed(2)}, ${start.z.toFixed(2)})`);
  console.log(`起始位置是墙? ${maze.isWall(start.x, start.z) ? '是 ✗' : '否 ✓'}`);

  const wallX = start.x;
  const wallZ = start.z - 0.6;
  console.log(`上方边界 (${wallX.toFixed(2)}, ${wallZ.toFixed(2)}) 是墙? ${maze.isWall(wallX, wallZ) ? '是 ✓' : '否 ✗'}`);

  console.log('\n=== 测试完成 ===');
}

if (typeof window !== 'undefined') {
  (window as any).runMazeTests = runTests;
} else {
  runTests();
}

export { runTests };
