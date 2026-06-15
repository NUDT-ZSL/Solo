import type { EmotionType, Book, DiaryRecord } from '../types';

const POSITIVE_EMOTIONS: EmotionType[] = ['happy', 'calm'];
const NEGATIVE_EMOTIONS: EmotionType[] = ['bored', 'irritated', 'crying'];

export const getRecommendationReason = (recentRecords: DiaryRecord[]): string => {
  if (recentRecords.length < 3) {
    return '根据孩子的阅读习惯为您推荐';
  }

  const lastThree = recentRecords.slice(0, 3);
  const allPositive = lastThree.every(r => POSITIVE_EMOTIONS.includes(r.emotion));
  const hasNegative = lastThree.some(r => NEGATIVE_EMOTIONS.includes(r.emotion));

  if (allPositive) {
    return '最近孩子阅读状态很棒！推荐探险类书籍继续保持兴趣';
  } else if (hasNegative) {
    return '发现孩子最近阅读兴趣不高，推荐趣味互动类书籍';
  }
  return '根据孩子的阅读习惯为您推荐';
};

export const filterBooksByRecommendation = (
  books: Book[],
  recentRecords: DiaryRecord[]
): Book[] => {
  if (recentRecords.length < 3) {
    return books.slice(0, 4);
  }

  const lastThree = recentRecords.slice(0, 3);
  const allPositive = lastThree.every(r => POSITIVE_EMOTIONS.includes(r.emotion));
  const hasNegative = lastThree.some(r => NEGATIVE_EMOTIONS.includes(r.emotion));

  if (allPositive) {
    return books.filter(b => b.category === 'adventure').slice(0, 4);
  } else if (hasNegative) {
    return books.filter(b => b.category === 'interactive').slice(0, 4);
  }

  return books.slice(0, 4);
};
