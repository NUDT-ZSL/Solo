import {
  GameState,
  SubmarineState,
  GRID_SIZE,
  BASE_SPEED,
  CellType,
  MineralType,
  Upgrades,
  Minerals,
  Particle,
  ScreenShake,
  OxygenFlash,
  SonarPulse
} from '../types/gameTypes';
import { CaveGenerator } from './CaveGenerator';
import { SonarSystem } from './SonarSystem';
import { AISystem } from './AISystem';

export class GameEngine {
  state: GameState;
  private caveGenerator: CaveGenerator;
  private sonarSystem: SonarSystem;
  private aiSystem: AISystem;
  private keys: Set<string>;
  private animationFrameId: number | null;
  private lastTime: number;
  private onStateChange: ((state: GameState) => void) | null;
  private currentTime: number;

  constructor(width: number, height: number) {
    this.keys = new Set();
    this.animationFrameId = null;
    this.lastTime = 0;
    this.currentTime = 0;
    this.onStateChange = null;
    this.caveGenerator = new CaveGenerator();
    this.sonarSystem = new SonarSystem();
    this.aiSystem = new AISystem();
    this.state = this.createInitialState(width, height);
    this.setupEventListeners();
  }

  private createInitialState(width: number, height: number): GameState {
    const { grid, startX, startY } = this.caveGenerator.generateLevel();

    const explored: boolean[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      explored[y] = new Array(GRID_SIZE).fill(false);
    }
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const ex = startX + dx;
        const ey = startY + dy;
        if (ex >= 0 && ex < GRID_SIZE && ey >= 0 && ey < GRID_SIZE) {
          if (Math.sqrt(dx * dx + dy * dy) <= 2.5) {
            explored[ey][ex] = true;
          }
        }
      }
    }

    const aspectRatio = 16 / 9;
    let cellSize: number;
    if (width / height > aspectRatio) {
      cellSize = Math.floor(height / GRID_SIZE);
    } else {
      cellSize = Math.floor(width / (GRID_SIZE * aspectRatio));
    }
    cellSize = Math.max(8, Math.min(32, cellSize));

    const gridWidth = GRID_SIZE * cellSize;
    const gridHeight = GRID_SIZE * cellSize;
    const offsetX = Math.floor((width - gridWidth) / 2);
    const offsetY = Math.floor((height - gridHeight) / 2);

    const submarine: SubmarineState = {
      x: startX + 0.5,
      y: startY + 0.5,
      rotation: 0,
      velocity: { x: 0, y: 0 },
      speed: BASE_SPEED,
      baseSpeed: BASE_SPEED,
      oxygen: 100,
      maxOxygen: 100,
      energy: 100,
      maxEnergy: 100,
      slowEffect: 1,
      slowTimer: 0
    };

    const sonar: SonarPulse = {
      active: false,
      x: 0, y: 0,
      currentRadius: 0,
      maxRadius: 8,
      startTime: 0,
      duration: 0.6,
      highlightedCells: new Set()
    };

    const screenShake: ScreenShake = {
      active: false, amplitude: 5, frequency: 5, duration: 1.5, startTime: 0
    };

    const oxygenFlash: OxygenFlash = {
      active: false, startTime: 0, duration: 0.2, blinkCount: 0
    };

    return {
      grid,
      explored,
      submarine,
      upgrades: { speed: 0, sonarRange: 0, energyEfficiency: 0 },
      minerals: { sphalerite: 0, kyanite: 0, emerald: 0 },
      sonar,
      sonarCooldown: 0,
      creatures: [],
      nextCreatureTime: 0,
      screenShake,
      oxygenFlash,
      level: 1,
      levelStartTime: this.currentTime,
      paused: false,
      gameOver: false,
      atExit: false,
      showUpgrade: false,
      particles: [],
      width,
      height,
      cellSize,
      offsetX,
      offsetY
    };
  }

  setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  removeEventListeners(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);

    if (e.code === 'Space') {
      e.preventDefault();
      this.fireSonar();
    }
    if (e.code === 'Escape') {
      this.state.paused = !this.state.paused;
      this.notifyStateChange();
    }
    if (e.code === 'KeyE' && this.state.atExit && !this.state.showUpgrade) {
      this.state.showUpgrade = true;
      this.state.paused = true;
      this.notifyStateChange();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private fireSonar(): void {
    if (this.sonarSystem.fire(this.state.submarine.x, this.state.submarine.y, this.state.upgrades.sonarRange)) {
      this.state.sonar = { ...this.sonarSystem.pulse };
      this.notifyStateChange();
    }
  }

  resize(width: number, height: number): void {
    this.state.width = width;
    this.state.height = height;
    const aspectRatio = 16 / 9;
    let cellSize: number;
    if (width / height > aspectRatio) {
      cellSize = Math.floor(height / GRID_SIZE);
    } else {
      cellSize = Math.floor(width / (GRID_SIZE * aspectRatio));
    }
    cellSize = Math.max(8, Math.min(32, cellSize));
    this.state.cellSize = cellSize;
    this.state.offsetX = Math.floor((width - GRID_SIZE * cellSize) / 2);
    this.state.offsetY = Math.floor((height - GRID_SIZE * cellSize) / 2);
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.state.paused && !this.state.gameOver) {
      this.update(dt);
    }

    this.notifyStateChange();
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.currentTime += dt;
    this.aiSystem.currentTime = this.currentTime;
    this.sonarSystem.currentTime = this.currentTime;

    if (this.state.sonarCooldown > 0) {
      this.state.sonarCooldown = Math.max(0, this.state.sonarCooldown - dt);
    }

    this.updateSubmarine(dt);
    this.updateSonar(dt);
    this.updateAI(dt);
    this.updateParticles(dt);
    this.checkCollisions();
    this.updateResources(dt);
    this.updateEffects(dt);
    this.checkGameOver();
  }

  private updateSubmarine(dt: number): void {
    const sub = this.state.submarine;

    if (sub.slowTimer > 0) {
      sub.slowTimer -= dt;
      if (sub.slowTimer <= 0) {
        sub.slowEffect = 1;
      }
    }

    const rotSpeed = 3;
    if (this.keys.has('ArrowLeft')) sub.rotation -= rotSpeed * dt;
    if (this.keys.has('ArrowRight')) sub.rotation += rotSpeed * dt;

    const speedMultiplier = this.sonarSystem.getSpeedMultiplier();
    const energyMultiplier = sub.energy / sub.maxEnergy < 0.2 ? 0.5 : 1;
    const slowMultiplier = sub.slowEffect;

    const speedLevelMultiplier = 1 + this.state.upgrades.speed * 0.2;
    const currentSpeed = sub.baseSpeed * speedLevelMultiplier * speedMultiplier * energyMultiplier * slowMultiplier;
    sub.speed = currentSpeed;

    let thrust = 0;
    if (this.keys.has('KeyW')) thrust += 1;
    if (this.keys.has('KeyS')) thrust -= 0.5;
    if (this.keys.has('KeyA')) sub.rotation -= rotSpeed * dt * 0.5;
    if (this.keys.has('KeyD')) sub.rotation += rotSpeed * dt * 0.5;

    const thrustForce = currentSpeed * thrust;
    sub.velocity.x += Math.cos(sub.rotation) * thrustForce * dt * 4;
    sub.velocity.y += Math.sin(sub.rotation) * thrustForce * dt * 4;

    sub.velocity.x *= 0.92;
    sub.velocity.y *= 0.92;

    const maxSpeed = currentSpeed * 1.5;
    const velMag = Math.sqrt(sub.velocity.x ** 2 + sub.velocity.y ** 2);
    if (velMag > maxSpeed) {
      sub.velocity.x = (sub.velocity.x / velMag) * maxSpeed;
      sub.velocity.y = (sub.velocity.y / velMag) * maxSpeed;
    }

    const efficiencyMultiplier = 1 - this.state.upgrades.energyEfficiency * 0.3;
    if (thrust !== 0) {
      sub.energy -= 0.2 * Math.abs(thrust) * dt * efficiencyMultiplier;
    }
    sub.energy = Math.max(0, sub.energy);

    let newX = sub.x + sub.velocity.x * dt;
    let newY = sub.y + sub.velocity.y * dt;

    this.handleWallCollision(newX, newY);

    this.spawnWakeParticles();
  }

  private handleWallCollision(newX: number, newY: number): void {
    const sub = this.state.submarine;
    const radius = 0.35;

    const corners = [
      [newX - radius, newY - radius],
      [newX + radius, newY - radius],
      [newX - radius, newY + radius],
      [newX + radius, newY + radius]
    ];

    let collidedX = false;
    let collidedY = false;

    for (const [cx, cy] of corners) {
      const gx = Math.floor(cx);
      const gy = Math.floor(cy);
      if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
        const cell = this.state.grid[gy][gx];
        if (cell.type === CellType.WALL) {
          if (gx < Math.floor(sub.x) || gx > Math.floor(sub.x)) {
            sub.velocity.x *= -0.4;
            collidedX = true;
          }
          if (gy < Math.floor(sub.y) || gy > Math.floor(sub.y)) {
            sub.velocity.y *= -0.4;
            collidedY = true;
          }
        } else if (cell.type === CellType.REEF) {
          sub.slowEffect = 0.7;
          sub.slowTimer = 1;
        }
      }
    }

    if (!collidedX) sub.x = newX;
    if (!collidedY) sub.y = newY;

    sub.x = Math.max(1 + radius, Math.min(GRID_SIZE - 1 - radius, sub.x));
    sub.y = Math.max(1 + radius, Math.min(GRID_SIZE - 1 - radius, sub.y));

    const centerGx = Math.floor(sub.x);
    const centerGy = Math.floor(sub.y);
    if (this.state.grid[centerGy]?.[centerGx]?.type === CellType.EXIT) {
      this.state.atExit = true;
    } else {
      this.state.atExit = false;
    }
  }

  private spawnWakeParticles(): void {
    const sub = this.state.submarine;
    const velMag = Math.sqrt(sub.velocity.x ** 2 + sub.velocity.y ** 2);
    if (velMag > 0.5 && Math.random() < 0.3) {
      const wakeCount = this.state.particles.filter(p => p.type === 'wake').length;
      if (wakeCount < 50) {
        const angle = sub.rotation + Math.PI + (Math.random() - 0.5) * 0.5;
        this.state.particles.push({
          x: sub.x - Math.cos(sub.rotation) * 0.4,
          y: sub.y - Math.sin(sub.rotation) * 0.4,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5,
          life: 0.6,
          maxLife: 0.6,
          color: '#60a5fa',
          size: 2 + Math.random() * 2,
          type: 'wake'
        });
      }
    }
  }

  private updateSonar(dt: number): void {
    const { sonarParticles, stunnedCreatures } = this.sonarSystem.update(
      dt,
      this.state.grid,
      this.state.explored,
      this.state.creatures
    );

    this.aiSystem.stunCreatures(stunnedCreatures);
    this.state.sonar = { ...this.sonarSystem.pulse };
    this.state.sonarCooldown = this.sonarSystem.cooldown;

    const existingSonarCount = this.state.particles.filter(p => p.type === 'sonar').length;
    const slotsAvailable = Math.max(0, 200 - existingSonarCount);
    this.state.particles.push(...sonarParticles.slice(0, slotsAvailable));
  }

  private updateAI(dt: number): void {
    const { collisions } = this.aiSystem.update(
      dt,
      this.state.grid,
      this.state.submarine
    );

    this.state.creatures = [...this.aiSystem.creatures];

    for (const col of collisions) {
      this.state.submarine.oxygen -= col.damage;
      this.state.screenShake = col.screenShake;
      this.state.oxygenFlash = col.oxygenFlash;
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }

    if (this.state.particles.length > 400) {
      this.state.particles = this.state.particles.slice(-400);
    }
  }

  private checkCollisions(): void {
    const sub = this.state.submarine;
    const gx = Math.floor(sub.x);
    const gy = Math.floor(sub.y);

    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      const cell = this.state.grid[gy][gx];
      if (cell.type === CellType.MINERAL && cell.mineralType) {
        const mineralKey = cell.mineralType as keyof Minerals;
        this.state.minerals[mineralKey]++;
        this.state.grid[gy][gx] = { ...cell, type: CellType.WATER, mineralType: undefined };

        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          this.state.particles.push({
            x: gx + 0.5,
            y: gy + 0.5,
            vx: Math.cos(angle) * 1.5,
            vy: Math.sin(angle) * 1.5,
            life: 0.5,
            maxLife: 0.5,
            color: cell.mineralType === MineralType.SPHALERITE ? '#a855f7' :
              cell.mineralType === MineralType.KYANITE ? '#3b82f6' : '#22c55e',
            size: 3,
            type: 'mineral'
          });
        }
      }
    }
  }

  private updateResources(dt: number): void {
    const sub = this.state.submarine;
    sub.oxygen -= 0.5 * dt;
    sub.oxygen = Math.max(0, Math.min(sub.maxOxygen, sub.oxygen));
    sub.energy = Math.max(0, Math.min(sub.maxEnergy, sub.energy));
  }

  private updateEffects(dt: number): void {
    if (this.state.screenShake.active) {
      const elapsed = this.currentTime - this.state.screenShake.startTime;
      if (elapsed >= this.state.screenShake.duration) {
        this.state.screenShake.active = false;
      }
    }

    if (this.state.oxygenFlash.active) {
      const elapsed = this.currentTime - this.state.oxygenFlash.startTime;
      if (elapsed >= this.state.oxygenFlash.duration * (this.state.oxygenFlash.blinkCount * 2)) {
        this.state.oxygenFlash.active = false;
      }
    }
  }

  private checkGameOver(): void {
    if (this.state.submarine.oxygen <= 0) {
      this.state.gameOver = true;
    }
  }

  upgrade(type: 'speed' | 'sonarRange' | 'energyEfficiency'): boolean {
    const costs = {
      speed: { sphalerite: 3, kyanite: 0, emerald: 0 },
      sonarRange: { sphalerite: 0, kyanite: 2, emerald: 0 },
      energyEfficiency: { sphalerite: 0, kyanite: 0, emerald: 2 }
    };

    const cost = costs[type];
    const currentLevel = this.state.upgrades[type];

    if (currentLevel >= 3) return false;

    if (this.state.minerals.sphalerite >= cost.sphalerite &&
        this.state.minerals.kyanite >= cost.kyanite &&
        this.state.minerals.emerald >= cost.emerald) {

      this.state.minerals.sphalerite -= cost.sphalerite;
      this.state.minerals.kyanite -= cost.kyanite;
      this.state.minerals.emerald -= cost.emerald;
      this.state.upgrades[type]++;

      return true;
    }

    return false;
  }

  async nextLevel(): Promise<{ saveId: string | null }> {
    const elapsed = this.currentTime - this.state.levelStartTime;

    let saveId: string | null = null;
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oxygen: this.state.submarine.oxygen,
          energy: this.state.submarine.energy,
          minerals: this.state.minerals,
          upgrades: this.state.upgrades,
          level: this.state.level,
          completionTime: elapsed
        })
      });
      if (response.ok) {
        const data = await response.json();
        saveId = data.saveId;
      }
    } catch (e) {
      console.warn('Save failed:', e);
    }

    this.caveGenerator = new CaveGenerator();
    const { grid, startX, startY } = this.caveGenerator.generateLevel();
    this.state.grid = grid;

    const explored: boolean[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      explored[y] = new Array(GRID_SIZE).fill(false);
    }
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const ex = startX + dx;
        const ey = startY + dy;
        if (ex >= 0 && ex < GRID_SIZE && ey >= 0 && ey < GRID_SIZE) {
          if (Math.sqrt(dx * dx + dy * dy) <= 2.5) {
            explored[ey][ex] = true;
          }
        }
      }
    }
    this.state.explored = explored;

    this.state.submarine.x = startX + 0.5;
    this.state.submarine.y = startY + 0.5;
    this.state.submarine.velocity = { x: 0, y: 0 };
    this.state.submarine.oxygen = Math.min(this.state.submarine.maxOxygen, this.state.submarine.oxygen + 30);
    this.state.level++;
    this.state.levelStartTime = this.currentTime;
    this.state.atExit = false;
    this.state.showUpgrade = false;
    this.state.paused = false;
    this.state.creatures = [];
    this.aiSystem.creatures = [];
    this.aiSystem.nextSpawnTime = this.currentTime + 8 + Math.random() * 7;
    this.state.particles = [];

    this.notifyStateChange();
    return { saveId };
  }

  togglePause(): void {
    this.state.paused = !this.state.paused;
    this.notifyStateChange();
  }

  closeUpgrade(): void {
    this.state.showUpgrade = false;
    this.state.paused = false;
    this.notifyStateChange();
  }

  getLevelCompletionTime(): number {
    return this.currentTime - this.state.levelStartTime;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  getCellSizeForConstraints(): { cellSize: number; gridPixelWidth: number; gridPixelHeight: number } {
    const cs = Math.floor(Math.min(this.state.width / (GRID_SIZE * 1.777), this.state.height / GRID_SIZE));
    return {
      cellSize: Math.max(8, cs),
      gridPixelWidth: GRID_SIZE * cs,
      gridPixelHeight: GRID_SIZE * cs
    };
  }
}
