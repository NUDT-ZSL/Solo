import { create } from 'zustand';
import type { Vector3, Asteroid, Laser, Particle } from './gameLogic';
import { generateInitialAsteroids, generateId } from './gameLogic';

type GamePhase = 'title' | 'playing' | 'gameover';

export interface GameState {
  phase: GamePhase;
  score: number;
  destroyedCount: number;
  startTime: number;
  elapsedTime: number;

  shipPosition: Vector3;
  shipRotation: { x: number; y: number; z: number };
  shipRoll: number;
  shipTargetRoll: number;
  shipRollTransition: number;
  shipHealth: number;
  isInvincible: boolean;
  flashTimer: number;
  flashVisible: boolean;

  asteroids: Asteroid[];
  lasers: Laser[];
  particles: Particle[];

  lastShotTime: number;
  showWarning: boolean;
  warningStartTime: number;

  cameraPitch: number;
  cameraYaw: number;

  fadeOpacity: number;
  titleVisible: boolean;
  titleAnimationDone: boolean;
  _startRoll: number;
  _damageTime: number;

  setPhase: (phase: GamePhase) => void;
  startGame: () => void;
  restartGame: () => void;
  completeTitleAnimation: () => void;
  setFadeOpacity: (v: number) => void;

  setShipPosition: (p: Vector3) => void;
  setShipRotation: (r: { x: number; y: number; z: number }) => void;
  setShipTargetRoll: (r: number) => void;
  updateShipRoll: (delta: number) => void;
  setCameraAngles: (pitch: number, yaw: number) => void;

  update: (delta: number) => void;
  addScore: (amount: number) => void;
  takeDamage: () => void;
  triggerWarning: () => void;

  fireLaser: (position: Vector3, direction: Vector3) => boolean;
  setLasers: (lasers: Laser[]) => void;
  setAsteroids: (asteroids: Asteroid[]) => void;
  setParticles: (particles: Particle[]) => void;

  destroyAsteroid: (id: string, position: Vector3, radius: number) => void;
}

const SHIP_RADIUS = 0.6;
const LASER_SPEED = 1.2;
const LASER_LIFE = 2.5;
const SHOT_COOLDOWN = 0.3;
const ROLL_TRANSITION_TIME = 0.3;
const INVINCIBLE_TIME = 1.5;
const FLASH_INTERVAL = 0.1;
const TOTAL_FLASHES = 3;
const WARNING_DURATION = 0.5;

function createInitialParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 200; i++) {
    particles.push({
      id: `pool-${i}`,
      active: false,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      life: 0,
      maxLife: 1,
      startColor: '#ffffff',
      endColor: '#ffffff',
      startSize: 0,
      endSize: 0,
      type: 'tail',
    });
  }
  return particles;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'title',
  score: 0,
  destroyedCount: 0,
  startTime: 0,
  elapsedTime: 0,

  shipPosition: { x: 0, y: 0, z: 0 },
  shipRotation: { x: 0, y: 0, z: 0 },
  shipRoll: 0,
  shipTargetRoll: 0,
  shipRollTransition: 0,
  shipHealth: 3,
  isInvincible: false,
  flashTimer: 0,
  flashVisible: true,

  asteroids: [],
  lasers: [],
  particles: createInitialParticles(),

  lastShotTime: 0,
  showWarning: false,
  warningStartTime: 0,

  cameraPitch: 0.2,
  cameraYaw: 0,

  fadeOpacity: 1,
  titleVisible: true,
  titleAnimationDone: false,
  _startRoll: 0,
  _damageTime: 0,

  setPhase: (phase) => set({ phase }),

  startGame: () => {
    const now = performance.now() / 1000;
    set({
      phase: 'playing',
      score: 0,
      destroyedCount: 0,
      startTime: now,
      elapsedTime: 0,
      shipPosition: { x: 0, y: 0, z: 0 },
      shipRotation: { x: 0, y: 0, z: 0 },
      shipRoll: 0,
      shipTargetRoll: 0,
      shipRollTransition: 0,
      shipHealth: 3,
      isInvincible: false,
      flashTimer: 0,
      flashVisible: true,
      asteroids: generateInitialAsteroids({ x: 0, y: 0, z: 0 }, 40),
      lasers: [],
      particles: createInitialParticles(),
      lastShotTime: 0,
      showWarning: false,
      cameraPitch: 0.2,
      cameraYaw: 0,
    });
  },

  restartGame: () => {
    set({
      phase: 'title',
      fadeOpacity: 1,
      titleVisible: true,
      titleAnimationDone: false,
    });
  },

  completeTitleAnimation: () => set({ titleAnimationDone: true }),
  setFadeOpacity: (v) => set({ fadeOpacity: v }),

  setShipPosition: (p) => set({ shipPosition: p }),
  setShipRotation: (r) => set({ shipRotation: r }),
  setShipTargetRoll: (r) => {
    const clamped = Math.max(-30, Math.min(30, r));
    set({ shipTargetRoll: clamped, shipRollTransition: 0 });
  },
  updateShipRoll: (delta) => {
    const { shipRoll, shipTargetRoll, shipRollTransition } = get();
    if (Math.abs(shipRoll - shipTargetRoll) < 0.01 && shipRollTransition >= ROLL_TRANSITION_TIME) {
      return;
    }
    const t = Math.min(1, (shipRollTransition + delta) / ROLL_TRANSITION_TIME);
    const easeT = 1 - Math.pow(1 - t, 3);
    const startRoll = shipRollTransition === 0 ? shipRoll : (get() as any)._startRoll ?? 0;
    const newRoll = startRoll + (shipTargetRoll - startRoll) * easeT;
    set({
      shipRoll: newRoll,
      shipRollTransition: shipRollTransition + delta,
      _startRoll: shipRollTransition === 0 ? shipRoll : (get() as any)._startRoll ?? shipRoll,
    });
  },
  setCameraAngles: (pitch, yaw) => {
    const clampedPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
    set({ cameraPitch: clampedPitch, cameraYaw: yaw });
  },

  update: (delta) => {
    const s = get();
    if (s.phase !== 'playing') return;

    const now = performance.now() / 1000;
    set({ elapsedTime: now - s.startTime });

    if (s.isInvincible) {
      const elapsed = now - (s as any)._damageTime;
      if (elapsed >= INVINCIBLE_TIME) {
        set({ isInvincible: false, flashVisible: true });
      } else {
        const flashCount = Math.floor(elapsed / FLASH_INTERVAL);
        set({ flashVisible: flashCount % 2 === 0 });
      }
    }

    if (s.showWarning) {
      if (now - s.warningStartTime >= WARNING_DURATION) {
        set({ showWarning: false });
      }
    }

    get().updateShipRoll(delta);
  },

  addScore: (amount) => {
    const s = get();
    set({ score: s.score + amount, destroyedCount: s.destroyedCount + 1 });
  },

  takeDamage: () => {
    const s = get();
    if (s.isInvincible || s.phase !== 'playing') return;

    const newHealth = s.shipHealth - 1;
    const now = performance.now() / 1000;

    if (newHealth <= 0) {
      set({
        shipHealth: 0,
        phase: 'gameover',
      });
    } else {
      set({
        shipHealth: newHealth,
        isInvincible: true,
        flashTimer: TOTAL_FLASHES * FLASH_INTERVAL * 2,
        flashVisible: true,
        showWarning: true,
        warningStartTime: now,
        _damageTime: now,
      });
    }
  },

  triggerWarning: () => {
    set({ showWarning: true, warningStartTime: performance.now() / 1000 });
  },

  fireLaser: (position, direction) => {
    const s = get();
    const now = performance.now() / 1000;
    if (now - s.lastShotTime < SHOT_COOLDOWN) return false;

    const laser: Laser = {
      id: generateId(),
      position: { ...position },
      direction: { ...direction },
      speed: LASER_SPEED,
      life: LASER_LIFE,
    };
    set({ lasers: [...s.lasers, laser], lastShotTime: now });
    return true;
  },

  setLasers: (lasers) => set({ lasers }),
  setAsteroids: (asteroids) => set({ asteroids }),
  setParticles: (particles) => set({ particles }),

  destroyAsteroid: (id, position, radius) => {
    const s = get();
    const baseScore = Math.round((2 - Math.min(2, radius)) * 50) + 50;
    set({ score: s.score + baseScore, destroyedCount: s.destroyedCount + 1 });
  },
}));

export { SHIP_RADIUS };
