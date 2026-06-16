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
      svgPath: 'M -45 -45 Q -48 -70 -20 -78 Q 0 -82 20 -78 Q 48 -70 45 -45 Q 40 -55 25 -52 Q 10 -50 -10 -50 Q -25 -52 -40 -55 Q -43 -50 -45 -45 Z',
      fillColor: '#5D4037',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -55 },
      rotationRange: 2,
      expressionTags: ['neutral', 'happy']
    },
    {
      id: 'hair_curly',
      type: 'hair',
      name: '蓬松卷发',
      svgPath: 'M -50 -40 Q -60 -65 -40 -75 Q -50 -55 -35 -60 Q -25 -80 -10 -75 Q -15 -55 0 -60 Q 15 -80 25 -75 Q 35 -60 50 -70 Q 60 -50 48 -40 Q 40 -55 28 -50 Q 15 -45 0 -48 Q -15 -45 -28 -50 Q -40 -55 -50 -40 Z',
      fillColor: '#8D6E63',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -55 },
      rotationRange: 3,
      expressionTags: ['happy', 'surprised']
    },
    {
      id: 'hair_long',
      type: 'hair',
      name: '飘逸长发',
      svgPath: 'M -45 -45 Q -52 -70 -20 -78 Q 0 -82 20 -78 Q 52 -70 45 -45 L 50 30 Q 45 40 35 35 L 38 -30 Q 30 -40 20 -38 Q 10 -35 0 -36 Q -10 -35 -20 -38 Q -30 -40 -38 -30 L -35 35 Q -45 40 -50 30 L -45 -45 Z',
      fillColor: '#3E2723',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -55 },
      rotationRange: 2,
      expressionTags: ['neutral', 'sad', 'confused']
    },
    {
      id: 'hair_mohawk',
      type: 'hair',
      name: '酷炫莫霍克',
      svgPath: 'M -15 -50 Q -18 -85 -8 -90 Q 0 -95 8 -90 Q 18 -85 15 -50 Q 10 -55 0 -55 Q -10 -55 -15 -50 Z M -35 -50 Q -38 -65 -28 -68 L -28 -55 Q -30 -50 -35 -50 Z M 35 -50 Q 38 -65 28 -68 L 28 -55 Q 30 -50 35 -50 Z',
      fillColor: '#E53935',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -55 },
      rotationRange: 4,
      expressionTags: ['angry', 'surprised']
    }
  ],
  eyes: [
    {
      id: 'eyes_round',
      type: 'eyes',
      name: '圆圆眼睛',
      svgPath: 'M -20 -10 m -10 0 a 10 8 0 1 0 20 0 a 10 8 0 1 0 -20 0 M 20 -10 m -10 0 a 10 8 0 1 0 20 0 a 10 8 0 1 0 -20 0 M -23 -12 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 M 17 -12 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0',
      fillColor: '#FFFFFF',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -10 },
      rotationRange: 1,
      expressionTags: ['happy', 'surprised', 'neutral']
    },
    {
      id: 'eyes_squint',
      type: 'eyes',
      name: '眯眯笑眼',
      svgPath: 'M -30 -10 Q -20 -18 -10 -10 Q -20 -2 -30 -10 Z M 10 -10 Q 20 -18 30 -10 Q 20 -2 10 -10 Z',
      fillColor: '#212121',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -10 },
      rotationRange: 1,
      expressionTags: ['happy']
    },
    {
      id: 'eyes_angry',
      type: 'eyes',
      name: '愤怒怒目',
      svgPath: 'M -30 -15 L -10 -5 M -28 -8 L -12 -8 M 10 -5 L 30 -15 M 12 -8 L 28 -8 M -20 -5 m -8 0 a 8 6 0 1 0 16 0 a 8 6 0 1 0 -16 0 M 20 -5 m -8 0 a 8 6 0 1 0 16 0 a 8 6 0 1 0 -16 0',
      fillColor: '#FFFFFF',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -10 },
      rotationRange: 1,
      expressionTags: ['angry']
    },
    {
      id: 'eyes_teary',
      type: 'eyes',
      name: '泪汪汪眼',
      svgPath: 'M -20 -10 m -10 0 a 10 8 0 1 0 20 0 a 10 8 0 1 0 -20 0 M 20 -10 m -10 0 a 10 8 0 1 0 20 0 a 10 8 0 1 0 -20 0 M -23 -12 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 M 17 -12 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 M -25 5 Q -22 12 -18 8 Q -22 6 -25 5 Z M 25 5 Q 28 12 22 8 Q 26 6 25 5 Z',
      fillColor: '#FFFFFF',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: -10 },
      rotationRange: 1,
      expressionTags: ['sad']
    }
  ],
  mouth: [
    {
      id: 'mouth_smile',
      type: 'mouth',
      name: '甜美微笑',
      svgPath: 'M -25 15 Q 0 35 25 15 Q 0 25 -25 15 Z',
      fillColor: '#FFAB91',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 25 },
      rotationRange: 2,
      expressionTags: ['happy']
    },
    {
      id: 'mouth_laugh',
      type: 'mouth',
      name: '开怀大笑',
      svgPath: 'M -30 15 Q 0 50 30 15 Q 0 20 -30 15 Z M -15 20 Q 0 35 15 20 Q 0 28 -15 20 Z',
      fillColor: '#FF8A65',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 25 },
      rotationRange: 3,
      expressionTags: ['happy', 'surprised']
    },
    {
      id: 'mouth_frown',
      type: 'mouth',
      name: '皱眉撇嘴',
      svgPath: 'M -25 30 Q 0 10 25 30 Q 0 22 -25 30 Z',
      fillColor: '#FFAB91',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 25 },
      rotationRange: 2,
      expressionTags: ['sad', 'angry', 'confused']
    },
    {
      id: 'mouth_o',
      type: 'mouth',
      name: '惊讶O型',
      svgPath: 'M 0 25 m -15 0 a 15 18 0 1 0 30 0 a 15 18 0 1 0 -30 0 M 0 28 m -8 0 a 8 10 0 1 0 16 0 a 8 10 0 1 0 -16 0',
      fillColor: '#FF8A65',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 25 },
      rotationRange: 1,
      expressionTags: ['surprised', 'confused']
    }
  ],
  arm: [
    {
      id: 'arm_down',
      type: 'arm',
      name: '自然下垂',
      svgPath: 'M -70 0 L -85 60 M 70 0 L 85 60',
      fillColor: 'none',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 0 },
      rotationRange: 5,
      expressionTags: ['neutral', 'sad']
    },
    {
      id: 'arm_cheer',
      type: 'arm',
      name: '举手欢呼',
      svgPath: 'M -70 0 L -90 -50 M -90 -50 L -85 -65 M -90 -50 L -75 -65 M 70 0 L 90 -50 M 90 -50 L 95 -65 M 90 -50 L 85 -65',
      fillColor: 'none',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 0 },
      rotationRange: 8,
      expressionTags: ['happy', 'surprised']
    },
    {
      id: 'arm_akimbo',
      type: 'arm',
      name: '双手叉腰',
      svgPath: 'M -70 0 L -85 20 L -80 45 M -85 20 L -95 25 M 70 0 L 85 20 L 80 45 M 85 20 L 95 25',
      fillColor: 'none',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 0 },
      rotationRange: 4,
      expressionTags: ['angry', 'confused']
    },
    {
      id: 'arm_cross',
      type: 'arm',
      name: '抱胸姿势',
      svgPath: 'M -70 0 L -50 20 L -30 15 M 70 0 L 50 30 L 20 25',
      fillColor: 'none',
      strokeColor: '#212121',
      positionOffset: { x: 0, y: 0 },
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
