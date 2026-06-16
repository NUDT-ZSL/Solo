import type { RatingItem, RatingAggregate } from './types';

export interface AggregateResult extends RatingAggregate {
  stars: string;
}

export function aggregateRatings(ratings: RatingItem[]): AggregateResult {
  if (ratings.length === 0) {
    return {
      average: 0,
      count: 0,
      distribution: [0, 0, 0, 0, 0],
      stars: '0.0',
    };
  }

  const distribution = [0, 0, 0, 0, 0];
  let sum = 0;

  for (const r of ratings) {
    sum += r.score;
    distribution[r.score - 1] += 1;
  }

  const average = Math.round((sum / ratings.length) * 10) / 10;
  return {
    average,
    count: ratings.length,
    distribution,
    stars: average.toFixed(1),
  };
}

export function sortGamesByRating<T extends { rating: RatingAggregate }>(games: T[], ascending = false): T[] {
  return [...games].sort((a, b) => {
    const avgDiff = b.rating.average - a.rating.average;
    if (avgDiff !== 0) return ascending ? avgDiff : -avgDiff;
    const countDiff = b.rating.count - a.rating.count;
    return ascending ? countDiff : -countDiff;
  });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
