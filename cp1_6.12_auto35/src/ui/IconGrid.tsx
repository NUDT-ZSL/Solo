import React from 'react';
import type { IconItem } from '../icons/iconData';

interface IconGridProps {
  icons: IconItem[];
  onSelect: (icon: IconItem) => void;
  selectedId?: string;
}

const IconGrid: React.FC<IconGridProps> = ({ icons, onSelect, selectedId }) => {
  if (icons.length === 0) {
    return (
      <div style={styles.empty}>
        <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M8 11h6M11 8v6" />
        </svg>
        <p style={styles.emptyText}>没有找到匹配的图标</p>
        <p style={styles.emptySubtext}>尝试使用其他关键词</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .icon-card {
          flex: 1 1 120px;
          min-width: 120px;
          max-width: 160px;
          aspect-ratio: 1;
          background: #16213e;
          border: 1px solid #0f3460;
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          color: #b0b0c0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          user-select: none;
        }
        .icon-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          border-color: #19458a;
          color: #ffffff;
        }
        .icon-card.selected {
          border-color: #e94560;
          background: linear-gradient(135deg, rgba(233, 69, 96, 0.1), rgba(15, 52, 96, 0.5));
          transform: translateY(-5px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(233, 69, 96, 0.3);
        }
        .icon-card.selected svg {
          fill: #e94560;
        }
        @media (max-width: 767px) {
          .icon-card {
            flex: 1 1 calc(50% - 8px) !important;
            min-width: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
      <div style={styles.grid}>
        {icons.map((icon) => (
          <div
            key={icon.id}
            className={`icon-card${selectedId === icon.id ? ' selected' : ''}`}
            onClick={() => onSelect(icon)}
          >
            <div style={styles.iconWrapper}>
              <svg
                viewBox={icon.viewBox}
                width="42"
                height="42"
                fill="currentColor"
                style={styles.iconSvg}
              >
                <path d={icon.pathData} />
              </svg>
            </div>
            <div style={styles.cardInfo}>
              <span style={styles.iconName}>{icon.name}</span>
              <span style={styles.iconId}>{icon.id}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  iconWrapper: {
    width: '60px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
    background: 'rgba(15, 52, 96, 0.5)',
  },
  iconSvg: {
    transition: 'all 0.2s ease',
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    width: '100%',
  },
  iconName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#e0e0e0',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
  },
  iconId: {
    fontSize: '10px',
    color: '#6c7a89',
    fontFamily: 'monospace',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    color: '#6c7a89',
    gap: '12px',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#a0a0b0',
  },
  emptySubtext: {
    fontSize: '14px',
  },
};

export default IconGrid;
