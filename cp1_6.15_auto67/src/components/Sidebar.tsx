import React, { useState, useEffect } from 'react';
import { Category, CATEGORY_CONFIG, SortType, FilterCategory } from '../logic/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  filterCategory: FilterCategory;
  onFilterChange: (category: FilterCategory) => void;
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
  totalCount: number;
  averageScore: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  filterCategory,
  onFilterChange,
  sortType,
  onSortChange,
  totalCount,
  averageScore
}) => {
  const [animatedCount, setAnimatedCount] = useState(0);
  const [animatedAvg, setAnimatedAvg] = useState(0);

  useEffect(() => {
    const startCount = animatedCount;
    const endCount = totalCount;
    const duration = 200;
    const steps = 10;
    const stepDuration = duration / steps;
    const increment = (endCount - startCount) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedCount(endCount);
        clearInterval(timer);
      } else {
        setAnimatedCount(Math.round(startCount + increment * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [totalCount]);

  useEffect(() => {
    const startAvg = animatedAvg;
    const endAvg = averageScore;
    const duration = 200;
    const steps = 10;
    const stepDuration = duration / steps;
    const increment = (endAvg - startAvg) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedAvg(endAvg);
        clearInterval(timer);
      } else {
        setAnimatedAvg(Math.round((startAvg + increment * currentStep) * 10) / 10);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [averageScore]);

  const categories: Array<{ key: FilterCategory; label: string; color?: string }> = [
    { key: 'all', label: '全部' },
    { key: 'growth', label: CATEGORY_CONFIG.growth.label, color: CATEGORY_CONFIG.growth.color },
    { key: 'efficiency', label: CATEGORY_CONFIG.efficiency.label, color: CATEGORY_CONFIG.efficiency.color },
    { key: 'experience', label: CATEGORY_CONFIG.experience.label, color: CATEGORY_CONFIG.experience.color },
    { key: 'tech', label: CATEGORY_CONFIG.tech.label, color: CATEGORY_CONFIG.tech.color }
  ];

  const sidebarStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '240px',
    height: '100vh',
    backgroundColor: '#2C3E50',
    color: '#ECF0F1',
    transform: isOpen ? 'translateX(0)' : 'translateX(-240px)',
    transition: 'transform 0.3s ease-out',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box'
  };

  const filterItemStyle = (active: boolean, color?: string): React.CSSProperties => ({
    padding: '10px 16px',
    margin: '4px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: active ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
    color: active ? '#FFFFFF' : '#BDC3C7',
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s ease',
    border: 'none',
    textAlign: 'left',
    width: 'calc(100% - 24px)'
  });

  const sortBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px',
    border: '1px solid #34495E',
    backgroundColor: active ? '#3498DB' : 'transparent',
    color: active ? '#FFFFFF' : '#BDC3C7',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.15s ease',
    fontWeight: active ? 500 : 400
  });

  return (
    <>
      <div style={sidebarStyle}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #34495E' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
              🎯 创意管理
            </h2>
            <button
              onClick={onToggle}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#BDC3C7',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#BDC3C7';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '12px', color: '#7F8C8D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              分类筛选
            </div>
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => onFilterChange(cat.key)}
                style={filterItemStyle(filterCategory === cat.key, cat.color)}
                onMouseEnter={(e) => {
                  if (filterCategory !== cat.key) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filterCategory !== cat.key) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                {cat.color && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '2px',
                      backgroundColor: cat.color,
                      flexShrink: 0
                    }}
                  />
                )}
                {!cat.color && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '2px',
                      background: 'linear-gradient(135deg, #E74C3C, #F39C12, #3498DB, #9B59B6)',
                      flexShrink: 0
                    }}
                  />
                )}
                {cat.label}
              </button>
            ))}
          </div>

          <div>
            <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '12px', color: '#7F8C8D', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              排序方式
            </div>
            <div style={{ padding: '0 12px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onSortChange('score')}
                style={sortBtnStyle(sortType === 'score')}
                onMouseEnter={(e) => {
                  if (sortType !== 'score') {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.borderColor = '#3498DB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (sortType !== 'score') {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = '#34495E';
                  }
                }}
              >
                🏆 分值
              </button>
              <button
                onClick={() => onSortChange('time')}
                style={sortBtnStyle(sortType === 'time')}
                onMouseEnter={(e) => {
                  if (sortType !== 'time') {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.borderColor = '#3498DB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (sortType !== 'time') {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = '#34495E';
                  }
                }}
              >
                🕐 时间
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '20px 16px',
            borderTop: '1px solid #34495E',
            backgroundColor: 'rgba(0, 0, 0, 0.15)'
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#7F8C8D', marginBottom: '6px' }}>创意总数</div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#3498DB',
                transform: 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
              key={`count-${totalCount}`}
              onAnimationIteration={() => {}}
            >
              <span
                style={{
                  display: 'inline-block',
                  animation: 'pulse 0.2s ease'
                }}
              >
                {animatedCount}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#7F8C8D', marginBottom: '6px' }}>平均评估分</div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#2ECC71'
              }}
              key={`avg-${averageScore}`}
            >
              <span
                style={{
                  display: 'inline-block',
                  animation: 'pulse 0.2s ease'
                }}
              >
                {animatedAvg}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
