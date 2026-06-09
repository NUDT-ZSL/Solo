import type { GridPos } from './types';

export interface LevelFirefly {
  path: GridPos[];
  speed?: number;
}

export interface LevelData {
  id: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  walls: string[];
  spiderSpawn: GridPos;
  exitPoint: GridPos;
  fireflies: LevelFirefly[];
  pickupPoints?: GridPos[];
}

const W = 24;
const H = 14;

function makeEmptyMap(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const isEdge = x === 0 || x === W - 1 || y === 0 || y === H - 1;
      row += isEdge ? '#' : '.';
    }
    rows.push(row);
  }
  return rows;
}

function setCell(rows: string[], x: number, y: number, ch: string): void {
  if (y < 0 || y >= rows.length) return;
  const row = rows[y];
  if (x < 0 || x >= row.length) return;
  rows[y] = row.substring(0, x) + ch + row.substring(x + 1);
}

function buildLevel1(): LevelData {
  const map = makeEmptyMap();
  for (let x = 3; x < 10; x++) setCell(map, x, 4, '#');
  for (let x = 14; x < 22; x++) setCell(map, x, 7, '#');
  for (let y = 7; y < 12; y++) setCell(map, 11, y, '#');
  for (let x = 6; x < 14; x++) setCell(map, x, 11, '#');
  for (let y = 4; y < 9; y++) setCell(map, 4, y, '#');
  for (let x = 15; x < 20; x++) setCell(map, x, 10, '#');
  return {
    id: 1,
    name: '第一章：初入暗影',
    gridWidth: W,
    gridHeight: H,
    walls: map,
    spiderSpawn: { gx: 2, gy: 12 },
    exitPoint: { gx: 22, gy: 1 },
    fireflies: [
      {
        path: [
          { gx: 12, gy: 3 },
          { gx: 18, gy: 3 },
          { gx: 18, gy: 6 },
          { gx: 12, gy: 6 },
        ],
      },
    ],
    pickupPoints: [{ gx: 8, gy: 3 }, { gx: 20, gy: 9 }],
  };
}

function buildLevel2(): LevelData {
  const map = makeEmptyMap();
  for (let x = 2; x < 8; x++) setCell(map, x, 5, '#');
  for (let x = 10; x < 18; x++) setCell(map, x, 4, '#');
  for (let x = 19; x < 23; x++) setCell(map, x, 8, '#');
  for (let y = 5; y < 11; y++) setCell(map, 8, y, '#');
  for (let y = 4; y < 9; y++) setCell(map, 17, y, '#');
  for (let x = 4; x < 12; x++) setCell(map, x, 10, '#');
  for (let x = 14; x < 22; x++) setCell(map, x, 12, '#');
  for (let y = 1; y < 5; y++) setCell(map, 12, y, '#');
  for (let x = 1; x < 5; x++) setCell(map, x, 2, '#');
  return {
    id: 2,
    name: '第二章：丝线交织',
    gridWidth: W,
    gridHeight: H,
    walls: map,
    spiderSpawn: { gx: 1, gy: 12 },
    exitPoint: { gx: 22, gy: 2 },
    fireflies: [
      {
        path: [
          { gx: 5, gy: 4 },
          { gx: 16, gy: 3 },
          { gx: 14, gy: 6 },
          { gx: 3, gy: 6 },
        ],
      },
      {
        path: [
          { gx: 20, gy: 7 },
          { gx: 20, gy: 11 },
          { gx: 13, gy: 11 },
        ],
      },
    ],
    pickupPoints: [{ gx: 3, gy: 9 }, { gx: 15, gy: 3 }, { gx: 21, gy: 11 }],
  };
}

function buildLevel3(): LevelData {
  const map = makeEmptyMap();
  for (let x = 2; x < 7; x++) setCell(map, x, 3, '#');
  for (let y = 3; y < 7; y++) setCell(map, 6, y, '#');
  for (let x = 6; x < 12; x++) setCell(map, x, 6, '#');
  for (let y = 6; y < 10; y++) setCell(map, 11, y, '#');
  for (let x = 11; x < 18; x++) setCell(map, x, 9, '#');
  for (let y = 5; y < 10; y++) setCell(map, 17, y, '#');
  for (let x = 17; x < 23; x++) setCell(map, x, 4, '#');
  for (let y = 1; y < 5; y++) setCell(map, 17, y, '#');
  for (let x = 3; x < 10; x++) setCell(map, x, 11, '#');
  for (let x = 13; x < 21; x++) setCell(map, x, 12, '#');
  for (let y = 10; y < 13; y++) setCell(map, 10, y, '#');
  for (let y = 11; y < 13; y++) setCell(map, 21, y, '#');
  for (let x = 8; x < 14; x++) setCell(map, x, 2, '#');
  return {
    id: 3,
    name: '第三章：光之狩猎',
    gridWidth: W,
    gridHeight: H,
    walls: map,
    spiderSpawn: { gx: 1, gy: 12 },
    exitPoint: { gx: 22, gy: 1 },
    fireflies: [
      {
        path: [
          { gx: 3, gy: 2 },
          { gx: 7, gy: 2 },
          { gx: 15, gy: 1 },
          { gx: 22, gy: 2 },
        ],
      },
      {
        path: [
          { gx: 8, gy: 5 },
          { gx: 16, gy: 5 },
          { gx: 19, gy: 8 },
          { gx: 12, gy: 8 },
        ],
      },
      {
        path: [
          { gx: 2, gy: 10 },
          { gx: 2, gy: 12 },
          { gx: 9, gy: 10 },
          { gx: 14, gy: 11 },
        ],
      },
    ],
    pickupPoints: [
      { gx: 5, gy: 10 },
      { gx: 12, gy: 5 },
      { gx: 20, gy: 3 },
      { gx: 16, gy: 11 },
    ],
  };
}

export const LEVELS: LevelData[] = [buildLevel1(), buildLevel2(), buildLevel3()];

export const TOTAL_LEVELS = LEVELS.length;
