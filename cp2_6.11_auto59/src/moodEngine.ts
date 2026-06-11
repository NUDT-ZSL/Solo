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

const moodKeywords: MoodKeywordMap = {
  '开心': 'joy', '快乐': 'joy', '高兴': 'joy', '愉快': 'joy', '喜悦': 'joy',
  '兴奋': 'joy', '幸福': 'joy', '满足': 'joy', '温暖': 'joy', '阳光': 'joy',
  '笑容': 'joy', '笑': 'joy', '甜蜜': 'joy', '美好': 'joy', '希望': 'joy',
  '惊喜': 'joy', '爱': 'joy', '喜欢': 'joy', '棒': 'joy', '好': 'joy',
  '赞': 'joy', '优秀': 'joy', '成功': 'joy', '庆祝': 'joy', '欢乐': 'joy',
  'happy': 'joy', 'joy': 'joy', 'glad': 'joy', 'smile': 'joy', 'love': 'joy',

  '平静': 'peace', '安静': 'peace', '宁静': 'peace', '安宁': 'peace', '放松': 'peace',
  '舒适': 'peace', '惬意': 'peace', '治愈': 'peace', '悠闲': 'peace', '悠然': 'peace',
  '淡然': 'peace', '从容': 'peace', '自在': 'peace', '安心': 'peace', '踏实': 'peace',
  '温柔': 'peace', '柔和': 'peace', '清新': 'peace', '自然': 'peace', '风': 'peace',
  '云': 'peace', '雨': 'peace', '茶': 'peace', '咖啡': 'peace', '书': 'peace',
  'peaceful': 'peace', 'calm': 'peace', 'quiet': 'peace', 'relax': 'peace',

  '悲伤': 'sadness', '难过': 'sadness', '伤心': 'sadness', '失落': 'sadness', '忧郁': 'sadness',
  '孤独': 'sadness', '寂寞': 'sadness', '想哭': 'sadness', '眼泪': 'sadness', '哭': 'sadness',
  '痛苦': 'sadness', '心碎': 'sadness', '绝望': 'sadness', '沮丧': 'sadness', '消沉': 'sadness',
  '思念': 'sadness', '想念': 'sadness', '遗憾': 'sadness', '后悔': 'sadness', '无奈': 'sadness',
  '离别': 'sadness', '分离': 'sadness', '失去': 'sadness', '冷': 'sadness', '阴雨': 'sadness',
  'sad': 'sadness', 'lonely': 'sadness', 'cry': 'sadness', 'miss': 'sadness',

  '焦虑': 'anxiety', '紧张': 'anxiety', '烦躁': 'anxiety', '不安': 'anxiety', '压力': 'anxiety',
  '担心': 'anxiety', '担忧': 'anxiety', '害怕': 'anxiety', '恐惧': 'anxiety', '慌': 'anxiety',
  '着急': 'anxiety', '急躁': 'anxiety', '烦闷': 'anxiety', '压抑': 'anxiety', '纠结': 'anxiety',
  '混乱': 'anxiety', '迷茫': 'anxiety', '困惑': 'anxiety', '累': 'anxiety', '疲惫': 'anxiety',
  '生气': 'anxiety', '愤怒': 'anxiety', '恼火': 'anxiety', '烦躁不安': 'anxiety',
  'anxious': 'anxiety', 'stress': 'anxiety', 'worry': 'anxiety', 'nervous': 'anxiety', 'angry': 'anxiety'
};

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
