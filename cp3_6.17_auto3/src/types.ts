export type QuestionCategory = '基础' | '逻辑分析' | '代码理解' | '安全规范' | '项目管理';

export interface Subject {
  id: string;
  name: string;
  icon: string;
  questionCount: number;
  description: string;
}

export interface Question {
  id: string;
  subject: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: QuestionCategory;
  explanation: string;
}

export interface ExamAnswer {
  questionId: string;
  answer: number | null;
  isCorrect: boolean;
}

export interface ExamRecord {
  id: string;
  subject: string;
  subjectName: string;
  date: string;
  totalScore: number;
  totalQuestions: number;
  correctCount: number;
  timeUsed: number;
  answers: ExamAnswer[];
  categoryScores: Record<QuestionCategory, number>;
  suggestions: string[];
}

export interface ExamSubmitPayload {
  subject: string;
  answers: { questionId: string; answer: number | null }[];
  timeUsed: number;
}
