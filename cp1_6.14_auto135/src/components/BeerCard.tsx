import { useNavigate } from 'react-router-dom';
import type { Beer } from '../types';
import { api } from '../utils/http';

interface BeerCardProps {
  beer: Beer;
  onEdit: (beer: Beer) => void;
  onDelete: (id: string) => void;
}

export default function BeerCard({ beer, onEdit, onDelete }: BeerCardProps) {
  const navigate = useNavigate();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`确定要删除 "${beer.name}" 吗？`)) {
      try {
        await api.deleteBeer(beer.id);
        onDelete(beer.id);
      } catch (err) {
        console.error('删除失败:', err);
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(beer);
  };

  const handleClick = () => {
    navigate(`/beer/${beer.id}`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        style={{
          color: i < rating ? '#f59e0b' : '#4a4a6a',
          fontSize: '18px',
          transition: 'color 0.2s ease'
        }}
      >
        ★
      </span>
    ));
  };

  return (
    <div style={styles.card} onClick={handleClick} className="beer-card">
      <div style={styles.cardContent}>
        <div style={styles.header}>
          <h3 style={styles.name}>{beer.name}</h3>
        </div>
        <div style={styles.brewery}>{beer.brewery}</div>
        <div style={styles.styleBadge}>{beer.style}</div>
        <div style={styles.infoRow}>
          <span style={styles.abv}>ABV {beer.abv}%</span>
          <div style={styles.rating}>{renderStars(beer.rating)}</div>
        </div>
        <div style={styles.tagsContainer}>
          {beer.flavorTags.slice(0, 3).map((tag) => (
            <span key={tag} style={styles.tag}>
              {tag}
            </span>
          ))}
          {beer.flavorTags.length > 3 && (
            <span style={styles.tagMore}>+{beer.flavorTags.length - 3}</span>
          )}
        </div>
      </div>
      <div style={styles.actions}>
        <button style={styles.iconButton} onClick={handleEdit} title="编辑" className="icon-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button style={styles.iconButton} onClick={handleDelete} title="删除" className="icon-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: '320px',
    background: '#1a1a2e',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    willChange: 'transform, box-shadow'
  },
  cardContent: {
    padding: '24px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  name: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.3
  },
  brewery: {
    fontSize: '14px',
    color: '#a0a0b0'
  },
  styleBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    alignSelf: 'flex-start'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px'
  },
  abv: {
    fontSize: '13px',
    color: '#a0a0b0',
    fontWeight: 500
  },
  rating: {
    display: 'flex',
    gap: '2px'
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px'
  },
  tag: {
    padding: '4px 10px',
    background: '#0f3460',
    color: '#ffffff',
    borderRadius: '12px',
    fontSize: '12px'
  },
  tagMore: {
    padding: '4px 10px',
    background: '#2a2a5a',
    color: '#a0a0b0',
    borderRadius: '12px',
    fontSize: '12px'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 24px',
    borderTop: '1px solid rgba(255,255,255,0.05)'
  },
  iconButton: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: '#a0a0b0',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'color 0.2s ease, background 0.2s ease'
  }
};

const cardHoverStyle = `
  .beer-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  }
  .beer-card:hover .icon-btn {
    color: #ffffff;
  }
  .beer-card .icon-btn:hover {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = cardHoverStyle;
document.head.appendChild(styleSheet);
