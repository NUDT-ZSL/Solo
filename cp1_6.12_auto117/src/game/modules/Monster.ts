export type MonsterType = 'normal' | 'heavy' | 'fast';

export interface Monster {
  id: number;
  type: MonsterType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  moveTimer: number;
  moveInterval: number;
  frozen: boolean;
  frozenTimer: number;
  burning: boolean;
  burnTimer: number;
  burnDamageTimer: number;
  hitSparkTimer: number;
  spawnY: number;
}

export interface MonsterDamageEvent {
  monster: Monster;
  damage: number;
  type: 'fire' | 'ice' | 'life' | 'normal';
  timestamp: number;
}

export interface MonsterSpawnEvent {
  monster: Monster;
  timestamp: number;
}

export class MonsterManager {
  monsters: Monster[] = [];
  readonly maxMonsters = 100;
  readonly cols = 10;
  private monsterIdCounter = 0;
  private waveCount = 0;
  private baseWaveSize = 5;
  private waveIncrement = 3;
  private spawnQueue: MonsterType[] = [];
  private spawnTimer = 0;
  private spawnInterval = 0.5;
  private waveTimer = 0;
  readonly waveInterval = 15;
  private damageListeners: ((event: MonsterDamageEvent) => void)[] = [];
  private spawnListeners: ((event: MonsterSpawnEvent) => void)[] = [];
  private waveListeners: ((wave: number) => void)[] = [];
  waveIncoming = false;
  waveWarningTimer = 0;

  constructor() {
    this.queueWave();
  }

  onDamage(listener: (event: MonsterDamageEvent) => void): void {
    this.damageListeners.push(listener);
  }

  onSpawn(listener: (event: MonsterSpawnEvent) => void): void {
    this.spawnListeners.push(listener);
  }

  onWaveStart(listener: (wave: number) => void): void {
    this.waveListeners.push(listener);
  }

  private emitDamage(event: MonsterDamageEvent): void {
    for (const listener of this.damageListeners) {
      listener(event);
    }
  }

  private emitSpawn(event: MonsterSpawnEvent): void {
    for (const listener of this.spawnListeners) {
      listener(event);
    }
  }

  private emitWaveStart(wave: number): void {
    for (const listener of this.waveListeners) {
      listener(wave);
    }
  }

  private queueWave(): void {
    this.waveCount++;
    const waveSize = this.baseWaveSize + (this.waveCount - 1) * this.waveIncrement;
    this.spawnQueue = [];

    const weights = this.getMonsterTypeWeights();
    const totalWeight = weights.normal + weights.heavy + weights.fast;

    for (let i = 0; i < waveSize; i++) {
      const r = Math.random() * totalWeight;
      if (r < weights.normal) {
        this.spawnQueue.push('normal');
      } else if (r < weights.normal + weights.heavy) {
        this.spawnQueue.push('heavy');
      } else {
        this.spawnQueue.push('fast');
      }
    }
    this.waveIncoming = true;
    this.waveWarningTimer = 1.5;
  }

  private getMonsterTypeWeights(): { normal: number; heavy: number; fast: number } {
    const wave = this.waveCount;

    let normalWeight = 10;
    let heavyWeight = 0;
    let fastWeight = 0;

    if (wave >= 2) {
      fastWeight = 3;
      normalWeight = 8;
    }
    if (wave >= 3) {
      heavyWeight = 2;
      normalWeight = 7;
    }
    if (wave >= 4) {
      heavyWeight = 3;
      fastWeight = 4;
      normalWeight = 6;
    }
    if (wave >= 5) {
      heavyWeight = 5;
      fastWeight = 6;
      normalWeight = 4;
    }
    if (wave >= 7) {
      heavyWeight = 7;
      fastWeight = 8;
      normalWeight = 3;
    }
    if (wave >= 10) {
      heavyWeight = 10;
      fastWeight = 10;
      normalWeight = 2;
    }

    return { normal: normalWeight, heavy: heavyWeight, fast: fastWeight };
  }

  private spawnMonster(type: MonsterType): Monster | null {
    if (this.monsters.length >= this.maxMonsters) return null;

    const occupiedCols = new Set(this.monsters.map(m => Math.floor(m.x)));
    let col = -1;
    for (let attempt = 0; attempt < 20; attempt++) {
      const tryCol = Math.floor(Math.random() * this.cols);
      const hasMonster = this.monsters.some(m => Math.floor(m.x) === tryCol && m.y > 17);
      if (!hasMonster) {
        col = tryCol;
        break;
      }
    }
    if (col === -1) {
      col = Math.floor(Math.random() * this.cols);
    }

    let hp: number, moveInterval: number;
    switch (type) {
      case 'heavy':
        hp = 30;
        moveInterval = 3.5;
        break;
      case 'fast':
        hp = 5;
        moveInterval = 1.2;
        break;
      default:
        hp = 10;
        moveInterval = 2.0;
    }

    const monster: Monster = {
      id: this.monsterIdCounter++,
      type,
      x: col,
      y: 20,
      hp,
      maxHp: hp,
      moveTimer: 0,
      moveInterval,
      frozen: false,
      frozenTimer: 0,
      burning: false,
      burnTimer: 0,
      burnDamageTimer: 0,
      hitSparkTimer: 0,
      spawnY: 20
    };

    this.monsters.push(monster);
    this.emitSpawn({ monster, timestamp: Date.now() });
    return monster;
  }

  update(deltaTime: number): void {
    if (this.waveIncoming) {
      this.waveWarningTimer -= deltaTime;
      if (this.waveWarningTimer <= 0) {
        this.waveIncoming = false;
        this.emitWaveStart(this.waveCount);
      }
    }

    this.waveTimer += deltaTime;
    if (this.waveTimer >= this.waveInterval && this.spawnQueue.length === 0) {
      this.waveTimer = 0;
      this.queueWave();
    }

    if (this.spawnQueue.length > 0) {
      this.spawnTimer += deltaTime;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        const type = this.spawnQueue.shift()!;
        this.spawnMonster(type);
      }
    }

    for (const monster of this.monsters) {
      if (monster.frozen) {
        monster.frozenTimer -= deltaTime;
        if (monster.frozenTimer <= 0) {
          monster.frozen = false;
        }
      }

      if (monster.burning) {
        monster.burnTimer -= deltaTime;
        monster.burnDamageTimer += deltaTime;
        if (monster.burnDamageTimer >= 1.0) {
          monster.burnDamageTimer = 0;
          this.damageMonster(monster, 5, 'fire');
        }
        if (monster.burnTimer <= 0) {
          monster.burning = false;
        }
      }

      if (monster.hitSparkTimer > 0) {
        monster.hitSparkTimer -= deltaTime;
      }

      if (!monster.frozen) {
        monster.moveTimer += deltaTime;
        if (monster.moveTimer >= monster.moveInterval) {
          monster.moveTimer = 0;
          monster.y -= 1;
        }
      }
    }

    this.monsters = this.monsters.filter(m => m.hp > 0 && m.y >= -1);
  }

  damageMonster(monster: Monster, damage: number, type: 'fire' | 'ice' | 'life' | 'normal'): void {
    monster.hp -= damage;
    monster.hitSparkTimer = 0.2;
    this.emitDamage({ monster, damage, type, timestamp: Date.now() });
  }

  applyIceEffect(): void {
    for (const monster of this.monsters) {
      if (monster.y >= 0 && monster.y < 20) {
        let nearFragment = false;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const checkX = Math.floor(monster.x) + dx;
            const checkY = Math.floor(monster.y) + dy;
            if (checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < 20) {
              nearFragment = true;
            }
          }
        }
        if (nearFragment || true) {
          monster.frozen = true;
          monster.frozenTimer = 2.0;
        }
      }
    }
  }

  applyFireEffect(sourceX?: number): void {
    for (const monster of this.monsters) {
      if (monster.y >= 0 && monster.y < 20) {
        if (sourceX === undefined || Math.floor(monster.x) === sourceX) {
          monster.burning = true;
          monster.burnTimer = 3.0;
          this.damageMonster(monster, 5, 'fire');
        }
      }
    }
  }

  applyLifeEffect(): number {
    const healing = 5;
    return healing;
  }

  checkGameOver(): boolean {
    return this.monsters.some(m => m.y <= 0);
  }

  getDefenseDrainPerSecond(): number {
    const topMonsters = this.monsters.filter(m => m.y <= 0).length;
    if (topMonsters <= 0) return 0;
    return 8 + topMonsters * 4;
  }

  getWaveNumber(): number {
    return this.waveCount;
  }

  getMonstersInColumn(col: number): Monster[] {
    return this.monsters.filter(m => Math.floor(m.x) === col);
  }
}
