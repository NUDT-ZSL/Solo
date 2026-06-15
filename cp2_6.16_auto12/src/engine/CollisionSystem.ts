interface Collidable {
  id: string;
  x: number;
  y: number;
  radius: number;
}

interface CollisionEvent {
  aId: string;
  bId: string;
  aType: string;
  bType: string;
}

const TYPE_PLAYER_BULLET = 0;
const TYPE_ENEMY = 1;
const TYPE_ENEMY_BULLET = 2;
const TYPE_PLAYER = 3;

type ObjectTypeNum = 0 | 1 | 2 | 3;

interface GridObject {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: ObjectTypeNum;
}

export class CollisionSystem {
  private cellSize: number;
  private grid: Map<string, GridObject[]>;
  private events: CollisionEvent[];
  private objectPool: GridObject[];
  private poolIndex: number;

  constructor(cellSize: number = 40) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.events = [];
    this.objectPool = [];
    this.poolIndex = 0;
  }

  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  clear(): void {
    this.grid.clear();
    this.events.length = 0;
    this.poolIndex = 0;
  }

  private acquireObject(obj: Collidable, type: ObjectTypeNum): GridObject {
    if (this.poolIndex < this.objectPool.length) {
      const gObj = this.objectPool[this.poolIndex++];
      gObj.id = obj.id;
      gObj.x = obj.x;
      gObj.y = obj.y;
      gObj.radius = obj.radius;
      gObj.type = type;
      return gObj;
    }
    const gObj = { id: obj.id, x: obj.x, y: obj.y, radius: obj.radius, type };
    this.objectPool.push(gObj);
    this.poolIndex++;
    return gObj;
  }

  insert(obj: Collidable, type: ObjectTypeNum): void {
    const key = this.getKey(obj.x, obj.y);
    let cell = this.grid.get(key);
    if (!cell) {
      cell = [];
      this.grid.set(key, cell);
    }
    cell.push(this.acquireObject(obj, type));
  }

  private checkCircleCollisionFast(a: GridObject, b: GridObject): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const r = a.radius + b.radius;
    return dx * dx + dy * dy < r * r;
  }

  private checkPair(a: GridObject, b: GridObject): void {
    const aType = a.type;
    const bType = b.type;

    if (aType === TYPE_PLAYER_BULLET && bType === TYPE_ENEMY) {
      if (this.checkCircleCollisionFast(a, b)) {
        this.events.push({ aId: a.id, bId: b.id, aType: 'playerBullet', bType: 'enemy' });
      }
    } else if (aType === TYPE_ENEMY && bType === TYPE_PLAYER_BULLET) {
      if (this.checkCircleCollisionFast(a, b)) {
        this.events.push({ aId: b.id, bId: a.id, aType: 'playerBullet', bType: 'enemy' });
      }
    } else if (aType === TYPE_PLAYER && bType === TYPE_ENEMY_BULLET) {
      if (this.checkCircleCollisionFast(a, b)) {
        this.events.push({ aId: a.id, bId: b.id, aType: 'player', bType: 'enemyBullet' });
      }
    } else if (aType === TYPE_ENEMY_BULLET && bType === TYPE_PLAYER) {
      if (this.checkCircleCollisionFast(a, b)) {
        this.events.push({ aId: b.id, bId: a.id, aType: 'player', bType: 'enemyBullet' });
      }
    } else if (aType === TYPE_PLAYER && bType === TYPE_ENEMY) {
      if (this.checkCircleCollisionFast(a, b)) {
        this.events.push({ aId: a.id, bId: b.id, aType: 'player', bType: 'enemy' });
      }
    } else if (aType === TYPE_ENEMY && bType === TYPE_PLAYER) {
      if (this.checkCircleCollisionFast(a, b)) {
        this.events.push({ aId: b.id, bId: a.id, aType: 'player', bType: 'enemy' });
      }
    }
  }

  checkCollisions(
    playerBullets: Collidable[],
    enemies: Collidable[],
    enemyBullets: Collidable[],
    player: Collidable
  ): CollisionEvent[] {
    this.clear();

    for (let i = 0; i < playerBullets.length; i++) {
      this.insert(playerBullets[i], TYPE_PLAYER_BULLET);
    }
    for (let i = 0; i < enemies.length; i++) {
      this.insert(enemies[i], TYPE_ENEMY);
    }
    for (let i = 0; i < enemyBullets.length; i++) {
      this.insert(enemyBullets[i], TYPE_ENEMY_BULLET);
    }
    this.insert(player, TYPE_PLAYER);

    const gridEntries = Array.from(this.grid.entries());

    for (let ci = 0; ci < gridEntries.length; ci++) {
      const [key, cell] = gridEntries[ci];
      const commaIdx = key.indexOf(',');
      const cellX = parseInt(key.substring(0, commaIdx), 10);
      const cellY = parseInt(key.substring(commaIdx + 1), 10);

      const rightKey = `${cellX + 1},${cellY}`;
      const rightCell = this.grid.get(rightKey);
      const downKey = `${cellX},${cellY + 1}`;
      const downCell = this.grid.get(downKey);
      const downRightKey = `${cellX + 1},${cellY + 1}`;
      const downRightCell = this.grid.get(downRightKey);
      const downLeftKey = `${cellX - 1},${cellY + 1}`;
      const downLeftCell = this.grid.get(downLeftKey);

      for (let i = 0; i < cell.length; i++) {
        const a = cell[i];

        for (let j = i + 1; j < cell.length; j++) {
          this.checkPair(a, cell[j]);
        }

        if (rightCell) {
          for (let j = 0; j < rightCell.length; j++) {
            this.checkPair(a, rightCell[j]);
          }
        }
        if (downCell) {
          for (let j = 0; j < downCell.length; j++) {
            this.checkPair(a, downCell[j]);
          }
        }
        if (downRightCell) {
          for (let j = 0; j < downRightCell.length; j++) {
            this.checkPair(a, downRightCell[j]);
          }
        }
        if (downLeftCell) {
          for (let j = 0; j < downLeftCell.length; j++) {
            this.checkPair(a, downLeftCell[j]);
          }
        }
      }
    }

    return this.events;
  }
}
