import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Recommendations from '../components/Recommendations';
import type { Beer } from '../types';
import { api } from '../utils/http';

export default function BeerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [beer, setBeer] = useState<Beer | null>(null);
  const [recommendations, setRecommendations] = useState<Beer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [beerData, recData] = await Promise.all([
          api.getBeer(id),
          api.getRecommendations(id)
        ]);
        setBeer(beerData);
        setRecommendations(recData);
      } catch (err) {
        console.error('加载详情失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const renderStars = (rating: number, size = '20px') => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        style={{
          color: i < rating ? '#f59e0b' : '#4a4a6a',
          fontSize: size,
          transition: 'color 0.2s ease'
        }}
      >
        ★
      </span>
    ));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  if (!beer) {
    return (
      <div style={styles.notFound}>
        <h2>未找到该啤酒</h2>
        <button onClick={() => navigate('/')} style={styles.backButton} className="back-btn">返回首页</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/')} style={styles.backButton} className="back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        返回列表
      </button>

      <div style={styles.hero} className="hero">
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>{beer.name}</h1>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.infoSection}>
          <div style={styles.infoRow}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>酒厂</span>
              <span style={styles.infoValue}>{beer.brewery}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>风格</span>
              <span style={styles.styleBadge}>{beer.style}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>ABV</span>
              <span style={styles.infoValue}>{beer.abv}%</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>评分</span>
              <div style={styles.rating}>{renderStars(beer.rating)}</div>
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>风味标签</h3>
            <div style={styles.tagsContainer}>
              {beer.flavorTags.map(tag => (
                <span key={tag} style={styles.tag}>{tag}</span>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>品鉴笔记</h3>
            <p style={styles.notes}>{beer.notes}</p>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            历史品鉴记录 <span style={styles.recordCount}>({beer.tastingRecords.length}次)</span>
          </h3>
          <div style={styles.recordsList}>
            {beer.tastingRecords.slice().reverse().map(record => (
              <div key={record.id} style={styles.recordCard}>
                <div style={styles.recordHeader}>
                  <div style={styles.recordRating}>{renderStars(record.rating, '16px')}</div>
                  <span style={styles.recordDate}>{formatDate(record.date)}</span>
                </div>
                <p style={styles.recordNotes}>{record.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <Recommendations recommendations={recommendations} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#a0a0b0',
    fontSize: '16px'
  },
  notFound: {
    textAlign: 'center',
    padding: '60px',
    color: '#ffffff'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    color: '#a0a0b0',
    fontSize: '14px',
    cursor: 'pointer',
    borderRadius: '8px',
    marginBottom: '24px',
    transition: 'color 0.2s ease, background 0.2s ease'
  },
  hero: {
    height: '400px',
    background: '#1a1a2e',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '32px',
    position: 'relative',
    overflow: 'hidden'
  },
  heroContent: {
    textAlign: 'center',
    padding: '40px'
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.2,
    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
  },
  content: {
    background: '#0a0a1a',
    borderRadius: '24px',
    padding: '0 0 40px 0'
  },
  infoSection: {
    marginBottom: '32px'
  },
  infoRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  infoItem: {
    background: '#1a1a2e',
    padding: '16px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  infoLabel: {
    fontSize: '12px',
    color: '#a0a0b0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: '16px',
    color: '#ffffff',
    fontWeight: 500
  },
  styleBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
    alignSelf: 'flex-start'
  },
  rating: {
    display: 'flex',
    gap: '3px'
  },
  section: {
    marginBottom: '28px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    margin: '0 0 16px 0'
  },
  recordCount: {
    fontSize: '14px',
    color: '#a0a0b0',
    fontWeight: 400
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  tag: {
    padding: '6px 14px',
    background: '#0f3460',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '13px'
  },
  notes: {
    fontSize: '15px',
    color: '#d0d0e0',
    lineHeight: 1.7,
    margin: 0,
    background: '#1a1a2e',
    padding: '16px',
    borderRadius: '12px'
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  recordCard: {
    background: '#1a1a2e',
    padding: '16px',
    borderRadius: '8px'
  },
  recordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  recordRating: {
    display: 'flex',
    gap: '2px'
  },
  recordDate: {
    fontSize: '13px',
    color: '#a0a0b0'
  },
  recordNotes: {
    fontSize: '14px',
    color: '#d0d0e0',
    lineHeight: 1.6,
    margin: 0
  }
};

const css = `
  .back-btn:hover {
    color: #ffffff !important;
    background: rgba(255,255,255,0.05) !important;
  }
  .hero {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 30% 30%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 70% 70%, rgba(245, 158, 11, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = css;
document.head.appendChild(styleSheet);
