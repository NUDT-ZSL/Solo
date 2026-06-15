export type Emotion = 'happy' | 'sad' | 'calm' | 'angry' | 'surprised';

export interface IllustrationParams {
  gradientColors: [string, string, string];
  particleCount: number;
  waveAmplitude: number;
  waveFrequency: number;
  particleSpeed: number;
  particleSize: number;
}

export interface Poem {
  id: string;
  title: string;
  content: string;
  emotion: Emotion;
  author: string;
  authorId: string;
  createdAt: string;
  illustration: IllustrationParams;
}

export interface EchoComment {
  id: string;
  poemId: string;
  content: string;
  emoji: string;
  author: string;
  authorId: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
}

const EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  happy: ['花开', '阳光', '笑', '温暖', '快乐', '喜悦', '幸福', '春风', '明媚', '欢歌', '绽放', '晨曦', '晴朗', '拥抱', '甜蜜'],
  sad: ['落叶', '孤独', '泪', '悲伤', '寂寞', '离别', '萧瑟', '枯萎', '黯然', '叹息', '凄凉', '愁', '暮色', '凉', '寒'],
  calm: ['宁静', '湖面', '月光', '静谧', '安然', '悠然', '清幽', '淡然', '微风', '涟漪', '山间', '云', '溪流', '晚霞', '沉静'],
  angry: ['烈火', '狂风', '怒', '暴', '惊雷', '撕裂', '咆哮', '焚烧', '震怒', '破', '战', '锋利', '铁', '血', '雷鸣'],
  surprised: ['奇迹', '星辰', '惊叹', '璀璨', '不可思议', '浩瀚', '闪耀', '梦幻', '瑰丽', '神秘', '初见', '发现', '彩虹', '极光', '银河'],
};

const EMOTION_COLORS: Record<Emotion, [string, string, string]> = {
  happy: ['#FFD700', '#FF8C42', '#FF6B6B'],
  sad: ['#6B8CA6', '#4A6670', '#2F4858'],
  calm: ['#A8D8B9', '#7EC8A0', '#5BA88C'],
  angry: ['#FF4444', '#CC2200', '#8B0000'],
  surprised: ['#C77DFF', '#9D4EDD', '#7B2CB8'],
};

export function analyzeEmotion(content: string): Emotion {
  const counts: Record<Emotion, number> = {
    happy: 0,
    sad: 0,
    calm: 0,
    angry: 0,
    surprised: 0,
  };

  for (const emotion of Object.keys(EMOTION_KEYWORDS) as Emotion[]) {
    for (const keyword of EMOTION_KEYWORDS[emotion]) {
      let pos = 0;
      while ((pos = content.indexOf(keyword, pos)) !== -1) {
        counts[emotion]++;
        pos += keyword.length;
      }
    }
  }

  let maxCount = 0;
  let result: Emotion = 'calm';
  for (const emotion of Object.keys(counts) as Emotion[]) {
    if (counts[emotion] > maxCount) {
      maxCount = counts[emotion];
      result = emotion;
    }
  }

  return result;
}

export function computeIllustrationParams(emotion: Emotion, content: string): IllustrationParams {
  const baseParticleCount: Record<Emotion, number> = {
    happy: 80,
    sad: 40,
    calm: 50,
    angry: 100,
    surprised: 70,
  };

  const waveAmplitudeMap: Record<Emotion, number> = {
    happy: 0.6,
    sad: 0.3,
    calm: 0.2,
    angry: 0.9,
    surprised: 0.7,
  };

  const waveFrequencyMap: Record<Emotion, number> = {
    happy: 0.02,
    sad: 0.01,
    calm: 0.015,
    angry: 0.03,
    surprised: 0.025,
  };

  const particleSpeedMap: Record<Emotion, number> = {
    happy: 1.2,
    sad: 0.5,
    calm: 0.6,
    angry: 1.8,
    surprised: 1.5,
  };

  const particleSizeMap: Record<Emotion, number> = {
    happy: 3,
    sad: 2,
    calm: 2.5,
    angry: 4,
    surprised: 3.5,
  };

  const lengthFactor = Math.min(content.length / 50, 2);

  return {
    gradientColors: EMOTION_COLORS[emotion],
    particleCount: Math.round(baseParticleCount[emotion] * (0.8 + lengthFactor * 0.2)),
    waveAmplitude: waveAmplitudeMap[emotion],
    waveFrequency: waveFrequencyMap[emotion],
    particleSpeed: particleSpeedMap[emotion],
    particleSize: particleSizeMap[emotion],
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const EMOTION_LABELS: Record<Emotion, string> = {
  happy: '快乐',
  sad: '悲伤',
  calm: '宁静',
  angry: '愤怒',
  surprised: '惊奇',
};

export const EMOTION_EMOJIS: Record<Emotion, string> = {
  happy: '😊',
  sad: '😢',
  calm: '😌',
  angry: '😤',
  surprised: '😮',
};
