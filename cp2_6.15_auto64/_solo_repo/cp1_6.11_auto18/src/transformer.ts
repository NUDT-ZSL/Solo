import * as THREE from 'three';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface StarPointData {
  id: number;
  text: string;
  frequency: number;
  sentimentScore: number;
  sentiment: SentimentType;
  color: string;
  brightness: number;
  startPosition: THREE.Vector3;
  controlPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  clusterId: number;
  delay: number;
  duration: number;
}

export interface StarConnectionData {
  fromId: number;
  toId: number;
  distance: number;
}

export interface TransformResult {
  stars: StarPointData[];
  connections: StarConnectionData[];
  clusterCount: number;
  maxDelay: number;
  maxDuration: number;
}

const SENTIMENT_DICT: Record<string, number> = {
  '喜悦': 2.0, '幸福': 2.0, '灿烂': 2.0, '辉煌': 2.0, '挚爱': 2.0,
  '快乐': 1.5, '温暖': 1.5, '美丽': 1.5, '希望': 1.5, '自由': 1.5,
  '生机': 1.5, '温柔': 1.5, '美好': 1.5, '璀璨': 1.5, '灵动': 1.5,
  '诗意': 1.5, '清澈': 1.5, '明净': 1.5, '蓬勃': 1.5, '盎然': 1.5,
  '欣慰': 1.5, '晨曦': 1.5, '彩虹': 1.5, '云端': 1.5, '碧波': 1.5,
  '光': 1.0, '明': 1.0, '爱': 1.0, '笑': 1.0, '花': 1.0,
  '梦': 1.0, '星': 1.0, '月': 1.0, '阳': 1.0, '春': 1.0,
  '风': 0.3, '欢': 1.0, '热情': 1.0, '甜蜜': 1.0, '闪耀': 1.0,
  '安': 0.6, '宁静': 0.8, '祥和': 0.8, '悠然': 0.8, '轻盈': 0.8,
  '暮色': 0.3, '清泉': 0.6, '微风': 0.4, '蓝天': 0.6, '朝露': 0.5,
  '落英': 0.2, '阳光': 1.2, '春风': 1.0, '光芒': 1.2,

  '悲伤': -2.0, '凄凉': -2.0, '断肠': -2.0, '破碎': -2.0, '凋零': -2.0,
  '孤独': -1.5, '忧伤': -1.5, '寂寞': -1.5, '惆怅': -1.5, '憔悴': -1.5,
  '彷徨': -1.5, '怅惘': -1.5, '寂寥': -1.5, '落寞': -1.5, '荒芜': -1.5,
  '幽怨': -1.5, '萧瑟': -1.5, '愁绪': -1.5, '迷茫': -1.2, '阴霾': -1.2,
  '寒': -1.0, '夜': -1.0, '愁': -1.0, '泪': -1.0, '苦': -1.0,
  '痛': -1.0, '残': -1.0, '断': -1.0, '冷': -1.0, '忧': -1.0,
  '哀': -1.0, '叹': -0.8, '离别': -1.2, '昏暗': -1.0, '沉': -0.8,
  '黄昏': -0.5, '残月': -0.8, '落叶': -0.6, '枯藤': -1.0, '古道': -0.4,
  '西风': -0.6, '孤舟': -0.8, '浊酒': -0.5, '余烬': -1.0, '霜': -0.7,
  '雪': -0.4, '雨': -0.3,
};

const NEGATION_WORDS = new Set([
  '不', '没', '无', '非', '未', '莫', '勿', '未必', '不曾',
  '不再', '毫无', '绝不', '从不', '并非', '难以',
]);

const DEGREE_WORDS: Record<string, number> = {
  '非常': 1.8, '十分': 1.8, '极其': 1.8, '极度': 1.8, '无比': 1.8,
  '万分': 1.8, '格外': 1.8, '特别': 1.7, '相当': 1.5, '很': 1.4,
  '有点': 0.6, '稍微': 0.6, '略微': 0.6, '稍稍': 0.6, '些许': 0.6,
  '略': 0.7, '颇': 1.3, '甚': 1.5,
};

const PHRASE_DICT = Array.from(new Set([
  ...Object.keys(SENTIMENT_DICT),
  ...Array.from(NEGATION_WORDS),
  ...Object.keys(DEGREE_WORDS),
  '星光', '夜色', '山河', '岁月', '人生', '梦境', '心事', '情思',
  '乡愁', '回忆', '思念', '相思', '眷恋', '邂逅', '相逢', '知己',
  '故人', '天涯', '咫尺', '明月', '清风', '落花', '流水', '青山',
  '白云', '炊烟', '小巷', '灯火', '阑珊', '心意', '光阴', '往事',
]));

const CLUSTER_CENTERS: Record<SentimentType, THREE.Vector3> = {
  positive: new THREE.Vector3(20, 5, 0),
  neutral: new THREE.Vector3(-15, 3, 10),
  negative: new THREE.Vector3(0, -8, -18),
};

const SENTIMENT_COLORS: Record<SentimentType, string> = {
  positive: '#FFD700',
  neutral: '#C0C0C0',
  negative: '#4A90D9',
};

const SENTIMENT_CLUSTER_ID: Record<SentimentType, number> = {
  positive: 0,
  neutral: 1,
  negative: 2,
};

function tokenize(text: string): string[] {
  const cleaned = text.replace(/[\s\u3000\n\r\t，。！？、；：""''（）《》【】…—\-\/\\,.!?;:()<>\[\]]+/g, ' ');
  const segments = cleaned.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];

  for (const seg of segments) {
    let i = 0;
    while (i < seg.length) {
      let matched = false;
      for (let len = Math.min(4, seg.length - i); len >= 2; len--) {
        const candidate = seg.slice(i, i + len);
        if (PHRASE_DICT.includes(candidate)) {
          tokens.push(candidate);
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const ch = seg[i];
        if (/[\u4e00-\u9fa5a-zA-Z0-9]/.test(ch)) {
          tokens.push(ch);
        }
        i++;
      }
    }
  }
  return tokens;
}

function getRawSentiment(token: string): number {
  if (SENTIMENT_DICT[token] !== undefined) return SENTIMENT_DICT[token];
  for (const [word, w] of Object.entries(SENTIMENT_DICT)) {
    if (token.includes(word) && token.length <= 4) return w * 0.7;
  }
  return 0;
}

function findNearestSentiment(tokens: string[], index: number, maxDist: number): { score: number; distance: number } | null {
  for (let d = 1; d <= maxDist; d++) {
    if (index - d >= 0) {
      const s = getRawSentiment(tokens[index - d]);
      if (s !== 0) return { score: s, distance: d };
    }
    if (index + d < tokens.length) {
      const s = getRawSentiment(tokens[index + d]);
      if (s !== 0) return { score: s, distance: d };
    }
  }
  return null;
}

function analyzeTokenSentiment(tokens: string[], index: number): number {
  const token = tokens[index];
  let baseScore = getRawSentiment(token);

  if (baseScore === 0) {
    const nearest = findNearestSentiment(tokens, index, 3);
    if (nearest) {
      const decay = Math.max(0.4, 1 - nearest.distance * 0.2);
      baseScore = nearest.score * decay * 0.6;
    }
  }

  if (baseScore !== 0) {
    const negWindowStart = Math.max(0, index - 2);
    let negated = false;
    for (let j = negWindowStart; j < index; j++) {
      if (NEGATION_WORDS.has(tokens[j])) {
        negated = true;
        break;
      }
    }
    if (negated) baseScore *= -1;

    if (index > 0) {
      const prev = tokens[index - 1];
      if (DEGREE_WORDS[prev] !== undefined) {
        baseScore *= DEGREE_WORDS[prev];
      }
    }
  }

  if (baseScore !== 0 && index > 0) {
    const prevScore = getRawSentiment(tokens[index - 1]);
    if (prevScore * baseScore < 0) {
      const context = findNearestSentiment(tokens, index, 5);
      if (context) {
        const contextSign = Math.sign(context.score);
        const curSign = Math.sign(baseScore);
        if (contextSign !== curSign && context.distance < 3) {
          baseScore = baseScore * 0.35 + context.score * (1 - context.distance * 0.15) * 0.65;
        }
      }
    }
  }

  if (baseScore !== 0 && index + 1 < tokens.length) {
    const nextScore = getRawSentiment(tokens[index + 1]);
    if (nextScore * baseScore < 0 && Math.abs(nextScore) > Math.abs(baseScore)) {
      baseScore = nextScore * 0.6 + baseScore * 0.4;
    }
  }

  return Math.max(-2, Math.min(2, baseScore));
}

function scoreToSentiment(score: number): SentimentType {
  if (score > 0.25) return 'positive';
  if (score < -0.25) return 'negative';
  return 'neutral';
}

function buildCooccurrenceMatrix(tokens: string[], vocab: string[]): number[][] {
  const windowSize = 5;
  const N = vocab.length;
  const idx = new Map(vocab.map((w, i) => [w, i]));
  const matrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const wordCount = new Array(N).fill(0);

  for (const t of tokens) {
    const i = idx.get(t);
    if (i !== undefined) wordCount[i]++;
  }

  for (let center = 0; center < tokens.length; center++) {
    const ci = idx.get(tokens[center]);
    if (ci === undefined) continue;
    const left = Math.max(0, center - Math.floor(windowSize / 2));
    const right = Math.min(tokens.length - 1, center + Math.floor(windowSize / 2));
    for (let j = left; j <= right; j++) {
      if (j === center) continue;
      const cj = idx.get(tokens[j]);
      if (cj !== undefined) {
        matrix[ci][cj] += 1;
        matrix[cj][ci] += 1;
      }
    }
  }

  const total = tokens.length;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (matrix[i][j] > 0 && wordCount[i] > 0 && wordCount[j] > 0) {
        const pmi = Math.log(
          (matrix[i][j] * total) / (wordCount[i] * wordCount[j]) + 1e-6
        );
        matrix[i][j] = Math.max(0, pmi);
      }
    }
  }
  return matrix;
}

function forceDirectedLayout(
  words: string[],
  coMatrix: number[][],
  center: THREE.Vector3,
  radius: number
): THREE.Vector3[] {
  const N = words.length;
  if (N === 0) return [];
  if (N === 1) return [center.clone()];

  const positions: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / N);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = radius * 0.55;
    positions.push(new THREE.Vector3(
      center.x + r * Math.sin(phi) * Math.cos(theta),
      center.y + r * Math.sin(phi) * Math.sin(theta),
      center.z + r * Math.cos(theta)
    ));
  }

  const area = radius * radius * Math.PI * 4;
  const k = Math.sqrt(area / Math.max(N, 1)) * 0.6;
  const iterations = 50;
  const tempStart = radius * 0.85;
  const disp = Array.from({ length: N }, () => new THREE.Vector3());

  for (let iter = 0; iter < iterations; iter++) {
    const temp = tempStart * (1 - iter / iterations);

    for (let i = 0; i < N; i++) disp[i].set(0, 0, 0);

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dz = positions[i].z - positions[j].z;
        let distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 0.01) distSq = 0.01;
        const dist = Math.sqrt(distSq);
        const repulse = (k * k) / dist;
        const fx = (dx / dist) * repulse;
        const fy = (dy / dist) * repulse;
        const fz = (dz / dist) * repulse;
        disp[i].x += fx; disp[i].y += fy; disp[i].z += fz;
        disp[j].x -= fx; disp[j].y -= fy; disp[j].z -= fz;
      }
    }

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const affinity = coMatrix[i][j];
        if (affinity <= 0) continue;
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dz = positions[j].z - positions[i].z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.01) dist = 0.01;
        const attract = (dist * dist / k) * Math.min(affinity * 3, 3.5);
        const fx = (dx / dist) * attract;
        const fy = (dy / dist) * attract;
        const fz = (dz / dist) * attract;
        disp[i].x += fx; disp[i].y += fy; disp[i].z += fz;
        disp[j].x -= fx; disp[j].y -= fy; disp[j].z -= fz;
      }
    }

    for (let i = 0; i < N; i++) {
      const dLen = Math.sqrt(disp[i].x ** 2 + disp[i].y ** 2 + disp[i].z ** 2);
      if (dLen > 0.001) {
        const ratio = Math.min(dLen, temp) / dLen;
        positions[i].x += disp[i].x * ratio;
        positions[i].y += disp[i].y * ratio;
        positions[i].z += disp[i].z * ratio;
      }
    }

    for (let i = 0; i < N; i++) {
      const dx = positions[i].x - center.x;
      const dy = positions[i].y - center.y;
      const dz = positions[i].z - center.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > radius) {
        const s = radius / d;
        positions[i].x = center.x + dx * s;
        positions[i].y = center.y + dy * s;
        positions[i].z = center.z + dz * s;
      }
    }
  }

  return positions;
}

export class TextTransformer {
  static transform(text: string, startPosition: THREE.Vector3): TransformResult {
    const rawTokens = tokenize(text);
    if (rawTokens.length === 0) {
      return { stars: [], connections: [], clusterCount: 0, maxDelay: 0, maxDuration: 0 };
    }

    const freqMap = new Map<string, number>();
    for (const t of rawTokens) freqMap.set(t, (freqMap.get(t) || 0) + 1);

    const uniqueTokens = Array.from(freqMap.keys()).slice(0, 200);
    const sentimentScores = new Map<string, number>();

    for (let i = 0; i < rawTokens.length; i++) {
      const t = rawTokens[i];
      if (!uniqueTokens.includes(t)) continue;
      if (!sentimentScores.has(t)) {
        sentimentScores.set(t, analyzeTokenSentiment(rawTokens, i));
      }
    }

    const maxFreq = Math.max(...Array.from(freqMap.values()), 1);
    const clusters: Record<SentimentType, string[]> = {
      positive: [], neutral: [], negative: [],
    };
    for (const t of uniqueTokens) {
      const s = scoreToSentiment(sentimentScores.get(t) || 0);
      clusters[s].push(t);
    }

    const positionsMap = new Map<string, THREE.Vector3>();
    for (const sent of ['positive', 'neutral', 'negative'] as SentimentType[]) {
      const words = clusters[sent];
      if (words.length === 0) continue;
      const coMat = buildCooccurrenceMatrix(rawTokens, words);
      const center = CLUSTER_CENTERS[sent];
      const radius = 8 + Math.min(words.length / 12, 3.5);
      const positions = forceDirectedLayout(words, coMat, center, radius);
      words.forEach((w, i) => positionsMap.set(w, positions[i]));
    }

    const stars: StarPointData[] = [];
    let maxDelay = 0;
    let maxDuration = 0;
    let id = 0;

    for (const t of uniqueTokens) {
      const rawFreq = freqMap.get(t)!;
      const frequency = rawFreq / maxFreq;
      const score = sentimentScores.get(t) || 0;
      const sentiment = scoreToSentiment(score);
      const targetPos = positionsMap.get(t)!;

      const baseDelay = 80;
      const orderDelay = Math.min(id * 11, 480);
      const jitterDelay = Math.abs((Math.sin(id * 12.9898) * 43758.5453) % 1) * 200;
      const delay = baseDelay + orderDelay + jitterDelay;
      const duration = 2000 + Math.abs(Math.sin(id * 1.7)) * 550 + frequency * 250;

      const startJitter = new THREE.Vector3(
        (Math.sin(id * 3.3) * 6),
        (Math.cos(id * 2.1) * 4),
        (Math.sin(id * 1.9) * 3)
      );
      const start = startPosition.clone().add(startJitter);

      const mid = start.clone().add(targetPos).multiplyScalar(0.5);
      const control = new THREE.Vector3(
        mid.x + (targetPos.x - start.x) * 0.15 + Math.sin(id * 1.3) * 5,
        mid.y + 10 + Math.cos(id * 2.1) * 4,
        mid.z + (targetPos.z - start.z) * 0.1 + Math.sin(id * 0.9) * 4
      );

      maxDelay = Math.max(maxDelay, delay);
      maxDuration = Math.max(maxDuration, duration);

      stars.push({
        id: id++,
        text: t,
        frequency,
        sentimentScore: score,
        sentiment,
        color: SENTIMENT_COLORS[sentiment],
        brightness: 0.35 + Math.min(frequency * 1.2 + Math.abs(score) * 0.2, 1.2),
        startPosition: start,
        controlPosition: control,
        targetPosition: targetPos,
        clusterId: SENTIMENT_CLUSTER_ID[sentiment],
        delay,
        duration,
      });
    }

    const connections = this.buildConnections(stars, rawTokens);
    return {
      stars,
      connections,
      clusterCount: 3,
      maxDelay,
      maxDuration,
    };
  }

  private static buildConnections(
    stars: StarPointData[],
    rawTokens: string[]
  ): StarConnectionData[] {
    const connections: StarConnectionData[] = [];
    const textToId = new Map(stars.map(s => [s.text, s.id]));

    const byCluster: Record<number, StarPointData[]> = { 0: [], 1: [], 2: [] };
    for (const s of stars) byCluster[s.clusterId].push(s);

    const windowSize = 5;
    const pairCount = new Map<string, number>();
    for (let c = 0; c < rawTokens.length; c++) {
      const l = Math.max(0, c - Math.floor(windowSize / 2));
      const r = Math.min(rawTokens.length - 1, c + Math.floor(windowSize / 2));
      for (let i = l; i <= r; i++) {
        if (i === c) continue;
        const a = rawTokens[c], b = rawTokens[i];
        if (!textToId.has(a) || !textToId.has(b)) continue;
        const ai = textToId.get(a)!, bi = textToId.get(b)!;
        const key = ai < bi ? `${ai}|${bi}` : `${bi}|${ai}`;
        pairCount.set(key, (pairCount.get(key) || 0) + 1);
      }
    }

    for (const clusterStars of Object.values(byCluster)) {
      const MAX_PER_STAR = 3;
      const MAX_DIST = 18;

      for (let i = 0; i < clusterStars.length; i++) {
        const a = clusterStars[i];
        const scored: { id: number; dist: number; cooc: number }[] = [];
        for (let j = 0; j < clusterStars.length; j++) {
          if (i === j) continue;
          const b = clusterStars[j];
          const d = a.targetPosition.distanceTo(b.targetPosition);
          if (d > MAX_DIST) continue;
          const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          const cooc = pairCount.get(key) || 0;
          scored.push({ id: b.id, dist: d, cooc });
        }
        scored.sort((x, y) => (y.cooc * 7 - y.dist * 0.45) - (x.cooc * 7 - x.dist * 0.45));
        for (const c of scored.slice(0, MAX_PER_STAR)) {
          const small = Math.min(a.id, c.id);
          const large = Math.max(a.id, c.id);
          if (connections.some(conn => conn.fromId === small && conn.toId === large)) continue;
          const weight = Math.max(0, 1 - c.dist / MAX_DIST) * 0.45 + Math.min(c.cooc / 4, 1) * 0.55;
          connections.push({ fromId: small, toId: large, distance: Math.max(0.1, Math.min(1, weight)) });
        }
      }
    }

    return connections;
  }
}
