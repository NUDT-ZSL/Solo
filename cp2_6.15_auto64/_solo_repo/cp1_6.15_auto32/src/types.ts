export interface TextAnalysis {
  totalWords: number;
  uniqueWords: number;
  avgSentenceLength: number;
  fleschKincaid: number;
  sentences: string[];
}

export interface SimplifiedWord {
  original: string;
  simplified: string;
  definition: string;
  level: number;
}

export interface SimplifiedSentence {
  original: string;
  simplified: string;
  words: SimplifiedWord[];
}

export interface SimplifiedResult {
  sentences: SimplifiedSentence[];
}

export interface WordEntry {
  word: string;
  simplified: string;
  definition: string;
  frequency: number;
  level: number;
}

export interface VocabWord {
  id: string;
  original: string;
  simplified: string;
  definition: string;
  level: number;
  addedAt: number;
}
