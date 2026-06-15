import { useState, useEffect } from 'react';
import BeerCard from '../components/BeerCard';
import BeerForm from '../components/BeerForm';
import type { Beer } from '../types';
import { api } from '../utils/http';

export default function HomePage() {
  const [beers, setBeers] = useState<Beer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);

  const loadBeers = async () => {
    try {
      setLoading(true);
      const data = await api.getBeers();
      setBeers(data);
    } catch (err) {
      console.error('加载啤酒列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBeers();
  }, []);

  const handleAddClick = () => {
    setEditingBeer(null);
    setIsFormOpen(true);
  };

  const handleEdit = (beer: Beer) => {
    setEditingBeer(beer);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setBeers(prev => prev.filter(b => b.id !== id));
  };

  const handleFormSuccess = () => {
    loadBeers();
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBeer(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>我的精酿收藏</h1>
        <p style={styles.subtitle}>已记录 {beers.length} 款啤酒</p>
      </div>

      {loading ? (
        <div style={styles.loading}>加载中...</div>
      ) : beers.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🍺</div>
          <h3 style={styles.emptyTitle}>还没有记录任何啤酒</h3>
          <p style={styles.emptyDesc}>点击右下角的按钮开始添加你的第一款精酿</p>
        </div>
      ) : (
        <div style={styles.grid} className="beer-grid">
          {beers.map(beer => (
            <BeerCard
              key={beer.id}
              beer={beer}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <button
        style={styles.fab}
        onClick={handleAddClick}
        className="fab-btn"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <BeerForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        editingBeer={editingBeer}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    minHeight: 'calc(100vh - 100px)'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#ffffff',
    margin: 0
  },
  subtitle: {
    fontSize: '15px',
    color: '#a0a0b0',
    margin: '8px 0 0 0'
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#a0a0b0',
    fontSize: '16px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '80px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5
  },
  emptyTitle: {
    fontSize: '20px',
    color: '#ffffff',
    margin: '0 0 8px 0'
  },
  emptyDesc: {
    fontSize: '15px',
    color: '#a0a0b0',
    margin: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 320px)',
    gap: '24px',
    justifyContent: 'center',
    paddingBottom: '100px'
  },
  fab: {
    position: 'fixed',
    right: '32px',
    bottom: '32px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: 'none',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: 50
  }
};

const css = `
  @media (max-width: 1024px) {
    .beer-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .beer-card {
      width: 100% !important;
    }
  }
  @media (max-width: 768px) {
    .beer-grid {
      grid-template-columns: 1fr !important;
    }
  }
  .fab-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 30px rgba(245, 158, 11, 0.6) !important;
  }
  .nav-link:hover {
    color: #f59e0b !important;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = css;
document.head.appendChild(styleSheet);
