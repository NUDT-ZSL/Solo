export type EmotionType = 'happy' | 'sad' | 'angry' | 'calm' | 'anxious';

export interface EmotionKeyword {
  word: string;
  emotion: EmotionType;
  intensity: number;
  position: number;
}

export interface SentenceAnalysis {
  text: string;
  keywords: EmotionKeyword[];
  dominantEmotion: EmotionType;
  intensity: number;
  charStart: number;
  charEnd: number;
  charIndex: number;
}

export interface AnalysisResult {
  sentences: SentenceAnalysis[];
  overallEmotions: Record<EmotionType, number>;
  dominantEmotion: EmotionType;
  totalChars: number;
}

const emotionLexicon: Record<EmotionType, string[]> = {
  happy: ['开心', '快乐', '喜悦', '兴奋', '幸福', '满足', '愉快', '欢乐', '欣喜', '畅快', '舒畅', '甜蜜', '愉悦', '美好', '欣慰'],
  sad: ['难过', '伤心', '悲伤', '痛苦', '绝望', '失落', '沮丧', '忧愁', '哀伤', '苦闷', '心酸', '悲凉', '凄惨', '落寞', '惆怅'],
  angry: ['生气', '愤怒', '暴怒', '愤慨', '恼怒', '气愤', '恼火', '怨恨', '愤恨', '震怒', '愤懑', '气恼', '大怒', '怒不可遏'],
  calm: ['平静', '安宁', '宁静', '安详', '平和', '淡定', '从容', '沉稳', '恬静', '闲适', '悠然', '淡然', '安稳', '静谧'],
  anxious: ['焦虑', '紧张', '担忧', '不安', '烦躁', '急躁', '惶恐', '恐慌', '忐忑', '忧虑', '着急', '焦急', '揪心', '慌乱', '心慌']
};

const emotionIntensityWeights: Record<EmotionType, number[]> = {
  happy: [2, 3, 4, 4, 5, 3, 2, 3, 4, 3, 3, 4, 3, 3, 3],
  sad: [3, 4, 4, 5, 5, 3, 4, 3, 4, 4, 4, 4, 5, 4, 3],
  angry: [3, 4, 5, 4, 4, 3, 3, 4, 5, 4, 5, 4, 3, 5, 5],
  calm: [3, 3, 4, 3, 3, 4, 3, 3, 4, 3, 3, 3, 3, 3, 4],
  anxious: [4, 3, 4, 3, 4, 3, 5, 5, 4, 4, 3, 4, 4, 4, 3]
};

export const emotionColors: Record<EmotionType, string> = {
  happy: '#FFD700',
  sad: '#00BFFF',
  angry: '#DC143C',
  calm: '#98FF98',
  anxious: '#8B7B8B'
};

export function getEmotionColor(emotion: EmotionType): string {
  return emotionColors[emotion];
}

export function splitSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const result: Array<{ text: string; start: number; end: number }> = [];
  const punctuationRegex = /[。，,；;！!？?]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = punctuationRegex.exec(text)) !== null) {
    const start = lastIndex;
    const end = match.index;
    const sentenceText = text.slice(start, end).trim();
    
    if (sentenceText.length > 0) {
      result.push({
        text: sentenceText,
        start,
        end
      });
    }
    lastIndex = match.index + 1;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining.length > 0) {
      result.push({
        text: remaining,
        start: lastIndex,
        end: text.length
      });
    }
  }

  return result;
}

function findKeywordsInSentence(
  sentence: string,
  sentenceCharStart: number
): EmotionKeyword[] {
  const keywords: EmotionKeyword[] = [];
  const seenPositions = new Set<number>();

  for (const emotion of Object.keys(emotionLexicon) as EmotionType[]) {
    const words = emotionLexicon[emotion];
    const weights = emotionIntensityWeights[emotion];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let searchStart = 0;

      while (searchStart < sentence.length) {
        const indexInSentence = sentence.indexOf(word, searchStart);
        if (indexInSentence === -1) break;

        const globalPos = sentenceCharStart + indexInSentence;
        if (!seenPositions.has(globalPos)) {
          seenPositions.add(globalPos);
          keywords.push({
            word,
            emotion,
            intensity: weights[i],
            position: globalPos
          });
        }

        searchStart = indexInSentence + word.length;
      }
    }
  }

  return keywords.sort((a, b) => a.position - b.position);
}

function calculateDominantEmotion(keywords: EmotionKeyword[]): EmotionType {
  const emotionScores: Record<EmotionType, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    calm: 0,
    anxious: 0
  };

  for (const kw of keywords) {
    emotionScores[kw.emotion] += kw.intensity;
  }

  let dominant: EmotionType = 'calm';
  let maxScore = 0;

  for (const emotion of Object.keys(emotionScores) as EmotionType[]) {
    if (emotionScores[emotion] > maxScore) {
      maxScore = emotionScores[emotion];
      dominant = emotion;
    }
  }

  return dominant;
}

function calculateIntensity(keywords: EmotionKeyword[], sentenceLength: number): number {
  if (keywords.length === 0) return 1;

  const totalIntensity = keywords.reduce((sum, kw) => sum + kw.intensity, 0);
  const keywordFactor = Math.min(keywords.length * 0.5 + 1, 3);
  const lengthFactor = Math.max(0.5, Math.min(1.5, 50 / Math.max(sentenceLength, 1)));

  let intensity = Math.round((totalIntensity / keywords.length) * keywordFactor * lengthFactor);
  intensity = Math.max(1, Math.min(5, intensity));

  return intensity;
}

export function analyzeSentence(
  text: string,
  charStart: number,
  charEnd: number,
  totalChars: number
): SentenceAnalysis {
  const keywords = findKeywordsInSentence(text, charStart);
  const dominantEmotion = calculateDominantEmotion(keywords);
  const intensity = calculateIntensity(keywords, text.length);
  const charIndex = totalChars > 0 ? (charStart + charEnd) / 2 / totalChars : 0.5;

  return {
    text,
    keywords,
    dominantEmotion,
    intensity,
    charStart,
    charEnd,
    charIndex: Math.max(0, Math.min(1, charIndex))
  };
}

export function analyzeText(text: string): AnalysisResult {
  const totalChars = text.length;
  const sentenceSegments = splitSentences(text);
  const analyzedSentences: SentenceAnalysis[] = [];

  for (const seg of sentenceSegments) {
    analyzedSentences.push(
      analyzeSentence(seg.text, seg.start, seg.end, totalChars)
    );
  }

  const overallEmotions: Record<EmotionType, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    calm: 0,
    anxious: 0
  };

  for (const sentence of analyzedSentences) {
    for (const kw of sentence.keywords) {
      overallEmotions[kw.emotion] += kw.intensity;
    }
  }

  let dominantEmotion: EmotionType = 'calm';
  let maxCount = 0;

  for (const emotion of Object.keys(overallEmotions) as EmotionType[]) {
    if (overallEmotions[emotion] > maxCount) {
      maxCount = overallEmotions[emotion];
      dominantEmotion = emotion;
    }
  }

  return {
    sentences: analyzedSentences,
    overallEmotions,
    dominantEmotion,
    totalChars
  };
}

export function getAllKeywords(result: AnalysisResult): EmotionKeyword[] {
  const allKeywords: EmotionKeyword[] = [];
  for (const sentence of result.sentences) {
    allKeywords.push(...sentence.keywords);
  }
  return allKeywords;
}
