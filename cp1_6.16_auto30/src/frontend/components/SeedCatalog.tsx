import React, { useState } from 'react';
import type { Seed } from '../../../types';

interface SeedCatalogProps {
  seeds: Seed[];
  loading: boolean;
  onClaim: (seedId: string) => Promise<boolean>;
}

const SeedCatalog: React.FC<SeedCatalogProps> = ({ seeds, loading, onClaim }) => {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

  const handleClaim = async (seed: Seed) => {
    if (claimingId || seed.availableCount <= 0) return;

    if (seed.availableCount <= 0) {
      setDisabledIds(prev => new Set(prev).add(seed.id));
      setTimeout(() => {
        setDisabledIds(prev => {
          const next = new Set(prev);
          next.delete(seed.id);
          return next;
        });
      }, 500);
      return;
    }

    setClaimingId(seed.id);
    const success = await onClaim(seed.id);
    setClaimingId(null);

    if (success) {
      setClaimedIds(prev => new Set(prev).add(seed.id));
    } else {
      setDisabledIds(prev => new Set(prev).add(seed.id));
      setTimeout(() => {
        setDisabledIds(prev => {
          const next = new Set(prev);
          next.delete(seed.id);
          return next;
        });
      }, 500);
    }
  };

  if (loading) {
    return (
      <div style={styles.catalogContainer}>
        <h2 style={styles.title}>🌱 种子目录</h2>
        <div style={styles.masonryGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ ...styles.card, ...styles.skeleton }}>
              <div style={{ ...styles.gradientThumb, opacity: 0.3 }} />
              <div style={styles.cardBody}>
                <div style={{ ...styles.skeletonLine, width: '60%' }} />
                <div style={{ ...styles.skeletonLine, width: '80%' }} />
                <div style={{ ...styles.skeletonLine, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (seeds.length === 0) {
    return (
      <div style={styles.catalogContainer}>
        <h2 style={styles.title}>🌱 种子目录</h2>
        <div style={styles.emptyState}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="80" r="25" fill="#E8D5B7" />
            <ellipse cx="60" cy="50" rx="20" ry="30" fill="#A5D6A7" />
            <ellipse cx="50" cy="45" rx="12" ry="22" fill="#81C784" />
            <ellipse cx="70" cy="45" rx="12" ry="22" fill="#81C784" />
            <line x1="60" y1="55" x2="60" y2="80" stroke="#6D4C41" strokeWidth="2" />
            <circle cx="45" cy="85" r="3" fill="#C8E6C9" />
            <circle cx="75" cy="85" r="3" fill="#C8E6C9" />
            <circle cx="60" cy="90" r="2" fill="#C8E6C9" />
          </svg>
          <p style={styles.emptyText}>暂无可用种子，请稍后再来看看吧</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.catalogContainer}>
      <h2 style={styles.title}>🌱 种子目录</h2>
      <p style={styles.subtitle}>来自社区成员分享的种子，认领后加入你的花园</p>
      <div style={styles.masonryGrid}>
        {seeds.map((seed, index) => {
          const isClaiming = claimingId === seed.id;
          const isClaimed = claimedIds.has(seed.id);
          const isDisabled = disabledIds.has(seed.id) || seed.availableCount <= 0;

          return (
            <div
              key={seed.id}
              style={{
                ...styles.card,
                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
              }}
              className="seed-card"
            >
              {isClaimed && (
                <div style={styles.checkmarkOverlay}>
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="14" fill="#4CAF50" />
                    <path d="M8 14l4 4 8-8" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <div
                style={{
                  ...styles.gradientThumb,
                  background: `linear-gradient(135deg, ${seed.gradientStart}, ${seed.gradientEnd})`,
                }}
              >
                <span style={styles.seedEmoji}>
                  {seed.name === '番茄' ? '🍅' :
                   seed.name === '黄瓜' ? '🥒' :
                   seed.name === '向日葵' ? '🌻' :
                   seed.name === '辣椒' ? '🌶️' :
                   seed.name === '生菜' ? '🥬' :
                   seed.name === '薰衣草' ? '💜' :
                   seed.name === '南瓜' ? '🎃' :
                   seed.name === '牵牛花' ? '喇叭' :
                   seed.name === '胡萝卜' ? '🥕' :
                   seed.name === '薄荷' ? '🌿' :
                   seed.name === '草莓' ? '🍓' :
                   seed.name === '豌豆' ? '🟢' : '🌱'}
                </span>
              </div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{seed.name}</h3>
                <p style={styles.cardVariety}>{seed.variety}</p>
                <p style={styles.cardDesc}>{seed.description}</p>
                <div style={styles.cardMeta}>
                  <span style={styles.provider}>👤 {seed.provider}</span>
                  <span style={{
                    ...styles.availability,
                    color: seed.availableCount > 0 ? '#4A7C59' : '#B71C1C',
                  }}>
                    可交换: {seed.availableCount}
                  </span>
                </div>
                <div style={styles.cardSeasons}>
                  {seed.optimalSeason.map(s => (
                    <span key={s} style={styles.seasonTag}>{s}</span>
                  ))}
                </div>
                <button
                  style={{
                    ...styles.claimButton,
                    ...(isDisabled ? styles.claimButtonDisabled : {}),
                    ...(isClaiming ? styles.claimButtonLoading : {}),
                  }}
                  onClick={() => handleClaim(seed)}
                  disabled={isDisabled || isClaiming}
                >
                  {isClaiming ? (
                    <span style={styles.spinner}>⟳</span>
                  ) : isDisabled ? (
                    '暂无库存'
                  ) : (
                    '认领种子'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  catalogContainer: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#4A7C59',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#8D7B68',
    marginBottom: '24px',
  },
  masonryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    alignItems: 'start',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.25s ease-out, box-shadow 0.25s ease-out',
    position: 'relative',
    cursor: 'default',
  },
  gradientThumb: {
    height: '140px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  seedEmoji: {
    fontSize: '48px',
  },
  cardBody: {
    padding: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#3E2723',
    margin: '0 0 2px 0',
  },
  cardVariety: {
    fontSize: '13px',
    color: '#8D7B68',
    margin: '0 0 8px 0',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#5D4037',
    lineHeight: 1.5,
    margin: '0 0 12px 0',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '12px',
  },
  provider: {
    color: '#6D4C41',
  },
  availability: {
    fontWeight: 600,
  },
  cardSeasons: {
    display: 'flex',
    gap: '6px',
    marginBottom: '12px',
  },
  seasonTag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    backgroundColor: '#E8F5E9',
    color: '#4A7C59',
  },
  claimButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#4A7C59',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  claimButtonDisabled: {
    backgroundColor: '#BDBDBD',
    cursor: 'not-allowed',
  },
  claimButtonLoading: {
    backgroundColor: '#6D9B7E',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    zIndex: 10,
    animation: 'scaleIn 0.3s ease-out',
  },
  skeleton: {
    minHeight: '280px',
  },
  skeletonLine: {
    height: '14px',
    backgroundColor: '#E0E0E0',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#8D7B68',
    marginTop: '16px',
  },
};

export default SeedCatalog;
