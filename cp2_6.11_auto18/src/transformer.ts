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

const POSITIVE_WORDS = [
  '爱', '喜欢', '美好', '光明', '希望', '温暖', '快乐', '幸福', '微笑', '阳光',
  '春天', '花朵', '美丽', '温柔', '善良', '真诚', '勇敢', '希望', '梦想', '自由',
  '璀璨', '绚烂', '静谧', '悠然', '灿烂', '芬芳', '轻盈', '灵动', '清澈', '纯粹',
  '喜悦', '欢愉', '宁静', '安详', '平和', '和谐', '优雅', '华美', '壮丽', '巍峨',
  '澎湃', '激昂', '热烈', '深情', '真挚', '热诚', '慷慨', '仁慈', '正义', '智慧'
];

const NEGATIVE_WORDS = [
  '悲伤', '痛苦', '绝望', '黑暗', '寒冷', '孤独', '寂寞', '恐惧', '忧伤', '忧愁',
  '阴霾', '暴雨', '狂风', '凋零', '枯萎', '荒芜', '凄凉', '惨淡', '哀伤', '悲愤',
  '迷茫', '彷徨', '无助', '失落', '沮丧', '忧郁', '沉闷', '压抑', '窒息', '煎熬',
  '苍茫', '萧瑟', '凛冽', '刺骨', '死寂', '空洞', '虚无', '混沌', '污浊', '腐朽',
  '挣扎', '战栗', '颤抖', '哭泣', '呐喊', '沉默', '冰冷', '僵硬', '破碎', '撕裂'
];

const STOP_WORDS = [
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '他', '她', '它', '们', '而', '与', '或', '等', '中', '里'
];

const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: '#FFD700',
  neutral: '#C0C0C0',
  negative: '#4A90D9'
};

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function segmentChinese(text: string): string[] {
  const cleanText = text.replace(/[，。！？、；：""''（）\[\]【】\s\n\r\t]/g, '');
  const words: string[] = [];
  let i = 0;

  while (i < cleanText.length) {
    let matched = false;

    if (i < cleanText.length - 1) {
      const bigram = cleanText.substring(i, i + 2);
      if (POSITIVE_WORDS.includes(bigram) || NEGATIVE_WORDS.includes(bigram)) {
        words.push(bigram);
        i += 2;
        matched = true;
      }
    }

    if (!matched) {
      const char = cleanText[i];
      if (!STOP_WORDS.includes(char) && /[\u4e00-\u9fa5a-zA-Z0-9]/.test(char)) {
        words.push(char);
      }
      i++;
    }
  }

  return words;
}

function countFrequency(words: string[]): Map<string, number> {
  const freqMap = new Map<string, number>();
  for (const word of words) {
    freqMap.set(word, (freqMap.get(word) || 0) + 1);
  }
  return freqMap;
}

function analyzeSentiment(word: string): Sentiment {
  for (const positive of POSITIVE_WORDS) {
    if (word.includes(positive) || positive.includes(word)) {
      return 'positive';
    }
  }
  for (const negative of NEGATIVE_WORDS) {
    if (word.includes(negative) || negative.includes(word)) {
      return 'negative';
    }
  }
  return 'neutral';
}

function normalizeBrightness(freq: number, maxFreq: number): number {
  const normalized = freq / maxFreq;
  return 0.5 + normalized * 1.5;
}

function generateSemanticGroups(
  words: string[],
  freqMap: Map<string, number>,
  rng: SeededRandom
): Map<string, number> {
  const groupMap = new Map<string, number>();
  const uniqueWords = Array.from(new Set(words));
  const groupCount = Math.min(5, Math.max(2, Math.floor(uniqueWords.length / 10) + 2));

  const centroids: string[] = [];
  const sortedWords = [...uniqueWords].sort((a, b) =>
    (freqMap.get(b) || 0) - (freqMap.get(a) || 0)
  );

  for (let i = 0; i < groupCount && i < sortedWords.length; i++) {
    centroids.push(sortedWords[i]);
    groupMap.set(sortedWords[i], i);
  }

  for (const word of uniqueWords) {
    if (groupMap.has(word)) continue;

    let bestGroup = 0;
    let bestScore = -Infinity;

    for (let g = 0; g < centroids.length; g++) {
      const centroid = centroids[g];
      const sentiment = analyzeSentiment(word);
      const centroidSentiment = analyzeSentiment(centroid);
      let score = 0;

      if (sentiment === centroidSentiment) score += 2;
      if (word.length === centroid.length) score += 1;
      if (freqMap.get(word) === freqMap.get(centroid)) score += 0.5;

      score += rng.range(0, 0.5);

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
  const phi = Math.acos(-1 + (2 * groupIndex) / groupCount);
  const theta = Math.sqrt(groupCount * Math.PI) * phi + rng.range(-0.3, 0.3);

  const radius = 6;
  const x = radius * Math.cos(theta) * Math.sin(phi);
  const y = radius * Math.sin(theta) * Math.sin(phi);
  const z = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

function generateTargetPosition(
  groupCenter: THREE.Vector3,
  rng: SeededRandom
): THREE.Vector3 {
  const offset = new THREE.Vector3(
    rng.range(-1.5, 1.5),
    rng.range(-1.5, 1.5),
    rng.range(-1.5, 1.5)
  );
  return groupCenter.clone().add(offset);
}

function generateConnections(
  stars: StarData[],
  rng: SeededRandom
): ConnectionData[] {
  const connections: ConnectionData[] = [];
  const groups = new Map<number, StarData[]>();

  for (const star of stars) {
    if (!groups.has(star.semanticGroup)) {
      groups.set(star.semanticGroup, []);
    }
    groups.get(star.semanticGroup)!.push(star);
  }

  for (const groupStars of groups.values()) {
    for (let i = 0; i < groupStars.length; i++) {
      for (let j = i + 1; j < groupStars.length; j++) {
        const from = groupStars[i];
        const to = groupStars[j];
        const distance = from.targetPosition.distanceTo(to.targetPosition);

        if (distance < 3.5 && rng.next() > 0.3) {
          connections.push({
            from: from.id,
            to: to.id,
            distance: distance,
            opacity: Math.max(0.1, Math.min(0.5, 0.6 - distance / 10))
          });
        }
      }
    }
  }

  const maxConnections = Math.min(300, stars.length * 2);
  return connections.slice(0, maxConnections);
}

export function transformText(
  text: string,
  _startPosition: THREE.Vector3
): TransformResult {
  const rng = new SeededRandom(hashString(text));

  const words = segmentChinese(text);
  if (words.length === 0) {
    return { stars: [], connections: [] };
  }

  const freqMap = countFrequency(words);
  const maxFreq = Math.max(...freqMap.values());

  const uniqueWords = Array.from(new Set(words));
  const groupMap = generateSemanticGroups(words, freqMap, rng);
  const groupCount = new Set(groupMap.values()).size;

  const groupCenters = new Map<number, THREE.Vector3>();
  for (let i = 0; i < groupCount; i++) {
    groupCenters.set(i, generateGroupCenter(i, groupCount, rng));
  }

  const wordIndex = new Map<string, number>();
  words.forEach((word, idx) => {
    if (!wordIndex.has(word)) {
      wordIndex.set(word, idx);
    }
  });

  const stars: StarData[] = uniqueWords.map((word, index) => {
    const frequency = freqMap.get(word) || 1;
    const sentiment = analyzeSentiment(word);
    const semanticGroup = groupMap.get(word) || 0;
    const groupCenter = groupCenters.get(semanticGroup) || new THREE.Vector3();

    return {
      id: `star-${index}`,
      text: word,
      frequency,
      sentiment,
      color: SENTIMENT_COLORS[sentiment],
      brightness: normalizeBrightness(frequency, maxFreq),
      targetPosition: generateTargetPosition(groupCenter, rng),
      semanticGroup,
      flyDuration: 1.5 + rng.range(0, 1.0),
      flyDelay: (wordIndex.get(word) || 0) * 0.02 + rng.range(0, 0.3)
    };
  });

  const connections = generateConnections(stars, rng);

  return { stars, connections };
}

export const COLORS = SENTIMENT_COLORS;
