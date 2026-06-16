export type PartType = 'hair' | 'eyes' | 'mouth' | 'arm';

export type ExpressionTag = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'confused';

export type MoodLevel = 'angry' | 'sad' | 'happy' | 'surprised';

export interface PartConfig {
  id: string;
  type: PartType;
  name: string;
  svgPath: string;
  fillColor: string;
  strokeColor: string;
  positionOffset: { x: number; y: number };
  rotationRange: number;
  expressionTags: ExpressionTag[];
  strokeWidth?: string;
}

export interface PartsCollection {
  hair: PartConfig[];
  eyes: PartConfig[];
  mouth: PartConfig[];
  arm: PartConfig[];
}

export interface SelectedParts {
  hair: string;
  eyes: string;
  mouth: string;
  arm: string;
}

export interface ExpressionResult {
  type: ExpressionTag;
  emoji: string;
  cssClass: string;
  label: string;
}

export const PARTS: PartsCollection = {
  hair: [
    {
      id: 'hair_short',
      type: 'hair',
      name: '清爽短发',
      svgPath: 'M -50 0 Q -55 -25 -25 -33 Q 0 -38 25 -33 Q 55 -25 50 0 Q 42 -12 28 -8 Q 12 -5 -12 -5 Q -28 -8 -42 -12 Q -48 -6 -50 0 Z',
      fillColor: '#5D4037',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -45 },
      rotationRange: 2,
      expressionTags: ['neutral', 'happy']
    },
    {
      id: 'hair_curly',
      type: 'hair',
      name: '蓬松卷发',
      svgPath: 'M -55 5 Q -65 -20 -42 -30 Q -55 -8 -40 -12 Q -28 -38 -12 -32 Q -18 -8 0 -13 Q 12 -38 28 -32 Q 40 -8 55 -22 Q 65 0 53 10 Q 45 -10 30 -6 Q 15 -2 0 -4 Q -15 -2 -30 -6 Q -45 -10 -55 5 Z',
      fillColor: '#8D6E63',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -45 },
      rotationRange: 3,
      expressionTags: ['happy', 'surprised']
    },
    {
      id: 'hair_long',
      type: 'hair',
      name: '飘逸长发',
      svgPath: 'M -50 0 Q -58 -28 -22 -36 Q 0 -40 22 -36 Q 58 -28 50 0 L 55 75 Q 50 85 40 80 L 42 -25 Q 32 -35 22 -32 Q 10 -30 0 -31 Q -10 -30 -22 -32 Q -32 -35 -42 -25 L -40 80 Q -50 85 -55 75 L -50 0 Z',
      fillColor: '#3E2723',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -45 },
      rotationRange: 2,
      expressionTags: ['neutral', 'sad', 'confused']
    },
    {
      id: 'hair_mohawk',
      type: 'hair',
      name: '酷炫莫霍克',
      svgPath: 'M -18 -5 Q -22 -45 -10 -52 Q 0 -58 10 -52 Q 22 -45 18 -5 Q 12 -12 0 -12 Q -12 -12 -18 -5 Z M -40 -5 Q -42 -25 -30 -28 L -30 -12 Q -32 -6 -40 -5 Z M 40 -5 Q 42 -25 30 -28 L 30 -12 Q 32 -6 40 -5 Z',
      fillColor: '#E53935',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -45 },
      rotationRange: 4,
      expressionTags: ['angry', 'surprised']
    }
  ],
  eyes: [
    {
      id: 'eyes_round',
      type: 'eyes',
      name: '圆圆眼睛',
      svgPath: 'M -18 0 m -8 0 a 8 7 0 1 0 16 0 a 8 7 0 1 0 -16 0 M 18 0 m -8 0 a 8 7 0 1 0 16 0 a 8 7 0 1 0 -16 0 M -20 -1 m -2 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0 M 16 -1 m -2 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0',
      fillColor: '#FFFFFF',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -15 },
      rotationRange: 1,
      expressionTags: ['happy', 'surprised', 'neutral']
    },
    {
      id: 'eyes_squint',
      type: 'eyes',
      name: '眯眯笑眼',
      svgPath: 'M -28 0 Q -18 -8 -8 0 Q -18 8 -28 0 Z M 8 0 Q 18 -8 28 0 Q 18 8 8 0 Z',
      fillColor: '#212121',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -15 },
      rotationRange: 1,
      expressionTags: ['happy']
    },
    {
      id: 'eyes_angry',
      type: 'eyes',
      name: '愤怒怒目',
      svgPath: 'M -28 -6 L -8 5 M -26 0 L -10 0 M 8 5 L 28 -6 M 10 0 L 26 0 M -18 5 m -7 0 a 7 5.5 0 1 0 14 0 a 7 5.5 0 1 0 -14 0 M 18 5 m -7 0 a 7 5.5 0 1 0 14 0 a 7 5.5 0 1 0 -14 0',
      fillColor: '#FFFFFF',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -15 },
      rotationRange: 1,
      expressionTags: ['angry']
    },
    {
      id: 'eyes_teary',
      type: 'eyes',
      name: '泪汪汪眼',
      svgPath: 'M -18 0 m -8 0 a 8 7 0 1 0 16 0 a 8 7 0 1 0 -16 0 M 18 0 m -8 0 a 8 7 0 1 0 16 0 a 8 7 0 1 0 -16 0 M -20 -1 m -2 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0 M 16 -1 m -2 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0 M -22 12 Q -19 18 -16 15 Q -19 13 -22 12 Z M 22 12 Q 25 18 20 15 Q 23 13 22 12 Z',
      fillColor: '#FFFFFF',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -15 },
      rotationRange: 1,
      expressionTags: ['sad']
    }
  ],
  mouth: [
    {
      id: 'mouth_smile',
      type: 'mouth',
      name: '甜美微笑',
      svgPath: 'M -22 0 Q 0 22 22 0 Q 0 12 -22 0 Z',
      fillColor: '#FFAB91',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 18 },
      rotationRange: 2,
      expressionTags: ['happy']
    },
    {
      id: 'mouth_laugh',
      type: 'mouth',
      name: '开怀大笑',
      svgPath: 'M -26 0 Q 0 38 26 0 Q 0 10 -26 0 Z M -14 5 Q 0 22 14 5 Q 0 15 -14 5 Z',
      fillColor: '#FF8A65',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 18 },
      rotationRange: 3,
      expressionTags: ['happy', 'surprised']
    },
    {
      id: 'mouth_frown',
      type: 'mouth',
      name: '皱眉撇嘴',
      svgPath: 'M -22 18 Q 0 -5 22 18 Q 0 10 -22 18 Z',
      fillColor: '#FFAB91',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 18 },
      rotationRange: 2,
      expressionTags: ['sad', 'angry', 'confused']
    },
    {
      id: 'mouth_o',
      type: 'mouth',
      name: '惊讶O型',
      svgPath: 'M 0 8 m -12 0 a 12 15 0 1 0 24 0 a 12 15 0 1 0 -24 0 M 0 11 m -7 0 a 7 8 0 1 0 14 0 a 7 8 0 1 0 -14 0',
      fillColor: '#FF8A65',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 18 },
      rotationRange: 1,
      expressionTags: ['surprised', 'confused']
    }
  ],
  arm: [
    {
      id: 'arm_down',
      type: 'arm',
      name: '自然下垂',
      svgPath: 'M -35 0 L -45 70 M 35 0 L 45 70',
      fillColor: 'none',
      strokeColor: '#212121',
      strokeWidth: '3',
      positionOffset: { x: 0, y: 60 },
      rotationRange: 5,
      expressionTags: ['neutral', 'sad']
    },
    {
      id: 'arm_cheer',
      type: 'arm',
      name: '举手欢呼',
      svgPath: 'M -35 0 L -55 -60 M -55 -60 L -52 -75 M -55 -60 L -43 -75 M 35 0 L 55 -60 M 55 -60 L 58 -75 M 55 -60 L 52 -75',
      fillColor: 'none',
      strokeColor: '#212121',
      strokeWidth: '3',
      positionOffset: { x: 0, y: 60 },
      rotationRange: 8,
      expressionTags: ['happy', 'surprised']
    },
    {
      id: 'arm_akimbo',
      type: 'arm',
      name: '双手叉腰',
      svgPath: 'M -35 0 L -52 22 L -48 50 M -52 22 L -63 27 M 35 0 L 52 22 L 48 50 M 52 22 L 63 27',
      fillColor: 'none',
      strokeColor: '#212121',
      strokeWidth: '3',
      positionOffset: { x: 0, y: 60 },
      rotationRange: 4,
      expressionTags: ['angry', 'confused']
    },
    {
      id: 'arm_cross',
      type: 'arm',
      name: '抱胸姿势',
      svgPath: 'M -35 0 L -10 25 L 15 18 M 35 0 L 12 38 L -20 32',
      fillColor: 'none',
      strokeColor: '#212121',
      strokeWidth: '3',
      positionOffset: { x: 0, y: 60 },
      rotationRange: 3,
      expressionTags: ['angry', 'neutral', 'confused']
    }
  ]
};

export const MOOD_PRESETS: Record<MoodLevel, SelectedParts> = {
  happy: {
    hair: 'hair_curly',
    eyes: 'eyes_squint',
    mouth: 'mouth_laugh',
    arm: 'arm_cheer'
  },
  sad: {
    hair: 'hair_long',
    eyes: 'eyes_teary',
    mouth: 'mouth_frown',
    arm: 'arm_down'
  },
  angry: {
    hair: 'hair_mohawk',
    eyes: 'eyes_angry',
    mouth: 'mouth_frown',
    arm: 'arm_akimbo'
  },
  surprised: {
    hair: 'hair_curly',
    eyes: 'eyes_round',
    mouth: 'mouth_o',
    arm: 'arm_cheer'
  }
};

export const DEFAULT_PARTS: SelectedParts = {
  hair: 'hair_short',
  eyes: 'eyes_round',
  mouth: 'mouth_smile',
  arm: 'arm_down'
};
