import { Player } from './player';
import { Scene } from './scene';
import { GameState } from './gameState';
import { CONFIG, generateChests, generateSharkPaths, generateShipEntrances, TreasureChest, Shark, ShipEntrance } from './assets';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

let scene = new Scene(W, H);
let gameState = new GameState();
let player = new Player(W / 2, H * 0.8);
player.initInput(canvas);

let chests: TreasureChest[] = generateChests(W, H, scene.shipX, scene.shipY);
let sharks: Shark[] = generateSharkPaths(scene.shipX, scene.shipY, 3, W, H);
let entrances: ShipEntrance[] = generateShipEntrances(scene.shipX, scene.shipY, scene.shipW, scene.shipH);

let isGameStarted = false;
let lastTime = 0;
let spriteCount = 0;

function startGame(): void {
  gameState.reset();
  scene = new Scene(W, H);
  player = new Player(W / 2, H * 0.8);
  player.initInput(canvas);
  chests = generateChests(W, H, scene.shipX, scene.shipY);
  sharks = generateSharkPaths(scene.shipX, scene.shipY, 3, W, H);
  entrances = generateShipEntrances(scene.shipX, scene.shipY, scene.shipW, scene.shipH);
  isGameStarted = true;
  gameState.isGameStarted = true;
  gameState.gameStartTime = performance.now();
}

window.addEventListener('keydown', (e) => {
  if (!isGameStarted) {
    startGame();
    return;
  }
  if (e.key.toLowerCase() === 'e') {
    player.tryOpenChest(chests, gameState);
  }
  if (e.key.toLowerCase() === 'r' && gameState.isGameOver) {
    startGame();
  }
});

window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  scene.resize(W, H);
});

function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  ctx.clearRect(0, 0, W, H);
  spriteCount = 0;

  if (!isGameStarted) {
    scene.drawBackground(ctx);
    scene.drawSand(ctx);
    scene.drawShip(ctx, entrances);
    scene.drawChests(ctx, chests, 0);
    scene.drawSharks(ctx, sharks);
    scene.drawSurface(ctx);
    scene.drawStartScreen(ctx);
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!gameState.isGameOver) {
    player.update(dt, W, H);
    gameState.updateOxygen(dt);
    player.checkNearChest(chests, gameState);
    player.checkSharkCollision(sharks, entrances, gameState);
    player.checkSurfaceRefill(scene.surfaceX, scene.surfaceY, gameState);
    scene.updateSharkList(sharks, player, gameState, entrances, dt);
    for (const chest of chests) {
      if (chest.isOpen && chest.openProgress < 1) {
        chest.openProgress = Math.min(1, chest.openProgress + dt * 3);
      }
    }
  }

  scene.drawBackground(ctx);
  spriteCount++;
  scene.drawSand(ctx);
  spriteCount++;
  scene.drawSurface(ctx);
  spriteCount++;
  scene.drawShip(ctx, entrances);
  spriteCount += 2;
  scene.drawChests(ctx, chests, dt);
  spriteCount += chests.length;
  scene.drawSharks(ctx, sharks);
  spriteCount += sharks.length * 3;
  player.draw(ctx);
  spriteCount += 3;

  scene.drawOxygenBar(ctx, gameState);
  spriteCount++;
  scene.drawTreasureCount(ctx, gameState);
  spriteCount++;
  scene.drawChestPrompt(ctx, gameState.nearChestIndex, chests);
  spriteCount++;
  scene.drawOpenMessages(ctx, gameState.openChestMessages, dt);
  scene.drawWarningEffects(ctx, gameState);
  scene.drawGameOver(ctx, gameState);

  if (spriteCount > CONFIG.CHEST_COUNT + 50) {
    // sprite budget check
  }

  requestAnimationFrame(gameLoop);
}

lastTime = performance.now();
requestAnimationFrame(gameLoop);
