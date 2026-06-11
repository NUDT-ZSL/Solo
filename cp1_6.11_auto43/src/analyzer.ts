export type EmotionType = 'joy' | 'sadness' | 'anger' | 'calm' | 'anxiety';

export interface EmotionKeyword {
  word: string;
  emotion: EmotionType;
  baseIntensity: number;
}

export interface SentenceAnalysis {
  sentence: string;
  startIndex: number;
  endIndex: number;
  keywords: EmotionKeyword[];
  primaryEmotion: EmotionType | null;
  intensity: number;
  emotionScores: Record<EmotionType, number>;
}

export interface AnalysisResult {
  sentences: SentenceAnalysis[];
  overallEmotions: Record<EmotionType, number>;
  totalKeywords: EmotionKeyword[];
}

const emotionWordMap: Record<string, { emotion: EmotionType; baseIntensity: number }> = {
  '开心': { emotion: 'joy', baseIntensity: 2 },
  '快乐': { emotion: 'joy', baseIntensity: 3 },
  '高兴': { emotion: 'joy', baseIntensity: 2 },
  '喜悦': { emotion: 'joy', baseIntensity: 3 },
  '欣喜': { emotion: 'joy', baseIntensity: 3 },
  '幸福': { emotion: 'joy', baseIntensity: 4 },
  '满足': { emotion: 'joy', baseIntensity: 3 },
  '愉快': { emotion: 'joy', baseIntensity: 2 },
  '畅快': { emotion: 'joy', baseIntensity: 3 },
  '欢欣': { emotion: 'joy', baseIntensity: 4 },
  '欢笑': { emotion: 'joy', baseIntensity: 3 },
  '兴奋': { emotion: 'joy', baseIntensity: 4 },
  '甜蜜': { emotion: 'joy', baseIntensity: 3 },
  '温暖': { emotion: 'joy', baseIntensity: 2 },
  '感动': { emotion: 'joy', baseIntensity: 3 },

  '悲伤': { emotion: 'sadness', baseIntensity: 3 },
  '难过': { emotion: 'sadness', baseIntensity: 2 },
  '伤心': { emotion: 'sadness', baseIntensity: 3 },
  '痛苦': { emotion: 'sadness', baseIntensity: 4 },
  '哀伤': { emotion: 'sadness', baseIntensity: 4 },
  '忧愁': { emotion: 'sadness', baseIntensity: 2 },
  '绝望': { emotion: 'sadness', baseIntensity: 5 },
  '失落': { emotion: 'sadness', baseIntensity: 2 },
  '沮丧': { emotion: 'sadness', baseIntensity: 3 },
  '心碎': { emotion: 'sadness', baseIntensity: 5 },
  '哭泣': { emotion: 'sadness', baseIntensity: 3 },
  '流泪': { emotion: 'sadness', baseIntensity: 3 },
  '孤单': { emotion: 'sadness', baseIntensity: 2 },
  '寂寞': { emotion: 'sadness', baseIntensity: 2 },
  '遗憾': { emotion: 'sadness', baseIntensity: 2 },

  '愤怒': { emotion: 'anger', baseIntensity: 4 },
  '生气': { emotion: 'anger', baseIntensity: 2 },
  '恼火': { emotion: 'anger', baseIntensity: 3 },
  '暴怒': { emotion: 'anger', baseIntensity: 5 },
  '愤慨': { emotion: 'anger', baseIntensity: 4 },
  '气愤': { emotion: 'anger', baseIntensity: 3 },
  '恼怒': { emotion: 'anger', baseIntensity: 3 },
  '愤恨': { emotion: 'anger', baseIntensity: 4 },
  '不满': { emotion: 'anger', baseIntensity: 2 },
  '讨厌': { emotion: 'anger', baseIntensity: 2 },
  '烦躁': { emotion: 'anger', baseIntensity: 2 },
  '抓狂': { emotion: 'anger', baseIntensity: 4 },
  '怒火': { emotion: 'anger', baseIntensity: 5 },

  '平静': { emotion: 'calm', baseIntensity: 3 },
  '安宁': { emotion: 'calm', baseIntensity: 3 },
  '宁静': { emotion: 'calm', baseIntensity: 4 },
  '祥和': { emotion: 'calm', baseIntensity: 3 },
  '舒缓': { emotion: 'calm', baseIntensity: 2 },
  '从容': { emotion: 'calm', baseIntensity: 3 },
  '恬淡': { emotion: 'calm', baseIntensity: 3 },
  '悠然': { emotion: 'calm', baseIntensity: 3 },
  '静谧': { emotion: 'calm', baseIntensity: 4 },
  '安稳': { emotion: 'calm', baseIntensity: 2 },
  '放松': { emotion: 'calm', baseIntensity: 3 },
  '安心': { emotion: 'calm', baseIntensity: 3 },
  '踏实': { emotion: 'calm', baseIntensity: 2 },

  '焦虑': { emotion: 'anxiety', baseIntensity: 3 },
  '紧张': { emotion: 'anxiety', baseIntensity: 3 },
  '不安': { emotion: 'anxiety', baseIntensity: 2 },
  '担忧': { emotion: 'anxiety', baseIntensity: 3 },
  '焦急': { emotion: 'anxiety', baseIntensity: 3 },
  '恐慌': { emotion: 'anxiety', baseIntensity: 5 },
  '忧虑': { emotion: 'anxiety', baseIntensity: 3 },
  '心急': { emotion: 'anxiety', baseIntensity: 3 },
  '煎熬': { emotion: 'anxiety', baseIntensity: 4 },
  '担心': { emotion: 'anxiety', baseIntensity: 2 },
  '害怕': { emotion: 'anxiety', baseIntensity: 3 },
  '恐惧': { emotion: 'anxiety', baseIntensity: 5 },
  '彷徨': { emotion: 'anxiety', baseIntensity: 3 },
  '迷茫': { emotion: 'anxiety', baseIntensity: 2 }
};

const intensifiers = ['非常', '特别', '很', '太', '真', '超', '极其', '格外', '分外', '无比'];
const weakeners = ['有点', '稍微', '些许', '一点儿', '不太', '略'];

export function analyzeText(text: string): AnalysisResult {
  const sentences = splitSentences(text);
  const sentenceAnalyses: SentenceAnalysis[] = [];
  const overallEmotions: Record<EmotionType, number> = {
    joy: 0,
    sadness: 0,
    anger: 0,
    calm: 0,
    anxiety: 0
  };
  const totalKeywords: EmotionKeyword[] = [];

  for (const sentence of sentences) {
    const analysis = analyzeSentence(sentence.text, sentence.startIndex, sentence.endIndex);
    sentenceAnalyses.push(analysis);

    for (const emotion of Object.keys(analysis.emotionScores) as EmotionType[]) {
      overallEmotions[emotion] += analysis.emotionScores[emotion];
    }
    totalKeywords.push(...analysis.keywords);
  }

  return {
    sentences: sentenceAnalyses,
    overallEmotions,
    totalKeywords
  };
}

function splitSentences(text: string): Array<{ text: string; startIndex: number; endIndex: number }> {
  const sentences: Array<{ text: string; startIndex: number; endIndex: number }> = [];
  const regex = /[^。！？；.!?;]+[。！？；.!?;]?/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const sentenceText = match[0].trim();
    if (sentenceText.length > 0) {
      sentences.push({
        text: sentenceText,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }

  if (sentences.length === 0 && text.trim().length > 0) {
    sentences.push({
      text: text.trim(),
      startIndex: 0,
      endIndex: text.length
    });
  }

  return sentences;
}

function analyzeSentence(
  sentence: string,
  startIndex: number,
  endIndex: number
): SentenceAnalysis {
  const keywords: EmotionKeyword[] = [];
  const emotionScores: Record<EmotionType, number> = {
    joy: 0,
    sadness: 0,
    anger: 0,
    calm: 0,
    anxiety: 0
  };

  const foundWords = new Set<string>();

  for (const [word, info] of Object.entries(emotionWordMap)) {
    if (sentence.includes(word) && !foundWords.has(word)) {
      foundWords.add(word);
      let intensity = info.baseIntensity;

      for (const intensifier of intensifiers) {
        const idx = sentence.indexOf(word);
        if (idx >= 0 && idx > 0) {
          const beforeText = sentence.substring(Math.max(0, idx - 3), idx);
          if (beforeText.includes(intensifier)) {
            intensity = Math.min(5, intensity + 1);
            break;
          }
        }
      }

      for (const weakener of weakeners) {
        const idx = sentence.indexOf(word);
        if (idx >= 0 && idx > 0) {
          const beforeText = sentence.substring(Math.max(0, idx - 3), idx);
          if (beforeText.includes(weakener)) {
            intensity = Math.max(1, intensity - 1);
            break;
          }
        }
      }

      keywords.push({
        word,
        emotion: info.emotion,
        baseIntensity: intensity
      });

      emotionScores[info.emotion] += intensity;
    }
  }

  let primaryEmotion: EmotionType | null = null;
  let maxScore = 0;

  for (const emotion of Object.keys(emotionScores) as EmotionType[]) {
    if (emotionScores[emotion] > maxScore) {
      maxScore = emotionScores[emotion];
      primaryEmotion = emotion;
    }
  }

  const totalIntensity = keywords.reduce((sum, k) => sum + k.baseIntensity, 0);
  const avgIntensity = keywords.length > 0 ? totalIntensity / keywords.length : 0;

  return {
    sentence,
    startIndex,
    endIndex,
    keywords,
    primaryEmotion,
    intensity: Math.min(5, Math.max(1, Math.round(avgIntensity || 0))),
    emotionScores
  };
}

export const emotionColors: Record<EmotionType, string> = {
  joy: '#FFD700',
  sadness: '#00BFFF',
  anger: '#DC143C',
  calm: '#98FF98',
  anxiety: '#8B7B8B'
};

export const emotionNames: Record<EmotionType, string> = {
  joy: '高兴',
  sadness: '悲伤',
  anger: '愤怒',
  calm: '平静',
  anxiety: '焦虑'
};
