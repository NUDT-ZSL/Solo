import { Painting } from './painting';
import { Puzzle } from './puzzle';

interface GameState {
  paintings: Painting[];
  puzzle: Puzzle;
  hoveredPainting: Painting | null;
  time: number;
  lastTime: number;
  deltaTime: number;
  fps: number;
  frameCount: number;
  fpsUpdateTime: number;
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let gameState: GameState;
let animationId: number;

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  
  resizeCanvas();
  
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('click', handleClick);
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  
  gameState = {
    paintings: [],
    puzzle: null as any,
    hoveredPainting: null,
    time: 0,
    lastTime: 0,
    deltaTime: 0,
    fps: 60,
    frameCount: 0,
    fpsUpdateTime: 0
  };
  
  createPaintings();
  createPuzzle();
  simulateLoading();
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);
  
  if (gameState && gameState.paintings.length > 0) {
    updatePaintingPositions();
    if (gameState.puzzle) {
      gameState.puzzle.setCanvasSize(window.innerWidth, window.innerHeight);
    }
  }
}

function createPaintings(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const horizonY = h * 0.35;
  const vanishX = w / 2;
  
  const numPaintingsPerSide = 8;
  const paintings: Painting[] = [];
  
  const focalLength = 600;
  const nearZ = 50;
  const farZ = 800;
  
  const corridorHalfWidth = 350;
  const paintingHeight = 160;
  const paintingWidth = 110;
  const paintingY = 50;
  
  for (let i = 0; i < numPaintingsPerSide; i++) {
    const t = i / (numPaintingsPerSide - 1);
    const z = nearZ + (farZ - nearZ) * t;
    const perspectiveScale = focalLength / (focalLength + z);
    
    const zDepth = z;
    const scale = perspectiveScale;
    
    const x = vanishX - corridorHalfWidth * perspectiveScale;
    const y = horizonY + paintingY * perspectiveScale;
    
    const painting = new Painting(ctx, {
      id: i,
      side: 'left',
      index: i,
      x,
      y,
      width: paintingWidth,
      height: paintingHeight,
      scale,
      zDepth
    });
    
    paintings.push(painting);
  }
  
  for (let i = 0; i < numPaintingsPerSide; i++) {
    const t = i / (numPaintingsPerSide - 1);
    const z = nearZ + (farZ - nearZ) * t;
    const perspectiveScale = focalLength / (focalLength + z);
    
    const zDepth = z;
    const scale = perspectiveScale;
    
    const x = vanishX + corridorHalfWidth * perspectiveScale;
    const y = horizonY + paintingY * perspectiveScale;
    
    const painting = new Painting(ctx, {
      id: numPaintingsPerSide + i,
      side: 'right',
      index: i,
      x,
      y,
      width: paintingWidth,
      height: paintingHeight,
      scale,
      zDepth
    });
    
    paintings.push(painting);
  }
  
  gameState.paintings = paintings;
}

function updatePaintingPositions(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const horizonY = h * 0.35;
  const vanishX = w / 2;
  
  const numPaintingsPerSide = 8;
  
  const focalLength = 600;
  const nearZ = 50;
  const farZ = 800;
  
  const corridorHalfWidth = 350;
  const paintingHeight = 160;
  const paintingWidth = 110;
  const paintingY = 50;
  
  for (let i = 0; i < numPaintingsPerSide; i++) {
    const t = i / (numPaintingsPerSide - 1);
    const z = nearZ + (farZ - nearZ) * t;
    const perspectiveScale = focalLength / (focalLength + z);
    
    const x = vanishX - corridorHalfWidth * perspectiveScale;
    const y = horizonY + paintingY * perspectiveScale;
    
    gameState.paintings[i].setPosition(x, y, perspectiveScale);
  }
  
  for (let i = 0; i < numPaintingsPerSide; i++) {
    const t = i / (numPaintingsPerSide - 1);
    const z = nearZ + (farZ - nearZ) * t;
    const perspectiveScale = focalLength / (focalLength + z);
    
    const x = vanishX + corridorHalfWidth * perspectiveScale;
    const y = horizonY + paintingY * perspectiveScale;
    
    gameState.paintings[numPaintingsPerSide + i].setPosition(x, y, perspectiveScale);
  }
}

function createPuzzle(): void {
  gameState.puzzle = new Puzzle(
    ctx,
    gameState.paintings,
    window.innerWidth,
    window.innerHeight
  );
}

function simulateLoading(): void {
  const loadingBar = document.getElementById('loading-bar');
  const loadingScreen = document.getElementById('loading-screen');
  
  if (!loadingBar || !loadingScreen) {
    startGameLoop();
    return;
  }
  
  let progress = 0;
  const loadInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadInterval);
      
      setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          startGameLoop();
        }, 1200);
      }, 300);
    }
    loadingBar.style.width = progress + '%';
  }, 150);
}

function startGameLoop(): void {
  gameState.lastTime = performance.now();
  gameLoop();
}

function gameLoop(): void {
  const currentTime = performance.now();
  gameState.deltaTime = Math.min((currentTime - gameState.lastTime) / 1000, 0.1);
  gameState.lastTime = currentTime;
  gameState.time += gameState.deltaTime;
  
  gameState.frameCount++;
  if (currentTime - gameState.fpsUpdateTime >= 1000) {
    gameState.fps = gameState.frameCount;
    gameState.frameCount = 0;
    gameState.fpsUpdateTime = currentTime;
  }
  
  update(gameState.deltaTime);
  render();
  
  animationId = requestAnimationFrame(gameLoop);
}

function update(deltaTime: number): void {
  for (const painting of gameState.paintings) {
    painting.update(deltaTime, gameState.time);
  }
  
  gameState.puzzle.update(deltaTime, gameState.time);
}

function render(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  ctx.clearRect(0, 0, w, h);
  
  gameState.puzzle.drawBackground();
  gameState.puzzle.drawWalls();
  gameState.puzzle.drawFloor();
  gameState.puzzle.drawEndWall();
  
  const sortedPaintings = [...gameState.paintings].sort((a, b) => b.getZDepth() - a.getZDepth());
  
  for (const painting of sortedPaintings) {
    painting.draw();
  }
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  updateHoverState(x, y);
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    updateHoverState(x, y);
  }
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    updateHoverState(x, y);
    
    const clickedPainting = findPaintingAtPoint(x, y);
    if (clickedPainting && clickedPainting.hitTestShape(x, y)) {
      clickedPainting.collect();
    }
  }
}

function handleClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const clickedPainting = findPaintingAtPoint(x, y);
  if (clickedPainting && clickedPainting.hitTestShape(x, y)) {
    clickedPainting.collect();
  }
}

function updateHoverState(x: number, y: number): void {
  const hovered = findPaintingAtPoint(x, y);
  
  if (gameState.hoveredPainting !== hovered) {
    if (gameState.hoveredPainting) {
      gameState.hoveredPainting.setHovered(false);
    }
    
    gameState.hoveredPainting = hovered;
    
    if (hovered) {
      hovered.setHovered(true);
    }
  }
}

function findPaintingAtPoint(x: number, y: number): Painting | null {
  const frontToBackPaintings = [...gameState.paintings].sort((a, b) => a.getZDepth() - b.getZDepth());
  
  for (const painting of frontToBackPaintings) {
    if (painting.containsPoint(x, y)) {
      return painting;
    }
  }
  
  return null;
}

window.addEventListener('load', init);
