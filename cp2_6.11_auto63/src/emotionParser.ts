export type EmotionType = 'joy' | 'sadness' | 'anger' | 'calm' | 'anxiety';

export interface SentenceResult {
  sentence: string;
  emotion: EmotionType;
  mixedEmotions: { emotion: EmotionType; weight: number }[];
  intensity: number;
  charCount: number;
}

const NEGATION_WORDS = ['不', '没', '无', '非', '未', '别', '不要', '不会', '不能', '不是', '没有', '从未', '绝非'];

const DEGREE_ADVERBS: Record<string, number> = {
  '非常': 1.5, '特别': 1.5, '极其': 1.6, '极度': 1.6, '格外': 1.4, '分外': 1.4,
  '很': 1.3, '十分': 1.3, '相当': 1.25, '挺': 1.2, '真的': 1.25, '真是': 1.25,
  '好': 1.2, '超级': 1.55, '无比': 1.5, '万分': 1.5,
  '有点': 0.75, '有些': 0.75, '稍微': 0.7, '稍稍': 0.7, '略微': 0.7, '略': 0.75,
  '不太': 0.6, '不大': 0.65
};

const OPPOSITE_MAP: Record<EmotionType, EmotionType> = {
  joy: 'sadness',
  sadness: 'joy',
  anger: 'calm',
  calm: 'anger',
  anxiety: 'calm'
};

const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  joy: [
    '开心', '快乐', '高兴', '愉快', '喜悦', '欢喜', '欣喜', '幸福', '满足', '惬意',
    '笑', '欢笑', '大笑', '微笑', '乐', '欢乐', '欢快', '欢欣', '雀跃', '陶醉',
    '甜', '美好', '灿烂', '阳光', '温暖', '温馨', '浪漫', '感动', '欣慰', '兴奋',
    '激动', '畅快', '痛快', '轻松', '愉悦', '美滋滋', '乐呵呵', '喜滋滋', '笑哈哈',
    '繁荣', '热闹', '欢聚', '团圆', '成功', '胜利', '惊喜', '惊喜万分'
  ],
  sadness: [
    '悲伤', '伤心', '难过', '痛苦', '忧伤', '哀伤', '哀愁', '忧郁', '凄凉', '心酸',
    '哭', '流泪', '落泪', '哭泣', '泪', '眼泪', '心碎', '绝望', '失落', '沮丧',
    '孤独', '寂寞', '孤单', '空虚', '无助', '无奈', '苦涩', '沉重', '心痛', '遗憾',
    '后悔', '惋惜', '凄凉', '惨淡', '伤感', '愁', '忧愁', '哀愁', '苦闷', '苦恼',
    '崩溃', '痛哭', '泪如雨下', '心如刀割', '痛不欲生', '生无可恋'
  ],
  anger: [
    '愤怒', '生气', '气愤', '恼火', '暴怒', '狂怒', '大怒', '发怒', '怒气', '发火',
    '恨', '憎恨', '憎恶', '痛恨', '愤恨', '愤慨', '愤怒', '暴怒', '气炸', '气疯',
    '火', '火大', '恼火', '咬牙切齿', '勃然大怒', '火冒三丈', '暴跳如雷', '七窍生烟',
    '愤怒', '怒斥', '咆哮', '怒吼', '气愤', '愤懑', '不平', '不满', '不爽', '闹心',
    '讨厌', '厌恶', '厌烦', '反感', '恶心', '鄙视', '蔑视', '不屑', '可恶', '该死'
  ],
  calm: [
    '平静', '安静', '宁静', '安宁', '祥和', '安详', '恬静', '静谧', '幽静', '清净',
    '放松', '轻松', '安然', '坦然', '淡然', '从容', '镇定', '冷静', '沉稳', '平稳',
    '平和', '温和', '温柔', '和善', '安详', '宁静致远', '心如止水', '波澜不惊',
    '悠闲', '悠然', '自在', '闲适', '舒心', '舒适', '惬意', '安逸', '安心', '放心',
    '月亮', '月光', '星光', '微风', '晚风', '清风', '山水', '湖畔', '森林', '田园'
  ],
  anxiety: [
    '焦虑', '紧张', '不安', '担心', '担忧', '忧虑', '忧愁', '烦恼', '烦躁', '焦急',
    '忐忑', '惶恐', '恐慌', '害怕', '恐惧', '担心', '忧心', '焦灼', '急躁', '慌乱',
    '慌张', '慌忙', '紧张兮兮', '坐立不安', '忐忑不安', '心神不宁', '心烦意乱',
    '失眠', '睡不着', '煎熬', '折磨', '压力', '心累', '疲惫', '焦虑不安', '惶恐不安',
    '考试', '面试', ' deadlines', '害怕', '担心', '怕', '心虚', '没底', '七上八下'
  ]
};

const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: '#FFD700',
  sadness: '#4A90D9',
  anger: '#DC143C',
  calm: '#98FB98',
  anxiety: '#9370DB'
};

const EMOTION_NAMES: Record<EmotionType, string> = {
  joy: '快乐',
  sadness: '悲伤',
  anger: '愤怒',
  calm: '平静',
  anxiety: '焦虑'
};

const EMOTION_SIMILARITY: Record<string, number> = {
  'joy-calm': 0.85, 'joy-anxiety': 0.2, 'joy-sadness': 0.1, 'joy-anger': 0.15,
  'sadness-anxiety': 0.75, 'sadness-calm': 0.35, 'sadness-anger': 0.55,
  'anger-anxiety': 0.6, 'anger-calm': 0.05,
  'calm-anxiety': 0.15
};

function getEmotionSimilarity(a: EmotionType, b: EmotionType): number {
  if (a === b) return 1.0;
  const key1 = `${a}-${b}`;
  const key2 = `${b}-${a}`;
  return EMOTION_SIMILARITY[key1] ?? EMOTION_SIMILARITY[key2] ?? 0.3;
}

function splitSentences(text: string): string[] {
  const raw = text
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '。')
    .split(/[。！？!?;；\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return raw;
}

interface FoundEmotion {
  emotion: EmotionType;
  keyword: string;
  index: number;
  degreeMultiplier: number;
  negated: boolean;
}

function analyzeSentence(sentence: string): SentenceResult {
  const charCount = sentence.length;
  const found: FoundEmotion[] = [];

  for (const emotion of Object.keys(EMOTION_KEYWORDS) as EmotionType[]) {
    const keywords = EMOTION_KEYWORDS[emotion];
    for (const kw of keywords) {
      let idx = sentence.indexOf(kw);
      while (idx !== -1) {
        let degreeMult = 1.0;
        let negated = false;

        const beforeText = sentence.substring(Math.max(0, idx - 8), idx);

        for (const adv of Object.keys(DEGREE_ADVERBS)) {
          if (beforeText.includes(adv)) {
            degreeMult = Math.max(degreeMult, DEGREE_ADVERBS[adv]);
          }
        }

        for (const neg of NEGATION_WORDS) {
          const negIdx = beforeText.lastIndexOf(neg);
          if (negIdx !== -1) {
            const charsBetween = idx - (negIdx + neg.length);
            if (charsBetween <= 6) {
              negated = true;
              break;
            }
          }
        }

        found.push({
          emotion,
          keyword: kw,
          index: idx,
          degreeMultiplier: degreeMult,
          negated
        });

        idx = sentence.indexOf(kw, idx + kw.length);
      }
    }
  }

  const emotionScores: Record<EmotionType, number> = {
    joy: 0, sadness: 0, anger: 0, calm: 0, anxiety: 0
  };

  for (const f of found) {
    let targetEmotion = f.emotion;
    if (f.negated) {
      targetEmotion = OPPOSITE_MAP[f.emotion];
    }
    emotionScores[targetEmotion] += f.degreeMultiplier * (1 + f.keyword.length * 0.05);
  }

  const totalScore = Object.values(emotionScores).reduce((a, b) => a + b, 0);
  const mixedEmotions: { emotion: EmotionType; weight: number }[] = [];
  let primary: EmotionType = 'calm';
  let primaryScore = 0;

  if (totalScore > 0) {
    for (const emo of Object.keys(emotionScores) as EmotionType[]) {
      const w = emotionScores[emo] / totalScore;
      if (w > 0.12) {
        mixedEmotions.push({ emotion: emo, weight: w });
      }
      if (emotionScores[emo] > primaryScore) {
        primaryScore = emotionScores[emo];
        primary = emo;
      }
    }
    mixedEmotions.sort((a, b) => b.weight - a.weight);
  }

  let intensity: number;
  if (totalScore === 0) {
    intensity = 0.4;
    mixedEmotions.push({ emotion: 'calm', weight: 1.0 });
  } else {
    const base = Math.min(1, totalScore * 0.25);
    const kwDensity = Math.min(1, found.length / Math.max(1, charCount / 8));
    intensity = Math.min(1, 0.35 + base * 0.45 + kwDensity * 0.2);
  }

  return {
    sentence,
    emotion: primary,
    mixedEmotions: mixedEmotions.length > 0 ? mixedEmotions : [{ emotion: 'calm', weight: 1.0 }],
    intensity,
    charCount
  };
}

export function parseText(text: string): SentenceResult[] {
  const clean = text.trim();
  if (!clean) return [];
  const sentences = splitSentences(clean);
  return sentences.map(analyzeSentence);
}

export function getEmotionColor(emotion: EmotionType): string {
  return EMOTION_COLORS[emotion];
}

export function getEmotionName(emotion: EmotionType): string {
  return EMOTION_NAMES[emotion];
}

export { getEmotionSimilarity };
