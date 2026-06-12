export const PRESET_COLORS: string[] = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8B500',
  '#FF69B4',
];

export const DEFAULT_GRADIENT = {
  startColor: '#667eea',
  endColor: '#764ba2',
  type: 'linear' as const,
  angle: 135,
};

export const GRADIENT_TYPES = [
  { value: 'linear', label: '线性渐变' },
  { value: 'radial-circle', label: '径向圆形' },
  { value: 'radial-ellipse', label: '径向椭圆' },
] as const;
