export type ToolType = 'brush' | 'pickaxe';

export interface BoneCell {
  row: number;
  col: number;
}

export interface Bone {
  id: string;
  name: string;
  cells: BoneCell[];
  restFrameX: number;
  restFrameY: number;
  restFrameWidth: number;
  restFrameHeight: number;
  depth: number;
  isExcavated: boolean;
  isPlaced: boolean;
  excavateProgress: number;
  color: string;
  shapePaths: number[][];
}

export interface GridCell {
  row: number;
  col: number;
  dirtThickness: number;
  dirtRemaining: number;
  boneId: string | null;
  isRevealed: boolean;
  revealProgress: number;
  crackLevel: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'dust' | 'crack' | 'confetti' | 'ambient';
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

export const GRID_SIZE = 8;
export const MAX_DIRT_THICKNESS = 5;
export const BRUSH_POWER = 1;
export const PICKAXE_POWER = 3;

export const DIRT_COLORS = [
  '#A08060',
  '#8F704C',
  '#7D5A3C',
  '#6B4423',
  '#5A3518',
];

export const BONE_COLOR = '#E8DCC8';
export const BONE_SHADOW = '#C4B49A';
export const BONE_HIGHLIGHT = '#F5EFE0';

export const DIRT_COLOR_LIGHT = '#B09070';
export const DIRT_COLOR_DARK = '#5A3518';
export const SURFACE_COLOR = '#8B7355';

export const THEME = {
  bg: '#2C1E14',
  bgLight: '#3D2B1E',
  panel: 'rgba(245, 230, 200, 0.12)',
  panelBorder: 'rgba(139, 105, 20, 0.4)',
  copper: '#8B6914',
  copperLight: '#B8941E',
  copperDark: '#6B5010',
  text: '#F5E6C8',
  textMuted: '#A08060',
  cream: '#F5E6C8',
  brown: '#5C3D2E',
  glow: 'rgba(255, 215, 100, 0.6)',
};

const skullShape = [
  [0, 0, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1],
  [0, 1, 0, 0, 1, 0],
  [0, 0, 1, 1, 0, 0],
];

const neckShape = [
  [0, 0, 1, 1, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 0],
];

const spineShape = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
];

const ribsShape = [
  [0, 1, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 0, 0],
];

const leftArmShape = [
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 1],
];

const rightArmShape = [
  [0, 1],
  [1, 1],
  [1, 0],
  [1, 0],
];

const leftLegShape = [
  [1, 0],
  [1, 1],
  [1, 0],
  [1, 0],
  [0, 1],
];

const rightLegShape = [
  [0, 1],
  [1, 1],
  [0, 1],
  [0, 1],
  [1, 0],
];

const tailShape = [
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 0, 0, 0, 1, 1, 1],
];

export const DINOSAUR_BONES: Omit<Bone, 'isExcavated' | 'isPlaced' | 'excavateProgress'>[] = [
  {
    id: 'skull',
    name: '头骨',
    cells: [{ row: 0, col: 3 }, { row: 0, col: 4 }],
    restFrameX: 20,
    restFrameY: 10,
    restFrameWidth: 60,
    restFrameHeight: 50,
    depth: 2,
    color: '#E8DCC8',
    shapePaths: skullShape,
  },
  {
    id: 'neck',
    name: '颈椎',
    cells: [{ row: 1, col: 3 }, { row: 1, col: 4 }],
    restFrameX: 30,
    restFrameY: 60,
    restFrameWidth: 40,
    restFrameHeight: 30,
    depth: 2,
    color: '#E0D4BE',
    shapePaths: neckShape,
  },
  {
    id: 'spine',
    name: '脊柱',
    cells: [
      { row: 2, col: 2 }, { row: 2, col: 3 },
      { row: 2, col: 4 }, { row: 2, col: 5 },
      { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 4 },
    ],
    restFrameX: 10,
    restFrameY: 90,
    restFrameWidth: 80,
    restFrameHeight: 20,
    depth: 3,
    color: '#D8CCB0',
    shapePaths: spineShape,
  },
  {
    id: 'ribs',
    name: '肋骨',
    cells: [
      { row: 3, col: 4 }, { row: 4, col: 2 },
      { row: 4, col: 3 }, { row: 5, col: 3 },
    ],
    restFrameX: 15,
    restFrameY: 110,
    restFrameWidth: 70,
    restFrameHeight: 40,
    depth: 3,
    color: '#DDD0B8',
    shapePaths: ribsShape,
  },
  {
    id: 'leftArm',
    name: '左前肢',
    cells: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 4, col: 0 }],
    restFrameX: 0,
    restFrameY: 95,
    restFrameWidth: 20,
    restFrameHeight: 40,
    depth: 2,
    color: '#E4D8C2',
    shapePaths: leftArmShape,
  },
  {
    id: 'rightArm',
    name: '右前肢',
    cells: [{ row: 2, col: 6 }, { row: 3, col: 6 }, { row: 3, col: 7 }],
    restFrameX: 80,
    restFrameY: 95,
    restFrameWidth: 20,
    restFrameHeight: 40,
    depth: 2,
    color: '#E4D8C2',
    shapePaths: rightArmShape,
  },
  {
    id: 'leftLeg',
    name: '左后肢',
    cells: [
      { row: 5, col: 1 }, { row: 5, col: 2 },
      { row: 6, col: 1 }, { row: 6, col: 2 },
    ],
    restFrameX: 10,
    restFrameY: 150,
    restFrameWidth: 25,
    restFrameHeight: 50,
    depth: 4,
    color: '#DCD0B4',
    shapePaths: leftLegShape,
  },
  {
    id: 'rightLeg',
    name: '右后肢',
    cells: [
      { row: 5, col: 5 }, { row: 5, col: 6 },
      { row: 6, col: 5 }, { row: 6, col: 6 },
    ],
    restFrameX: 65,
    restFrameY: 150,
    restFrameWidth: 25,
    restFrameHeight: 50,
    depth: 4,
    color: '#DCD0B4',
    shapePaths: rightLegShape,
  },
  {
    id: 'tail',
    name: '尾巴',
    cells: [
      { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 },
      { row: 7, col: 4 }, { row: 7, col: 5 },
    ],
    restFrameX: 10,
    restFrameY: 200,
    restFrameWidth: 80,
    restFrameHeight: 30,
    depth: 3,
    color: '#D4C8AC',
    shapePaths: tailShape,
  },
];

export function createInitialGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push({
        row: r,
        col: c,
        dirtThickness: 0,
        dirtRemaining: 0,
        boneId: null,
        isRevealed: false,
        revealProgress: 0,
        crackLevel: 0,
      });
    }
    grid.push(row);
  }

  const boneMap = new Map<string, string>();
  for (const bone of DINOSAUR_BONES) {
    for (const cell of bone.cells) {
      boneMap.set(`${cell.row},${cell.col}`, bone.id);
    }
  }

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const key = `${r},${c}`;
      const boneId = boneMap.get(key) ?? null;
      const baseThickness = boneId ? boneId === 'skull' || boneId === 'neck' ? 2 : boneId === 'leftLeg' || boneId === 'rightLeg' ? 4 : 3 : Math.floor(Math.random() * 3) + 1;
      grid[r][c].dirtThickness = baseThickness;
      grid[r][c].dirtRemaining = baseThickness;
      grid[r][c].boneId = boneId;
    }
  }

  return grid;
}
