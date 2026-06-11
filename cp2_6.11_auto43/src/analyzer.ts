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
  position: number;
}

export interface AnalysisResult {
  sentences: SentenceAnalysis[];
  overallEmotions: Record<EmotionType, number>;
  dominantEmotion: EmotionType;
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

export function splitSentences(text: string): string[] {
  const sentences = text.split(/[。！？!?；;\n\r]+/).filter(s => s.trim().length > 0);
  return sentences.map(s => s.trim());
}

function findKeywordsInSentence(sentence: string, textOffset: number): EmotionKeyword[] {
  const keywords: EmotionKeyword[] = [];
  
  for (const emotion of Object.keys(emotionLexicon) as EmotionType[]) {
    const words = emotionLexicon[emotion];
    const weights = emotionIntensityWeights[emotion];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let startIndex = 0;
      
      while (startIndex < sentence.length) {
        const index = sentence.indexOf(word, startIndex);
        if (index === -1) break;
        
        keywords.push({
          word,
          emotion,
          intensity: weights[i],
          position: textOffset + index
        });
        
        startIndex = index + word.length;
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
  const lengthFactor = Math.max(0.5, Math.min(1.5, 50 / sentenceLength));
  
  let intensity = Math.round((totalIntensity / keywords.length) * keywordFactor * lengthFactor);
  intensity = Math.max(1, Math.min(5, intensity));
  
  return intensity;
}

export function analyzeSentence(sentence: string, position: number, textOffset: number): SentenceAnalysis {
  const keywords = findKeywordsInSentence(sentence, textOffset);
  const dominantEmotion = calculateDominantEmotion(keywords);
  const intensity = calculateIntensity(keywords, sentence.length);
  
  return {
    text: sentence,
    keywords,
    dominantEmotion,
    intensity,
    position
  };
}

export function analyzeText(text: string): AnalysisResult {
  const sentences = splitSentences(text);
  const analyzedSentences: SentenceAnalysis[] = [];
  
  let textOffset = 0;
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const position = sentences.length > 1 ? i / (sentences.length - 1) : 0.5;
    analyzedSentences.push(analyzeSentence(sentence, position, textOffset));
    textOffset += sentence.length + 1;
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
    dominantEmotion
  };
}

export function getAllKeywords(result: AnalysisResult): EmotionKeyword[] {
  const allKeywords: EmotionKeyword[] = [];
  for (const sentence of result.sentences) {
    allKeywords.push(...sentence.keywords);
  }
  return allKeywords;
}
