export interface Question {
  id: string;
  description: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  createdAt: number;
}

export interface AnswerDetail {
  questionId: string;
  questionDescription: string;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
}

export interface QuizRecord {
  id: string;
  studentName: string;
  answers: AnswerDetail[];
  score: number;
  totalQuestions: number;
  duration: number;
  submittedAt: number;
}

export type ToastType = 'success' | 'error' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
