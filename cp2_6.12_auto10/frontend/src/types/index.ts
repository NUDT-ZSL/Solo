export interface ChatMessage {
  id: string;
  role: 'user' | 'system';
  content: string;
  timestamp: number;
  isPlaying?: boolean;
  currentWordIndex?: number;
}

export interface Topic {
  id: string;
  name: string;
  icon: string;
  description: string;
  starterQuestions: string[];
  keywords: string[];
}

export interface ScoreResult {
  pronunciation: number;
  grammar: number;
  fluency: number;
  suggestions: {
    pronunciation: string;
    grammar: string;
    fluency: string;
  };
  overallScore: number;
}

export interface WordStat {
  word: string;
  count: number;
}

export interface CommonError {
  type: 'pronunciation' | 'grammar' | 'vocabulary';
  original: string;
  correction: string;
  suggestion: string;
}

export interface SummaryReport {
  errors: CommonError[];
  wordStats: WordStat[];
  scoreHistory: ScoreResult[];
  overallAverage: number;
}

export interface UploadResponse {
  transcript: string;
  score: ScoreResult;
  nextQuestion: string;
  errors: CommonError[];
}

export interface ScoreHistoryItem {
  index: number;
  overall: number;
  pronunciation: number;
  grammar: number;
  fluency: number;
}
