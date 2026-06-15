import { StarNetwork } from './network';
import { PlayerShip } from './player';
import { ParticleSystem } from './particles';
import { UIManager, GameState } from './ui';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const loading = document.getElementById('loading')!;

const network = new StarNetwork();
const particles = new ParticleSystem();
const ui = new UIManager();
let player: PlayerShip;

let lastTime = 0;
let gameTime = 0;
let playStartTime = 0;
let collected = 0;
let totalNodes = 0;
let victoryTriggered = false;
let victoryCircleAngle = 0;
let victoryCircleDone = false;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(window.innerWidth, 800);
  const h = Math.max(window.innerHeight, 600);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getCanvasSize(): { w: number; h: number } {
  const dpr = window.devicePixelRatio || 1;
  return { w: canvas.width / dpr, h: canvas.height / dpr };
}

function initGame(): void {
  const { w, h } = getCanvasSize();
  network.generate(w, h);
  particles.particles = [];
  particles.energyOrbs = [];
  particles.waveRings = [];

  totalNodes = network.nodes.length;
  collected = 0;
  victoryTriggered = false;
  victoryCircleDone = false;
  victoryCircleAngle = 0;

  const startNode = network.nodes[0];
  startNode.visited = true;
  startNode.activated = true;
  startNode.activateTime = 0;
  startNode.hasEnergy = false;
  collected = 1;

  player = new PlayerShip(startNode.x, startNode.y, startNode.id);

  ui.gameState = 'menu';
  ui.stats = { collected, total: totalNodes, time: 0, speedMultiplier: 1.0 };
  ui.victoryTimer = 0;
  ui.showVictoryPanel = false;
}

function renderBackground(w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0B0B2A');
  grad.addColorStop(1, '#1B1B4A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137.5 + gameTime * 2) % w);
    const sy = ((i * 97.3 + gameTime * 0.5) % h);
    const sr = 0.5 + (i % 3) * 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function handleNodeClick(mx: number, my: number): void {
  if (ui.gameState !== 'playing') return;
  if (player.isMoving) return;

  const hitNode = network.findNodeAt(mx, my, 30);
  if (!hitNode) return;

  const neighbors = network.getNeighbors(player.currentNode);
  if (!neighbors.includes(hitNode.id)) return;

  if (!network.isEdgeTraversable(player.currentNode, hitNode.id)) {
    network.flashNodeRed(hitNode.id, gameTime);
    return;
  }

  player.moveTo(hitNode.id, network);
}

function handleClick(mx: number, my: number): void {
  if (ui.gameState === 'menu') {
    const btn = ui.getMenuBtn();
    if (btn && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      ui.startCountdown();
      playStartTime = gameTime;
      return;
    }
    ui.startCountdown();
    playStartTime = gameTime;
    return;
  }

  if (ui.gameState === 'victory' && ui.showVictoryPanel) {
    const btn = ui.getRestartBtn();
    if (btn && mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      initGame();
      ui.startCountdown();
      playStartTime = gameTime;
      return;
    }
    return;
  }

  if (ui.gameState === 'playing') {
    handleNodeClick(mx, my);
  }
}

canvas.addEventListener('click', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  handleClick(mx, my);
});

const keysDown = new Set<string>();

canvas.addEventListener('keydown', (e: KeyboardEvent) => {
  keysDown.add(e.key.toLowerCase());
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

canvas.addEventListener('keyup', (e: KeyboardEvent) => {
  keysDown.delete(e.key.toLowerCase());
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  keysDown.add(e.key.toLowerCase());
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }

  if (ui.gameState === 'playing' && !player.isMoving) {
    tryKeyboardMove(e.key.toLowerCase());
  }

  if (ui.gameState === 'menu' && (e.key === 'Enter' || e.key === ' ')) {
    ui.startCountdown();
    playStartTime = gameTime;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e: KeyboardEvent) => {
  keysDown.delete(e.key.toLowerCase());
});

function tryKeyboardMove(key: string): void {
  const neighbors = network.getNeighbors(player.currentNode);
  if (neighbors.length === 0) return;

  const curNode = network.nodes[player.currentNode];
  let bestNode = -1;
  let bestScore = -Infinity;

  const directions: Record<string, { dx: number; dy: number }> = {
    'arrowup': { dx: 0, dy: -1 }, 'w': { dx: 0, dy: -1 },
    'arrowdown': { dx: 0, dy: 1 }, 's': { dx: 0, dy: 1 },
    'arrowleft': { dx: -1, dy: 0 }, 'a': { dx: -1, dy: 0 },
    'arrowright': { dx: 1, dy: 0 }, 'd': { dx: 1, dy: 0 },
  };

  const dir = directions[key];
  if (!dir) return;

  for (const nbId of neighbors) {
    if (!network.isEdgeTraversable(player.currentNode, nbId)) continue;
    const nb = network.nodes[nbId];
    const dx = nb.x - curNode.x;
    const dy = nb.y - curNode.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;
    const dot = (dx / len) * dir.dx + (dy / len) * dir.dy;
    if (dot > bestScore) {
      bestScore = dot;
      bestNode = nbId;
    }
  }

  if (bestNode >= 0 && bestScore > 0.1) {
    player.moveTo(bestNode, network);
  }
}

function updateVictoryCircle(dt: number): void {
  if (!victoryCircleDone) {
    victoryCircleAngle += dt * Math.PI * 0.5;
    const { w, h } = getCanvasSize();
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;
    player.x = cx + Math.cos(victoryCircleAngle) * radius;
    player.y = cy + Math.sin(victoryCircleAngle) * radius;
    player.rotation = victoryCircleAngle + Math.PI / 2;

    const trailCount = Math.floor(3 + Math.random() * 3);
    for (let i = 0; i < trailCount; i++) {
      particles.emitTrail(
        player.x + (Math.random() - 0.5) * 6,
        player.y + (Math.random() - 0.5) * 6
      );
    }

    if (victoryCircleAngle >= Math.PI * 2) {
      victoryCircleDone = true;
    }
  }
}

function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  gameTime += dt;

  const { w, h } = getCanvasSize();

  if (ui.gameState === 'countdown') {
    const countdownTime = gameTime;
    ui.update(dt);
    if (ui.gameState === 'playing') {
      playStartTime = gameTime;
    }
  }

  if (ui.gameState === 'playing') {
    network.update(gameTime);
    const arrived = player.update(dt, gameTime, network, particles);
    if (arrived) {
      collected = network.nodes.filter((n) => n.visited).length;
      if (collected >= totalNodes && !victoryTriggered) {
        victoryTriggered = true;
        ui.startVictory();
        const { w: cw, h: ch } = getCanvasSize();
        particles.emitVictory(player.x, player.y, cw, ch);
      }
    }
    particles.update(dt);

    const speedMult = player.speedBoost ? 1.5 : 1.0;
    ui.updateStats({
      collected,
      total: totalNodes,
      time: gameTime - playStartTime,
      speedMultiplier: speedMult,
    });
  }

  if (ui.gameState === 'victory') {
    network.update(gameTime);
    updateVictoryCircle(dt);
    particles.update(dt);
    ui.update(dt);
    if (Math.random() < 0.3) {
      const { w: cw, h: ch } = getCanvasSize();
      particles.emitTrail(Math.random() * cw, -5);
    }
  }

  renderBackground(w, h);
  network.render(ctx, gameTime);
  particles.render(ctx);
  player.render(ctx, gameTime);

  if (ui.gameState === 'playing') {
    const neighbors = network.getNeighbors(player.currentNode);
    for (const nbId of neighbors) {
      if (network.isEdgeTraversable(player.currentNode, nbId)) {
        const nb = network.nodes[nbId];
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(gameTime * 3);
        ctx.strokeStyle = '#87CEEB';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(nb.x, nb.y, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  ui.render(ctx, w, h, gameTime);

  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
  resize();
});

resize();
initGame();

setTimeout(() => {
  loading.classList.add('fade-out');
  setTimeout(() => {
    loading.remove();
  }, 600);
}, 500);

lastTime = performance.now();
requestAnimationFrame(gameLoop);
