import { GradientConfig } from '../types';

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 560;
export const GRID_SIZE = 20;
export const GRID_COLOR = '#eeeeee';
export const GRID_OPACITY = 0.3;

export const ELEMENT_PRESETS = {
  text: {
    width: 200,
    height: 60,
    text: '双击编辑文本',
    fontFamily: 'SimHei',
    fontSize: 32,
    fontColor: '#1a1a2e',
    lineHeight: 1.4,
    letterSpacing: 0,
    textAlign: 'left' as const,
  },
  image: {
    width: 150,
    height: 150,
    imageFit: 'cover' as const,
  },
  line: {
    width: 200,
    height: 2,
    lineStyle: 'solid' as const,
    lineColor: '#e94560',
    lineThickness: 2,
  },
  shape: {
    width: 120,
    height: 120,
    shapeType: 'rectangle' as const,
    fillColor: '#e94560',
    strokeColor: 'transparent',
    strokeWidth: 0,
  },
};

export const GRADIENT_PRESETS: { name: string; gradient: GradientConfig }[] = [
  { name: '日出橙', gradient: { from: '#ff6b35', to: '#ffcc00', angle: 135 } },
  { name: '海洋蓝', gradient: { from: '#0066ff', to: '#00ccff', angle: 135 } },
  { name: '森林绿', gradient: { from: '#11998e', to: '#38ef7d', angle: 135 } },
  { name: '暮光紫', gradient: { from: '#667eea', to: '#764ba2', angle: 135 } },
  { name: '樱花粉', gradient: { from: '#ff9a9e', to: '#fecfef', angle: 135 } },
  { name: '深海蓝', gradient: { from: '#0f0c29', to: '#302b63', angle: 135 } },
  { name: '金色阳光', gradient: { from: '#f2994a', to: '#f2c94c', angle: 135 } },
  { name: '薄荷清新', gradient: { from: '#43e97b', to: '#38f9d7', angle: 135 } },
  { name: '烈焰红', gradient: { from: '#ff416c', to: '#ff4b2b', angle: 135 } },
  { name: '深邃黑', gradient: { from: '#232526', to: '#414345', angle: 135 } },
];

export const CHINESE_FONTS: { name: string; value: string }[] = [
  { name: '思源黑体', value: '"Noto Sans SC", "Source Han Sans CN", sans-serif' },
  { name: '思源宋体', value: '"Noto Serif SC", "Source Han Serif CN", serif' },
  { name: '微软雅黑', value: '"Microsoft YaHei", sans-serif' },
  { name: '宋体', value: 'SimSun, serif' },
  { name: '黑体', value: 'SimHei, sans-serif' },
  { name: '楷体', value: 'KaiTi, cursive' },
  { name: '仿宋', value: 'FangSong, serif' },
  { name: '幼圆', value: 'YouYuan, sans-serif' },
  { name: '隶书', value: 'LiSu, cursive' },
  { name: '华文行楷', value: '"ST Xingkai", cursive' },
];

export const COLORS = {
  bgPrimary: '#1a1a2e',
  bgSidebar: '#16213e',
  bgActive: '#0f3460',
  accent: '#e94560',
  border: '#4488ff',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0b0',
  canvasBg: '#ffffff',
  gridLine: '#eeeeee',
};

export const ANIMATION = {
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  transition: '0.15s ease',
  elementBounceDuration: '0.2s',
};
