import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { worksApi } from '../api';
import type { Work, CartItem } from '../types';

interface WorksPageProps {
  cartItems: CartItem[];
  onAddToCart: (work: Work) => void;
  onOpenCart: () => void;
}

const categories = ['全部', '钱包', '皮带', '背包', '小物'] as const;

const WorksPage = ({ cartItems, onAddToCart, onOpenCart }: WorksPageProps) => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<typeof categories[number]>('全部');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [flyingItem, setFlyingItem] = useState<{ id: string; x: number; y: number } | null>(null);
  const [filterKey, setFilterKey] = useState(0);

  const loadWorks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await worksApi.getWorks(page, 8, category);
      if (res.data.success && res.data.data) {
        setWorks(res.data.data.works);
        setTotalPages(Math.ceil(res.data.data.total / 8));
      }
    } catch (error) {
      console.error('加载作品失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    setPage(1);
    setFilterKey(k => k + 1);
  }, [category]);

  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  const handleAddToCart = (work: Work, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyingItem({
      id: `${work.id}-${Date.now()}`,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });
    onAddToCart(work);
    setTimeout(() => setFlyingItem(null), 500);
  };

  const isInCart = (workId: string) => cartItems.some(item => item.work.id === workId);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#4a3728', marginBottom: 8 }}>匠心之作</h1>
        <p style={{ fontSize: 15, color: '#8B5E3C' }}>每一件都是纯手工缝制，独一无二</p>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 32,
          flexWrap: 'wrap'
        }}
      >
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '8px 20px',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: category === cat ? 600 : 500,
              backgroundColor: category === cat ? '#8B5E3C' : 'white',
              color: category === cat ? 'white' : '#4a3728',
              boxShadow: category === cat ? '0 2px 8px rgba(139, 94, 60, 0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 280px)',
          gap: 24,
          justifyContent: 'center'
        }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={`sk-${filterKey}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  width: 280,
                  borderRadius: 12,
                  backgroundColor: '#f0f0f0',
                  aspectRatio: '1 / 1.3'
                }}
              />
            ))
          ) : works.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '60px 0',
                color: '#999'
              }}
            >
              暂无该分类作品
            </div>
          ) : (
            works.map((work, idx) => (
              <WorkCard
                key={`${filterKey}-${work.id}`}
                work={work}
                index={idx}
                inCart={isInCart(work.id)}
                onAdd={handleAddToCart}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 48,
            alignItems: 'center'
          }}
        >
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: page === 1 ? '#f0f0f0' : 'white',
              color: page === 1 ? '#ccc' : '#4a3728',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              cursor: page === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNum = i + 1;
            const isActive = page === pageNum;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: isActive ? '#4a3728' : 'white',
                  color: isActive ? 'white' : '#4a3728',
                  fontWeight: 600,
                  fontSize: 14,
                  boxShadow: isActive
                    ? '0 2px 8px rgba(74, 55, 40, 0.3)'
                    : '0 1px 3px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: page === totalPages ? '#f0f0f0' : 'white',
              color: page === totalPages ? '#ccc' : '#4a3728',
              fontWeight: 600,
              fontSize: 14,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              cursor: page === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            ›
          </button>
        </div>
      )}

      <AnimatePresence>
        {flyingItem && (
          <motion.div
            key={flyingItem.id}
            initial={{
              x: flyingItem.x - 16,
              y: flyingItem.y - 16,
              scale: 1,
              opacity: 1
            }}
            animate={{
              x: typeof window !== 'undefined' ? window.innerWidth - 58 : 0,
              y: 44,
              scale: 0.3,
              opacity: 0
            }}
            transition={{ duration: 0.5, ease: [0.5, 0, 0.75, 0] }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#8B5E3C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 9999
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {cartTotal > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          onClick={onOpenCart}
          style={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#8B5E3C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(139, 94, 60, 0.4)',
            cursor: 'pointer',
            zIndex: 100
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {cartTotal > 99 ? '99+' : cartTotal}
          </span>
        </motion.div>
      )}

      <style>{`
        @media (max-width: 1200px) {
          .page-container > div:nth-child(3) {
            grid-template-columns: repeat(3, 280px) !important;
          }
        }
        @media (max-width: 960px) {
          .page-container > div:nth-child(3) {
            grid-template-columns: repeat(2, 280px) !important;
          }
        }
        @media (max-width: 768px) {
          .page-container > div:nth-child(3) {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .page-container > div:nth-child(3) > div {
            width: auto !important;
            max-width: 320px;
            justify-self: center;
          }
        }
        @media (max-width: 480px) {
          .page-container > div:nth-child(3) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

interface WorkCardProps {
  work: Work;
  index: number;
  inCart: boolean;
  onAdd: (work: Work, e: React.MouseEvent<HTMLButtonElement>) => void;
}

const WorkCard = ({ work, index, inCart, onAdd }: WorkCardProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const dataSrc = img.getAttribute('data-src');
              if (dataSrc && img.src !== dataSrc) {
                img.src = dataSrc;
              }
              observer.unobserve(img);
            }
          });
        },
        { rootMargin: '200px 0px' }
      );
      observer.observe(img);
      return () => observer.disconnect();
    } else {
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) img.src = dataSrc;
    }
  }, [work.image]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      style={{
        width: 280,
        borderRadius: 12,
        backgroundColor: 'white',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        cursor: 'pointer',
        willChange: 'transform, box-shadow',
        contain: 'content'
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.14)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.06)';
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          backgroundColor: '#fafafa',
          position: 'relative'
        }}
      >
        {!loaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite'
            }}
          />
        )}
        <img
          ref={imgRef}
          data-src={work.image}
          alt={work.name}
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease, transform 0.3s ease'
          }}
          onMouseEnter={e => {
            if (loaded) (e.target as HTMLImageElement).style.transform = 'scale(1.05)';
          }}
          onMouseLeave={e => {
            if (loaded) (e.target as HTMLImageElement).style.transform = 'scale(1)';
          }}
        />
      </div>

      <div style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#4a3728',
              flex: 1,
              marginRight: 8,
              lineHeight: 1.4
            }}
          >
            {work.name}
          </h3>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 4,
              backgroundColor: '#FFF8F0',
              color: '#8B5E3C',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {work.category}
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: '#999',
            marginBottom: 12,
            height: 36,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
        >
          {work.description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#D4A574' }}>¥{work.price}</span>
          <button
            onClick={e => {
              e.stopPropagation();
              onAdd(work, e);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: inCart ? '#4a3728' : '#8B5E3C',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {inCart ? '已加入' : '加入'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </motion.div>
  );
};

export default WorksPage;
