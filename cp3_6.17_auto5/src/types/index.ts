export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export type QuestionCategory = '基础知识' | '逻辑分析' | '代码理解' | '安全规范' | '项目管理';

export interface Question {
  id: string;
  subjectId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  category: QuestionCategory;
  explanation: string;
}

export interface ExamAnswer {
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
}

export interface WrongQuestion {
  question: Question;
  userAnswer: number;
}

export interface DimensionScores {
  基础知识: number;
  逻辑分析: number;
  代码理解: number;
  安全规范: number;
  项目管理: number;
}

export interface ExamResult {
  id: string;
  subjectId: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeUsed: number;
  answers: ExamAnswer[];
  wrongQuestions: WrongQuestion[];
  dimensionScores: DimensionScores;
  suggestions: string[];
  examDate: string;
}

export interface SubmitExamRequest {
  subjectId: string;
  answers: { questionId: string; selectedAnswer: number }[];
  timeUsed: number;
}
