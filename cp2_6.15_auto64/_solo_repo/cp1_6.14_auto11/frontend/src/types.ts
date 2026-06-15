export interface CreaseLine {
  id: string;
  start: [number, number];
  end: [number, number];
  type: 'mountain' | 'valley';
  angle: number;
}

export interface CreasePattern {
  lines: CreaseLine[];
  vertices: [number, number][];
}

export interface FoldStep {
  creaseLineId: string;
  targetAngle: number;
  currentAngle: number;
  timestamp: number;
}

export interface OrigamiModel {
  id: string;
  name: string;
  steps: FoldStep[];
  creasePattern: CreasePattern;
  createdAt: number;
  updatedAt: number;
}

export interface FoldState {
  currentStep: number;
  totalSteps: number;
  angles: Map<string, number>;
  isAnimating: boolean;
}

export interface PresetMode {
  id: string;
  name: string;
  creaseLines: CreaseLine[];
  foldOrder: string[];
}

export interface PaperVertex {
  index: number;
  originalPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  foldSide: 'left' | 'right' | 'on';
}

export interface PaperSegment {
  id: string;
  vertices: number[];
  layer: number;
}

export type PaperColor = string | 'rainbow' | 'texture';

export interface AnimationState {
  isPlaying: boolean;
  startTime: number;
  duration: number;
  startAngles: Map<string, number>;
  targetAngles: Map<string, number>;
  onComplete?: () => void;
}

export const EASING_FUNCTIONS = {
  easeInOutCubic: (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  linear: (t: number): number => t
};

export const PRESET_MODES: PresetMode[] = [
  {
    id: 'horizontal',
    name: '横对折',
    creaseLines: [
      {
        id: 'h1',
        start: [-1, 0],
        end: [1, 0],
        type: 'valley',
        angle: 0
      }
    ],
    foldOrder: ['h1']
  },
  {
    id: 'vertical',
    name: '竖对折',
    creaseLines: [
      {
        id: 'v1',
        start: [0, -1],
        end: [0, 1],
        type: 'valley',
        angle: 0
      }
    ],
    foldOrder: ['v1']
  },
  {
    id: 'diagonal1',
    name: '对角折1',
    creaseLines: [
      {
        id: 'd1',
        start: [-1, -1],
        end: [1, 1],
        type: 'valley',
        angle: 0
      }
    ],
    foldOrder: ['d1']
  },
  {
    id: 'diagonal2',
    name: '对角折2',
    creaseLines: [
      {
        id: 'd2',
        start: [-1, 1],
        end: [1, -1],
        type: 'valley',
        angle: 0
      }
    ],
    foldOrder: ['d2']
  },
  {
    id: 'waterbomb',
    name: '水雷折',
    creaseLines: [
      {
        id: 'wb-h',
        start: [-1, 0],
        end: [1, 0],
        type: 'valley',
        angle: 0
      },
      {
        id: 'wb-v',
        start: [0, -1],
        end: [0, 1],
        type: 'valley',
        angle: 0
      },
      {
        id: 'wb-d1',
        start: [-1, -1],
        end: [1, 1],
        type: 'mountain',
        angle: 0
      },
      {
        id: 'wb-d2',
        start: [-1, 1],
        end: [1, -1],
        type: 'mountain',
        angle: 0
      }
    ],
    foldOrder: ['wb-d1', 'wb-d2', 'wb-h', 'wb-v']
  }
];
