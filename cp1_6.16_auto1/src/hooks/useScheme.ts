import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ColorScheme } from '../utils/copyUtil';

export function useScheme() {
  const [schemes, setSchemes] = useState<ColorScheme[]>([]);
  const [schemeCounter, setSchemeCounter] = useState(1);

  const addScheme = useCallback(
    (color1: string, color2: string, mixed: string[]) => {
      const newScheme: ColorScheme = {
        id: uuidv4(),
        name: `方案${schemeCounter}`,
        color1,
        color2,
        mixed,
      };
      setSchemes((prev) => [newScheme, ...prev]);
      setSchemeCounter((c) => c + 1);
      return newScheme;
    },
    [schemeCounter],
  );

  const renameScheme = useCallback((id: string, name: string) => {
    setSchemes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s)),
    );
  }, []);

  const removeScheme = useCallback((id: string) => {
    setSchemes((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { schemes, addScheme, renameScheme, removeScheme };
}
