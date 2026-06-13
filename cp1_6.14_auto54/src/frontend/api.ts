import axios from 'axios';
import type { Question, Paper, AnswerRecord, Submission, PaperAnalysis, QuestionType, Difficulty } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export const questionApi = {
  list(filter?: { knowledgePoint?: string; difficulty?: Difficulty; type?: QuestionType }): Promise<Question[]> {
    return api.get('/questions', { params: filter }).then((r) => r.data);
  },

  getById(id: string): Promise<Question> {
    return api.get(`/questions/${id}`).then((r) => r.data);
  },

  getKnowledgePoints(): Promise<string[]> {
    return api.get('/questions/knowledge-points').then((r) => r.data);
  },

  create(input: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
    return api.post('/questions', input).then((r) => r.data);
  },

  bulkCreate(questions: Omit<Question, 'id' | 'createdAt'>[]): Promise<Question[]> {
    return api.post('/questions/bulk', { questions }).then((r) => r.data);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/questions/${id}`).then(() => {});
  },
};

export const paperApi = {
  list(): Promise<Paper[]> {
    return api.get('/papers').then((r) => r.data);
  },

  getById(id: string): Promise<Paper & { questions: Question[] }> {
    return api.get(`/papers/${id}`).then((r) => r.data);
  },

  generate(input: {
    title: string;
    selectedQuestionIds: string[];
    duration: number;
    difficultyRatio: { easy: number; medium: number; hard: number };
  }): Promise<Paper> {
    return api.post('/papers/generate', input).then((r) => r.data);
  },

  getAnalysis(paperId: string): Promise<PaperAnalysis> {
    return api.get(`/papers/${paperId}/analysis`).then((r) => r.data);
  },

  getSubmissions(paperId: string): Promise<Submission[]> {
    return api.get(`/papers/${paperId}/submissions`).then((r) => r.data);
  },
};

export const answerApi = {
  saveAnswer(input: {
    paperId: string;
    questionId: string;
    studentId: string;
    studentName: string;
    answer: string | string[];
  }): Promise<AnswerRecord> {
    return api.post(`/papers/${input.paperId}/answers`, input).then((r) => r.data);
  },

  submitPaper(input: {
    paperId: string;
    studentId: string;
    studentName: string;
    startedAt: number;
  }): Promise<Submission> {
    return api.post(`/papers/${input.paperId}/submit`, input).then((r) => r.data);
  },

  getDraftAnswers(paperId: string, studentId: string): Promise<AnswerRecord[]> {
    return api.get(`/papers/${paperId}/draft`, { params: { studentId } }).then((r) => r.data);
  },

  getStudentAnswers(paperId: string, questionId: string): Promise<AnswerRecord[]> {
    return api.get(`/papers/${paperId}/questions/${questionId}/students`).then((r) => r.data);
  },
};
