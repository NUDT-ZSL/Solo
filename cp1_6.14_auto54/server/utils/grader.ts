import type { Question, QuestionType } from '../types';

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function gradeQuestion(question: Question, userAnswer: string | string[]): { score: number; isCorrect: boolean } {
  const type: QuestionType = question.type;

  if (type === 'single' || type === 'multiple') {
    const correct = question.answer as string[] | string;
    const correctArr = Array.isArray(correct) ? correct.sort() : [correct];
    const userArr = Array.isArray(userAnswer) ? userAnswer.sort() : [userAnswer];
    const isCorrect =
      correctArr.length === userArr.length && correctArr.every((v, i) => v === userArr[i]);
    return { score: isCorrect ? 100 : 0, isCorrect };
  }

  if (type === 'fill') {
    const correctText = normalizeText(question.answer as string);
    const userText = normalizeText(userAnswer as string);
    const isCorrect = userText === correctText;
    return { score: isCorrect ? 100 : 0, isCorrect };
  }

  if (type === 'essay') {
    if (!question.keywords || question.keywords.length === 0) {
      return { score: 50, isCorrect: false };
    }
    const userText = normalizeText(userAnswer as string);
    let totalWeight = 0;
    let hitWeight = 0;
    for (const kw of question.keywords) {
      totalWeight += kw.weight;
      if (userText.includes(normalizeText(kw.word))) {
        hitWeight += kw.weight;
      }
    }
    const score = totalWeight > 0 ? Math.round((hitWeight / totalWeight) * 100) : 0;
    return { score, isCorrect: score >= 60 };
  }

  return { score: 0, isCorrect: false };
}
