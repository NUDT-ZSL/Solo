export interface ParagraphData {
  id: number;
  text: string;
  wordCount: number;
}

export interface Keystroke {
  timestamp: number;
  char: string;
  isError: boolean;
  index: number;
}

export interface Stats {
  wpm: number;
  errorRate: number;
  accuracy: number;
  elapsedTime: number;
  correctChars: number;
  totalChars: number;
  errors: number;
  isCompleted: boolean;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  wpm: number;
  accuracy: number;
  elapsedTime: number;
  paragraphId: number;
  keystrokes: Keystroke[];
}

export interface WpmSnapshot {
  time: number;
  wpm: number;
}
