import React, { useState } from 'react';

interface Theme {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  cardBackground: string;
  success: string;
  warning: string;
  danger: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  tagColors: string[];
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

interface SearchCardProps {
  onSearch: (input: string) => void;
  onClear: () => void;
  theme: Theme;
  loading: boolean;
}

const SearchCard: React.FC<SearchCardProps> = ({ onSearch, onClear, theme, loading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input.trim());
    }
  };

  const handleClear = () => {
    setInput('');
    onClear();
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px'
  };

  const cardStyle: React.CSSProperties = {
    width: '560px',
    maxWidth: '100%',
    height: '200px',
    backgroundColor: '#fff',
    borderRadius: '24px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    padding: '24px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'transform 200ms ease, box-shadow 200ms ease'
  };

  const textareaStyle: React.CSSProperties = {
    width: '480px',
    maxWidth: '100%',
    height: '80px',
    padding: '12px 16px',
    fontSize: '16px',
    borderRadius: '16px',
    border: `1px solid ${theme.border}`,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 200ms ease, box-shadow 200ms ease',
    color: theme.textPrimary,
    backgroundColor: '#fff'
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: '200px',
    height: '48px',
    borderRadius: '24px',
    backgroundColor: theme.primary,
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'background-color 200ms ease, transform 200ms ease, box-shadow 200ms ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const clearButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: theme.textSecondary,
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'background-color 200ms ease, color 200ms ease'
  };

  return (
    <div style={containerStyle}>
      <div
        style={cardStyle}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
        }}
      >
        <form onSubmit={handleSubmit}>
          <textarea
            style={textareaStyle}
            placeholder="输入食材或用一句话描述想吃的菜"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = theme.primary;
              e.target.style.boxShadow = `0 0 0 3px rgba(255, 112, 67, 0.1)`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = theme.border;
              e.target.style.boxShadow = 'none';
            }}
            disabled={loading}
          />
        </form>

        <div style={buttonContainerStyle}>
          <button
            style={primaryButtonStyle}
            onClick={() => input.trim() && onSearch(input.trim())}
            disabled={loading || !input.trim()}
            onMouseEnter={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.backgroundColor = theme.primaryDark;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = loading ? theme.primary : theme.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.transform = 'scale(0.97)';
              }
            }}
            onMouseUp={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                匹配中...
              </>
            ) : (
              <>
                <span>🔍</span>
                开始匹配
              </>
            )}
          </button>

          <button
            style={clearButtonStyle}
            onClick={handleClear}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
              e.currentTarget.style.color = theme.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textSecondary;
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            清空
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          div[style*="width: 560px"] {
            width: 100% !important;
            height: auto !important;
            min-height: 200px !important;
          }
          textarea[style*="width: 480px"] {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchCard;
