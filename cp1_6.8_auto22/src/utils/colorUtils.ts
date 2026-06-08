export type Emotion = 'positive' | 'neutral' | 'negative';

const POSITIVE_WORDS = [
  '开心', '快乐', '幸福', '美好', '希望', '爱', '梦想', '温暖', '阳光',
  '笑', '喜欢', '感谢', '感动', '精彩', '成功', '自由', '勇气', '力量',
  '加油', '棒', '好', '美', '甜', '善', '真', '乐', '趣', '喜',
  '欢笑', '光明', '灿烂', '绽放', '希望', '勇敢', '坚持', '突破',
  '创新', '灵感', '闪亮', '热爱', '拥抱', '飞翔', '追逐', '闪耀',
  '温柔', '治愈', '浪漫', '幸运', '惊喜', '完美', '纯粹', '坦率',
];

const NEGATIVE_WORDS = [
  '难过', '伤心', '失望', '孤独', '寂寞', '无奈', '疲惫', '痛苦',
  '迷茫', '焦虑', '烦躁', '崩溃', '压力', '孤独', '寂寞', '悲伤',
  '绝望', '恐惧', '后悔', '遗憾', '沮丧', '无力', '疲惫', '厌倦',
  '痛', '哭', '泪', '暗', '冷', '空', '碎', '裂', '断', '散',
  '放弃', '失败', '挫折', '困难', '阻碍', '挣扎', '矛盾', '纠结',
  '烦', '累', '困', '难', '怕', '想', '念', '别', '离', '散',
];

export function analyzeEmotion(text: string): Emotion {
  let positiveScore = 0;
  let negativeScore = 0;

  for (const word of POSITIVE_WORDS) {
    if (text.includes(word)) positiveScore++;
  }

  for (const word of NEGATIVE_WORDS) {
    if (text.includes(word)) negativeScore++;
  }

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

export interface EmotionColors {
  primary: string;
  secondary: string;
  glow: string;
  gradient: string;
  glowClass: string;
}

const EMOTION_COLOR_MAP: Record<Emotion, EmotionColors> = {
  positive: {
    primary: '#FF6B35',
    secondary: '#F7C948',
    glow: 'rgba(255, 107, 53, 0.4)',
    gradient: 'linear-gradient(135deg, #FF6B35, #F7C948)',
    glowClass: 'note-glow-positive',
  },
  neutral: {
    primary: '#4ECDC4',
    secondary: '#556270',
    glow: 'rgba(78, 205, 196, 0.4)',
    gradient: 'linear-gradient(135deg, #4ECDC4, #556270)',
    glowClass: 'note-glow-neutral',
  },
  negative: {
    primary: '#2C3E50',
    secondary: '#8E44AD',
    glow: 'rgba(142, 68, 173, 0.4)',
    gradient: 'linear-gradient(135deg, #2C3E50, #8E44AD)',
    glowClass: 'note-glow-negative',
  },
};

export function getEmotionColors(emotion: Emotion): EmotionColors {
  return EMOTION_COLOR_MAP[emotion];
}

export function getContinuationGradient(emotion: Emotion): string {
  const base = EMOTION_COLOR_MAP[emotion];
  return `linear-gradient(180deg, ${base.primary}22 0%, ${base.secondary}44 100%)`;
}
