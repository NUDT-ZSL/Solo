export interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

export interface Quiz {
  id: string;
  videoId: string;
  timePoint: number;
  question: string;
  options: string[];
  correctIndex: number;
  subtitleText: string;
}

export interface AnswerRecord {
  id: string;
  quizId: string;
  videoId: string;
  studentId: string;
  selectedIndex: number;
  isCorrect: boolean;
  answerTime: number;
  timestamp: string;
}

export interface VideoMeta {
  id: string;
  filename: string;
  createdAt: string;
  subtitleCount: number;
  quizCount: number;
}

export interface QuizStats {
  quizId: string;
  question: string;
  totalAnswers: number;
  correctCount: number;
  correctRate: number;
}

export interface StudentResult {
  studentId: string;
  totalQuizzes: number;
  correctCount: number;
  wrongQuizIds: string[];
  totalTime: number;
  correctRate: number;
}
