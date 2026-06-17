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
  createDefaultEnemy,
  updateEnemiesAlongPath,
  Checkpoint as PathCheckpoint,
  Point as PathPoint,
} from '../gameEngine/pathManager';

export type { TowerType, TowerStats, Tower, Enemy, Projectile, Point };
export { TOWER_STATS };

export type Checkpoint = PathCheckpoint;

export interface SplashFragment {
  angle: number;
  speed: number;
  distance: number;
  visible: boolean;
}

export interface SplashEffect {
  id: number;
  position: Point;
  fragments: SplashFragment[];
  timer: number;
  maxTimer: number;
}

export interface IceParticle {
  id: number;
  position: Point;
  timer: number;
  maxTimer: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export interface FloatingScore {
  id: number;
  position: Point;
  value: number;
  timer: number;
  maxTimer: number;
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

function createSplashFragments(): SplashFragment[] {
  const baseAngle = Math.random() * Math.PI * 2;
  return Array.from({ length: 5 }, (_, i) => ({
    angle: baseAngle + (i / 5) * Math.PI * 2 + (Math.random() - 0.5) * 0.8,
    speed: 80 + Math.random() * 60,
    distance: 0,
    visible: true,
  }));
}

function createIceParticles(position: Point): IceParticle[] {
  return Array.from({ length: 6 }, (_, i) => ({
    id: ++effectIdCounter,
    position: { ...position },
    timer: 500,
    maxTimer: 500,
    offsetX: Math.cos((i / 6) * Math.PI * 2) * 15,
    offsetY: Math.sin((i / 6) * Math.PI * 2) * 15,
    rotation: Math.random() * Math.PI * 2,
  }));
}

function createFloatingScore(position: Point, value: number): FloatingScore {
  return {
    id: ++effectIdCounter,
    position: { ...position },
    value,
    timer: 500,
    maxTimer: 500,
  };
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

    const newEnemy = createDefaultEnemy(++enemyIdCounter);
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
      const target = enemyResult.enemies.find((e) => e.id === event.targetId);
      const targetPos = target ? { ...target.position } : { ...event.towerPosition };
      const proj = engineCreateProjectile(
        ++projectileIdCounter,
        event.towerType,
        event.towerPosition,
        event.targetId,
        targetPos,
        event.damage,
        400
      );
      newProjectiles.push(proj);
    }

    const projResult = engineUpdateProjectiles(newProjectiles, enemyResult.enemies, deltaTime);

    let updatedEnemies = [...enemyResult.enemies];
    let scoreGain = 0;
    const splashPositions: Point[] = [];
    const splashDamages: number[] = [];
    const splashExcludeIds: number[] = [];
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
        splashPositions.push({ ...hit.hitPosition });
        splashDamages.push(hit.damage * 0.5);
        splashExcludeIds.push(hit.targetId);
      }

      if (wasAlive && target.health <= 0) {
        target.active = false;
        scoreGain += 10;
        killedPositions.push({ ...target.position });
      }

      updatedEnemies[targetIdx] = target;
    }

    for (let si = 0; si < splashPositions.length; si++) {
      const splashEnemies = getEnemiesInRadius(splashPositions[si], updatedEnemies, 30);
      for (const e of splashEnemies) {
        if (e.id === splashExcludeIds[si]) continue;
        if (e.health <= 0) continue;
        const idx = updatedEnemies.findIndex((en) => en.id === e.id);
        if (idx === -1) continue;
        const wasAlive = updatedEnemies[idx].health > 0;
        const updated = { ...updatedEnemies[idx] };
        updated.health -= splashDamages[si];
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

    const newSplashEffects: SplashEffect[] = [...state.splashEffects];
    for (const pos of splashPositions) {
      newSplashEffects.push({
        id: ++effectIdCounter,
        position: { ...pos },
        fragments: createSplashFragments(),
        timer: 200,
        maxTimer: 200,
      });
    }

    const newIceParticles: IceParticle[] = [...state.iceParticles];
    for (const pos of icePositions) {
      newIceParticles.push(...createIceParticles(pos));
    }

    const newFloatingScores: FloatingScore[] = [...state.floatingScores];
    for (const pos of killedPositions) {
      newFloatingScores.push(createFloatingScore(pos, 10));
    }

    const updatedSplash = newSplashEffects
      .map((s) => {
        const t = s.timer - deltaTime;
        const progress = 1 - t / s.maxTimer;
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

    const updatedIce = newIceParticles
      .map((p) => ({ ...p, timer: p.timer - deltaTime }))
      .filter((p) => p.timer > 0);

    const updatedFloating = newFloatingScores
      .map((f) => {
        const elapsed = f.maxTimer - f.timer + deltaTime;
        return {
          ...f,
          timer: f.timer - deltaTime,
          position: {
            ...f.position,
            y: f.position.y - (deltaTime / f.maxTimer) * 40,
          },
        };
      })
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
