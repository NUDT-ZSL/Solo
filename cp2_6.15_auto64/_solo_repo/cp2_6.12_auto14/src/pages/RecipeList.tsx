import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import RecipeCard from '../components/RecipeCard';
import SearchBar from '../components/SearchBar';
import { useDebounce } from '../hooks/useDebounce';
import { useSearchContext, useRecipesContext } from '../App';

const tagColors = [
  { bg: '#FFF3E0', color: '#E65100' },
  { bg: '#E8F5E9', color: '#2E7D32' },
  { bg: '#E3F2FD', color: '#1565C0' },
  { bg: '#FCE4EC', color: '#AD1457' },
  { bg: '#F3E5F5', color: '#6A1B9A' },
  { bg: '#FFF8E1', color: '#F57F17' },
  { bg: '#E0F7FA', color: '#00695C' },
  { bg: '#FFEBEE', color: '#C62828' },
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tagColors[Math.abs(hash) % tagColors.length];
}

function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          width: '100%',
          paddingTop: '66.67%',
          backgroundColor: '#F0F0F0',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            height: '18px',
            width: '70%',
            backgroundColor: '#F0F0F0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              height: '14px',
              width: '100%',
              backgroundColor: '#F0F0F0',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              height: '14px',
              width: '85%',
              backgroundColor: '#F0F0F0',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <div
            style={{
              height: '22px',
              width: '50px',
              backgroundColor: '#F0F0F0',
              borderRadius: '11px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              height: '22px',
              width: '50px',
              backgroundColor: '#F0F0F0',
              borderRadius: '11px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '120px',
          height: '120px',
          marginBottom: '24px',
          animation: 'bounceSoft 2s ease-in-out infinite',
        }}
      >
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="60" cy="95" rx="35" ry="8" fill="#FFE0B2" />
          <path
            d="M35 35L25 55C22 65 28 80 60 80C92 80 98 65 95 55L85 35H35Z"
            fill="#FFF5E6"
            stroke="#FF8C00"
            strokeWidth="3"
          />
          <ellipse cx="60" cy="35" rx="25" ry="6" fill="#FFE0B2" stroke="#FF8C00" strokeWidth="3" />
          <circle cx="48" cy="55" r="3" fill="#666" />
          <circle cx="72" cy="55" r="3" fill="#666" />
          <path d="M52 65Q60 60 68 65" stroke="#666" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <ellipse cx="20" cy="30" rx="4" ry="3" fill="#FF8C00" opacity="0.6" />
          <ellipse cx="100" cy="25" rx="5" ry="3.5" fill="#FF8C00" opacity="0.6" />
          <ellipse cx="15" cy="85" rx="3" ry="2" fill="#FF8C00" opacity="0.5" />
          <ellipse cx="105" cy="80" rx="4" ry="2.5" fill="#FF8C00" opacity="0.5" />
        </svg>
      </div>
      <h3
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}
      >
        没有找到相关食谱
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
        {query ? `没有找到与"${query}"相关的食谱，换个关键词试试吧` : '暂时还没有食谱哦'}
      </p>
    </div>
  );
}

const VIRTUAL_THRESHOLD = 20;
const CARD_HEIGHT_ESTIMATE = 340;

export default function RecipeList() {
  const { searchQuery, setSearchQuery, activeTag, setActiveTag } = useSearchContext();
  const { recipes, loading } = useRecipesContext();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(localQuery, 300);
  const [scrolled, setScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  useEffect(() => {
    setSearchQuery(localQuery);
  }, [debouncedQuery, setSearchQuery, localQuery]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateViewport = () => setViewportHeight(window.innerHeight);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    return recipes.filter((recipe) => {
      const matchesTag = activeTag ? recipe.tags.includes(activeTag) : true;
      if (!matchesTag) return false;
      if (!q) return true;
      const matchesTitle = recipe.title.toLowerCase().includes(q);
      const matchesIngredient = recipe.ingredients.some((ing) => ing.toLowerCase().includes(q));
      return matchesTitle || matchesIngredient;
    });
  }, [recipes, debouncedQuery, activeTag]);

  const useVirtualScroll = filteredRecipes.length > VIRTUAL_THRESHOLD;
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth;
      if (w < 640) setColumns(1);
      else if (w < 1024) setColumns(2);
      else setColumns(3);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const onContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const rowHeight = CARD_HEIGHT_ESTIMATE + 24;
  const totalRows = Math.ceil(filteredRecipes.length / columns);
  const totalHeight = totalRows * rowHeight;
  const overscan = 3;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  const startIndex = startRow * columns;
  const endIndex = Math.min(filteredRecipes.length, endRow * columns);
  const visibleRecipes = useVirtualScroll
    ? filteredRecipes.slice(startIndex, endIndex)
    : filteredRecipes;
  const offsetY = useVirtualScroll ? startRow * rowHeight : 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '14px 24px',
          backgroundColor: scrolled ? 'rgba(255, 245, 230, 0.85)' : 'rgba(255, 245, 230, 1)',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255, 140, 0, 0.15)' : '1px solid transparent',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #FF8C00, #FFA940)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255, 140, 0, 0.3)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2v6a6 6 0 0 0 12 0V2" />
                <path d="M9 2h6" />
                <path d="M12 14v8" />
              </svg>
            </div>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--primary-color)',
                letterSpacing: '0.5px',
              }}
            >
              美食食谱
            </span>
          </Link>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <SearchBar value={localQuery} onChange={setLocalQuery} />
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {(activeTag || debouncedQuery) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>当前筛选：</span>
            {activeTag && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '14px',
                  backgroundColor: getTagColor(activeTag).bg,
                  color: getTagColor(activeTag).color,
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                #{activeTag}
                <button
                  onClick={() => setActiveTag(null)}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '2px',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            )}
            {debouncedQuery && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '14px',
                  backgroundColor: '#FFF3E0',
                  color: '#E65100',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                搜索: "{debouncedQuery}"
                <button
                  onClick={() => setLocalQuery('')}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '2px',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            )}
            {(activeTag || debouncedQuery) && (
              <button
                onClick={() => {
                  setActiveTag(null);
                  setLocalQuery('');
                }}
                style={{
                  padding: '5px 14px',
                  borderRadius: '14px',
                  border: '1px solid #E0E0E0',
                  backgroundColor: 'white',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.color = 'var(--primary-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                清除全部
              </button>
            )}
          </div>
        )}

        {!activeTag && !debouncedQuery && (
          <div style={{ marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '12px',
              }}
            >
              热门标签
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {allTags.map((tag) => {
                const tc = getTagColor(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(tag)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '14px',
                      backgroundColor: tc.bg,
                      color: tc.color,
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {debouncedQuery || activeTag ? '搜索结果' : '全部食谱'}
            <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
              共 {filteredRecipes.length} 个
            </span>
          </h2>
        </div>

        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <EmptyState query={debouncedQuery} />
        ) : useVirtualScroll ? (
          <div
            ref={containerRef}
            onScroll={onContainerScroll}
            style={{
              height: 'calc(100vh - 200px)',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: offsetY,
                  left: 0,
                  right: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '24px',
                }}
              >
                {visibleRecipes.map((recipe, i) => (
                  <RecipeCard key={recipe.id} recipe={recipe} index={startIndex + i} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredRecipes.map((recipe, index) => (
              <RecipeCard key={recipe.id} recipe={recipe} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
