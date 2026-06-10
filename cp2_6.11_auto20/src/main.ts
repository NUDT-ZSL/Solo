import { Painting } from './painting';
import { Puzzle } from './puzzle';

const PERSPECTIVE = {
  vanishYRatio: 0.35,
  focalLength: 500,
  corridorHalfWidth: 280,
  paintingWorldWidth: 100,
  paintingWorldHeight: 140,
  paintingWorldY: -60,
  candleWorldY: 30,
  nearZ: 120,
  farZ: 800
};

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
  canvasWidth: number;
  canvasHeight: number;
  vanishX: number;
  vanishY: number;
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let gameState: GameState;
let animationId: number;

function project3D(worldX: number, worldY: number, worldZ: number): { x: number; y: number; scale: number } {
  const { vanishX, vanishY } = gameState;
  const scale = PERSPECTIVE.focalLength / (PERSPECTIVE.focalLength + worldZ);
  return {
    x: vanishX + worldX * scale,
    y: vanishY + worldY * scale,
    scale
  };
}

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  gameState = {
    paintings: [],
    puzzle: null as any,
    hoveredPainting: null,
    time: 0,
    lastTime: 0,
    deltaTime: 0,
    fps: 60,
    frameCount: 0,
    fpsUpdateTime: 0,
    canvasWidth: w,
    canvasHeight: h,
    vanishX: w / 2,
    vanishY: h * PERSPECTIVE.vanishYRatio
  };
  
  resizeCanvas();
  
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('click', handleClick);
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  
  createPaintings();
  createPuzzle();
  simulateLoading();
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  
  gameState.canvasWidth = w;
  gameState.canvasHeight = h;
  gameState.vanishX = w / 2;
  gameState.vanishY = h * PERSPECTIVE.vanishYRatio;
  
  if (gameState && gameState.paintings.length > 0) {
    updatePaintingPositions();
    if (gameState.puzzle) {
      gameState.puzzle.setCanvasSize(w, h);
      gameState.puzzle.setPerspective(
        gameState.vanishX,
        gameState.vanishY,
        PERSPECTIVE.focalLength,
        PERSPECTIVE.corridorHalfWidth
      );
    }
  }
}

function createPaintings(): void {
  const numPaintingsPerSide = 8;
  const paintings: Painting[] = [];
  
  for (let i = 0; i < numPaintingsPerSide; i++) {
    const t = i / (numPaintingsPerSide - 1);
    const worldZ = PERSPECTIVE.nearZ + (PERSPECTIVE.farZ - PERSPECTIVE.nearZ) * t;
    
    const worldX = -PERSPECTIVE.corridorHalfWidth;
    const worldY = PERSPECTIVE.paintingWorldY;
    
    const proj = project3D(worldX, worldY, worldZ);
    
    const angle = Math.atan2(worldX, PERSPECTIVE.focalLength + worldZ);
    const rotationY = angle * 0.3;
    
    const painting = new Painting(ctx, {
      id: i,
      side: 'left',
      index: i,
      x: proj.x,
      y: proj.y,
      width: PERSPECTIVE.paintingWorldWidth,
      height: PERSPECTIVE.paintingWorldHeight,
      scale: proj.scale,
      zDepth: worldZ,
      rotationY: rotationY
    });
    
    paintings.push(painting);
  }
  
  for (let i = 0; i < numPaintingsPerSide; i++) {
    const t = i / (numPaintingsPerSide - 1);
    const worldZ = PERSPECTIVE.nearZ + (PERSPECTIVE.farZ - PERSPECTIVE.nearZ) * t;
    
    const worldX = PERSPECTIVE.corridorHalfWidth;
    const worldY = PERSPECTIVE.paintingWorldY;
    
    const proj = project3D(worldX, worldY, worldZ);
    
    const angle = Math.atan2(worldX, PERSPECTIVE.focalLength + worldZ);
    const rotationY = angle * 0.3;
    
    const painting = new Painting(ctx, {
      id: numPaintingsPerSide + i,
      side: 'right',
      index: i,
      x: proj.x,
      y: proj.y,
      width: PERSPECTIVE.paintingWorldWidth,
      height: PERSPECTIVE.paintingWorldHeight,
      scale: proj.scale,
      zDepth: worldZ,
      rotationY: rotationY
    });
    
    paintings.push(painting);
  }
  
  gameState.paintings = paintings;
}

function updatePaintingPositions(): void {
  const numPaintingsPerSide = 8;
  
  for (let i = 0; i < numPaintingsPerSide; i++) {
    const t = i / (numPaintingsPerSide - 1);
    const worldZ = PERSPECTIVE.nearZ + (PERSPECTIVE.farZ - PERSPECTIVE.nearZ) * t;
    
    const worldX = -PERSPECTIVE.corridorHalfWidth;
    const worldY = PERSPECTIVE.paintingWorldY;
    
    const proj = project3D(worldX, worldY, worldZ);
    
    const angle = Math.atan2(worldX, PERSPECTIVE.focalLength + worldZ);
    const rotationY = angle * 0.3;
    
    gameState.paintings[i].setPosition(proj.x, proj.y, proj.scale, rotationY);
  }
  
  for (let i = 0; i < numPaintingsPerSide; i++) {
    const t = i / (numPaintingsPerSide - 1);
    const worldZ = PERSPECTIVE.nearZ + (PERSPECTIVE.farZ - PERSPECTIVE.nearZ) * t;
    
    const worldX = PERSPECTIVE.corridorHalfWidth;
    const worldY = PERSPECTIVE.paintingWorldY;
    
    const proj = project3D(worldX, worldY, worldZ);
    
    const angle = Math.atan2(worldX, PERSPECTIVE.focalLength + worldZ);
    const rotationY = angle * 0.3;
    
    gameState.paintings[numPaintingsPerSide + i].setPosition(proj.x, proj.y, proj.scale, rotationY);
  }
}

function createPuzzle(): void {
  gameState.puzzle = new Puzzle(
    ctx,
    gameState.paintings,
    gameState.canvasWidth,
    gameState.canvasHeight
  );
  
  gameState.puzzle.setPerspective(
    gameState.vanishX,
    gameState.vanishY,
    PERSPECTIVE.focalLength,
    PERSPECTIVE.corridorHalfWidth
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
  const w = gameState.canvasWidth;
  const h = gameState.canvasHeight;
  
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
