export type DinosaurSpecies =
  | 'diplodocus'
  | 'triceratops'
  | 'tyrannosaurus'
  | 'pterodactyl'
  | 'velociraptor'
  | 'stegosaurus';

export type DisplayMode = 'anatomy' | 'evolution';

export type BoneType =
  | 'skull'
  | 'neck'
  | 'torso'
  | 'forelimb'
  | 'hindlimb'
  | 'tail'
  | 'scapula'
  | 'pelvis';

export interface BoneData {
  type: BoneType;
  name: string;
  description: string;
  color: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions: {
    cylinderRadius?: number;
    cylinderHeight?: number;
    sphereRadius?: number;
    length?: number;
  };
  segments?: number;
}

export interface DinosaurData {
  id: DinosaurSpecies;
  name: string;
  period: string;
  periodStart: number;
  periodEnd: number;
  color: string;
  length: string;
  habitat: string[];
  description: string;
  pixelIcon: string;
  bones: BoneData[];
  evolutionParent: DinosaurSpecies | null;
}

export const BONE_COLORS: Record<BoneType, string> = {
  skull: '#E53935',
  neck: '#8E24AA',
  torso: '#3949AB',
  forelimb: '#43A047',
  hindlimb: '#FB8C00',
  tail: '#00ACC1',
  scapula: '#FDD835',
  pelvis: '#D81B60'
};

export const BONE_NAMES: Record<BoneType, string> = {
  skull: '头骨',
  neck: '颈椎',
  torso: '躯干',
  forelimb: '前肢',
  hindlimb: '后肢',
  tail: '尾骨',
  scapula: '肩胛骨',
  pelvis: '骨盆'
};

export const BONE_DESCRIPTIONS: Record<BoneType, string> = {
  skull: '头骨：保护脑部，容纳感觉器官',
  neck: '颈椎：连接头骨与躯干，共12节',
  torso: '躯干：支撑身体，保护内脏器官',
  forelimb: '前肢：用于行走或抓取猎物',
  hindlimb: '后肢：支撑体重，提供运动动力',
  tail: '尾骨：维持平衡，部分物种用于防御',
  scapula: '肩胛骨：连接前肢与躯干的骨骼',
  pelvis: '骨盆：连接后肢与脊柱的关键结构'
};

const makeBone = (type: BoneType, position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number }, dimensions: BoneData['dimensions'], segments = 12): BoneData => ({
  type,
  name: BONE_NAMES[type],
  description: BONE_DESCRIPTIONS[type],
  color: BONE_COLORS[type],
  position,
  rotation,
  dimensions,
  segments
});

export const DINOSAURS: Record<DinosaurSpecies, DinosaurData> = {
  diplodocus: {
    id: 'diplodocus',
    name: '梁龙',
    period: '侏罗纪晚期',
    periodStart: 155,
    periodEnd: 145,
    color: '#8BC34A',
    length: '约25-30米',
    habitat: ['森林', '沼泽', '平原'],
    description: '梁龙是已知最长的恐龙之一，具有极长的颈部和尾巴，以植物为食。它的四肢粗壮，身体呈水平姿态，是典型的蜥脚类恐龙。',
    pixelIcon: '🦕',
    evolutionParent: null,
    bones: [
      makeBone('skull', { x: 0, y: 6, z: 9 }, { x: 0, y: 0, z: 0 }, { sphereRadius: 0.6 }),
      makeBone('neck', { x: 0, y: 5.5, z: 5 }, { x: -0.15, y: 0, z: 0 }, { cylinderRadius: 0.4, cylinderHeight: 8 }),
      makeBone('torso', { x: 0, y: 4, z: -1 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 1.2, cylinderHeight: 5 }),
      makeBone('scapula', { x: 0.8, y: 5, z: 1 }, { x: 0, y: 0, z: 0.3 }, { cylinderRadius: 0.2, cylinderHeight: 2 }),
      makeBone('forelimb', { x: 1, y: 2, z: 1 }, { x: 0.2, y: 0, z: 0 }, { cylinderRadius: 0.3, cylinderHeight: 3 }),
      makeBone('pelvis', { x: 0, y: 4, z: -3 }, { x: 0, y: 0, z: 0 }, { sphereRadius: 0.8 }),
      makeBone('hindlimb', { x: 1, y: 1.5, z: -3 }, { x: 0, y: 0, z: 0.1 }, { cylinderRadius: 0.5, cylinderHeight: 3.5 }),
      makeBone('tail', { x: 0, y: 4, z: -8 }, { x: 0.1, y: 0, z: 0 }, { cylinderRadius: 0.5, cylinderHeight: 12 })
    ]
  },
  triceratops: {
    id: 'triceratops',
    name: '三角龙',
    period: '白垩纪晚期',
    periodStart: 68,
    periodEnd: 66,
    color: '#FF9800',
    length: '约8-9米',
    habitat: ['平原', '稀树草原'],
    description: '三角龙以其巨大的头盾和三只角著称，是白垩纪最著名的植食性恐龙之一。它的身体粗壮，四肢强健，用角和头盾防御掠食者。',
    pixelIcon: '🦏',
    evolutionParent: null,
    bones: [
      makeBone('skull', { x: 0, y: 3.5, z: 2.5 }, { x: 0, y: 0, z: 0 }, { sphereRadius: 1.2 }),
      makeBone('neck', { x: 0, y: 3.3, z: 0.5 }, { x: -0.3, y: 0, z: 0 }, { cylinderRadius: 0.6, cylinderHeight: 2 }),
      makeBone('torso', { x: 0, y: 3, z: -1.5 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 1.5, cylinderHeight: 4 }),
      makeBone('scapula', { x: 1, y: 3.5, z: -0.5 }, { x: 0, y: 0, z: 0.4 }, { cylinderRadius: 0.25, cylinderHeight: 2.5 }),
      makeBone('forelimb', { x: 1.2, y: 1.3, z: 0 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 0.45, cylinderHeight: 3 }),
      makeBone('pelvis', { x: 0, y: 3, z: -3.5 }, { x: 0, y: 0, z: 0 }, { sphereRadius: 1 }),
      makeBone('hindlimb', { x: 1.1, y: 1.2, z: -3.5 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 0.5, cylinderHeight: 3 }),
      makeBone('tail', { x: 0, y: 2.5, z: -5 }, { x: 0.2, y: 0, z: 0 }, { cylinderRadius: 0.3, cylinderHeight: 2.5 })
    ]
  },
  tyrannosaurus: {
    id: 'tyrannosaurus',
    name: '霸王龙',
    period: '白垩纪晚期',
    periodStart: 68,
    periodEnd: 66,
    color: '#F44336',
    length: '约12-13米',
    habitat: ['森林', '平原', '海岸'],
    description: '霸王龙是史上最大的肉食性恐龙之一，拥有强有力的双颌和锯齿状牙齿。后肢粗壮有力，前肢短小，是顶级掠食者。',
    pixelIcon: '🦖',
    evolutionParent: 'velociraptor',
    bones: [
      makeBone('skull', { x: 0, y: 4, z: 2 }, { x: -0.1, y: 0, z: 0 }, { sphereRadius: 0.9 }),
      makeBone('neck', { x: 0, y: 3.8, z: 0.5 }, { x: -0.4, y: 0, z: 0 }, { cylinderRadius: 0.5, cylinderHeight: 1.8 }),
      makeBone('torso', { x: 0, y: 3.5, z: -1.5 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 1.1, cylinderHeight: 4 }),
      makeBone('scapula', { x: 0.6, y: 3.8, z: 0 }, { x: 0, y: 0, z: 0.3 }, { cylinderRadius: 0.15, cylinderHeight: 1.5 }),
      makeBone('forelimb', { x: 0.7, y: 3, z: 0.2 }, { x: 0.5, y: 0, z: 0.1 }, { cylinderRadius: 0.12, cylinderHeight: 1 }),
      makeBone('pelvis', { x: 0, y: 3.3, z: -3.5 }, { x: 0, y: 0, z: 0 }, { sphereRadius: 0.9 }),
      makeBone('hindlimb', { x: 0.9, y: 1.3, z: -3.2 }, { x: 0, y: 0, z: -0.1 }, { cylinderRadius: 0.55, cylinderHeight: 3.8 }),
      makeBone('tail', { x: 0, y: 3, z: -6 }, { x: 0.15, y: 0, z: 0 }, { cylinderRadius: 0.35, cylinderHeight: 5 })
    ]
  },
  pterodactyl: {
    id: 'pterodactyl',
    name: '翼龙',
    period: '侏罗纪晚期',
    periodStart: 150,
    periodEnd: 145,
    color: '#2196F3',
    length: '翼展约1-8米',
    habitat: ['海岸', '湖泊', '沙漠'],
    description: '翼龙是最早能够飞行的脊椎动物之一，具有由皮肤膜构成的翅膀。它们的骨骼中空轻薄，胸骨发达，以鱼类和小型动物为食。',
    pixelIcon: '🦅',
    evolutionParent: null,
    bones: [
      makeBone('skull', { x: 0, y: 4, z: 1.5 }, { x: -0.2, y: 0, z: 0 }, { sphereRadius: 0.5 }),
      makeBone('neck', { x: 0, y: 3.7, z: 0.3 }, { x: -0.5, y: 0, z: 0 }, { cylinderRadius: 0.2, cylinderHeight: 1.2 }),
      makeBone('torso', { x: 0, y: 3.3, z: -0.8 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 0.5, cylinderHeight: 2 }),
      makeBone('scapula', { x: 1.8, y: 3.5, z: -0.5 }, { x: 0, y: 0, z: 0.8 }, { cylinderRadius: 0.15, cylinderHeight: 3.5 }),
      makeBone('forelimb', { x: 3, y: 3, z: -0.5 }, { x: 0, y: 0, z: 1.2 }, { cylinderRadius: 0.12, cylinderHeight: 4 }),
      makeBone('pelvis', { x: 0, y: 3, z: -1.8 }, { x: 0, y: 0, z: 0 }, { sphereRadius: 0.4 }),
      makeBone('hindlimb', { x: 0.4, y: 2, z: -1.8 }, { x: 0.3, y: 0, z: 0 }, { cylinderRadius: 0.15, cylinderHeight: 1.5 }),
      makeBone('tail', { x: 0, y: 2.8, z: -3 }, { x: 0.1, y: 0, z: 0 }, { cylinderRadius: 0.1, cylinderHeight: 2 })
    ]
  },
  velociraptor: {
    id: 'velociraptor',
    name: '迅猛龙',
    period: '白垩纪晚期',
    periodStart: 75,
    periodEnd: 71,
    color: '#9C27B0',
    length: '约1.5-2米',
    habitat: ['沙漠', '森林边缘'],
    description: '迅猛龙是一种体型较小但极为敏捷的肉食性恐龙，后肢第二趾有巨大的镰刀状爪，可能群居捕猎，具有较高的智力。',
    pixelIcon: '🐊',
    evolutionParent: null,
    bones: [
      makeBone('skull', { x: 0, y: 1.5, z: 0.8 }, { x: -0.1, y: 0, z: 0 }, { sphereRadius: 0.3 }),
      makeBone('neck', { x: 0, y: 1.4, z: 0.2 }, { x: -0.3, y: 0, z: 0 }, { cylinderRadius: 0.15, cylinderHeight: 0.8 }),
      makeBone('torso', { x: 0, y: 1.2, z: -0.6 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 0.35, cylinderHeight: 1.5 }),
      makeBone('scapula', { x: 0.35, y: 1.3, z: -0.2 }, { x: 0, y: 0, z: 0.4 }, { cylinderRadius: 0.08, cylinderHeight: 0.8 }),
      makeBone('forelimb', { x: 0.45, y: 0.8, z: -0.2 }, { x: 0.3, y: 0, z: 0 }, { cylinderRadius: 0.08, cylinderHeight: 0.9 }),
      makeBone('pelvis', { x: 0, y: 1.1, z: -1.4 }, { x: 0, y: 0, z: 0 }, { sphereRadius: 0.3 }),
      makeBone('hindlimb', { x: 0.4, y: 0.4, z: -1.3 }, { x: 0, y: 0, z: -0.1 }, { cylinderRadius: 0.12, cylinderHeight: 1.3 }),
      makeBone('tail', { x: 0, y: 1, z: -2.3 }, { x: 0.15, y: 0, z: 0 }, { cylinderRadius: 0.1, cylinderHeight: 1.8 })
    ]
  },
  stegosaurus: {
    id: 'stegosaurus',
    name: '剑龙',
    period: '侏罗纪晚期',
    periodStart: 155,
    periodEnd: 150,
    color: '#4CAF50',
    length: '约7-9米',
    habitat: ['森林', '平原'],
    description: '剑龙背部有两排巨大的骨质板，尾部末端有四根尖刺用于防御。它的大脑相对身体极小，以低矮植物为食。',
    pixelIcon: '🐢',
    evolutionParent: null,
    bones: [
      makeBone('skull', { x: 0, y: 2.5, z: 2.2 }, { x: -0.15, y: 0, z: 0 }, { sphereRadius: 0.5 }),
      makeBone('neck', { x: 0, y: 2.4, z: 1 }, { x: -0.35, y: 0, z: 0 }, { cylinderRadius: 0.35, cylinderHeight: 1.5 }),
      makeBone('torso', { x: 0, y: 2.5, z: -0.8 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 1, cylinderHeight: 3.5 }),
      makeBone('scapula', { x: 0.7, y: 2.8, z: 0 }, { x: 0, y: 0, z: 0.35 }, { cylinderRadius: 0.2, cylinderHeight: 1.8 }),
      makeBone('forelimb', { x: 0.9, y: 1, z: 0.3 }, { x: 0, y: 0, z: 0 }, { cylinderRadius: 0.35, cylinderHeight: 2.2 }),
      makeBone('pelvis', { x: 0, y: 2.3, z: -2.8 }, { x: 0, y: 0, z: 0 }, { sphereRadius: 0.7 }),
      makeBone('hindlimb', { x: 0.9, y: 0.9, z: -2.5 }, { x: 0, y: 0, z: 0.1 }, { cylinderRadius: 0.4, cylinderHeight: 2.5 }),
      makeBone('tail', { x: 0, y: 2, z: -5 }, { x: 0.25, y: 0, z: 0 }, { cylinderRadius: 0.25, cylinderHeight: 4.5 })
    ]
  }
};

export const DINOSAUR_LIST: DinosaurSpecies[] = [
  'diplodocus',
  'triceratops',
  'tyrannosaurus',
  'pterodactyl',
  'velociraptor',
  'stegosaurus'
];

export const GEOLOGICAL_PERIODS = [
  { name: '三叠纪', start: 250, end: 201, color: '#5D4037' },
  { name: '侏罗纪', start: 201, end: 145, color: '#2E7D32' },
  { name: '白垩纪', start: 145, end: 66, color: '#F9A825' }
];

export const TIMELINE_START = 200;
export const TIMELINE_END = 65;
