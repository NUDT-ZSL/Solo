import type { QuizRecord } from '../types';

interface SubmitAnswerPayload {
  studentName: string;
  answers: QuizRecord['answers'];
  score: number;
  totalQuestions: number;
  duration: number;
}

export async function getQuizRecords(): Promise<QuizRecord[]> {
  const res = await fetch('/api/answers');
  if (!res.ok) throw new Error('获取答题历史失败');
  return res.json();
}

export async function getStudentRecords(studentName: string): Promise<QuizRecord[]> {
  const res = await fetch(`/api/answers/${encodeURIComponent(studentName)}`);
  if (!res.ok) throw new Error('获取学生答题记录失败');
  return res.json();
}

export async function submitQuiz(payload: SubmitAnswerPayload): Promise<QuizRecord> {
  const res = await fetch('/api/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('提交答案失败');
  return res.json();
}
