import type { Tower, Enemy, Projectile, Particle, RuneEffect } from './types';
import { TOWER_STATS, WAVE_CONFIGS, ENEMY_STATS, CANVAS_WIDTH, CELL_SIZE, GRID_WALKABLE, GRID_COLS, GRID_ROWS } from './types';
import { useGameStore } from './store';
import { createEnemy, updateEnemy, hasReachedEnd, getTotalPathLength } from './EnemyManager';
import { towerAttack, processProjectileHit } from './TowerSystem';
import { createDeathParticles, createUpgradeParticles, updateParticles } from './ParticleSystem';

let lastTime = 0;
let animFrameId = 0;
let spawnTimers: { type: string; remaining: number; interval: number; count: number; spawned: number }[] = [];

function spawnWaveEnemies(wave: number, dt: number): string[] {
  const state = useGameStore.getState();
  if (!state.waveInProgress || state.isPaused) return [];

  const config = WAVE_CONFIGS[wave - 1];
  if (!config) return [];

  if (spawnTimers.length === 0) {
    spawnTimers = config.enemies.map((e) => ({
      type: e.type,
      remaining: 0,
      interval: e.interval,
      count: e.count,
      spawned: 0,
    }));
  }

  const newEnemyIds: string[] = [];
  for (const timer of spawnTimers) {
    if (timer.spawned >= timer.count) continue;
    timer.remaining -= dt;
    if (timer.remaining <= 0) {
      const enemy = createEnemy(timer.type as 'normal' | 'elite' | 'boss', wave);
      newEnemyIds.push(enemy.id);
      useGameStore.setState((s) => ({ enemies: [...s.enemies, enemy] }));
      timer.spawned++;
      timer.remaining = timer.interval;
    }
  }
  return newEnemyIds;
}

function updateProjectiles(projectiles: Projectile[], enemies: Enemy[], dt: number): {
  remaining: Projectile[];
  hits: { proj: Projectile; hitPos: { x: number; y: number } }[];
} {
  const remaining: Projectile[] = [];
  const hits: { proj: Projectile; hitPos: { x: number; y: number } }[] = [];

  for (const proj of projectiles) {
    proj.progress += proj.speed * dt * 0.003;
    if (proj.progress >= 1) {
      hits.push({ proj, hitPos: { x: proj.toX, y: proj.toY } });
    } else {
      remaining.push(proj);
    }
  }

  return { remaining, hits };
}

function gameLoop(timestamp: number) {
  const state = useGameStore.getState();
  if (state.isGameOver || state.isVictory) {
    animFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  if (lastTime === 0) lastTime = timestamp;
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  if (state.isPaused) {
    animFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  spawnWaveEnemies(state.currentWave, dt);

  let newEnemies = [...state.enemies];
  let newGold = state.gold;
  let newLives = state.lives;
  const newParticles: Particle[] = [...state.particles];
  let newRuneEffects: RuneEffect[] = [...state.runeEffects];
  const killedIds: string[] = [];

  for (let i = 0; i < newEnemies.length; i++) {
    const e = newEnemies[i];
    if (e.isDead) continue;

    updateEnemy(e, dt);

    if (e.type === 'boss' && e.bossSummonTimer > 0) {
      e.bossSummonTimer -= dt;
      if (e.bossSummonTimer <= 0) {
        e.bossSummonTimer = ENEMY_STATS.boss.summonInterval;
        for (let s = 0; s < ENEMY_STATS.boss.summonCount; s++) {
          const minion = createEnemy('normal', state.currentWave);
          minion.pathProgress = Math.max(0, e.pathProgress - 30);
          minion.position.x = e.position.x - 20 - s * 15;
          minion.position.y = e.position.y;
          newEnemies.push(minion);
        }
      }
    }

    if (hasReachedEnd(e.pathProgress)) {
      e.isDead = true;
      killedIds.push(e.id);
      newLives -= (e.type === 'boss' ? 5 : e.type === 'elite' ? 2 : 1);
    }
  }

  let newProjectiles = [...state.projectiles];
  const newTowers = state.towers.map((t) => ({ ...t }));

  for (const tower of newTowers) {
    if (tower.placeAnimProgress < 1) {
      tower.placeAnimProgress = Math.min(1, tower.placeAnimProgress + dt * 0.004);
    }
    if (tower.upgradeAnimProgress > 0) {
      tower.upgradeAnimProgress = Math.max(0, tower.upgradeAnimProgress - dt * 0.002);
    }
    if (tower.attackAnimProgress > 0) {
      tower.attackAnimProgress = Math.max(0, tower.attackAnimProgress - dt * 0.003);
    }

    const { projectile, runeEffect } = towerAttack(tower, newEnemies.filter((e) => !e.isDead), timestamp);
    if (projectile) {
      newProjectiles.push(projectile);
    }
    if (runeEffect) {
      newRuneEffects.push(runeEffect);
    }
  }

  const projResult = updateProjectiles(newProjectiles, newEnemies, dt);
  newProjectiles = projResult.remaining;

  for (const { proj } of projResult.hits) {
    const hitResult = processProjectileHit(proj, newEnemies);
    for (const kid of hitResult.killedEnemies) {
      if (!killedIds.includes(kid)) {
        killedIds.push(kid);
      }
    }
    const stats = ENEMY_STATS[newEnemies.find((e) => e.id === hitResult.killedEnemies[0])?.type || 'normal'];
    newGold += hitResult.killedEnemies.length * (stats?.gold || 10);
    newParticles.push(...hitResult.particles);
  }

  for (const kid of killedIds) {
    const deadEnemy = newEnemies.find((e) => e.id === kid);
    if (deadEnemy) {
      const colors: Record<string, string> = { normal: '#2E4057', elite: '#4A6FA5', boss: '#8B0000' };
      newParticles.push(...createDeathParticles(
        deadEnemy.position.x,
        deadEnemy.position.y,
        colors[deadEnemy.type] || '#2E4057',
        deadEnemy.type === 'boss' ? 20 : deadEnemy.type === 'elite' ? 12 : 8
      ));
    }
  }

  newEnemies = newEnemies.filter((e) => !killedIds.includes(e.id));
  newRuneEffects = newRuneEffects
    .map((r) => ({ ...r, rotation: r.rotation + dt * 0.003, life: r.life - dt }))
    .filter((r) => r.life > 0);

  const updatedParticles = updateParticles(newParticles, dt);

  let waveInProgress = state.waveInProgress;
  let isVictory = state.isVictory;
  let waveAnnouncement = state.waveAnnouncement;
  let waveAnnouncementTimer = state.waveAnnouncementTimer - dt;

  if (waveAnnouncementTimer <= 0) {
    waveAnnouncement = '';
    waveAnnouncementTimer = 0;
  }

  if (waveInProgress && spawnTimers.every((t) => t.spawned >= t.count) && newEnemies.length === 0) {
    waveInProgress = false;
    spawnTimers = [];
    if (state.currentWave >= WAVE_CONFIGS.length) {
      isVictory = true;
    }
  }

  const isGameOver = newLives <= 0;

  useGameStore.setState({
    enemies: newEnemies,
    towers: newTowers,
    projectiles: newProjectiles,
    particles: updatedParticles,
    runeEffects: newRuneEffects,
    gold: newGold,
    lives: Math.max(0, newLives),
    waveInProgress,
    isGameOver,
    isVictory,
    waveAnnouncement,
    waveAnnouncementTimer,
  });

  animFrameId = requestAnimationFrame(gameLoop);
}

export function startGameLoop() {
  lastTime = 0;
  animFrameId = requestAnimationFrame(gameLoop);
}

export function stopGameLoop() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
  }
}

export function isCellPlaceable(gx: number, gy: number, towers: Tower[]): boolean {
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false;
  if (!GRID_WALKABLE[gy][gx]) return false;
  if (towers.some((t) => t.gridX === gx && t.gridY === gy)) return false;
  return true;
}
