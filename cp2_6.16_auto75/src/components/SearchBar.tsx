import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (repoUrl: string) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSearch(inputValue.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.container}>
      <style>{`
        @keyframes dot-blink {
          0%, 80%, 100% {
            opacity: 0.3;
          }
          40% {
            opacity: 1;
          }
        }
        .loading-dot-0 {
          animation: dot-blink 0.9s infinite ease-in-out;
          animation-delay: 0s;
        }
        .loading-dot-1 {
          animation: dot-blink 0.9s infinite ease-in-out;
          animation-delay: 0.3s;
        }
        .loading-dot-2 {
          animation: dot-blink 0.9s infinite ease-in-out;
          animation-delay: 0.6s;
        }
      `}</style>

      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="输入 GitHub 仓库地址，如 owner/repo"
        style={{
          ...styles.input,
          borderColor: isFocused ? '#6366f1' : '#e2e8f0',
          boxShadow: isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none'
        }}
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !inputValue.trim()}
        style={{
          ...styles.button,
          opacity: isLoading || !inputValue.trim() ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (!isLoading && inputValue.trim()) {
            (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
          }
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.filter = 'none';
        }}
      >
        搜索
      </button>
      {isLoading && (
        <div style={styles.loadingDots}>
          <span className="loading-dot-0" style={styles.dot} />
          <span className="loading-dot-1" style={styles.dot} />
          <span className="loading-dot-2" style={styles.dot} />
        </div>
      )}
    </form>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px'
  } as React.CSSProperties,
  input: {
    width: '360px',
    height: '48px',
    padding: '0 16px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  } as React.CSSProperties,
  button: {
    width: '120px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'filter 0.2s, opacity 0.2s'
  } as React.CSSProperties,
  loadingDots: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center'
  } as React.CSSProperties,
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#a5b4fc'
  } as React.CSSProperties
};

export default SearchBar;
