export type QuestionType = 'single' | 'multiple' | 'fill' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Keyword {
  word: string;
  weight: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  answer: string | string[];
  keywords?: Keyword[];
  knowledgePoint: string;
  difficulty: Difficulty;
  createdAt: number;
}

export interface Paper {
  id: string;
  title: string;
  questionIds: string[];
  duration: number;
  difficultyRatio: { easy: number; medium: number; hard: number };
  createdAt: number;
}

export interface PaperWithQuestions extends Paper {
  questions: Question[];
}

export interface GradeDetail {
  matchedKeywords: string[];
  missedKeywords: string[];
  hitWeight: number;
  totalWeight: number;
}

export interface GradeResult {
  score: number;
  isCorrect: boolean;
  details?: GradeDetail;
}

export interface AnswerRecord {
  id: string;
  paperId: string;
  questionId: string;
  studentId: string;
  studentName: string;
  answer: string | string[];
  score: number;
  isCorrect: boolean;
  submittedAt: number;
  gradeDetails?: GradeDetail;
}

export interface Submission {
  id: string;
  paperId: string;
  studentId: string;
  studentName: string;
  answers: { questionId: string; answer: string | string[]; score: number; isCorrect: boolean }[];
  totalScore: number;
  totalQuestions: number;
  startedAt: number;
  submittedAt: number;
}

export interface QuestionAnalysis {
  questionId: string;
  questionIndex: number;
  totalAttempts: number;
  correctCount: number;
  correctRate: number;
  avgScore: number;
  studentAnswers: {
    studentId: string;
    studentName: string;
    answer: string | string[];
    score: number;
    isCorrect: boolean;
  }[];
}

export interface PaperAnalysis {
  paperId: string;
  totalSubmissions: number;
  avgTotalScore: number;
  questionAnalysis: QuestionAnalysis[];
}

export interface GradeOptions {
  keywords?: Keyword[];
  passScore?: number;
  minWordCount?: number;
}
