export interface DialogueNode {
  id: string;
  x: number;
  y: number;
  title: string;
  content: string;
  bgColor: string;
  avatarColor: string;
  typingSpeed: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface DialogueTree {
  nodes: DialogueNode[];
  connections: Connection[];
}

export interface HistoryState {
  nodes: DialogueNode[];
  connections: Connection[];
}

export type NodeStylePreset = {
  name: string;
  bgColor: string;
  gradientStart: string;
  gradientEnd: string;
};

export const NODE_STYLE_PRESETS: NodeStylePreset[] = [
  { name: '深海蓝', bgColor: '#16213e', gradientStart: '#16213e', gradientEnd: '#0f3460' },
  { name: '暗夜紫', bgColor: '#2d1b4e', gradientStart: '#2d1b4e', gradientEnd: '#4a1f7a' },
  { name: '森林绿', bgColor: '#1a3c2e', gradientStart: '#1a3c2e', gradientEnd: '#0f5132' },
  { name: '秋叶橙', bgColor: '#4a2c17', gradientStart: '#4a2c17', gradientEnd: '#8b4513' },
  { name: '玫瑰红', bgColor: '#4a1a2e', gradientStart: '#4a1a2e', gradientEnd: '#7a1f3d' },
  { name: '科技青', bgColor: '#0d3b3b', gradientStart: '#0d3b3b', gradientEnd: '#0a6666' },
  { name: '帝王黄', bgColor: '#4a3d1a', gradientStart: '#4a3d1a', gradientEnd: '#8b7355' },
  { name: '樱花粉', bgColor: '#4a2a3a', gradientStart: '#4a2a3a', gradientEnd: '#7a3a5a' },
  { name: '星空灰', bgColor: '#2a2a3e', gradientStart: '#2a2a3e', gradientEnd: '#3a3a5e' },
  { name: '烈焰红', bgColor: '#4a1a1a', gradientStart: '#4a1a1a', gradientEnd: '#8b2020' },
  { name: '冰川蓝', bgColor: '#1a3a4a', gradientStart: '#1a3a4a', gradientEnd: '#1f5a7a' },
  { name: '秘境棕', bgColor: '#3a2a1a', gradientStart: '#3a2a1a', gradientEnd: '#5a3a2a' },
];

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
