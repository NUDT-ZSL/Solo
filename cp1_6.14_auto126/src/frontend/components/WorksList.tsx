import React, { useState, useEffect, useCallback } from 'react';
import { getWorks, Work } from '../utils/http';

interface WorksListProps {
  onSelectWork: (work: Work) => void;
  onShowAnalytics: (work: Work) => void;
}

const WorksList: React.FC<WorksListProps> = ({ onSelectWork, onShowAnalytics }) => {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchWorks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWorks();
      setWorks(data.filter((w) => w.status === 'published'));
    } catch (error) {
      console.error('获取作品列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>作品管理</h2>
        <div style={styles.stats}>
          共 <span style={styles.statsNumber}>{works.length}</span> 首作品
        </div>
      </div>
      <div style={styles.grid} data-grid="works">
        {works.map((work) => (
          <div
            key={work.id}
            style={styles.card}
            onMouseEnter={() => setHoveredId(work.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelectWork(work)}
          >
            <div style={styles.coverWrapper}>
              <img src={work.cover} alt={work.title} style={styles.cover} />
              {hoveredId === work.id && (
                <div style={styles.playOverlay}>
                  <div style={styles.playButton}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <polygon points="8,5 19,12 8,19" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <div style={styles.cardContent}>
              <h3 style={styles.cardTitle}>{work.title}</h3>
              <div style={styles.cardFooter}>
                <span style={styles.playsText}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#8e8e93"
                    strokeWidth="2"
                    style={{ verticalAlign: 'middle', marginRight: 4 }}
                  >
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  {work.plays.toLocaleString()} 次播放
                </span>
                <button
                  style={styles.analyticsBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowAnalytics(work);
                  }}
                >
                  数据
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {works.length === 0 && (
        <div style={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3a3a3c" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10,8 16,12 10,16" />
          </svg>
          <div style={styles.emptyText}>暂无已发布的作品</div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  loadingText: {
    fontSize: 16,
    color: '#8e8e93',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
  },
  stats: {
    fontSize: 14,
    color: '#8e8e93',
  },
  statsNumber: {
    color: '#ff2d55',
    fontWeight: 600,
    fontSize: 18,
    marginLeft: 4,
    marginRight: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 280px)',
    gap: 24,
    justifyContent: 'flex-start',
  },
  card: {
    width: 280,
    borderRadius: 16,
    backgroundColor: '#1c1c1e',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  coverWrapper: {
    position: 'relative',
    width: '100%',
    height: 200,
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cover: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.2s ease',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: '#ff2d55',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(255,45,85,0.3)',
    transition: 'transform 0.2s ease',
    paddingLeft: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playsText: {
    fontSize: 14,
    color: '#8e8e93',
    display: 'flex',
    alignItems: 'center',
  },
  analyticsBtn: {
    padding: '4px 12px',
    borderRadius: 12,
    border: 'none',
    backgroundColor: '#2c2c2e',
    color: '#8e8e93',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
    color: '#3a3a3c',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e93',
  },
};

const responsiveStyles = `
  @media (max-width: 1400px) {
    [data-grid="works"] { grid-template-columns: repeat(3, 280px) !important; }
  }
  @media (max-width: 1024px) {
    [data-grid="works"] { grid-template-columns: repeat(3, 280px) !important; }
  }
  @media (max-width: 768px) {
    [data-grid="works"] { grid-template-columns: repeat(2, 280px) !important; }
  }
  @media (max-width: 480px) {
    [data-grid="works"] { grid-template-columns: 280px !important; justify-content: center !important; }
  }
`;

const styleTag = document.createElement('style');
styleTag.textContent = responsiveStyles;
document.head.appendChild(styleTag);

export default WorksList;
