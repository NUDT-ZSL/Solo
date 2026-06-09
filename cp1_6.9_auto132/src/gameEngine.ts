import {
  GameState,
  GameConfig,
  DEFAULT_CONFIG,
  HexCoord,
  HexCell,
  GameModule,
  ModuleType,
  Particle,
  ShadowBlock,
  CONNECTION_COLORS,
  MODULE_COLORS,
  EnergyFlowRecord
} from './types';

export class GameEngine {
  private state: GameState;
  private config: GameConfig;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private startTime: number = 0;
  private onStateChange: ((state: GameState) => void) | null = null;
  private particleIdCounter: number = 0;
  private moduleIdCounter: number = 0;
  private shadowIdCounter: number = 0;
  private loopTracking: Map<string, number> = new Map();

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const grid = new Map<string, HexCell>();
    const { gridWidth, gridHeight, hexSize } = this.config;

    for (let q = 0; q < gridWidth; q++) {
      for (let r = 0; r < gridHeight; r++) {
        const coord: HexCoord = { q, r };
        const isCore = q === Math.floor(gridWidth / 2) && r === Math.floor(gridHeight / 2);
        grid.set(this.coordKey(coord), {
          coord,
          module: null,
          isShadow: false,
          shadowBrightness: 1,
          shadowTransitionStart: null,
          isShieldProtected: false,
          isCore
        });
      }
    }

    return {
      grid,
      modules: new Map(),
      particles: [],
      shadowBlocks: [],
      shieldPulses: [],
      warningGlows: [],
      energy: this.config.initialEnergy,
      moduleCredits: this.config.initialCredits,
      currentLevel: 1,
      survivalTime: 0,
      invasionsRepelled: 0,
      isGameOver: false,
      lastShadowSpawnTime: 0,
      coreCoveredStartTime: null,
      totalShadowCells: 0,
      selectedCell: null,
      hoveredModule: null,
      hexSize,
      canvasWidth: 0,
      canvasHeight: 0,
      lastHarvestTime: 0,
      lastTowerUpgradeTime: 0,
      energyLoopCheckTime: 0,
      animations: new Map()
    };
  }

  public setCanvasSize(width: number, height: number): void {
    this.state.canvasWidth = width;
    this.state.canvasHeight = height;
  }

  public setHexSize(size: number): void {
    this.state.hexSize = size;
  }

  public setStateChangeListener(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  public getState(): GameState {
    return this.state;
  }

  public getConfig(): GameConfig {
    return this.config;
  }

  public start(): void {
    if (this.animationFrameId !== null) return;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public reset(): void {
    this.stop();
    this.state = this.createInitialState();
    this.loopTracking.clear();
    this.particleIdCounter = 0;
    this.moduleIdCounter = 0;
    this.shadowIdCounter = 0;
  }

  private gameLoop = (currentTime: number): void => {
    if (this.state.isGameOver) {
      this.animationFrameId = requestAnimationFrame(this.gameLoop);
      return;
    }

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.state.survivalTime = Math.floor((currentTime - this.startTime) / 1000);

    this.update(deltaTime, currentTime);

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, currentTime: number): void {
    this.updateHarvesting(currentTime);
    this.updateTowerUpgrades(currentTime);
    this.updateShadow(currentTime);
    this.updateParticles(deltaTime, currentTime);
    this.updateShieldPulses(currentTime);
    this.updateWarningGlows(currentTime);
    this.checkEnergyLoops(currentTime);
    this.checkCoreProtection(currentTime);
    this.checkInvasionRepelled();
    this.updateModuleAnimations(currentTime);
  }

  private updateHarvesting(currentTime: number): void {
    if (currentTime - this.state.lastHarvestTime < this.config.harvestInterval) return;
    this.state.lastHarvestTime = currentTime;

    this.state.modules.forEach((module) => {
      if (module.type === 'harvester') {
        const harvestAmount = this.config.harvestAmount * module.level;
        module.storedEnergy += harvestAmount;
        this.recordOutputEnergy(module, harvestAmount, currentTime);
        this.distributeEnergyToNeighbors(module, harvestAmount, currentTime);
      }
    });
  }

  private updateTowerUpgrades(currentTime: number): void {
    if (currentTime - this.state.lastTowerUpgradeTime < this.config.towerUpgradeInterval) return;
    this.state.lastTowerUpgradeTime = currentTime;

    this.state.modules.forEach((module) => {
      if (module.type === 'tower' && module.level < this.config.towerMaxLevel) {
        if (module.storedEnergy >= this.config.towerUpgradeCost) {
          module.storedEnergy -= this.config.towerUpgradeCost;
          module.level++;
          this.state.currentLevel = Math.max(this.state.currentLevel, module.level);
        }
      }
    });
  }

  private distributeEnergyToNeighbors(module: GameModule, amount: number, currentTime: number): void {
    const neighbors = this.getHexNeighbors(module.coord);
    const validNeighbors = neighbors.filter(
      (c) => this.isValidCoord(c) && this.getCell(c)?.module
    );

    if (validNeighbors.length === 0) return;

    const perNeighbor = amount / validNeighbors.length;
    validNeighbors.forEach((neighborCoord) => {
      this.createParticle(module.coord, neighborCoord, perNeighbor, module.type, currentTime);
    });
  }

  private createParticle(
    from: HexCoord,
    to: HexCoord,
    energyValue: number,
    fromType: ModuleType,
    _currentTime: number
  ): void {
    if (this.state.particles.length >= this.config.maxParticles) {
      this.mergeLowPriorityParticles();
    }

    const toCell = this.getCell(to);
    const toModule = toCell?.module;
    if (!toModule) return;

    const connectionKey = `${fromType}-${toModule.type}`;
    const color = CONNECTION_COLORS[connectionKey] || '#FFFFFF';

    let speed: number;
    if (energyValue <= 5) {
      speed = this.config.particleSpeedLow;
    } else if (energyValue <= 10) {
      speed = this.config.particleSpeedMid;
    } else {
      speed = this.config.particleSpeedHigh;
    }

    const particle: Particle = {
      id: `p_${this.particleIdCounter++}`,
      fromCoord: from,
      toCoord: to,
      progress: 0,
      speed,
      color,
      opacity: 1,
      energyValue,
      priority: energyValue
    };

    this.state.particles.push(particle);
  }

  private mergeLowPriorityParticles(): void {
    const sorted = [...this.state.particles].sort((a, b) => a.priority - b.priority);
    const lowPriority = sorted.filter((p) => p.energyValue < 3);
    
    if (lowPriority.length >= 2) {
      const toRemove = lowPriority.slice(0, 2);
      this.state.particles = this.state.particles.filter(
        (p) => !toRemove.includes(p)
      );
    }
  }

  private updateParticles(deltaTime: number, currentTime: number): void {
    const hexSize = this.state.hexSize;
    const toRemove: string[] = [];

    this.state.particles.forEach((particle) => {
      const fromPixel = this.hexToPixel(particle.fromCoord, hexSize);
      const toPixel = this.hexToPixel(particle.toCoord, hexSize);
      const dx = toPixel.x - fromPixel.x;
      const dy = toPixel.y - fromPixel.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const progressPerMs = particle.speed / Math.max(distance, 1);
      particle.progress += progressPerMs * (deltaTime / 1000);

      if (particle.progress >= 1) {
        toRemove.push(particle.id);
        this.applyEnergyToModule(particle.toCoord, particle.energyValue, particle.fromCoord, currentTime);
      }
    });

    this.state.particles = this.state.particles.filter((p) => !toRemove.includes(p.id));
  }

  private applyEnergyToModule(
    coord: HexCoord,
    amount: number,
    fromCoord: HexCoord,
    currentTime: number
  ): void {
    const cell = this.getCell(coord);
    if (!cell?.module) return;

    const module = cell.module;
    module.storedEnergy += amount;
    this.recordInputEnergy(module, amount, currentTime);

    if (module.type !== 'shield') {
      const neighbors = this.getHexNeighbors(coord).filter(
        (c) => {
          const cc = this.coordKey(c);
          const fc = this.coordKey(fromCoord);
          return cc !== fc && this.isValidCoord(c) && this.getCell(c)?.module;
        }
      );

      if (neighbors.length > 0) {
        const loopKey = `${this.coordKey(coord)}-${this.coordKey(fromCoord)}`;
        if (!this.loopTracking.has(loopKey)) {
          this.loopTracking.set(loopKey, currentTime);
        }
        const forward = amount / neighbors.length;
        neighbors.forEach((n) => {
          this.createParticle(coord, n, forward, module.type, currentTime);
        });
      }
    }
  }

  private recordInputEnergy(module: GameModule, value: number, currentTime: number): void {
    const record: EnergyFlowRecord = { timestamp: currentTime, value };
    module.inputEnergy.push(record);
    module.inputEnergy = module.inputEnergy.filter((r) => currentTime - r.timestamp < 3000);
  }

  private recordOutputEnergy(module: GameModule, value: number, currentTime: number): void {
    const record: EnergyFlowRecord = { timestamp: currentTime, value };
    module.outputEnergy.push(record);
    module.outputEnergy = module.outputEnergy.filter((r) => currentTime - r.timestamp < 3000);
  }

  public getAverageInput(module: GameModule, currentTime: number): number {
    const recent = module.inputEnergy.filter((r) => currentTime - r.timestamp < 3000);
    if (recent.length === 0) return 0;
    const total = recent.reduce((s, r) => s + r.value, 0);
    return Math.round((total / 3) * 100) / 100;
  }

  public getAverageOutput(module: GameModule, currentTime: number): number {
    const recent = module.outputEnergy.filter((r) => currentTime - r.timestamp < 3000);
    if (recent.length === 0) return 0;
    const total = recent.reduce((s, r) => s + r.value, 0);
    return Math.round((total / 3) * 100) / 100;
  }

  private checkEnergyLoops(currentTime: number): void {
    if (currentTime - this.state.energyLoopCheckTime < 1000) return;
    this.state.energyLoopCheckTime = currentTime;

    const toRemove: string[] = [];
    this.loopTracking.forEach((startTime, key) => {
      if (currentTime - startTime > this.config.loopThreshold) {
        const [coordKey] = key.split('-');
        const cell = this.state.grid.get(coordKey);
        if (cell?.module) {
          cell.module.isWarning = true;
          cell.module.warningStartTime = currentTime;
        }
        toRemove.push(key);
      }
    });

    toRemove.forEach((k) => this.loopTracking.delete(k));

    this.state.modules.forEach((module) => {
      if (module.isWarning && module.warningStartTime) {
        if (currentTime - module.warningStartTime > 2000) {
          module.isWarning = false;
          module.warningStartTime = null;
        }
      }
    });
  }

  private updateShadow(currentTime: number): void {
    if (currentTime - this.state.lastShadowSpawnTime >= this.config.shadowSpawnInterval) {
      this.spawnShadowBlock(currentTime);
      this.state.lastShadowSpawnTime = currentTime;
      this.state.warningGlows.push({ startTime: currentTime, duration: 200 });
    }

    this.state.shadowBlocks.forEach((block) => {
      if (currentTime - block.lastSpreadTime >= this.config.shadowSpreadInterval) {
        this.spreadShadow(block, currentTime);
        block.lastSpreadTime = currentTime;
      }
    });

    this.updateShadowTransitions(currentTime);
    this.recalculateTotalShadowCells();
    this.updateShieldProtection();
  }

  private spawnShadowBlock(currentTime: number): void {
    const { gridWidth, gridHeight } = this.config;
    const corners: Array<{ q: number; r: number; dq: number; dr: number }> = [
      { q: 0, r: 0, dq: 1, dr: 1 },
      { q: gridWidth - 2, r: 0, dq: -1, dr: 1 },
      { q: 0, r: gridHeight - 2, dq: 1, dr: -1 },
      { q: gridWidth - 2, r: gridHeight - 2, dq: -1, dr: -1 }
    ];

    corners.forEach((corner) => {
      const cells: HexCoord[] = [];
      for (let dq = 0; dq < 2; dq++) {
        for (let dr = 0; dr < 2; dr++) {
          const coord: HexCoord = { q: corner.q + dq, r: corner.r + dr };
          if (this.isValidCoord(coord)) {
            cells.push(coord);
          }
        }
      }

      this.state.shadowBlocks.push({
        id: `s_${this.shadowIdCounter++}`,
        cells,
        startTime: currentTime,
        direction: { dq: corner.dq, dr: corner.dr },
        lastSpreadTime: currentTime
      });

      cells.forEach((coord) => {
        const cell = this.getCell(coord);
        if (cell && !cell.isShieldProtected && !cell.isCore) {
          cell.isShadow = true;
          cell.shadowTransitionStart = currentTime;
        }
      });
    });
  }

  private spreadShadow(block: ShadowBlock, currentTime: number): void {
    const newCells: HexCoord[] = [];
    block.cells.forEach((coord) => {
      const neighbors = this.getHexNeighbors(coord);
      neighbors.forEach((n) => {
        if (
          this.isValidCoord(n) &&
          !block.cells.some((c) => c.q === n.q && c.r === n.r) &&
          !newCells.some((c) => c.q === n.q && c.r === n.r)
        ) {
          newCells.push(n);
        }
      });
    });

    newCells.forEach((coord) => {
      const cell = this.getCell(coord);
      if (cell && !cell.isShieldProtected && !cell.isCore) {
        cell.isShadow = true;
        cell.shadowTransitionStart = currentTime;
      } else if (cell?.isShieldProtected) {
        this.triggerShieldPulse(coord, currentTime);
      }
    });

    block.cells = [...block.cells, ...newCells.filter((n) => {
      const c = this.getCell(n);
      return c?.isShadow;
    })];
  }

  private updateShadowTransitions(currentTime: number): void {
    this.state.grid.forEach((cell) => {
      if (cell.shadowTransitionStart !== null) {
        const elapsed = currentTime - cell.shadowTransitionStart;
        const duration = 1000;
        if (elapsed >= duration) {
          cell.shadowBrightness = cell.isShadow ? 0.1 : 1;
          cell.shadowTransitionStart = null;
        } else {
          const t = elapsed / duration;
          if (cell.isShadow) {
            cell.shadowBrightness = 1 - t * 0.9;
          } else {
            cell.shadowBrightness = 0.1 + t * 0.9;
          }
        }
      }
    });
  }

  private recalculateTotalShadowCells(): void {
    let count = 0;
    this.state.grid.forEach((cell) => {
      if (cell.isShadow) count++;
    });
    this.state.totalShadowCells = count;
  }

  private updateShieldProtection(): void {
    this.state.grid.forEach((cell) => {
      cell.isShieldProtected = false;
    });

    this.state.modules.forEach((module) => {
      if (module.type === 'shield') {
        const cell = this.getCell(module.coord);
        if (cell) cell.isShieldProtected = true;
        
        const neighbors = this.getHexNeighbors(module.coord);
        neighbors.forEach((n) => {
          const neighborCell = this.getCell(n);
          if (neighborCell) neighborCell.isShieldProtected = true;
        });
      }
    });
  }

  private triggerShieldPulse(coord: HexCoord, currentTime: number): void {
    const neighbors = this.getHexNeighbors(coord);
    let shieldCoord: HexCoord | null = null;
    
    if (this.getCell(coord)?.module?.type === 'shield') {
      shieldCoord = coord;
    } else {
      for (const n of neighbors) {
        if (this.getCell(n)?.module?.type === 'shield') {
          shieldCoord = n;
          break;
        }
      }
    }

    if (shieldCoord) {
      const shieldCell = this.getCell(shieldCoord);
      const shieldModule = shieldCell?.module;
      if (shieldModule && shieldModule.storedEnergy >= 1) {
        shieldModule.storedEnergy -= 1;
        this.state.shieldPulses.push({
          coord: shieldCoord,
          startTime: currentTime,
          duration: 300,
          maxRadius: 60
        });

        const pulseRange = this.getHexNeighbors(shieldCoord);
        pulseRange.forEach((c) => {
          const cell = this.getCell(c);
          if (cell && cell.isShadow) {
            cell.isShadow = false;
            cell.shadowTransitionStart = currentTime;
          }
        });
        if (shieldCell?.isShadow) {
          shieldCell.isShadow = false;
          shieldCell.shadowTransitionStart = currentTime;
        }
      }
    }
  }

  private updateShieldPulses(currentTime: number): void {
    this.state.shieldPulses = this.state.shieldPulses.filter(
      (p) => currentTime - p.startTime < p.duration
    );
  }

  private updateWarningGlows(currentTime: number): void {
    this.state.warningGlows = this.state.warningGlows.filter(
      (g) => currentTime - g.startTime < g.duration
    );
  }

  private updateModuleAnimations(currentTime: number): void {
    this.state.modules.forEach((module) => {
      module.pulsePhase = (currentTime - module.placementTime) / 2000;
      module.rotationPhase = ((currentTime - module.placementTime) * (30 / 1000)) % 360;
    });
  }

  private checkCoreProtection(currentTime: number): void {
    const { gridWidth, gridHeight } = this.config;
    const coreCoord: HexCoord = {
      q: Math.floor(gridWidth / 2),
      r: Math.floor(gridHeight / 2)
    };
    const coreCell = this.getCell(coreCoord);

    if (coreCell?.isShadow) {
      if (this.state.coreCoveredStartTime === null) {
        this.state.coreCoveredStartTime = currentTime;
      } else if (currentTime - this.state.coreCoveredStartTime >= this.config.coreCoverLimit) {
        this.state.isGameOver = true;
      }
    } else {
      this.state.coreCoveredStartTime = null;
    }
  }

  private checkInvasionRepelled(): void {
    const totalCells = this.config.gridWidth * this.config.gridHeight;
    const shadowPercentage = (this.state.totalShadowCells / totalCells) * 100;

    if (shadowPercentage >= this.config.halfGridThreshold) {
      const totalBefore = this.state.invasionsRepelled;
      this.state.shadowBlocks.forEach((block) => {
        block.cells.forEach((coord) => {
          const cell = this.getCell(coord);
          if (cell && !cell.isShieldProtected && !cell.isCore) {
            if (!cell.module) {
              cell.isShadow = true;
            }
          }
        });
      });
      if (this.state.invasionsRepelled > totalBefore) {
        this.state.energy += this.config.repelEnergyReward;
        this.state.moduleCredits += this.config.repelCreditReward;
      }
    }
  }

  public placeModule(coord: HexCoord, type: ModuleType): boolean {
    if (!this.isValidCoord(coord)) return false;
    const cell = this.getCell(coord);
    if (!cell || cell.module || cell.isShadow || cell.isCore) return false;
    if (this.state.moduleCredits < 1) return false;

    const module: GameModule = {
      id: `m_${this.moduleIdCounter++}`,
      type,
      level: 1,
      coord,
      storedEnergy: 0,
      inputEnergy: [],
      outputEnergy: [],
      placementTime: performance.now(),
      pulsePhase: 0,
      rotationPhase: 0,
      isWarning: false,
      warningStartTime: null,
      energy: 0
    };

    cell.module = module;
    this.state.modules.set(module.id, module);
    this.state.moduleCredits -= 1;

    this.updateShieldProtection();
    this.state.animations.set(module.id, {
      startTime: performance.now(),
      duration: 300,
      type: 'scaleIn'
    });

    return true;
  }

  public upgradeModule(coord: HexCoord): boolean {
    const cell = this.getCell(coord);
    if (!cell?.module) return false;
    const module = cell.module;

    if (module.level >= this.config.moduleMaxLevel) return false;
    if (this.state.energy < this.config.moduleUpgradeCost) return false;

    this.state.energy -= this.config.moduleUpgradeCost;
    module.level++;

    this.state.animations.set(`up_${module.id}`, {
      startTime: performance.now(),
      duration: 300,
      type: 'scaleIn'
    });

    return true;
  }

  public selectCell(coord: HexCoord | null): void {
    this.state.selectedCell = coord;
  }

  public setHoveredModule(module: GameModule | null): void {
    this.state.hoveredModule = module;
  }

  public addEnergy(amount: number): void {
    this.state.energy += amount;
  }

  public spendEnergy(amount: number): boolean {
    if (this.state.energy < amount) return false;
    this.state.energy -= amount;
    return true;
  }

  public pixelToHex(x: number, y: number, hexSize: number): HexCoord {
    const size = hexSize;
    const h = size * 2;
    const w = Math.sqrt(3) * size;
    
    const col = Math.round((x - w / 2) / w);
    const row = Math.round((y - h * 0.75) / (h * 0.75));
    
    const q = col - Math.floor(row / 2);
    const r = row;
    
    return this.roundHex({ q, r });
  }

  public hexToPixel(coord: HexCoord, hexSize: number): { x: number; y: number } {
    const size = hexSize;
    const w = Math.sqrt(3) * size;
    const h = size * 2;
    const { q, r } = coord;
    
    const col = q + Math.floor(r / 2);
    const row = r;
    
    const x = col * w + w / 2;
    const y = row * h * 0.75 + h * 0.75;
    
    return { x, y };
  }

  public getHexNeighbors(coord: HexCoord): HexCoord[] {
    const { q, r } = coord;
    const isEvenRow = r % 2 === 0;
    
    const evenOffsets = [
      { dq: -1, dr: -1 }, { dq: 0, dr: -1 },
      { dq: -1, dr: 0 }, { dq: 1, dr: 0 },
      { dq: -1, dr: 1 }, { dq: 0, dr: 1 }
    ];
    
    const oddOffsets = [
      { dq: 0, dr: -1 }, { dq: 1, dr: -1 },
      { dq: -1, dr: 0 }, { dq: 1, dr: 0 },
      { dq: 0, dr: 1 }, { dq: 1, dr: 1 }
    ];
    
    const offsets = isEvenRow ? evenOffsets : oddOffsets;
    return offsets.map(({ dq, dr }) => ({ q: q + dq, r: r + dr }));
  }

  public isValidCoord(coord: HexCoord): boolean {
    return (
      coord.q >= 0 &&
      coord.q < this.config.gridWidth &&
      coord.r >= 0 &&
      coord.r < this.config.gridHeight
    );
  }

  public getCell(coord: HexCoord): HexCell | undefined {
    return this.state.grid.get(this.coordKey(coord));
  }

  public coordKey(coord: HexCoord): string {
    return `${coord.q},${coord.r}`;
  }

  public roundHex(coord: HexCoord): HexCoord {
    const { q, r } = coord;
    const s = -q - r;
    
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);
    
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    
    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }
    
    return { q: rq, r: rr };
  }

  public calculateScore(): number {
    return this.state.survivalTime * 100 + this.state.invasionsRepelled * 50;
  }

  public getModuleColor(type: ModuleType): string {
    return MODULE_COLORS[type];
  }

  public getConnectionColor(fromType: ModuleType, toType: ModuleType): string {
    const key = `${fromType}-${toType}`;
    return CONNECTION_COLORS[key] || '#FFFFFF';
  }

  public getConnections(): Array<{ from: HexCoord; to: HexCoord; color: string; active: boolean }> {
    const connections: Array<{ from: HexCoord; to: HexCoord; color: string; active: boolean }> = [];
    const seen = new Set<string>();

    this.state.modules.forEach((module) => {
      const neighbors = this.getHexNeighbors(module.coord);
      neighbors.forEach((n) => {
        const neighborCell = this.getCell(n);
        const key = [this.coordKey(module.coord), this.coordKey(n)].sort().join('-');
        
        if (seen.has(key)) return;
        seen.add(key);

        if (neighborCell?.module) {
          const color = this.getConnectionColor(module.type, neighborCell.module.type);
          connections.push({ from: module.coord, to: n, color, active: true });
        } else if (this.isValidCoord(n)) {
          connections.push({ from: module.coord, to: n, color: '#4488FF', active: false });
        }
      });
    });

    return connections;
  }
}

export default GameEngine;
