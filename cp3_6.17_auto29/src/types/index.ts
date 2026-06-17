export interface Subject {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  icon: string;
}

export interface Question {
  id: string;
  subjectId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  knowledgePoint: 'basic' | 'logic' | 'code' | 'security' | 'management';
  difficulty: number;
}

export interface AnswerRecord {
  questionId: string;
  selectedAnswer: number | null;
  isCorrect: boolean;
  timeSpent: number;
}

export interface ExamRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  totalTime: number;
  answers: AnswerRecord[];
  score: number;
  totalQuestions: number;
  correctCount: number;
  knowledgeScores: {
    basic: number;
    logic: number;
    code: number;
    security: number;
    management: number;
  };
}

export interface ExamResult {
  recordId: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongQuestions: Array<{
    question: Question;
    selectedAnswer: number | null;
    correctAnswer: number;
  }>;
  knowledgeScores: {
    basic: number;
    logic: number;
    code: number;
    security: number;
    management: number;
  };
  suggestions: string[];
}

export type KnowledgePoint = 'basic' | 'logic' | 'code' | 'security' | 'management';

export const KNOWLEDGE_POINT_LABELS: Record<KnowledgePoint, string> = {
  basic: '基础知识',
  logic: '逻辑分析',
  code: '代码理解',
  security: '安全规范',
  management: '项目管理'
};
