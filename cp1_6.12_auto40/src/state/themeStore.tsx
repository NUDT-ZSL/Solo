import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { Theme, DEFAULT_THEME, FONT_FAMILIES, FontFamilyOption } from '@/types/theme';

interface ThemeContextType {
  theme: Theme;
  updateTheme: (updates: Partial<Theme>) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  const updateTheme = useCallback((updates: Partial<Theme>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  }, []);

  const resetTheme = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--border-radius', `${theme.borderRadius}px`);
    root.style.setProperty('--box-shadow-strength', `${theme.boxShadow}`);
    root.style.setProperty(
      '--box-shadow',
      theme.boxShadow > 0
        ? `0 ${theme.boxShadow}px ${theme.boxShadow * 2}px rgba(0, 0, 0, ${theme.boxShadow * 0.03})`
        : 'none'
    );
    root.style.setProperty('--font-family', FONT_FAMILIES[theme.fontFamily as FontFamilyOption] || FONT_FAMILIES['sans-serif']);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, updateTheme, resetTheme }),
    [theme, updateTheme, resetTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
