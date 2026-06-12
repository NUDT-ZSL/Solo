export type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface Bubble {
  row: number;
  col: number;
  color: BubbleColor;
  x: number;
  y: number;
}

export interface GridCell {
  row: number;
  col: number;
  bubble: Bubble | null;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  effect: (state: GameState) => GameState;
}

export interface UpgradeData {
  angleRange: number;
  aimLineLength: number;
  bottomStep: number;
  initialRows: number;
  stars: number;
  levels: {
    angleRange: number;
    aimLineLength: number;
    bottomStep: number;
    initialRows: number;
  };
}

export interface ReplayInput {
  type: 'move' | 'shoot' | 'keydown' | 'keyup';
  x?: number;
  y?: number;
  key?: string;
  timestamp: number;
}

export interface GameState {
  grid: (Bubble | null)[][];
  rows: number;
  cols: number;
  currentColorCount: number;
  level: number;
  score: number;
  combo: number;
  totalEliminated: number;
  eliminateProgress: number;
  launcherAngle: number;
  aimLineVisible: boolean;
  items: ItemDef[];
  gameOver: boolean;
  levelComplete: boolean;
  shooting: boolean;
  projectileX: number;
  projectileY: number;
  projectileVX: number;
  projectileVY: number;
  projectileColor: BubbleColor;
  nextBubbleColor: BubbleColor;
  baseAngleRange: number;
  baseAimLineRatio: number;
  baseBottomStep: number;
  baseInitialRows: number;
}

const COLORS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const ROWS = 12;
const COLS = 8;
const BUBBLE_RADIUS = 20;
const HEX_ROW_HEIGHT = BUBBLE_RADIUS * 1.732;

const ITEM_POOL: ItemDef[] = [
  {
    id: 'speed_up', name: '加速', description: '发射速度+20%', icon: '⚡',
    effect: (s) => s,
  },
  {
    id: 'speed_down', name: '减速', description: '发射速度-20%', icon: '🐌',
    effect: (s) => s,
  },
  {
    id: 'size_up', name: '膨胀', description: '泡泡大小+15%', icon: '🔴',
    effect: (s) => s,
  },
  {
    id: 'size_down', name: '缩小', description: '泡泡大小-15%', icon: '🟢',
    effect: (s) => s,
  },
  {
    id: 'color_up', name: '多彩', description: '颜色数量+1种', icon: '🎨',
    effect: (s) => ({ ...s, currentColorCount: Math.min(s.currentColorCount + 1, 6) }),
  },
  {
    id: 'color_down', name: '纯净', description: '颜色数量-1种', icon: '💎',
    effect: (s) => ({ ...s, currentColorCount: Math.max(s.currentColorCount - 1, 3) }),
  },
  {
    id: 'expand_up', name: '上扩', description: '消除范围上扩展一行', icon: '⬆️',
    effect: (s) => s,
  },
  {
    id: 'expand_down', name: '下扩', description: '消除范围下扩展一行', icon: '⬇️',
    effect: (s) => s,
  },
  {
    id: 'aim_extend', name: '远瞄', description: '瞄准线长度+20%', icon: '🎯',
    effect: (s) => s,
  },
  {
    id: 'lucky', name: '幸运', description: '更容易匹配颜色', icon: '🍀',
    effect: (s) => s,
  },
];

function getColCount(row: number): number {
  return row % 2 === 0 ? COLS : COLS - 1;
}

function bubblePosition(row: number, col: number): { x: number; y: number } {
  const x = col * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + (row % 2 === 1 ? BUBBLE_RADIUS : 0);
  const y = row * HEX_ROW_HEIGHT + BUBBLE_RADIUS;
  return { x, y };
}

function randomColor(colorCount: number): BubbleColor {
  return COLORS[Math.floor(Math.random() * colorCount)];
}

function createEmptyGrid(): (Bubble | null)[][] {
  const grid: (Bubble | null)[][] = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    const cc = getColCount(r);
    for (let c = 0; c < cc; c++) {
      grid[r][c] = null;
    }
  }
  return grid;
}

function fillGrid(colorCount: number, initialRows: number): (Bubble | null)[][] {
  const grid = createEmptyGrid();
  const rows = Math.min(initialRows, ROWS);
  for (let r = 0; r < rows; r++) {
    const cc = getColCount(r);
    for (let c = 0; c < cc; c++) {
      const pos = bubblePosition(r, c);
      grid[r][c] = {
        row: r,
        col: c,
        color: randomColor(colorCount),
        x: pos.x,
        y: pos.y,
      };
    }
  }
  return grid;
}

function getNeighbors(row: number, col: number): { row: number; col: number }[] {
  const neighbors: { row: number; col: number }[] = [];
  const even = row % 2 === 0;
  const offsets = even
    ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];

  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < getColCount(nr)) {
      neighbors.push({ row: nr, col: nc });
    }
  }
  return neighbors;
}

function findConnected(grid: (Bubble | null)[][], row: number, col: number, color: BubbleColor): { row: number; col: number }[] {
  const visited = new Set<string>();
  const result: { row: number; col: number }[] = [];
  const queue: { row: number; col: number }[] = [{ row, col }];
  visited.add(`${row},${col}`);

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const n of getNeighbors(current.row, current.col)) {
      const key = `${n.row},${n.col}`;
      if (!visited.has(key)) {
        const cell = grid[n.row]?.[n.col];
        if (cell && cell.color === color) {
          visited.add(key);
          queue.push(n);
        }
      }
    }
  }
  return result;
}

function findFloating(grid: (Bubble | null)[][]): { row: number; col: number }[] {
  const connected = new Set<string>();
  const queue: { row: number; col: number }[] = [];

  const cc0 = getColCount(0);
  for (let c = 0; c < cc0; c++) {
    if (grid[0][c]) {
      queue.push({ row: 0, col: c });
      connected.add(`0,${c}`);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const n of getNeighbors(current.row, current.col)) {
      const key = `${n.row},${n.col}`;
      if (!connected.has(key) && grid[n.row]?.[n.col]) {
        connected.add(key);
        queue.push(n);
      }
    }
  }

  const floating: { row: number; col: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    const cc = getColCount(r);
    for (let c = 0; c < cc; c++) {
      if (grid[r][c] && !connected.has(`${r},${c}`)) {
        floating.push({ row: r, col: c });
      }
    }
  }
  return floating;
}

function snapToGrid(x: number, y: number): { row: number; col: number } {
  let bestRow = 0;
  let bestCol = 0;
  let bestDist = Infinity;
  for (let r = 0; r < ROWS; r++) {
    const cc = getColCount(r);
    for (let c = 0; c < cc; c++) {
      const pos = bubblePosition(r, c);
      const dist = Math.hypot(pos.x - x, pos.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        bestRow = r;
        bestCol = c;
      }
    }
  }
  return { row: bestRow, col: bestCol };
}

export class GameEngine {
  state: GameState;
  private inputLog: ReplayInput[] = [];
  private startTime: number = 0;
  onStateChange?: (state: GameState) => void;
  private speedMultiplier: number = 1;

  constructor(upgrades?: UpgradeData) {
    const angleRange = upgrades?.levels.angleRange ?? 45;
    const aimLineRatio = upgrades?.levels.aimLineLength ?? 0.33;
    const bottomStep = upgrades?.levels.bottomStep ?? 1;
    const initialRows = upgrades?.levels.initialRows ?? 4;

    const colorCount = 4;
    const grid = fillGrid(colorCount, initialRows);
    const items = this.pickRandomItems(3);

    this.state = {
      grid,
      rows: ROWS,
      cols: COLS,
      currentColorCount: colorCount,
      level: 1,
      score: 0,
      combo: 0,
      totalEliminated: 0,
      eliminateProgress: 0,
      launcherAngle: 0,
      aimLineVisible: false,
      items,
      gameOver: false,
      levelComplete: false,
      shooting: false,
      projectileX: 0,
      projectileY: 0,
      projectileVX: 0,
      projectileVY: 0,
      projectileColor: randomColor(colorCount),
      nextBubbleColor: randomColor(colorCount),
      baseAngleRange: angleRange,
      baseAimLineRatio: aimLineRatio,
      baseBottomStep: bottomStep,
      baseInitialRows: initialRows,
    };

    this.applyItems();
  }

  private pickRandomItems(count: number): ItemDef[] {
    const pool = [...ITEM_POOL];
    const picked: ItemDef[] = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }

  private applyItems(): void {
    for (const item of this.state.items) {
      this.state = item.effect(this.state);
    }
  }

  startGame(): void {
    this.startTime = performance.now();
    this.inputLog = [];
  }

  startReplay(inputs: ReplayInput[], speed: number = 1): void {
    this.speedMultiplier = speed;
    this.inputLog = inputs;
  }

  getReplayInputs(): ReplayInput[] {
    return [...this.inputLog];
  }

  private logInput(input: Omit<ReplayInput, 'timestamp'>): void {
    this.inputLog.push({
      ...input,
      timestamp: performance.now() - this.startTime,
    });
  }

  setAimAngle(angle: number): void {
    const maxAngle = this.state.baseAngleRange;
    const clamped = Math.max(-maxAngle, Math.min(maxAngle, angle));
    this.state.launcherAngle = clamped;
    this.logInput({ type: 'move', x: clamped });
  }

  toggleAimLine(visible: boolean): void {
    this.state.aimLineVisible = visible;
    this.logInput({ type: 'keydown', key: visible ? 'Space' : 'SpaceUp' });
  }

  shoot(): boolean {
    if (this.state.shooting || this.state.gameOver || this.state.levelComplete) return false;

    const angleRad = (this.state.launcherAngle * Math.PI) / 180;
    const speed = 12;
    const launcherX = (COLS * BUBBLE_RADIUS * 2) / 2;
    const launcherY = ROWS * HEX_ROW_HEIGHT + BUBBLE_RADIUS;

    this.state.shooting = true;
    this.state.projectileX = launcherX;
    this.state.projectileY = launcherY;
    this.state.projectileVX = Math.sin(angleRad) * speed;
    this.state.projectileVY = -Math.cos(angleRad) * speed;

    this.logInput({
      type: 'shoot',
      x: this.state.projectileX,
      y: this.state.projectileY,
    });

    return true;
  }

  update(): { eliminated: number; dropped: number; levelComplete: boolean; gameOver: boolean } {
    const result = { eliminated: 0, dropped: 0, levelComplete: false, gameOver: false };

    if (!this.state.shooting) return result;

    const gridWidth = COLS * BUBBLE_RADIUS * 2;

    this.state.projectileX += this.state.projectileVX;
    this.state.projectileY += this.state.projectileVY;

    if (this.state.projectileX - BUBBLE_RADIUS < 0) {
      this.state.projectileX = BUBBLE_RADIUS;
      this.state.projectileVX *= -1;
    }
    if (this.state.projectileX + BUBBLE_RADIUS > gridWidth) {
      this.state.projectileX = gridWidth - BUBBLE_RADIUS;
      this.state.projectileVX *= -1;
    }

    if (this.state.projectileY - BUBBLE_RADIUS <= 0) {
      this.landBubble();
      return result;
    }

    const hit = this.checkCollision();
    if (hit) {
      this.landBubble();
      return result;
    }

    return result;
  }

  private checkCollision(): boolean {
    const px = this.state.projectileX;
    const py = this.state.projectileY;

    for (let r = 0; r < ROWS; r++) {
      const cc = getColCount(r);
      for (let c = 0; c < cc; c++) {
        const bubble = this.state.grid[r][c];
        if (bubble) {
          const dist = Math.hypot(bubble.x - px, bubble.y - py);
          if (dist < BUBBLE_RADIUS * 2) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private landBubble(): void {
    const { row, col } = snapToGrid(this.state.projectileX, this.state.projectileY);

    if (row >= ROWS || this.state.grid[row]?.[col]) {
      this.state.shooting = false;
      this.checkGameOver();
      return;
    }

    const pos = bubblePosition(row, col);
    this.state.grid[row][col] = {
      row,
      col,
      color: this.state.projectileColor,
      x: pos.x,
      y: pos.y,
    };

    const connected = findConnected(this.state.grid, row, col, this.state.projectileColor);
    let eliminated = 0;
    let dropped = 0;

    if (connected.length >= 3) {
      for (const { row: cr, col: cc } of connected) {
        this.state.grid[cr][cc] = null;
        eliminated++;
      }

      const floating = findFloating(this.state.grid);
      for (const { row: fr, col: fc } of floating) {
        this.state.grid[fr][fc] = null;
        dropped++;
      }

      this.state.combo++;
      const comboMultiplier = 1 + this.state.combo * 0.2;
      this.state.score += Math.floor((eliminated * 10 + dropped * 20) * comboMultiplier);
      this.state.totalEliminated += eliminated + dropped;

      const totalCells = ROWS * COLS;
      this.state.eliminateProgress = this.state.totalEliminated / totalCells;

      const progressThreshold = Math.floor(this.state.eliminateProgress / 0.3);
      if (progressThreshold > 0 && this.state.eliminateProgress >= progressThreshold * 0.3) {
        this.pushDownRows();
      }

      if (this.isLevelComplete()) {
        this.state.levelComplete = true;
      }
    } else {
      this.state.combo = 0;
    }

    this.state.projectileColor = this.state.nextBubbleColor;
    this.state.nextBubbleColor = randomColor(this.state.currentColorCount);
    this.state.shooting = false;
    this.checkGameOver();
  }

  private pushDownRows(): void {
    const step = this.state.baseBottomStep;
    for (let i = 0; i < step; i++) {
      for (let r = ROWS - 1; r >= 1; r--) {
        const cc = getColCount(r);
        for (let c = 0; c < cc; c++) {
          this.state.grid[r][c] = null;
        }
      }
      for (let r = ROWS - 1; r >= 1; r--) {
        const cc = getColCount(r);
        for (let c = 0; c < cc; c++) {
          if (r - 1 >= 0) {
            const srcCC = getColCount(r - 1);
            if (c < srcCC && this.state.grid[r - 1][c]) {
              const bubble = this.state.grid[r - 1][c]!;
              const newPos = bubblePosition(r, c);
              bubble.row = r;
              bubble.col = c;
              bubble.x = newPos.x;
              bubble.y = newPos.y;
              this.state.grid[r][c] = bubble;
              this.state.grid[r - 1][c] = null;
            }
          }
        }
      }

      const cc0 = getColCount(0);
      for (let c = 0; c < cc0; c++) {
        const pos = bubblePosition(0, c);
        this.state.grid[0][c] = {
          row: 0,
          col: c,
          color: randomColor(this.state.currentColorCount),
          x: pos.x,
          y: pos.y,
        };
      }
    }
  }

  private isLevelComplete(): boolean {
    for (let r = 0; r < ROWS; r++) {
      const cc = getColCount(r);
      for (let c = 0; c < cc; c++) {
        if (this.state.grid[r][c]) return false;
      }
    }
    return true;
  }

  private checkGameOver(): void {
    for (let c = 0; c < getColCount(ROWS - 1); c++) {
      if (this.state.grid[ROWS - 1]?.[c]) {
        this.state.gameOver = true;
        return;
      }
    }
  }

  advanceLevel(): void {
    this.state.level++;
    this.state.currentColorCount = Math.min(4 + Math.floor(this.state.level / 2), 6);
    const newInitialRows = Math.min(this.state.baseInitialRows + Math.floor(this.state.level / 3), 8);
    this.state.grid = fillGrid(this.state.currentColorCount, newInitialRows);
    this.state.combo = 0;
    this.state.totalEliminated = 0;
    this.state.eliminateProgress = 0;
    this.state.levelComplete = false;
    this.state.gameOver = false;
    this.state.items = this.pickRandomItems(3);
    this.state.projectileColor = randomColor(this.state.currentColorCount);
    this.state.nextBubbleColor = randomColor(this.state.currentColorCount);
    this.applyItems();
  }

  calculateStars(): number {
    const base = this.state.level * 100 + this.state.score;
    const comboBonus = Math.floor(this.state.combo * 50);
    return base + comboBonus;
  }

  getAimLinePoints(): { x: number; y: number }[] {
    const launcherX = (COLS * BUBBLE_RADIUS * 2) / 2;
    const launcherY = ROWS * HEX_ROW_HEIGHT + BUBBLE_RADIUS;
    const angleRad = (this.state.launcherAngle * Math.PI) / 180;
    const lineRatio = this.state.baseAimLineRatio;
    const gridHeight = ROWS * HEX_ROW_HEIGHT + BUBBLE_RADIUS * 2;
    const lineLength = gridHeight * lineRatio;

    const points: { x: number; y: number }[] = [];
    const steps = 20;
    const vx = Math.sin(angleRad);
    const vy = -Math.cos(angleRad);

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * lineLength;
      let x = launcherX + vx * t;
      let y = launcherY + vy * t;
      const gridWidth = COLS * BUBBLE_RADIUS * 2;

      if (x < 0) x = -x;
      if (x > gridWidth) x = 2 * gridWidth - x;

      points.push({ x, y });
      if (y < 0) break;
    }
    return points;
  }

  getLauncherPosition(): { x: number; y: number } {
    return {
      x: (COLS * BUBBLE_RADIUS * 2) / 2,
      y: ROWS * HEX_ROW_HEIGHT + BUBBLE_RADIUS,
    };
  }

  getGridDimensions(): { width: number; height: number } {
    return {
      width: COLS * BUBBLE_RADIUS * 2,
      height: ROWS * HEX_ROW_HEIGHT + BUBBLE_RADIUS * 2,
    };
  }
}

export { BUBBLE_RADIUS, ROWS, COLS, HEX_ROW_HEIGHT, COLORS, ITEM_POOL };
