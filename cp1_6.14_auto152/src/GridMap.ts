import type { Cell, CellType } from './types';
import { eventBus } from './utils/EventBus';

export const GRID_SIZE = 10;
export const CELL_PX = 60;
export const MOVE_INTERVAL = 300;

const TYPE_WEIGHTS: { type: Exclude<CellType, 'start' | 'end'>; weight: number }[] = [
  { type: 'chest', weight: 30 },
  { type: 'trap', weight: 20 },
  { type: 'monster', weight: 30 },
  { type: 'shop', weight: 10 },
  { type: 'empty', weight: 10 },
];

function weightedPick(): Exclude<CellType, 'start' | 'end'> {
  const total = TYPE_WEIGHTS.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const { type, weight } of TYPE_WEIGHTS) {
    if (r < weight) return type;
    r -= weight;
  }
  return 'empty';
}

export class GridMap {
  cells: Cell[][] = [];
  playerX = 0;
  playerY = 0;
  private moving = false;
  private timers: number[] = [];

  generate(): void {
    const grid: Cell[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        let type: CellType = weightedPick();
        if (x === 0 && y === 0) type = 'start';
        else if (x === GRID_SIZE - 1 && y === GRID_SIZE - 1) type = 'end';
        row.push({
          x,
          y,
          type,
          visited: x === 0 && y === 0,
          resolved: x === 0 && y === 0,
        });
      }
      grid.push(row);
    }
    this.cells = grid;
    this.playerX = 0;
    this.playerY = 0;
    eventBus.emit('player:position', { x: 0, y: 0 });
  }

  getCell(x: number, y: number): Cell | undefined {
    return this.cells[y]?.[x];
  }

  private nextStep(x: number, y: number): { x: number; y: number } | null {
    const isEnd = x === GRID_SIZE - 1 && y === GRID_SIZE - 1;
    if (isEnd) return null;
    if (y % 2 === 0) {
      if (x < GRID_SIZE - 1) return { x: x + 1, y };
      if (y < GRID_SIZE - 1) return { x, y: y + 1 };
    } else {
      if (x > 0) return { x: x - 1, y };
      if (y < GRID_SIZE - 1) return { x, y: y + 1 };
    }
    return null;
  }

  private moveSteps(steps: number): void {
    let remaining = steps;
    let { x, y } = { x: this.playerX, y: this.playerY };

    const stepOnce = () => {
      if (remaining <= 0) {
        this.moving = false;
        eventBus.emit('player:move-end', { x: this.playerX, y: this.playerY });
        const cell = this.getCell(this.playerX, this.playerY);
        if (cell) {
          eventBus.emit('event:trigger', { type: cell.type, x: cell.x, y: cell.y });
        }
        return;
      }
      const next = this.nextStep(x, y);
      if (!next) {
        this.moving = false;
        eventBus.emit('player:move-end', { x: this.playerX, y: this.playerY });
        const cell = this.getCell(this.playerX, this.playerY);
        if (cell) {
          eventBus.emit('event:trigger', { type: cell.type, x: cell.x, y: cell.y });
        }
        return;
      }
      x = next.x;
      y = next.y;
      this.playerX = x;
      this.playerY = y;
      const c = this.getCell(x, y);
      if (c) c.visited = true;
      eventBus.emit('player:position', { x, y });
      remaining--;
      const t = window.setTimeout(stepOnce, MOVE_INTERVAL);
      this.timers.push(t);
    };
    stepOnce();
  }

  init(): () => void {
    const offStart = eventBus.on('player:move-start', ({ steps }) => {
      if (this.moving) return;
      this.moving = true;
      this.moveSteps(steps);
    });
    const offRestart = eventBus.on('game:restart', () => {
      this.timers.forEach((t) => clearTimeout(t));
      this.timers = [];
      this.moving = false;
      this.generate();
    });
    return () => {
      offStart();
      offRestart();
      this.timers.forEach((t) => clearTimeout(t));
      this.timers = [];
    };
  }
}

export const gridMap = new GridMap();
