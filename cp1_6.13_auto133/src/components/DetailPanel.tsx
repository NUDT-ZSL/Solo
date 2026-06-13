import { useState } from 'react';
import type { Product } from '../main';
import { api } from '../services/api';

interface Props {
  product: Product | null;
  onClose: () => void;
  isFavorited: boolean;
  onFavoriteChange: (id: string, favorited: boolean) => void;
  compareList: string[];
  onCompareToggle: (id: string) => void;
}

export default function DetailPanel({
  product,
  onClose,
  isFavorited,
  onFavoriteChange,
  compareList,
  onCompareToggle,
}: Props) {
  const visible = !!product;
  const [busy, setBusy] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (!product) return null;

  const inCompare = compareList.includes(product._id);

  const handleFavorite = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (isFavorited) {
        await api.removeFavorite(product._id);
        onFavoriteChange(product._id, false);
      } else {
        await api.addFavorite(product._id);
        onFavoriteChange(product._id, true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCompare = () => {
    if (!inCompare && compareList.length >= 4) return;
    onCompareToggle(product._id);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: isMobile ? 'flex-start' : 'center',
        paddingTop: isMobile ? 'env(safe-area-inset-top)' : 0,
        zIndex: 1000,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : 360,
          background: 'rgba(15, 23, 42, 0.92)',
          borderRadius: 12,
          border: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.15)',
          backdropFilter: 'blur(12px)',
          padding: 24,
          margin: isMobile ? '16px 12px' : 0,
          marginTop: isMobile ? 60 : 0,
          maxHeight: isMobile ? 'calc(100vh - 90px)' : '85vh',
          overflowY: 'auto',
          color: '#f8fafc',
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
          animation: visible
            ? 'detailSlideIn 0.3s ease-out forwards'
            : undefined,
        }}
      >
        <style>{`
          @keyframes detailSlideIn {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .detail-scroll::-webkit-scrollbar { width: 4px; }
          .detail-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.4); border-radius: 2px; }
        `}</style>
        <div className="detail-scroll">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>
              {product.name}
            </h2>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.16)';
                (e.target as HTMLButtonElement).style.color = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
                (e.target as HTMLButtonElement).style.color = '#94a3b8';
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              width: '100%',
              height: 160,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${product.color}40, ${product.color}15)`,
              border: `1px solid ${product.color}60`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: product.shapeType === 0 ? 12 : product.shapeType === 1 ? '50%' : 8,
                background: product.color,
                boxShadow: `0 0 40px ${product.color}80`,
                transform: product.shapeType === 2 ? 'rotate(45deg)' : 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 40,
                background: `linear-gradient(to top, ${product.color}30, transparent)`,
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24' }}>
              ¥{product.price}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', letterSpacing: 1 }}>
              ID: {product._id.slice(0, 8)}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8, letterSpacing: 1 }}>
              商品描述
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#cbd5e1' }}>
              {product.description}
            </p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10, letterSpacing: 1 }}>
              核心特性
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {product.keywords.map((kw) => (
                <span
                  key={kw}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#a5b4fc',
                    fontSize: 12,
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleFavorite}
              disabled={busy}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: isFavorited
                  ? `1px solid ${isFavorited ? '#fbbf24' : 'rgba(251,191,36,0.4)'}`
                  : '1px solid rgba(251,191,36,0.4)',
                background: isFavorited
                  ? 'rgba(251,191,36,0.2)'
                  : 'rgba(251,191,36,0.05)',
                color: '#fbbf24',
                fontSize: 14,
                fontWeight: 600,
                cursor: busy ? 'progress' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill={isFavorited ? '#fbbf24' : 'none'} stroke="#fbbf24" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {isFavorited ? '已收藏' : '收藏'}
            </button>

            <button
              onClick={handleCompare}
              disabled={!inCompare && compareList.length >= 4}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 10,
                border: inCompare
                  ? '1px solid #60a5fa'
                  : '1px solid rgba(96,165,250,0.4)',
                background: inCompare
                  ? 'rgba(96,165,250,0.2)'
                  : 'rgba(96,165,250,0.05)',
                color: '#60a5fa',
                fontSize: 14,
                fontWeight: 600,
                cursor: !inCompare && compareList.length >= 4 ? 'not-allowed' : 'pointer',
                opacity: !inCompare && compareList.length >= 4 ? 0.5 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 5-5" />
              </svg>
              {inCompare ? '已加入对比' : '加入对比'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
