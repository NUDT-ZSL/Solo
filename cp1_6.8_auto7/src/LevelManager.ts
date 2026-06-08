export enum TileType {
  Wall = 0,
  Floor = 1,
  ShadowFloor = 2,
  LightFloor = 3,
  Target = 4,
  PlayerStart = 5,
  Door = 6,
}

export interface Vector2 {
  x: number
  y: number
}

export interface PatrolWaypoint {
  position: Vector2
  waitTime: number
}

export interface GuardConfig {
  id: string
  startPosition: Vector2
  patrolPath: PatrolWaypoint[]
  viewRange: number
  viewAngle: number
  hearingRange: number
  speed: number
}

export interface InteractiveObjectConfig {
  id: string
  type: 'candle' | 'rope' | 'bell' | 'vase'
  position: Vector2
  soundRadius: number
  distractionDuration: number
  isActive: boolean
}

export interface LevelConfig {
  id: number
  name: string
  width: number
  height: number
  tileSize: number
  tiles: TileType[][]
  playerStart: Vector2
  targetPosition: Vector2
  guards: GuardConfig[]
  interactiveObjects: InteractiveObjectConfig[]
  lightSources: Vector2[]
  shadowZones: Vector2[]
  timeLimit: number
}

const T = TileType

function createEmptyMap(w: number, h: number, fill: TileType = T.Floor): TileType[][] {
  const map: TileType[][] = []
  for (let y = 0; y < h; y++) {
    map[y] = []
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
        map[y][x] = T.Wall
      } else {
        map[y][x] = fill
      }
    }
  }
  return map
}

function addRoom(
  map: TileType[][],
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  floorType: TileType = T.Floor
): void {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (y === ry || y === ry + rh - 1 || x === rx || x === rx + rw - 1) {
        map[y][x] = T.Wall
      } else {
        map[y][x] = floorType
      }
    }
  }
}

function addDoor(map: TileType[][], x: number, y: number): void {
  if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
    map[y][x] = T.Door
  }
}

function addHorizontalWall(map: TileType[][], x1: number, x2: number, y: number, gapAt?: number): void {
  for (let x = x1; x <= x2; x++) {
    if (x === gapAt) {
      map[y][x] = T.Door
    } else {
      map[y][x] = T.Wall
    }
  }
}

function addVerticalWall(map: TileType[][], y1: number, y2: number, x: number, gapAt?: number): void {
  for (let y = y1; y <= y2; y++) {
    if (y === gapAt) {
      map[y][x] = T.Door
    } else {
      map[y][x] = T.Wall
    }
  }
}

function buildLevel1(): LevelConfig {
  const w = 30, h = 20
  const map = createEmptyMap(w, h)

  addRoom(map, 2, 2, 8, 6, T.ShadowFloor)
  addRoom(map, 12, 2, 8, 6, T.LightFloor)
  addRoom(map, 22, 2, 6, 6, T.ShadowFloor)
  addRoom(map, 2, 10, 10, 8, T.LightFloor)
  addRoom(map, 14, 10, 8, 8, T.ShadowFloor)
  addRoom(map, 24, 10, 4, 8, T.Floor)

  addDoor(map, 9, 4)
  addDoor(map, 12, 4)
  addDoor(map, 19, 5)
  addDoor(map, 5, 10)
  addDoor(map, 14, 14)
  addDoor(map, 22, 14)

  addHorizontalWall(map, 2, 9, 8, 5)
  addHorizontalWall(map, 12, 19, 8, 16)
  addVerticalWall(map, 2, 7, 10, 5)
  addVerticalWall(map, 10, 17, 14, 14)

  return {
    id: 1,
    name: '暗夜前厅',
    width: w,
    height: h,
    tileSize: 40,
    tiles: map,
    playerStart: { x: 3, y: 4 },
    targetPosition: { x: 25, y: 14 },
    guards: [
      {
        id: 'g1',
        startPosition: { x: 15, y: 4 },
        patrolPath: [
          { position: { x: 15, y: 4 }, waitTime: 1 },
          { position: { x: 15, y: 6 }, waitTime: 1 },
          { position: { x: 17, y: 6 }, waitTime: 2 },
          { position: { x: 15, y: 4 }, waitTime: 1 },
        ],
        viewRange: 5,
        viewAngle: Math.PI / 3,
        hearingRange: 4,
        speed: 1.2,
      },
      {
        id: 'g2',
        startPosition: { x: 6, y: 14 },
        patrolPath: [
          { position: { x: 6, y: 14 }, waitTime: 1 },
          { position: { x: 8, y: 14 }, waitTime: 1 },
          { position: { x: 8, y: 16 }, waitTime: 2 },
          { position: { x: 6, y: 16 }, waitTime: 1 },
        ],
        viewRange: 5,
        viewAngle: Math.PI / 3,
        hearingRange: 4,
        speed: 1.0,
      },
    ],
    interactiveObjects: [
      { id: 'c1', type: 'candle', position: { x: 14, y: 3 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'r1', type: 'rope', position: { x: 20, y: 5 }, soundRadius: 6, distractionDuration: 4, isActive: true },
    ],
    lightSources: [{ x: 15, y: 3 }, { x: 6, y: 12 }],
    shadowZones: [{ x: 3, y: 4 }, { x: 24, y: 13 }],
    timeLimit: 120,
  }
}

function buildLevel2(): LevelConfig {
  const w = 35, h = 22
  const map = createEmptyMap(w, h)

  addRoom(map, 2, 2, 10, 7, T.ShadowFloor)
  addRoom(map, 14, 2, 8, 7, T.LightFloor)
  addRoom(map, 24, 2, 9, 7, T.Floor)
  addRoom(map, 2, 11, 7, 9, T.LightFloor)
  addRoom(map, 11, 11, 10, 9, T.ShadowFloor)
  addRoom(map, 23, 11, 10, 9, T.LightFloor)

  addHorizontalWall(map, 2, 11, 9, 6)
  addHorizontalWall(map, 14, 21, 9, 17)
  addHorizontalWall(map, 24, 32, 9, 28)
  addVerticalWall(map, 2, 8, 11, 6)
  addVerticalWall(map, 11, 19, 11, 16)
  addVerticalWall(map, 23, 19, 11, 26)

  addDoor(map, 6, 9)
  addDoor(map, 17, 9)
  addDoor(map, 28, 9)
  addDoor(map, 6, 11)
  addDoor(map, 16, 11)
  addDoor(map, 26, 11)

  return {
    id: 2,
    name: '回廊深渊',
    width: w,
    height: h,
    tileSize: 38,
    tiles: map,
    playerStart: { x: 3, y: 4 },
    targetPosition: { x: 30, y: 16 },
    guards: [
      {
        id: 'g1',
        startPosition: { x: 16, y: 5 },
        patrolPath: [
          { position: { x: 16, y: 5 }, waitTime: 1 },
          { position: { x: 19, y: 5 }, waitTime: 1 },
          { position: { x: 19, y: 7 }, waitTime: 2 },
          { position: { x: 16, y: 7 }, waitTime: 1 },
        ],
        viewRange: 6,
        viewAngle: Math.PI / 3,
        hearingRange: 5,
        speed: 1.4,
      },
      {
        id: 'g2',
        startPosition: { x: 5, y: 15 },
        patrolPath: [
          { position: { x: 5, y: 15 }, waitTime: 1 },
          { position: { x: 5, y: 17 }, waitTime: 1 },
          { position: { x: 4, y: 17 }, waitTime: 2 },
          { position: { x: 4, y: 15 }, waitTime: 1 },
        ],
        viewRange: 5,
        viewAngle: Math.PI / 3,
        hearingRange: 5,
        speed: 1.2,
      },
      {
        id: 'g3',
        startPosition: { x: 27, y: 15 },
        patrolPath: [
          { position: { x: 27, y: 15 }, waitTime: 0.5 },
          { position: { x: 30, y: 15 }, waitTime: 0.5 },
          { position: { x: 30, y: 18 }, waitTime: 1 },
          { position: { x: 27, y: 18 }, waitTime: 0.5 },
        ],
        viewRange: 6,
        viewAngle: Math.PI / 3,
        hearingRange: 5,
        speed: 1.3,
      },
    ],
    interactiveObjects: [
      { id: 'c1', type: 'candle', position: { x: 15, y: 3 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'c2', type: 'candle', position: { x: 25, y: 5 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'r1', type: 'rope', position: { x: 12, y: 14 }, soundRadius: 7, distractionDuration: 5, isActive: true },
      { id: 'b1', type: 'bell', position: { x: 28, y: 12 }, soundRadius: 8, distractionDuration: 6, isActive: true },
    ],
    lightSources: [{ x: 16, y: 3 }, { x: 5, y: 12 }, { x: 28, y: 12 }],
    shadowZones: [{ x: 3, y: 4 }, { x: 14, y: 14 }],
    timeLimit: 100,
  }
}

function buildLevel3(): LevelConfig {
  const w = 40, h = 25
  const map = createEmptyMap(w, h)

  addRoom(map, 2, 2, 8, 6, T.ShadowFloor)
  addRoom(map, 12, 2, 8, 6, T.LightFloor)
  addRoom(map, 22, 2, 8, 6, T.LightFloor)
  addRoom(map, 32, 2, 6, 6, T.ShadowFloor)
  addRoom(map, 2, 10, 10, 6, T.LightFloor)
  addRoom(map, 14, 10, 12, 6, T.ShadowFloor)
  addRoom(map, 28, 10, 10, 6, T.LightFloor)
  addRoom(map, 2, 18, 10, 5, T.ShadowFloor)
  addRoom(map, 14, 18, 12, 5, T.LightFloor)
  addRoom(map, 28, 18, 10, 5, T.ShadowFloor)

  addHorizontalWall(map, 2, 9, 8, 6)
  addHorizontalWall(map, 12, 19, 8, 16)
  addHorizontalWall(map, 22, 29, 8, 26)
  addHorizontalWall(map, 2, 11, 16, 7)
  addHorizontalWall(map, 14, 25, 16, 20)
  addHorizontalWall(map, 28, 37, 16, 33)
  addVerticalWall(map, 2, 7, 10, 6)
  addVerticalWall(map, 12, 15, 10, 14)
  addVerticalWall(map, 2, 7, 18, 6)
  addVerticalWall(map, 14, 17, 18, 16)
  addVerticalWall(map, 28, 15, 18, 33)

  addDoor(map, 6, 8)
  addDoor(map, 16, 8)
  addDoor(map, 26, 8)
  addDoor(map, 6, 10)
  addDoor(map, 16, 10)
  addDoor(map, 26, 10)
  addDoor(map, 6, 16)
  addDoor(map, 20, 16)
  addDoor(map, 33, 16)
  addDoor(map, 6, 18)
  addDoor(map, 20, 18)
  addDoor(map, 33, 18)

  return {
    id: 3,
    name: '暗影迷宫',
    width: w,
    height: h,
    tileSize: 32,
    tiles: map,
    playerStart: { x: 3, y: 4 },
    targetPosition: { x: 34, y: 20 },
    guards: [
      {
        id: 'g1',
        startPosition: { x: 15, y: 4 },
        patrolPath: [
          { position: { x: 15, y: 4 }, waitTime: 0.5 },
          { position: { x: 18, y: 4 }, waitTime: 0.5 },
          { position: { x: 18, y: 6 }, waitTime: 1 },
          { position: { x: 15, y: 6 }, waitTime: 0.5 },
        ],
        viewRange: 6,
        viewAngle: Math.PI / 3,
        hearingRange: 6,
        speed: 1.5,
      },
      {
        id: 'g2',
        startPosition: { x: 6, y: 13 },
        patrolPath: [
          { position: { x: 6, y: 13 }, waitTime: 0.5 },
          { position: { x: 9, y: 13 }, waitTime: 0.5 },
          { position: { x: 9, y: 14 }, waitTime: 1 },
          { position: { x: 6, y: 14 }, waitTime: 0.5 },
        ],
        viewRange: 6,
        viewAngle: Math.PI / 3,
        hearingRange: 5,
        speed: 1.3,
      },
      {
        id: 'g3',
        startPosition: { x: 25, y: 4 },
        patrolPath: [
          { position: { x: 25, y: 4 }, waitTime: 0.5 },
          { position: { x: 28, y: 4 }, waitTime: 0.5 },
          { position: { x: 28, y: 6 }, waitTime: 1 },
          { position: { x: 25, y: 6 }, waitTime: 0.5 },
        ],
        viewRange: 6,
        viewAngle: Math.PI / 3,
        hearingRange: 5,
        speed: 1.4,
      },
      {
        id: 'g4',
        startPosition: { x: 32, y: 13 },
        patrolPath: [
          { position: { x: 32, y: 13 }, waitTime: 0.5 },
          { position: { x: 35, y: 13 }, waitTime: 0.5 },
          { position: { x: 35, y: 14 }, waitTime: 1 },
          { position: { x: 32, y: 14 }, waitTime: 0.5 },
        ],
        viewRange: 7,
        viewAngle: Math.PI / 4,
        hearingRange: 6,
        speed: 1.5,
      },
    ],
    interactiveObjects: [
      { id: 'c1', type: 'candle', position: { x: 14, y: 3 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'c2', type: 'candle', position: { x: 24, y: 3 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'r1', type: 'rope', position: { x: 5, y: 12 }, soundRadius: 7, distractionDuration: 5, isActive: true },
      { id: 'b1', type: 'bell', position: { x: 20, y: 12 }, soundRadius: 8, distractionDuration: 6, isActive: true },
      { id: 'v1', type: 'vase', position: { x: 33, y: 12 }, soundRadius: 6, distractionDuration: 4, isActive: true },
    ],
    lightSources: [{ x: 15, y: 3 }, { x: 25, y: 3 }, { x: 5, y: 12 }, { x: 32, y: 12 }],
    shadowZones: [{ x: 3, y: 4 }, { x: 34, y: 4 }, { x: 15, y: 12 }, { x: 4, y: 19 }, { x: 30, y: 19 }],
    timeLimit: 90,
  }
}

function buildLevel4(): LevelConfig {
  const w = 45, h = 28
  const map = createEmptyMap(w, h)

  addRoom(map, 2, 2, 10, 8, T.ShadowFloor)
  addRoom(map, 14, 2, 10, 8, T.LightFloor)
  addRoom(map, 26, 2, 10, 8, T.LightFloor)
  addRoom(map, 38, 2, 5, 8, T.ShadowFloor)
  addRoom(map, 2, 12, 12, 7, T.LightFloor)
  addRoom(map, 16, 12, 14, 7, T.ShadowFloor)
  addRoom(map, 32, 12, 11, 7, T.LightFloor)
  addRoom(map, 2, 21, 12, 5, T.ShadowFloor)
  addRoom(map, 16, 21, 14, 5, T.LightFloor)
  addRoom(map, 32, 21, 11, 5, T.ShadowFloor)

  addHorizontalWall(map, 2, 11, 10, 7)
  addHorizontalWall(map, 14, 23, 10, 19)
  addHorizontalWall(map, 26, 35, 10, 31)
  addHorizontalWall(map, 2, 13, 19, 8)
  addHorizontalWall(map, 16, 29, 19, 22)
  addHorizontalWall(map, 32, 42, 19, 37)
  addVerticalWall(map, 2, 9, 12, 7)
  addVerticalWall(map, 14, 18, 12, 18)
  addVerticalWall(map, 26, 9, 12, 31)
  addVerticalWall(map, 2, 9, 21, 7)
  addVerticalWall(map, 16, 18, 21, 22)
  addVerticalWall(map, 32, 18, 21, 37)

  addDoor(map, 7, 10)
  addDoor(map, 19, 10)
  addDoor(map, 31, 10)
  addDoor(map, 7, 12)
  addDoor(map, 19, 12)
  addDoor(map, 31, 12)
  addDoor(map, 7, 19)
  addDoor(map, 23, 19)
  addDoor(map, 37, 19)
  addDoor(map, 7, 21)
  addDoor(map, 23, 21)
  addDoor(map, 37, 21)

  return {
    id: 4,
    name: '守卫大厅',
    width: w,
    height: h,
    tileSize: 28,
    tiles: map,
    playerStart: { x: 3, y: 4 },
    targetPosition: { x: 39, y: 23 },
    guards: [
      {
        id: 'g1',
        startPosition: { x: 18, y: 5 },
        patrolPath: [
          { position: { x: 18, y: 5 }, waitTime: 0.5 },
          { position: { x: 22, y: 5 }, waitTime: 0.5 },
          { position: { x: 22, y: 8 }, waitTime: 1 },
          { position: { x: 18, y: 8 }, waitTime: 0.5 },
        ],
        viewRange: 7,
        viewAngle: Math.PI / 3,
        hearingRange: 7,
        speed: 1.6,
      },
      {
        id: 'g2',
        startPosition: { x: 30, y: 5 },
        patrolPath: [
          { position: { x: 30, y: 5 }, waitTime: 0.5 },
          { position: { x: 33, y: 5 }, waitTime: 0.5 },
          { position: { x: 33, y: 8 }, waitTime: 1 },
          { position: { x: 30, y: 8 }, waitTime: 0.5 },
        ],
        viewRange: 7,
        viewAngle: Math.PI / 3,
        hearingRange: 6,
        speed: 1.5,
      },
      {
        id: 'g3',
        startPosition: { x: 7, y: 15 },
        patrolPath: [
          { position: { x: 7, y: 15 }, waitTime: 0.3 },
          { position: { x: 10, y: 15 }, waitTime: 0.3 },
          { position: { x: 10, y: 17 }, waitTime: 0.5 },
          { position: { x: 7, y: 17 }, waitTime: 0.3 },
        ],
        viewRange: 6,
        viewAngle: Math.PI / 3,
        hearingRange: 6,
        speed: 1.4,
      },
      {
        id: 'g4',
        startPosition: { x: 23, y: 15 },
        patrolPath: [
          { position: { x: 23, y: 15 }, waitTime: 0.3 },
          { position: { x: 27, y: 15 }, waitTime: 0.3 },
          { position: { x: 27, y: 17 }, waitTime: 0.5 },
          { position: { x: 23, y: 17 }, waitTime: 0.3 },
        ],
        viewRange: 7,
        viewAngle: Math.PI / 4,
        hearingRange: 7,
        speed: 1.6,
      },
      {
        id: 'g5',
        startPosition: { x: 37, y: 15 },
        patrolPath: [
          { position: { x: 37, y: 15 }, waitTime: 0.3 },
          { position: { x: 40, y: 15 }, waitTime: 0.3 },
          { position: { x: 40, y: 17 }, waitTime: 0.5 },
          { position: { x: 37, y: 17 }, waitTime: 0.3 },
        ],
        viewRange: 7,
        viewAngle: Math.PI / 3,
        hearingRange: 6,
        speed: 1.5,
      },
    ],
    interactiveObjects: [
      { id: 'c1', type: 'candle', position: { x: 16, y: 3 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'c2', type: 'candle', position: { x: 28, y: 3 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'c3', type: 'candle', position: { x: 5, y: 13 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'r1', type: 'rope', position: { x: 20, y: 14 }, soundRadius: 8, distractionDuration: 6, isActive: true },
      { id: 'b1', type: 'bell', position: { x: 35, y: 14 }, soundRadius: 9, distractionDuration: 7, isActive: true },
      { id: 'v1', type: 'vase', position: { x: 8, y: 22 }, soundRadius: 7, distractionDuration: 5, isActive: true },
    ],
    lightSources: [{ x: 18, y: 3 }, { x: 30, y: 3 }, { x: 5, y: 13 }, { x: 23, y: 13 }, { x: 37, y: 13 }],
    shadowZones: [{ x: 3, y: 4 }, { x: 40, y: 4 }, { x: 18, y: 14 }, { x: 4, y: 22 }, { x: 35, y: 22 }],
    timeLimit: 80,
  }
}

function buildLevel5(): LevelConfig {
  const w = 50, h = 30
  const map = createEmptyMap(w, h)

  addRoom(map, 2, 2, 8, 6, T.ShadowFloor)
  addRoom(map, 12, 2, 10, 6, T.LightFloor)
  addRoom(map, 24, 2, 10, 6, T.LightFloor)
  addRoom(map, 36, 2, 12, 6, T.ShadowFloor)
  addRoom(map, 2, 10, 10, 8, T.LightFloor)
  addRoom(map, 14, 10, 10, 8, T.ShadowFloor)
  addRoom(map, 26, 10, 10, 8, T.LightFloor)
  addRoom(map, 38, 10, 10, 8, T.ShadowFloor)
  addRoom(map, 2, 20, 15, 8, T.LightFloor)
  addRoom(map, 19, 20, 12, 8, T.ShadowFloor)
  addRoom(map, 33, 20, 14, 8, T.LightFloor)

  addHorizontalWall(map, 2, 9, 8, 6)
  addHorizontalWall(map, 12, 21, 8, 17)
  addHorizontalWall(map, 24, 33, 8, 29)
  addHorizontalWall(map, 36, 47, 8, 42)
  addHorizontalWall(map, 2, 11, 18, 7)
  addHorizontalWall(map, 14, 23, 18, 19)
  addHorizontalWall(map, 26, 35, 18, 31)
  addHorizontalWall(map, 38, 47, 18, 43)
  addVerticalWall(map, 2, 7, 10, 7)
  addVerticalWall(map, 14, 17, 10, 17)
  addVerticalWall(map, 26, 17, 10, 31)
  addVerticalWall(map, 38, 17, 10, 43)
  addVerticalWall(map, 2, 7, 20, 7)
  addVerticalWall(map, 19, 17, 20, 25)
  addVerticalWall(map, 33, 17, 20, 39)

  addDoor(map, 6, 8)
  addDoor(map, 17, 8)
  addDoor(map, 29, 8)
  addDoor(map, 42, 8)
  addDoor(map, 6, 10)
  addDoor(map, 17, 10)
  addDoor(map, 29, 10)
  addDoor(map, 42, 10)
  addDoor(map, 7, 18)
  addDoor(map, 19, 18)
  addDoor(map, 31, 18)
  addDoor(map, 43, 18)
  addDoor(map, 7, 20)
  addDoor(map, 25, 20)
  addDoor(map, 39, 20)

  return {
    id: 5,
    name: '王座暗影',
    width: w,
    height: h,
    tileSize: 24,
    tiles: map,
    playerStart: { x: 3, y: 4 },
    targetPosition: { x: 44, y: 24 },
    guards: [
      {
        id: 'g1',
        startPosition: { x: 16, y: 4 },
        patrolPath: [
          { position: { x: 16, y: 4 }, waitTime: 0.3 },
          { position: { x: 20, y: 4 }, waitTime: 0.3 },
          { position: { x: 20, y: 6 }, waitTime: 0.5 },
          { position: { x: 16, y: 6 }, waitTime: 0.3 },
        ],
        viewRange: 8,
        viewAngle: Math.PI / 3,
        hearingRange: 7,
        speed: 1.8,
      },
      {
        id: 'g2',
        startPosition: { x: 28, y: 4 },
        patrolPath: [
          { position: { x: 28, y: 4 }, waitTime: 0.3 },
          { position: { x: 32, y: 4 }, waitTime: 0.3 },
          { position: { x: 32, y: 6 }, waitTime: 0.5 },
          { position: { x: 28, y: 6 }, waitTime: 0.3 },
        ],
        viewRange: 8,
        viewAngle: Math.PI / 3,
        hearingRange: 7,
        speed: 1.7,
      },
      {
        id: 'g3',
        startPosition: { x: 7, y: 14 },
        patrolPath: [
          { position: { x: 7, y: 14 }, waitTime: 0.3 },
          { position: { x: 10, y: 14 }, waitTime: 0.3 },
          { position: { x: 10, y: 16 }, waitTime: 0.5 },
          { position: { x: 7, y: 16 }, waitTime: 0.3 },
        ],
        viewRange: 7,
        viewAngle: Math.PI / 3,
        hearingRange: 7,
        speed: 1.6,
      },
      {
        id: 'g4',
        startPosition: { x: 19, y: 14 },
        patrolPath: [
          { position: { x: 19, y: 14 }, waitTime: 0.2 },
          { position: { x: 22, y: 14 }, waitTime: 0.2 },
          { position: { x: 22, y: 16 }, waitTime: 0.3 },
          { position: { x: 19, y: 16 }, waitTime: 0.2 },
        ],
        viewRange: 8,
        viewAngle: Math.PI / 4,
        hearingRange: 8,
        speed: 1.8,
      },
      {
        id: 'g5',
        startPosition: { x: 31, y: 14 },
        patrolPath: [
          { position: { x: 31, y: 14 }, waitTime: 0.2 },
          { position: { x: 34, y: 14 }, waitTime: 0.2 },
          { position: { x: 34, y: 16 }, waitTime: 0.3 },
          { position: { x: 31, y: 16 }, waitTime: 0.2 },
        ],
        viewRange: 8,
        viewAngle: Math.PI / 3,
        hearingRange: 7,
        speed: 1.7,
      },
      {
        id: 'g6',
        startPosition: { x: 42, y: 14 },
        patrolPath: [
          { position: { x: 42, y: 14 }, waitTime: 0.2 },
          { position: { x: 45, y: 14 }, waitTime: 0.2 },
          { position: { x: 45, y: 16 }, waitTime: 0.3 },
          { position: { x: 42, y: 16 }, waitTime: 0.2 },
        ],
        viewRange: 8,
        viewAngle: Math.PI / 3,
        hearingRange: 7,
        speed: 1.8,
      },
      {
        id: 'g7',
        startPosition: { x: 40, y: 24 },
        patrolPath: [
          { position: { x: 40, y: 24 }, waitTime: 0.2 },
          { position: { x: 44, y: 24 }, waitTime: 0.2 },
          { position: { x: 44, y: 26 }, waitTime: 0.3 },
          { position: { x: 40, y: 26 }, waitTime: 0.2 },
        ],
        viewRange: 9,
        viewAngle: Math.PI / 4,
        hearingRange: 8,
        speed: 2.0,
      },
    ],
    interactiveObjects: [
      { id: 'c1', type: 'candle', position: { x: 14, y: 3 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'c2', type: 'candle', position: { x: 26, y: 3 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'c3', type: 'candle', position: { x: 5, y: 12 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'c4', type: 'candle', position: { x: 38, y: 12 }, soundRadius: 0, distractionDuration: 0, isActive: true },
      { id: 'r1', type: 'rope', position: { x: 17, y: 14 }, soundRadius: 9, distractionDuration: 7, isActive: true },
      { id: 'r2', type: 'rope', position: { x: 29, y: 14 }, soundRadius: 9, distractionDuration: 7, isActive: true },
      { id: 'b1', type: 'bell', position: { x: 10, y: 22 }, soundRadius: 10, distractionDuration: 8, isActive: true },
      { id: 'b2', type: 'bell', position: { x: 36, y: 22 }, soundRadius: 10, distractionDuration: 8, isActive: true },
      { id: 'v1', type: 'vase', position: { x: 22, y: 22 }, soundRadius: 8, distractionDuration: 6, isActive: true },
    ],
    lightSources: [
      { x: 16, y: 3 }, { x: 28, y: 3 }, { x: 5, y: 12 },
      { x: 19, y: 12 }, { x: 31, y: 12 }, { x: 42, y: 12 },
      { x: 10, y: 21 }, { x: 36, y: 21 },
    ],
    shadowZones: [
      { x: 3, y: 4 }, { x: 40, y: 4 }, { x: 18, y: 12 },
      { x: 42, y: 12 }, { x: 4, y: 22 }, { x: 22, y: 22 },
    ],
    timeLimit: 70,
  }
}

export class LevelManager {
  private levels: LevelConfig[] = []
  private currentLevelIndex: number = 0

  constructor() {
    this.levels = [
      buildLevel1(),
      buildLevel2(),
      buildLevel3(),
      buildLevel4(),
      buildLevel5(),
    ]
  }

  getCurrentLevel(): LevelConfig {
    return this.levels[this.currentLevelIndex]
  }

  getLevel(index: number): LevelConfig | null {
    if (index < 0 || index >= this.levels.length) return null
    return this.levels[index]
  }

  getCurrentLevelIndex(): number {
    return this.currentLevelIndex
  }

  getTotalLevels(): number {
    return this.levels.length
  }

  advanceLevel(): LevelConfig | null {
    this.currentLevelIndex++
    if (this.currentLevelIndex >= this.levels.length) {
      return null
    }
    return this.levels[this.currentLevelIndex]
  }

  resetToLevel(index: number): LevelConfig | null {
    if (index < 0 || index >= this.levels.length) return null
    this.currentLevelIndex = index
    return this.levels[this.currentLevelIndex]
  }

  isLastLevel(): boolean {
    return this.currentLevelIndex === this.levels.length - 1
  }

  isTileWalkable(x: number, y: number, level?: LevelConfig): boolean {
    const lv = level || this.getCurrentLevel()
    if (x < 0 || x >= lv.width || y < 0 || y >= lv.height) return false
    const tile = lv.tiles[y][x]
    return tile !== T.Wall
  }

  isTileShadow(x: number, y: number, level?: LevelConfig): boolean {
    const lv = level || this.getCurrentLevel()
    if (x < 0 || x >= lv.width || y < 0 || y >= lv.height) return false
    const tile = lv.tiles[y][x]
    return tile === T.ShadowFloor
  }
}
