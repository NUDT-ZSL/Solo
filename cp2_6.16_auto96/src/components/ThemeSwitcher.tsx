import { useState } from 'react';

export type ThemeKey = 'dark-purple' | 'forest-green' | 'ocean-blue';

interface ThemeSwitcherProps {
  currentTheme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
}

const themes: { key: ThemeKey; label: string; color: string }[] = [
  { key: 'dark-purple', label: '暗夜紫', color: '#1a1a2e' },
  { key: 'forest-green', label: '森林绿', color: '#0a2e1a' },
  { key: 'ocean-blue', label: '海洋蓝', color: '#0a1628' },
];

export default function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        zIndex: 999,
      }}
    >
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '72px',
            right: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: '#2d2d3f',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          {themes.map((theme) => (
            <button
              key={theme.key}
              onClick={() => {
                onThemeChange(theme.key);
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '12px',
                border: currentTheme === theme.key ? '2px solid #feca57' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '140px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: theme.color,
                  border: '2px solid rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{theme.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="切换主题"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          backgroundColor: '#2d2d3f',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)';
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(0, 0, 0, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: '#feca57' }}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </button>
    </div>
  );
}
