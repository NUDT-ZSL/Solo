export interface Recipe {
  id: string;
  title: string;
  authorId: string;
  cuisine: string;
  cookingTime: number;
  imageUrl: string;
  ingredients: Ingredient[];
  steps: Step[];
  ratings: number[];
  tags: string[];
  comments: Comment[];
  createdAt: number;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Step {
  description: string;
  duration: number;
  tip?: string;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface FilterOptions {
  cuisine?: string;
  cookingTime?: string;
  search?: string;
}

export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  if (!query.trim()) return recipes;
  const q = query.toLowerCase();
  return recipes.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      r.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
  );
}

export function filterRecipes(recipes: Recipe[], filters: FilterOptions): Recipe[] {
  let result = [...recipes];

  if (filters.cuisine) {
    result = result.filter((r) => r.cuisine === filters.cuisine);
  }

  if (filters.cookingTime) {
    if (filters.cookingTime === '<15') {
      result = result.filter((r) => r.cookingTime < 15);
    } else if (filters.cookingTime === '15-30') {
      result = result.filter((r) => r.cookingTime >= 15 && r.cookingTime <= 30);
    } else if (filters.cookingTime === '>30') {
      result = result.filter((r) => r.cookingTime > 30);
    }
  }

  if (filters.search) {
    result = searchRecipes(result, filters.search);
  }

  return result;
}

export function calculateAverageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function sortCommentsByTime(comments: Comment[], order: 'desc' | 'asc' = 'desc'): Comment[] {
  return [...comments].sort((a, b) =>
    order === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
  );
}

export function addComment(comments: Comment[], newComment: Comment): Comment[] {
  return sortCommentsByTime([newComment, ...comments]);
}

export function rateRecipe(ratings: number[], newRating: number): { ratings: number[]; average: number } {
  const updated = [...ratings, newRating];
  return {
    ratings: updated,
    average: calculateAverageRating(updated),
  };
}

export function getCookingTimeLabel(minutes: number): string {
  if (minutes < 15) return '<15分钟';
  if (minutes <= 30) return '15-30分钟';
  return '>30分钟';
}

export function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function paginateRecipes(recipes: Recipe[], page: number, pageSize: number): Recipe[] {
  const start = (page - 1) * pageSize;
  return recipes.slice(start, start + pageSize);
}
