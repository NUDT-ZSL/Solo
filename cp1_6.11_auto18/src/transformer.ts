import * as THREE from 'three';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface StarPointData {
  id: number;
  text: string;
  frequency: number;
  brightness: number;
  sentiment: SentimentType;
  color: string;
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
}

const POSITIVE_WORDS = new Set([
  '光','明','希望','爱','温暖','美丽','快乐','喜悦','幸福','光芒',
  '星','月','阳光','春风','花','梦','自由','生机','灿烂','温柔',
  '美好','笑','欢','热情','甜蜜','辉煌','璀璨','闪耀','灵动','诗意',
  '安','宁静','祥和','悠然','轻盈','清澈','明净','蓬勃','盎然','欣慰',
  '晨曦','暮色','清泉','微风','彩虹','云端','蓝天','碧波','朝露','落英'
]);

const NEGATIVE_WORDS = new Set([
  '夜','寒','孤独','忧伤','愁','离别','寂寞','悲伤','凄凉','萧瑟',
  '冷','雨','风','霜','雪','泪','苦','痛','忧','愁绪',
  '迷茫','彷徨','怅惘','寂寥','落寞','惆怅','憔悴','破碎','凋零','荒芜',
  '沉','昏暗','阴霾','落寞','幽怨','哀','叹','残','碎','断',
  '黄昏','残月','落叶','枯藤','古道','西风','断肠','孤舟','浊酒','余烬'
]);

const PHRASE_DICT = [
  '希望','温暖','美丽','快乐','幸福','光芒','阳光','春风','自由','生机',
  '灿烂','温柔','美好','热情','甜蜜','辉煌','璀璨','闪耀','灵动','诗意',
  '宁静','祥和','悠然','轻盈','清澈','明净','蓬勃','盎然','欣慰','晨曦',
  '暮色','清泉','微风','彩虹','云端','蓝天','碧波','朝露','落英','孤独',
  '忧伤','离别','寂寞','悲伤','凄凉','萧瑟','愁绪','迷茫','彷徨','怅惘',
  '寂寥','落寞','惆怅','憔悴','破碎','凋零','荒芜','昏暗','阴霾','幽怨',
  '黄昏','残月','落叶','枯藤','古道','西风','断肠','孤舟','浊酒','余烬',
  '星光','夜色','山河','岁月','人生','梦境','心事','情思','乡愁','回忆',
  '思念','相思','眷恋','邂逅','相逢','离别','知己','故人','天涯','咫尺',
  '明月','清风','落花','流水','青山','白云','炊烟','小巷','灯火','阑珊'
];

const CLUSTER_CENTERS: Record<SentimentType, THREE.Vector3> = {
  positive: new THREE.Vector3(20, 5, 0),
  neutral: new THREE.Vector3(-15, 3, 10),
  negative: new THREE.Vector3(0, -8, -18),
};

const CLUSTER_RADIUS: Record<SentimentType, number> = {
  positive: 8.5,
  neutral: 9,
  negative: 8,
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
        if (PHRASE_DICT.includes(candidate) || /^[\u4e00-\u9fa5]{2,4}$/.test(candidate)) {
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

function countFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  return freq;
}

function analyzeSentiment(word: string): SentimentType {
  if (POSITIVE_WORDS.has(word)) return 'positive';
  if (NEGATIVE_WORDS.has(word)) return 'negative';
  for (const pw of POSITIVE_WORDS) {
    if (word.includes(pw) && word.length <= 4) return 'positive';
  }
  for (const nw of NEGATIVE_WORDS) {
    if (word.includes(nw) && word.length <= 4) return 'negative';
  }
  return 'neutral';
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateClusterPosition(sentiment: SentimentType, index: number, total: number): THREE.Vector3 {
  const center = CLUSTER_CENTERS[sentiment];
  const radius = CLUSTER_RADIUS[sentiment];

  const phi = Math.acos(1 - 2 * ((index + 0.5) / Math.max(total, 1)));
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;

  const r = radius * (0.55 + Math.abs(gaussianRandom()) * 0.35);
  const noiseX = gaussianRandom() * radius * 0.18;
  const noiseY = gaussianRandom() * radius * 0.18;
  const noiseZ = gaussianRandom() * radius * 0.18;

  return new THREE.Vector3(
    center.x + r * Math.sin(phi) * Math.cos(theta) + noiseX,
    center.y + r * Math.sin(phi) * Math.sin(theta) + noiseY,
    center.z + r * Math.cos(theta) + noiseZ
  );
}

export class TextTransformer {
  static transform(text: string, startPosition: THREE.Vector3): TransformResult {
    const tokens = tokenize(text);
    if (tokens.length === 0) {
      return { stars: [], connections: [], clusterCount: 0 };
    }

    const freqMap = countFrequency(tokens);
    const uniqueTokens = Array.from(freqMap.keys());

    const sentimentGroups: Record<SentimentType, string[]> = {
      positive: [],
      neutral: [],
      negative: [],
    };
    const tokenSentiments = new Map<string, SentimentType>();

    for (const tk of uniqueTokens) {
      const s = analyzeSentiment(tk);
      sentimentGroups[s].push(tk);
      tokenSentiments.set(tk, s);
    }

    const maxFreq = Math.max(...Array.from(freqMap.values()), 1);
    const maxStars = 200;
    const limitedTokens = uniqueTokens.slice(0, maxStars);

    const stars: StarPointData[] = [];
    const sentimentIndexMap = new Map<string, number>();
    const sentimentRunningIndex: Record<SentimentType, number> = {
      positive: 0, neutral: 0, negative: 0,
    };

    let id = 0;
    for (const tk of limitedTokens) {
      const sentiment = tokenSentiments.get(tk)!;
      const idxInGroup = sentimentRunningIndex[sentiment];
      sentimentRunningIndex[sentiment]++;
      sentimentIndexMap.set(tk, id);

      const rawFreq = freqMap.get(tk)!;
      const frequency = rawFreq / maxFreq;
      const brightness = 0.35 + frequency * 1.15;

      const targetPos = generateClusterPosition(
        sentiment,
        idxInGroup,
        sentimentGroups[sentiment].length
      );

      const baseDelay = 80;
      const jitterDelay = Math.random() * 260;
      const orderDelay = Math.min(id * 14, 600);
      const delay = baseDelay + jitterDelay + orderDelay;

      const duration = 2000 + Math.random() * 600 + frequency * 300;

      stars.push({
        id: id++,
        text: tk,
        frequency,
        brightness,
        sentiment,
        color: SENTIMENT_COLORS[sentiment],
        targetPosition: targetPos,
        clusterId: SENTIMENT_CLUSTER_ID[sentiment],
        delay,
        duration,
      });
    }

    const connections = this.buildConnections(stars);
    const clusterCount = 3;

    this.attachStartPositions(stars, startPosition);

    return { stars, connections, clusterCount };
  }

  private static attachStartPositions(stars: StarPointData[], baseStart: THREE.Vector3): void {
    for (const s of stars) {
      const jitter = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 3
      );
      (s as StarPointData & { _start: THREE.Vector3 })._start = baseStart.clone().add(jitter);
    }
  }

  static getStartPosition(star: StarPointData): THREE.Vector3 {
    const withStart = star as StarPointData & { _start?: THREE.Vector3 };
    return withStart._start || new THREE.Vector3(-40, 0, 0);
  }

  private static buildConnections(stars: StarPointData[]): StarConnectionData[] {
    const connections: StarConnectionData[] = [];
    const MAX_CONNECTIONS_PER_STAR = 3;
    const MAX_DISTANCE = 16;

    const byCluster: Record<number, StarPointData[]> = { 0: [], 1: [], 2: [] };
    for (const s of stars) byCluster[s.clusterId].push(s);

    for (const clusterStars of Object.values(byCluster)) {
      for (let i = 0; i < clusterStars.length; i++) {
        const a = clusterStars[i];
        const candidates: { star: StarPointData; dist: number }[] = [];

        for (let j = 0; j < clusterStars.length; j++) {
          if (i === j) continue;
          const b = clusterStars[j];
          const dist = a.targetPosition.distanceTo(b.targetPosition);
          if (dist < MAX_DISTANCE) {
            candidates.push({ star: b, dist });
          }
        }

        candidates.sort((x, y) => x.dist - y.dist);
        const selected = candidates.slice(0, MAX_CONNECTIONS_PER_STAR);

        for (const { star: b, dist } of selected) {
          const smallerId = Math.min(a.id, b.id);
          const largerId = Math.max(a.id, b.id);
          const exists = connections.some(
            c => c.fromId === smallerId && c.toId === largerId
          );
          if (!exists) {
            const normalizedDist = Math.min(dist / MAX_DISTANCE, 1);
            connections.push({
              fromId: smallerId,
              toId: largerId,
              distance: 1 - normalizedDist,
            });
          }
        }
      }
    }
    return connections;
  }
}
