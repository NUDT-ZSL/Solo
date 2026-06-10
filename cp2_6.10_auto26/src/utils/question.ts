import type { QuestionType, Question, QuestionOption } from '@/types';
import { arraysEqual } from './storage';

export function checkAnswer(
  question: Question,
  userAnswer: string | string[]
): boolean {
  const { type, answer } = question;

  switch (type) {
    case 'single':
    case 'judge':
      return userAnswer === answer;

    case 'multiple': {
      if (!Array.isArray(userAnswer) || !Array.isArray(answer)) return false;
      return arraysEqual(userAnswer, answer);
    }

    default:
      return false;
  }
}

export function getTypeLabel(type: QuestionType): string {
  const map: Record<QuestionType, string> = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题'
  };
  return map[type];
}

export function getTypeColor(type: QuestionType): string {
  const map: Record<QuestionType, string> = {
    single: '#3182CE',
    multiple: '#805AD5',
    judge: '#38A169'
  };
  return map[type];
}

export function formatAnswerDisplay(
  answer: string | string[],
  options: QuestionOption[]
): string {
  const keys = Array.isArray(answer) ? answer : [answer];
  return keys
    .map((k) => {
      const opt = options.find((o) => o.key === k);
      return opt ? `${k}. ${opt.content}` : k;
    })
    .join('；');
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function smartDrawQuestions(
  pool: Question[],
  history: string[][],
  count: number = 10,
  maxRepeatRate: number = 0.4
): string[] {
  if (pool.length <= count) {
    return pool.map((q) => q.id);
  }

  const maxOverlap = Math.floor(count * maxRepeatRate);
  const lastSet = history.length > 0 ? history[0] : [];

  for (let attempt = 0; attempt < 30; attempt++) {
    const shuffled = shuffleArray(pool);
    const candidate = shuffled.slice(0, count).map((q) => q.id);
    const overlap = candidate.filter((id) => lastSet.includes(id)).length;
    if (overlap <= maxOverlap) {
      return candidate;
    }
  }

  const keepFromLast = shuffleArray(lastSet).slice(0, maxOverlap);
  const newPool = pool.filter((q) => !lastSet.includes(q.id));
  const fresh = shuffleArray(newPool).slice(0, count - keepFromLast.length).map((q) => q.id);
  return [...keepFromLast, ...fresh];
}
