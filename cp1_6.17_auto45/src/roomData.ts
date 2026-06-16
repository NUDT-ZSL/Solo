import type { Item, Room, CombineRecipe } from './types';

export const ITEMS: Record<string, Item> = {
  rustyKey: {
    id: 'rustyKey',
    name: '锈蚀钥匙',
    icon: '🗝️',
    description: '一把生锈的老钥匙',
    maxStack: 3
  },
  tornNote: {
    id: 'tornNote',
    name: '撕碎的纸条',
    icon: '📜',
    description: '上面写着数字：3',
    maxStack: 3
  },
  magnetCard: {
    id: 'magnetCard',
    name: '磁卡',
    icon: '💳',
    description: '一张老旧的磁卡，似乎可以打开某些门',
    maxStack: 3
  },
  battery: {
    id: 'battery',
    name: '电池',
    icon: '🔋',
    description: '一节全新的电池',
    maxStack: 3
  },
  passwordDial: {
    id: 'passwordDial',
    name: '密码盘',
    icon: '🔢',
    description: '一个密码转盘',
    maxStack: 3
  },
  flashlight: {
    id: 'flashlight',
    name: '手电筒',
    icon: '🔦',
    description: '没有电池的手电筒',
    maxStack: 3
  },
  flashlightOn: {
    id: 'flashlightOn',
    name: '发光手电筒',
    icon: '💡',
    description: '正在发光的手电筒，可以照亮黑暗',
    maxStack: 1
  },
  bookKey: {
    id: 'bookKey',
    name: '书柜钥匙',
    icon: '🔑',
    description: '一把精致的小钥匙',
    maxStack: 3
  },
  secretNote: {
    id: 'secretNote',
    name: '神秘纸条',
    icon: '📝',
    description: '写着：密码是 7249',
    maxStack: 3
  },
  candle: {
    id: 'candle',
    name: '蜡烛',
    icon: '🕯️',
    description: '一支未点燃的蜡烛',
    maxStack: 3
  },
  matches: {
    id: 'matches',
    name: '火柴',
    icon: '🔥',
    description: '一盒火柴',
    maxStack: 3
  },
  candleLit: {
    id: 'candleLit',
    name: '点燃的蜡烛',
    icon: '🕯️',
    description: '燃烧的蜡烛，可以照亮黑暗',
    maxStack: 1
  },
  basementKey: {
    id: 'basementKey',
    name: '地下室钥匙',
    icon: '🔐',
    description: '看起来很重的钥匙',
    maxStack: 3
  },
  wireA: {
    id: 'wireA',
    name: '红色电线',
    icon: '🔴',
    description: '一根红色电线',
    maxStack: 3
  },
  wireB: {
    id: 'wireB',
    name: '蓝色电线',
    icon: '🔵',
    description: '一根蓝色电线',
    maxStack: 3
  },
  wireC: {
    id: 'wireC',
    name: '绿色电线',
    icon: '🟢',
    description: '一根绿色电线',
    maxStack: 3
  },
  controlBox: {
    id: 'controlBox',
    name: '接线盒',
    icon: '📦',
    description: '一个需要接线的控制盒',
    maxStack: 3
  },
  powerBox: {
    id: 'powerBox',
    name: '供电盒',
    icon: '⚡',
    description: '接好线的供电盒',
    maxStack: 1
  },
  atticKey: {
    id: 'atticKey',
    name: '阁楼钥匙',
    icon: '🗝️',
    description: '通往阁楼的钥匙',
    maxStack: 3
  },
  ancientMedallion: {
    id: 'ancientMedallion',
    name: '古老徽章',
    icon: '🏅',
    description: '刻有奇怪符号的徽章',
    maxStack: 3
  },
  gearA: {
    id: 'gearA',
    name: '小齿轮',
    icon: '⚙️',
    description: '一个小齿轮',
    maxStack: 3
  },
  gearB: {
    id: 'gearB',
    name: '大齿轮',
    icon: '⚙️',
    description: '一个大齿轮',
    maxStack: 3
  },
  finalKey: {
    id: 'finalKey',
    name: '最终钥匙',
    icon: '🔑',
    description: '似乎可以打开最终出口的钥匙',
    maxStack: 1
  },
  mechanismKey: {
    id: 'mechanismKey',
    name: '机关钥匙',
    icon: '🗝️',
    description: '精巧的机关钥匙',
    maxStack: 3
  }
};

export const COMBINE_RECIPES: CombineRecipe[] = [
  {
    ingredients: ['battery', 'flashlight'],
    result: ITEMS.flashlightOn,
    consumeBoth: true
  },
  {
    ingredients: ['candle', 'matches'],
    result: ITEMS.candleLit,
    consumeBoth: true
  },
  {
    ingredients: ['wireA', 'controlBox'],
    result: ITEMS.powerBox,
    consumeBoth: true
  },
  {
    ingredients: ['ancientMedallion', 'gearA'],
    result: ITEMS.finalKey,
    consumeBoth: true
  }
];

export const createInitialRooms = (): Room[] => [
  {
    id: 'livingroom',
    name: '客厅',
    description: '昏暗的客厅，窗帘紧闭，空气中弥漫着灰尘的味道...',
    theme: 'gothic',
    bgColor: '#1A1A2E',
    wallPattern: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
    floorPattern: 'repeating-linear-gradient(45deg, #2a2a3e, #2a2a3e 10px, #1e1e30 10px, #1e1e30 20px)',
    unlocked: true,
    completed: false,
    furniture: [
      { id: 'sofa', type: 'sofa', x: 100, y: 80, width: 180, height: 80, color: '#3a2a3e', label: '沙发' },
      { id: 'table', type: 'table', x: 280, y: 180, width: 120, height: 80, color: '#4a3a2a', label: '茶几' },
      { id: 'bookshelf', type: 'bookshelf', x: 500, y: 60, width: 100, height: 180, color: '#3a2a1a', label: '书架' },
      { id: 'fireplace', type: 'fireplace', x: 60, y: 320, width: 140, height: 100, color: '#2a2a3e', label: '壁炉' },
      { id: 'cabinet', type: 'cabinet', x: 480, y: 300, width: 100, height: 120, color: '#3a2a1a', label: '柜子' }
    ],
    interactiveItems: [
      { item: ITEMS.rustyKey, x: 310, y: 200, visible: true, collected: false, linkedPuzzleId: 'puzzle-lr-1' },
      { item: ITEMS.tornNote, x: 540, y: 100, visible: true, collected: false },
      { item: ITEMS.flashlight, x: 90, y: 360, visible: true, collected: false },
      { item: ITEMS.battery, x: 170, y: 110, visible: true, collected: false },
      { item: ITEMS.passwordDial, x: 520, y: 360, visible: true, collected: false, linkedPuzzleId: 'puzzle-lr-2', requiresItem: 'rustyKey' }
    ],
    puzzles: [
      {
        id: 'puzzle-lr-1',
        name: '壁炉拼图',
        type: 'jigsaw',
        solved: false,
        x: 60,
        y: 320,
        width: 140,
        height: 100,
        data: { pieces: 8, solution: [0, 1, 2, 3, 4, 5, 6, 7] },
        hint: '拼好壁炉的图案，也许能发现什么...',
        unlocksItemId: 'bookKey'
      },
      {
        id: 'puzzle-lr-2',
        name: '柜子密码锁',
        type: 'password',
        solved: false,
        x: 480,
        y: 300,
        width: 100,
        height: 120,
        data: { answer: '3847', length: 4 },
        hint: '找到所有的数字线索...'
      },
      {
        id: 'puzzle-lr-3',
        name: '书架机关',
        type: 'mechanism',
        solved: false,
        x: 500,
        y: 60,
        width: 100,
        height: 180,
        data: { steps: 3, currentStep: 0 },
        hint: '按正确的顺序拉动书籍...'
      }
    ],
    doors: [
      {
        id: 'door-study',
        x: 300,
        y: 10,
        width: 100,
        height: 50,
        targetRoomId: 'study',
        locked: true,
        requiredPuzzleIds: ['puzzle-lr-1', 'puzzle-lr-2', 'puzzle-lr-3'],
        label: '通往书房'
      },
      {
        id: 'door-basement',
        x: 10,
        y: 200,
        width: 50,
        height: 100,
        targetRoomId: 'basement',
        locked: true,
        requiredPuzzleIds: [],
        label: '通往地下室',
        isHidden: true
      }
    ]
  },
  {
    id: 'study',
    name: '书房',
    description: '古老的书房，到处都是尘封的书籍...',
    theme: 'ancient',
    bgColor: '#16213E',
    wallPattern: 'linear-gradient(135deg, #16213E 0%, #0F3460 100%)',
    floorPattern: 'repeating-linear-gradient(90deg, #2a3a4e, #2a3a4e 15px, #1e2a40 15px, #1e2a40 30px)',
    unlocked: false,
    completed: false,
    furniture: [
      { id: 'desk', type: 'desk', x: 250, y: 200, width: 200, height: 100, color: '#4a3a2a', label: '书桌' },
      { id: 'chair', type: 'chair', x: 300, y: 310, width: 80, height: 80, color: '#3a2a1a', label: '椅子' },
      { id: 'bigbookshelf1', type: 'bookshelf', x: 30, y: 50, width: 150, height: 250, color: '#3a2a1a', label: '大书架' },
      { id: 'bigbookshelf2', type: 'bookshelf', x: 470, y: 50, width: 150, height: 250, color: '#3a2a1a', label: '大书架' },
      { id: 'globe', type: 'globe', x: 100, y: 340, width: 60, height: 60, color: '#1a3a5a', label: '地球仪' }
    ],
    interactiveItems: [
      { item: ITEMS.bookKey, x: 100, y: 100, visible: false, collected: false },
      { item: ITEMS.secretNote, x: 310, y: 220, visible: true, collected: false },
      { item: ITEMS.matches, x: 530, y: 150, visible: true, collected: false },
      { item: ITEMS.candle, x: 400, y: 220, visible: true, collected: false },
      { item: ITEMS.basementKey, x: 540, y: 340, visible: true, collected: false, requiresItem: 'bookKey' }
    ],
    puzzles: [
      {
        id: 'puzzle-sd-1',
        name: '四位数密码锁',
        type: 'password',
        solved: false,
        x: 30,
        y: 50,
        width: 150,
        height: 100,
        data: { answer: '7249', length: 4 },
        hint: '神秘纸条上似乎有线索...'
      },
      {
        id: 'puzzle-sd-2',
        name: '地球仪连线',
        type: 'connect',
        solved: false,
        x: 100,
        y: 340,
        width: 60,
        height: 60,
        data: { pairs: [['a', 'b'], ['c', 'd'], ['e', 'f']] },
        hint: '连接对应的地点...'
      },
      {
        id: 'puzzle-sd-3',
        name: '多步机关',
        type: 'mechanism',
        solved: false,
        x: 470,
        y: 50,
        width: 150,
        height: 100,
        data: { steps: 4, currentStep: 0 },
        hint: '按照古籍记载的顺序...'
      }
    ],
    doors: [
      {
        id: 'door-living-back',
        x: 300,
        y: 10,
        width: 100,
        height: 50,
        targetRoomId: 'livingroom',
        locked: false,
        requiredPuzzleIds: [],
        label: '返回客厅'
      },
      {
        id: 'door-attic',
        x: 600,
        y: 200,
        width: 50,
        height: 100,
        targetRoomId: 'attic',
        locked: true,
        requiredPuzzleIds: ['puzzle-sd-1', 'puzzle-sd-2', 'puzzle-sd-3'],
        label: '通往阁楼'
      }
    ]
  },
  {
    id: 'basement',
    name: '地下室',
    description: '阴冷潮湿的地下室，几乎看不见东西...',
    theme: 'dark',
    bgColor: '#0a0a1a',
    wallPattern: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
    floorPattern: 'repeating-linear-gradient(135deg, #15152a, #15152a 12px, #0e0e20 12px, #0e0e20 24px)',
    unlocked: false,
    completed: false,
    furniture: [
      { id: 'shelf1', type: 'shelf', x: 40, y: 60, width: 80, height: 200, color: '#2a2a1a', label: '货架' },
      { id: 'shelf2', type: 'shelf', x: 520, y: 60, width: 80, height: 200, color: '#2a2a1a', label: '货架' },
      { id: 'workbench', type: 'workbench', x: 250, y: 280, width: 160, height: 80, color: '#3a3a2a', label: '工作台' },
      { id: 'barrel', type: 'barrel', x: 180, y: 120, width: 60, height: 80, color: '#4a2a1a', label: '木桶' },
      { id: 'chest', type: 'chest', x: 420, y: 130, width: 70, height: 70, color: '#3a2a1a', label: '箱子' }
    ],
    interactiveItems: [
      { item: ITEMS.wireA, x: 70, y: 100, visible: false, collected: false, requiresItem: 'flashlightOn' },
      { item: ITEMS.wireB, x: 550, y: 100, visible: false, collected: false, requiresItem: 'flashlightOn' },
      { item: ITEMS.wireC, x: 550, y: 200, visible: false, collected: false, requiresItem: 'flashlightOn' },
      { item: ITEMS.controlBox, x: 300, y: 300, visible: true, collected: false },
      { item: ITEMS.atticKey, x: 450, y: 150, visible: true, collected: false, linkedPuzzleId: 'puzzle-bs-2' }
    ],
    puzzles: [
      {
        id: 'puzzle-bs-1',
        name: '黑暗拼图',
        type: 'jigsaw',
        solved: false,
        x: 250,
        y: 280,
        width: 160,
        height: 80,
        data: { pieces: 8, solution: [0, 1, 2, 3, 4, 5, 6, 7] },
        hint: '先找到光源...'
      },
      {
        id: 'puzzle-bs-2',
        name: '箱子密码锁',
        type: 'password',
        solved: false,
        x: 420,
        y: 130,
        width: 70,
        height: 70,
        data: { answer: '1942', length: 4 },
        hint: '工作台上可能有线索...'
      },
      {
        id: 'puzzle-bs-3',
        name: '电线连接',
        type: 'connect',
        solved: false,
        x: 250,
        y: 280,
        width: 160,
        height: 80,
        data: { pairs: [['red', 'red'], ['blue', 'blue'], ['green', 'green']] },
        hint: '颜色要对应...'
      }
    ],
    doors: [
      {
        id: 'door-living-back2',
        x: 10,
        y: 200,
        width: 50,
        height: 100,
        targetRoomId: 'livingroom',
        locked: false,
        requiredPuzzleIds: [],
        label: '返回客厅'
      }
    ]
  },
  {
    id: 'attic',
    name: '阁楼',
    description: '满是灰尘的阁楼，透过天窗可以看到月光...',
    theme: 'mystic',
    bgColor: '#1a1a3a',
    wallPattern: 'linear-gradient(135deg, #1a1a3a 0%, #2a1a3e 100%)',
    floorPattern: 'repeating-linear-gradient(0deg, #2a2a4a, #2a2a4a 20px, #1e1e3a 20px, #1e1e3a 40px)',
    unlocked: false,
    completed: false,
    furniture: [
      { id: 'oldchest', type: 'chest', x: 80, y: 100, width: 100, height: 80, color: '#4a3a2a', label: '旧箱子' },
      { id: 'skylight', type: 'skylight', x: 280, y: 20, width: 120, height: 80, color: '#2a3a5a', label: '天窗' },
      { id: 'olddesk', type: 'desk', x: 400, y: 150, width: 140, height: 80, color: '#3a2a1a', label: '旧书桌' },
      { id: 'mirror', type: 'mirror', x: 200, y: 250, width: 80, height: 120, color: '#3a3a5a', label: '魔镜' },
      { id: 'mechanism', type: 'mechanism', x: 450, y: 320, width: 100, height: 80, color: '#4a4a3a', label: '神秘机关' }
    ],
    interactiveItems: [
      { item: ITEMS.ancientMedallion, x: 120, y: 120, visible: true, collected: false, linkedPuzzleId: 'puzzle-at-1' },
      { item: ITEMS.gearA, x: 440, y: 170, visible: true, collected: false },
      { item: ITEMS.gearB, x: 230, y: 290, visible: true, collected: false, requiresItem: 'candleLit' },
      { item: ITEMS.magnetCard, x: 490, y: 340, visible: true, collected: false, linkedPuzzleId: 'puzzle-at-2' },
      { item: ITEMS.mechanismKey, x: 320, y: 40, visible: true, collected: false, requiresItem: 'powerBox' }
    ],
    puzzles: [
      {
        id: 'puzzle-at-1',
        name: '箱子拼图',
        type: 'jigsaw',
        solved: false,
        x: 80,
        y: 100,
        width: 100,
        height: 80,
        data: { pieces: 8, solution: [0, 1, 2, 3, 4, 5, 6, 7] },
        hint: '拼出徽章的图案...'
      },
      {
        id: 'puzzle-at-2',
        name: '最终密码锁',
        type: 'password',
        solved: false,
        x: 450,
        y: 320,
        width: 100,
        height: 80,
        data: { answer: 'escape', length: 6 },
        hint: '字母密码...'
      },
      {
        id: 'puzzle-at-3',
        name: '复杂机关',
        type: 'mechanism',
        solved: false,
        x: 450,
        y: 320,
        width: 100,
        height: 80,
        data: { steps: 5, currentStep: 0 },
        hint: '这是最后一道机关了...'
      }
    ],
    doors: [
      {
        id: 'door-study-back',
        x: 10,
        y: 200,
        width: 50,
        height: 100,
        targetRoomId: 'study',
        locked: false,
        requiredPuzzleIds: [],
        label: '返回书房'
      },
      {
        id: 'door-exit',
        x: 600,
        y: 200,
        width: 50,
        height: 100,
        targetRoomId: 'exit',
        locked: true,
        requiredPuzzleIds: ['puzzle-at-1', 'puzzle-at-2', 'puzzle-at-3'],
        label: '最终出口'
      }
    ]
  }
];
