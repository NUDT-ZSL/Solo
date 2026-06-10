import { Game, Player, INITIAL_PIECES_PER_PLAYER } from './game';
import { Renderer } from './renderer';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const roundDisplay = document.getElementById('round-display') as HTMLDivElement;
const p1Score = document.getElementById('p1-score') as HTMLSpanElement;
const p1Remaining = document.getElementById('p1-remaining') as HTMLSpanElement;
const p2Score = document.getElementById('p2-score') as HTMLSpanElement;
const p2Remaining = document.getElementById('p2-remaining') as HTMLSpanElement;
const player1Row = document.getElementById('player1-row') as HTMLDivElement;
const player2Row = document.getElementById('player2-row') as HTMLDivElement;
const gameStatus = document.getElementById('game-status') as HTMLDivElement;

if (!canvas) throw new Error('Canvas element not found');

const game = new Game();
const renderer = new Renderer(canvas, game);

let lastTime = performance.now();
let animationId: number | null = null;
let fpsDisplayInterval: number | null = null;

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;
let frameCount = 0;
let fpsUpdateTime = performance.now();
let currentFps = 60;

let showPerformanceMetrics = false;

function updateUI(): void {
  const state = game.getState();

  roundDisplay.textContent = state.round.toString();
  p1Score.textContent = state.scores[Player.PLAYER1].toString();
  p1Remaining.textContent = state.remainingPieces[Player.PLAYER1].toString();
  p2Score.textContent = state.scores[Player.PLAYER2].toString();
  p2Remaining.textContent = state.remainingPieces[Player.PLAYER2].toString();

  if (state.currentPlayer === Player.PLAYER1) {
    player1Row.classList.add('active');
    player2Row.classList.remove('active');
  } else {
    player1Row.classList.remove('active');
    player2Row.classList.add('active');
  }

  if (!state.isStarted) {
    gameStatus.textContent = '点击「开始游戏」开始对战';
    gameStatus.classList.remove('winner');
  } else if (state.isGameOver) {
    gameStatus.classList.add('winner');
    if (state.winner === Player.PLAYER1) {
      gameStatus.textContent = '🎉 蓝色浪花 获胜！';
    } else if (state.winner === Player.PLAYER2) {
      gameStatus.textContent = '🎉 金色漩涡 获胜！';
    } else {
      gameStatus.textContent = '🤝 平局！';
    }
  } else if (state.isAnimating) {
    gameStatus.textContent = '⏳ 潮汐涌动中...';
    gameStatus.classList.remove('winner');
  } else {
    const playerName = state.currentPlayer === Player.PLAYER1 ? '蓝色浪花' : '金色漩涡';
    gameStatus.textContent = `${playerName} 的回合`;
    gameStatus.classList.remove('winner');
  }

  if (showPerformanceMetrics) {
    const metrics = game.getPerformanceMetrics();
    const perfInfo = ` | FPS: ${currentFps} | 逻辑: ${metrics.logicResponseTime.toFixed(1)}ms | 最大: ${metrics.maxLogicTime.toFixed(1)}ms`;
    gameStatus.textContent += perfInfo;
  }
}

function gameLoop(currentTime: number): void {
  const deltaTime = currentTime - lastTime;

  if (deltaTime >= FRAME_DURATION * 0.8) {
    lastTime = currentTime;

    frameCount++;
    if (currentTime - fpsUpdateTime >= 1000) {
      currentFps = frameCount;
      frameCount = 0;
      fpsUpdateTime = currentTime;
    }

    game.update(deltaTime, currentTime);
    renderer.render();
    updateUI();
  }

  animationId = requestAnimationFrame(gameLoop);
}

function handleCanvasClick(e: MouseEvent): void {
  const cell = renderer.screenToBoard(e.clientX, e.clientY);
  if (!cell) return;

  const state = game.getState();
  if (!state.isStarted || state.isGameOver) return;

  const targetCell = game.getCellAt(cell.x, cell.y);
  if (!targetCell || targetCell.piece !== Player.NONE) return;
  if (state.isAnimating) {
    console.log('Animation in progress, please wait...');
    return;
  }

  const startTime = performance.now();
  const success = game.placePiece(cell.x, cell.y);
  const endTime = performance.now();

  if (success) {
    console.log(`Piece placed at (${cell.x}, ${cell.y}), logic took ${(endTime - startTime).toFixed(2)}ms`);
  }

  if (endTime - startTime > 200) {
    console.warn(`Game logic exceeded 200ms: ${(endTime - startTime).toFixed(2)}ms`);
  }
}

function handleCanvasMouseMove(e: MouseEvent): void {
  const cell = renderer.screenToBoard(e.clientX, e.clientY);
  renderer.setHoveredCell(cell);
}

function handleCanvasMouseLeave(): void {
  renderer.setHoveredCell(null);
}

function handleStart(): void {
  const state = game.getState();
  if (state.isStarted && !state.isGameOver) return;
  if (state.isGameOver) {
    game.reset();
  }
  game.start();
  console.log(`Game started! Initial pieces per player: ${INITIAL_PIECES_PER_PLAYER}`);
  console.log(`Attack rules: ${game.getAttackBonusDescription()}`);
}

function handleReset(): void {
  game.reset();
  console.log('Game reset');
}

function runPerformanceTest(): { avgLogicTime: number; maxLogicTime: number; testCount: number } | void {
  console.log('\n=== 性能测试开始 ===');
  console.log(`目标帧率: ${TARGET_FPS}fps (${FRAME_DURATION.toFixed(1)}ms/frame)`);
  console.log(`攻击判定规则: ${game.getAttackBonusDescription()}`);

  const testStartTime = performance.now();
  let totalLogicTime = 0;
  let maxLogicTime = 0;
  let testCount = 0;

  for (let i = 0; i < 100; i++) {
    const x = i % 6;
    const y = Math.floor(i / 6) % 6;

    if (game.getCellAt(x, y)?.piece === Player.NONE) {
      const startTime = performance.now();
      game.placePiece(x, y);
      const elapsed = performance.now() - startTime;

      totalLogicTime += elapsed;
      maxLogicTime = Math.max(maxLogicTime, elapsed);
      testCount++;

      if (elapsed > 200) {
        console.warn(`测试 ${i}: 逻辑时间 ${elapsed.toFixed(2)}ms 超过阈值!`);
      }
    }
  }

  const testEndTime = performance.now();
  const avgLogicTime = totalLogicTime / testCount;

  console.log(`\n测试结果:`);
  console.log(`  总测试次数: ${testCount}`);
  console.log(`  总耗时: ${(testEndTime - testStartTime).toFixed(2)}ms`);
  console.log(`  平均逻辑时间: ${avgLogicTime.toFixed(3)}ms`);
  console.log(`  最大逻辑时间: ${maxLogicTime.toFixed(3)}ms`);
  console.log(`  目标阈值: 200ms`);
  console.log(`  性能评级: ${avgLogicTime < 50 ? '优秀' : avgLogicTime < 100 ? '良好' : avgLogicTime < 200 ? '合格' : '不合格'}`);
  console.log('=== 性能测试结束 ===\n');

  return { avgLogicTime, maxLogicTime, testCount };
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('mousemove', handleCanvasMouseMove);
canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
startBtn.addEventListener('click', handleStart);
resetBtn.addEventListener('click', handleReset);

canvas.addEventListener('touchstart', (e: TouchEvent) => {
  e.preventDefault();
  const touch = e.touches[0];
  const cell = renderer.screenToBoard(touch.clientX, touch.clientY);
  if (cell) {
    const state = game.getState();
    if (state.isStarted && !state.isGameOver && !state.isAnimating) {
      const targetCell = game.getCellAt(cell.x, cell.y);
      if (targetCell && targetCell.piece === Player.NONE) {
        game.placePiece(cell.x, cell.y);
      }
    }
  }
}, { passive: false });

document.addEventListener('keydown', (e) => {
  if (e.key === 'p' && e.ctrlKey) {
    e.preventDefault();
    showPerformanceMetrics = !showPerformanceMetrics;
    console.log(`Performance metrics: ${showPerformanceMetrics ? 'ON' : 'OFF'}`);
  }
  if (e.key === 't' && e.ctrlKey) {
    e.preventDefault();
    game.reset();
    game.start();
    runPerformanceTest();
    game.reset();
  }
});

updateUI();
animationId = requestAnimationFrame(gameLoop);

fpsDisplayInterval = window.setInterval(() => {
  if (showPerformanceMetrics) {
    console.log(`FPS: ${currentFps} | Cell Size: ${renderer.getCellSize()}px | Layout: ${renderer.getLayout()}`);
  }
}, 2000);

if (animationId) {
  window.addEventListener('beforeunload', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    if (fpsDisplayInterval) {
      clearInterval(fpsDisplayInterval);
    }
  });
}

console.log('%c🌊 潮汐棋盘 已加载', 'color: #3A7CA5; font-size: 16px; font-weight: bold;');
console.log('%c快捷键: Ctrl+P 切换性能显示 | Ctrl+T 运行性能测试', 'color: #666; font-size: 12px;');
console.log(`初始棋子数: 每位玩家 ${INITIAL_PIECES_PER_PLAYER} 枚`);
console.log(`格子尺寸: ${renderer.getCellSize()}px, 布局: ${renderer.getLayout()}`);
