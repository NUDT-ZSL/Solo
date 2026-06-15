import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { ThemeType } from '../http';

export interface ThemeStyles {
  galleryBackground: string;
  wallBackground: string;
  cardBackground: string;
  cardShadow: string;
  cardBorder: string;
  titleColor: string;
  authorColor: string;
  buttonActiveColor: string;
}

interface ThemeContextValue {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  styles: ThemeStyles;
}

export const themeMap: Record<ThemeType, ThemeStyles> = {
  warm: {
    galleryBackground: '#fdf6ec',
    wallBackground: '#fdf6ec',
    cardBackground: '#ffffff',
    cardShadow: '0 6px 24px rgba(243, 156, 18, 0.25)',
    cardBorder: '1px solid #f6e0b9',
    titleColor: '#5c3a1e',
    authorColor: '#8b6914',
    buttonActiveColor: '#f39c12',
  },
  cool: {
    galleryBackground: '#ebf4f9',
    wallBackground: '#ebf4f9',
    cardBackground: '#ffffff',
    cardShadow: '0 6px 24px rgba(52, 152, 219, 0.25)',
    cardBorder: '1px solid #bddff3',
    titleColor: '#1a365d',
    authorColor: '#2c5282',
    buttonActiveColor: '#3498db',
  },
  neon: {
    galleryBackground: '#1a0a2e',
    wallBackground: '#1a0a2e',
    cardBackground: '#2d1b4e',
    cardShadow: '0 6px 24px rgba(155, 89, 182, 0.5)',
    cardBorder: '1px solid #9b59b6',
    titleColor: '#e9d8fd',
    authorColor: '#d6bcfa',
    buttonActiveColor: '#9b59b6',
  },
  soft: {
    galleryBackground: '#e8f5ef',
    wallBackground: '#e8f5ef',
    cardBackground: '#ffffff',
    cardShadow: '0 6px 24px rgba(46, 204, 113, 0.25)',
    cardBorder: '1px solid #b8e6c8',
    titleColor: '#1c4532',
    authorColor: '#276749',
    buttonActiveColor: '#2ecc71',
  },
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeType>('warm');

  const handleSetTheme = useCallback((newTheme: ThemeType) => {
    setTheme(newTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: handleSetTheme,
      styles: themeMap[theme],
    }),
    [theme, handleSetTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
