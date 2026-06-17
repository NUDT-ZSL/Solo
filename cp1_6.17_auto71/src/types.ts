export interface DesignToken {
  borderRadius: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  backgroundColor: string;
  animationDuration: number;
}

export const BASE_TOKEN: DesignToken = {
  borderRadius: 12,
  shadowOffsetX: 2,
  shadowOffsetY: 4,
  backgroundColor: '#E0E0E0',
  animationDuration: 0.3
};

export const DEFAULT_USER_TOKEN: DesignToken = {
  borderRadius: 8,
  shadowOffsetX: 4,
  shadowOffsetY: 8,
  backgroundColor: '#FFFFFF',
  animationDuration: 0.3
};
