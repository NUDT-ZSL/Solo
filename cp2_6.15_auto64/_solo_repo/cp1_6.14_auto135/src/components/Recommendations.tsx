import { useNavigate } from 'react-router-dom';
import type { Beer } from '../types';

interface RecommendationsProps {
  recommendations: Beer[];
}

export default function Recommendations({ recommendations }: RecommendationsProps) {
  const navigate = useNavigate();

  if (recommendations.length === 0) {
    return null;
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        style={{
          color: i < rating ? '#f59e0b' : '#4a4a6a',
          fontSize: '14px'
        }}
      >
        ★
      </span>
    ));
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>相似风味推荐</h3>
      <div style={styles.scrollContainer} className="scroll-container">
        {recommendations.map(beer => (
          <div
            key={beer.id}
            style={styles.card}
            onClick={() => navigate(`/beer/${beer.id}`)}
            className="rec-card"
          >
            <div style={styles.cardContent}>
              <h4 style={styles.name}>{beer.name}</h4>
              <p style={styles.brewery}>{beer.brewery}</p>
              <div style={styles.rating}>{renderStars(beer.rating)}</div>
              <div style={styles.styleBadge}>{beer.style}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '32px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff',
    margin: '0 0 16px 0'
  },
  scrollContainer: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '12px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#f59e0b transparent'
  },
  card: {
    flex: '0 0 200px',
    width: '200px',
    background: '#16213e',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    overflow: 'hidden'
  },
  cardContent: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  name: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  brewery: {
    fontSize: '13px',
    color: '#a0a0b0',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  rating: {
    display: 'flex',
    gap: '2px',
    marginTop: '4px'
  },
  styleBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    background: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
    alignSelf: 'flex-start',
    marginTop: '4px'
  }
};

const css = `
  .rec-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  }
  .scroll-container::-webkit-scrollbar {
    height: 6px;
  }
  .scroll-container::-webkit-scrollbar-track {
    background: transparent;
  }
  .scroll-container::-webkit-scrollbar-thumb {
    background: #f59e0b;
    border-radius: 3px;
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = css;
document.head.appendChild(styleSheet);
