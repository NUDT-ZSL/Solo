export type Sentiment = "positive" | "neutral" | "negative";

export interface DiaryEntry {
  id: string;
  content: string;
  date: string;
  sentiment: Sentiment;
  sentiment_score: number;
  keywords: string[];
  created_at: string;
  updated_at: string;
}

export interface TimelinePoint {
  date: string;
  sentiment: Sentiment;
  sentiment_score: number;
  summary: string;
  keywords: string[];
}

export interface SentimentResponse {
  sentiment: Sentiment;
  sentiment_score: number;
  keywords: string[];
}

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: "#F5C542",
  neutral: "#C8C8C8",
  negative: "#6BA3D6",
};

export const SENTIMENT_COLORS_RGBA: Record<Sentiment, string> = {
  positive: "rgba(245,197,66,",
  neutral: "rgba(200,200,200,",
  negative: "rgba(107,163,214,",
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "积极",
  neutral: "中性",
  negative: "消极",
};

const API_BASE = "/api";

const POSITIVE_WORDS = [
  "开心", "快乐", "幸福", "美好", "温暖", "感动", "喜欢", "爱", "感恩", "满足",
  "欣喜", "期待", "兴奋", "安心", "愉快", "舒畅", "欣慰", "甜蜜", "浪漫", "阳光",
  "hope", "happy", "love", "joy", "grateful", "wonderful", "beautiful", "excited",
  "peaceful", "amazing", "great", "good", "nice", "awesome", "blessed",
];

const NEGATIVE_WORDS = [
  "难过", "悲伤", "焦虑", "压力", "烦躁", "失望", "孤独", "疲惫", "痛苦", "迷茫",
  "沮丧", "无聊", "恐惧", "愤怒", "郁闷", "伤心", "无奈", "崩溃", "绝望", "忧虑",
  "sad", "angry", "anxious", "depressed", "lonely", "tired", "stressed",
  "frustrated", "disappointed", "hopeless", "awful", "terrible", "bad", "hurt", "pain",
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function summarize(content: string, maxLen = 60): string {
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen) + "...";
}

function localAnalyze(content: string): SentimentResponse {
  const lower = content.toLowerCase();
  let score = 0;
  const foundKeywords: string[] = [];

  POSITIVE_WORDS.forEach((w) => {
    if (lower.includes(w)) {
      score += 0.25;
      foundKeywords.push(w);
    }
  });
  NEGATIVE_WORDS.forEach((w) => {
    if (lower.includes(w)) {
      score -= 0.25;
      foundKeywords.push(w);
    }
  });

  score = Math.max(-1, Math.min(1, score));

  let sentiment: Sentiment = "neutral";
  if (score > 0.1) sentiment = "positive";
  else if (score < -0.1) sentiment = "negative";

  return {
    sentiment,
    sentiment_score: Math.round(score * 100) / 100,
    keywords: foundKeywords.length > 0 ? foundKeywords.slice(0, 8) : ["日常"],
  };
}

class DiaryEngine {
  private baseUrl: string;

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async fetchDiaries(): Promise<DiaryEntry[]> {
    try {
      const res = await fetch(`${this.baseUrl}/diaries`);
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch {
      return this.getLocalDiaries();
    }
  }

  async fetchDiary(id: string): Promise<DiaryEntry | null> {
    try {
      const res = await fetch(`${this.baseUrl}/diaries/${id}`);
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch {
      const local = this.getLocalDiaries();
      return local.find((d) => d.id === id) || null;
    }
  }

  async createDiary(content: string, date?: string): Promise<DiaryEntry> {
    const diaryDate = date || getTodayStr();
    try {
      const res = await fetch(`${this.baseUrl}/diaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, date: diaryDate }),
      });
      if (!res.ok) throw new Error("API error");
      const entry: DiaryEntry = await res.json();
      this.saveLocalDiary(entry);
      return entry;
    } catch {
      const sentiment = localAnalyze(content);
      const entry: DiaryEntry = {
        id: generateId(),
        content,
        date: diaryDate,
        sentiment: sentiment.sentiment,
        sentiment_score: sentiment.sentiment_score,
        keywords: sentiment.keywords,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.saveLocalDiary(entry);
      return entry;
    }
  }

  async updateDiary(id: string, content: string): Promise<DiaryEntry | null> {
    try {
      const res = await fetch(`${this.baseUrl}/diaries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("API error");
      const entry: DiaryEntry = await res.json();
      this.updateLocalDiary(entry);
      return entry;
    } catch {
      const local = this.getLocalDiaries();
      const idx = local.findIndex((d) => d.id === id);
      if (idx === -1) return null;
      const sentiment = localAnalyze(content);
      local[idx] = {
        ...local[idx],
        content,
        sentiment: sentiment.sentiment,
        sentiment_score: sentiment.sentiment_score,
        keywords: sentiment.keywords,
        updated_at: new Date().toISOString(),
      };
      this.setLocalDiaries(local);
      return local[idx];
    }
  }

  async deleteDiary(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/diaries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("API error");
    } catch {
      // fallback: local delete
    }
    this.removeLocalDiary(id);
    return true;
  }

  async analyzeSentiment(content: string): Promise<SentimentResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch {
      return localAnalyze(content);
    }
  }

  async fetchTimeline(): Promise<TimelinePoint[]> {
    try {
      const res = await fetch(`${this.baseUrl}/timeline`);
      if (!res.ok) throw new Error("API error");
      return await res.json();
    } catch {
      const diaries = this.getLocalDiaries();
      return diaries
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({
          date: d.date,
          sentiment: d.sentiment,
          sentiment_score: d.sentiment_score,
          summary: summarize(d.content),
          keywords: d.keywords,
        }));
    }
  }

  generateGradientFromKeywords(keywords: string[]): string {
    if (keywords.length === 0) {
      return "linear-gradient(135deg, #FAF8F5 0%, #E8E6E1 100%)";
    }

    const hash = keywords.join("").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hue1 = (hash * 37) % 360;
    const hue2 = (hue1 + 45) % 360;
    const hue3 = (hue1 + 90) % 360;

    return `linear-gradient(135deg, hsl(${hue1}, 40%, 85%) 0%, hsl(${hue2}, 35%, 80%) 50%, hsl(${hue3}, 30%, 88%) 100%)`;
  }

  private getLocalDiaries(): DiaryEntry[] {
    try {
      const data = localStorage.getItem("memoryAfterglow_diaries");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setLocalDiaries(diaries: DiaryEntry[]): void {
    localStorage.setItem("memoryAfterglow_diaries", JSON.stringify(diaries));
  }

  private saveLocalDiary(entry: DiaryEntry): void {
    const diaries = this.getLocalDiaries();
    const existingIdx = diaries.findIndex((d) => d.id === entry.id);
    if (existingIdx !== -1) {
      diaries[existingIdx] = entry;
    } else {
      diaries.push(entry);
    }
    this.setLocalDiaries(diaries);
  }

  private updateLocalDiary(entry: DiaryEntry): void {
    const diaries = this.getLocalDiaries();
    const idx = diaries.findIndex((d) => d.id === entry.id);
    if (idx !== -1) diaries[idx] = entry;
    this.setLocalDiaries(diaries);
  }

  private removeLocalDiary(id: string): void {
    const diaries = this.getLocalDiaries().filter((d) => d.id !== id);
    this.setLocalDiaries(diaries);
  }
}

export const diaryEngine = new DiaryEngine();
export default DiaryEngine;
