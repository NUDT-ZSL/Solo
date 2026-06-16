import React from 'react';
import { Moon, Sun } from 'lucide-react';
import type { Theme } from '../types';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
        (e.target as HTMLButtonElement).style.boxShadow =
          '0 4px 12px rgba(59, 130, 246, 0.5)';
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLButtonElement).style.transform = 'scale(1)';
        (e.target as HTMLButtonElement).style.boxShadow =
          '0 2px 8px rgba(59, 130, 246, 0.4)';
      }}
      onMouseDown={(e) => {
        (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
      }}
      aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
    >
      {isDark ? (
        <Sun size={20} strokeWidth={2} />
      ) : (
        <Moon size={20} strokeWidth={2} />
      )}
    </button>
  );
};

export default ThemeToggle;
