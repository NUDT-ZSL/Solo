import React from 'react';
import { iconCategories } from '../icons/iconData';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (categoryId: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, categoryFilter, onCategoryChange }) => {
  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.searchBox}>
          <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            style={styles.input}
            placeholder="搜索图标名称或标签..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {value && (
            <button style={styles.clearBtn} onClick={() => onChange('')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div style={styles.categoryTabs}>
          <button
            style={{
              ...styles.categoryTab,
              ...(categoryFilter === '' ? styles.categoryTabActive : {})
            }}
            onClick={() => onCategoryChange('')}
          >
            全部
          </button>
          {iconCategories.map((cat) => (
            <button
              key={cat.id}
              style={{
                ...styles.categoryTab,
                ...(categoryFilter === cat.id ? styles.categoryTabActive : {})
              }}
              onClick={() => onCategoryChange(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(20px)',
    background: 'rgba(26, 26, 46, 0.9)',
    borderBottom: '1px solid rgba(15, 52, 96, 0.5)',
    padding: '16px 24px',
  },
  wrapper: {
    maxWidth: '1600px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    width: '20px',
    height: '20px',
    color: '#6c7a89',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '14px 48px 14px 48px',
    fontSize: '15px',
    background: '#16213e',
    border: '2px solid #0f3460',
    borderRadius: '12px',
    color: '#e0e0e0',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  clearBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#6c7a89',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  categoryTabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryTab: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: '8px',
    color: '#a0a0b0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  categoryTabActive: {
    background: 'linear-gradient(135deg, #0f3460, #19458a)',
    color: '#ffffff',
    borderColor: '#e94560',
    boxShadow: '0 2px 12px rgba(233, 69, 96, 0.25)',
  },
};

export default SearchBar;
