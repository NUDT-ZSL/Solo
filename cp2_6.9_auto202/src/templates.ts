export interface Point {
  x: number;
  y: number;
}

export interface FoldStep {
  cornerIndex: number;
  targetPoint: Point;
  foldLine: [Point, Point];
  description: string;
}

export interface OrigamiTemplate {
  id: string;
  name: string;
  achievementText: string;
  icon: string;
  steps: FoldStep[];
  finalShape: Point[];
}

const CENTER = { x: 320, y: 320 };
const PAPER_SIZE = 160;
const HALF = PAPER_SIZE / 2;

const TOP_LEFT = { x: CENTER.x - HALF, y: CENTER.y - HALF };
const TOP_RIGHT = { x: CENTER.x + HALF, y: CENTER.y - HALF };
const BOTTOM_LEFT = { x: CENTER.x - HALF, y: CENTER.y + HALF };
const BOTTOM_RIGHT = { x: CENTER.x + HALF, y: CENTER.y + HALF };

export const TEMPLATES: OrigamiTemplate[] = [
  {
    id: 'swan',
    name: '天鹅',
    achievementText: '完成！天鹅展翅',
    icon: `<svg viewBox="0 0 24 24"><path d="M12 2C9.5 2 8 4 8 6c0 1.5 1 2.5 2 3l-2 4c-1 2 1 4 3 3l1-1 2 1 2-1 1 1c2 1 4-1 3-3l-2-4c1-.5 2-1.5 2-3 0-2-1.5-4-4-4h-3zm0 2c1.5 0 2 1 2 2s-.5 2-2 2-2-1-2-2 .5-2 2-2z"/></svg>`,
    steps: [
      {
        cornerIndex: 0,
        targetPoint: CENTER,
        foldLine: [TOP_LEFT, BOTTOM_RIGHT],
        description: '将左上角折向中心'
      },
      {
        cornerIndex: 1,
        targetPoint: CENTER,
        foldLine: [TOP_RIGHT, BOTTOM_LEFT],
        description: '将右上角折向中心'
      },
      {
        cornerIndex: 3,
        targetPoint: { x: CENTER.x, y: CENTER.y - HALF },
        foldLine: [{ x: CENTER.x - HALF, y: CENTER.y + HALF }, { x: CENTER.x + HALF, y: CENTER.y + HALF }],
        description: '将下角向上折'
      }
    ],
    finalShape: [
      { x: CENTER.x - 20, y: CENTER.y - HALF },
      { x: CENTER.x + 20, y: CENTER.y - HALF },
      { x: CENTER.x, y: CENTER.y - HALF - 40 },
      { x: CENTER.x + 40, y: CENTER.y },
      { x: CENTER.x, y: CENTER.y + HALF },
      { x: CENTER.x - 40, y: CENTER.y }
    ]
  },
  {
    id: 'frog',
    name: '青蛙',
    achievementText: '完成！青蛙跳跃',
    icon: `<svg viewBox="0 0 24 24"><path d="M3 11c0-2.5 2-4.5 4.5-4.5S12 8.5 12 11v.5l3-2 3 2V11c0-2.5 2-4.5 4.5-4.5S27 8.5 27 11s-2 4.5-4.5 4.5H21l-1.5 3h-9L9 15.5H7.5C5 15.5 3 13.5 3 11zm4 0c.5 0 1-.5 1-1s-.5-1-1-1-1 .5-1 1 .5 1 1 1zm10 0c.5 0 1-.5 1-1s-.5-1-1-1-1 .5-1 1 .5 1 1 1z"/></svg>`,
    steps: [
      {
        cornerIndex: 2,
        targetPoint: CENTER,
        foldLine: [BOTTOM_LEFT, TOP_RIGHT],
        description: '将左下角折向中心'
      },
      {
        cornerIndex: 3,
        targetPoint: CENTER,
        foldLine: [BOTTOM_RIGHT, TOP_LEFT],
        description: '将右下角折向中心'
      },
      {
        cornerIndex: 1,
        targetPoint: { x: CENTER.x, y: CENTER.y + HALF },
        foldLine: [{ x: CENTER.x - HALF, y: CENTER.y - HALF }, { x: CENTER.x + HALF, y: CENTER.y - HALF }],
        description: '将上角向下折'
      }
    ],
    finalShape: [
      { x: CENTER.x - HALF, y: CENTER.y },
      { x: CENTER.x, y: CENTER.y - HALF },
      { x: CENTER.x + HALF, y: CENTER.y },
      { x: CENTER.x + 30, y: CENTER.y + HALF },
      { x: CENTER.x - 30, y: CENTER.y + HALF }
    ]
  },
  {
    id: 'lily',
    name: '百合花',
    achievementText: '完成！百合绽放',
    icon: `<svg viewBox="0 0 24 24"><path d="M12 2L8 8l-6 2 6 2 4 6 4-6 6-2-6-2-4-6zm0 4l2 3-2 3-2-3 2-3z"/></svg>`,
    steps: [
      {
        cornerIndex: 0,
        targetPoint: CENTER,
        foldLine: [TOP_LEFT, BOTTOM_RIGHT],
        description: '将左上角折向中心'
      },
      {
        cornerIndex: 1,
        targetPoint: CENTER,
        foldLine: [TOP_RIGHT, BOTTOM_LEFT],
        description: '将右上角折向中心'
      },
      {
        cornerIndex: 2,
        targetPoint: CENTER,
        foldLine: [BOTTOM_LEFT, TOP_RIGHT],
        description: '将四个角都折向中心'
      }
    ],
    finalShape: [
      { x: CENTER.x, y: CENTER.y - HALF },
      { x: CENTER.x + HALF, y: CENTER.y },
      { x: CENTER.x, y: CENTER.y + HALF },
      { x: CENTER.x - HALF, y: CENTER.y }
    ]
  },
  {
    id: 'crane',
    name: '纸鹤',
    achievementText: '完成！纸鹤飞翔',
    icon: `<svg viewBox="0 0 24 24"><path d="M12 2L2 14l4 2 2 4h2l2-3 2 3h2l2-4 4-2L12 2zm0 4l6 6-2 2-4-4-4 4-2-2 6-6z"/></svg>`,
    steps: [
      {
        cornerIndex: 0,
        targetPoint: BOTTOM_RIGHT,
        foldLine: [TOP_RIGHT, BOTTOM_LEFT],
        description: '沿对角线对折'
      },
      {
        cornerIndex: 3,
        targetPoint: { x: CENTER.x - HALF, y: CENTER.y },
        foldLine: [CENTER, { x: CENTER.x + HALF, y: CENTER.y - HALF }],
        description: '将右角折向左'
      },
      {
        cornerIndex: 2,
        targetPoint: { x: CENTER.x + HALF, y: CENTER.y - HALF },
        foldLine: [CENTER, { x: CENTER.x - HALF, y: CENTER.y + HALF }],
        description: '折出翅膀形状'
      }
    ],
    finalShape: [
      { x: CENTER.x - HALF, y: CENTER.y - HALF },
      { x: CENTER.x + HALF, y: CENTER.y - HALF },
      { x: CENTER.x + 20, y: CENTER.y + 20 },
      { x: CENTER.x, y: CENTER.y + HALF },
      { x: CENTER.x - 20, y: CENTER.y + 20 }
    ]
  },
  {
    id: 'rabbit',
    name: '兔子',
    achievementText: '完成！兔子蹦跳',
    icon: `<svg viewBox="0 0 24 24"><path d="M13 2C11 2 9 4 9 6c0 1 .5 2 1 3l-2 2c-1 1-1 3 1 4l2 1-1 2h6l-1-2 2-1c2-1 2-3 1-4l-2-2c.5-1 1-2 1-3 0-2-2-4-4-4h-1zm-1 2c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z"/></svg>`,
    steps: [
      {
        cornerIndex: 0,
        targetPoint: CENTER,
        foldLine: [TOP_LEFT, BOTTOM_RIGHT],
        description: '将左上角折向中心'
      },
      {
        cornerIndex: 2,
        targetPoint: CENTER,
        foldLine: [BOTTOM_LEFT, TOP_RIGHT],
        description: '将左下角折向中心'
      },
      {
        cornerIndex: 1,
        targetPoint: { x: CENTER.x, y: CENTER.y + HALF },
        foldLine: [TOP_LEFT, TOP_RIGHT],
        description: '将顶部向下折出耳朵'
      }
    ],
    finalShape: [
      { x: CENTER.x - 25, y: CENTER.y - HALF - 20 },
      { x: CENTER.x + 25, y: CENTER.y - HALF - 20 },
      { x: CENTER.x + HALF, y: CENTER.y },
      { x: CENTER.x, y: CENTER.y + HALF },
      { x: CENTER.x - HALF, y: CENTER.y }
    ]
  },
  {
    id: 'boat',
    name: '帆船',
    achievementText: '完成！帆船远航',
    icon: `<svg viewBox="0 0 24 24"><path d="M3 18h18l-2 2H5l-2-2zm3-4l6-10v10H6zm9 0l-6-10v10h6z"/></svg>`,
    steps: [
      {
        cornerIndex: 0,
        targetPoint: BOTTOM_LEFT,
        foldLine: [TOP_LEFT, BOTTOM_LEFT],
        description: '沿左边对折'
      },
      {
        cornerIndex: 1,
        targetPoint: { x: CENTER.x - HALF, y: CENTER.y },
        foldLine: [{ x: CENTER.x + HALF, y: CENTER.y - HALF }, CENTER],
        description: '将右上角折向左下角'
      },
      {
        cornerIndex: 3,
        targetPoint: { x: CENTER.x - HALF, y: CENTER.y - HALF },
        foldLine: [CENTER, BOTTOM_RIGHT],
        description: '折出船帆形状'
      }
    ],
    finalShape: [
      { x: CENTER.x - HALF, y: CENTER.y - HALF },
      { x: CENTER.x - HALF, y: CENTER.y + HALF },
      { x: CENTER.x + HALF, y: CENTER.y + HALF },
      { x: CENTER.x, y: CENTER.y - HALF }
    ]
  }
];

export const PAPER_COLORS = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6'];

export { CENTER, PAPER_SIZE, HALF, TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_RIGHT };
