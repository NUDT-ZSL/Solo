import { createInitialGameData, GameData, updateGame, resetGame, pauseGame, resumeGame } from './game';
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

if (!canvas) {
  throw new Error('Canvas element not found');
}

const gameData: GameData = createInitialGameData();
const renderCtx: RenderContext = createRenderContext(canvas);
const keyState: KeyState = createKeyState();

let lastTime = 0;

let memoryCheckTime = 0;
const MEMORY_CHECK_INTERVAL = 60000;
let initialMemory = 0;
let _memoryWarnings = 0;

function init(): void {
  resize();
  setupEventListeners();
  
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }, 800);
  
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function resize(): void {
  const container = document.getElementById('game-container');
  let width = window.innerWidth;
  let height = window.innerHeight;
  
  if (container) {
    width = container.clientWidth;
    height = container.clientHeight;
  }
  
  width = Math.max(800, width);
  height = Math.max(600, height);
  
  resizeCanvas(renderCtx, width, height);
}

function setupEventListeners(): void {
  window.addEventListener('resize', resize);
  
  window.addEventListener('keydown', (e) => {
    const preventKeys = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (preventKeys.includes(e.key)) {
      e.preventDefault();
    }
    
    handleKeyDown(keyState, e.key);
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
      return;
    }
  }
  
  if (key === 'p') {
    if (gameData.gameState === 'playing') {
      pauseGame(gameData);
    } else if (gameData.gameState === 'paused') {
      resumeGame(gameData);
    }
    return;
  }
  
  if (key === 'r') {
    if (gameData.gameState === 'playing' || gameData.gameState === 'paused' || gameData.gameState === 'gameover') {
      gameData.gameState = 'restart-confirm';
    }
    return;
  }
  
  if (gameData.gameState === 'restart-confirm') {
    if (key === 'y') {
      resetGame(gameData);
    } else if (key === 'n' || key === 'escape') {
      if (gameData.winner) {
        gameData.gameState = 'gameover';
      } else {
        gameData.gameState = 'playing';
      }
    }
    return;
  }
  
  if (key === 'escape') {
    if (gameData.gameState === 'paused') {
      resumeGame(gameData);
    } else if (gameData.gameState === 'playing') {
      pauseGame(gameData);
    }
    return;
  }
}

function gameLoop(currentTime: number): void {
  const deltaTime = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;
  
  renderCtx.time = currentTime / 1000;
  
  updateGame(gameData, deltaTime);
  
  if (gameData.gameState === 'playing') {
    handlePlayerInput(gameData, keyState, 1);
    handlePlayerInput(gameData, keyState, 2);
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
    const rippleCount = gameData.ripples.length;
    const activeParticles = gameData.particlePool.filter(p => p.active).length;
    
    if (initialMemory === 0) {
      initialMemory = particleCount + trailCount + pieceCount + rippleCount + activeParticles;
    } else {
      const currentMemory = particleCount + trailCount + pieceCount + rippleCount + activeParticles;
      const growth = initialMemory > 0 ? (currentMemory - initialMemory) / initialMemory : 0;
      
      if (growth > 0.05) {
        _memoryWarnings++;
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
