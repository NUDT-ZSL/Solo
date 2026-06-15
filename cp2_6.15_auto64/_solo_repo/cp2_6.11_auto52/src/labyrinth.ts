import { createId } from 'cuid';

export type EmotionType = 'happy' | 'sad' | 'angry' | 'calm' | 'anxious';

export interface MemoryEntry {
  id: string;
  title: string;
  date: string;
  emotion: EmotionType;
  description: string;
  weather: string;
  people: string[];
  mood: string;
}

export interface Room {
  id: string;
  x: number;
  z: number;
  memory: MemoryEntry;
  connections: string[];
}

export interface Corridor {
  from: string;
  to: string;
  corners: { x: number; z: number }[];
}

export interface LabyrinthData {
  rooms: Map<string, Room>;
  corridors: Corridor[];
  startPosition: { x: number; z: number };
}

export const EMOTION_COLORS: Record<EmotionType, { h: number; s: number; l: number }> = {
  happy:   { h: 45,  s: 60, l: 85 },
  sad:     { h: 200, s: 60, l: 85 },
  angry:   { h: 0,   s: 60, l: 85 },
  calm:    { h: 160, s: 60, l: 85 },
  anxious: { h: 270, s: 40, l: 75 },
};

export const SAMPLE_MEMORIES: MemoryEntry[] = [
  {
    id: createId(),
    title: '第一次旅行',
    date: '2018-07-15',
    emotion: 'happy',
    description: '第一次独自背上行囊，踏上前往云南的旅程。阳光洒在丽江古城的青石板路上，耳边是潺潺的流水声。',
    weather: '☀️ 晴朗',
    people: ['自己'],
    mood: '兴奋'
  },
  {
    id: createId(),
    title: '毕业典礼',
    date: '2020-06-20',
    emotion: 'happy',
    description: '穿着学士服站在主席台前，接过毕业证书的那一刻，四年的青春在脑海中快速闪过。',
    weather: '⛅ 多云',
    people: ['同学', '老师', '家人'],
    mood: '喜悦'
  },
  {
    id: createId(),
    title: '外婆的离去',
    date: '2021-03-08',
    emotion: 'sad',
    description: '那个总是在厨房忙碌的身影永远离开了，留下的只有满衣柜她亲手缝制的棉衣。',
    weather: '🌧️ 雨天',
    people: ['家人'],
    mood: '悲伤'
  },
  {
    id: createId(),
    title: '职场第一次争吵',
    date: '2022-01-10',
    emotion: 'angry',
    description: '因为项目责任的问题，和同事爆发了激烈的争吵。事后在楼梯间冷静了很久。',
    weather: '🌫️ 雾霾',
    people: ['同事'],
    mood: '愤怒'
  },
  {
    id: createId(),
    title: '婚礼那天',
    date: '2023-05-28',
    emotion: 'happy',
    description: '红毯尽头，她穿着白纱缓缓走来。音乐响起，全世界只剩下彼此的心跳声。',
    weather: '☀️ 晴朗',
    people: ['爱人', '家人', '朋友'],
    mood: '幸福'
  },
  {
    id: createId(),
    title: '孩子出生',
    date: '2024-08-15',
    emotion: 'calm',
    description: '产房外焦急等待了12个小时，当听到那声啼哭的瞬间，时间仿佛静止了。',
    weather: '🌙 深夜',
    people: ['爱人', '宝宝'],
    mood: '平静'
  },
  {
    id: createId(),
    title: '项目失败',
    date: '2025-02-14',
    emotion: 'anxious',
    description: '熬夜奋战了半年的项目最终宣告失败，那种无力感让我在车里坐了很久才回家。',
    weather: '❄️ 寒冷',
    people: ['团队'],
    mood: '焦虑'
  }
];

const ROOM_SIZE = 4;
const CORRIDOR_WIDTH = 2;
const CELL_SIZE = ROOM_SIZE + CORRIDOR_WIDTH * 2;

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (
    (Math.round(255 * f(0)) << 16) |
    (Math.round(255 * f(8)) << 8) |
    Math.round(255 * f(4))
  );
}

export function emotionToHex(emotion: EmotionType, hueOffset: number = 0): number {
  const color = EMOTION_COLORS[emotion];
  return hslToHex(color.h + hueOffset, color.s, color.l);
}

interface Cell {
  x: number;
  z: number;
  visited: boolean;
  room?: Room;
  walls: { north: boolean; south: boolean; east: boolean; west: boolean };
}

export function generateLabyrinth(memories: MemoryEntry[]): LabyrinthData {
  const count = Math.min(8, Math.max(6, memories.length));
  const selectedMemories = memories.slice(0, count);
  
  const gridSize = Math.ceil(Math.sqrt(count * 2));
  const grid: Cell[][] = [];
  
  for (let x = 0; x < gridSize; x++) {
    grid[x] = [];
    for (let z = 0; z < gridSize; z++) {
      grid[x][z] = {
        x,
        z,
        visited: false,
        walls: { north: true, south: true, east: true, west: true }
      };
    }
  }

  const rooms: Map<string, Room> = new Map();
  const corridors: Corridor[] = [];
  const directions = [
    { dx: 0, dz: -1, wall: 'north', opposite: 'south' },
    { dx: 0, dz: 1, wall: 'south', opposite: 'north' },
    { dx: -1, dz: 0, wall: 'west', opposite: 'east' },
    { dx: 1, dz: 0, wall: 'east', opposite: 'west' }
  ];

  function carvePassages(currentX: number, currentZ: number) {
    grid[currentX][currentZ].visited = true;
    const shuffledDirs = shuffle(directions);
    
    for (const dir of shuffledDirs) {
      const nx = currentX + dir.dx;
      const nz = currentZ + dir.dz;
      
      if (nx >= 0 && nx < gridSize && nz >= 0 && nz < gridSize && !grid[nx][nz].visited) {
        grid[currentX][currentZ].walls[dir.wall as keyof Cell['walls']] = false;
        grid[nx][nz].walls[dir.opposite as keyof Cell['walls']] = false;
        carvePassages(nx, nz);
      }
    }
  }

  const startX = Math.floor(gridSize / 2);
  const startZ = Math.floor(gridSize / 2);
  carvePassages(startX, startZ);

  const visitedCells: Cell[] = [];
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      if (grid[x][z].visited) {
        visitedCells.push(grid[x][z]);
      }
    }
  }

  const shuffledCells = shuffle(visitedCells).slice(0, count);
  shuffledCells.forEach((cell, index) => {
    const memory = selectedMemories[index];
    if (!memory) return;
    
    const room: Room = {
      id: createId(),
      x: cell.x * CELL_SIZE,
      z: cell.z * CELL_SIZE,
      memory,
      connections: []
    };
    
    cell.room = room;
    rooms.set(room.id, room);
  });

  function findNearestRoom(fromRoom: Room, visited: Set<string>): Room | null {
    let nearest: Room | null = null;
    let minDist = Infinity;
    
    for (const [, room] of rooms) {
      if (room.id === fromRoom.id || visited.has(room.id)) continue;
      const dist = Math.abs(room.x - fromRoom.x) + Math.abs(room.z - fromRoom.z);
      if (dist < minDist) {
        minDist = dist;
        nearest = room;
      }
    }
    
    return nearest;
  }

  const connectedRooms = new Set<string>();
  const firstRoom = rooms.values().next().value as Room;
  connectedRooms.add(firstRoom.id);

  while (connectedRooms.size < rooms.size) {
    let bestConnection: { from: Room; to: Room } | null = null;
    let minDist = Infinity;
    
    for (const roomId of connectedRooms) {
      const fromRoom = rooms.get(roomId);
      if (!fromRoom) continue;
      
      const toRoom = findNearestRoom(fromRoom, connectedRooms);
      if (!toRoom) continue;
      
      const dist = Math.abs(toRoom.x - fromRoom.x) + Math.abs(toRoom.z - fromRoom.z);
      if (dist < minDist) {
        minDist = dist;
        bestConnection = { from: fromRoom, to: toRoom };
      }
    }
    
    if (!bestConnection) break;
    
    const { from, to } = bestConnection;
    const corners: { x: number; z: number }[] = [];
    
    const midX = from.x + ROOM_SIZE / 2;
    const midZ = from.z + ROOM_SIZE / 2;
    const toMidX = to.x + ROOM_SIZE / 2;
    const toMidZ = to.z + ROOM_SIZE / 2;
    
    if (Math.random() > 0.5) {
      corners.push({ x: midX, z: midZ });
      corners.push({ x: toMidX, z: midZ });
      corners.push({ x: toMidX, z: toMidZ });
    } else {
      corners.push({ x: midX, z: midZ });
      corners.push({ x: midX, z: toMidZ });
      corners.push({ x: toMidX, z: toMidZ });
    }
    
    corridors.push({ from: from.id, to: to.id, corners });
    from.connections.push(to.id);
    to.connections.push(from.id);
    connectedRooms.add(to.id);
  }

  for (const corridor of corridors) {
    const fromRoom = rooms.get(corridor.from);
    const toRoom = rooms.get(corridor.to);
    if (!fromRoom || !toRoom) continue;
    
    const cellFrom = grid[Math.floor(fromRoom.x / CELL_SIZE)]?.[Math.floor(fromRoom.z / CELL_SIZE)];
    const cellTo = grid[Math.floor(toRoom.x / CELL_SIZE)]?.[Math.floor(toRoom.z / CELL_SIZE)];
    
    if (cellFrom && cellTo) {
      if (cellFrom.x === cellTo.x) {
        if (cellFrom.z < cellTo.z) {
          cellFrom.walls.south = false;
          cellTo.walls.north = false;
        } else {
          cellFrom.walls.north = false;
          cellTo.walls.south = false;
        }
      } else {
        if (cellFrom.x < cellTo.x) {
          cellFrom.walls.east = false;
          cellTo.walls.west = false;
        } else {
          cellFrom.walls.west = false;
          cellTo.walls.east = false;
        }
      }
    }
  }

  return {
    rooms,
    corridors,
    startPosition: {
      x: firstRoom.x + ROOM_SIZE / 2,
      z: firstRoom.z + ROOM_SIZE / 2
    }
  };
}

export function generateCompassPoints(corridors: Corridor[]): { x: number; z: number }[] {
  const points: { x: number; z: number }[] = [];
  
  for (const corridor of corridors) {
    for (let i = 1; i < corridor.corners.length - 1; i++) {
      const corner = corridor.corners[i];
      if (corner) {
        points.push({ x: corner.x, z: corner.z });
      }
    }
  }
  
  return points;
}

export { ROOM_SIZE, CORRIDOR_WIDTH, CELL_SIZE };
