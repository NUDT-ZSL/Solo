import type { Question } from '../types';

const BASE = '/api/questions';

export async function getQuestions(): Promise<Question[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('获取题目失败');
  return res.json();
}

export async function getRandomQuestions(count: number = 5): Promise<Question[]> {
  const res = await fetch(`${BASE}/random?count=${count}`);
  if (!res.ok) throw new Error('获取随机题目失败');
  return res.json();
}

export async function createQuestion(data: Omit<Question, 'id' | 'createdAt'>): Promise<Question> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('创建题目失败');
  return res.json();
}

export async function updateQuestion(id: string, data: Partial<Omit<Question, 'id' | 'createdAt'>>): Promise<Question> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新题目失败');
  return res.json();
}

export async function deleteQuestion(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除题目失败');
}
