import * as THREE from 'three';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface StarData {
  id: string;
  text: string;
  frequency: number;
  sentiment: Sentiment;
  color: string;
  brightness: number;
  targetPosition: THREE.Vector3;
  semanticGroup: number;
  flyDuration: number;
  flyDelay: number;
}

export interface ConnectionData {
  from: string;
  to: string;
  distance: number;
  opacity: number;
}

export interface TransformResult {
  stars: StarData[];
  connections: ConnectionData[];
}

type SentimentWord = {
  word: string;
  score: number;
  category?: string;
};

const POSITIVE_WORDS: SentimentWord[] = [
  { word: '爱', score: 3, category: '情感' },
  { word: '喜欢', score: 2.5, category: '情感' },
  { word: '热爱', score: 3, category: '情感' },
  { word: '美好', score: 3.2, category: '状态' },
  { word: '光明', score: 3, category: '意象' },
  { word: '希望', score: 3, category: '心理' },
  { word: '温暖', score: 2.5, category: '感觉' },
  { word: '快乐', score: 3, category: '情绪' },
  { word: '幸福', score: 3.5, category: '情绪' },
  { word: '微笑', score: 2, category: '动作' },
  { word: '阳光', score: 2.5, category: '意象' },
  { word: '春天', score: 2, category: '季节' },
  { word: '花朵', score: 2, category: '自然' },
  { word: '美丽', score: 2.5, category: '形容' },
  { word: '温柔', score: 2.5, category: '性格' },
  { word: '善良', score: 2.5, category: '性格' },
  { word: '真诚', score: 3, category: '性格' },
  { word: '勇敢', score: 2.5, category: '性格' },
  { word: '梦想', score: 3, category: '心理' },
  { word: '自由', score: 3, category: '状态' },
  { word: '璀璨', score: 3.2, category: '形容' },
  { word: '星光', score: 3, category: '意象' },
  { word: '绚烂', score: 2.5, category: '形容' },
  { word: '静谧', score: 1.5, category: '状态' },
  { word: '悠然', score: 1.5, category: '状态' },
  { word: '灿烂', score: 2.5, category: '形容' },
  { word: '芬芳', score: 2, category: '感觉' },
  { word: '轻盈', score: 1.5, category: '状态' },
  { word: '灵动', score: 2, category: '形容' },
  { word: '清澈', score: 2, category: '形容' },
  { word: '纯粹', score: 2, category: '形容' },
  { word: '喜悦', score: 3, category: '情绪' },
  { word: '欢愉', score: 3, category: '情绪' },
  { word: '宁静', score: 1.5, category: '状态' },
  { word: '安详', score: 1.5, category: '状态' },
  { word: '平和', score: 1.5, category: '状态' },
  { word: '和谐', score: 2, category: '状态' },
  { word: '优雅', score: 2, category: '形容' },
  { word: '华美', score: 2, category: '形容' },
  { word: '壮丽', score: 2.5, category: '形容' },
  { word: '巍峨', score: 2, category: '形容' },
  { word: '澎湃', score: 1.5, category: '状态' },
  { word: '激昂', score: 1.5, category: '情绪' },
  { word: '热烈', score: 2, category: '情绪' },
  { word: '深情', score: 2.5, category: '情感' },
  { word: '真挚', score: 3, category: '性格' },
  { word: '热诚', score: 2.5, category: '性格' },
  { word: '慷慨', score: 2.5, category: '性格' },
  { word: '仁慈', score: 2.5, category: '性格' },
  { word: '正义', score: 2.5, category: '品德' },
  { word: '智慧', score: 2.5, category: '品德' },
  { word: '憧憬', score: 2.5, category: '心理' },
  { word: '珍藏', score: 2, category: '动作' },
  { word: '铭记', score: 2, category: '动作' },
  { word: '闪耀', score: 2, category: '状态' },
  { word: '永恒', score: 2, category: '状态' },
  { word: '如诗', score: 2, category: '修辞' },
  { word: '如歌', score: 2, category: '修辞' },
  { word: '涟漪', score: 1, category: '自然' },
  { word: '星河', score: 2, category: '意象' },
  { word: '月光', score: 1.5, category: '意象' }
];

const NEGATIVE_WORDS: SentimentWord[] = [
  { word: '悲伤', score: 3, category: '情绪' },
  { word: '痛苦', score: 3.5, category: '情绪' },
  { word: '绝望', score: 4, category: '心理' },
  { word: '黑暗', score: 3, category: '意象' },
  { word: '寒冷', score: 2.5, category: '感觉' },
  { word: '孤独', score: 3, category: '状态' },
  { word: '寂寞', score: 3, category: '状态' },
  { word: '恐惧', score: 3.5, category: '情绪' },
  { word: '忧伤', score: 2.5, category: '情绪' },
  { word: '忧愁', score: 2.5, category: '情绪' },
  { word: '阴霾', score: 2.5, category: '意象' },
  { word: '暴雨', score: 2, category: '自然' },
  { word: '狂风', score: 2, category: '自然' },
  { word: '凋零', score: 2.5, category: '状态' },
  { word: '枯萎', score: 2.5, category: '状态' },
  { word: '荒芜', score: 2.5, category: '状态' },
  { word: '凄凉', score: 3, category: '状态' },
  { word: '惨淡', score: 3, category: '状态' },
  { word: '哀伤', score: 3, category: '情绪' },
  { word: '悲愤', score: 3.5, category: '情绪' },
  { word: '迷茫', score: 2.5, category: '心理' },
  { word: '彷徨', score: 2.5, category: '心理' },
  { word: '无助', score: 3, category: '心理' },
  { word: '失落', score: 2.5, category: '心理' },
  { word: '沮丧', score: 3, category: '情绪' },
  { word: '忧郁', score: 3, category: '情绪' },
  { word: '沉闷', score: 2, category: '状态' },
  { word: '压抑', score: 2.5, category: '心理' },
  { word: '窒息', score: 3, category: '感觉' },
  { word: '煎熬', score: 3.5, category: '状态' },
  { word: '苍茫', score: 1.5, category: '意象' },
  { word: '萧瑟', score: 2, category: '状态' },
  { word: '凛冽', score: 2, category: '感觉' },
  { word: '刺骨', score: 2.5, category: '感觉' },
  { word: '死寂', score: 2.5, category: '状态' },
  { word: '空洞', score: 2.5, category: '状态' },
  { word: '虚无', score: 2.5, category: '状态' },
  { word: '混沌', score: 2, category: '状态' },
  { word: '污浊', score: 2, category: '状态' },
  { word: '腐朽', score: 2.5, category: '状态' },
  { word: '挣扎', score: 2.5, category: '动作' },
  { word: '战栗', score: 2.5, category: '动作' },
  { word: '颤抖', score: 2, category: '动作' },
  { word: '哭泣', score: 2.5, category: '动作' },
  { word: '呐喊', score: 2, category: '动作' },
  { word: '沉默', score: 1.5, category: '状态' },
  { word: '冰冷', score: 2.5, category: '感觉' },
  { word: '僵硬', score: 2, category: '状态' },
  { word: '破碎', score: 2.5, category: '状态' },
  { word: '撕裂', score: 3, category: '动作' },
  { word: '飘零', score: 2, category: '状态' },
  { word: '流逝', score: 1.5, category: '状态' },
  { word: '离别', score: 2.5, category: '事件' },
  { word: '泪水', score: 2.5, category: '意象' },
  { word: '长叹', score: 2, category: '动作' },
  { word: '无声', score: 1.5, category: '状态' },
  { word: '飘零', score: 2, category: '状态' },
  { word: '憔悴', score: 2.5, category: '状态' },
  { word: '黯然', score: 2.5, category: '状态' },
  { word: '惆怅', score: 2.5, category: '情绪' },
  { word: '怅惘', score: 2.5, category: '情绪' }
];

const NEGATION_WORDS = ['不', '没', '无', '非', '未', '勿', '莫', '别'];

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '他', '她', '它', '们', '而', '与', '或', '等', '中', '里',
  '对', '为', '以', '把', '被', '让', '从', '向', '给', '比', '如', '因', '但',
  '还', '又', '才', '只', '能', '可以', '这个', '那个', '什么', '怎么', '怎样',
  '吗', '呢', '吧', '啊', '呀', '哦', '嗯', '哈', '呵', '嘿'
]);

const POSITIVE_MAP = new Map(POSITIVE_WORDS.map(w => [w.word, w]));
const NEGATIVE_MAP = new Map(NEGATIVE_WORDS.map(w => [w.word, w]));

const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: '#FFD700',
  neutral: '#C0C0C0',
  negative: '#4A90D9'
};

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed >>> 0; }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xFFFFFFFF;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

function countCharOccurrences(text: string, char: string): number {
  let count = 0;
  const len = text.length;
  const charLen = char.length;
  for (let i = 0; i <= len - charLen; i++) {
    if (text.substring(i, i + charLen) === char) count++;
  }
  return count;
}

function segmentChinese(text: string): string[] {
  const words: string[] = [];
  let i = 0;
  const textLen = text.length;

  while (i < textLen) {
    const c = text[i];

    if (/[，。！？、；：""''（）\[\]【】《》\s\n\r\t,.!?;:\(\)\[\]"']/.test(c)) {
      i++;
      continue;
    }

    if (i < textLen - 1) {
      const bigram = text.substring(i, i + 2);
      if (POSITIVE_MAP.has(bigram) || NEGATIVE_MAP.has(bigram)) {
        words.push(bigram);
        i += 2;
        continue;
      }

      if (i < textLen - 2) {
        const trigram = text.substring(i, i + 3);
        if (POSITIVE_MAP.has(trigram) || NEGATIVE_MAP.has(trigram)) {
          words.push(trigram);
          i += 3;
          continue;
        }
      }
    }

    if ((!STOP_WORDS.has(c) || NEGATION_WORDS.includes(c)) && /[\u4e00-\u9fa5a-zA-Z0-9]/.test(c)) {
      words.push(c);
    }
    i++;
  }

  return words;
}

function countFrequency(words: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return freq;
}

interface SentimentResult {
  sentiment: Sentiment;
  score: number;
  confidence: number;
}

function analyzeSentimentWord(word: string, fullText: string, wordIndex: number): SentimentResult {
  let posScore = 0;
  let negScore = 0;

  for (const [w, info] of POSITIVE_MAP) {
    if (word.includes(w) || w.includes(word)) {
      posScore += info.score * (word.length === w.length ? 1 : 0.6);
    }
  }

  for (const [w, info] of NEGATIVE_MAP) {
    if (word.includes(w) || w.includes(word)) {
      negScore += info.score * (word.length === w.length ? 1 : 0.6);
    }
  }

  if (word.length === 1) {
    const contextCount = countCharOccurrences(fullText, word);
    if (contextCount >= 2) {
      const rel = contextCount / fullText.length * 100;
      if (rel > 0.5) {
        if (posScore > 0) posScore += 0.5;
        if (negScore > 0) negScore += 0.5;
      }
    }
  }

  let negationMultiplier = 1;
  for (let offset = 1; offset <= 2; offset++) {
    const checkPos = wordIndex - offset;
    if (checkPos >= 0) {
      const prevChar = fullText[checkPos];
      if (NEGATION_WORDS.includes(prevChar)) {
        negationMultiplier = -0.7;
        break;
      }
    }
  }

  const threshold = 1.2;
  let diff = (posScore - negScore) * negationMultiplier;
  let maxScore = Math.max(posScore, negScore) * (negationMultiplier < 0 ? 0.7 : 1);
  let confidence = Math.min(1, maxScore / 4);

  if (confidence < 0.3) {
    return { sentiment: 'neutral', score: 0, confidence };
  }

  if (Math.abs(diff) < threshold || maxScore < threshold) {
    return { sentiment: 'neutral', score: 0, confidence: maxScore / 5 };
  }

  if (diff > 0) {
    return { sentiment: 'positive', score: diff, confidence };
  } else {
    return { sentiment: 'negative', score: diff, confidence };
  }
}

function adjustColorForSentiment(baseColor: string, result: SentimentResult): string {
  if (result.sentiment === 'neutral') return baseColor;
  return baseColor;
}

function normalizeBrightness(freq: number, maxFreq: number, confidence: number): number {
  const freqRatio = freq / maxFreq;
  const boost = 0.5 + confidence * 0.5;
  return Math.min(2.5, 0.5 + freqRatio * 1.5 * boost);
}

function generateSemanticGroups(
  words: string[],
  freqMap: Map<string, number>,
  rng: SeededRandom,
  sentimentMap: Map<string, SentimentResult>
): Map<string, number> {
  const groupMap = new Map<string, number>();
  const uniqueWords = Array.from(new Set(words));
  const groupCount = Math.min(5, Math.max(2, Math.floor(uniqueWords.length / 12) + 2));

  const centroids: string[] = [];
  const sorted = [...uniqueWords].sort((a, b) => {
    const fa = freqMap.get(a) || 0;
    const fb = freqMap.get(b) || 0;
    const sa = sentimentMap.get(a)?.confidence || 0;
    const sb = sentimentMap.get(b)?.confidence || 0;
    return (fb * (1 + sb)) - (fa * (1 + sa));
  });

  const usedSentiments = new Set<Sentiment>();
  for (let i = 0; i < sorted.length && centroids.length < groupCount; i++) {
    const w = sorted[i];
    const s = sentimentMap.get(w)?.sentiment || 'neutral';
    if (!usedSentiments.has(s) || centroids.length >= groupCount - 1) {
      centroids.push(w);
      groupMap.set(w, centroids.length - 1);
      usedSentiments.add(s);
    }
  }

  while (centroids.length < groupCount && sorted.length > centroids.length) {
    const w = sorted[centroids.length];
    centroids.push(w);
    groupMap.set(w, centroids.length - 1);
  }

  for (const word of uniqueWords) {
    if (groupMap.has(word)) continue;

    const sentiment = sentimentMap.get(word)?.sentiment || 'neutral';
    const conf = sentimentMap.get(word)?.confidence || 0;
    const freq = freqMap.get(word) || 0;

    let bestGroup = 0;
    let bestScore = -Infinity;

    for (let g = 0; g < centroids.length; g++) {
      const centroid = centroids[g];
      const centSent = sentimentMap.get(centroid)?.sentiment || 'neutral';
      const centFreq = freqMap.get(centroid) || 0;

      let score = 0;
      if (sentiment === centSent) score += 3 * (0.5 + conf);
      if (word.length === centroid.length) score += 1;
      if (Math.sign(freq - centFreq) === 0) score += 0.5;

      const commonChars = [...new Set([...word])].filter(c => centroid.includes(c)).length;
      score += commonChars * 0.5;

      score += rng.range(-0.2, 0.2);

      if (score > bestScore) {
        bestScore = score;
        bestGroup = g;
      }
    }
    groupMap.set(word, bestGroup);
  }
  return groupMap;
}

function generateGroupCenter(
  groupIndex: number,
  groupCount: number,
  rng: SeededRandom
): THREE.Vector3 {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const phi = Math.acos(1 - 2 * (groupIndex + 0.5) / groupCount);
  const theta = golden * groupIndex + rng.range(-0.4, 0.4);
  const radius = 6 + rng.range(-0.5, 0.5);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

function generateTargetPosition(
  groupCenter: THREE.Vector3,
  rng: SeededRandom
): THREE.Vector3 {
  const phi = rng.range(0, Math.PI * 2);
  const theta = Math.acos(rng.range(-1, 1));
  const r = rng.range(0.4, 1.6);
  return groupCenter.clone().add(new THREE.Vector3(
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.sin(theta) * Math.sin(phi),
    r * Math.cos(theta)
  ));
}

function generateConnections(
  stars: StarData[],
  rng: SeededRandom
): ConnectionData[] {
  const connections: ConnectionData[] = [];
  const groups = new Map<number, StarData[]>();
  for (const s of stars) {
    if (!groups.has(s.semanticGroup)) groups.set(s.semanticGroup, []);
    groups.get(s.semanticGroup)!.push(s);
  }

  for (const groupStars of groups.values()) {
    const n = groupStars.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = groupStars[i];
        const b = groupStars[j];
        const dist = a.targetPosition.distanceTo(b.targetPosition);
        if (dist < 3.2 && rng.next() > 0.25) {
          connections.push({
            from: a.id, to: b.id,
            distance: dist,
            opacity: Math.max(0.08, Math.min(0.55, 0.65 - dist / 8))
          });
        }
      }
    }
  }

  const maxConn = Math.min(150, stars.length * 1.5);
  connections.sort((a, b) => a.distance - b.distance);
  return connections.slice(0, maxConn);
}

export function transformText(
  text: string,
  _startPosition: THREE.Vector3
): TransformResult {
  const rng = new SeededRandom(hashString(text));
  const words = segmentChinese(text);
  if (words.length === 0) return { stars: [], connections: [] };

  const freqMap = countFrequency(words);
  const maxFreq = Math.max(...freqMap.values());

  const sentimentCache = new Map<string, SentimentResult>();
  for (const w of new Set(words)) {
    const wordIndex = text.indexOf(w);
    sentimentCache.set(w, analyzeSentimentWord(w, text, wordIndex >= 0 ? wordIndex : 0));
  }

  const uniqueWords = Array.from(new Set(words));
  const groupMap = generateSemanticGroups(words, freqMap, rng, sentimentCache);
  const groupCount = new Set(groupMap.values()).size;

  const groupCenters = new Map<number, THREE.Vector3>();
  for (let i = 0; i < groupCount; i++) {
    groupCenters.set(i, generateGroupCenter(i, groupCount, rng));
  }

  const wordOrder = new Map<string, number>();
  words.forEach((w, idx) => {
    if (!wordOrder.has(w)) wordOrder.set(w, idx);
  });

  const stars: StarData[] = uniqueWords.map((word, index) => {
    const frequency = freqMap.get(word) || 1;
    const result = sentimentCache.get(word) || { sentiment: 'neutral' as Sentiment, score: 0, confidence: 0 };
    const semanticGroup = groupMap.get(word) || 0;
    const center = groupCenters.get(semanticGroup) || new THREE.Vector3();
    const order = wordOrder.get(word) || 0;

    return {
      id: `star-${index}`,
      text: word,
      frequency,
      sentiment: result.sentiment,
      color: adjustColorForSentiment(SENTIMENT_COLORS[result.sentiment], result),
      brightness: normalizeBrightness(frequency, maxFreq, result.confidence),
      targetPosition: generateTargetPosition(center, rng),
      semanticGroup,
      flyDuration: 1.6 + rng.range(0.3, 1.0),
      flyDelay: order * 0.018 + rng.range(0, 0.35)
    };
  });

  const connections = generateConnections(stars, rng);
  return { stars, connections };
}

export const COLORS = SENTIMENT_COLORS;
