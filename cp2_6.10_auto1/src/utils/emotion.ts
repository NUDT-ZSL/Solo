import type { Emotion } from '../../shared/types';

export const emotionColors: Record<Emotion, string> = {
  happy: '#F5B971',
  sad: '#8B7EC8',
  expect: '#A8D5BA',
  emotion: '#F0C6C6',
};

export const emotionNames: Record<Emotion, string> = {
  happy: '喜悦',
  sad: '忧伤',
  expect: '期待',
  emotion: '感动',
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
    label: '喜悦',
    color: '#F5B971',
    description: '记录那些让你会心一笑的瞬间',
  },
  {
    value: 'sad',
    label: '忧伤',
    color: '#8B7EC8',
    description: '写给未来那个已经释怀的自己',
  },
  {
    value: 'expect',
    label: '期待',
    color: '#A8D5BA',
    description: '埋下一颗希望的种子，静候花开',
  },
  {
    value: 'emotion',
    label: '感动',
    color: '#F0C6C6',
    description: '珍藏那些触动心底的温暖时刻',
  },
];
