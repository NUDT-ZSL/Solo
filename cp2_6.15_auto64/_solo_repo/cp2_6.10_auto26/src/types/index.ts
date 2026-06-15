export type QuestionType = 'single' | 'multiple' | 'judge';

export interface QuestionOption {
  key: string;
  content: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  stem: string;
  options: QuestionOption[];
  answer: string | string[];
  analysis: string;
  createdAt: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface AnswerRecord {
  questionId: string;
  userAnswer: string | string[];
  isCorrect: boolean;
  timeSpent: number;
  answeredAt: number;
}

export interface ExerciseSession {
  id: string;
  title: string;
  questionIds: string[];
  answers: AnswerRecord[];
  startedAt: number;
  finishedAt?: number;
  isReview?: boolean;
  sourceSessionId?: string;
  currentIndex?: number;
}

export interface DrawHistory {
  sessionId: string;
  questionIds: string[];
  drawnAt: number;
}

export interface AccuracyByType {
  single: { correct: number; total: number; rate: number };
  multiple: { correct: number; total: number; rate: number };
  judge: { correct: number; total: number; rate: number };
}

export interface WrongQuestionItem {
  question: Question;
  userAnswer: string | string[];
  correctAnswer: string | string[];
  timeSpent: number;
}

export interface LearningReport {
  sessionId: string;
  title: string;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  totalTime: number;
  averageTime: number;
  accuracyByType: AccuracyByType;
  wrongQuestions: WrongQuestionItem[];
  generatedAt: number;
}

export type StorageKey =
  | 'iep_question_bank'
  | 'iep_sessions'
  | 'iep_draw_history'
  | 'iep_current_session';
