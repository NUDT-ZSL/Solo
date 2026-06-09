export type CellType = 'empty' | 'start' | 'end' | 'obstacle';

export interface LevelData {
  id: number;
  name: string;
  grid: CellType[][];
  startX: number;
  startY: number;
  startDir: number;
  endX: number;
  endY: number;
}

export const GRID_SIZE = 8;
export const CELL_SIZE = 50;

export class LevelManager {
  private levels: LevelData[];
  private currentLevelIndex: number;
  private completedLevels: boolean[];

  constructor() {
    this.levels = this.createLevels();
    this.currentLevelIndex = 0;
    this.completedLevels = new Array(this.levels.length).fill(false);
  }

  private createEmptyGrid(): CellType[][] {
    return Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => 'empty' as CellType)
    );
  }

  private createLevels(): LevelData[] {
    const levels: LevelData[] = [];

    const l1 = this.createEmptyGrid();
    l1[3][1] = 'start';
    l1[3][5] = 'end';
    levels.push({
      id: 1,
      name: '第一关：直线前进',
      grid: l1,
      startX: 1,
      startY: 3,
      startDir: 0,
      endX: 5,
      endY: 3
    });

    const l2 = this.createEmptyGrid();
    l2[2][1] = 'start';
    l2[5][4] = 'end';
    l2[2][4] = 'obstacle';
    l2[3][4] = 'obstacle';
    levels.push({
      id: 2,
      name: '第二关：学会转弯',
      grid: l2,
      startX: 1,
      startY: 2,
      startDir: 0,
      endX: 4,
      endY: 5
    });

    const l3 = this.createEmptyGrid();
    l3[1][1] = 'start';
    l3[1][6] = 'end';
    l3[1][3] = 'obstacle';
    l3[3][1] = 'obstacle';
    l3[3][2] = 'obstacle';
    l3[3][3] = 'obstacle';
    l3[3][4] = 'obstacle';
    l3[3][5] = 'obstacle';
    levels.push({
      id: 3,
      name: '第三关：绕开障碍',
      grid: l3,
      startX: 1,
      startY: 1,
      startDir: 0,
      endX: 6,
      endY: 1
    });

    const l4 = this.createEmptyGrid();
    l4[6][1] = 'start';
    l4[1][1] = 'end';
    l4[4][1] = 'obstacle';
    l4[4][2] = 'obstacle';
    l4[4][3] = 'obstacle';
    l4[3][3] = 'obstacle';
    l4[2][3] = 'obstacle';
    levels.push({
      id: 4,
      name: '第四关：复杂路径',
      grid: l4,
      startX: 1,
      startY: 6,
      startDir: 3,
      endX: 1,
      endY: 1
    });

    const l5 = this.createEmptyGrid();
    l5[6][0] = 'start';
    l5[1][7] = 'end';
    l5[5][2] = 'obstacle';
    l5[4][2] = 'obstacle';
    l5[3][2] = 'obstacle';
    l5[3][3] = 'obstacle';
    l5[3][4] = 'obstacle';
    l5[2][4] = 'obstacle';
    l5[2][5] = 'obstacle';
    l5[4][5] = 'obstacle';
    l5[5][5] = 'obstacle';
    l5[5][6] = 'obstacle';
    levels.push({
      id: 5,
      name: '第五关：终极挑战',
      grid: l5,
      startX: 0,
      startY: 6,
      startDir: 0,
      endX: 7,
      endY: 1
    });

    return levels;
  }

  getCurrentLevel(): LevelData {
    return this.levels[this.currentLevelIndex];
  }

  getCurrentLevelIndex(): number {
    return this.currentLevelIndex;
  }

  getTotalLevels(): number {
    return this.levels.length;
  }

  getCompletedLevels(): boolean[] {
    return [...this.completedLevels];
  }

  isObstacle(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      return true;
    }
    const level = this.getCurrentLevel();
    return level.grid[y][x] === 'obstacle';
  }

  isEnd(x: number, y: number): boolean {
    const level = this.getCurrentLevel();
    return x === level.endX && y === level.endY;
  }

  completeLevel(): boolean {
    this.completedLevels[this.currentLevelIndex] = true;
    if (this.currentLevelIndex < this.levels.length - 1) {
      this.currentLevelIndex++;
      return true;
    }
    return false;
  }

  resetToLevel(index: number): void {
    if (index >= 0 && index < this.levels.length) {
      this.currentLevelIndex = index;
    }
  }

  isAllCompleted(): boolean {
    return this.completedLevels.every(c => c);
  }
}
