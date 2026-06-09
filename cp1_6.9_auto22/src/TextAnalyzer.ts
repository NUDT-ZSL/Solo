export interface WordData {
  word: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  strength: number;
  frequency: number;
  connections: Array<{ targetIndex: number; relevance: number }>;
}

const POSITIVE_WORDS: Record<string, number> = {
  '好': 0.8, '棒': 0.9, '美': 0.85, '乐': 0.7, '喜': 0.75, '爱': 0.9,
  '欢': 0.7, '赞': 0.85, '优': 0.8, '秀': 0.75, '佳': 0.75, '妙': 0.8,
  '智': 0.7, '慧': 0.7, '勇': 0.75, '敢': 0.7, '诚': 0.8, '善': 0.85,
  '明': 0.65, '亮': 0.6, '灿': 0.75, '烂': 0.7, '辉': 0.7, '煌': 0.75,
  '梦': 0.7, '想': 0.65, '希': 0.7, '望': 0.7, '未': 0.5, '来': 0.55,
  '创': 0.7, '新': 0.7, '探': 0.65, '索': 0.6, '发': 0.5, '现': 0.6,
  'good': 0.8, 'great': 0.9, 'beautiful': 0.85, 'love': 0.9, 'happy': 0.85,
  'joy': 0.8, 'amazing': 0.88, 'excellent': 0.85, 'wonderful': 0.85,
  'fantastic': 0.88, 'brilliant': 0.82, 'smart': 0.75, 'wise': 0.8,
  'dream': 0.7, 'hope': 0.75, 'future': 0.6, 'create': 0.75, 'discover': 0.7,
  'explore': 0.7, 'innovate': 0.78, 'inspire': 0.8, 'passion': 0.82
};

const NEGATIVE_WORDS: Record<string, number> = {
  '坏': 0.8, '差': 0.75, '丑': 0.7, '悲': 0.8, '伤': 0.8, '痛': 0.85,
  '恨': 0.9, '怒': 0.85, '恐': 0.8, '惧': 0.8, '忧': 0.75, '愁': 0.75,
  '苦': 0.8, '难': 0.7, '困': 0.75, '挫': 0.7, '败': 0.8, '失': 0.75,
  '暗': 0.65, '黑': 0.6, '冷': 0.6, '寂': 0.7, '寞': 0.7, '孤': 0.75,
  '死': 0.9, '亡': 0.9, '毁': 0.85, '灭': 0.85, '灾': 0.85, '难': 0.8,
  'bad': 0.8, 'terrible': 0.88, 'ugly': 0.75, 'hate': 0.9, 'sad': 0.85,
  'pain': 0.85, 'anger': 0.85, 'fear': 0.82, 'sorrow': 0.85, 'grief': 0.88,
  'fail': 0.82, 'lose': 0.78, 'dark': 0.65, 'cold': 0.6, 'lonely': 0.78,
  'destroy': 0.85, 'ruin': 0.82, 'suffer': 0.85, 'despair': 0.88
};

const STOP_WORDS = new Set([
  '的', '了', '和', '是', '就', '都', '而', '及', '与', '着', '或', '一个',
  '没有', '我们', '你们', '他们', '它们', '这个', '那个', '这些', '那些',
  '什么', '怎么', '为什', '因为', '所以', '但是', '如果', '虽然', '还是',
  '只是', '只有', '就是', '还有', '以及', '不过', '然后', '这样', '那样',
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
  'them', 'my', 'your', 'his', 'its', 'our', 'their', 'what', 'which', 'who',
  'whom', 'where', 'when', 'why', 'how', 'of', 'to', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'all', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'also', 'now'
]);

export class TextAnalyzer {
  public static analyze(text: string): WordData[] {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return [];

    const freqMap = new Map<string, number>();
    const sentenceMap = new Map<string, Set<number>>();
    let sentenceIndex = 0;

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (/[。！？.!?]/.test(token)) {
        sentenceIndex++;
        continue;
      }
      if (STOP_WORDS.has(lower)) continue;
      if (token.length < 1) continue;

      freqMap.set(token, (freqMap.get(token) || 0) + 1);
      if (!sentenceMap.has(token)) {
        sentenceMap.set(token, new Set<number>());
      }
      sentenceMap.get(token)!.add(sentenceIndex);
    }

    const uniqueWords = Array.from(freqMap.keys());
    const maxFreq = Math.max(...Array.from(freqMap.values()));
    const total = uniqueWords.length;
    const targetCount = Math.min(Math.max(total, 50), 750);

    const words: WordData[] = uniqueWords.slice(0, targetCount).map((word) => {
      const freq = freqMap.get(word) || 1;
      const { sentiment, strength } = this.calculateSentiment(word);
      return {
        word,
        sentiment,
        strength,
        frequency: freq / maxFreq,
        connections: []
      };
    });

    while (words.length < 50) {
      words.push({
        word: '',
        sentiment: 'neutral',
        strength: 0.3 + Math.random() * 0.4,
        frequency: 0.2 + Math.random() * 0.5,
        connections: []
      });
    }

    this.calculateConnections(words, sentenceMap);
    return words;
  }

  public static tokenize(text: string): string[] {
    const cleaned = text.trim();
    if (!cleaned) return [];

    const tokens: string[] = [];
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const englishRegex = /[a-zA-Z]/;

    let buffer = '';
    let bufferType: 'chinese' | 'english' | 'punct' | 'none' = 'none';

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (chineseRegex.test(char)) {
        if (bufferType === 'english' && buffer) {
          tokens.push(buffer);
          buffer = '';
        }
        if (bufferType === 'chinese' && buffer.length < 2) {
          buffer += char;
          if (buffer.length === 2) {
            tokens.push(buffer);
            buffer = '';
          }
        } else {
          if (bufferType === 'chinese' && buffer) {
            tokens.push(buffer);
          }
          buffer = char;
          bufferType = 'chinese';
        }
      } else if (englishRegex.test(char)) {
        if (bufferType !== 'english' && buffer) {
          tokens.push(buffer);
          buffer = '';
        }
        buffer += char.toLowerCase();
        bufferType = 'english';
      } else if (/[。！？.!?，、；：,;:]/.test(char)) {
        if (buffer) {
          tokens.push(buffer);
          buffer = '';
        }
        tokens.push(char);
        bufferType = 'punct';
      } else if (/\s/.test(char)) {
        if (buffer) {
          tokens.push(buffer);
          buffer = '';
        }
        bufferType = 'none';
      } else {
        if (buffer) {
          tokens.push(buffer);
          buffer = '';
        }
        bufferType = 'none';
      }
    }

    if (buffer) {
      tokens.push(buffer);
    }

    return tokens.filter(t => t.length > 0);
  }

  public static calculateSentiment(word: string): {
    sentiment: 'positive' | 'negative' | 'neutral';
    strength: number;
  } {
    if (!word || word.length === 0) {
      return { sentiment: 'neutral', strength: 0.5 };
    }

    const lower = word.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    for (const [positive, weight] of Object.entries(POSITIVE_WORDS)) {
      if (lower.includes(positive.toLowerCase())) {
        positiveScore = Math.max(positiveScore, weight);
      }
    }

    for (const [negative, weight] of Object.entries(NEGATIVE_WORDS)) {
      if (lower.includes(negative.toLowerCase())) {
        negativeScore = Math.max(negativeScore, weight);
      }
    }

    const threshold = 0.5;
    if (positiveScore > threshold && positiveScore >= negativeScore) {
      return { sentiment: 'positive', strength: Math.min(1, positiveScore + Math.random() * 0.1) };
    } else if (negativeScore > threshold && negativeScore > positiveScore) {
      return { sentiment: 'negative', strength: Math.min(1, negativeScore + Math.random() * 0.1) };
    }

    return {
      sentiment: 'neutral',
      strength: 0.3 + Math.abs(Math.sin(word.charCodeAt(0) * 0.1)) * 0.4
    };
  }

  public static calculateConnections(
    words: WordData[],
    sentenceMap?: Map<string, Set<number>>
  ): void {
    const maxConnections = words.length * 2;
    const connectionScores: Array<{
      from: number;
      to: number;
      score: number;
    }> = [];

    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        const wordA = words[i];
        const wordB = words[j];
        let score = 0;

        if (sentenceMap && wordA.word && wordB.word) {
          const sentsA = sentenceMap.get(wordA.word);
          const sentsB = sentenceMap.get(wordB.word);
          if (sentsA && sentsB) {
            const intersection = [...sentsA].filter(s => sentsB.has(s)).length;
            const union = new Set([...sentsA, ...sentsB]).size;
            score = union > 0 ? intersection / union : 0;
            score *= 0.6;
          }
        }

        if (wordA.sentiment === wordB.sentiment && wordA.sentiment !== 'neutral') {
          score += 0.2 * ((wordA.strength + wordB.strength) / 2);
        }

        const freqDiff = Math.abs(wordA.frequency - wordB.frequency);
        score += 0.1 * (1 - freqDiff);

        score += Math.random() * 0.15;

        if (score > 0.15) {
          connectionScores.push({ from: i, to: j, score: Math.min(1, score) });
        }
      }
    }

    connectionScores.sort((a, b) => b.score - a.score);

    const selected = connectionScores.slice(0, maxConnections);
    for (const conn of selected) {
      words[conn.from].connections.push({
        targetIndex: conn.to,
        relevance: conn.score
      });
      words[conn.to].connections.push({
        targetIndex: conn.from,
        relevance: conn.score
      });
    }

    for (let i = 0; i < words.length; i++) {
      if (words[i].connections.length === 0) {
        const target = (i + Math.floor(Math.random() * (words.length - 1)) + 1) % words.length;
        if (target !== i) {
          const rel = 0.3 + Math.random() * 0.3;
          words[i].connections.push({ targetIndex: target, relevance: rel });
        }
      }
    }
  }
}
