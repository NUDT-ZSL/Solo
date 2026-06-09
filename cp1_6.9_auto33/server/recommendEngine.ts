import { Book, InteractionType, PreferenceMap, ALL_TAGS } from '../src/types';
import { BOOK_DATABASE, getBookById } from './data/books';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const shuffle = <T>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const INITIAL_WEIGHTS: PreferenceMap = ALL_TAGS.reduce((acc, tag) => {
  acc[tag] = 0;
  return acc;
}, {} as PreferenceMap);

let preferenceWeights: PreferenceMap = { ...INITIAL_WEIGHTS };
let cachedRecommendations: Book[] | null = null;
let cacheValid = false;

export const getWeights = (): PreferenceMap => ({ ...preferenceWeights });

export const resetWeights = (): void => {
  preferenceWeights = { ...INITIAL_WEIGHTS };
  cacheValid = false;
};

export const hasAnyPreference = (): boolean =>
  Object.values(preferenceWeights).some((w) => w > 0.001);

const ACTION_DELTAS: Record<InteractionType, number> = {
  like: 0.1,
  favorite: 0.2,
  ignore: -0.15,
};

export const adjustWeights = (bookId: string, action: InteractionType): void => {
  const book = getBookById(bookId);
  if (!book) return;

  const delta = ACTION_DELTAS[action];
  for (const tag of book.tags) {
    if (tag in preferenceWeights) {
      preferenceWeights[tag] = clamp(preferenceWeights[tag] + delta, 0, 1);
    }
  }
  cacheValid = false;
};

export const calculateScore = (book: Book, weights: PreferenceMap): number => {
  if (book.tags.length === 0) return 0;
  let sum = 0;
  for (const tag of book.tags) {
    sum += weights[tag] ?? 0;
  }
  return sum / book.tags.length;
};

export const buildRecommendReason = (
  book: Book,
  weights: PreferenceMap
): string => {
  if (!hasAnyPreference()) {
    return '初始随机推荐，开始互动以个性化您的书单吧！';
  }
  const entries = book.tags
    .map((t) => ({ tag: t, w: weights[t] ?? 0 }))
    .sort((a, b) => b.w - a.w);
  const top = entries[0];
  if (top.w < 0.01) {
    return '探索新书，拓展阅读边界';
  }
  return `您对「${top.tag}」标签的偏好度较高(${(top.w * 100).toFixed(0)}%)`;
};

export const generateRecommendations = (count: number = 10): Book[] => {
  if (cacheValid && cachedRecommendations) {
    return cachedRecommendations;
  }

  const weights = preferenceWeights;
  const hasPref = hasAnyPreference();

  const scored = BOOK_DATABASE.map((book) => {
    const score = hasPref ? calculateScore(book, weights) : Math.random();
    return {
      ...book,
      matchScore: score,
      recommendReason: buildRecommendReason(book, weights),
    };
  });

  scored.sort((a, b) => {
    const diff = (b.matchScore ?? 0) - (a.matchScore ?? 0);
    if (Math.abs(diff) > 1e-6) return diff;
    return Math.random() - 0.5;
  });

  const result: Book[] = [];
  const seen = new Set<string>();
  for (const b of scored) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    result.push(b);
    if (result.length >= count) break;
  }

  while (result.length < count && result.length < BOOK_DATABASE.length) {
    const remaining = shuffle(BOOK_DATABASE.filter((b) => !seen.has(b.id)));
    if (remaining.length === 0) break;
    const pick = remaining[0];
    seen.add(pick.id);
    result.push({
      ...pick,
      matchScore: calculateScore(pick, weights),
      recommendReason: buildRecommendReason(pick, weights),
    });
  }

  cachedRecommendations = result;
  cacheValid = true;
  return result;
};

export const getAllTags = (): string[] => [...ALL_TAGS];
