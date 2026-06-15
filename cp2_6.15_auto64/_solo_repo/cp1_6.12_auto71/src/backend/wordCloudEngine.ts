export interface WordEntry {
  word: string;
  count: number;
  userId: string;
  timestamp: number;
}

export interface WordCloudData {
  words: Array<{
    word: string;
    count: number;
    userId: string;
    color: string;
  }>;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'i', 'you', 'he',
  'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my',
  'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how', 'all',
  'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'as', 'if', 'then', 'else', 'also', 'about', 'up',
  'out', 'into', 'over', 'under', 'again', 'further', 'once', 'here',
  'there', 'am', '们', '的', '了', '和', '是', '就', '都', '而', '及',
  '与', '着', '或', '一个', '没有', '我们', '你们', '他们', '自己',
  '这', '那', '不', '在', '有', '我', '他', '她', '它', '你', '要',
  '会', '能', '可以', '说', '看', '去', '来', '到', '被', '把', '让',
]);

const WINDOW_MS = 10000;

export class WordCloudEngine {
  private entries: WordEntry[] = [];
  private userColors: Map<string, string> = new Map();

  extractKeywords(text: string): string[] {
    const cleaned = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter((t) => t.length >= 2);
    return tokens.filter((t) => !STOP_WORDS.has(t));
  }

  addEdit(userId: string, text: string, timestamp: number): void {
    const keywords = this.extractKeywords(text);
    for (const word of keywords) {
      this.entries.push({ word, count: 1, userId, timestamp });
    }
    this.cleanup(timestamp);
  }

  addDeletion(userId: string, text: string, timestamp: number): void {
    const keywords = this.extractKeywords(text);
    for (const word of keywords) {
      this.entries.push({ word, count: 1, userId, timestamp });
    }
    this.cleanup(timestamp);
  }

  setUserColor(userId: string, color: string): void {
    this.userColors.set(userId, color);
  }

  removeUser(userId: string): void {
    this.userColors.delete(userId);
  }

  private cleanup(now: number): void {
    this.entries = this.entries.filter((e) => now - e.timestamp <= WINDOW_MS);
  }

  getWordCloud(now: number): WordCloudData {
    this.cleanup(now);
    const aggregated = new Map<string, { count: number; userId: string }>();

    for (const entry of this.entries) {
      const key = `${entry.userId}:${entry.word}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.count += entry.count;
      } else {
        aggregated.set(key, { count: entry.count, userId: entry.userId });
      }
    }

    const words = Array.from(aggregated.entries())
      .map(([key, data]) => {
        const [, word] = key.split(':');
        return {
          word,
          count: data.count,
          userId: data.userId,
          color: this.userColors.get(data.userId) || '#888888',
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    return { words };
  }
}
