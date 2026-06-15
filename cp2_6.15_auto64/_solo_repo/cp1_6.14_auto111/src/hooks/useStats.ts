import { useMemo } from 'react';
import { Article, Stats, Tag, MonthlyViews, TagDistribution } from '../types';

export function useStats(articles: Article[]): Stats {
  return useMemo(() => {
    const totalViews = articles.reduce((sum, a) => sum + a.views, 0);
    const avgLikes = articles.length > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.likes, 0) / articles.length)
      : 0;

    const tagCount = new Map<Tag, number>();
    const monthViews = new Map<string, number>();

    articles.forEach((article) => {
      article.tags.forEach((tag) => {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      });

      const month = article.date.substring(0, 7);
      monthViews.set(month, (monthViews.get(month) || 0) + article.views);
    });

    const tagDistribution: TagDistribution[] = Array.from(tagCount.entries()).map(
      ([name, value]) => ({ name, value })
    );

    const monthlyTrend: MonthlyViews[] = Array.from(monthViews.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, views]) => ({ month, views }));

    return {
      totalViews,
      avgLikes,
      tagDistribution,
      monthlyTrend,
    };
  }, [articles]);
}
