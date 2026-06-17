export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  subject: string;
  knowledgePoint: '基础知识' | '逻辑分析' | '代码理解' | '安全规范' | '项目管理';
  explanation: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  duration: number;
}

export interface ExamResult {
  id: string;
  examId: string;
  subject: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeUsed: number;
  answers: { questionId: string; selected: number; correct: boolean }[];
  wrongAnswers: {
    question: Question;
    selected: number;
  }[];
  knowledgeScores: Record<string, number>;
  suggestions: string[];
  createdAt: string;
}

export interface ExamState {
  questions: Question[];
  currentIndex: number;
  answers: Map<string, number>;
  timeRemaining: number;
  isStarted: boolean;
  isFinished: boolean;
  result: ExamResult | null;
}
