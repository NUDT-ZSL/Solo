import { eventBus } from './shared/EventBus';
import { ObjectPool, IPoolable } from './shared/ObjectPool';
import { WeaponFactory } from './WeaponModule/WeaponFactory';
import { Player } from './BattleModule/Player';
import { EnemyManager } from './BattleModule/EnemyManager';
import { Renderer } from './BattleModule/Renderer';
import {
  IProjectile,
  WeaponType,
  IWeapon,
  UI_CONSTANTS,
  PLAYER_CONSTANTS
} from './WeaponModule/WeaponType';

class PoolableProjectile implements IProjectile, IPoolable {
  id = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  weapon!: IWeapon;
  targetId?: number;
  rotation = 0;
  trail: { x: number; y: number }[] = [];

  reset(): void {
    this.id = 0;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.targetId = undefined;
    this.rotation = 0;
    this.trail.length = 0;
  }
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const MIN_WIDTH = UI_CONSTANTS.MIN_MAP_WIDTH;
let currentWidth = Math.max(window.innerWidth, MIN_WIDTH);
let currentHeight = window.innerHeight;
canvas.width = currentWidth;
canvas.height = currentHeight;

const renderer = new Renderer(canvas);
const weaponFactory = new WeaponFactory(WeaponType.ARROW);

let mapBounds = renderer.getMapBounds();
const playerStartX = Math.max(100, mapBounds.left + PLAYER_CONSTANTS.RADIUS + 40);
const playerStartY = mapBounds.top + mapBounds.height / 2;

const player = new Player(playerStartX, playerStartY, weaponFactory);
const enemyManager = new EnemyManager(mapBounds.width, mapBounds.height, mapBounds.top);

const projectilePool = new ObjectPool<PoolableProjectile>(
  () => new PoolableProjectile(),
  24,
  100
);
const projectiles: IProjectile[] = [];

eventBus.on('weapon:fire', (data: unknown) => {
  const { projectile } = data as { projectile: IProjectile };
  const pooled = projectilePool.acquire();
  pooled.id = projectile.id;
  pooled.x = projectile.x;
  pooled.y = projectile.y;
  pooled.vx = projectile.vx;
  pooled.vy = projectile.vy;
  pooled.weapon = projectile.weapon;
  pooled.targetId = projectile.targetId;
  pooled.rotation = projectile.rotation;
  pooled.trail = projectile.trail;
  projectiles.push(pooled);
});

eventBus.on('weapon:switch', (data: unknown) => {
  const { weapon } = data as { weapon: IWeapon };
  renderer.setCurrentWeapon(weapon.type);
});

eventBus.on('game:over', (data: unknown) => {
  const { finalScore } = data as { finalScore: number };
  renderer.setGameOver(true, finalScore);
});

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

let isDragging = false;
let isAiming = false;
let dragStartX = 0;
let dragStartY = 0;
let aimEndX = 0;
let aimEndY = 0;
let dragTrail: { x: number; y: number }[] = [];

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getCanvasCoords(e);

  if (player.gameOver) {
    if (renderer.isRestartButtonClicked(x, y)) {
      resetGame();
    }
    return;
  }

  const weaponType = renderer.getToolbarButtonAt(x, y);
  if (weaponType !== null) {
    player.switchWeapon(weaponType);
    return;
  }

  if (renderer.isPointInMapArea(x, y)) {
    const clickedEnemy = enemyManager.getEnemyAtPoint(x, y);
    if (clickedEnemy) {
      player.fire(player.x, player.y, x, y, clickedEnemy.id);
      isAiming = false;
      isDragging = false;
      dragTrail = [];
    } else {
      isDragging = true;
      isAiming = true;
      dragStartX = x;
      dragStartY = y;
      aimEndX = x;
      aimEndY = y;
      dragTrail = [{ x, y }];
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasCoords(e);

  if (isAiming) {
    aimEndX = x;
    aimEndY = y;
    if (dragTrail.length === 0 ||
        (dragTrail[dragTrail.length - 1].x - x) ** 2 +
        (dragTrail[dragTrail.length - 1].y - y) ** 2 > 16) {
      dragTrail.push({ x, y });
      if (dragTrail.length > 50) {
        dragTrail.shift();
      }
    }
  }
});

canvas.addEventListener('mouseup', (e) => {
  const { x, y } = getCanvasCoords(e);

  if (player.gameOver) return;

  if (isDragging && isAiming) {
    aimEndX = x;
    aimEndY = y;
    if (dragTrail.length > 1) {
      dragTrail.push({ x, y });
    }

    const distance = Math.sqrt(
      (x - dragStartX) ** 2 + (y - dragStartY) ** 2
    );

    if (distance > 10) {
      const targetEnemy = enemyManager.getEnemyAtPoint(x, y);
      if (targetEnemy) {
        player.fire(player.x, player.y, x, y, targetEnemy.id);
      } else {
        player.fire(player.x, player.y, x, y);
      }
    } else {
      const bounds = renderer.getMapBounds();
      player.setTargetPosition(
        Math.max(
          bounds.left + player.radius,
          Math.min(bounds.right - player.radius, dragStartX)
        ),
        Math.max(
          bounds.top + player.radius,
          Math.min(bounds.bottom - player.radius, dragStartY)
        )
      );
    }
  }

  isDragging = false;
  isAiming = false;
  dragTrail = [];
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
  isAiming = false;
  dragTrail = [];
});

window.addEventListener('resize', () => {
  currentWidth = Math.max(window.innerWidth, MIN_WIDTH);
  currentHeight = window.innerHeight;
  canvas.width = currentWidth;
  canvas.height = currentHeight;
  renderer.updateSize(currentWidth, currentHeight);
  mapBounds = renderer.getMapBounds();
  enemyManager.resize(mapBounds.width, mapBounds.height, mapBounds.top);

  const newBounds = renderer.getMapBounds();
  player.setTargetPosition(
    Math.max(
      newBounds.left + player.radius,
      Math.min(newBounds.right - player.radius, player.targetX)
    ),
    Math.max(
      newBounds.top + player.radius,
      Math.min(newBounds.bottom - player.radius, player.targetY)
    )
  );
});

window.addEventListener('keydown', (e) => {
  if (e.key === '1') player.switchWeapon(WeaponType.ARROW);
  if (e.key === '2') player.switchWeapon(WeaponType.MAGIC);
  if (e.key === '3') player.switchWeapon(WeaponType.AXE);
});

function resetGame(): void {
  const bounds = renderer.getMapBounds();
  const resetX = Math.max(100, bounds.left + PLAYER_CONSTANTS.RADIUS + 40);
  const resetY = bounds.top + bounds.height / 2;
  player.reset(resetX, resetY);
  enemyManager.reset();
  for (const proj of projectiles) {
    projectilePool.release(proj as PoolableProjectile);
  }
  projectiles.length = 0;
  renderer.setGameOver(false, 0);
  renderer.setCurrentWeapon(WeaponType.ARROW);
}

let lastTime = performance.now();
let frameCount = 0;
let currentFps = 60;
let minFps = 999;
let fpsLogCounter = 0;
let stressTestMode = false;

window.addEventListener('keydown', (e) => {
  if (e.key === 't' || e.key === 'T') {
    stressTestMode = !stressTestMode;
    console.log(`压力测试模式: ${stressTestMode ? '开启' : '关闭'}`);
    if (stressTestMode) {
      for (let i = 0; i < 15; i++) {
        enemyManager.spawnEnemy();
      }
      for (let i = 0; i < 20; i++) {
        const w = weaponFactory.getCurrentWeapon();
        player.fire(
          player.x,
          player.y,
          player.x + 200 + Math.random() * 400,
          player.y - 100 + Math.random() * 200
        );
      }
    }
  }
});

function gameLoop(now: number): void {
  const deltaTime = now - lastTime;
  lastTime = now;

  frameCount++;
  if (frameCount % 30 === 0) {
    currentFps = Math.round(1000 / Math.max(deltaTime, 1));
    if (currentFps < minFps && (enemyManager.getEnemies().length > 10 || projectiles.length > 15)) {
      minFps = currentFps;
    }
    fpsLogCounter++;
    if (fpsLogCounter % 10 === 0 && stressTestMode) {
      console.log(
        `[FPS] 当前: ${currentFps} 最低: ${minFps} ` +
        `敌人: ${enemyManager.getEnemies().length} 投射物: ${projectiles.length}`
      );
    }
  }

  if (!player.gameOver) {
    player.update();
    enemyManager.update();

    const enemiesForTracking = enemyManager.getEnemies().map((e) => ({
      id: e.id,
      x: e.x + e.width / 2,
      y: e.y + e.height / 2
    }));

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      weaponFactory.updateProjectile(proj, enemiesForTracking);

      if (
        proj.x < -50 ||
        proj.x > currentWidth + 50 ||
        proj.y < -50 ||
        proj.y > currentHeight + 50
      ) {
        const removed = projectiles.splice(i, 1)[0];
        projectilePool.release(removed as PoolableProjectile);
      }
    }

    const hitIds = enemyManager.checkCollisions(
      projectiles,
      player.x,
      player.y,
      player.radius
    );
    for (const id of hitIds) {
      const idx = projectiles.findIndex((p) => p.id === id);
      if (idx !== -1) {
        const removed = projectiles.splice(idx, 1)[0];
        projectilePool.release(removed as PoolableProjectile);
      }
    }
  }

  renderer.clear();
  renderer.drawMap();

  if (isAiming && dragTrail.length > 1) {
    const ctx = (renderer as unknown as { ctx: CanvasRenderingContext2D }).ctx;
    if (ctx) {
      ctx.save();
      ctx.strokeStyle = UI_CONSTANTS.AIM_LINE_COLOR;
      ctx.lineWidth = UI_CONSTANTS.AIM_LINE_WIDTH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(dragTrail[0].x, dragTrail[0].y);
      for (let i = 1; i < dragTrail.length; i++) {
        ctx.lineTo(dragTrail[i].x, dragTrail[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  for (const enemy of enemyManager.getEnemies()) {
    renderer.drawEnemy(enemy);
  }

  for (const proj of projectiles) {
    renderer.drawProjectile(proj);
  }

  for (const particle of enemyManager.getParticles()) {
    renderer.drawParticle(particle);
  }

  renderer.drawPlayer(
    player.x,
    player.y,
    player.radius,
    player.healthAnimation,
    player.scoreAnimation,
    player.score,
    player.health
  );

  if (isAiming) {
    renderer.drawAimLine(player.x, player.y, aimEndX, aimEndY);
    renderer.drawTrajectoryPreview(
      player.x,
      player.y,
      player.getCurrentWeapon(),
      aimEndX,
      aimEndY
    );
  }

  renderer.drawToolbar();
  renderer.drawGameOver();

  if (currentFps < 50 && !stressTestMode) {
    console.warn(`Low FPS detected: ${currentFps}`);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
