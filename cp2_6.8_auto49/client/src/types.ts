export interface KeywordData {
  keyword: string;
  weight: number;
  trend: number[];
}

export interface HistoryRecord {
  id: string;
  text: string;
  timestamp: string;
  keywords: KeywordData[];
}
