const CREDIT_SCORE_DEDUCTION_PER_DAY = 2;
const MIN_CREDIT_SCORE = 0;
const MAX_CREDIT_SCORE = 100;

export function calculateCreditScore(overdueDays: number, baseScore: number): number {
  const deduction = overdueDays * CREDIT_SCORE_DEDUCTION_PER_DAY;
  const newScore = baseScore - deduction;
  return Math.max(MIN_CREDIT_SCORE, Math.min(MAX_CREDIT_SCORE, newScore));
}

export function getCreditScoreLevel(creditScore: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (creditScore >= 90) return 'excellent';
  if (creditScore >= 75) return 'good';
  if (creditScore >= 60) return 'fair';
  return 'poor';
}

export function canBorrowBook(creditScore: number): boolean {
  return creditScore >= 60;
}
