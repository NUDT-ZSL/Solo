export interface DimensionScore {
  name: string;
  score: number;
  maxScore: number;
  color: string;
}

export interface SentenceIssue {
  sentenceIndex: number;
  sentence: string;
  type: 'grammar' | 'weak';
  description: string;
}

export interface EvaluateResponse {
  totalScore: number;
  dimensions: DimensionScore[];
  issues: SentenceIssue[];
  sentences: string[];
  wordCount: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  summary: string;
  text: string;
  totalScore: number;
  dimensions: DimensionScore[];
  issues: SentenceIssue[];
  sentences: string[];
  wordCount: number;
  highlightIndices: number[];
}
