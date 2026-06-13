import { generateMaze } from '../src/utils/mazeGenerator';
import { createInitialPlayerState, updatePlayer, getSmoothPosition, InputState } from '../src/utils/gameLogic';

console.log('=== Running Maze Generator Tests ===\n');

console.log('Test 1: Maze generation with 30x30 grid');
const mazeStartTime = performance.now();
const maze = generateMaze(30, 30, { minPaths: 3, minBranches: 3 });
const mazeEndTime = performance.now();
console.log(`  Generated in: ${(mazeEndTime - mazeStartTime).toFixed(2)}ms`);
console.log(`  Dimensions: ${maze.width}x${maze.height}`);
console.log(`  Path count: ${maze.pathCount} (required >= 3): ${maze.pathCount >= 3 ? 'PASS' : 'FAIL'}`);
console.log(`  Branch count: ${maze.branchCount} (required >= 3): ${maze.branchCount >= 3 ? 'PASS' : 'FAIL'}`);
console.log(`  Walls: ${maze.walls.length}, Paths: ${maze.paths.length}`);
console.log(`  Entrance: (${maze.entrance.x}, ${maze.entrance.y})`);
console.log(`  Exit: (${maze.exit.x}, ${maze.exit.y})`);
console.log(`  Items: ${maze.items.length}`);
console.log('');

console.log('Test 2: Multiple maze generations consistency');
let allPass = true;
for (let i = 0; i < 5; i++) {
  const m = generateMaze(30, 30, { minPaths: 3, minBranches: 3 });
  const pass = m.pathCount >= 3 && m.branchCount >= 3;
  console.log(`  Maze ${i + 1}: paths=${m.pathCount}, branches=${m.branchCount} - ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) allPass = false;
}
console.log(`  All mazes pass: ${allPass ? 'PASS' : 'FAIL'}`);
console.log('');

console.log('Test 3: Player movement speed validation');
const player = createInitialPlayerState(maze.entrance.x, maze.entrance.y);
const input: InputState = { up: false, down: false, left: false, right: true };

let testPlayer = { ...player };
let testItems = [...maze.items];
const deltaTime = 1 / 60;
let totalTime = 0;
const startX = testPlayer.x;

console.log(`  Starting position: (${testPlayer.x}, ${testPlayer.y})`);
console.log(`  Target speed: 3 cells/second`);

let movesCompleted = 0;
while (movesCompleted < 3 && totalTime < 1.5) {
  const result = updatePlayer(testPlayer, maze, testItems, input, deltaTime);
  testPlayer = result.player;
  testItems = result.items;
  totalTime += deltaTime;
  
  if (!testPlayer.isMoving && testPlayer.x > startX) {
    movesCompleted++;
    console.log(`  Move ${movesCompleted} complete at ${totalTime.toFixed(3)}s, position: (${testPlayer.x.toFixed(2)}, ${testPlayer.y.toFixed(2)})`);
  }
}

const expectedTime = 1.0;
const speedAccuracy = Math.abs(totalTime - expectedTime) / expectedTime;
console.log(`  Total time for 3 moves: ${totalTime.toFixed(3)}s (expected ~${expectedTime}s)`);
console.log(`  Speed accuracy: ${((1 - speedAccuracy) * 100).toFixed(1)}% - ${speedAccuracy < 0.1 ? 'PASS' : 'FAIL'}`);
console.log('');

console.log('Test 4: Smooth position interpolation');
const movingPlayer = {
  ...player,
  isMoving: true,
  targetX: player.x + 1,
  targetY: player.y,
  moveProgress: 0.5
};
const smoothPos = getSmoothPosition(movingPlayer);
console.log(`  At 50% progress: (${smoothPos.x.toFixed(3)}, ${smoothPos.y.toFixed(3)})`);
console.log(`  Expected ~(${player.x + 0.5}, ${player.y}) - ${Math.abs(smoothPos.x - (player.x + 0.5)) < 0.1 ? 'PASS' : 'FAIL'}`);
console.log('');

console.log('Test 5: Wall collision detection');
const wallTestInput: InputState = { up: false, down: true, left: false, right: false };
let wallTestPlayer = createInitialPlayerState(maze.entrance.x, maze.entrance.y);
let initialY = wallTestPlayer.y;

for (let i = 0; i < 100; i++) {
  const result = updatePlayer(wallTestPlayer, maze, testItems, wallTestInput, deltaTime);
  wallTestPlayer = result.player;
  testItems = result.items;
}

console.log(`  Tried to move down from y=${initialY}, final y=${wallTestPlayer.y}`);
const canMoveDown = wallTestPlayer.y > initialY;
const isWallBelow = maze.grid[initialY + 1]?.[maze.entrance.x]?.type === 'wall';
if (isWallBelow) {
  console.log(`  Wall below, player blocked: ${!canMoveDown ? 'PASS' : 'FAIL'}`);
} else {
  console.log(`  No wall below, player moved: ${canMoveDown ? 'PASS' : 'FAIL'}`);
}
console.log('');

const overallPass = maze.pathCount >= 3 && maze.branchCount >= 3 && allPass && speedAccuracy < 0.1;
console.log(`=== Overall Result: ${overallPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} ===`);

export {};
