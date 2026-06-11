import { createInitialGameData, GameData, updateGame, resetGame } from './game';
import { createRenderContext, resizeCanvas, render, RenderContext } from './renderer';
import { 
  createKeyState, 
  handleKeyDown, 
  handleKeyUp, 
  clearJustPressed,
  handlePlayerInput,
  handleMouseMove,
  handleMouseClick,
  KeyState
} from './player';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;

const gameData: GameData = createInitialGameData();
const renderCtx: RenderContext = createRenderContext(canvas);
const keyState: KeyState = createKeyState();

let lastTime = 0;

let memoryCheckTime = 0;
const MEMORY_CHECK_INTERVAL = 60000;
let initialMemory = 0;
let memoryWarnings = 0;

function init(): void {
  resize();
  setupEventListeners();
  
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
  }, 500);
  
  lastTime = performance.now();
  gameLoop(lastTime);
}

function resize(): void {
  const container = document.getElementById('game-container');
  if (container) {
    resizeCanvas(renderCtx, container.clientWidth, container.clientHeight);
  } else {
    resizeCanvas(renderCtx, window.innerWidth, window.innerHeight);
  }
}

function setupEventListeners(): void {
  window.addEventListener('resize', resize);
  
  window.addEventListener('keydown', (e) => {
    handleKeyDown(keyState, e.key);
    
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
        e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
    }
    
    handleGlobalKeys(e.key.toLowerCase());
  });
  
  window.addEventListener('keyup', (e) => {
    handleKeyUp(keyState, e.key);
  });
  
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    handleMouseMove(
      gameData, 
      e.clientX - rect.left, 
      e.clientY - rect.top,
      renderCtx.boardOffset,
      renderCtx.cellSize
    );
  });
  
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    handleMouseClick(
      gameData,
      e.clientX - rect.left,
      e.clientY - rect.top,
      renderCtx.boardOffset,
      renderCtx.cellSize
    );
  });
}

function handleGlobalKeys(key: string): void {
  if (key === ' ') {
    if (gameData.gameState === 'title') {
      gameData.gameState = 'playing';
      resetGame(gameData);
    }
  }
  
  if (key === 'p') {
    if (gameData.gameState === 'playing') {
      gameData.gameState = 'paused';
    } else if (gameData.gameState === 'paused') {
      gameData.gameState = 'playing';
    }
  }
  
  if (key === 'r') {
    if (gameData.gameState === 'playing' || gameData.gameState === 'paused' || gameData.gameState === 'gameover') {
      gameData.gameState = 'restart-confirm';
    }
  }
  
  if (gameData.gameState === 'restart-confirm') {
    if (key === 'y') {
      resetGame(gameData);
    } else if (key === 'n') {
      if (gameData.winner) {
        gameData.gameState = 'gameover';
      } else {
        gameData.gameState = 'playing';
      }
    }
  }
}

function gameLoop(currentTime: number): void {
  const deltaTime = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;
  
  renderCtx.time = currentTime / 1000;
  
  updateGame(gameData, deltaTime);
  
  if (gameData.gameState === 'playing') {
    handlePlayerInput(gameData, keyState, gameData.currentPlayer);
  }
  
  clearJustPressed(keyState);
  
  render(renderCtx, gameData);
  
  checkMemoryLeak(currentTime);
  
  requestAnimationFrame(gameLoop);
}

function checkMemoryLeak(currentTime: number): void {
  if (currentTime - memoryCheckTime > MEMORY_CHECK_INTERVAL) {
    memoryCheckTime = currentTime;
    
    const particleCount = gameData.particles.length;
    const trailCount = gameData.trails.size;
    const pieceCount = gameData.pieces.length;
    
    if (initialMemory === 0) {
      initialMemory = particleCount + trailCount + pieceCount;
    } else {
      const currentMemory = particleCount + trailCount + pieceCount;
      const growth = (currentMemory - initialMemory) / initialMemory;
      
      if (growth > 0.05) {
        memoryWarnings++;
        console.warn(`[Memory Warning] Memory growth detected: ${(growth * 100).toFixed(2)}%`);
      }
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export {};
