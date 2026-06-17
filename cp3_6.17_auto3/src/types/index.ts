export interface Question {
  id: string;
  subject: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: 'basic' | 'logic' | 'code' | 'security' | 'management';
  analysis: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  questionCount: number;
}

export interface WrongAnswer {
  questionId: string;
  questionText: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  category: string;
  analysis: string;
}

export interface DimensionScores {
  basic: number;
  logic: number;
  code: number;
  security: number;
  management: number;
}

export interface ExamRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeTaken: number;
  answers: Record<string, number>;
  wrongAnswers: WrongAnswer[];
  dimensionScores: DimensionScores;
  createdAt: string;
}

export interface ReviewSuggestion {
  dimension: keyof DimensionScores;
  dimensionName: string;
  message: string;
  priority: number;
}

export interface ExamState {
  status: 'idle' | 'loading' | 'in_progress' | 'submitting' | 'completed' | 'error';
  questions: Question[];
  currentIndex: number;
  answers: Record<string, number>;
  timeRemaining: number;
  totalTime: number;
  examResult: ExamRecord | null;
  error: string | null;
}
