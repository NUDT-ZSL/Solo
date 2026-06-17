export const CURRENT_USER_ID = '550e8400-e29b-41d4-a716-446655440012';

export const ADMIN_USER_ID = '550e8400-e29b-41d4-a716-446655440011';

export const BORROW_DURATION_HOURS = 24;

export const PAGE_SIZE = 20;

export const getCreditScoreColor = (score: number): string => {
  if (score >= 90) return '#22c55e';
  if (score >= 80) return '#84cc16';
  if (score >= 70) return '#eab308';
  if (score >= 60) return '#f97316';
  return '#ef4444';
};

export const getCreditScoreGradient = (score: number): string => {
  const ratio = score / 100;
  const r = Math.round(239 + (34 - 239) * ratio);
  const g = Math.round(68 + (197 - 68) * ratio);
  const b = Math.round(68 + (94 - 68) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
};
