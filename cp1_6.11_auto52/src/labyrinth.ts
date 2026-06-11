import cuid from 'cuid';

export type EmotionType = 'happy' | 'sad' | 'angry' | 'calm' | 'anxious';

export interface MemoryEntry {
  id: string;
  title: string;
  date: string;
  emotion: EmotionType;
  description: string;
  weather?: string;
  people?: string[];
  mood?: string;
}

export interface RoomData {
  id: string;
  memory: MemoryEntry;
  gridX: number;
  gridZ: number;
  centerX: number;
  centerZ: number;
  size: number;
  connections: string[];
}

export interface CorridorSegment {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  width: number;
}

export interface CompassPoint {
  id: string;
  x: number;
  z: number;
}

export interface LabyrinthData {
  rooms: RoomData[];
  corridors: CorridorSegment[];
  compassPoints: CompassPoint[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const ROOM_SIZE = 4;
const CORRIDOR_WIDTH = 2;
const GRID_UNIT = 8;
const MIN_GRID_DISTANCE = 2;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export { easeOut };

export function generateLabyrinth(memories: MemoryEntry[]): LabyrinthData {
  const count = memories.length;
  if (count < 6 || count > 8) {
    throw new Error('需要6-8个记忆条目');
  }

  const gridDiameter = Math.ceil(Math.sqrt(count)) + 1;
  const gridCoords: Array<{ x: number; z: number }> = [];
  for (let x = -gridDiameter; x <= gridDiameter; x++) {
    for (let z = -gridDiameter; z <= gridDiameter; z++) {
      if (Math.abs(x) + Math.abs(z) > 0) {
        gridCoords.push({ x, z });
      }
    }
  }

  const shuffled = shuffle(gridCoords);
  const selectedCoords: Array<{ x: number; z: number }> = [{ x: 0, z: 0 }];

  for (let i = 0; i < shuffled.length && selectedCoords.length < count; i++) {
    const candidate = shuffled[i];
    const valid = selectedCoords.every(
      (s) =>
        Math.abs(s.x - candidate.x) + Math.abs(s.z - candidate.z) >=
        MIN_GRID_DISTANCE
    );
    if (valid) {
      selectedCoords.push(candidate);
    }
  }

  while (selectedCoords.length < count) {
    const rx = Math.floor(Math.random() * (gridDiameter * 2 + 1)) - gridDiameter;
    const rz = Math.floor(Math.random() * (gridDiameter * 2 + 1)) - gridDiameter;
    if (!selectedCoords.some((s) => s.x === rx && s.z === rz)) {
      selectedCoords.push({ x: rx, z: rz });
    }
  }

  const rooms: RoomData[] = selectedCoords.slice(0, count).map((coord, i) => ({
    id: cuid(),
    memory: memories[i],
    gridX: coord.x,
    gridZ: coord.z,
    centerX: coord.x * GRID_UNIT,
    centerZ: coord.z * GRID_UNIT,
    size: ROOM_SIZE,
    connections: [],
  }));

  const corridors: CorridorSegment[] = [];
  const compassPoints: CompassPoint[] = [];
  const connected = new Set<string>([rooms[0].id]);
  const remaining = new Set(rooms.slice(1).map((r) => r.id));

  while (remaining.size > 0) {
    let bestFrom: RoomData | null = null;
    let bestTo: RoomData | null = null;
    let bestDist = Infinity;

    for (const fromId of connected) {
      const from = rooms.find((r) => r.id === fromId)!;
      for (const toId of remaining) {
        const to = rooms.find((r) => r.id === toId)!;
        const dist =
          Math.abs(from.gridX - to.gridX) + Math.abs(from.gridZ - to.gridZ);
        if (dist < bestDist) {
          bestDist = dist;
          bestFrom = from;
          bestTo = to;
        }
      }
    }

    if (!bestFrom || !bestTo) break;

    if (!bestFrom.connections.includes(bestTo.id)) {
      bestFrom.connections.push(bestTo.id);
    }
    if (!bestTo.connections.includes(bestFrom.id)) {
      bestTo.connections.push(bestFrom.id);
    }

    const fx = bestFrom.centerX;
    const fz = bestFrom.centerZ;
    const tx = bestTo.centerX;
    const tz = bestTo.centerZ;

    const midX = Math.random() < 0.5 ? fx : tx;
    const midZ = midX === fx ? tz : fz;

    corridors.push({
      fromX: fx,
      fromZ: fz,
      toX: midX,
      toZ: midZ,
      width: CORRIDOR_WIDTH,
    });
    corridors.push({
      fromX: midX,
      fromZ: midZ,
      toX: tx,
      toZ: tz,
      width: CORRIDOR_WIDTH,
    });

    if (midX !== fx && midZ !== fz) {
      compassPoints.push({ id: cuid(), x: midX, z: midZ });
    }

    connected.add(bestTo.id);
    remaining.delete(bestTo.id);
  }

  const extraEdges = Math.max(0, Math.floor(count / 3));
  for (let i = 0; i < extraEdges; i++) {
    const r1 = rooms[Math.floor(Math.random() * rooms.length)];
    const candidates = rooms.filter(
      (r) => r.id !== r1.id && !r1.connections.includes(r.id)
    );
    if (candidates.length > 0) {
      const r2 = candidates[Math.floor(Math.random() * candidates.length)];
      r1.connections.push(r2.id);
      r2.connections.push(r1.id);

      const midX = Math.random() < 0.5 ? r1.centerX : r2.centerX;
      const midZ = midX === r1.centerX ? r2.centerZ : r1.centerZ;
      corridors.push({
        fromX: r1.centerX,
        fromZ: r1.centerZ,
        toX: midX,
        toZ: midZ,
        width: CORRIDOR_WIDTH,
      });
      corridors.push({
        fromX: midX,
        fromZ: midZ,
        toX: r2.centerX,
        toZ: r2.centerZ,
        width: CORRIDOR_WIDTH,
      });
      if (midX !== r1.centerX && midZ !== r1.centerZ) {
        compassPoints.push({ id: cuid(), x: midX, z: midZ });
      }
    }
  }

  const xs = rooms.map((r) => r.centerX);
  const zs = rooms.map((r) => r.centerZ);
  const bounds = {
    minX: Math.min(...xs) - ROOM_SIZE,
    maxX: Math.max(...xs) + ROOM_SIZE,
    minZ: Math.min(...zs) - ROOM_SIZE,
    maxZ: Math.max(...zs) + ROOM_SIZE,
  };

  return { rooms, corridors, compassPoints, bounds };
}
