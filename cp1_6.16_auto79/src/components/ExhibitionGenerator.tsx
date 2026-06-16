import React, { useState, useMemo } from 'react';
import { Book, matchBooksByTheme, getThemeColor, books } from '../utils/bookData';

interface ExhibitionGeneratorProps {
  onGenerateExhibition?: (theme: string, selectedBooks: Book[]) => void;
}

const THEME_GRADIENTS: Record<string, string[]> = {
  default: [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ],
  深海: [
    'linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  ],
  宇宙: [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #2C3E50 0%, #4A6572 100%)',
    'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
    'linear-gradient(135deg, #8E44AD 0%, #3498DB 100%)',
  ],
  侦探: [
    'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
    'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)',
    'linear-gradient(135deg, #9B59B6 0%, #8E44AD 100%)',
    'linear-gradient(135deg, #f5576c 0%, #E74C3C 100%)',
    'linear-gradient(135deg, #7F8C8D 0%, #95A5A6 100%)',
  ],
  绘本: [
    'linear-gradient(135deg, #F39C12 0%, #E67E22 100%)',
    'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
    'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
    'linear-gradient(135deg, #E91E63 0%, #F06292 100%)',
    'linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)',
  ],
};

function getThemeGradients(theme: string): string[] {
  const themeLower = theme.toLowerCase();
  for (const key of Object.keys(THEME_GRADIENTS)) {
    if (themeLower.includes(key) && key !== 'default') {
      return THEME_GRADIENTS[key];
    }
  }
  return THEME_GRADIENTS.default;
}

const ExhibitionGenerator: React.FC<ExhibitionGeneratorProps> = ({ onGenerateExhibition }) => {
  const [theme, setTheme] = useState('深海秘境');
  const [searchTheme, setSearchTheme] = useState('深海秘境');
  const [selectedBooks, setSelectedBooks] = useState<Set<number>>(new Set());
  const [minRecommend, setMinRecommend] = useState(10);

  const recommendedBooks = useMemo(() => {
    if (!searchTheme.trim()) return [];
    return matchBooksByTheme(searchTheme, books);
  }, [searchTheme]);

  const gradients = useMemo(() => getThemeGradients(searchTheme), [searchTheme]);

  const handleSearch = () => {
    setSearchTheme(theme);
    setSelectedBooks(new Set());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleBookSelection = (bookId: number) => {
    setSelectedBooks(prev => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  };

  const isBelowMinimum = selectedBooks.size < minRecommend && recommendedBooks.length > 0;
  const themeColor = getThemeColor(searchTheme);

  const handleGenerate = () => {
    const selected = recommendedBooks.filter(b => selectedBooks.has(b.id));
    onGenerateExhibition?.(searchTheme, selected);
  };

  const selectAll = () => {
    setSelectedBooks(new Set(recommendedBooks.map(b => b.id)));
  };

  const clearSelection = () => {
    setSelectedBooks(new Set());
  };

  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ marginBottom: '24px', color: '#2C3E50', fontSize: '22px' }}>主题书展生成器</h2>

      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#5D6D7E', fontWeight: 500 }}>
              主题关键词
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入主题关键词，如：深海秘境"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #D5DBDB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#4A90D9')}
              onBlur={(e) => (e.target.style.borderColor = '#D5DBDB')}
            />
          </div>

          <div style={{ minWidth: '120px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#5D6D7E', fontWeight: 500 }}>
              最小推荐数
            </label>
            <input
              type="number"
              value={minRecommend}
              onChange={(e) => setMinRecommend(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              max={20}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #D5DBDB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#4A90D9')}
              onBlur={(e) => (e.target.style.borderColor = '#D5DBDB')}
            />
          </div>

          <button
            onClick={handleSearch}
            style={{
              padding: '10px 24px',
              backgroundColor: '#4A90D9',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#357ABD')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4A90D9')}
          >
            生成推荐
          </button>
        </div>

        {recommendedBooks.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#5D6D7E' }}>
                找到 <strong style={{ color: '#2C3E50' }}>{recommendedBooks.length}</strong> 本推荐图书
              </span>
              <span style={{ fontSize: '14px', color: isBelowMinimum ? '#E74C3C' : '#5D6D7E' }}>
                已选 <strong style={{ color: isBelowMinimum ? '#E74C3C' : '#4A90D9' }}>{selectedBooks.size}</strong> 本
                {isBelowMinimum && ` (至少需要 ${minRecommend} 本)`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={selectAll}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'white',
                  color: '#4A90D9',
                  border: '1px solid #4A90D9',
                  borderRadius: '6px',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EBF5FB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                全选
              </button>
              <button
                onClick={clearSelection}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'white',
                  color: '#7F8C8D',
                  border: '1px solid #D5DBDB',
                  borderRadius: '6px',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8F9F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                清空
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            border: `2px ${isBelowMinimum ? 'dashed' : 'solid'} ${isBelowMinimum ? '#E74C3C' : '#E8E8E8'}`,
            borderRadius: '12px',
            transition: 'border-color 0.3s',
            animation: isBelowMinimum ? 'dashFlash 1s ease-in-out infinite' : 'none',
          }}
        >
          {recommendedBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#BDC3C7' }}>
              <p style={{ fontSize: '48px', marginBottom: '12px' }}>📚</p>
              <p style={{ fontSize: '14px' }}>输入主题关键词，生成推荐书单</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(10, 1fr)',
                gap: '12px',
                justifyItems: 'center',
              }}
              className="book-grid"
            >
              {recommendedBooks.map((book, index) => (
                <BookCard
                  key={book.id}
                  book={book}
                  selected={selectedBooks.has(book.id)}
                  gradient={gradients[index % gradients.length]}
                  onClick={() => toggleBookSelection(book.id)}
                  delay={index * 0.02}
                />
              ))}
            </div>
          )}
        </div>

        {selectedBooks.size > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleGenerate}
              style={{
                padding: '12px 32px',
                backgroundColor: isBelowMinimum ? '#BDC3C7' : themeColor,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: isBelowMinimum ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              disabled={isBelowMinimum}
              onMouseEnter={(e) => {
                if (!isBelowMinimum) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isBelowMinimum) {
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
              策划书展 ({selectedBooks.size}本)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface BookCardProps {
  book: Book;
  selected: boolean;
  gradient: string;
  onClick: () => void;
  delay: number;
}

const BookCard: React.FC<BookCardProps> = ({ book, selected, gradient, onClick, delay }) => {
  return (
    <div
      onClick={onClick}
      style={{
        width: '140px',
        height: '200px',
        borderRadius: '8px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: selected ? '0 4px 16px rgba(74, 144, 217, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        animation: `scaleIn 0.3s ease-out ${delay}s both`,
        transform: selected ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = selected ? 'scale(1.05)' : 'scale(1.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = selected ? 'scale(1.02)' : 'scale(1)';
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: gradient,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>
          {book.category === '科幻' && '🚀'}
          {book.category === '推理' && '🔍'}
          {book.category === '绘本' && '📖'}
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            lineHeight: 1.3,
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {book.title}
        </div>
        <div
          style={{
            fontSize: '11px',
            opacity: 0.9,
            marginTop: '6px',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        >
          {book.author}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: selected ? '#27AE60' : 'rgba(255, 255, 255, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          opacity: selected ? 1 : 0.8,
          animation: selected ? 'scaleIn 0.2s ease-out' : 'none',
        }}
      >
        {selected ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#BDC3C7" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(160, 160, 160, 0.15)',
};

export default ExhibitionGenerator;
