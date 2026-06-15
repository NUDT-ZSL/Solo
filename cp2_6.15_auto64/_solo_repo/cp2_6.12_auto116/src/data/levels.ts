export interface LevelConfig {
  id: number;
  name: string;
  difficulty: number;
  hint: string;
  lightSource: { x: number; y: number; angle: number };
  receiver: { x: number; y: number };
  mirrors: Array<{ x: number; y: number; angle: number; length: number; draggable: boolean }>;
  prisms: Array<{ x: number; y: number; size: number; rotation: number; draggable: boolean; refractiveIndex: number }>;
  obstacles: Array<{ x: number; y: number; width: number; height: number; draggable?: boolean }>;
}

export const levels: LevelConfig[] = [
  {
    id: 1,
    name: '初识反射',
    difficulty: 1,
    hint: '拖拽镜面进行旋转，将光线反射到绿色接收器中。提示：入射角等于反射角。',
    lightSource: { x: 150, y: 400, angle: 0 },
    receiver: { x: 1100, y: 400 },
    mirrors: [
      { x: 600, y: 400, angle: 45, length: 120, draggable: true },
    ],
    prisms: [],
    obstacles: [],
  },
  {
    id: 2,
    name: '双镜反射',
    difficulty: 2,
    hint: '使用两面镜子改变光线方向。注意每面镜子的角度，让光线绕过中间区域。',
    lightSource: { x: 120, y: 200, angle: 0 },
    receiver: { x: 1100, y: 600 },
    mirrors: [
      { x: 500, y: 200, angle: 135, length: 120, draggable: true },
      { x: 500, y: 600, angle: 45, length: 120, draggable: true },
    ],
    prisms: [],
    obstacles: [],
  },
  {
    id: 3,
    name: '绕道而行',
    difficulty: 2,
    hint: '障碍物会阻挡光线，合理安排镜面位置，让光线绕开黑色障碍。',
    lightSource: { x: 120, y: 400, angle: 0 },
    receiver: { x: 1100, y: 400 },
    mirrors: [
      { x: 400, y: 400, angle: 135, length: 120, draggable: true },
      { x: 400, y: 150, angle: 45, length: 120, draggable: true },
      { x: 850, y: 150, angle: 135, length: 120, draggable: true },
      { x: 850, y: 400, angle: 45, length: 120, draggable: true },
    ],
    prisms: [],
    obstacles: [
      { x: 550, y: 320, width: 200, height: 160 },
    ],
  },
  {
    id: 4,
    name: '棱镜分光',
    difficulty: 3,
    hint: '使用棱镜将白光分裂为红、绿、蓝三色光。调整棱镜角度，让分光击中接收器。',
    lightSource: { x: 120, y: 400, angle: 0 },
    receiver: { x: 1100, y: 300 },
    mirrors: [
      { x: 900, y: 250, angle: 120, length: 120, draggable: true },
    ],
    prisms: [
      { x: 500, y: 400, size: 140, rotation: 0, draggable: true, refractiveIndex: 1.5 },
    ],
    obstacles: [],
  },
  {
    id: 5,
    name: '终极挑战',
    difficulty: 4,
    hint: '综合运用镜面反射与棱镜折射。合理安排所有组件，让光线穿越障碍抵达终点！',
    lightSource: { x: 120, y: 150, angle: 0 },
    receiver: { x: 1100, y: 650 },
    mirrors: [
      { x: 400, y: 150, angle: 135, length: 120, draggable: true },
      { x: 400, y: 420, angle: 45, length: 120, draggable: true },
      { x: 850, y: 420, angle: 135, length: 120, draggable: true },
      { x: 850, y: 650, angle: 45, length: 120, draggable: true },
    ],
    prisms: [
      { x: 625, y: 420, size: 120, rotation: 0, draggable: true, refractiveIndex: 1.33 },
    ],
    obstacles: [
      { x: 540, y: 150, width: 170, height: 120 },
      { x: 540, y: 570, width: 170, height: 120 },
    ],
  },
];
