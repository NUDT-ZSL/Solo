import { create } from 'zustand';

export type TowerType = 'arrow' | 'cannon' | 'magic';

export interface Point {
  x: number;
  y: number;
}

export interface Checkpoint {
  position: Point;
  index: number;
  activated: boolean;
}

export interface Enemy {
  id: number;
  position: Point;
  pathProgress: number;
  currentSegment: number;
  health: number;
  maxHealth: number;
  baseSpeed: number;
  speed: number;
  speedBoostTimer: number;
  slowTimer: number;
  passedCheckpoints: number;
  isFlashing: boolean;
  flashTimer: number;
  active: boolean;
}

export interface Tower {
  id: number;
  type: TowerType;
  position: Point;
  gridIndex: number;
  range: number;
  damage: number;
  cooldown: number;
  currentCooldown: number;
  rotation: number;
  targetRotation: number;
  rotationTimer: number;
  isPlacing: boolean;
  placeTimer: number;
  slowEffect: number;
}

export interface Projectile {
  id: number;
  towerType: TowerType;
  position: Point;
  targetId: number;
  damage: number;
  speed: number;
  active: boolean;
}

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

export interface TowerStats {
  range: number;
  damage: number;
  cooldown: number;
  color: string;
  slowEffect: number;
  name: string;
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
  arrow: {
    range: 120,
    damage: 10,
    cooldown: 1000,
    color: '#8B4513',
    slowEffect: 0,
    name: '箭塔',
  },
  cannon: {
    range: 80,
    damage: 25,
    cooldown: 2500,
    color: '#555555',
    slowEffect: 0,
    name: '炮塔',
  },
  magic: {
    range: 150,
    damage: 15,
    cooldown: 1800,
    color: '#4B0082',
    slowEffect: 0.5,
    name: '魔法塔',
  },
};

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
  nextEnemyId: number;
  nextTowerId: number;
  nextProjectileId: number;
  nextEffectId: number;
  screenShakeTimer: number;
  screenFlashTimer: number;
  spawnTimer: number;

  addEnemy: () => void;
  placeTower: (gridIndex: number, position: Point) => boolean;
  setSelectedTowerType: (type: TowerType) => void;
  updateEnemies: (deltaTime: number, path: Point[], checkpoints: Checkpoint[]) => void;
  updateTowers: (deltaTime: number) => { towerId: number; targetId: number; damage: number; towerType: TowerType }[];
  addProjectile: (towerId: number, towerType: TowerType, targetId: number, damage: number, position: Point) => void;
  updateProjectiles: (deltaTime: number) => void;
  damageEnemy: (enemyId: number, damage: number, towerType: TowerType) => void;
  splashDamage: (position: Point, damage: number, radius: number, excludeId: number) => void;
  addSplashEffect: (position: Point) => void;
  addIceParticles: (position: Point) => void;
  addFloatingScore: (position: Point, value: number) => void;
  updateEffects: (deltaTime: number) => void;
  loseLife: () => void;
  triggerScreenShake: () => void;
  triggerScreenFlash: () => void;
  resetGame: () => void;
}

let enemyIdCounter = 0;
let towerIdCounter = 0;
let projectileIdCounter = 0;
let effectIdCounter = 0;

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
  nextEnemyId: 0,
  nextTowerId: 0,
  nextProjectileId: 0,
  nextEffectId: 0,
  screenShakeTimer: 0,
  screenFlashTimer: 0,
  spawnTimer: 0,

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
      speedBoostTimer: 0,
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

  updateEnemies: (deltaTime: number, path: Point[], checkpoints: Checkpoint[]) => {
    const state = get();
    if (state.gameOver) return;

    const updatedEnemies: Enemy[] = [];

    for (const enemy of state.enemies) {
      if (!enemy.active) continue;

      let e = { ...enemy };

      if (e.flashTimer > 0) {
        e.flashTimer -= deltaTime;
        e.isFlashing = e.flashTimer > 0;
      }

      if (e.speedBoostTimer > 0) {
        e.speedBoostTimer -= deltaTime;
      }
      if (e.slowTimer > 0) {
        e.slowTimer -= deltaTime;
      }

      const checkpointBonus = 1 + e.passedCheckpoints * 0.05;
      const boostMultiplier = e.speedBoostTimer > 0 ? 1.2 : 1;
      const slowMultiplier = e.slowTimer > 0 ? 0.5 : 1;
      e.speed = e.baseSpeed * checkpointBonus * boostMultiplier * slowMultiplier;

      const segmentStart = path[e.currentSegment];
      const segmentEnd = path[e.currentSegment + 1];

      if (!segmentEnd) {
        e.active = false;
        continue;
      }

      const dx = segmentEnd.x - segmentStart.x;
      const dy = segmentEnd.y - segmentStart.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      const moveDistance = (e.speed * deltaTime) / 1000;

      e.pathProgress += moveDistance / segmentLength;

      while (e.pathProgress >= 1 && e.currentSegment < path.length - 1) {
        e.pathProgress -= 1;
        e.currentSegment++;

        if (e.currentSegment >= path.length - 1) {
          break;
        }
      }

      if (e.currentSegment >= path.length - 1) {
        e.active = false;
        get().loseLife();
        continue;
      }

      const currentStart = path[e.currentSegment];
      const currentEnd = path[e.currentSegment + 1];
      e.position = {
        x: currentStart.x + (currentEnd.x - currentStart.x) * e.pathProgress,
        y: currentStart.y + (currentEnd.y - currentStart.y) * e.pathProgress,
      };

      for (const cp of checkpoints) {
        const dist = Math.sqrt(
          Math.pow(e.position.x - cp.position.x, 2) +
          Math.pow(e.position.y - cp.position.y, 2)
        );
        if (dist < 20 && !cp.activated) {
          e.speedBoostTimer = 2000;
          cp.activated = true;
          e.passedCheckpoints++;
        }
      }

      updatedEnemies.push(e);
    }

    set({ enemies: updatedEnemies });
  },

  updateTowers: (deltaTime: number) => {
    const { towers, enemies } = get();
    const attackEvents: { towerId: number; targetId: number; damage: number; towerType: TowerType }[] = [];

    const updatedTowers = towers.map((tower) => {
      let t = { ...tower };

      if (t.isPlacing) {
        t.placeTimer -= deltaTime;
        if (t.placeTimer <= 0) {
          t.isPlacing = false;
        }
      }

      if (t.rotationTimer > 0) {
        t.rotationTimer -= deltaTime;
        const progress = 1 - t.rotationTimer / 200;
        t.rotation = t.rotation + (t.targetRotation - t.rotation) * Math.min(progress, 1);
      }

      if (t.currentCooldown > 0) {
        t.currentCooldown -= deltaTime;
      }

      let closestEnemy: Enemy | null = null;
      let closestDist = Infinity;

      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = Math.sqrt(
          Math.pow(enemy.position.x - t.position.x, 2) +
          Math.pow(enemy.position.y - t.position.y, 2)
        );
        if (dist <= t.range && dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }

      if (closestEnemy) {
        const angle = Math.atan2(
          closestEnemy.position.y - t.position.y,
          closestEnemy.position.x - t.position.x
        );
        t.targetRotation = angle;
        t.rotationTimer = 200;

        if (t.currentCooldown <= 0) {
          t.currentCooldown = t.cooldown;
          attackEvents.push({
            towerId: t.id,
            targetId: closestEnemy.id,
            damage: t.damage,
            towerType: t.type,
          });
        }
      }

      return t;
    });

    set({ towers: updatedTowers });
    return attackEvents;
  },

  addProjectile: (towerId: number, towerType: TowerType, targetId: number, damage: number, position: Point) => {
    const { projectiles } = get();
    const newProjectile: Projectile = {
      id: ++projectileIdCounter,
      towerType,
      position: { ...position },
      targetId,
      damage,
      speed: 200,
      active: true,
    };
    set({ projectiles: [...projectiles, newProjectile] });
  },

  updateProjectiles: (deltaTime: number) => {
    const { projectiles, enemies } = get();
    const updatedProjectiles: Projectile[] = [];

    for (const proj of projectiles) {
      if (!proj.active) continue;

      let p = { ...proj };
      const target = enemies.find((e) => e.id === p.targetId && e.active);

      if (!target) {
        continue;
      }

      const dx = target.position.x - p.position.x;
      const dy = target.position.y - p.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDistance = (p.speed * deltaTime) / 1000;

      if (dist <= moveDistance) {
        get().damageEnemy(target.id, p.damage, p.towerType);
        if (p.towerType === 'cannon') {
          get().addSplashEffect(target.position);
          get().splashDamage(target.position, p.damage * 0.5, 30, target.id);
        }
        if (p.towerType === 'magic') {
          get().addIceParticles(target.position);
        }
        get().triggerScreenFlash();
      } else {
        p.position = {
          x: p.position.x + (dx / dist) * moveDistance,
          y: p.position.y + (dy / dist) * moveDistance,
        };
        updatedProjectiles.push(p);
      }
    }

    set({ projectiles: updatedProjectiles });
  },

  damageEnemy: (enemyId: number, damage: number, towerType: TowerType) => {
    const { enemies, score } = get();
    let scoreGain = 0;

    const updatedEnemies = enemies.map((e) => {
      if (e.id !== enemyId) return e;
      let newEnemy = { ...e };
      newEnemy.health -= damage;
      newEnemy.isFlashing = true;
      newEnemy.flashTimer = 150;
      if (towerType === 'magic') {
        newEnemy.slowTimer = 500;
      }
      if (newEnemy.health <= 0) {
        newEnemy.active = false;
        scoreGain += 10;
      }
      return newEnemy;
    });

    if (scoreGain > 0) {
      const killedEnemy = enemies.find((e) => e.id === enemyId);
      if (killedEnemy) {
        get().addFloatingScore(killedEnemy.position, scoreGain);
      }
    }

    set({ enemies: updatedEnemies, score: score + scoreGain });
  },

  splashDamage: (position: Point, damage: number, radius: number, excludeId: number) => {
    const { enemies } = get();
    const updatedEnemies = enemies.map((e) => {
      if (e.id === excludeId || !e.active) return e;
      const dist = Math.sqrt(
        Math.pow(e.position.x - position.x, 2) +
        Math.pow(e.position.y - position.y, 2)
      );
      if (dist <= radius) {
        let newEnemy = { ...e };
        newEnemy.health -= damage;
        newEnemy.isFlashing = true;
        newEnemy.flashTimer = 150;
        if (newEnemy.health <= 0) {
          newEnemy.active = false;
        }
        return newEnemy;
      }
      return e;
    });

    const killed = enemies.filter((e, i) => e.health > 0 && updatedEnemies[i].health <= 0);
    if (killed.length > 0) {
      killed.forEach((k) => get().addFloatingScore(k.position, 10));
    }

    set({ enemies: updatedEnemies });
  },

  addSplashEffect: (position: Point) => {
    const { splashEffects } = get();
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
    set({ splashEffects: [...splashEffects, effect] });
  },

  addIceParticles: (position: Point) => {
    const { iceParticles } = get();
    const particles = Array.from({ length: 6 }, (_, i) => ({
      id: ++effectIdCounter,
      position: { ...position },
      timer: 500,
      offsetX: Math.cos((i / 6) * Math.PI * 2) * 15,
      offsetY: Math.sin((i / 6) * Math.PI * 2) * 15,
    }));
    set({ iceParticles: [...iceParticles, ...particles] });
  },

  addFloatingScore: (position: Point, value: number) => {
    const { floatingScores, score } = get();
    const fs: FloatingScore = {
      id: ++effectIdCounter,
      position: { ...position },
      value,
      timer: 500,
    };
    set({ floatingScores: [...floatingScores, fs] });
  },

  updateEffects: (deltaTime: number) => {
    const { splashEffects, iceParticles, floatingScores, screenShakeTimer, screenFlashTimer } = get();

    const updatedSplash = splashEffects
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

    const updatedIce = iceParticles
      .map((p) => ({ ...p, timer: p.timer - deltaTime }))
      .filter((p) => p.timer > 0);

    const updatedFloating = floatingScores
      .map((f) => ({
        ...f,
        timer: f.timer - deltaTime,
        position: { ...f.position, y: f.position.y - (deltaTime / 500) * 30 },
      }))
      .filter((f) => f.timer > 0);

    set({
      splashEffects: updatedSplash,
      iceParticles: updatedIce,
      floatingScores: updatedFloating,
      screenShakeTimer: Math.max(0, screenShakeTimer - deltaTime),
      screenFlashTimer: Math.max(0, screenFlashTimer - deltaTime),
    });
  },

  loseLife: () => {
    const { lives } = get();
    const newLives = Math.max(0, lives - 1);
    if (newLives <= 0) {
      set({ lives: 0, gameOver: true });
    } else {
      set({ lives: newLives });
    }
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
      nextEnemyId: 0,
      nextTowerId: 0,
      nextProjectileId: 0,
      nextEffectId: 0,
      screenShakeTimer: 0,
      screenFlashTimer: 0,
      spawnTimer: 0,
    });
  },
}));
