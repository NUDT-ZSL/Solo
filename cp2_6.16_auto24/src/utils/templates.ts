import { Template } from '../types';

export const templates: Template[] = [
  {
    id: 1,
    name: '春节',
    category: 'spring',
    colors: { primary: '#d63031', secondary: '#fdcb6e', background: '#fff5e6' },
    decorations: ['🏮', '🧧', '🎆', '✨'],
  },
  {
    id: 2,
    name: '圣诞',
    category: 'christmas',
    colors: { primary: '#2d5016', secondary: '#c41e3a', background: '#f0f8f0' },
    decorations: ['🎄', '🎅', '❄️', '🔔'],
  },
  {
    id: 3,
    name: '生日',
    category: 'birthday',
    colors: { primary: '#e84393', secondary: '#fd79a8', background: '#fff0f5' },
    decorations: ['🎂', '🎈', '🎉', '🎁'],
  },
  {
    id: 4,
    name: '感恩节',
    category: 'thanksgiving',
    colors: { primary: '#d68910', secondary: '#935116', background: '#fef5e7' },
    decorations: ['🦃', '🍂', '🌽', '🥧'],
  },
  {
    id: 5,
    name: '七夕',
    category: 'qixi',
    colors: { primary: '#6c5ce7', secondary: '#fd79a8', background: '#f5f0ff' },
    decorations: ['💑', '💖', '✨', '🌙'],
  },
  {
    id: 6,
    name: '新年',
    category: 'newyear',
    colors: { primary: '#0984e3', secondary: '#00cec9', background: '#e8f6f3' },
    decorations: ['🎊', '🎉', '🎆', '🕊️'],
  },
];

export const defaultEffects = {
  isSparkleEnabled: false,
  isPetalEnabled: false,
  isGlowEnabled: false,
  isRotateEnabled: false,
  isTextBlinkEnabled: false,
};
