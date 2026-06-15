export type InspirationType =
  | 'story-outline'
  | 'plot-twist'
  | 'character'
  | 'worldbuilding'
  | 'dialogue'
  | 'scene';

export type Priority = 'P1' | 'P2' | 'P3' | 'P4';

export interface Inspiration {
  id: string;
  title: string;
  description: string;
  project: string;
  type: InspirationType;
  priority: Priority;
  tags: string[];
  isFavorite: boolean;
  favoriteCount: number;
  createdAt: string;
}

export interface TagDictionary {
  tags: string[];
  projects: string[];
}

export const TYPE_LABELS: Record<InspirationType, string> = {
  'story-outline': '故事梗概',
  'plot-twist': '情节转折',
  character: '人物设定',
  worldbuilding: '世界观元素',
  dialogue: '对话片段',
  scene: '场景构思',
};

export const TYPE_COLORS: Record<InspirationType, string> = {
  'story-outline': '#3498DB',
  'plot-twist': '#9B59B6',
  character: '#E67E22',
  worldbuilding': '#1ABC9C',
  dialogue: '#2ECC71',
  scene: '#E91E63',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  P1: '#E74C3C',
  P2: '#F39C12',
  P3: '#3498DB',
  P4: '#BDC3C7',
};
