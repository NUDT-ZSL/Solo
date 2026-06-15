export type FragmentType = 'ice' | 'fire' | 'life';

export interface Fragment {
  type: FragmentType;
  x: number;
  y: number;
  rotation: number;
  id: number;
}

export interface Cell {
  fragment: Fragment | null;
}

export interface RuneActivateEvent {
  type: FragmentType;
  cells: { x: number; y: number }[];
  timestamp: number;
}

export class GameGrid {
  readonly cols = 10;
  readonly rows = 20;
  cells: Cell[][];
  currentFragment: Fragment | null = null;
  nextFragments: FragmentType[] = [];
  runeSlots: FragmentType[] = ['ice', 'fire', 'life'];
  private fragmentIdCounter = 0;
  private listeners: ((event: RuneActivateEvent) => void)[] = [];

  constructor() {
    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.cols; x++) {
        row.push({ fragment: null });
      }
      this.cells.push(row);
    }
    this.generateNextFragments();
  }

  onRuneActivate(listener: (event: RuneActivateEvent) => void): void {
    this.listeners.push(listener);
  }

  private emitRuneActivate(event: RuneActivateEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  generateNextFragments(): void {
    const types: FragmentType[] = ['ice', 'fire', 'life'];
    while (this.nextFragments.length < 3) {
      this.nextFragments.push(types[Math.floor(Math.random() * types.length)]);
    }
  }

  spawnFragment(): Fragment | null {
    if (this.nextFragments.length === 0) {
      this.generateNextFragments();
    }
    const type = this.nextFragments.shift()!;
    this.generateNextFragments();

    const fragment: Fragment = {
      type,
      x: Math.floor(this.cols / 2),
      y: 0,
      rotation: 0,
      id: this.fragmentIdCounter++
    };

    if (this.cells[0][fragment.x].fragment !== null) {
      return null;
    }

    this.currentFragment = fragment;
    return fragment;
  }

  canMove(fragment: Fragment, dx: number, dy: number): boolean {
    const newX = fragment.x + dx;
    const newY = fragment.y + dy;
    if (newX < 0 || newX >= this.cols || newY < 0 || newY >= this.rows) {
      return false;
    }
    if (this.cells[newY][newX].fragment !== null) {
      return false;
    }
    return true;
  }

  moveFragment(dx: number, dy: number): boolean {
    if (!this.currentFragment) return false;
    if (this.canMove(this.currentFragment, dx, dy)) {
      this.currentFragment.x += dx;
      this.currentFragment.y += dy;
      return true;
    }
    return false;
  }

  rotateFragment(): void {
    if (!this.currentFragment) return;
    this.currentFragment.rotation = (this.currentFragment.rotation + 1) % 4;
  }

  lockFragment(): { x: number; y: number } | null {
    if (!this.currentFragment) return null;
    const { x, y, type, id, rotation } = this.currentFragment;
    this.cells[y][x].fragment = { type, x, y, id, rotation };
    const pos = { x, y };
    this.currentFragment = null;
    return pos;
  }

  checkAndClearMatches(): RuneActivateEvent[] {
    const allEvents: RuneActivateEvent[] = [];
    let hasMatches = true;
    let iterations = 0;
    const maxIterations = 10;

    while (hasMatches && iterations < maxIterations) {
      hasMatches = false;
      iterations++;

      const events: RuneActivateEvent[] = [];
      const toRemove = new Set<string>();

      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols - 2; x++) {
          const f1 = this.cells[y][x].fragment;
          const f2 = this.cells[y][x + 1].fragment;
          const f3 = this.cells[y][x + 2].fragment;
          if (f1 && f2 && f3 && f1.type === f2.type && f2.type === f3.type) {
            toRemove.add(`${x},${y}`);
            toRemove.add(`${x + 1},${y}`);
            toRemove.add(`${x + 2},${y}`);
            const cells = [
              { x, y },
              { x: x + 1, y },
              { x: x + 2, y }
            ];
            events.push({ type: f1.type, cells, timestamp: Date.now() });
          }
        }
      }

      for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows - 2; y++) {
          const f1 = this.cells[y][x].fragment;
          const f2 = this.cells[y + 1][x].fragment;
          const f3 = this.cells[y + 2][x].fragment;
          if (f1 && f2 && f3 && f1.type === f2.type && f2.type === f3.type) {
            toRemove.add(`${x},${y}`);
            toRemove.add(`${x},${y + 1}`);
            toRemove.add(`${x},${y + 2}`);
            const cells = [
              { x, y },
              { x, y: y + 1 },
              { x, y: y + 2 }
            ];
            events.push({ type: f1.type, cells, timestamp: Date.now() });
          }
        }
      }

      if (toRemove.size > 0) {
        hasMatches = true;

        for (const key of toRemove) {
          const [xs, ys] = key.split(',');
          const cx = parseInt(xs);
          const cy = parseInt(ys);
          this.cells[cy][cx].fragment = null;
        }

        this.applyGravity();

        for (const event of events) {
          allEvents.push(event);
          this.emitRuneActivate(event);
        }
      }
    }

    return allEvents;
  }

  applyGravity(): void {
    for (let x = 0; x < this.cols; x++) {
      let writePos = this.rows - 1;
      for (let y = this.rows - 1; y >= 0; y--) {
        if (this.cells[y][x].fragment !== null) {
          if (y !== writePos) {
            this.cells[writePos][x].fragment = this.cells[y][x].fragment;
            this.cells[writePos][x].fragment!.y = writePos;
            this.cells[y][x].fragment = null;
          }
          writePos--;
        }
      }
    }
  }

  clearFullLines(): number {
    let cleared = 0;
    for (let y = this.rows - 1; y >= 0; y--) {
      const isFull = this.cells[y].every(cell => cell.fragment !== null);
      if (isFull) {
        for (let x = 0; x < this.cols; x++) {
          this.cells[y][x].fragment = null;
        }
        cleared++;
      }
    }
    if (cleared > 0) {
      this.applyGravity();
    }
    return cleared;
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    return this.cells[y][x];
  }

  isGameOver(): boolean {
    return this.cells[0].some(cell => cell.fragment !== null);
  }
}
