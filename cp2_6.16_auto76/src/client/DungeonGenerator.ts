import { Position, Room, TileType, Chest, Monster } from '../types';
import { v4 as uuidv4 } from 'uuid';

const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;

export class DungeonGenerator {
  private map: TileType[][];
  private rooms: Room[] = [];
  private chests: Chest[] = [];
  private monsters: Monster[] = [];
  private explored: boolean[][];
  private bossRoomId: number = -1;

  constructor() {
    this.map = this.createEmptyMap();
    this.explored = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(false));
  }

  private createEmptyMap(): TileType[][] {
    return Array(MAP_HEIGHT).fill(null).map(() =>
      Array(MAP_WIDTH).fill('wall')
    );
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private roomsOverlap(roomA: Room, roomB: Room, padding: number = 1): boolean {
    return !(
      roomA.x + roomA.width + padding < roomB.x ||
      roomB.x + roomB.width + padding < roomA.x ||
      roomA.y + roomA.height + padding < roomB.y ||
      roomB.y + roomB.height + padding < roomA.y
    );
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
          this.map[y][x] = 'floor';
        }
      }
    }
  }

  private carveCorridor(from: Position, to: Position): void {
    let currentX = from.x;
    let currentY = from.y;

    const horizontalFirst = Math.random() < 0.5;

    if (horizontalFirst) {
      while (currentX !== to.x) {
        if (currentX >= 0 && currentX < MAP_WIDTH && currentY >= 0 && currentY < MAP_HEIGHT) {
          this.map[currentY][currentX] = 'corridor';
        }
        currentX += currentX < to.x ? 1 : -1;
      }
      while (currentY !== to.y) {
        if (currentX >= 0 && currentX < MAP_WIDTH && currentY >= 0 && currentY < MAP_HEIGHT) {
          this.map[currentY][currentX] = 'corridor';
        }
        currentY += currentY < to.y ? 1 : -1;
      }
    } else {
      while (currentY !== to.y) {
        if (currentX >= 0 && currentX < MAP_WIDTH && currentY >= 0 && currentY < MAP_HEIGHT) {
          this.map[currentY][currentX] = 'corridor';
        }
        currentY += currentY < to.y ? 1 : -1;
      }
      while (currentX !== to.x) {
        if (currentX >= 0 && currentX < MAP_WIDTH && currentY >= 0 && currentY < MAP_HEIGHT) {
          this.map[currentY][currentX] = 'corridor';
        }
        currentX += currentX < to.x ? 1 : -1;
      }
    }
    if (to.x >= 0 && to.x < MAP_WIDTH && to.y >= 0 && to.y < MAP_HEIGHT) {
      this.map[to.y][to.x] = 'corridor';
    }
  }

  private getRoomCenter(room: Room): Position {
    return {
      x: Math.floor(room.x + room.width / 2),
      y: Math.floor(room.y + room.height / 2)
    };
  }

  generate(): DungeonGenerator {
    this.rooms = [];
    const maxAttempts = 100;
    let roomId = 0;

    for (let i = 0; i < maxAttempts && this.rooms.length < 8; i++) {
      const width = this.randomInt(4, 8);
      const height = this.randomInt(4, 8);
      const x = this.randomInt(1, MAP_WIDTH - width - 2);
      const y = this.randomInt(1, MAP_HEIGHT - height - 2);

      const newRoom: Room = { x, y, width, height, id: roomId };

      let overlaps = false;
      for (const room of this.rooms) {
        if (this.roomsOverlap(newRoom, room, 2)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.rooms.push(newRoom);
        this.carveRoom(newRoom);
        roomId++;
      }
    }

    this.rooms.sort((a, b) => {
      const centerA = this.getRoomCenter(a);
      const centerB = this.getRoomCenter(b);
      const scoreA = centerA.x + centerA.y;
      const scoreB = centerB.x + centerB.y;
      return scoreA - scoreB;
    });

    this.rooms.forEach((room, index) => {
      room.id = index;
    });

    for (let i = 0; i < this.rooms.length - 1 && i < 5; i++) {
      const from = this.getRoomCenter(this.rooms[i]);
      const to = this.getRoomCenter(this.rooms[i + 1]);
      this.carveCorridor(from, to);
    }

    if (this.rooms.length >= 4) {
      const extraPairs = [
        [0, 2],
        [1, 3]
      ];
      for (const [a, b] of extraPairs) {
        if (a < this.rooms.length && b < this.rooms.length) {
          const from = this.getRoomCenter(this.rooms[a]);
          const to = this.getRoomCenter(this.rooms[b]);
          this.carveCorridor(from, to);
        }
      }
    }

    this.bossRoomId = this.rooms.length - 1;
    this.placeChests();
    this.placeMonsters();

    return this;
  }

  private placeChests(): void {
    this.chests = [];
    for (const room of this.rooms) {
      if (room.id === 0 || room.id === this.bossRoomId) continue;

      const chestCount = this.randomInt(1, 3);
      for (let i = 0; i < chestCount; i++) {
        const pos: Position = {
          x: this.randomInt(room.x + 1, room.x + room.width - 2),
          y: this.randomInt(room.y + 1, room.y + room.height - 2)
        };

        const exists = this.chests.some(c =>
          c.position.x === pos.x && c.position.y === pos.y
        );

        if (!exists) {
          this.chests.push({
            id: uuidv4(),
            position: pos,
            opened: false,
            roomId: room.id
          });
        }
      }
    }
  }

  private placeMonsters(): void {
    this.monsters = [];
    const monsterTemplates = [
      { name: '史莱姆', hp: 20, attack: 6, defense: 2 },
      { name: '哥布林', hp: 35, attack: 10, defense: 3 },
      { name: '骷髅兵', hp: 45, attack: 12, defense: 5 },
      { name: '暗精灵', hp: 30, attack: 15, defense: 4 }
    ];

    const monsterCount = this.randomInt(3, 5);
    const availableRooms = this.rooms.filter(r => r.id !== 0 && r.id !== this.bossRoomId);

    for (let i = 0; i < monsterCount && availableRooms.length > 0; i++) {
      const room = availableRooms[i % availableRooms.length];
      const template = monsterTemplates[this.randomInt(0, monsterTemplates.length - 1)];

      const pos: Position = {
        x: this.randomInt(room.x + 1, room.x + room.width - 2),
        y: this.randomInt(room.y + 1, room.y + room.height - 2)
      };

      const exists = this.monsters.some(m =>
        m.position.x === pos.x && m.position.y === pos.y
      );

      if (!exists) {
        this.monsters.push({
          id: uuidv4(),
          position: pos,
          hp: template.hp,
          maxHp: template.hp,
          attack: template.attack,
          defense: template.defense,
          roomId: room.id,
          name: template.name,
          isBoss: false
        });
      }
    }

    if (this.bossRoomId >= 0) {
      const bossRoom = this.rooms[this.bossRoomId];
      this.monsters.push({
        id: uuidv4(),
        position: {
          x: Math.floor(bossRoom.x + bossRoom.width / 2),
          y: Math.floor(bossRoom.y + bossRoom.height / 2)
        },
        hp: 300,
        maxHp: 300,
        attack: 20,
        defense: 10,
        roomId: this.bossRoomId,
        name: '骷髅领主',
        isBoss: true
      });
    }
  }

  getPlayerStartPosition(): Position {
    if (this.rooms.length === 0) return { x: 1, y: 1 };
    const room = this.rooms[0];
    return {
      x: room.x + 1,
      y: room.y + 1
    };
  }

  getMapData(): TileType[][] {
    return this.map;
  }

  getRoomList(): Room[] {
    return this.rooms;
  }

  getChests(): Chest[] {
    return this.chests;
  }

  getMonsters(): Monster[] {
    return this.monsters;
  }

  getBossRoomId(): number {
    return this.bossRoomId;
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
    return this.map[y][x] !== 'wall';
  }

  getRoomAtPosition(pos: Position): Room | null {
    for (const room of this.rooms) {
      if (
        pos.x >= room.x &&
        pos.x < room.x + room.width &&
        pos.y >= room.y &&
        pos.y < room.y + room.height
      ) {
        return room;
      }
    }
    return null;
  }

  markExplored(x: number, y: number, radius: number = 3): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            this.explored[ny][nx] = true;
          }
        }
      }
    }
  }

  getExploredMap(): boolean[][] {
    return this.explored;
  }

  getMapSize(): { width: number; height: number } {
    return { width: MAP_WIDTH, height: MAP_HEIGHT };
  }
}

export const createDungeon = (): DungeonGenerator => {
  return new DungeonGenerator().generate();
};
