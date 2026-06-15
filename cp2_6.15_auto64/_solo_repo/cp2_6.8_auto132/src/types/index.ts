export interface ColorToken {
  hex: string;
  percentage: number;
  rgb: [number, number, number];
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  text: string;
  showGrid: boolean;
}

export type GuideLineType = 'horizontal' | 'vertical';

export interface GuideLine {
  id: string;
  type: GuideLineType;
  position: number;
}

export interface SpacingValue {
  id: string;
  fromId: string;
  toId: string;
  distance: number;
  orientation: GuideLineType;
}

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken;
  guidelines: GuideLine[];
  spacings: SpacingValue[];
  uploadedImage: string | null;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  tokens: DesignTokens;
}

export const AVAILABLE_FONTS = [
  'Inter',
  'Roboto',
  'Poppins',
  'Merriweather',
  'Fira Code',
] as const;

export type FontFamily = (typeof AVAILABLE_FONTS)[number];

export const DEFAULT_TYPOGRAPHY: TypographyToken = {
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 1.5,
  text: '设计是解决问题的艺术。Design is the art of solving problems.',
  showGrid: false,
};

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 400;
export const MAX_GUIDELINES = 10;
export const MAX_HISTORY = 3;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
