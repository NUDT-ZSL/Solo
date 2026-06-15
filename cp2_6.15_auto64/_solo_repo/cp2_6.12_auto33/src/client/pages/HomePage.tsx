import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { getFurniture } from '../api';
import type { Furniture } from '../types';
import { STATUS_MAP, STATUS_COLOR } from '../types';

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'sofa', label: '沙发' },
  { key: 'table', label: '桌子' },
  { key: 'chair', label: '椅子' },
  { key: 'cabinet', label: '柜子' },
  { key: 'bed', label: '床' },
];

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '24px 28px 60px',
    backgroundColor: '#F5F0EB',
  },
  hero: {
    background: 'linear-gradient(135deg, #F5E6D3 0%, #E8D0B3 40%, #D4B895 100%)',
    borderRadius: 24,
    padding: '48px 40px',
    marginBottom: 32,
    boxShadow: '0 4px 20px rgba(184, 149, 110, 0.15)',
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: '#5a4a3a',
    marginBottom: 12,
    letterSpacing: 1,
    position: 'relative',
    zIndex: 1,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#7a6550',
    lineHeight: 1.7,
    maxWidth: 560,
    position: 'relative',
    zIndex: 1,
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  filterBtn: {
    padding: '10px 24px',
    borderRadius: 999,
    border: '1.5px solid rgba(184, 149, 110, 0.25)',
    backgroundColor: '#fff',
    color: '#6b5b4a',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    whiteSpace: 'nowrap',
  },
  filterBtnActive: {
    padding: '10px 24px',
    borderRadius: 999,
    border: '1.5px solid transparent',
    background: 'linear-gradient(135deg, #D4B895 0%, #B8956E 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 10px rgba(184, 149, 110, 0.3)',
  },
  waterfall: {
    columnGap: 16,
    columnCount: 4,
  },
  card: {
    breakInside: 'avoid',
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FAF7F3',
    border: '1px solid rgba(212, 184, 149, 0.25)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    display: 'inline-block',
    width: '100%',
  },
  cardImage: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
    backgroundColor: '#EFE8DF',
  },
  cardContent: {
    padding: '14px 16px 18px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#3a2e22',
    lineHeight: 1.5,
    flex: 1,
    minWidth: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  skeletonCard: {
    breakInside: 'avoid',
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FAF7F3',
    border: '1px solid rgba(212, 184, 149, 0.25)',
    overflow: 'hidden',
    display: 'inline-block',
    width: '100%',
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: '4 / 3',
    background: 'linear-gradient(90deg, #EFE8DF 25%, #F5F0EB 50%, #EFE8DF 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  skeletonText: {
    height: 14,
    borderRadius: 7,
    background: 'linear-gradient(90deg, #EFE8DF 25%, #F5F0EB 50%, #EFE8DF 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  skeletonBadge: {
    width: 56,
    height: 22,
    borderRadius: 11,
    background: 'linear-gradient(90deg, #EFE8DF 25%, #F5F0EB 50%, #EFE8DF 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#8b7355',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#6b5b4a',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9b8b7a',
  },
};

const statusBadgeStyle = (status: Furniture['status']): React.CSSProperties => ({
  padding: '4px 12px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  backgroundColor: STATUS_COLOR[status].bg,
  color: STATUS_COLOR[status].text,
  flexShrink: 0,
  transition: 'background-color 0.6s ease, color 0.6s ease',
  lineHeight: 1.5,
});

const cardHoverStyle: React.CSSProperties = {
  transform: 'translateY(-3px)',
  boxShadow: '0 12px 28px rgba(90, 74, 58, 0.15)',
};

const cardNormalStyle: React.CSSProperties = {
  transform: 'translateY(0)',
  boxShadow: '0 2px 10px rgba(90, 74, 58, 0.06)',
};

function HomePage() {
  const navigate = useNavigate();
  const { searchKeyword, selectedCategory, setSelectedCategory } = useAppStore();
  const [furnitureList, setFurnitureList] = useState<Furniture[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef<Record<string, Furniture['status']>>({});
  const isFirstRender = useRef(true);

  const fetchFurniture = useCallback(
    async (category: string, keyword: string) => {
      setLoading(true);
      try {
        const params: { category?: string; keyword?: string } = {};
        if (category && category !== 'all') params.category = category;
        if (keyword && keyword.trim()) params.keyword = keyword.trim();

        const data = await getFurniture(params);

        data.forEach((item) => {
          const prev = prevStatusRef.current[item.id];
          if (prev && prev !== item.status) {
            setTimeout(() => {}, 0);
          }
          prevStatusRef.current[item.id] = item.status;
        });

        setFurnitureList(data);
      } catch (err) {
        console.error('Failed to fetch furniture:', err);
        setFurnitureList([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchFurniture(selectedCategory, searchKeyword);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchFurniture(selectedCategory, searchKeyword);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [selectedCategory, searchKeyword, fetchFurniture]);

  const handleCategoryClick = (key: string) => {
    setSelectedCategory(key);
  };

  const handleCardClick = (id: string) => {
    navigate(`/furniture/${id}`);
  };

  const handleCardHover = (id: string, isHover: boolean) => {
    setHoveredId(isHover ? id : null);
  };

  const handleFilterHover = (e: React.MouseEvent<HTMLButtonElement>, isHover: boolean, active: boolean) => {
    const el = e.currentTarget as HTMLButtonElement;
    if (isHover) {
      if (active) {
        el.style.transform = 'translateY(-1px)';
        el.style.boxShadow = '0 4px 14px rgba(184, 149, 110, 0.4)';
      } else {
        el.style.borderColor = 'rgba(184, 149, 110, 0.5)';
        el.style.backgroundColor = '#FDF8F2';
      }
    } else {
      el.style.transform = 'translateY(0)';
      if (active) {
        el.style.boxShadow = '0 2px 10px rgba(184, 149, 110, 0.3)';
      } else {
        el.style.borderColor = 'rgba(184, 149, 110, 0.25)';
        el.style.backgroundColor = '#fff';
      }
    }
  };

  const renderSkeleton = () => {
    const count = 8;
    return Array.from({ length: count }, (_, i) => (
      <div key={i} style={styles.skeletonCard}>
        <div style={styles.skeletonImage} />
        <div style={styles.cardContent}>
          <div style={styles.cardHeader}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ ...styles.skeletonText, width: '75%' }} />
              <div style={{ ...styles.skeletonText, width: '50%' }} />
            </div>
            <div style={styles.skeletonBadge} />
          </div>
        </div>
      </div>
    ));
  };

  const renderCards = () => {
    return furnitureList.map((item) => {
      const isHovered = hoveredId === item.id;
      const imgSrc = item.images?.[0] || '';
      return (
        <div
          key={item.id}
          onClick={() => handleCardClick(item.id)}
          onMouseEnter={() => handleCardHover(item.id, true)}
          onMouseLeave={() => handleCardHover(item.id, false)}
          style={{
            ...styles.card,
            ...(isHovered ? cardHoverStyle : cardNormalStyle),
          }}
        >
          {imgSrc && (
            <img
              src={imgSrc}
              alt={item.name}
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              style={{
                ...styles.cardImage,
                aspectRatio: 'auto',
              }}
            />
          )}
          <div style={styles.cardContent}>
            <div style={styles.cardHeader}>
              <span style={styles.cardName}>{item.name}</span>
              <span style={statusBadgeStyle(item.status)}>
                {STATUS_MAP[item.status]}
              </span>
            </div>
          </div>
        </div>
      );
    });
  };

  const renderEmpty = () => (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>🪑</div>
      <div style={styles.emptyTitle}>暂无匹配的家具</div>
      <div style={styles.emptyDesc}>试试更换关键词或切换其他类别吧</div>
    </div>
  );

  return (
    <>
      <style>{`
        @media (max-width: 1200px) {
          .home-waterfall { column-count: 3 !important; }
        }
        @media (max-width: 768px) {
          .home-waterfall { column-count: 2 !important; }
          .home-hero { padding: 36px 24px !important; }
          .home-hero-title { font-size: 28px !important; }
          .home-hero-subtitle { font-size: 14px !important; }
        }
        @media (max-width: 480px) {
          .home-waterfall { column-count: 1 !important; }
          .home-hero { padding: 28px 20px !important; border-radius: 18px !important; }
          .home-hero-title { font-size: 22px !important; }
          .home-page { padding: 16px 16px 40px !important; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="home-page" style={styles.page}>
        <div className="home-hero" style={styles.hero}>
          <div style={styles.heroBg} />
          <h1 className="home-hero-title" style={styles.heroTitle}>
            让闲置家具，遇见新主人
          </h1>
          <p className="home-hero-subtitle" style={styles.heroSubtitle}>
            这里汇聚了各类优质的二手家具，每一件都承载着前主人的温度。
            选择你喜欢的，预约交换，让家焕新不再昂贵。
          </p>
        </div>

        <div className="home-filter" style={styles.filterBar}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick(cat.key)}
                style={isActive ? styles.filterBtnActive : styles.filterBtn}
                onMouseEnter={(e) => handleFilterHover(e, true, isActive)}
                onMouseLeave={(e) => handleFilterHover(e, false, isActive)}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="home-waterfall" style={styles.waterfall}>
          {loading ? renderSkeleton() : furnitureList.length > 0 ? renderCards() : null}
        </div>

        {!loading && furnitureList.length === 0 && renderEmpty()}
      </div>
    </>
  );
}

export default HomePage;
