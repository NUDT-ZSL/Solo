import { create } from 'zustand';
import {
  TowerType,
  TowerStats,
  TOWER_STATS,
  Tower,
  Enemy,
  Projectile,
  Point,
  updateTowers as engineUpdateTowers,
  updateProjectiles as engineUpdateProjectiles,
  createProjectile as engineCreateProjectile,
  getEnemiesInRadius,
} from '../gameEngine/towerManager';
import {
  updateEnemiesAlongPath,
  Checkpoint as PathCheckpoint,
  Point as PathPoint,
} from '../gameEngine/pathManager';

export type { TowerType, TowerStats, Tower, Enemy, Projectile, Point };
export { TOWER_STATS };

export type Checkpoint = PathCheckpoint;

export interface SplashEffect {
  id: number;
  position: Point;
  fragments: { angle: number; distance: number; visible: boolean }[];
  timer: number;
}

export interface IceParticle {
  id: number;
  position: Point;
  timer: number;
  offsetX: number;
  offsetY: number;
}

export interface FloatingScore {
  id: number;
  position: Point;
  value: number;
  timer: number;
}

export interface GameState {
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  splashEffects: SplashEffect[];
  iceParticles: IceParticle[];
  floatingScores: FloatingScore[];
  lives: number;
  score: number;
  selectedTowerType: TowerType;
  gameOver: boolean;
  screenShakeTimer: number;
  screenFlashTimer: number;

  addEnemy: () => void;
  placeTower: (gridIndex: number, position: Point) => boolean;
  setSelectedTowerType: (type: TowerType) => void;
  updateGame: (deltaTime: number, path: PathPoint[], checkpoints: PathCheckpoint[]) => void;
  triggerScreenShake: () => void;
  triggerScreenFlash: () => void;
  resetGame: () => void;
}

let enemyIdCounter = 0;
let towerIdCounter = 0;
let projectileIdCounter = 0;
let effectIdCounter = 0;

function addFloatingScoreInternal(
  state: GameState,
  position: Point,
  value: number
): FloatingScore[] {
  const fs: FloatingScore = {
    id: ++effectIdCounter,
    position: { ...position },
    value,
    timer: 500,
  };
  return [...state.floatingScores, fs];
}

function addSplashEffectInternal(
  state: GameState,
  position: Point
): SplashEffect[] {
  const fragments = Array.from({ length: 5 }, (_, i) => ({
    angle: (i / 5) * Math.PI * 2,
    distance: 0,
    visible: true,
  }));
  const effect: SplashEffect = {
    id: ++effectIdCounter,
    position: { ...position },
    fragments,
    timer: 200,
  };
  return [...state.splashEffects, effect];
}

function addIceParticlesInternal(
  state: GameState,
  position: Point
): IceParticle[] {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: ++effectIdCounter,
    position: { ...position },
    timer: 500,
    offsetX: Math.cos((i / 6) * Math.PI * 2) * 15,
    offsetY: Math.sin((i / 6) * Math.PI * 2) * 15,
  }));
  return [...state.iceParticles, ...particles];
}

export const useGameStore = create<GameState>((set, get) => ({
  enemies: [],
  towers: [],
  projectiles: [],
  splashEffects: [],
  iceParticles: [],
  floatingScores: [],
  lives: 10,
  score: 0,
  selectedTowerType: 'arrow',
  gameOver: false,
  screenShakeTimer: 0,
  screenFlashTimer: 0,

  addEnemy: () => {
    const { enemies, gameOver } = get();
    if (gameOver || enemies.length >= 50) return;

    const newEnemy: Enemy = {
      id: ++enemyIdCounter,
      position: { x: 0, y: 300 },
      pathProgress: 0,
      currentSegment: 0,
      health: 100,
      maxHealth: 100,
      baseSpeed: 60,
      speed: 60,
      temporarySpeedMultiplier: 1,
      speedBoostRemainingTime: 0,
      permanentSpeedMultiplier: 1,
      slowTimer: 0,
      passedCheckpoints: 0,
      isFlashing: false,
      flashTimer: 0,
      active: true,
    };
    set({ enemies: [...enemies, newEnemy] });
  },

  placeTower: (gridIndex: number, position: Point) => {
    const { towers, selectedTowerType } = get();
    if (towers.some((t) => t.gridIndex === gridIndex) || towers.length >= 20) {
      return false;
    }

    const stats = TOWER_STATS[selectedTowerType];
    const newTower: Tower = {
      id: ++towerIdCounter,
      type: selectedTowerType,
      position,
      gridIndex,
      range: stats.range,
      damage: stats.damage,
      cooldown: stats.cooldown,
      currentCooldown: 0,
      rotation: 0,
      targetRotation: 0,
      rotationTimer: 0,
      isPlacing: true,
      placeTimer: 300,
      slowEffect: stats.slowEffect,
    };
    set({ towers: [...towers, newTower] });
    get().triggerScreenShake();
    return true;
  },

  setSelectedTowerType: (type: TowerType) => {
    set({ selectedTowerType: type });
  },

  updateGame: (deltaTime: number, path: PathPoint[], checkpoints: PathCheckpoint[]) => {
    const state = get();
    if (state.gameOver) return;

    const enemyResult = updateEnemiesAlongPath(state.enemies, deltaTime, path, checkpoints);

    if (enemyResult.activatedCheckpointIndices.length > 0) {
      for (const idx of enemyResult.activatedCheckpointIndices) {
        checkpoints[idx] = { ...checkpoints[idx], activated: true };
      }
    }

    let newLives = state.lives;
    if (enemyResult.reachedEndCount > 0) {
      newLives = Math.max(0, state.lives - enemyResult.reachedEndCount);
      if (newLives <= 0) {
        set({
          enemies: enemyResult.enemies,
          lives: 0,
          gameOver: true,
        });
        return;
      }
    }

    const towerResult = engineUpdateTowers(state.towers, enemyResult.enemies, deltaTime);

    let newProjectiles = [...state.projectiles];
    for (const event of towerResult.attackEvents) {
      const proj = engineCreateProjectile(
        ++projectileIdCounter,
        event.towerType,
        event.towerPosition,
        event.targetId,
        event.damage,
        400
      );
      newProjectiles.push(proj);
    }

    const projResult = engineUpdateProjectiles(newProjectiles, enemyResult.enemies, deltaTime);

    let updatedEnemies = [...enemyResult.enemies];
    let scoreGain = 0;
    const splashHits: { position: Point; damage: number; excludeId: number }[] = [];
    const icePositions: Point[] = [];
    const killedPositions: Point[] = [];

    for (const hit of projResult.hits) {
      const targetIdx = updatedEnemies.findIndex((e) => e.id === hit.targetId);
      if (targetIdx === -1) continue;

      const target = { ...updatedEnemies[targetIdx] };
      const wasAlive = target.health > 0;
      target.health -= hit.damage;
      target.isFlashing = true;
      target.flashTimer = 150;

      if (hit.towerType === 'magic') {
        target.slowTimer = 500;
        icePositions.push({ ...hit.hitPosition });
      }

      if (hit.towerType === 'cannon') {
        splashHits.push({
          position: { ...hit.hitPosition },
          damage: hit.damage * 0.5,
          excludeId: hit.targetId,
        });
      }

      if (wasAlive && target.health <= 0) {
        target.active = false;
        scoreGain += 10;
        killedPositions.push({ ...target.position });
      }

      updatedEnemies[targetIdx] = target;
    }

    for (const splash of splashHits) {
      const splashEnemies = getEnemiesInRadius(splash.position, updatedEnemies, 30);
      for (const e of splashEnemies) {
        if (e.id === splash.excludeId) continue;
        if (e.health <= 0) continue;
        const idx = updatedEnemies.findIndex((en) => en.id === e.id);
        if (idx === -1) continue;
        const wasAlive = updatedEnemies[idx].health > 0;
        const updated = { ...updatedEnemies[idx] };
        updated.health -= splash.damage;
        if (wasAlive && updated.health <= 0) {
          updated.active = false;
          scoreGain += 10;
          killedPositions.push({ ...updated.position });
        }
        updated.isFlashing = true;
        updated.flashTimer = 150;
        updatedEnemies[idx] = updated;
      }
    }

    let currentState = { ...get() };

    for (const pos of killedPositions) {
      currentState.floatingScores = addFloatingScoreInternal(currentState, pos, 10);
    }

    for (const splash of splashHits) {
      currentState.splashEffects = addSplashEffectInternal(currentState, splash.position);
    }
    for (const pos of icePositions) {
      currentState.iceParticles = addIceParticlesInternal(currentState, pos);
    }

    const updatedSplash = currentState.splashEffects
      .map((s) => {
        const t = s.timer - deltaTime;
        const progress = 1 - t / 200;
        return {
          ...s,
          timer: t,
          fragments: s.fragments.map((f) => ({
            ...f,
            distance: progress * 30,
            visible: t > 0,
          })),
        };
      })
      .filter((s) => s.timer > 0);

    const updatedIce = currentState.iceParticles
      .map((p) => ({ ...p, timer: p.timer - deltaTime }))
      .filter((p) => p.timer > 0);

    const updatedFloating = currentState.floatingScores
      .map((f) => ({
        ...f,
        timer: f.timer - deltaTime,
        position: { ...f.position, y: f.position.y - (deltaTime / 500) * 30 },
      }))
      .filter((f) => f.timer > 0);

    const newScreenFlashTimer = projResult.hits.length > 0
      ? 50
      : Math.max(0, state.screenFlashTimer - deltaTime);

    set({
      enemies: updatedEnemies.filter((e) => e.active),
      towers: towerResult.towers,
      projectiles: projResult.projectiles,
      splashEffects: updatedSplash,
      iceParticles: updatedIce,
      floatingScores: updatedFloating,
      lives: newLives,
      score: state.score + scoreGain,
      screenShakeTimer: Math.max(0, state.screenShakeTimer - deltaTime),
      screenFlashTimer: newScreenFlashTimer,
    });
  },

  triggerScreenShake: () => {
    set({ screenShakeTimer: 100 });
  },

  triggerScreenFlash: () => {
    set({ screenFlashTimer: 50 });
  },

  resetGame: () => {
    enemyIdCounter = 0;
    towerIdCounter = 0;
    projectileIdCounter = 0;
    effectIdCounter = 0;
    set({
      enemies: [],
      towers: [],
      projectiles: [],
      splashEffects: [],
      iceParticles: [],
      floatingScores: [],
      lives: 10,
      score: 0,
      selectedTowerType: 'arrow',
      gameOver: false,
      screenShakeTimer: 0,
      screenFlashTimer: 0,
    });
  },
}));
