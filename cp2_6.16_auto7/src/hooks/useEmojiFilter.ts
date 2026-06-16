import { useMemo } from 'react';
import type { Emoji, Category } from '../types';

export function useEmojiFilter(
  emojis: Emoji[],
  searchKeyword: string,
  selectedCategory: Category | null
): Emoji[] {
  return useMemo(() => {
    let result = emojis;

    if (selectedCategory) {
      result = result.filter((e) => e.category === selectedCategory);
    }

    const keyword = searchKeyword.trim().toLowerCase();
    if (keyword) {
      result = result.filter((e) => {
        return (
          e.name.toLowerCase().includes(keyword) ||
          e.meaning.toLowerCase().includes(keyword) ||
          e.keywords.some((k) => k.toLowerCase().includes(keyword))
        );
      });
    }

    return result;
  }, [emojis, searchKeyword, selectedCategory]);
}
