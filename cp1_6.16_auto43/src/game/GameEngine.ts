import { v4 as uuidv4 } from 'uuid';

export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;
export const ACCELERATION = 0.05;
export const MAX_SPEED = 5;
export const FRICTION = 0.98;
export const BOUNCE_DAMPING = 0.7;
export const PICKUP_RANGE = 16;
export const MINERAL_SPAWN_INTERVAL = 1500;
export const MINERAL_SPAWN_COUNT = 5;
export const PIRATE_SPAWN_INTERVAL = 5000;
export const PIRATE_SPEED = 3;
export const PIRATE_ATTACK_RANGE = 30;
export const WIN_MINERALS = 30;
export const GRID_SIZE = 32;
export const SPEED_BONUS_PER_3 = 0.02;
export const MAX_SPEED_BONUS_MULTIPLIER = 1.5;

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mineralCount: number;
  color: string;
  speedBonus: number;
  flashUntil: number;
}

export interface Mineral {
  id: string;
  x: number;
  y: number;
  opacity: number;
  spawnTime: number;
  initialValue: number;
  currentValue: number;
}

export interface CollisionParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  startTime: number;
  duration: number;
}

export interface CollisionEvent {
  playerId: string;
  x: number;
  y: number;
  time: number;
}

export interface Pirate {
  id: string;
  x: number;
  y: number;
  targetPlayerId: string;
  angle: number;
}

export interface PickupEffect {
  id: string;
  x: number;
  y: number;
  startTime: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleOffset: number;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  mineralCount: number;
}

interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

type GameStatus = 'idle' | 'countdown' | 'playing' | 'finished';

export class GameEngine {
  private players: Player[] = [];
  private minerals: Mineral[] = [];
  private pirates: Pirate[] = [];
  private pickupEffects: PickupEffect[] = [];
  private collisionParticles: CollisionParticle[] = [];
  private stars: Star[] = [];
  private playerInputs: Map<string, PlayerInput> = new Map();
  private status: GameStatus = 'idle';
  private countdown: number = 3;
  private countdownStartTime: number = 0;
  private roomId: string = '';
  private winner: Player | null = null;
  private lastMineralSpawn: number = 0;
  private lastPirateSpawn: number = 0;
  private lastStateSync: number = 0;
  private lastCollisionTime: number = 0;
  private animationFrameId: number | null = null;
  private onUpdateCallback: ((state: GameState) => void) | null = null;
  private onCollisionCallback: ((event: CollisionEvent) => void) | null = null;
  private lastFrameTime: number = 0;
  private localPlayerId: string = '';

  constructor() {
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        size: 1 + Math.random() * 2,
        baseOpacity: 0.2 + Math.random() * 0.6,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  public async initializeGame(playerNames: string[]): Promise<void> {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D'];
    const corners = [
      { x: 100, y: 100 },
      { x: MAP_WIDTH - 100, y: 100 },
      { x: 100, y: MAP_HEIGHT - 100 },
    ];

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNames }),
      });
      const data = await response.json();
      this.roomId = data.roomId;
    } catch (e) {
      console.warn('Backend not available, using local IDs');
      this.roomId = uuidv4();
    }

    this.players = playerNames.map((name, index) => ({
      id: uuidv4(),
      name,
      x: corners[index].x,
      y: corners[index].y,
      vx: 0,
      vy: 0,
      mineralCount: 0,
      color: colors[index],
      speedBonus: 0,
      flashUntil: 0,
    }));

    if (this.players.length > 0) {
      this.localPlayerId = this.players[0].id;
    }

    this.players.forEach(player => {
      this.playerInputs.set(player.id, { up: false, down: false, left: false, right: false });
    });

    this.minerals = [];
    this.pirates = [];
    this.pickupEffects = [];
    this.winner = null;
    this.status = 'idle';
  }

  public startCountdown(): void {
    if (this.status !== 'idle') return;
    this.status = 'countdown';
    this.countdown = 3;
    this.countdownStartTime = performance.now();
    this.startGameLoop();
  }

  public resetGame(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D'];
    const corners = [
      { x: 100, y: 100 },
      { x: MAP_WIDTH - 100, y: 100 },
      { x: 100, y: MAP_HEIGHT - 100 },
    ];

    this.players = this.players.map((player, index) => ({
      ...player,
      x: corners[index].x,
      y: corners[index].y,
      vx: 0,
      vy: 0,
      mineralCount: 0,
      speedBonus: 0,
      flashUntil: 0,
    }));

    this.minerals = [];
    this.pirates = [];
    this.pickupEffects = [];
    this.collisionParticles = [];
    this.winner = null;
    this.status = 'idle';
    this.lastMineralSpawn = 0;
    this.lastPirateSpawn = 0;
    this.lastCollisionTime = 0;
  }

  private startGameLoop(): void {
    this.lastFrameTime = performance.now();
    const loop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - this.lastFrameTime) / 16.67, 2);
      this.lastFrameTime = currentTime;
      this.update(currentTime, deltaTime);
      this.notifyUpdate();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private update(currentTime: number, deltaTime: number): void {
    if (this.status === 'countdown') {
      const elapsed = (currentTime - this.countdownStartTime) / 1000;
      this.countdown = Math.max(0, 3 - Math.floor(elapsed));
      if (this.countdown <= 0) {
        this.status = 'playing';
        this.lastMineralSpawn = currentTime;
        this.lastPirateSpawn = currentTime;
      }
    }

    if (this.status === 'playing') {
      this.updatePlayers(deltaTime, currentTime);
      this.spawnMinerals(currentTime);
      this.updateMinerals(currentTime);
      this.spawnPirates(currentTime);
      this.updatePirates(deltaTime);
      this.checkCollisions(currentTime);
      this.updatePickupEffects(currentTime);
      this.updateCollisionParticles(currentTime);
      this.checkWinCondition();
      this.syncState(currentTime);
    }
  }

  private updatePlayers(deltaTime: number, currentTime: number): void {
    this.players.forEach(player => {
      const input = this.playerInputs.get(player.id);
      if (!input) return;

      const speedMultiplier = 1 + Math.min(player.speedBonus, MAX_SPEED_BONUS_MULTIPLIER - 1);
      const accel = ACCELERATION * speedMultiplier * deltaTime;
      const maxSpd = MAX_SPEED * speedMultiplier;

      if (input.up) player.vy -= accel;
      if (input.down) player.vy += accel;
      if (input.left) player.vx -= accel;
      if (input.right) player.vx += accel;

      player.vx *= Math.pow(FRICTION, deltaTime);
      player.vy *= Math.pow(FRICTION, deltaTime);

      const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      if (speed > maxSpd) {
        player.vx = (player.vx / speed) * maxSpd;
        player.vy = (player.vy / speed) * maxSpd;
      }

      player.x += player.vx * deltaTime;
      player.y += player.vy * deltaTime;

      if (player.x <= 20) {
        player.x = 20;
        player.vx = Math.abs(player.vx) * BOUNCE_DAMPING;
        this.triggerBoundaryCollision(player, currentTime);
      } else if (player.x >= MAP_WIDTH - 20) {
        player.x = MAP_WIDTH - 20;
        player.vx = -Math.abs(player.vx) * BOUNCE_DAMPING;
        this.triggerBoundaryCollision(player, currentTime);
      }

      if (player.y <= 20) {
        player.y = 20;
        player.vy = Math.abs(player.vy) * BOUNCE_DAMPING;
        this.triggerBoundaryCollision(player, currentTime);
      } else if (player.y >= MAP_HEIGHT - 20) {
        player.y = MAP_HEIGHT - 20;
        player.vy = -Math.abs(player.vy) * BOUNCE_DAMPING;
        this.triggerBoundaryCollision(player, currentTime);
      }
    });
  }

  private spawnMinerals(currentTime: number): void {
    if (currentTime - this.lastMineralSpawn >= MINERAL_SPAWN_INTERVAL) {
      this.lastMineralSpawn = currentTime;
      for (let i = 0; i < MINERAL_SPAWN_COUNT; i++) {
        const initialValue = 80 + Math.floor(Math.random() * 21);
        this.minerals.push({
          id: uuidv4(),
          x: 50 + Math.random() * (MAP_WIDTH - 100),
          y: 50 + Math.random() * (MAP_HEIGHT - 100),
          opacity: 0,
          spawnTime: currentTime,
          initialValue,
          currentValue: initialValue,
        });
      }
    }
  }

  private triggerBoundaryCollision(player: Player, currentTime: number): void {
    if (currentTime - this.lastCollisionTime < 16.67) return;
    this.lastCollisionTime = currentTime;

    const particleCount = Math.min(20, this.collisionParticles.length + 20);
    const particlesToAdd = particleCount - this.collisionParticles.length;

    for (let i = 0; i < particlesToAdd; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.collisionParticles.push({
        id: uuidv4(),
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        startTime: currentTime,
        duration: 300,
      });
    }

    if (this.onCollisionCallback) {
      this.onCollisionCallback({
        playerId: player.id,
        x: player.x,
        y: player.y,
        time: currentTime,
      });
    }
  }

  private updateCollisionParticles(currentTime: number): void {
    this.collisionParticles = this.collisionParticles.filter(
      particle => currentTime - particle.startTime < particle.duration
    );
    this.collisionParticles.forEach(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    });
  }

  private updateMinerals(currentTime: number): void {
    this.minerals.forEach(mineral => {
      const elapsed = currentTime - mineral.spawnTime;
      mineral.opacity = Math.min(1, elapsed / 300);
    });
  }

  private spawnPirates(currentTime: number): void {
    if (currentTime - this.lastPirateSpawn >= PIRATE_SPAWN_INTERVAL && this.players.length > 0) {
      this.lastPirateSpawn = currentTime;
      
      const edge = Math.floor(Math.random() * 4);
      let x: number, y: number;
      switch (edge) {
        case 0: x = Math.random() * MAP_WIDTH; y = -30; break;
        case 1: x = MAP_WIDTH + 30; y = Math.random() * MAP_HEIGHT; break;
        case 2: x = Math.random() * MAP_WIDTH; y = MAP_HEIGHT + 30; break;
        default: x = -30; y = Math.random() * MAP_HEIGHT; break;
      }

      const nearestPlayer = this.findNearestPlayer(x, y);
      if (nearestPlayer) {
        this.pirates.push({
          id: uuidv4(),
          x,
          y,
          targetPlayerId: nearestPlayer.id,
          angle: 0,
        });
      }
    }
  }

  private findNearestPlayer(x: number, y: number): Player | null {
    if (this.players.length === 0) return null;
    let nearest = this.players[0];
    let minDist = Infinity;
    this.players.forEach(player => {
      const dist = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    });
    return nearest;
  }

  private updatePirates(deltaTime: number): void {
    this.pirates.forEach(pirate => {
      const target = this.players.find(p => p.id === pirate.targetPlayerId);
      if (!target) {
        const nearest = this.findNearestPlayer(pirate.x, pirate.y);
        if (nearest) pirate.targetPlayerId = nearest.id;
        return;
      }

      const dx = target.x - pirate.x;
      const dy = target.y - pirate.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      pirate.angle = Math.atan2(dy, dx);

      if (dist > 0) {
        pirate.x += (dx / dist) * PIRATE_SPEED * deltaTime;
        pirate.y += (dy / dist) * PIRATE_SPEED * deltaTime;
      }
    });
  }

  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    return `${gridX},${gridY}`;
  }

  private checkCollisions(currentTime: number): void {
    const grid: Map<string, (Mineral | Pirate)[]> = new Map();

    this.minerals.forEach(mineral => {
      const key = this.getGridKey(mineral.x, mineral.y);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(mineral);
    });

    this.pirates.forEach(pirate => {
      const key = this.getGridKey(pirate.x, pirate.y);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(pirate);
    });

    this.players.forEach(player => {
      const playerGridX = Math.floor(player.x / GRID_SIZE);
      const playerGridY = Math.floor(player.y / GRID_SIZE);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${playerGridX + dx},${playerGridY + dy}`;
          const objects = grid.get(key);
          if (!objects) continue;

          objects.forEach(obj => {
            if ('opacity' in obj) {
              const dist = Math.sqrt((player.x - obj.x) ** 2 + (player.y - obj.y) ** 2);
              if (dist < PICKUP_RANGE && obj.opacity >= 1) {
                this.minerals = this.minerals.filter(m => m.id !== obj.id);
                player.mineralCount++;
                
                if (player.mineralCount % 3 === 0) {
                  player.speedBonus = Math.min(
                    player.speedBonus + SPEED_BONUS_PER_3,
                    MAX_SPEED_BONUS_MULTIPLIER - 1
                  );
                }

                this.pickupEffects.push({
                  id: uuidv4(),
                  x: obj.x,
                  y: obj.y,
                  startTime: currentTime,
                });
              }
            } else {
              const dist = Math.sqrt((player.x - obj.x) ** 2 + (player.y - obj.y) ** 2);
              if (dist < PIRATE_ATTACK_RANGE) {
                if (player.mineralCount > 0) {
                  player.mineralCount--;
                  player.flashUntil = currentTime + 100;
                }
                this.pirates = this.pirates.filter(p => p.id !== obj.id);
              }
            }
          });
        }
      }
    });
  }

  private updatePickupEffects(currentTime: number): void {
    this.pickupEffects = this.pickupEffects.filter(
      effect => currentTime - effect.startTime < 200
    );
  }

  private checkWinCondition(): void {
    const winner = this.players.find(p => p.mineralCount >= WIN_MINERALS);
    if (winner && !this.winner) {
      this.winner = winner;
      this.status = 'finished';
      this.syncState(performance.now(), true);
    }
  }

  private async syncState(currentTime: number, force: boolean = false): Promise<void> {
    if (force || currentTime - this.lastStateSync >= 1000) {
      this.lastStateSync = currentTime;
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.roomId,
            players: this.players.map(p => ({ id: p.id, name: p.name, mineralCount: p.mineralCount, color: p.color })),
          }),
        });
      } catch (e) {
        // Silently fail if backend is not available
      }
    }
  }

  public setPlayerInput(playerId: string, input: Partial<PlayerInput>): void {
    const existing = this.playerInputs.get(playerId);
    if (existing) {
      this.playerInputs.set(playerId, { ...existing, ...input });
    }
  }

  public getPlayers(): Player[] {
    return this.players;
  }

  public getMinerals(): Mineral[] {
    return this.minerals;
  }

  public getPirates(): Pirate[] {
    return this.pirates;
  }

  public getStars(): Star[] {
    return this.stars;
  }

  public getPickupEffects(): PickupEffect[] {
    return this.pickupEffects;
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public getCountdown(): number {
    return this.countdown;
  }

  public getWinner(): Player | null {
    return this.winner;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  public getCollisionParticles(): CollisionParticle[] {
    return this.collisionParticles;
  }

  public onUpdate(callback: (state: GameState) => void): void {
    this.onUpdateCallback = callback;
  }

  public onCollision(callback: (event: CollisionEvent) => void): void {
    this.onCollisionCallback = callback;
  }

  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.getState());
    }
  }

  public getState(): GameState {
    return {
      players: this.players.map(p => ({ ...p })),
      minerals: this.minerals.map(m => ({ ...m })),
      pirates: this.pirates.map(p => ({ ...p })),
      stars: this.stars.map(s => ({ ...s })),
      pickupEffects: this.pickupEffects.map(e => ({ ...e })),
      collisionParticles: this.collisionParticles.map(p => ({ ...p })),
      status: this.status,
      countdown: this.countdown,
      winner: this.winner ? { ...this.winner } : null,
      currentTime: performance.now(),
      localPlayerId: this.localPlayerId,
    };
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

export interface GameState {
  players: Player[];
  minerals: Mineral[];
  pirates: Pirate[];
  stars: Star[];
  pickupEffects: PickupEffect[];
  collisionParticles: CollisionParticle[];
  status: GameStatus;
  countdown: number;
  winner: Player | null;
  currentTime: number;
  localPlayerId: string;
}
