import { create } from 'zustand';
import type { Particle } from './utils';

export type BuffType = 'attack' | 'speed';
export type EntityType = 'player' | 'ai';

export interface Buff {
  id: number;
  type: BuffType;
  entity: EntityType;
  duration: number;
  maxDuration: number;
  color: string;
}

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: BuffType;
  color: string;
  rotation: number;
  collected: boolean;
}

export interface EnergyBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: EntityType;
  damage: number;
  radius: number;
}

export interface Knockback {
  entity: EntityType;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  duration: number;
  elapsed: number;
}

export interface SpeedLine {
  id: number;
  x: number;
  y: number;
  length: number;
  speed: number;
}

export interface Character {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  isCharging: boolean;
  chargeTime: number;
  onGround: boolean;
  facing: number;
}

export interface GameState {
  canvasWidth: number;
  canvasHeight: number;
  arenaWidth: number;
  arenaHeight: number;
  arenaX: number;
  arenaY: number;
  wallThickness: number;
  groundY: number;
  gravity: number;
  jumpForce: number;
  moveSpeed: number;

  player: Character;
  ai: Character;

  energyBalls: EnergyBall[];
  particles: Particle[];
  powerUps: PowerUp[];
  buffs: Buff[];
  knockbacks: Knockback[];
  speedLines: SpeedLine[];

  combo: number;
  comboStartTime: number;
  comboResetTime: number;
  buffPulsePhase: number;

  gameTime: number;
  isRunning: boolean;
  isPaused: boolean;

  mouseX: number;
  mouseY: number;

  keys: Record<string, boolean>;
}

export interface GameActions {
  setCanvasSize: (width: number, height: number) => void;
  setKey: (key: string, value: boolean) => void;
  setMousePosition: (x: number, y: number) => void;
  setPlayerCharging: (charging: boolean) => void;
  spawnEnergyBall: (owner: EntityType, targetX: number, targetY: number) => void;
  addParticles: (particles: Particle[]) => void;
  applyDamage: (target: EntityType, damage: number, knockbackDirX: number, knockbackDirY: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  addBuff: (entity: EntityType, type: BuffType, color: string) => void;
  removeBuff: (id: number) => void;
  collectPowerUp: (id: number, entity: EntityType) => void;
  spawnPowerUp: () => void;
  update: (deltaTime: number) => void;
  resetGame: () => void;
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
}

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 400;
const WALL_THICKNESS = 20;
const GRAVITY = 1200;
const JUMP_FORCE = -500;
const MOVE_SPEED = 200;

let nextId = 1;
const generateId = () => nextId++;

const createInitialCharacter = (x: number): Character => ({
  x,
  y: ARENA_HEIGHT - 80,
  vx: 0,
  vy: 0,
  width: 40,
  height: 60,
  hp: 100,
  maxHp: 100,
  energy: 0,
  maxEnergy: 100,
  isCharging: false,
  chargeTime: 0,
  onGround: true,
  facing: 1
});

const createInitialState = (): GameState => ({
  canvasWidth: 800,
  canvasHeight: 500,
  arenaWidth: ARENA_WIDTH,
  arenaHeight: ARENA_HEIGHT,
  arenaX: 0,
  arenaY: 0,
  wallThickness: WALL_THICKNESS,
  groundY: ARENA_HEIGHT - 20,
  gravity: GRAVITY,
  jumpForce: JUMP_FORCE,
  moveSpeed: MOVE_SPEED,

  player: createInitialCharacter(ARENA_WIDTH / 2 - 20),
  ai: createInitialCharacter(ARENA_WIDTH - 100),

  energyBalls: [],
  particles: [],
  powerUps: [],
  buffs: [],
  knockbacks: [],
  speedLines: [],

  combo: 0,
  comboStartTime: -999,
  comboResetTime: 3,
  buffPulsePhase: 0,

  gameTime: 0,
  isRunning: true,
  isPaused: false,

  mouseX: 0,
  mouseY: 0,

  keys: {}
});

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...createInitialState(),

  setCanvasSize: (width, height) => {
    const arenaX = Math.max(0, (width - ARENA_WIDTH) / 2);
    const arenaY = Math.max(0, (height - ARENA_HEIGHT) / 2);
    set({
      canvasWidth: width,
      canvasHeight: height,
      arenaX,
      arenaY
    });
  },

  setKey: (key, value) => {
    set(state => ({
      keys: { ...state.keys, [key]: value }
    }));
  },

  setMousePosition: (x, y) => {
    set({ mouseX: x, mouseY: y });
  },

  setPlayerCharging: (charging) => {
    if (charging) {
      set(state => ({
        player: { ...state.player, isCharging: true, chargeTime: 0 }
      }));
    } else {
      const state = get();
      if (state.player.chargeTime >= 0.5) {
        const { player, mouseX, mouseY, arenaX, arenaY, buffs } = state;
        const playerBuff = buffs.find(b => b.entity === 'player' && b.type === 'attack');
        const damage = playerBuff ? 20 : 10;
        
        const screenCenterX = arenaX + player.x + player.width / 2;
        const screenCenterY = arenaY + player.y + player.height / 2;
        
        const dx = mouseX - screenCenterX;
        const dy = mouseY - screenCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const speed = 300;
          get().spawnEnergyBall('player', player.x + player.width / 2 + (dx / dist) * 1000, player.y + player.height / 2 + (dy / dist) * 1000);
        }
      }
      set(state => ({
        player: { ...state.player, isCharging: false, chargeTime: 0 }
      }));
    }
  },

  spawnEnergyBall: (owner, targetX, targetY) => {
    const state = get();
    const character = owner === 'player' ? state.player : state.ai;
    const startX = character.x + character.width / 2;
    const startY = character.y + character.height / 2;
    
    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    
    const ownerBuff = state.buffs.find(b => b.entity === owner && b.type === 'attack');
    const damage = ownerBuff ? 20 : 10;
    
    const ball: EnergyBall = {
      id: generateId(),
      x: startX,
      y: startY,
      vx: (dx / dist) * 300,
      vy: (dy / dist) * 300,
      owner,
      damage,
      radius: 20
    };
    
    set(s => ({ energyBalls: [...s.energyBalls, ball] }));
  },

  addParticles: (newParticles) => {
    set(state => {
      const combined = [...state.particles, ...newParticles];
      const limited = combined.length > 30 ? combined.slice(-30) : combined;
      return { particles: limited };
    });
  },

  applyDamage: (target, damage, knockbackDirX, knockbackDirY) => {
    set(state => {
      const character = target === 'player' ? state.player : state.ai;
      const newHp = Math.max(0, character.hp - damage);
      
      const knockbackDist = 80;
      const kbMag = Math.sqrt(knockbackDirX * knockbackDirX + knockbackDirY * knockbackDirY) || 1;
      
      const knockback: Knockback = {
        entity: target,
        startX: character.x,
        startY: character.y,
        targetX: character.x + (knockbackDirX / kbMag) * knockbackDist,
        targetY: character.y + Math.min(0, (knockbackDirY / kbMag)) * knockbackDist * 0.5,
        duration: 0.2,
        elapsed: 0
      };
      
      if (target === 'player') {
        return {
          player: { ...character, hp: newHp },
          knockbacks: [...state.knockbacks, knockback]
        };
      } else {
        return {
          ai: { ...character, hp: newHp },
          knockbacks: [...state.knockbacks, knockback]
        };
      }
    });
  },

  incrementCombo: () => {
    set(state => ({
      combo: state.combo + 1,
      comboStartTime: state.gameTime
    }));
  },

  resetCombo: () => {
    set({ combo: 0 });
  },

  addBuff: (entity, type, color) => {
    set(state => {
      const existingBuff = state.buffs.find(b => b.entity === entity && b.type === type);
      if (existingBuff) {
        return {
          buffs: state.buffs.map(b => 
            b.id === existingBuff.id 
              ? { ...b, duration: 5, maxDuration: 5 }
              : b
          )
        };
      }
      const newBuff: Buff = {
        id: generateId(),
        type,
        entity,
        duration: 5,
        maxDuration: 5,
        color
      };
      return { buffs: [...state.buffs, newBuff] };
    });
  },

  removeBuff: (id) => {
    set(state => ({
      buffs: state.buffs.filter(b => b.id !== id)
    }));
  },

  collectPowerUp: (id, entity) => {
    set(state => {
      const powerUp = state.powerUps.find(p => p.id === id);
      if (!powerUp || powerUp.collected) return state;
      
      get().addBuff(entity, powerUp.type, powerUp.color);
      
      return {
        powerUps: state.powerUps.map(p =>
          p.id === id ? { ...p, collected: true } : p
        )
      };
    });
  },

  spawnPowerUp: () => {
    const state = get();
    const colors: Record<BuffType, string[]> = {
      attack: ['#E94560', '#533483'],
      speed: ['#00B4D8']
    };
    const types: BuffType[] = ['attack', 'speed'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colorOptions = colors[type];
    const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    
    const activeCount = state.powerUps.filter(p => !p.collected).length;
    if (activeCount >= 3) return;
    
    const minX = WALL_THICKNESS + 30;
    const maxX = ARENA_WIDTH - WALL_THICKNESS - 46;
    const minY = 80;
    const maxY = ARENA_HEIGHT - 100;
    
    const powerUp: PowerUp = {
      id: generateId(),
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
      type,
      color,
      rotation: 0,
      collected: false
    };
    
    set(s => ({ powerUps: [...s.powerUps, powerUp] }));
  },

  update: (deltaTime) => {
    const state = get();
    if (!state.isRunning || state.isPaused) return;

    const {
      arenaWidth, wallThickness, gravity, jumpForce, moveSpeed,
      keys, gameTime
    } = state;

    const leftBound = wallThickness;
    const rightBound = arenaWidth - wallThickness;

    const speedBuff = state.buffs.find(b => b.entity === 'player' && b.type === 'speed');
    const playerSpeedMul = speedBuff ? 1.3 : 1;

    let playerX = state.player.x;
    let playerY = state.player.y;
    let playerVx = 0;
    let playerVy = state.player.vy;
    let playerOnGround = state.player.onGround;
    let playerFacing = state.player.facing;
    let playerChargeTime = state.player.chargeTime;
    let playerEnergy = state.player.energy;

    if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
      playerVx = -moveSpeed * playerSpeedMul;
      playerFacing = -1;
    }
    if (keys['d'] || keys['D'] || keys['ArrowRight']) {
      playerVx = moveSpeed * playerSpeedMul;
      playerFacing = 1;
    }

    if ((keys['w'] || keys['W'] || keys['ArrowUp'] || keys[' ']) && playerOnGround) {
      playerVy = jumpForce;
      playerOnGround = false;
    }

    if (state.player.isCharging) {
      playerChargeTime += deltaTime;
      playerEnergy = Math.min(100, (playerChargeTime / 2) * 100);
    }

    playerVy += gravity * deltaTime;
    playerX += playerVx * deltaTime;
    playerY += playerVy * deltaTime;

    if (playerY + state.player.height >= state.groundY) {
      playerY = state.groundY - state.player.height;
      playerVy = 0;
      playerOnGround = true;
    }

    playerX = Math.max(leftBound, Math.min(rightBound - state.player.width, playerX));

    const newPlayer: Character = {
      ...state.player,
      x: playerX,
      y: playerY,
      vx: playerVx,
      vy: playerVy,
      onGround: playerOnGround,
      facing: playerFacing,
      chargeTime: playerChargeTime,
      energy: playerEnergy
    };

    let energyBalls = state.energyBalls.map(ball => ({
      ...ball,
      x: ball.x + ball.vx * deltaTime,
      y: ball.y + ball.vy * deltaTime
    })).filter(ball =>
      ball.x > -50 && ball.x < arenaWidth + 50 &&
      ball.y > -50 && ball.y < ARENA_HEIGHT + 50
    );

    let newParticles = state.particles.map(p => ({
      ...p,
      x: p.x + p.vx * deltaTime,
      y: p.y + p.vy * deltaTime,
      vx: p.vx * (1 - deltaTime * 2),
      vy: p.vy * (1 - deltaTime * 2),
      life: p.life - deltaTime
    })).filter(p => p.life > 0);

    const newBuffs = state.buffs
      .map(b => ({ ...b, duration: b.duration - deltaTime }))
      .filter(b => {
        if (b.duration <= 0) {
          return false;
        }
        return true;
      });

    const newKnockbacks: Knockback[] = [];
    let knockbackPlayerX = newPlayer.x;
    let knockbackPlayerY = newPlayer.y;
    let aiX = state.ai.x;
    let aiY = state.ai.y;

    for (const kb of state.knockbacks) {
      const newElapsed = kb.elapsed + deltaTime;
      if (newElapsed >= kb.duration) {
        if (kb.entity === 'player') {
          knockbackPlayerX = kb.targetX;
          knockbackPlayerY = kb.targetY;
        } else {
          aiX = kb.targetX;
          aiY = kb.targetY;
        }
      } else {
        const t = newElapsed / kb.duration;
        const eased = 1 - Math.pow(1 - t, 3);
        const cx = kb.startX + (kb.targetX - kb.startX) * eased;
        const cy = kb.startY + (kb.targetY - kb.startY) * eased;
        if (kb.entity === 'player') {
          knockbackPlayerX = cx;
          knockbackPlayerY = cy;
        } else {
          aiX = cx;
          aiY = cy;
        }
        newKnockbacks.push({ ...kb, elapsed: newElapsed });
      }
    }

    const finalPlayerX = Math.max(leftBound, Math.min(rightBound - newPlayer.width, knockbackPlayerX));
    const finalPlayer: Character = {
      ...newPlayer,
      x: finalPlayerX,
      y: knockbackPlayerY
    };

    const newPowerUps = state.powerUps
      .filter(p => !p.collected)
      .map(p => ({
        ...p,
        rotation: p.rotation + 60 * deltaTime
      }));

    for (const pu of newPowerUps) {
      const px = pu.x;
      const py = pu.y;
      const pr = 16;

      const playerCx = finalPlayer.x + finalPlayer.width / 2;
      const playerCy = finalPlayer.y + finalPlayer.height / 2;
      const pw = finalPlayer.width / 2;
      const ph = finalPlayer.height / 2;
      const playerDist = Math.max(Math.abs(px - playerCx) - pw, Math.abs(py - playerCy) - ph);
      if (playerDist < pr) {
        get().collectPowerUp(pu.id, 'player');
      }
    }

    let combo = state.combo;
    let comboStartTime = state.comboStartTime;
    if (combo > 0 && gameTime - comboStartTime > state.comboResetTime) {
      combo = 0;
    }

    const remainingBalls: EnergyBall[] = [];
    for (const ball of energyBalls) {
      let hit = false;

      if (ball.owner !== 'ai') {
        const aiCx = aiX + state.ai.width / 2;
        const aiCy = aiY + state.ai.height / 2;
        const dx = ball.x - aiCx;
        const dy = ball.y - aiCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ball.radius + Math.max(state.ai.width, state.ai.height) / 2) {
          const hitDirX = dx / (dist || 1);
          const hitDirY = dy / (dist || 1);
          get().applyDamage('ai', ball.damage, -hitDirX, -hitDirY);
          get().addParticles([
            ...Array.from({ length: 6 }, (_, i) => {
              const angle = (Math.PI * 2 * i) / 6 + (Math.random() - 0.5) * 0.6;
              const speed = 150 + Math.random() * 100;
              return {
                id: generateId(),
                x: ball.x,
                y: ball.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: ['#FF8800', '#FFAA00', '#FFD700', '#FF3333'][Math.floor(Math.random() * 4)],
                size: 4 + Math.random() * 4,
                life: 0.3,
                maxLife: 0.3
              };
            })
          ]);
          combo++;
          comboStartTime = gameTime;
          hit = true;
        }
      }

      if (!hit) {
        remainingBalls.push(ball);
      }
    }

    let speedLines = state.speedLines.map(line => ({
      ...line,
      x: line.x + line.speed * deltaTime
    })).filter(line => line.x < arenaWidth + 50);

    if (Math.random() < 0.1 && speedLines.length < 20) {
      speedLines.push({
        id: generateId(),
        x: -30,
        y: ARENA_HEIGHT - 20 + Math.random() * 15,
        length: 10 + Math.random() * 20,
        speed: 200 + Math.random() * 100
      });
    }

    set({
      player: finalPlayer,
      energyBalls: remainingBalls,
      particles: newParticles,
      buffs: newBuffs,
      knockbacks: newKnockbacks,
      powerUps: newPowerUps,
      speedLines,
      combo,
      comboStartTime,
      buffPulsePhase: state.buffPulsePhase + deltaTime * 2 * Math.PI * 2,
      gameTime: gameTime + deltaTime
    });
  },

  resetGame: () => {
    set(createInitialState());
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        get().spawnPowerUp();
      }
    }, 100);
  },

  setRunning: (running) => set({ isRunning: running }),
  setPaused: (paused) => set({ isPaused: paused })
}));
