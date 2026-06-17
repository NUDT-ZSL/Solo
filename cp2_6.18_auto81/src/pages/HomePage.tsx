import React, { useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import ItemCard from '../components/ItemCard';
import '../styles/components.css';
import type { Item } from '../types';

interface HomePageProps {
  items?: Item[];
  onApply?: (item: Item) => void;
  loading?: boolean;
}

const PlaceholderCard: React.FC = () => (
  <div className="card" style={placeholderCardStyle}>
    <div style={placeholderImageStyle} />
    <div className="card-body">
      <div style={placeholderLineStyle} />
      <div style={{ ...placeholderLineStyle, width: '60%', marginBottom: 12 }} />
      <div style={{ ...placeholderLineStyle, width: '90%', marginBottom: 8 }} />
      <div style={{ ...placeholderLineStyle, width: '80%' }} />
    </div>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ items = [], onApply, loading = false }) => {
  const displayedItems = items.slice(0, 20);
  const placeholderCount = Math.max(0, 20 - items.length);

  useEffect(() => {
    if (!document.querySelector('style[data-homepage-styles]')) {
      const styleSheet = document.createElement('style');
      styleSheet.setAttribute('data-homepage-styles', 'true');
      styleSheet.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 768px) {
          .home-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .home-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  if (loading && items.length === 0) {
    return (
      <div className="loading-container">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  const handleApply = (item: Item) => {
    if (onApply) {
      onApply(item);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>物品列表</h1>
        <span style={countStyle}>共 {items.length} 件物品</span>
      </div>
      <div style={gridStyle} className="home-grid items-grid">
        {displayedItems.map((item: Item) => (
          <ItemCard key={item.id} item={item} onApply={handleApply} />
        ))}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <PlaceholderCard key={`extra-placeholder-${i}`} />
        ))}
      </div>
      {items.length > 20 && (
        <div style={moreTextStyle}>
          仅显示前 20 件物品，更多内容请滚动查看
        </div>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '24px 16px',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const countStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-secondary)',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 16,
};

const moreTextStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: 24,
  color: 'var(--text-secondary)',
  fontSize: 14,
};

const placeholderCardStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  animation: 'pulse 1.5s ease-in-out infinite',
};

const placeholderImageStyle: React.CSSProperties = {
  width: '100%',
  paddingTop: '75%',
  backgroundColor: '#f0f0f0',
};

const placeholderLineStyle: React.CSSProperties = {
  height: 16,
  backgroundColor: '#f0f0f0',
  borderRadius: 4,
  marginBottom: 8,
};

export default HomePage;
