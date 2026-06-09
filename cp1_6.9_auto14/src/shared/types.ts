export type EmotionTag = '快乐' | '忧伤' | '平静' | '兴奋' | '怀念';

export type EmotionTendency = 'positive' | 'neutral' | 'negative';

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  tags: EmotionTag[];
  date: string;
  tendency: EmotionTendency;
  score: number;
  keywords: string[];
  favorite: boolean;
}

export interface DiaryRequest {
  title: string;
  content: string;
  tags: EmotionTag[];
}

export interface DiaryResponse {
  tendency: EmotionTendency;
  score: number;
  keywords: string[];
}

export interface EmotionStat {
  positive: number;
  neutral: number;
  negative: number;
}
