import {
  GameState, Ship, Mineral, Mine, SpaceStation, Particle, Explosion, UIState, PendingMineral,
  CANVAS_WIDTH, CANVAS_HEIGHT, SHIP_SPEED, SHIP_BASE, SHIP_HEIGHT, SHIP_COLOR,
  MINERAL_RADIUS, MINERAL_COLOR, MINE_RADIUS, MINE_COLOR,
  STATION_BASE, STATION_HEIGHT, STATION_COLOR,
  EXHAUST_LIFE, EXPLOSION_LIFE, ENERGY_DRAIN_RATE, COLLECT_DURATION,
  WARNING_DURATION, DIFFICULTY_DURATION, SCREEN_SHAKE_DURATION,
  MINE_SPAWN_MIN, MINE_SPAWN_MAX, MIN_MINE_SPAWN_INTERVAL, MAX_PARTICLES,
  COLLECT_DISTANCE, MINERAL_COUNT_MIN, MINERAL_COUNT_MAX,
  MINE_SPAWN_COUNT_MIN, MINE_SPAWN_COUNT_MAX, STORM_PARTICLE_BASE_INTERVAL,
  DIFFICULTY_MINE_REDUCTION, DIFFICULTY_PULSE_BOOST, DIFFICULTY_STORM_BOOST,
  SCORE_PER_MINERAL, MINE_DAMAGE, SCREEN_SHAKE_INTENSITY,
  RADAR_REFRESH_INTERVAL, RADAR_SCAN_PERIOD, DIFFICULTY_MINERAL_BONUS,
  MINERAL_RESPAWN_DELAY, MINERAL_OVERLAP_DISTANCE, STATION_GLOW_RADIUS
} from './entities';

interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  collect: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private input: InputState;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private uiCallback: (state: UIState) => void;
  private running: boolean = false;
  private backgroundCanvas: HTMLCanvasElement;
  private backgroundCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, uiCallback: (state: UIState) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.uiCallback = uiCallback;
    this.input = { up: false, down: false, left: false, right: false, collect: false };

    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = CANVAS_WIDTH;
    this.backgroundCanvas.height = CANVAS_HEIGHT;
    this.backgroundCtx = this.backgroundCanvas.getContext('2d')!;
    this.renderBackground();

    this.state = this.createInitialState();
    this.setupInputListeners();
    this.setupCanvasScale();
  }

  private setupCanvasScale(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = CANVAS_WIDTH * dpr;
    this.canvas.height = CANVAS_HEIGHT * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private createInitialState(): GameState {
    const station: SpaceStation = {
      x: CANVAS_WIDTH - 80,
      y: CANVAS_HEIGHT / 2,
      width: STATION_BASE,
      height: STATION_HEIGHT,
      glowPhase: 0
    };

    const ship: Ship = {
      x: 80,
      y: CANVAS_HEIGHT / 2,
      angle: 0,
      speed: SHIP_SPEED,
      health: 100,
      energy: 100,
      minerals: 0,
      score: 0,
      propellerAngle: 0
    };

    const state: GameState = {
      ship,
      minerals: [],
      pendingMinerals: [],
      mines: [],
      station,
      particles: [],
      particlePool: [],
      explosions: [],
      lastMineSpawn: 0,
      mineSpawnInterval: 0,
      mineSpawnMin: MINE_SPAWN_MIN,
      mineSpawnMax: MINE_SPAWN_MAX,
      difficultyLevel: 0,
      mineralPulseSpeed: 1,
      stormDensity: 1,
      difficultyBoostEnd: 0,
      showLowEnergyWarning: false,
      warningEndTime: 0,
      screenShake: 0,
      frameCount: 0,
      gameOver: false,
      deliveryCount: 0,
      currentTime: 0,
      mineralNextId: 0
    };

    const mineralCount = this.randomInt(MINERAL_COUNT_MIN, MINERAL_COUNT_MAX);
    for (let i = 0; i < mineralCount; i++) {
      state.minerals.push(this.createMineral(state));
    }

    state.mineSpawnInterval = this.randomFloat(state.mineSpawnMin, state.mineSpawnMax);

    return state;
  }

  private createMineral(state: GameState, station?: SpaceStation): Mineral {
    const targetStation = station || state.station;
    let x: number, y: number;
    let attempts = 0;
    let valid = false;

    while (!valid && attempts < 100) {
      x = this.randomFloat(100, CANVAS_WIDTH - 150);
      y = this.randomFloat(50, CANVAS_HEIGHT - 50);
      attempts++;
      valid = true;

      if (this.distance(x, y, targetStation.x, targetStation.y) < MINERAL_OVERLAP_DISTANCE) {
        valid = false;
        continue;
      }

      if (this.distance(x, y, state.ship.x, state.ship.y) < MINERAL_OVERLAP_DISTANCE) {
        valid = false;
        continue;
      }

      for (const existing of state.minerals) {
        if (this.distance(x, y, existing.x, existing.y) < MINERAL_OVERLAP_DISTANCE) {
          valid = false;
          break;
        }
      }
    }

    return {
      x: x!,
      y: y!,
      radius: MINERAL_RADIUS,
      pulsePhase: Math.random() * Math.PI * 2,
      isCollecting: false,
      collectProgress: 0,
      id: state.mineralNextId++
    };
  }

  private createMine(): Mine {
    const side = this.randomInt(0, 3);
    let x: number, y: number;

    switch (side) {
      case 0:
        x = this.randomFloat(50, CANVAS_WIDTH - 50);
        y = -20;
        break;
      case 1:
        x = CANVAS_WIDTH + 20;
        y = this.randomFloat(50, CANVAS_HEIGHT - 50);
        break;
      case 2:
        x = this.randomFloat(50, CANVAS_WIDTH - 50);
        y = CANVAS_HEIGHT + 20;
        break;
      default:
        x = -20;
        y = this.randomFloat(50, CANVAS_HEIGHT - 50);
    }

    return {
      x,
      y,
      radius: MINE_RADIUS,
      pulsePhase: Math.random() * Math.PI * 2,
      opacity: 0.7
    };
  }

  private acquireParticle(): Particle {
    if (this.state.particlePool.length > 0) {
      const p = this.state.particlePool.pop()!;
      p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
      p.size = 0; p.color = ''; p.life = 0; p.maxLife = 0;
      return p;
    }
    return {
      x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '',
      life: 0, maxLife: 0, type: 'exhaust'
    };
  }

  private releaseParticle(particle: Particle): void {
    if (this.state.particlePool.length < MAX_PARTICLES) {
      this.state.particlePool.push(particle);
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.input.up = true;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.input.down = true;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.input.left = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.input.right = true;
        break;
      case 'e':
      case 'E':
        this.input.collect = true;
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.input.up = false;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.input.down = false;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.input.left = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.input.right = false;
        break;
      case 'e':
      case 'E':
        this.input.collect = false;
        break;
    }
  };

  private renderBackground(): void {
    const gradient = this.backgroundCtx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH
    );
    gradient.addColorStop(0, '#1a0533');
    gradient.addColorStop(1, '#0a0015');
    this.backgroundCtx.fillStyle = gradient;
    this.backgroundCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let i = 0; i < 100; i++) {
      const x = this.randomFloat(0, CANVAS_WIDTH);
      const y = this.randomFloat(0, CANVAS_HEIGHT);
      const size = this.randomFloat(0.5, 2);
      const alpha = this.randomFloat(0.3, 0.8);
      this.backgroundCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.backgroundCtx.beginPath();
      this.backgroundCtx.arc(x, y, size, 0, Math.PI * 2);
      this.backgroundCtx.fill();
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (): void => {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    if (!this.state.gameOver) {
      this.update(deltaTime, currentTime / 1000);
    }

    this.render();
    this.updateUI();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, currentTime: number): void {
    this.state.currentTime = currentTime;
    this.state.frameCount++;

    this.updateShip(dt);
    this.updateMinerals(dt);
    this.updatePendingMinerals(currentTime);
    this.ensureMineralCount();
    this.updateMines(dt);
    this.updateStation(dt);
    this.updateParticles(dt);
    this.updateExplosions(dt);
    this.updateDifficulty(currentTime);
    this.spawnMines(currentTime);
    this.spawnStormParticles();
    this.checkCollisions();
    this.checkStationInteraction();
    this.checkEnergyWarning(currentTime);
    this.updateScreenShake(dt);
    this.cleanupParticles();
  }

  private updateShip(dt: number): void {
    const ship = this.state.ship;
    let dx = 0, dy = 0;

    if (this.input.up) dy -= 1;
    if (this.input.down) dy += 1;
    if (this.input.left) dx -= 1;
    if (this.input.right) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const mag = Math.sqrt(dx * dx + dy * dy);
      dx /= mag;
      dy /= mag;

      ship.x += dx * ship.speed * dt;
      ship.y += dy * ship.speed * dt;
      ship.angle = Math.atan2(dy, dx);

      this.emitExhaustParticles(ship.x, ship.y, ship.angle);
    }

    ship.x = Math.max(SHIP_BASE / 2, Math.min(CANVAS_WIDTH - SHIP_BASE / 2, ship.x));
    ship.y = Math.max(SHIP_HEIGHT / 2, Math.min(CANVAS_HEIGHT - SHIP_HEIGHT / 2, ship.y));

    ship.propellerAngle += 15 * Math.PI / 180;

    ship.energy = Math.max(0, ship.energy - ENERGY_DRAIN_RATE * dt);

    if (this.input.collect) {
      this.tryCollectMineral(dt);
    } else {
      this.state.minerals.forEach(m => {
        m.isCollecting = false;
        m.collectProgress = 0;
      });
    }
  }

  private emitExhaustParticles(x: number, y: number, angle: number): void {
    if (this.state.particles.length >= MAX_PARTICLES) return;

    const backAngle = angle + Math.PI;

    for (let i = 0; i < 5; i++) {
      if (this.state.particles.length >= MAX_PARTICLES) break;

      const spread = this.randomFloat(-0.3, 0.3);
      const particleAngle = backAngle + spread;
      const speed = this.randomFloat(30, 60);
      const size = this.randomFloat(2, 4);

      const colorT = Math.random();
      const r = Math.floor(255);
      const g = Math.floor(152 + (235 - 152) * colorT);
      const b = Math.floor(0 + (59 - 0) * colorT);
      const color = `rgb(${r}, ${g}, ${b})`;

      const p = this.acquireParticle();
      p.x = x + Math.cos(backAngle) * 15;
      p.y = y + Math.sin(backAngle) * 15;
      p.vx = Math.cos(particleAngle) * speed;
      p.vy = Math.sin(particleAngle) * speed;
      p.size = size;
      p.color = color;
      p.life = EXHAUST_LIFE;
      p.maxLife = EXHAUST_LIFE;
      p.type = 'exhaust';
      this.state.particles.push(p);
    }
  }

  private tryCollectMineral(dt: number): void {
    const ship = this.state.ship;

    for (const mineral of this.state.minerals) {
      const dist = this.distance(ship.x, ship.y, mineral.x, mineral.y);

      if (dist < COLLECT_DISTANCE) {
        mineral.isCollecting = true;
        mineral.collectProgress += dt / COLLECT_DURATION;

        if (mineral.collectProgress >= 1) {
          ship.minerals++;

          const idx = this.state.minerals.findIndex(m => m.id === mineral.id);
          if (idx > -1) {
            this.state.minerals.splice(idx, 1);
          }

          this.state.pendingMinerals.push({
            spawnTime: this.state.currentTime + MINERAL_RESPAWN_DELAY
          });

          break;
        }
      } else {
        mineral.isCollecting = false;
        mineral.collectProgress = 0;
      }
    }
  }

  private updateMinerals(dt: number): void {
    this.state.minerals.forEach(mineral => {
      mineral.pulsePhase += dt * Math.PI * this.state.mineralPulseSpeed;
    });
  }

  private updatePendingMinerals(currentTime: number): void {
    const toSpawn: PendingMineral[] = [];
    this.state.pendingMinerals = this.state.pendingMinerals.filter(p => {
      if (currentTime >= p.spawnTime) {
        toSpawn.push(p);
        return false;
      }
      return true;
    });

    for (const _ of toSpawn) {
      if (this.state.minerals.length < MINERAL_COUNT_MAX) {
        this.state.minerals.push(this.createMineral(this.state));
      }
    }
  }

  private ensureMineralCount(): void {
    const total = this.state.minerals.length + this.state.pendingMinerals.length;
    const target = this.randomInt(MINERAL_COUNT_MIN, MINERAL_COUNT_MAX);
    const deficit = Math.max(0, target - total);

    for (let i = 0; i < deficit; i++) {
      this.state.pendingMinerals.push({
        spawnTime: this.state.currentTime + this.randomFloat(0, 2)
      });
    }
  }

  private updateMines(dt: number): void {
    this.state.mines.forEach(mine => {
      mine.pulsePhase += dt * Math.PI * 2 / 0.3;
      mine.opacity = 0.5 + Math.sin(mine.pulsePhase) * 0.2;
    });
  }

  private updateStation(dt: number): void {
    this.state.station.glowPhase += dt * Math.PI * 0.5;
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
  }

  private updateExplosions(dt: number): void {
    this.state.explosions.forEach(exp => {
      exp.life -= dt;
      const t = 1 - exp.life / exp.maxLife;
      exp.radius = 10 + (exp.maxRadius - 10) * t;
    });
  }

  private updateDifficulty(currentTime: number): void {
    if (this.state.difficultyBoostEnd > 0 && currentTime > this.state.difficultyBoostEnd) {
      this.state.mineralPulseSpeed = 1;
      this.state.stormDensity = 1;
      this.state.difficultyBoostEnd = 0;
    }
  }

  private spawnMines(currentTime: number): void {
    if (currentTime - this.state.lastMineSpawn > this.state.mineSpawnInterval) {
      const count = this.randomInt(MINE_SPAWN_COUNT_MIN, MINE_SPAWN_COUNT_MAX);
      for (let i = 0; i < count; i++) {
        this.state.mines.push(this.createMine());
      }
      this.state.lastMineSpawn = currentTime;
      this.state.mineSpawnInterval = this.randomFloat(
        this.state.mineSpawnMin,
        this.state.mineSpawnMax
      );
    }
  }

  private spawnStormParticles(): void {
    if (this.state.particles.length >= MAX_PARTICLES) return;

    const interval = Math.max(5, Math.floor(STORM_PARTICLE_BASE_INTERVAL / this.state.stormDensity));

    if (this.state.frameCount % interval === 0) {
      const count = Math.floor(1 + this.state.stormDensity * 2);
      for (let i = 0; i < count; i++) {
        if (this.state.particles.length >= MAX_PARTICLES) break;

        const size = this.randomFloat(1, 3);
        const speed = this.randomFloat(30, 80);

        const p = this.acquireParticle();
        p.x = CANVAS_WIDTH + 10;
        p.y = this.randomFloat(0, CANVAS_HEIGHT);
        p.vx = -speed;
        p.vy = this.randomFloat(-10, 10);
        p.size = size;
        p.color = 'rgba(20, 20, 30, 0.8)';
        p.life = 10;
        p.maxLife = 10;
        p.type = 'storm';
        this.state.particles.push(p);
      }
    }
  }

  private checkCollisions(): void {
    const ship = this.state.ship;

    for (let i = this.state.mines.length - 1; i >= 0; i--) {
      const mine = this.state.mines[i];
      const dist = this.distance(ship.x, ship.y, mine.x, mine.y);

      if (dist < mine.radius + SHIP_BASE / 2) {
        this.state.mines.splice(i, 1);
        this.triggerExplosion(mine.x, mine.y);
        ship.health = Math.max(0, ship.health - MINE_DAMAGE);
        this.state.screenShake = SCREEN_SHAKE_DURATION;

        if (ship.health <= 0) {
          this.state.gameOver = true;
        }
      }
    }
  }

  private triggerExplosion(x: number, y: number): void {
    this.state.explosions.push({
      x,
      y,
      radius: 10,
      maxRadius: 60,
      life: EXPLOSION_LIFE,
      maxLife: EXPLOSION_LIFE
    });

    for (let i = 0; i < 20; i++) {
      if (this.state.particles.length >= MAX_PARTICLES) break;

      const angle = this.randomFloat(0, Math.PI * 2);
      const speed = this.randomFloat(50, 150);
      const size = this.randomFloat(2, 5);

      const colorT = Math.random();
      const r = 255;
      const g = Math.floor(23 + (145 - 23) * colorT);
      const b = Math.floor(68 + (0 - 68) * colorT);
      const color = `rgb(${r}, ${g}, ${b})`;

      const p = this.acquireParticle();
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = size;
      p.color = color;
      p.life = 0.5;
      p.maxLife = 0.5;
      p.type = 'explosion';
      this.state.particles.push(p);
    }
  }

  private checkStationInteraction(): void {
    const ship = this.state.ship;
    const station = this.state.station;
    const dist = this.distance(ship.x, ship.y, station.x, station.y);
    const inRange = dist < STATION_GLOW_RADIUS;

    if (inRange && this.input.collect) {
      ship.energy = 100;

      if (ship.minerals > 0) {
        const delivered = ship.minerals;
        ship.score += delivered * SCORE_PER_MINERAL;
        this.state.deliveryCount += delivered;
        ship.minerals = 0;

        while (this.state.deliveryCount >= DIFFICULTY_MINERAL_BONUS) {
          this.state.deliveryCount -= DIFFICULTY_MINERAL_BONUS;
          this.state.difficultyLevel++;

          this.state.mineSpawnMin = Math.max(
            MIN_MINE_SPAWN_INTERVAL,
            this.state.mineSpawnMin - DIFFICULTY_MINE_REDUCTION
          );
          this.state.mineSpawnMax = Math.max(
            MIN_MINE_SPAWN_INTERVAL,
            this.state.mineSpawnMax - DIFFICULTY_MINE_REDUCTION
          );

          if (this.state.mineSpawnMin > this.state.mineSpawnMax) {
            this.state.mineSpawnMin = this.state.mineSpawnMax;
          }

          if (this.state.mineSpawnMin === this.state.mineSpawnMax) {
            this.state.mineSpawnInterval = Math.min(
              this.state.mineSpawnInterval,
              this.state.mineSpawnMin
            );
          } else {
            this.state.mineSpawnInterval = Math.min(
              this.state.mineSpawnInterval,
              this.randomFloat(this.state.mineSpawnMin, this.state.mineSpawnMax)
            );
          }

          this.state.mineralPulseSpeed = 1 + DIFFICULTY_PULSE_BOOST;
          this.state.stormDensity = 1 + DIFFICULTY_STORM_BOOST;
          this.state.difficultyBoostEnd = this.state.currentTime + DIFFICULTY_DURATION;
        }
      }
    }
  }

  private checkEnergyWarning(currentTime: number): void {
    if (this.state.ship.energy < 20 && !this.state.showLowEnergyWarning) {
      this.state.showLowEnergyWarning = true;
      this.state.warningEndTime = currentTime + WARNING_DURATION;
    }

    if (this.state.showLowEnergyWarning && currentTime > this.state.warningEndTime) {
      if (this.state.ship.energy < 20) {
        this.state.warningEndTime = currentTime + WARNING_DURATION;
      } else {
        this.state.showLowEnergyWarning = false;
      }
    }
  }

  private updateScreenShake(dt: number): void {
    if (this.state.screenShake > 0) {
      this.state.screenShake -= dt;
    }
  }

  private cleanupParticles(): void {
    const alive: Particle[] = [];
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      if (p.life > 0) {
        alive.push(p);
      } else {
        this.releaseParticle(p);
      }
    }
    this.state.particles = alive;

    this.state.explosions = this.state.explosions.filter(e => e.life > 0);
    this.state.mines = this.state.mines.filter(m =>
      m.x > -50 && m.x < CANVAS_WIDTH + 50 && m.y > -50 && m.y < CANVAS_HEIGHT + 50
    );
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();

    if (this.state.screenShake > 0) {
      const shake = SCREEN_SHAKE_INTENSITY;
      ctx.translate(
        this.randomFloat(-shake, shake),
        this.randomFloat(-shake, shake)
      );
    }

    ctx.drawImage(this.backgroundCanvas, 0, 0);

    this.renderStation();
    this.renderMinerals();
    this.renderMines();
    this.renderParticles();
    this.renderExplosions();
    this.renderShip();
    this.renderCollectProgress();

    ctx.restore();
  }

  private renderShip(): void {
    const ctx = this.ctx;
    const ship = this.state.ship;

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    ctx.fillStyle = SHIP_COLOR;
    ctx.beginPath();
    ctx.moveTo(SHIP_HEIGHT / 2, 0);
    ctx.lineTo(SHIP_HEIGHT / 4, -SHIP_BASE / 2);
    ctx.lineTo(-SHIP_HEIGHT / 4, -SHIP_BASE / 2);
    ctx.lineTo(-SHIP_HEIGHT / 2, 0);
    ctx.lineTo(-SHIP_HEIGHT / 4, SHIP_BASE / 2);
    ctx.lineTo(SHIP_HEIGHT / 4, SHIP_BASE / 2);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(ship.propellerAngle);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private renderMinerals(): void {
    const ctx = this.ctx;

    this.state.minerals.forEach(mineral => {
      const pulse = 0.7 + 0.3 * Math.sin(mineral.pulsePhase);

      ctx.save();
      ctx.translate(mineral.x, mineral.y);

      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15 * pulse;

      ctx.fillStyle = MINERAL_COLOR;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;

      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
        const r = mineral.radius * pulse;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    });
  }

  private renderMines(): void {
    const ctx = this.ctx;

    this.state.mines.forEach(mine => {
      ctx.save();
      ctx.translate(mine.x, mine.y);

      ctx.globalAlpha = mine.opacity;
      ctx.fillStyle = MINE_COLOR;

      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * mine.radius;
        const y = Math.sin(angle) * mine.radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  private renderStation(): void {
    const ctx = this.ctx;
    const station = this.state.station;
    const glowPulse = 0.5 + 0.5 * Math.sin(station.glowPhase);

    ctx.save();
    ctx.translate(station.x, station.y);

    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, STATION_GLOW_RADIUS);
    glowGradient.addColorStop(0, `rgba(0, 230, 118, ${0.3 * glowPulse})`);
    glowGradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, STATION_GLOW_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = STATION_COLOR;
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(station.height / 2, 0);
    ctx.lineTo(station.height / 4, -station.width / 2);
    ctx.lineTo(-station.height / 4, -station.width / 2);
    ctx.lineTo(-station.height / 2, 0);
    ctx.lineTo(-station.height / 4, station.width / 2);
    ctx.lineTo(station.height / 4, station.width / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    this.state.particles.forEach(p => {
      const alpha = Math.max(0, p.life / p.maxLife);

      if (p.type === 'storm') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size * alpha), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    });
  }

  private renderExplosions(): void {
    const ctx = this.ctx;

    this.state.explosions.forEach(exp => {
      const t = 1 - exp.life / exp.maxLife;
      const alpha = Math.max(0, 1 - t);

      const gradient = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, exp.radius);
      gradient.addColorStop(0, `rgba(255, 145, 0, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 23, 68, ${alpha * 0.7})`);
      gradient.addColorStop(1, `rgba(255, 23, 68, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderCollectProgress(): void {
    const ctx = this.ctx;

    this.state.minerals.forEach(mineral => {
      if (mineral.isCollecting && mineral.collectProgress > 0) {
        const barWidth = 80;
        const barHeight = 8;
        const x = mineral.x - barWidth / 2;
        const y = mineral.y - mineral.radius - 20;

        ctx.fillStyle = '#444444';
        ctx.fillRect(x, y, barWidth, barHeight);

        const progress = Math.min(1, mineral.collectProgress);
        const fillWidth = barWidth * progress;

        ctx.fillStyle = '#76ff03';
        ctx.fillRect(x, y, fillWidth, barHeight);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
      }
    });
  }

  private lastRadarData: UIState['radarData'] | null = null;
  private lastUiState: UIState | null = null;

  private updateUI(): void {
    const state = this.state;
    const shouldUpdateRadar = state.frameCount % RADAR_REFRESH_INTERVAL === 0;

    let radarData = this.lastRadarData;
    if (shouldUpdateRadar || !radarData) {
      const scanAngle = (state.currentTime % RADAR_SCAN_PERIOD) / RADAR_SCAN_PERIOD * Math.PI * 2;
      radarData = {
        ship: { x: state.ship.x, y: state.ship.y },
        minerals: state.minerals.map(m => ({ x: m.x, y: m.y })),
        mines: state.mines.map(m => ({ x: m.x, y: m.y })),
        station: { x: state.station.x, y: state.station.y },
        scanAngle
      };
      this.lastRadarData = radarData;
    }

    const needsFullUpdate = shouldUpdateRadar ||
      !this.lastUiState ||
      this.lastUiState.health !== state.ship.health ||
      this.lastUiState.minerals !== state.ship.minerals ||
      this.lastUiState.energy !== state.ship.energy ||
      this.lastUiState.score !== state.ship.score ||
      this.lastUiState.showLowEnergyWarning !== state.showLowEnergyWarning ||
      this.lastUiState.gameOver !== state.gameOver ||
      this.lastUiState.radarData !== radarData;

    if (needsFullUpdate) {
      const uiState: UIState = {
        health: state.ship.health,
        minerals: state.ship.minerals,
        energy: state.ship.energy,
        score: state.ship.score,
        showLowEnergyWarning: state.showLowEnergyWarning,
        gameOver: state.gameOver,
        radarData
      };
      this.lastUiState = uiState;
      this.uiCallback(uiState);
    }
  }

  public restart(): void {
    this.state = this.createInitialState();
    this.lastRadarData = null;
    this.lastUiState = null;
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
