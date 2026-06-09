import type {
  GameEntity,
  BoatEntity,
  IslandEntity,
  VortexEntity,
  StardustEntity,
  BossEntity,
  ProjectileEntity,
  GameState
} from '../types/gameTypes';
import { generateId, randRange, randInt, clamp } from '../utils/helpers';

export interface EntityManager {
  entities: GameEntity[];
  boat: BoatEntity;
  init: (canvasWidth: number, canvasHeight: number) => void;
  update: (dt: number, state: GameState, canvasWidth: number, canvasHeight: number) => void;
  getBoat: () => BoatEntity;
  getIslands: () => IslandEntity[];
  getVortexes: () => VortexEntity[];
  getStardusts: () => StardustEntity[];
  getBoss: () => BossEntity | null;
  getProjectiles: () => ProjectileEntity[];
  removeEntity: (id: string) => void;
  spawnBoss: (canvasWidth: number, cameraY: number) => void;
  removeBoss: () => void;
  fireProjectile: (cameraY: number) => void;
  reset: (canvasWidth: number, canvasHeight: number) => void;
}

let entityCounter = 0;
const nextId = () => `${generateId()}_${++entityCounter}`;

export function createEntityManager(): EntityManager {
  const entities: GameEntity[] = [];
  let boat: BoatEntity;
  let bossEntity: BossEntity | null = null;

  function createBoat(canvasWidth: number, canvasHeight: number): BoatEntity {
    return {
      id: nextId(),
      type: 'boat',
      x: canvasWidth / 2,
      y: canvasHeight * 0.75,
      alive: true,
      speed: 60,
      glowIntensity: 0,
      glowTimer: 0,
      slowTimer: 0,
      blinkPhase: 0
    };
  }

  function createIsland(cameraY: number, canvasWidth: number, canvasHeight: number): IslandEntity {
    const margin = 60;
    return {
      id: nextId(),
      type: 'island',
      x: randRange(margin, canvasWidth - margin),
      y: cameraY - randRange(50, canvasHeight * 0.8),
      alive: true,
      width: randRange(60, 100),
      height: randRange(40, 80),
      rotation: randRange(-0.3, 0.3)
    };
  }

  function createVortex(cameraY: number, canvasWidth: number, canvasHeight: number): VortexEntity {
    const margin = 80;
    return {
      id: nextId(),
      type: 'vortex',
      x: randRange(margin, canvasWidth - margin),
      y: cameraY - randRange(100, canvasHeight * 0.9),
      alive: true,
      radius: 40,
      rotation: 0,
      rotationSpeed: 2
    };
  }

  function createStardust(cameraY: number, canvasWidth: number, canvasHeight: number): StardustEntity {
    const margin = 50;
    return {
      id: nextId(),
      type: 'stardust',
      x: randRange(margin, canvasWidth - margin),
      y: cameraY - randRange(50, canvasHeight * 0.9),
      alive: true,
      radius: 6,
      blinkPhase: randRange(0, Math.PI * 2)
    };
  }

  function createBoss(canvasWidth: number, cameraY: number): BossEntity {
    const initialRadius = randRange(80, 120);
    const verts = randInt(8, 12);
    const health = Math.floor((initialRadius - 75) / 5) + 10;
    return {
      id: nextId(),
      type: 'boss',
      x: canvasWidth / 2,
      y: cameraY + 200,
      alive: true,
      radius: initialRadius,
      initialRadius,
      vertices: verts,
      horizontalSpeed: 100,
      direction: 1,
      health,
      maxHealth: health
    };
  }

  function createProjectile(boat: BoatEntity, cameraY: number): ProjectileEntity {
    return {
      id: nextId(),
      type: 'projectile',
      x: boat.x,
      y: boat.y - 20,
      alive: true,
      radius: 8,
      velocityY: -350
    };
  }

  function init(canvasWidth: number, canvasHeight: number) {
    while (entities.length > 0) entities.pop();
    boat = createBoat(canvasWidth, canvasHeight);
    entities.push(boat);
    bossEntity = null;

    for (let i = 0; i < 10; i++) {
      entities.push(createIsland(0, canvasWidth, canvasHeight));
    }
    for (let i = 0; i < 6; i++) {
      entities.push(createVortex(0, canvasWidth, canvasHeight));
    }
    for (let i = 0; i < 15; i++) {
      entities.push(createStardust(0, canvasWidth, canvasHeight));
    }
  }

  function reset(canvasWidth: number, canvasHeight: number) {
    init(canvasWidth, canvasHeight);
  }

  function update(dt: number, state: GameState, canvasWidth: number, canvasHeight: number) {
    const scrollSpeed = state.riverSpeed;

    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (!e.alive) {
        entities.splice(i, 1);
        continue;
      }

      switch (e.type) {
        case 'boat': {
          const b = e as BoatEntity;
          const targetX = clamp(state.boatTargetX, 30, canvasWidth - 30);
          const dx = targetX - b.x;
          const moveSpeed = 200;
          const maxMove = moveSpeed * dt;
          if (Math.abs(dx) > 1) {
            b.x += Math.sign(dx) * Math.min(Math.abs(dx), maxMove);
          }

          let effSpeed = scrollSpeed;
          if (b.slowTimer > 0) {
            b.slowTimer -= dt;
            effSpeed *= 0.7;
          }
          b.y -= effSpeed * dt;
          if (b.glowTimer > 0) {
            b.glowTimer -= dt;
            if (b.glowTimer <= 0) b.glowIntensity = 0;
          }
          b.blinkPhase += dt;
          boat = b;
          break;
        }

        case 'island': {
          e.y += scrollSpeed * dt;
          if (e.y - 100 > state.cameraY + canvasHeight + 100) {
            const idx = entities.indexOf(e);
            if (idx > -1) entities.splice(idx, 1);
          }
          break;
        }

        case 'vortex': {
          const v = e as VortexEntity;
          v.y += scrollSpeed * dt;
          v.rotation += v.rotationSpeed * dt;
          if (v.y - 100 > state.cameraY + canvasHeight + 100) {
            const idx = entities.indexOf(e);
            if (idx > -1) entities.splice(idx, 1);
          }
          break;
        }

        case 'stardust': {
          const s = e as StardustEntity;
          s.y += scrollSpeed * dt;
          s.blinkPhase += dt * (Math.PI * 2 / 0.3);
          if (s.y - 50 > state.cameraY + canvasHeight + 50) {
            const idx = entities.indexOf(e);
            if (idx > -1) entities.splice(idx, 1);
          }
          break;
        }

        case 'boss': {
          const boss = e as BossEntity;
          boss.x += boss.direction * boss.horizontalSpeed * dt;
          if (boss.x - boss.radius < 30) {
            boss.x = 30 + boss.radius;
            boss.direction = 1;
          }
          if (boss.x + boss.radius > canvasWidth - 30) {
            boss.x = canvasWidth - 30 - boss.radius;
            boss.direction = -1;
          }
          boss.y = state.cameraY + canvasHeight * 0.25;
          break;
        }

        case 'projectile': {
          const p = e as ProjectileEntity;
          p.y += p.velocityY * dt;
          if (p.y < state.cameraY - 50) {
            e.alive = false;
          }
          break;
        }
      }
    }

    if (state.phase === 'playing') {
      const islandCount = entities.filter(en => en.type === 'island').length;
      const maxIslands = Math.ceil(20 * state.islandDensity);
      if (islandCount < maxIslands) {
        entities.push(createIsland(state.cameraY, canvasWidth, canvasHeight));
      }

      const vortexCount = entities.filter(en => en.type === 'vortex').length;
      const maxVortexes = Math.ceil(15 * state.islandDensity);
      if (vortexCount < maxVortexes) {
        entities.push(createVortex(state.cameraY, canvasWidth, canvasHeight));
      }

      const sdCount = entities.filter(en => en.type === 'stardust').length;
      if (sdCount < 30) {
        entities.push(createStardust(state.cameraY, canvasWidth, canvasHeight));
      }
    }
  }

  function getBoat(): BoatEntity {
    return boat;
  }

  function getIslands(): IslandEntity[] {
    return entities.filter(e => e.type === 'island') as IslandEntity[];
  }

  function getVortexes(): VortexEntity[] {
    return entities.filter(e => e.type === 'vortex') as VortexEntity[];
  }

  function getStardusts(): StardustEntity[] {
    return entities.filter(e => e.type === 'stardust') as StardustEntity[];
  }

  function getBoss(): BossEntity | null {
    return (entities.find(e => e.type === 'boss') as BossEntity) || null;
  }

  function getProjectiles(): ProjectileEntity[] {
    return entities.filter(e => e.type === 'projectile') as ProjectileEntity[];
  }

  function removeEntity(id: string) {
    const idx = entities.findIndex(e => e.id === id);
    if (idx > -1) entities[idx].alive = false;
  }

  function spawnBoss(canvasWidth: number, cameraY: number) {
    if (bossEntity) return;
    bossEntity = createBoss(canvasWidth, cameraY);
    entities.push(bossEntity);
  }

  function removeBoss() {
    if (bossEntity) {
      bossEntity.alive = false;
      bossEntity = null;
    }
  }

  function fireProjectile(cameraY: number) {
    const p = createProjectile(boat, cameraY);
    entities.push(p);
  }

  return {
    entities,
    boat: null as unknown as BoatEntity,
    init,
    update,
    getBoat,
    getIslands,
    getVortexes,
    getStardusts,
    getBoss,
    getProjectiles,
    removeEntity,
    spawnBoss,
    removeBoss,
    fireProjectile,
    reset
  };
}
