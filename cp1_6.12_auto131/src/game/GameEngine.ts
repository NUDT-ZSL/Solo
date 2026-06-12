export type BubbleColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface Bubble {
  row: number;
  col: number;
  color: BubbleColor;
  x: number;
  y: number;
  id: string;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  param: 'speed' | 'size' | 'colorCount' | 'eliminateRangeUp' | 'eliminateRangeDown';
  delta: number;
}

export interface UpgradeData {
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

export interface GameModifiers {
  speedMultiplier: number;
  sizeMultiplier: number;
  extraColorCount: number;
  eliminateRangeUp: number;
  eliminateRangeDown: number;
  aimLineExtraRatio: number;
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
  modifiers: GameModifiers;
  gameOver: boolean;
  levelComplete: boolean;
  shooting: boolean;
  projectileX: number;
  projectileY: number;
  projectileVX: number;
  projectileVY: number;
  projectileColor: BubbleColor;
  nextBubbleColor: BubbleColor;
  angleRange: number;
  aimLineRatio: number;
  bottomStep: number;
  initialRows: number;
}

export const COLORS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
export const ROWS = 12;
export const COLS = 8;
export const BUBBLE_RADIUS = 20;
export const HEX_VERT_SPACING = BUBBLE_RADIUS * Math.sqrt(3);
export const HEX_HORIZ_SPACING = BUBBLE_RADIUS * 2;
export const HEX_ROW_OFFSET = BUBBLE_RADIUS;

export const ITEM_POOL: ItemDef[] = [
  { id: 'speed_up', name: '急速发射器', description: '发射速度提升 +20%', icon: '⚡', param: 'speed', delta: 0.2 },
  { id: 'speed_down', name: '稳定发射器', description: '发射速度降低 -20%', icon: '🐌', param: 'speed', delta: -0.2 },
  { id: 'size_up', name: '巨型泡泡', description: '泡泡尺寸增大 +15%', icon: '🔴', param: 'size', delta: 0.15 },
  { id: 'size_down', name: '微型泡泡', description: '泡泡尺寸减小 -15%', icon: '🟢', param: 'size', delta: -0.15 },
  { id: 'color_up', name: '多彩涂层', description: '颜色数量增加 +1 种', icon: '🎨', param: 'colorCount', delta: 1 },
  { id: 'color_down', name: '单色模式', description: '颜色数量减少 -1 种', icon: '💎', param: 'colorCount', delta: -1 },
  { id: 'expand_up', name: '向上爆破', description: '消除判定向上扩展 1 行', icon: '⬆️', param: 'eliminateRangeUp', delta: 1 },
  { id: 'expand_down', name: '向下爆破', description: '消除判定向下扩展 1 行', icon: '⬇️', param: 'eliminateRangeDown', delta: 1 },
  { id: 'aim_long', name: '远视瞄准', description: '瞄准线长度额外 +20%', icon: '🎯', param: 'speed', delta: 0 },
  { id: 'lucky_shot', name: '幸运一击', description: '消除判定双向扩展各 1 行', icon: '🍀', param: 'eliminateRangeUp', delta: 1 },
];

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getColCountForRow(row: number): number {
  return row % 2 === 0 ? COLS : COLS - 1;
}

export function axialToPixel(row: number, col: number): { x: number; y: number } {
  const x = col * HEX_HORIZ_SPACING + BUBBLE_RADIUS + (row % 2 === 1 ? HEX_ROW_OFFSET : 0);
  const y = row * HEX_VERT_SPACING + BUBBLE_RADIUS;
  return { x, y };
}

export function pixelToNearestAxial(x: number, y: number): { row: number; col: number } {
  let bestRow = 0;
  let bestCol = 0;
  let bestDist = Infinity;
  for (let r = 0; r < ROWS; r++) {
    const cc = getColCountForRow(r);
    for (let c = 0; c < cc; c++) {
      const pos = axialToPixel(r, c);
      const d = Math.hypot(pos.x - x, pos.y - y);
      if (d < bestDist) {
        bestDist = d;
        bestRow = r;
        bestCol = c;
      }
    }
  }
  return { row: bestRow, col: bestCol };
}

export function getHexNeighbors(row: number, col: number): Array<{ row: number; col: number }> {
  const even = row % 2 === 0;
  const offsets = even
    ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];

  const result: Array<{ row: number; col: number }> = [];
  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < getColCountForRow(nr)) {
      result.push({ row: nr, col: nc });
    }
  }
  return result;
}

function randomColor(colorCount: number): BubbleColor {
  return COLORS[Math.floor(Math.random() * Math.min(colorCount, COLORS.length))];
}

export function createEmptyGrid(): (Bubble | null)[][] {
  const grid: (Bubble | null)[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: (Bubble | null)[] = [];
    const cc = getColCountForRow(r);
    for (let c = 0; c < cc; c++) row.push(null);
    grid.push(row);
  }
  return grid;
}

export function fillGrid(colorCount: number, initialRows: number): (Bubble | null)[][] {
  const grid = createEmptyGrid();
  const rows = Math.min(initialRows, ROWS);
  for (let r = 0; r < rows; r++) {
    const cc = getColCountForRow(r);
    for (let c = 0; c < cc; c++) {
      const pos = axialToPixel(r, c);
      grid[r][c] = {
        row: r,
        col: c,
        color: randomColor(colorCount),
        x: pos.x,
        y: pos.y,
        id: generateId(),
      };
    }
  }
  return grid;
}

export function pickRandomItems(count: number): ItemDef[] {
  const pool = [...ITEM_POOL];
  const picked: ItemDef[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

export function applyItemEffects(items: ItemDef[], base: GameModifiers): GameModifiers {
  const m: GameModifiers = { ...base };
  for (const it of items) {
    if (it.param === 'speed') m.speedMultiplier *= (1 + it.delta);
    else if (it.param === 'size') m.sizeMultiplier *= (1 + it.delta);
    else if (it.param === 'colorCount') m.extraColorCount += it.delta;
    else if (it.param === 'eliminateRangeUp') m.eliminateRangeUp += it.delta;
    else if (it.param === 'eliminateRangeDown') m.eliminateRangeDown += it.delta;
    if (it.id === 'aim_long') m.aimLineExtraRatio += 0.2;
    if (it.id === 'lucky_shot') m.eliminateRangeDown += 1;
  }
  return m;
}

export function findConnectedSameColor(
  grid: (Bubble | null)[][],
  row: number,
  col: number,
  color: BubbleColor,
  expandUp: number = 0,
  expandDown: number = 0
): Array<{ row: number; col: number }> {
  const visited = new Set<string>();
  const result: Array<{ row: number; col: number }> = [];
  const queue: Array<{ row: number; col: number }> = [{ row, col }];
  visited.add(`${row},${col}`);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    result.push(cur);
    const minRow = Math.max(0, cur.row - expandUp);
    const maxRow = Math.min(ROWS - 1, cur.row + expandDown);

    for (const n of getHexNeighbors(cur.row, cur.col)) {
      if (n.row < minRow || n.row > maxRow) continue;
      const key = `${n.row},${n.col}`;
      if (visited.has(key)) continue;
      const cell = grid[n.row]?.[n.col];
      if (cell && cell.color === color) {
        visited.add(key);
        queue.push(n);
      }
    }
  }
  return result;
}

export function findFloating(grid: (Bubble | null)[][]): Array<{ row: number; col: number }> {
  const connected = new Set<string>();
  const queue: Array<{ row: number; col: number }> = [];

  for (let c = 0; c < getColCountForRow(0); c++) {
    if (grid[0][c]) {
      queue.push({ row: 0, col: c });
      connected.add(`0,${c}`);
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const n of getHexNeighbors(cur.row, cur.col)) {
      const key = `${n.row},${n.col}`;
      if (!connected.has(key) && grid[n.row]?.[n.col]) {
        connected.add(key);
        queue.push(n);
      }
    }
  }

  const floating: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < getColCountForRow(r); c++) {
      if (grid[r][c] && !connected.has(`${r},${c}`)) {
        floating.push({ row: r, col: c });
      }
    }
  }
  return floating;
}

export class GameEngine {
  state: GameState;
  private inputLog: ReplayInput[] = [];
  private startTime: number = 0;
  onStateChange?: (state: GameState) => void;

  constructor(upgrades?: UpgradeData) {
    const angleRange = 45 + (upgrades?.levels.angleRange ?? 0) * 5;
    const aimLineLength = 33 + (upgrades?.levels.aimLineLength ?? 0) * 5;
    const bottomStep = 1 + (upgrades?.levels.bottomStep ?? 0);
    const initialRows = 4 + (upgrades?.levels.initialRows ?? 0);

    const baseColorCount = 4;
    const items = pickRandomItems(3);
    const baseMods: GameModifiers = {
      speedMultiplier: 1,
      sizeMultiplier: 1,
      extraColorCount: 0,
      eliminateRangeUp: 0,
      eliminateRangeDown: 0,
      aimLineExtraRatio: 0,
    };
    const modifiers = applyItemEffects(items, baseMods);

    const colorCount = Math.max(3, Math.min(6, baseColorCount + modifiers.extraColorCount));

    this.state = {
      grid: fillGrid(colorCount, initialRows),
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
      modifiers,
      gameOver: false,
      levelComplete: false,
      shooting: false,
      projectileX: 0,
      projectileY: 0,
      projectileVX: 0,
      projectileVY: 0,
      projectileColor: randomColor(colorCount),
      nextBubbleColor: randomColor(colorCount),
      angleRange,
      aimLineRatio: aimLineLength / 100,
      bottomStep,
      initialRows,
    };
  }

  startGame(): void {
    this.startTime = performance.now();
    this.inputLog = [];
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
    const maxAngle = this.state.angleRange;
    const clamped = Math.max(-maxAngle, Math.min(maxAngle, angle));
    this.state.launcherAngle = clamped;
    this.logInput({ type: 'move', x: clamped });
  }

  setAimAngleForReplay(angle: number): void {
    this.state.launcherAngle = angle;
  }

  toggleAimLine(visible: boolean): void {
    this.state.aimLineVisible = visible;
  }

  toggleAimLineWithLog(visible: boolean): void {
    this.toggleAimLine(visible);
    this.logInput({ type: 'keydown', key: visible ? 'Space' : 'SpaceUp' });
  }

  getLauncherPosition(): { x: number; y: number } {
    return {
      x: (COLS * HEX_HORIZ_SPACING) / 2,
      y: ROWS * HEX_VERT_SPACING + BUBBLE_RADIUS,
    };
  }

  getGridDimensions(): { width: number; height: number } {
    return {
      width: COLS * HEX_HORIZ_SPACING,
      height: ROWS * HEX_VERT_SPACING + BUBBLE_RADIUS * 2 + 40,
    };
  }

  getBubbleRadius(): number {
    return BUBBLE_RADIUS * this.state.modifiers.sizeMultiplier;
  }

  shoot(): boolean {
    if (this.state.shooting || this.state.gameOver || this.state.levelComplete) return false;

    const angleRad = (this.state.launcherAngle * Math.PI) / 180;
    const baseSpeed = 12;
    const speed = baseSpeed * this.state.modifiers.speedMultiplier;
    const pos = this.getLauncherPosition();

    this.state.shooting = true;
    this.state.projectileX = pos.x;
    this.state.projectileY = pos.y;
    this.state.projectileVX = Math.sin(angleRad) * speed;
    this.state.projectileVY = -Math.cos(angleRad) * speed;

    this.logInput({
      type: 'shoot',
      x: pos.x,
      y: pos.y,
    });
    this.notify();
    return true;
  }

  shootForReplay(): void {
    if (this.state.shooting) return;
    const angleRad = (this.state.launcherAngle * Math.PI) / 180;
    const baseSpeed = 12;
    const speed = baseSpeed * this.state.modifiers.speedMultiplier;
    const pos = this.getLauncherPosition();
    this.state.shooting = true;
    this.state.projectileX = pos.x;
    this.state.projectileY = pos.y;
    this.state.projectileVX = Math.sin(angleRad) * speed;
    this.state.projectileVY = -Math.cos(angleRad) * speed;
  }

  private notify(): void {
    if (this.onStateChange) this.onStateChange(this.state);
  }

  update(): { eliminated: number; dropped: number; levelComplete: boolean; gameOver: boolean } {
    const result = { eliminated: 0, dropped: 0, levelComplete: false, gameOver: false };
    if (!this.state.shooting) return result;

    const gridWidth = COLS * HEX_HORIZ_SPACING;
    const radius = this.getBubbleRadius();

    this.state.projectileX += this.state.projectileVX;
    this.state.projectileY += this.state.projectileVY;

    if (this.state.projectileX - radius < 0) {
      this.state.projectileX = radius;
      this.state.projectileVX *= -1;
    }
    if (this.state.projectileX + radius > gridWidth) {
      this.state.projectileX = gridWidth - radius;
      this.state.projectileVX *= -1;
    }

    if (this.state.projectileY - radius <= 0) {
      this.landProjectile();
      return result;
    }

    if (this.checkHexCollision()) {
      this.landProjectile();
      return result;
    }

    return result;
  }

  private checkHexCollision(): boolean {
    const px = this.state.projectileX;
    const py = this.state.projectileY;
    const r = this.getBubbleRadius();

    for (let row = 0; row < ROWS; row++) {
      const cc = getColCountForRow(row);
      for (let col = 0; col < cc; col++) {
        const bubble = this.state.grid[row][col];
        if (!bubble) continue;
        const d = Math.hypot(bubble.x - px, bubble.y - py);
        if (d < r * 1.9) return true;
      }
    }
    return false;
  }

  private landProjectile(): void {
    const r = this.getBubbleRadius();
    const { row, col } = pixelToNearestAxial(this.state.projectileX, this.state.projectileY);

    if (row >= ROWS) {
      this.state.shooting = false;
      this.checkGameOver();
      this.notify();
      return;
    }

    let targetRow = row;
    let targetCol = col;

    if (this.state.grid[targetRow]?.[targetCol]) {
      const neighbors = getHexNeighbors(targetRow, targetCol);
      let best = neighbors[0];
      let bestDist = Infinity;
      for (const n of neighbors) {
        if (this.state.grid[n.row]?.[n.col]) continue;
        const pos = axialToPixel(n.row, n.col);
        const d = Math.hypot(pos.x - this.state.projectileX, pos.y - this.state.projectileY);
        if (d < bestDist) {
          bestDist = d;
          best = n;
        }
      }
      targetRow = best.row;
      targetCol = best.col;
    }

    if (targetRow >= ROWS) {
      this.state.shooting = false;
      this.checkGameOver();
      this.notify();
      return;
    }

    const pos = axialToPixel(targetRow, targetCol);
    this.state.grid[targetRow][targetCol] = {
      row: targetRow,
      col: targetCol,
      color: this.state.projectileColor,
      x: pos.x,
      y: pos.y,
      id: generateId(),
    };

    const connected = findConnectedSameColor(
      this.state.grid,
      targetRow,
      targetCol,
      this.state.projectileColor,
      this.state.modifiers.eliminateRangeUp,
      this.state.modifiers.eliminateRangeDown
    );

    let eliminated = 0;
    let dropped = 0;

    if (connected.length >= 3) {
      for (const { row: cr, col: cc } of connected) {
        if (this.state.grid[cr]?.[cc]) {
          this.state.grid[cr][cc] = null;
          eliminated++;
        }
      }

      const floating = findFloating(this.state.grid);
      for (const { row: fr, col: fc } of floating) {
        if (this.state.grid[fr]?.[fc]) {
          this.state.grid[fr][fc] = null;
          dropped++;
        }
      }

      this.state.combo++;
      const comboMul = 1 + (this.state.combo - 1) * 0.25;
      this.state.score += Math.floor((eliminated * 10 + dropped * 20) * comboMul);
      this.state.totalEliminated += eliminated + dropped;

      const totalInitialCells = this.state.initialRows * COLS;
      if (totalInitialCells > 0) {
        this.state.eliminateProgress = Math.min(1, this.state.totalEliminated / totalInitialCells);
      }

      if (this.state.eliminateProgress >= 0.3 && this.state.eliminateProgress < 0.35) {
        this.pushTopRowsDown();
      } else if (this.state.eliminateProgress >= 0.6 && this.state.eliminateProgress < 0.65) {
        this.pushTopRowsDown();
      } else if (this.state.eliminateProgress >= 0.9 && this.state.eliminateProgress < 0.95) {
        this.pushTopRowsDown();
      }

      if (this.checkLevelCleared()) {
        this.state.levelComplete = true;
      }
    } else {
      this.state.combo = 0;
    }

    this.state.projectileColor = this.state.nextBubbleColor;
    this.state.nextBubbleColor = randomColor(this.state.currentColorCount);
    this.state.shooting = false;
    this.checkGameOver();
    this.notify();
  }

  private pushTopRowsDown(): void {
    for (let step = 0; step < this.state.bottomStep; step++) {
      for (let r = ROWS - 1; r >= 1; r--) {
        const cc = getColCountForRow(r);
        for (let c = 0; c < cc; c++) {
          if (r - 1 >= 0 && c < getColCountForRow(r - 1) && this.state.grid[r - 1][c]) {
            const b = this.state.grid[r - 1][c]!;
            const newPos = axialToPixel(r, c);
            b.row = r;
            b.col = c;
            b.x = newPos.x;
            b.y = newPos.y;
            this.state.grid[r][c] = b;
            this.state.grid[r - 1][c] = null;
          }
        }
      }
      const cc0 = getColCountForRow(0);
      for (let c = 0; c < cc0; c++) {
        const pos = axialToPixel(0, c);
        this.state.grid[0][c] = {
          row: 0,
          col: c,
          color: randomColor(this.state.currentColorCount),
          x: pos.x,
          y: pos.y,
          id: generateId(),
        };
      }
    }
  }

  private checkLevelCleared(): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < getColCountForRow(r); c++) {
        if (this.state.grid[r][c]) return false;
      }
    }
    return true;
  }

  private checkGameOver(): void {
    for (let c = 0; c < getColCountForRow(ROWS - 1); c++) {
      if (this.state.grid[ROWS - 1]?.[c]) {
        this.state.gameOver = true;
        return;
      }
    }
  }

  advanceLevel(): void {
    this.state.level++;
    const newBaseColors = Math.min(6, 4 + Math.floor((this.state.level - 1) / 2));
    this.state.currentColorCount = Math.max(3, Math.min(6, newBaseColors + this.state.modifiers.extraColorCount));
    const newInitialRows = Math.min(8, this.state.initialRows + Math.floor((this.state.level - 1) / 3));
    this.state.grid = fillGrid(this.state.currentColorCount, newInitialRows);
    this.state.combo = 0;
    this.state.totalEliminated = 0;
    this.state.eliminateProgress = 0;
    this.state.levelComplete = false;
    this.state.gameOver = false;
    this.state.items = pickRandomItems(3);
    const baseMods: GameModifiers = {
      speedMultiplier: 1,
      sizeMultiplier: 1,
      extraColorCount: 0,
      eliminateRangeUp: 0,
      eliminateRangeDown: 0,
      aimLineExtraRatio: 0,
    };
    this.state.modifiers = applyItemEffects(this.state.items, baseMods);
    this.state.projectileColor = randomColor(this.state.currentColorCount);
    this.state.nextBubbleColor = randomColor(this.state.currentColorCount);
    this.notify();
  }

  calculateStars(): number {
    const base = this.state.level * 100 + this.state.score;
    const comboBonus = Math.floor(this.state.combo * 50);
    return Math.floor(base + comboBonus);
  }

  getAimLinePoints(): Array<{ x: number; y: number }> {
    const pos = this.getLauncherPosition();
    const angleRad = (this.state.launcherAngle * Math.PI) / 180;
    const gridDims = this.getGridDimensions();
    const ratio = this.state.aimLineRatio + this.state.modifiers.aimLineExtraRatio;
    const lineLen = gridDims.height * Math.min(ratio, 1);

    const points: Array<{ x: number; y: number }> = [];
    const steps = 30;
    const vx = Math.sin(angleRad);
    const vy = -Math.cos(angleRad);
    const gw = COLS * HEX_HORIZ_SPACING;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * lineLen;
      let x = pos.x + vx * t;
      let y = pos.y + vy * t;
      if (x < 0) x = Math.abs(x);
      if (x > gw) x = 2 * gw - x;
      if (y < 0) { y = 0; points.push({ x, y }); break; }
      points.push({ x, y });
    }
    return points;
  }

  resetForReplay(upgrades?: UpgradeData): void {
    const angleRange = 45 + (upgrades?.levels.angleRange ?? 0) * 5;
    const aimLineLength = 33 + (upgrades?.levels.aimLineLength ?? 0) * 5;
    const bottomStep = 1 + (upgrades?.levels.bottomStep ?? 0);
    const initialRows = 4 + (upgrades?.levels.initialRows ?? 0);

    const baseColorCount = 4;
    const items = this.state.items.length > 0 ? this.state.items : pickRandomItems(3);
    const baseMods: GameModifiers = {
      speedMultiplier: 1,
      sizeMultiplier: 1,
      extraColorCount: 0,
      eliminateRangeUp: 0,
      eliminateRangeDown: 0,
      aimLineExtraRatio: 0,
    };
    const modifiers = applyItemEffects(items, baseMods);
    const colorCount = Math.max(3, Math.min(6, baseColorCount + modifiers.extraColorCount));

    this.state = {
      grid: fillGrid(colorCount, initialRows),
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
      modifiers,
      gameOver: false,
      levelComplete: false,
      shooting: false,
      projectileX: 0,
      projectileY: 0,
      projectileVX: 0,
      projectileVY: 0,
      projectileColor: randomColor(colorCount),
      nextBubbleColor: randomColor(colorCount),
      angleRange,
      aimLineRatio: aimLineLength / 100,
      bottomStep,
      initialRows,
    };
  }
}
