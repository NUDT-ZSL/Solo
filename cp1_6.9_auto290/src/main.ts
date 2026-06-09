import { Player } from './player';
import { GameMap } from './map';
import { Renderer, Camera, VictoryState } from './renderer';
import { ParticleSystem } from './particle';

interface GameState {
  player: Player;
  map: GameMap;
  renderer: Renderer;
  particles: ParticleSystem;
  camera: Camera;
  keys: Set<string>;
  victory: VictoryState;
  portalCooldown: number;
  running: boolean;
}

let state: GameState | null = null;
let lastFrameTime: number = 0;
let rafId: number = 0;

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  const map = new GameMap();
  const player = new Player(map.startPosition.x, map.startPosition.y);
  const renderer = new Renderer(canvas);
  const particles = new ParticleSystem();
  const camera = renderer.computeCamera(player, map);

  state = {
    player,
    map,
    renderer,
    particles,
    camera,
    keys: new Set(),
    victory: { active: false, progress: 0, candleRise: 0 },
    portalCooldown: 0,
    running: true
  };

  setupEventListeners(canvas);
  lastFrameTime = performance.now();
  gameLoop();
}

function setupEventListeners(canvas: HTMLCanvasElement): void {
  if (!state) return;

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!state) return;
    const key = e.key.toLowerCase();
    state.keys.add(key);

    if (e.code === 'Space' || key === ' ') {
      e.preventDefault();
      state.player.toggleIgnite();
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (!state) return;
    state.keys.delete(e.key.toLowerCase());
  });

  window.addEventListener('resize', () => {
    if (!state) return;
    state.renderer.resize();
    state.camera = state.renderer.computeCamera(state.player, state.map);
  });

  window.addEventListener('blur', () => {
    if (!state) return;
    state.keys.clear();
  });
}

function handleInput(deltaTime: number): void {
  if (!state || state.victory.active) return;

  let dx = 0;
  let dy = 0;

  if (state.keys.has('w') || state.keys.has('arrowup')) dy -= 1;
  if (state.keys.has('s') || state.keys.has('arrowdown')) dy += 1;
  if (state.keys.has('a') || state.keys.has('arrowleft')) dx -= 1;
  if (state.keys.has('d') || state.keys.has('arrowright')) dx += 1;

  if (dx !== 0 || dy !== 0) {
    state.player.move(dx, dy, deltaTime, (x, y) => state!.map.isWallAt(x, y));
  }
}

function update(deltaTime: number): void {
  if (!state) return;

  handleInput(deltaTime);
  state.player.update(deltaTime);
  state.map.updateDoors(deltaTime);
  state.particles.update(deltaTime);
  state.camera = state.renderer.computeCamera(state.player, state.map);

  if (state.portalCooldown > 0) {
    state.portalCooldown -= deltaTime;
  }

  const runeIdx = state.map.checkRuneProximity(state.player.state.x, state.player.state.y);
  if (runeIdx !== null) {
    const rune = state.map.runes[runeIdx];
    if (state.map.triggerRune(runeIdx)) {
      state.particles.spawnBurst(rune.x, rune.y);
    }
  }

  if (state.portalCooldown <= 0 && !state.victory.active) {
    const portalIdx = state.map.checkPortal(
      state.player.state.x,
      state.player.state.y,
      state.player.state.isIgnited
    );
    if (portalIdx !== null) {
      const portal = state.map.portals[portalIdx];
      state.particles.spawnVortex(portal.x, portal.y);
      state.player.state.x = portal.targetX;
      state.player.state.y = portal.targetY;
      state.particles.spawnVortex(portal.targetX, portal.targetY);
      state.portalCooldown = 800;
    }
  }

  if (!state.victory.active && state.map.checkAltar(state.player.state.x, state.player.state.y)) {
    state.victory.active = true;
    state.victory.progress = 0;
    state.victory.candleRise = 0;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (state) {
          state.particles.spawnVictory(state.player.state.x, state.player.state.y);
        }
      }, i * 150);
    }
  }

  if (state.victory.active) {
    state.victory.progress += deltaTime;
    state.victory.candleRise = Math.min(300, state.victory.candleRise + 80 * (deltaTime / 1000));

    if (state.victory.progress > 500 && state.victory.progress % 200 < deltaTime) {
      state.particles.spawnVictory(state.player.state.x, state.player.state.y - state.victory.candleRise);
    }
  }
}

function render(deltaTime: number): void {
  if (!state) return;
  state.renderer.render(
    state.player,
    state.map,
    state.particles,
    state.camera,
    state.victory,
    deltaTime
  );
}

function gameLoop(): void {
  if (!state || !state.running) return;

  const now = performance.now();
  const deltaTime = Math.min(50, now - lastFrameTime);
  lastFrameTime = now;

  update(deltaTime);
  render(deltaTime);

  rafId = requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', init);
