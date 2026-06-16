import React, { useState, useMemo } from 'react';
import { Book, matchBooksByTheme, getThemeColor, books } from '../utils/bookData';

interface ExhibitionGeneratorProps {
  onGenerateExhibition?: (theme: string, selectedBooks: Book[]) => void;
}

const THEME_COLOR_PALETTE: Record<string, string[]> = {
  default: ['#4A90D9', '#8E44AD', '#3498DB'],
  深海: ['#0093E9', '#80D0C7', '#667eea', '#4facfe'],
  宇宙: ['#667eea', '#764ba2', '#2C3E50', '#8E44AD'],
  侦探: ['#E74C3C', '#C0392B', '#2C3E50', '#9B59B6'],
  绘本: ['#F39C12', '#E67E22', '#2ECC71', '#E91E63'],
  科幻: ['#667eea', '#0093E9', '#8E44AD'],
  推理: ['#E74C3C', '#9B59B6', '#2C3E50'],
  海洋: ['#0093E9', '#80D0C7', '#4facfe', '#5ee7df'],
  星空: ['#2C3E50', '#667eea', '#8E44AD', '#0f0c29'],
  冒险: ['#F39C12', '#E74C3C', '#3498DB'],
  成长: ['#2ECC71', '#F39C12', '#3498DB'],
  自然: ['#27AE60', '#F39C12', '#2ECC71'],
  亲情: ['#E91E63', '#F39C12', '#FF7675'],
};

function getThemeColorPalette(theme: string): string[] {
  const themeLower = theme.toLowerCase();
  for (const key of Object.keys(THEME_COLOR_PALETTE)) {
    if (themeLower.includes(key) && key !== 'default') {
      return THEME_COLOR_PALETTE[key];
    }
  }
  return THEME_COLOR_PALETTE.default;
}

function generateVariedGradients(colors: string[], count: number): string[] {
  const gradients: string[] = [];
  const angles = [120, 135, 150, 160, 110, 145, 125, 155];
  const stopPositions = [
    [0, 100],
    [0, 70, 100],
    [0, 85, 100],
    [10, 90, 100],
    [0, 60, 100],
  ];

  for (let i = 0; i < count; i++) {
    const color1 = colors[i % colors.length];
    const color2 = colors[(i + 1) % colors.length];
    const color3 = colors[(i + 2) % colors.length];
    const angle = angles[i % angles.length] + (i * 3) % 15;
    const stops = stopPositions[i % stopPositions.length];

    if (stops.length === 2) {
      gradients.push(`linear-gradient(${angle}deg, ${color1} ${stops[0]}%, ${color2} ${stops[1]}%)`);
    } else {
      gradients.push(`linear-gradient(${angle}deg, ${color1} ${stops[0]}%, ${color2} ${stops[1]}%, ${color3} ${stops[2]}%)`);
    }
  }

  return gradients;
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

  const gradients = useMemo(() => {
    if (!searchTheme.trim()) return [];
    const palette = getThemeColorPalette(searchTheme);
    return generateVariedGradients(palette, 20);
  }, [searchTheme]);

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
            animation: isBelowMinimum ? 'dashFlash 1.5s ease-in-out infinite' : 'none',
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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '140px',
        height: '200px',
        borderRadius: '8px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: selected ? '0 4px 16px rgba(74, 144, 217, 0.3)' : '0 4px 4px #A0A0A0',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        animation: `scaleIn 0.3s ease-out ${delay}s both`,
        transform: selected || isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = selected
          ? '0 8px 20px rgba(74, 144, 217, 0.4)'
          : '0 8px 8px rgba(0, 0, 0, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = selected ? 'translateY(-2px)' : 'translateY(0)';
        e.currentTarget.style.boxShadow = selected
          ? '0 4px 16px rgba(74, 144, 217, 0.3)'
          : '0 4px 4px #A0A0A0';
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
          transition: 'all 0.15s ease',
          opacity: selected ? 1 : 0.8,
          boxShadow: selected && isHovered ? '0 0 6px #27AE60' : 'none',
          animation: selected ? 'scaleIn 0.2s ease-out' : 'none',
        }}
      >
        {selected ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M5 12h14"
              stroke={isHovered ? '#2ECC71' : '#BDC3C7'}
              strokeWidth="3"
              strokeLinecap="round"
              style={{ transition: 'stroke 0.15s ease' }}
            />
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
