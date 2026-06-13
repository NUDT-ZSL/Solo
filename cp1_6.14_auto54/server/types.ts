export type QuestionType = 'single' | 'multiple' | 'fill' | 'essay';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  answer: string | string[];
  keywords?: { word: string; weight: number }[];
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

export interface DatabaseSchema {
  questions: Question[];
  papers: Paper[];
  submissions: Submission[];
  answerRecords: AnswerRecord[];
}
