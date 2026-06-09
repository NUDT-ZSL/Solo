export interface CardData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  image?: string | null;
  x: number;
  y: number;
  groupId?: string | null;
}

export interface Connection {
  from: string;
  to: string;
  similarity: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  '我', '你', '他', '她', '它', '们', '的', '了', '在', '是', '我', '有', '和', '就', '不',
  '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
  '没有', '看', '好', '自己', '这', '那', '这个', '那个', '什么', '怎么', '如何', '为什么',
  '因为', '所以', '但是', '然后', '如果', '可以', '能', '应该', '必须', '需要', '以及',
  '或者', '并且', '虽然', '然而', '不过', '只是', '而且', '不仅', '还', '也'
]);

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lowerText = text.toLowerCase();

  const englishMatches = lowerText.match(/[a-z][a-z0-9]{1,}/g);
  if (englishMatches) {
    for (const word of englishMatches) {
      if (!STOP_WORDS.has(word) && word.length > 1) {
        tokens.push(word);
      }
    }
  }

  for (let i = 0; i < lowerText.length - 1; i++) {
    const char1 = lowerText[i];
    const char2 = lowerText[i + 1];
    if (/[\u4e00-\u9fa5]/.test(char1) && /[\u4e00-\u9fa5]/.test(char2)) {
      const bigram = char1 + char2;
      if (!STOP_WORDS.has(bigram)) {
        tokens.push(bigram);
      }
    }
  }

  return tokens;
}

function cardToText(card: CardData): string {
  const parts: string[] = [card.title];
  if (card.description) parts.push(card.description);
  if (card.tags && card.tags.length > 0) {
    parts.push(card.tags.map(t => t.toLowerCase()).join(' '));
    parts.push(card.tags.map(t => t.toLowerCase()).join(' '));
  }
  return parts.join(' ');
}

function buildTfIdfVectors(cards: CardData[]): Map<string, Map<string, number>> {
  const docCount = cards.length;
  const docFreq = new Map<string, number>();
  const vectors = new Map<string, Map<string, number>>();

  for (const card of cards) {
    const text = cardToText(card);
    const tokens = tokenize(text);
    const tf = new Map<string, number>();
    const uniqueTokens = new Set(tokens);

    for (const token of uniqueTokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    const maxTf = Math.max(...tf.values(), 1);
    const normalizedTf = new Map<string, number>();
    for (const [token, count] of tf.entries()) {
      normalizedTf.set(token, 0.5 + 0.5 * (count / maxTf));
    }

    vectors.set(card.id, normalizedTf);
  }

  for (const [cardId, tf] of vectors.entries()) {
    const tfidf = new Map<string, number>();
    for (const [token, tfVal] of tf.entries()) {
      const df = docFreq.get(token) || 1;
      const idf = Math.log((docCount + 1) / (df + 1)) + 1;
      tfidf.set(token, tfVal * idf);
    }
    vectors.set(cardId, tfidf);
  }

  return vectors;
}

export function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const [key, val] of vec1.entries()) {
    norm1 += val * val;
    const val2 = vec2.get(key) || 0;
    dotProduct += val * val2;
  }

  for (const val of vec2.values()) {
    norm2 += val * val;
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (norm1 * norm2);
}

export function computeConnections(
  cards: CardData[],
  threshold: number = 0.15
): Connection[] {
  if (cards.length < 2) return [];

  const vectors = buildTfIdfVectors(cards);
  const connections: Connection[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const cardA = cards[i];
      const cardB = cards[j];
      const key = cardA.id < cardB.id ? `${cardA.id}-${cardB.id}` : `${cardB.id}-${cardA.id}`;

      if (seen.has(key)) continue;
      seen.add(key);

      const vecA = vectors.get(cardA.id) || new Map();
      const vecB = vectors.get(cardB.id) || new Map();

      let similarity = cosineSimilarity(vecA, vecB);

      const tagsA = new Set((cardA.tags || []).map(t => t.toLowerCase()));
      const tagsB = new Set((cardB.tags || []).map(t => t.toLowerCase()));
      let commonTags = 0;
      for (const tag of tagsA) {
        if (tagsB.has(tag)) commonTags++;
      }
      const tagBoost = commonTags > 0 ? Math.min(commonTags * 0.08, 0.3) : 0;
      similarity = Math.min(similarity + tagBoost, 1);

      if (similarity >= threshold) {
        connections.push({
          from: cardA.id,
          to: cardB.id,
          similarity
        });
      }
    }
  }

  connections.sort((a, b) => b.similarity - a.similarity);
  return connections.slice(0, Math.floor(cards.length * 2.5));
}

export function getConnectionColor(similarity: number): string {
  const s = Math.max(0, Math.min(1, similarity));
  const r1 = 74, g1 = 0, b1 = 224;
  const r2 = 255, g2 = 77, b2 = 77;
  const r = Math.round(r1 + (r2 - r1) * s);
  const g = Math.round(g1 + (g2 - g1) * s);
  const b = Math.round(b1 + (b2 - b1) * s);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getConnectionWidth(similarity: number): number {
  const s = Math.max(0, Math.min(1, similarity));
  return 1 + s * 3;
}
