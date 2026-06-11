import { Network } from './network';
import { ParticleSystem } from './particles';
import { Player } from './player';
import { UIManager } from './ui';

interface Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  network: Network | null;
  particles: ParticleSystem;
  player: Player | null;
  ui: UIManager;
  lastTime: number;
  breathPhase: number;
  keys: Set<string>;
  victoryAngle: number;
  running: boolean;
}

const game: Game = {
  canvas: null!,
  ctx: null!,
  width: 0,
  height: 0,
  network: null,
  particles: new ParticleSystem(),
  player: null,
  ui: null!,
  lastTime: 0,
  breathPhase: 0,
  keys: new Set(),
  victoryAngle: 0,
  running: true
};

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  game.canvas = canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get 2D context');
    return;
  }
  game.ctx = ctx;

  resize();
  window.addEventListener('resize', resize);

  game.ui = new UIManager(game.width, game.height);

  game.canvas.addEventListener('click', onCanvasClick);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  setTimeout(() => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 800);
    }
  }, 600);

  requestAnimationFrame(loop);
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  game.width = Math.max(800, window.innerWidth);
  game.height = Math.max(600, window.innerHeight);

  game.canvas.width = game.width * dpr;
  game.canvas.height = game.height * dpr;
  game.canvas.style.width = `${game.width}px`;
  game.canvas.style.height = `${game.height}px`;

  game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (game.network) {
    game.network.resize(game.width, game.height);
  }
  if (game.ui) {
    game.ui.resize(game.width, game.height);
  }
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = game.canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function onCanvasClick(e: MouseEvent): void {
  const { x, y } = getCanvasCoords(e);

  if (game.ui.state === 'start') {
    if (game.ui.isStartButtonClicked(x, y)) {
      startNewGame();
      game.ui.startCountdown();
    }
    return;
  }

  if (game.ui.state === 'ended') {
    if (game.ui.isRestartButtonClicked(x, y)) {
      startNewGame();
      game.ui.startCountdown();
    }
    return;
  }

  if (game.ui.state !== 'playing' || !game.network || !game.player) return;

  const nodeId = game.network.findNodeAt(x, y);
  if (nodeId === null) return;

  if (nodeId === game.player.currentNodeId) return;

  game.player.tryMoveTo(nodeId, game.network);
}

function onKeyDown(e: KeyboardEvent): void {
  game.keys.add(e.key.toLowerCase());

  if (game.ui.state !== 'playing' || !game.network || !game.player || game.player.isMoving) return;

  const available = game.network.getAvailableNeighbors(game.player.currentNodeId);
  if (available.length === 0) return;

  const current = game.network.nodes[game.player.currentNodeId];
  let bestId = -1;
  let bestScore = -Infinity;

  for (const neighborId of available) {
    const neighbor = game.network.nodes[neighborId];
    const dx = neighbor.x - current.x;
    const dy = neighbor.y - current.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    let score = 0;
    if (game.keys.has('arrowup') || game.keys.has('w')) score += -ny;
    if (game.keys.has('arrowdown') || game.keys.has('s')) score += ny;
    if (game.keys.has('arrowleft') || game.keys.has('a')) score += -nx;
    if (game.keys.has('arrowright') || game.keys.has('d')) score += nx;

    if (score > bestScore) {
      bestScore = score;
      bestId = neighborId;
    }
  }

  if (bestId >= 0 && bestScore > 0.3) {
    game.player.tryMoveTo(bestId, game.network);
  }
}

function onKeyUp(e: KeyboardEvent): void {
  game.keys.delete(e.key.toLowerCase());
}

function startNewGame(): void {
  game.particles = new ParticleSystem();
  game.network = new Network(game.width, game.height);

  const startNodeId = Math.floor(Math.random() * game.network.nodes.length);
  const startNode = game.network.nodes[startNodeId];
  game.player = new Player(startNodeId, startNode.x, startNode.y);

  game.network.highlightNode(startNodeId);
  game.victoryAngle = 0;

  game.ui.reset();
}

function update(dt: number): void {
  game.breathPhase += dt / 3000;
  game.ui.update(dt);

  if (game.ui.state === 'playing' || game.ui.state === 'victory') {
    if (game.network) game.network.update(dt);
    game.particles.update(dt);

    if (game.ui.state === 'playing' && game.player) {
      game.player.update(dt, game.network!, game.particles);

      const collected = game.network!.getCollectedCount();
      const total = game.network!.getTotalCount();
      game.ui.updateStats(collected, total, game.player.getSpeedMultiplier());

      if (collected >= total) {
        game.ui.triggerVictory(collected, game.ui.elapsedTime);
        game.particles.clearStarPoints();
      }
    }

    if (game.ui.state === 'victory') {
      updateVictoryAnimation(dt);
    }
  }
}

function updateVictoryAnimation(dt: number): void {
  if (!game.player) return;

  const progress = game.ui.getVictoryProgress();
  const cx = game.width / 2;
  const cy = game.height / 2;
  const baseRadius = Math.min(game.width, game.height) * 0.35;

  game.victoryAngle += dt / 1000 * Math.PI * 0.8;
  const radius = baseRadius * (1 - progress * 0.3);

  game.player.x = cx + Math.cos(game.victoryAngle) * radius;
  game.player.y = cy + Math.sin(game.victoryAngle) * radius;
  game.player.directionX = -Math.sin(game.victoryAngle);
  game.player.directionY = Math.cos(game.victoryAngle);
  game.player.isMoving = true;

  if (Math.random() < 0.4) {
    game.particles.spawnTrail(game.player.x, game.player.y, game.player.directionX, game.player.directionY);
  }

  if (Math.random() < 0.5) {
    game.particles.spawnVictoryBurst(
      game.player.x + (Math.random() - 0.5) * 20,
      game.player.y + (Math.random() - 0.5) * 20
    );
  }
}

function render(): void {
  const ctx = game.ctx;

  drawBackground(ctx);

  const breath = Math.sin(game.breathPhase * Math.PI * 2) * 0.5 + 0.5;

  if (game.network) {
    game.network.render(ctx, breath);
  }

  game.particles.render(ctx);

  if (game.player && (game.ui.state === 'playing' || game.ui.state === 'victory')) {
    game.player.render(ctx);
  }

  if (game.network && game.player && game.ui.state === 'playing' && !game.player.isMoving) {
    highlightAvailableNodes(ctx);
  }

  game.ui.render(ctx, game.particles);
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
  gradient.addColorStop(0, '#0B0B2A');
  gradient.addColorStop(1, '#1B1B4A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.save();
  const starCount = 80;
  const time = performance.now() / 1000;
  for (let i = 0; i < starCount; i++) {
    const seed = i * 9301 + 49297;
    const sx = ((seed % 1000) / 1000) * game.width;
    const sy = (((seed * 7) % 1000) / 1000) * game.height;
    const twinkle = 0.3 + 0.3 * Math.sin(time + i * 0.5);
    const size = 0.5 + (i % 3) * 0.5;

    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function highlightAvailableNodes(ctx: CanvasRenderingContext2D): void {
  if (!game.network || !game.player) return;

  const available = game.network.getAvailableNeighbors(game.player.currentNodeId);
  const current = game.network.nodes[game.player.currentNodeId];

  for (const neighborId of available) {
    const neighbor = game.network.nodes[neighborId];
    const dx = neighbor.x - current.x;
    const dy = neighbor.y - current.y;
    const dist = Math.hypot(dx, dy) || 1;
    const midX = current.x + dx / 2;
    const midY = current.y + dy / 2;

    ctx.save();
    const pulse = 0.5 + 0.3 * Math.sin(performance.now() / 200 + neighborId);
    ctx.globalAlpha = pulse * 0.6;
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(current.x + (dx / dist) * (current.radius + 5), current.y + (dy / dist) * (current.radius + 5));
    ctx.lineTo(neighbor.x - (dx / dist) * (neighbor.radius + 5), neighbor.y - (dy / dist) * (neighbor.radius + 5));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#87CEEB';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const arrowAngle = Math.atan2(dy, dx);
    ctx.translate(midX, midY);
    ctx.rotate(arrowAngle);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function loop(timestamp: number): void {
  if (!game.running) return;

  if (!game.lastTime) game.lastTime = timestamp;
  const dt = Math.min(50, timestamp - game.lastTime);
  game.lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

init();
