export type MoodType = 'joy' | 'peace' | 'sadness' | 'anxiety';

export interface MoodPalette {
  startColor: string;
  endColor: string;
  complementColor: string;
}

export interface MoodResult {
  mood: MoodType;
  moodName: string;
  moodNameEn: string;
  primaryColor: string;
  palette: MoodPalette;
  keywords: string[];
}

interface MoodKeywordMap {
  [key: string]: MoodType;
}

const joyKeywords = [
  '开心', '快乐', '高兴', '愉快', '喜悦', '兴奋', '幸福', '满足',
  '温暖', '阳光', '笑容', '甜蜜', '美好', '希望', '惊喜', '庆祝',
  '欢乐', '优秀', '成功', '棒', '喜欢', '爱', '笑', '赞',
  'happy', 'joy', 'glad', 'smile', 'love'
];

const peaceKeywords = [
  '平静', '安静', '宁静', '安宁', '放松', '舒适', '惬意', '治愈',
  '悠闲', '悠然', '淡然', '从容', '自在', '安心', '踏实', '温柔',
  '柔和', '清新', '自然', '风', '云', '雨', '茶', '咖啡', '书',
  'peaceful', 'calm', 'quiet', 'relax'
];

const sadnessKeywords = [
  '悲伤', '难过', '伤心', '失落', '忧郁', '孤独', '寂寞', '想哭',
  '眼泪', '哭', '痛苦', '心碎', '绝望', '沮丧', '消沉', '思念',
  '想念', '遗憾', '后悔', '无奈', '离别', '分离', '失去', '冷',
  'sad', 'lonely', 'cry', 'miss'
];

const anxietyKeywords = [
  '焦虑', '紧张', '烦躁', '不安', '压力', '担心', '担忧', '害怕',
  '恐惧', '慌', '着急', '急躁', '烦闷', '压抑', '纠结', '混乱',
  '迷茫', '困惑', '累', '疲惫', '生气', '愤怒', '恼火', '烦躁不安',
  'anxious', 'stress', 'worry', 'nervous', 'angry'
];

function buildKeywordMap(): MoodKeywordMap {
  const map: MoodKeywordMap = {};
  const allKeywords: { keywords: string[]; mood: MoodType }[] = [
    { keywords: joyKeywords, mood: 'joy' },
    { keywords: peaceKeywords, mood: 'peace' },
    { keywords: sadnessKeywords, mood: 'sadness' },
    { keywords: anxietyKeywords, mood: 'anxiety' }
  ];

  const priorityOrder: MoodType[] = ['anxiety', 'sadness', 'joy', 'peace'];

  for (const mood of priorityOrder) {
    const group = allKeywords.find(g => g.mood === mood);
    if (group) {
      for (const keyword of group.keywords) {
        if (!(keyword in map)) {
          map[keyword] = mood;
        }
      }
    }
  }

  return map;
}

const moodKeywords: MoodKeywordMap = buildKeywordMap();

const moodPalettes: Record<MoodType, MoodPalette> = {
  joy: {
    startColor: '#FFD700',
    endColor: '#FF6347',
    complementColor: '#FF8C00'
  },
  peace: {
    startColor: '#87CEEB',
    endColor: '#98FB98',
    complementColor: '#90EE90'
  },
  sadness: {
    startColor: '#1E90FF',
    endColor: '#7B68EE',
    complementColor: '#4169E1'
  },
  anxiety: {
    startColor: '#C71585',
    endColor: '#696969',
    complementColor: '#8B008B'
  }
};

const moodNames: Record<MoodType, { zh: string; en: string }> = {
  joy: { zh: '快乐', en: 'Joy' },
  peace: { zh: '平静', en: 'Peace' },
  sadness: { zh: '悲伤', en: 'Sadness' },
  anxiety: { zh: '焦虑', en: 'Anxiety' }
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function getComplementaryColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(255 - r, 255 - g, 255 - b);
}

function extractKeywords(text: string): { keywords: string[]; moodScores: Record<MoodType, number> } {
  const moodScores: Record<MoodType, number> = {
    joy: 0,
    peace: 0,
    sadness: 0,
    anxiety: 0
  };
  const foundKeywords: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [keyword, mood] of Object.entries(moodKeywords)) {
    if (lowerText.includes(keyword.toLowerCase())) {
      moodScores[mood]++;
      if (!foundKeywords.includes(keyword) && foundKeywords.length < 8) {
        foundKeywords.push(keyword);
      }
    }
  }

  return { keywords: foundKeywords, moodScores };
}

export function analyzeMood(text: string): MoodResult {
  const { keywords, moodScores } = extractKeywords(text);

  let dominantMood: MoodType = 'peace';
  let maxScore = 0;

  for (const [mood, score] of Object.entries(moodScores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantMood = mood as MoodType;
    }
  }

  if (maxScore === 0) {
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const moods: MoodType[] = ['joy', 'peace', 'sadness', 'anxiety'];
    dominantMood = moods[hash % moods.length];
  }

  const palette = moodPalettes[dominantMood];
  const names = moodNames[dominantMood];

  return {
    mood: dominantMood,
    moodName: names.zh,
    moodNameEn: names.en,
    primaryColor: palette.startColor,
    palette,
    keywords: keywords.length > 0 ? keywords : ['今日', '心情']
  };
}

export function getMoodPalette(mood: MoodType): MoodPalette {
  return moodPalettes[mood];
}

export function getComplementary(hex: string): string {
  return getComplementaryColor(hex);
}

export function blendColors(color1: string, color2: string, ratio: number = 0.5): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * ratio,
    c1.g + (c2.g - c1.g) * ratio,
    c1.b + (c2.b - c1.b) * ratio
  );
}
