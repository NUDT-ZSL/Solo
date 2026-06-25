import {
  GRID_SIZE,
  TOTAL_FLOORS,
  TileType,
  TileMap,
  Position,
  Player,
  Enemy,
  Item,
  DungeonLayer,
  LogEntry,
  LogType,
  GameState,
  ItemType,
  ITEM_CONFIG
} from './entities';

export class GameEngine {
  private state: GameState;
  private enemyIdCounter: number;
  private itemIdCounter: number;

  constructor() {
    this.enemyIdCounter = 0;
    this.itemIdCounter = 0;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const layers: DungeonLayer[] = [];
    for (let i = 0; i < TOTAL_FLOORS; i++) {
      layers.push(this.generateLayer(i + 1));
    }

    const player: Player = {
      position: { x: 1, y: 1 },
      hp: 100,
      maxHp: 100,
      attack: 30,
      defense: 0
    };

    return {
      currentFloor: 1,
      player,
      layers,
      logs: [],
      enemiesDefeated: 0,
      isGameOver: false,
      isTransitioning: false,
      highlightedTile: null,
      highlightTime: 0,
      playerOffset: { x: 0, y: 0 },
      playerOffsetTime: 0
    };
  }

  private generateLayer(floor: number): DungeonLayer {
    const tiles = this.generateMaze();
    const stairs = this.findValidPosition(tiles, [{ x: 1, y: 1 }]);
    const enemies = this.generateEnemies(tiles, floor);
    const items: Item[] = [];

    return {
      floor,
      tiles,
      stairs,
      enemies,
      items
    };
  }

  private generateMaze(): TileMap {
    const tiles: TileMap = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => 1 as TileType)
    );

    const visited = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => false)
    );

    const carve = (x: number, y: number) => {
      tiles[y][x] = 0;
      visited[y][x] = true;

      const directions = [
        { dx: 0, dy: -2 },
        { dx: 0, dy: 2 },
        { dx: -2, dy: 0 },
        { dx: 2, dy: 0 }
      ].sort(() => Math.random() - 0.5);

      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;
        const mx = x + dx / 2;
        const my = y + dy / 2;

        if (
          nx >= 0 && nx < GRID_SIZE &&
          ny >= 0 && ny < GRID_SIZE &&
          !visited[ny][nx]
        ) {
          tiles[my][mx] = 0;
          carve(nx, ny);
        }
      }
    };

    carve(1, 1);

    for (let i = 0; i < GRID_SIZE * GRID_SIZE * 0.1; i++) {
      const x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      const y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      if (tiles[y][x] === 1) {
        let floorNeighbors = 0;
        if (y > 0 && tiles[y - 1][x] === 0) floorNeighbors++;
        if (y < GRID_SIZE - 1 && tiles[y + 1][x] === 0) floorNeighbors++;
        if (x > 0 && tiles[y][x - 1] === 0) floorNeighbors++;
        if (x < GRID_SIZE - 1 && tiles[y][x + 1] === 0) floorNeighbors++;
        if (floorNeighbors >= 2) {
          tiles[y][x] = 0;
        }
      }
    }

    tiles[1][1] = 0;

    return tiles;
  }

  private findValidPosition(tiles: TileMap, occupied: Position[]): Position {
    const candidates: Position[] = [];
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        if (tiles[y][x] === 0 && !occupied.some(p => p.x === x && p.y === y)) {
          candidates.push({ x, y });
        }
      }
    }
    candidates.sort((a, b) => {
      const distA = Math.abs(a.x - 1) + Math.abs(a.y - 1);
      const distB = Math.abs(b.x - 1) + Math.abs(b.y - 1);
      return distB - distA;
    });
    return candidates[0] || { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
  }

  private generateEnemies(tiles: TileMap, floor: number): Enemy[] {
    const enemyCount = Math.floor(Math.random() * 3) + 3;
    const enemies: Enemy[] = [];
    const occupied: Position[] = [{ x: 1, y: 1 }];

    for (let i = 0; i < enemyCount; i++) {
      const pos = this.findValidPosition(tiles, occupied);
      occupied.push(pos);
      const baseHp = 20 + floor * 10;
      const baseDef = 5 + floor * 3;
      const baseAtk = 5 + floor * 4;

      enemies.push({
        id: this.enemyIdCounter++,
        position: pos,
        hp: baseHp,
        maxHp: baseHp,
        defense: baseDef,
        attack: baseAtk
      });
    }

    return enemies;
  }

  public getState(): GameState {
    return this.state;
  }

  public getCurrentLayer(): DungeonLayer {
    return this.state.layers[this.state.currentFloor - 1];
  }

  public addLog(type: LogType, message: string): void {
    const entry: LogEntry = {
      type,
      message,
      timestamp: Date.now()
    };
    this.state.logs.unshift(entry);
    if (this.state.logs.length > 50) {
      this.state.logs = this.state.logs.slice(0, 50);
    }
  }

  public isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    return this.getCurrentLayer().tiles[y][x] === 0;
  }

  public getEnemyAt(x: number, y: number): Enemy | undefined {
    return this.getCurrentLayer().enemies.find(
      e => e.position.x === x && e.position.y === y
    );
  }

  public getItemAt(x: number, y: number): Item | undefined {
    return this.getCurrentLayer().items.find(
      i => i.position.x === x && i.position.y === y
    );
  }

  public movePlayer(dx: number, dy: number): boolean {
    if (this.state.isGameOver || this.state.isTransitioning) return false;

    const newX = this.state.player.position.x + dx;
    const newY = this.state.player.position.y + dy;

    if (!this.isWalkable(newX, newY)) return false;

    const enemy = this.getEnemyAt(newX, newY);
    if (enemy) {
      this.resolveBattle(enemy);
      return true;
    }

    this.state.player.position = { x: newX, y: newY };
    this.state.playerOffset = { x: dx * 4, y: dy * 4 };
    this.state.playerOffsetTime = 100;
    this.state.highlightedTile = { x: newX, y: newY };
    this.state.highlightTime = 100;

    const dirNames: Record<string, string> = {
      '1,0': '右',
      '-1,0': '左',
      '0,1': '下',
      '0,-1': '上'
    };
    this.addLog('move', `移动至 (${newX}, ${newY})`);

    const item = this.getItemAt(newX, newY);
    if (item) {
      this.pickupItem(item);
    }

    const layer = this.getCurrentLayer();
    if (newX === layer.stairs.x && newY === layer.stairs.y) {
      this.nextFloor();
    }

    this.moveEnemies();

    return true;
  }

  private pickupItem(item: Item): void {
    const layer = this.getCurrentLayer();
    layer.items = layer.items.filter(i => i.id !== item.id);
    const config = ITEM_CONFIG[item.type];

    if (item.type === 'heal') {
      const healed = Math.min(item.value, this.state.player.maxHp - this.state.player.hp);
      this.state.player.hp += healed;
      this.addLog('pickup', `${config.icon} 拾取${config.name} +${healed} HP`);
    } else if (item.type === 'defense') {
      this.state.player.defense += item.value;
      this.addLog('pickup', `${config.icon} 拾取${config.name} +${item.value} DEF`);
    } else if (item.type === 'attack') {
      this.state.player.attack += item.value;
      this.addLog('pickup', `${config.icon} 拾取${config.name} +${item.value} ATK`);
    }
  }

  private resolveBattle(enemy: Enemy): void {
    const playerDmg = Math.max(1, this.state.player.attack - enemy.defense);
    enemy.hp -= playerDmg;

    this.showDamage(enemy.position.x, enemy.position.y, playerDmg);
    this.addLog('battle', `⚔ 对敌人造成 ${playerDmg} 点伤害 (ATK ${this.state.player.attack} - DEF ${enemy.defense})`);

    if (enemy.hp <= 0) {
      const layer = this.getCurrentLayer();
      layer.enemies = layer.enemies.filter(e => e.id !== enemy.id);
      this.state.enemiesDefeated++;
      this.state.player.attack += 5;

      this.dropItem(enemy.position);
      this.addLog('info', `✓ 击败敌人！攻击力 +5`);
    } else {
      const enemyDmg = Math.max(1, enemy.attack - this.state.player.defense);
      this.state.player.hp -= enemyDmg;
      this.showDamage(this.state.player.position.x, this.state.player.position.y, enemyDmg);
      this.addLog('battle', `💥 受到 ${enemyDmg} 点伤害 (敌人ATK ${enemy.attack} - 你的DEF ${this.state.player.defense})`);

      if (this.state.player.hp <= 0) {
        this.state.player.hp = 0;
        this.state.isGameOver = true;
        this.addLog('info', '你倒下了...');
      }
    }
  }

  private showDamage(x: number, y: number, damage: number): void {
    const event = new CustomEvent('showDamage', {
      detail: { x, y, damage }
    });
    window.dispatchEvent(event);
  }

  private dropItem(position: Position): void {
    const layer = this.getCurrentLayer();
    if (Math.random() < 0.7) {
      const types: ItemType[] = ['heal', 'defense', 'attack'];
      const type = types[Math.floor(Math.random() * types.length)];
      const config = ITEM_CONFIG[type];

      layer.items.push({
        id: this.itemIdCounter++,
        position: { ...position },
        type,
        value: config.value
      });
    }
  }

  private moveEnemies(): void {
    if (this.state.isGameOver) return;

    const layer = this.getCurrentLayer();
    const player = this.state.player.position;

    for (const enemy of layer.enemies) {
      const dx = Math.sign(player.x - enemy.position.x);
      const dy = Math.sign(player.y - enemy.position.y);

      let moved = false;
      const directions = Math.abs(player.x - enemy.position.x) > Math.abs(player.y - enemy.position.y)
        ? [{ dx, dy: 0 }, { dx: 0, dy }]
        : [{ dx: 0, dy }, { dx, dy: 0 }];

      for (const dir of directions) {
        if (dir.dx === 0 && dir.dy === 0) continue;

        const newX = enemy.position.x + dir.dx;
        const newY = enemy.position.y + dir.dy;

        if (!this.isWalkable(newX, newY)) continue;

        if (newX === player.x && newY === player.y) {
          this.resolveBattle(enemy);
          moved = true;
          break;
        }

        if (layer.enemies.some(e => e.id !== enemy.id && e.position.x === newX && e.position.y === newY)) {
          continue;
        }

        if (layer.items.some(i => i.position.x === newX && i.position.y === newY)) {
          continue;
        }

        enemy.position = { x: newX, y: newY };
        moved = true;
        break;
      }
    }
  }

  private nextFloor(): void {
    if (this.state.currentFloor >= TOTAL_FLOORS) {
      this.addLog('info', '恭喜通关所有地牢！');
      this.state.isGameOver = true;
      return;
    }

    this.state.isTransitioning = true;
    this.addLog('floor', `进入第 ${this.state.currentFloor + 1} 层`);

    const event = new CustomEvent('floorTransition');
    window.dispatchEvent(event);

    setTimeout(() => {
      this.state.currentFloor++;
      this.state.player.position = { x: 1, y: 1 };
      this.state.player.hp = Math.min(this.state.player.hp + 10, this.state.player.maxHp);
      this.state.isTransitioning = false;
      this.addLog('info', '恢复 10 点生命值');
    }, 300);
  }

  public updateAnimations(deltaTime: number): void {
    if (this.state.highlightTime > 0) {
      this.state.highlightTime -= deltaTime;
      if (this.state.highlightTime <= 0) {
        this.state.highlightedTile = null;
      }
    }

    if (this.state.playerOffsetTime > 0) {
      this.state.playerOffsetTime -= deltaTime;
      if (this.state.playerOffsetTime <= 0) {
        this.state.playerOffset = { x: 0, y: 0 };
      }
    }
  }

  public reset(): void {
    this.enemyIdCounter = 0;
    this.itemIdCounter = 0;
    this.state = this.createInitialState();
    this.addLog('info', '游戏开始！');
  }
}
