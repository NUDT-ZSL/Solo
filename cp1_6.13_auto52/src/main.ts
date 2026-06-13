import { Maze, CELL_SIZE } from './maze';
import { Player } from './player';
import { Portal, generateGems, generateCreatures } from './entity';
import { Renderer, GameState } from './renderer';

const CANVAS_W = 800;
const CANVAS_H = 600;

function createGameState(floor: number = 1): GameState {
  const maze = new Maze();

  const startGrid = maze.getRandomFloor();
  const player = new Player(
    startGrid.x * CELL_SIZE + CELL_SIZE / 2,
    startGrid.y * CELL_SIZE + CELL_SIZE / 2
  );

  const portalGrid = findFarFloor(maze, startGrid);
  const portal = new Portal(portalGrid.x, portalGrid.y);

  const gemCount = 10 + Math.floor(Math.random() * 6);
  const gems = generateGems(maze, gemCount, startGrid, portalGrid);

  const creatureCount = 3 + Math.min(floor, 7);
  const creatures = generateCreatures(maze, creatureCount, startGrid);

  return {
    maze,
    player,
    gems,
    creatures,
    portal,
    floor,
    totalGems: gemCount,
    gameOver: false,
    gameOverTime: 0,
    showRestartHover: false
  };
}

function findFarFloor(maze: Maze, from: { x: number; y: number }): { x: number; y: number } {
  const floors = maze.getFloors();
  let best = floors[0];
  let bestDist = 0;
  for (const f of floors) {
    const dx = f.x - from.x;
    const dy = f.y - from.y;
    const d = dx * dx + dy * dy;
    if (d > bestDist) {
      bestDist = d;
      best = f;
    }
  }
  return best;
}

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const renderer = new Renderer(canvas);
  let state = createGameState(1);
  let lastTime = performance.now();
  let running = true;

  canvas.addEventListener('mousemove', (e) => {
    if (!state.gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    state.showRestartHover = renderer.isRestartButton(mx, my);
    canvas.style.cursor = state.showRestartHover ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', (e) => {
    if (!state.gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (renderer.isRestartButton(mx, my)) {
      state = createGameState(1);
      canvas.style.cursor = 'default';
    }
  });

  function loop(now: number): void {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(state, dt);
    renderer.render(state);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

function update(state: GameState, dt: number): void {
  if (state.gameOver) {
    state.gameOverTime += dt;
    return;
  }

  state.player.update(state.maze, dt, state.creatures);

  for (const gem of state.gems) {
    gem.update(dt);
    if (gem.checkCollect(state.player)) {
      state.player.collectGem();
    }
  }
  state.gems = state.gems.filter(g => !(g.collected && g.isCollectAnimDone()));

  for (const creature of state.creatures) {
    creature.update(dt, state.player, state.maze);
  }

  const allCollected = state.gems.every(g => g.collected);
  state.portal.update(dt, allCollected);

  if (state.portal.checkEnter(state.player)) {
    const nextFloor = state.floor + 1;
    const newState = createGameState(nextFloor);
    Object.assign(state, newState);
    return;
  }

  if (state.player.isDead()) {
    state.gameOver = true;
    state.gameOverTime = 0;
  }
}

main();
