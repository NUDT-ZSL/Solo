import type { Question, QuestionType, GradeResult, GradeOptions, Keyword } from '../types';

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function fuzzyMatchFill(correct: string, user: string): boolean {
  const c = normalizeText(correct);
  const u = normalizeText(user);
  if (c === u) return true;
  const cNoPunct = c.replace(/[，。、；：！？,.:;!?]/g, '');
  const uNoPunct = u.replace(/[，。、；：！？,.:;!?]/g, '');
  if (cNoPunct === uNoPunct) return true;
  if (cNoPunct.length > 2 && uNoPunct.length > 2) {
    const cChars = cNoPunct.split('');
    const uChars = uNoPunct.split('');
    let matchCount = 0;
    for (const ch of cChars) {
      const idx = uChars.indexOf(ch);
      if (idx !== -1) {
        matchCount++;
        uChars.splice(idx, 1);
      }
    }
    if (matchCount / cChars.length >= 0.85) return true;
  }
  return false;
}

function calcFillSimilarity(correct: string, user: string): number {
  const correctNorm = normalizeText(correct);
  const userNorm = normalizeText(user);
  if (correctNorm.length === 0 || userNorm.length === 0) return 0;
  const maxLen = Math.max(correctNorm.length, userNorm.length);
  let matches = 0;
  const used: boolean[] = new Array(userNorm.length).fill(false);
  for (let i = 0; i < correctNorm.length; i++) {
    for (let j = 0; j < userNorm.length; j++) {
      if (!used[j] && correctNorm[i] === userNorm[j]) {
        matches++;
        used[j] = true;
        break;
      }
    }
  }
  return matches / maxLen;
}

function gradeSingleChoice(question: Question, userAnswer: string | string[]): GradeResult {
  const correct = question.answer as string;
  const user = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
  const isCorrect = user === correct;
  return { score: isCorrect ? 100 : 0, isCorrect };
}

function gradeMultipleChoice(question: Question, userAnswer: string | string[]): GradeResult {
  const correct = question.answer as string[];
  const correctArr = [...correct].sort();
  const userArr = (Array.isArray(userAnswer) ? [...userAnswer] : [userAnswer]).sort();
  const isCorrect =
    correctArr.length === userArr.length && correctArr.every((v, i) => v === userArr[i]);

  if (isCorrect) {
    return { score: 100, isCorrect: true };
  }

  const userSet = new Set(userArr);
  const correctSet = new Set(correctArr);
  let selectedWrong = 0;
  let missedCorrect = 0;
  for (const u of userSet) {
    if (!correctSet.has(u)) selectedWrong++;
  }
  for (const c of correctSet) {
    if (!userSet.has(c)) missedCorrect++;
  }
  if (selectedWrong > 0) {
    return { score: 0, isCorrect: false };
  }
  const partialScore = Math.round(((correctArr.length - missedCorrect) / correctArr.length) * 50);
  return { score: partialScore, isCorrect: false };
}

function gradeFill(question: Question, userAnswer: string | string[]): GradeResult {
  const correctAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
  const userText = (Array.isArray(userAnswer) ? userAnswer[0] : userAnswer) || '';

  for (const correct of correctAnswers) {
    if (fuzzyMatchFill(correct, userText)) {
      return { score: 100, isCorrect: true };
    }
  }

  let bestSimilarity = 0;
  for (const correct of correctAnswers) {
    bestSimilarity = Math.max(bestSimilarity, calcFillSimilarity(correct, userText));
  }

  if (bestSimilarity >= 0.8) {
    return { score: Math.round(bestSimilarity * 80), isCorrect: false };
  }
  return { score: 0, isCorrect: false };
}

function resolveKeywords(question: Question, options?: GradeOptions): Keyword[] {
  if (options?.keywords && options.keywords.length > 0) {
    return options.keywords;
  }
  return question.keywords || [];
}

function gradeEssay(question: Question, userAnswer: string | string[], options?: GradeOptions): GradeResult {
  const userText = (Array.isArray(userAnswer) ? userAnswer.join(' ') : userAnswer) || '';
  const keywords = resolveKeywords(question, options);
  const passScore = options?.passScore ?? 60;
  const minWordCount = options?.minWordCount ?? 5;

  if (keywords.length === 0) {
    return {
      score: 0,
      isCorrect: false,
      details: { matchedKeywords: [], missedKeywords: [], hitWeight: 0, totalWeight: 0 },
    };
  }

  const userNorm = normalizeText(userText);
  let totalWeight = 0;
  let hitWeight = 0;
  const matchedKeywords: string[] = [];
  const missedKeywords: string[] = [];

  for (const kw of keywords) {
    totalWeight += kw.weight;
    if (userNorm.includes(normalizeText(kw.word))) {
      hitWeight += kw.weight;
      matchedKeywords.push(kw.word);
    } else {
      missedKeywords.push(kw.word);
    }
  }

  if (totalWeight === 0) {
    return {
      score: 0,
      isCorrect: false,
      details: { matchedKeywords, missedKeywords, hitWeight: 0, totalWeight: 0 },
    };
  }

  const rawRatio = hitWeight / totalWeight;

  let score: number;
  if (rawRatio >= 1.0) {
    score = 100;
  } else if (rawRatio >= 0.8) {
    score = 80 + Math.round(((rawRatio - 0.8) / 0.2) * 20);
  } else if (rawRatio >= 0.6) {
    score = 60 + Math.round(((rawRatio - 0.6) / 0.2) * 20);
  } else if (rawRatio >= 0.4) {
    score = 40 + Math.round(((rawRatio - 0.4) / 0.2) * 20);
  } else if (rawRatio >= 0.2) {
    score = 20 + Math.round(((rawRatio - 0.2) / 0.2) * 20);
  } else {
    score = Math.round((rawRatio / 0.2) * 20);
  }

  const wordCount = userNorm.split(' ').filter((w) => w.length > 0).length;
  if (wordCount < minWordCount) {
    score = Math.round(score * 0.5);
  } else if (wordCount < minWordCount * 2) {
    score = Math.round(score * 0.8);
  }

  score = Math.min(100, Math.max(0, score));

  return {
    score,
    isCorrect: score >= passScore,
    details: { matchedKeywords, missedKeywords, hitWeight, totalWeight },
  };
}

export function gradeQuestion(
  question: Question,
  userAnswer: string | string[],
  options?: GradeOptions
): GradeResult {
  const type: QuestionType = question.type;

  switch (type) {
    case 'single':
      return gradeSingleChoice(question, userAnswer);
    case 'multiple':
      return gradeMultipleChoice(question, userAnswer);
    case 'fill':
      return gradeFill(question, userAnswer);
    case 'essay':
      return gradeEssay(question, userAnswer, options);
    default:
      return { score: 0, isCorrect: false };
  }
}

export function gradeAll(
  questions: Question[],
  answers: Record<string, string | string[]>,
  options?: GradeOptions
): { results: Record<string, GradeResult>; totalScore: number; correctCount: number } {
  const results: Record<string, GradeResult> = {};
  let totalScore = 0;
  let correctCount = 0;

  for (const q of questions) {
    const answer = answers[q.id];
    if (answer !== undefined && answer !== '') {
      const result = gradeQuestion(q, answer, options);
      results[q.id] = result;
      totalScore += result.score;
      if (result.isCorrect) correctCount++;
    } else {
      results[q.id] = { score: 0, isCorrect: false };
    }
  }

  return {
    results,
    totalScore: questions.length > 0 ? Math.round(totalScore / questions.length) : 0,
    correctCount,
  };
}

export { fuzzyMatchFill, calcFillSimilarity, resolveKeywords };
