import type { Level } from './entities';

export const LEVELS: Level[] = [
  {
    id: 1,
    name: '关卡 1：初识传送带',
    gridSize: { width: 6, height: 6 },
    spawnInterval: 1500,
    timeLimit: 60,
    spawnPoint: { x: 0, y: 2 },
    spawnDirection: 'right',
    targetZones: [
      { id: 1, gridPos: { x: 5, y: 0 }, color: 'red', filled: 0, required: 2 },
      { id: 2, gridPos: { x: 5, y: 1 }, color: 'yellow', filled: 0, required: 2 },
      { id: 3, gridPos: { x: 5, y: 2 }, color: 'green', filled: 0, required: 2 },
      { id: 4, gridPos: { x: 5, y: 3 }, color: 'blue', filled: 0, required: 2 },
      { id: 5, gridPos: { x: 5, y: 4 }, color: 'red', filled: 0, required: 1 },
      { id: 6, gridPos: { x: 5, y: 5 }, color: 'yellow', filled: 0, required: 1 },
    ],
    obstacles: [],
    availableTools: {
      conveyor: 10,
      sorter: 0,
      arm: 0,
    },
    preplacedConveyors: [],
  },
  {
    id: 2,
    name: '关卡 2：分拣挑战',
    gridSize: { width: 8, height: 8 },
    spawnInterval: 1000,
    timeLimit: 60,
    spawnPoint: { x: 0, y: 3 },
    spawnDirection: 'right',
    targetZones: [
      { id: 1, gridPos: { x: 7, y: 0 }, color: 'red', filled: 0, required: 2 },
      { id: 2, gridPos: { x: 7, y: 1 }, color: 'blue', filled: 0, required: 2 },
      { id: 3, gridPos: { x: 7, y: 2 }, color: 'green', filled: 0, required: 2 },
      { id: 4, gridPos: { x: 7, y: 5 }, color: 'yellow', filled: 0, required: 2 },
      { id: 5, gridPos: { x: 7, y: 6 }, color: 'red', filled: 0, required: 2 },
      { id: 6, gridPos: { x: 7, y: 7 }, color: 'blue', filled: 0, required: 2 },
      { id: 7, gridPos: { x: 0, y: 0 }, color: 'green', filled: 0, required: 1 },
      { id: 8, gridPos: { x: 0, y: 7 }, color: 'yellow', filled: 0, required: 1 },
    ],
    obstacles: [
      { gridPos: { x: 3, y: 3 } },
      { gridPos: { x: 4, y: 3 } },
      { gridPos: { x: 3, y: 4 } },
      { gridPos: { x: 4, y: 4 } },
    ],
    availableTools: {
      conveyor: 10,
      sorter: 3,
      arm: 2,
    },
    preplacedConveyors: [
      { id: 1, gridPos: { x: 1, y: 3 }, direction: 'right' },
      { id: 2, gridPos: { x: 2, y: 3 }, direction: 'right' },
    ],
  },
];

export function getLevel(index: number): Level {
  return LEVELS[Math.min(index, LEVELS.length - 1)];
}

export function getTotalLevels(): number {
  return LEVELS.length;
}
