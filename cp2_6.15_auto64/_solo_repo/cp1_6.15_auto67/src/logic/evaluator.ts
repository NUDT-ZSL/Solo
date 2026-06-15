import { Idea, EvaluationResult, Category, CATEGORY_CONFIG } from './types';

const INTUITION_WEIGHT = 0.6;
const BASE_WEIGHT_SCORE = 40;

export function evaluateIdea(idea: Idea): EvaluationResult {
  const categoryConfig = CATEGORY_CONFIG[idea.category];
  const intuitionComponent = idea.intuitionScore * INTUITION_WEIGHT;
  const weightComponent = categoryConfig.weight * BASE_WEIGHT_SCORE;
  const score = intuitionComponent + weightComponent;

  const clampedScore = Math.max(0, Math.min(100, score));
  const stars = scoreToStars(clampedScore);

  return {
    score: Math.round(clampedScore * 10) / 10,
    stars,
    breakdown: {
      intuitionComponent: Math.round(intuitionComponent * 10) / 10,
      weightComponent: Math.round(weightComponent * 10) / 10
    }
  };
}

export function scoreToStars(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

export function getScoreGradientColor(score: number): string {
  const ratio = Math.max(0, Math.min(1, score / 100));
  const r = Math.round(231 * (1 - ratio));
  const g = Math.round(76 + (148 - 76) * ratio);
  const b = Math.round(60 * (1 - ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

export function filterAndSortIdeas(
  ideas: Idea[],
  filterCategory: Category | 'all',
  sortType: 'score' | 'time'
): Idea[] {
  let result = ideas;

  if (filterCategory !== 'all') {
    result = result.filter((idea) => idea.category === filterCategory);
  }

  result = [...result].sort((a, b) => {
    if (sortType === 'score') {
      const scoreA = evaluateIdea(a).score;
      const scoreB = evaluateIdea(b).score;
      return scoreB - scoreA;
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return result;
}

export function getAverageScore(ideas: Idea[]): number {
  if (ideas.length === 0) return 0;
  const total = ideas.reduce((sum, idea) => sum + evaluateIdea(idea).score, 0);
  return Math.round((total / ideas.length) * 10) / 10;
}
