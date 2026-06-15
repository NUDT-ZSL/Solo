import type { Emotion } from '../../shared/types';

export const emotionColors: Record<Emotion, string> = {
  happy: '#FF7E67',
  sad: '#6B8E8E',
  expect: '#9ED39E',
  emotion: '#A67B9B',
};

export const emotionNames: Record<Emotion, string> = {
  happy: '快乐',
  sad: '忧伤',
  expect: '期待',
  emotion: '感慨',
};

export interface EmotionLabel {
  value: Emotion;
  label: string;
  color: string;
  description: string;
}

export const emotionLabels: EmotionLabel[] = [
  {
    value: 'happy',
    label: '快乐',
    color: '#FF7E67',
    description: '暖橙色，记录那些阳光灿烂的日子',
  },
  {
    value: 'sad',
    label: '忧伤',
    color: '#6B8E8E',
    description: '冷蓝色，写给未来那个已经释怀的自己',
  },
  {
    value: 'expect',
    label: '期待',
    color: '#9ED39E',
    description: '薄荷绿，埋下一颗希望的种子',
  },
  {
    value: 'emotion',
    label: '感慨',
    color: '#A67B9B',
    description: '紫罗兰，珍藏那些触动心底的时刻',
  },
];
