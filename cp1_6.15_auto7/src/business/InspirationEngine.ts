import type { Inspiration, InspirationType, Priority } from '../types/inspiration';

export interface FilterOptions {
  search?: string;
  type?: InspirationType | 'all';
  priority?: Priority | 'all';
  project?: string | 'all';
  onlyFavorites?: boolean;
}

export type SortType = 'newest' | 'oldest' | 'hot';

export interface TagAggregation {
  tag: string;
  count: number;
}

export class InspirationEngine {
  private inspirations: Inspiration[];

  constructor(inspirations: Inspiration[]) {
    this.inspirations = inspirations;
  }

  filter(options: FilterOptions): InspirationEngine {
    let filtered = [...this.inspirations];

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower)
      );
    }

    if (options.type && options.type !== 'all') {
      filtered = filtered.filter((item) => item.type === options.type);
    }

    if (options.priority && options.priority !== 'all') {
      filtered = filtered.filter((item) => item.priority === options.priority);
    }

    if (options.project && options.project !== 'all') {
      filtered = filtered.filter((item) => item.project === options.project);
    }

    if (options.onlyFavorites) {
      filtered = filtered.filter((item) => item.isFavorite);
    }

    return new InspirationEngine(filtered);
  }

  sort(sortType: SortType): InspirationEngine {
    const sorted = [...this.inspirations];

    switch (sortType) {
      case 'newest':
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'oldest':
        sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case 'hot':
        sorted.sort((a, b) => this.calculateHeat(b) - this.calculateHeat(a));
        break;
    }

    return new InspirationEngine(sorted);
  }

  calculateHeat(inspiration: Inspiration): number {
    const now = Date.now();
    const createdTime = new Date(inspiration.createdAt).getTime();
    const ageInHours = Math.max((now - createdTime) / (1000 * 60 * 60), 0.1);

    const favoriteScore = inspiration.favoriteCount * 10;
    const timeDecay = 1 / Math.log10(ageInHours + 1);

    return favoriteScore * timeDecay;
  }

  aggregateTags(): TagAggregation[] {
    const tagMap = new Map<string, number>();

    this.inspirations.forEach((item) => {
      item.tags.forEach((tag) => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  getProjects(): string[] {
    const projects = new Set(this.inspirations.map((item) => item.project));
    return Array.from(projects).sort();
  }

  getResults(): Inspiration[] {
    return this.inspirations;
  }

  getCount(): number {
    return this.inspirations.length;
  }
}
