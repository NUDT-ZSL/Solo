export type StudentStatus = 'normal' | 'stuck' | 'timeout';

export interface PerQuestionTime {
  questionIndex: number;
  timeSpent: number;
  correct: boolean;
}

export interface StudentData {
  id: string;
  name: string;
  currentQuestion: number;
  totalQuestions: number;
  accuracy: number;
  status: StudentStatus;
  perQuestionTimes: PerQuestionTime[];
  stuckOnQuestion: number | null;
}

export interface ExamStatusResponse {
  students: StudentData[];
  timestamp: number;
}
