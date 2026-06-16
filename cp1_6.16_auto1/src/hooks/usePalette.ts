import { useState, useCallback } from 'react';

const DEFAULT_COLORS = [
  '#FF5733',
  '#33FF57',
  '#3357FF',
  '#F333FF',
  '#FF33A8',
  '#A833FF',
];

export function usePalette() {
  const [colors, setColors] = useState<string[]>(DEFAULT_COLORS);

  const updateColor = useCallback((index: number, hex: string) => {
    setColors((prev) => {
      const next = [...prev];
      next[index] = hex;
      return next;
    });
  }, []);

  const resetColors = useCallback(() => {
    setColors(DEFAULT_COLORS);
  }, []);

  return { colors, updateColor, resetColors };
}
