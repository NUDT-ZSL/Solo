export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  subject: string;
  dimension: string;
  explanation: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  duration: number;
}

export interface ExamRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  duration: number;
  answers: number[];
  date: string;
  dimensionScores: Record<string, number>;
  wrongQuestions?: Question[];
}

export interface ExamResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  wrongQuestions: Question[];
  dimensionScores: Record<string, number>;
  duration: number;
  recordId: string;
}

export interface DimensionScore {
  name: string;
  score: number;
  total: number;
}
