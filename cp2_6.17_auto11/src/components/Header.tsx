import React from 'react';
import { Style } from '../types';
import { useAppContext } from '../context/AppContext';

const Header: React.FC = () => {
  const { filterStyle, setFilterStyle } = useAppContext();

  const filters: Array<{ key: Style | 'all'; label: string; color: string }> = [
    { key: 'all', label: '全部', color: '#6b7280' },
    { key: Style.ANIMAL, label: '动物', color: '#f97316' },
    { key: Style.PLANT, label: '植物', color: '#22c55e' },
    { key: Style.GEOMETRIC, label: '几何', color: '#6366f1' }
  ];

  return (
    <header style={{
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '20px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'linear-gradient(135deg, #fef9ef 0%, #f5e6d3 100%)'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '32px' }}>🎨</span>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#1f2937',
            margin: 0
          }}>
            折纸艺术画廊
          </h1>
        </div>

        <div className="filter-scroll" style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch'
        }}>
          {filters.map(filter => {
            const isActive = filterStyle === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setFilterStyle(filter.key)}
                style={{
                  width: '80px',
                  height: '36px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  flexShrink: 0,
                  backgroundColor: isActive ? filter.color : '#ffffff',
                  color: isActive ? '#ffffff' : '#6b7280',
                  transition: 'background-color 0.25s ease, color 0.25s ease',
                  boxShadow: isActive ? `0 2px 8px ${filter.color}40` : '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
