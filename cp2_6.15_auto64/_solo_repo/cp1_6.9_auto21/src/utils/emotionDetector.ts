import type { Emotion } from '@/types';

const POSITIVE_KEYWORDS = [
  '喜', '悦', '乐', '欢', '笑', '花', '春', '暖', '明', '朝', '阳', '光', '艳', '彩', '辉',
  '幸', '福', '美', '好', '甜', '爱', '希望', '灿烂', '快乐', '光明', '生机', '盎然', '蓬勃',
  'happy', 'joy', 'love', 'sunshine', 'bright', 'hope', 'beautiful', 'wonderful', 'smile', 'blossom',
];

const CALM_KEYWORDS = [
  '静', '淡', '宁', '安', '和', '平', '清', '幽', '远', '深', '悠', '然', '思', '月', '云',
  '水', '山', '禅', '雅', '素', '梦', '影', '星', '夜', '秋', '冬', '温柔', '宁静', '淡然',
  'calm', 'quiet', 'peace', 'serene', 'gentle', 'soft', 'moon', 'star', 'dream', 'cloud', 'water',
];

const SAD_KEYWORDS = [
  '悲', '愁', '泪', '伤', '恨', '别', '离', '断', '残', '落', '孤', '寂', '寞', '寒', '冷',
  '苦', '痛', '忧', '哀', '怨', '怅', '惘', '萧', '瑟', '霜', '雪', '风', '雨', '孤独', '寂寞',
  'sad', 'lonely', 'tear', 'grief', 'sorrow', 'goodbye', 'broken', 'cold', 'empty', 'lost', 'pain',
];

export function detectEmotion(text: string): Emotion {
  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let calmScore = 0;
  let sadScore = 0;

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      positiveScore++;
    }
  }

  for (const keyword of CALM_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      calmScore++;
    }
  }

  for (const keyword of SAD_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      sadScore++;
    }
  }

  if (positiveScore === 0 && calmScore === 0 && sadScore === 0) {
    return 'calm';
  }

  const scores: [Emotion, number][] = [
    ['positive', positiveScore],
    ['calm', calmScore],
    ['sad', sadScore],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][0];
}

export function detectEmotionFromLines(lines: string[]): Emotion {
  const combined = lines.join(' ');
  return detectEmotion(combined);
}
