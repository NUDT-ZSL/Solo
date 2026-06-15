import React from 'react';
import { useApp } from '../context/AppContext';
import { Plant } from '../types';
import FavoriteButton from './FavoriteButton';

const Sidebar: React.FC = () => {
  const { sidebarOpen, favorites } = useApp();

  return (
    <div
      style={{
        ...styles.sidebar,
        width: sidebarOpen ? '320px' : '40px',
        transition: 'width 0.2s ease-out',
      }}
    >
      {sidebarOpen && (
        <div style={styles.content}>
          <h3 style={styles.title}>
            <span style={styles.heartIcon}>❤️</span>
            我的收藏
          </h3>
          {favorites.length === 0 ? (
            <p style={styles.emptyText}>暂无收藏的植物</p>
          ) : (
            <div style={styles.favoriteList}>
              {favorites.map(item => (
                <FavoriteCard key={item.plantId} plant={item.plant} />
              ))}
            </div>
          )}
        </div>
      )}
      {!sidebarOpen && (
        <div style={styles.collapsedIcon}>
          <span style={{ fontSize: '20px' }}>❤️</span>
        </div>
      )}
    </div>
  );
};

interface FavoriteCardProps {
  plant: Plant;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({ plant }) => {
  const {} = useApp();

  return (
    <div style={styles.favoriteCard}>
      <img src={plant.photoUrl} alt={plant.name} style={styles.plantThumb} />
      <div style={styles.plantInfo}>
        <p style={styles.plantName}>{plant.name}</p>
        <p style={styles.plantVariety}>{plant.variety}</p>
        <p style={styles.plantPrice}>¥{plant.currentPrice}</p>
      </div>
      <FavoriteButton plant={plant} size="small" />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    backgroundColor: 'white',
    borderRight: '1px solid #e0e0e0',
    overflow: 'hidden',
    position: 'sticky',
    top: 0,
    height: '100vh',
    animation: 'slideInLeft 0.2s ease-out',
  },
  content: {
    padding: '20px 16px',
    height: '100%',
    overflowY: 'auto',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  heartIcon: {
    fontSize: '20px',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    textAlign: 'center',
    padding: '40px 0',
  },
  favoriteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  favoriteCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'var(--card-bg-light)',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  plantThumb: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    objectFit: 'cover',
  },
  plantInfo: {
    flex: 1,
    minWidth: 0,
  },
  plantName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  plantVariety: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: '2px 0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  plantPrice: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--primary-color)',
    margin: 0,
  },
  collapsedIcon: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '20px',
    cursor: 'pointer',
  },
};

export default Sidebar;
