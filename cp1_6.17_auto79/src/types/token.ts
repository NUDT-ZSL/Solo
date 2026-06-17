export interface DesignToken {
  borderRadius: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  backgroundColor: string;
  animationDuration: number;
}

export const baseToken: DesignToken = {
  borderRadius: 4,
  shadowOffsetX: 0,
  shadowOffsetY: 2,
  backgroundColor: '#E0E0E0',
  animationDuration: 0.3,
};

export const defaultUserToken: DesignToken = {
  borderRadius: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 4,
  backgroundColor: '#1976D2',
  animationDuration: 0.3,
};
