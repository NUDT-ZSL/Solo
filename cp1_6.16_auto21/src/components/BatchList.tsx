import React, { useMemo, useState } from 'react';
import type { RoastBatch, RoastLevel, FilterOptions } from '../types';
import { BeanManager } from '../beans/BeanManager';

interface BatchListProps {
  batches: RoastBatch[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const renderStars = (score: number) => {
  const hasGlow = score > 8;
  return (
    <span className={`star-rating ${hasGlow ? 'glowing' : ''}`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={`star ${i < score ? 'filled' : ''}`}
        >
          ★
        </span>
      ))}
      <span className="score-text">{score.toFixed(1)}</span>
    </span>
  );
};

const getRoastBadgeColor = (level: RoastLevel): string => {
  const colors: Record<RoastLevel, string> = {
    light: '#E8D5B7',
    medium: '#CD853F',
    dark: '#8B4513',
  };
  return colors[level];
};

const getRoastBadgeTextColor = (level: RoastLevel): string => {
  return level === 'dark' ? '#FFFFFF' : '#3E2723';
};

const BatchList: React.FC<BatchListProps> = ({ batches, filters, onFilterChange }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredBatches = useMemo(() => {
    return BeanManager.filterBatches(batches, filters);
  }, [batches, filters]);

  const toggleRoastLevel = (level: RoastLevel) => {
    const levels = filters.roastLevels.includes(level)
      ? filters.roastLevels.filter(l => l !== level)
      : [...filters.roastLevels, level];
    onFilterChange({ ...filters, roastLevels: levels });
  };

  const roastLevels: { value: RoastLevel; label: string }[] = [
    { value: 'light', label: '浅烘' },
    { value: 'medium', label: '中烘' },
    { value: 'dark', label: '深烘' },
  ];

  return (
    <div className="batch-list-section">
      <div className="section-header">
        <h2 className="section-title">烘焙批次历史</h2>
        <span className="batch-count">共 {filteredBatches.length} 条记录</span>
      </div>

      <div className="filter-bar">
        <div className="filter-item dropdown-wrapper">
          <label>烘焙度筛选:</label>
          <div className="multi-select-dropdown">
            <button
              type="button"
              className="dropdown-toggle"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {filters.roastLevels.length > 0
                ? filters.roastLevels.map(l => BeanManager.getRoastLevelLabel(l)).join(', ')
                : '全部烘焙度'}
              <span className="dropdown-arrow">▼</span>
            </button>
            {isDropdownOpen && (
              <div className="dropdown-menu animate-fade-in">
                {roastLevels.map(({ value, label }) => (
                  <label key={value} className="dropdown-item">
                    <input
                      type="checkbox"
                      checked={filters.roastLevels.includes(value)}
                      onChange={() => toggleRoastLevel(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="filter-item">
          <label>开始日期:</label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value || null })}
          />
        </div>

        <div className="filter-item">
          <label>结束日期:</label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value || null })}
          />
        </div>

        <div className="filter-item filter-search">
          <label>搜索:</label>
          <input
            type="text"
            placeholder="搜索生豆名或风味..."
            value={filters.searchTerm}
            onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
          />
        </div>
      </div>

      <div className="batch-table-container">
        <div className="batch-table-header">
          <div className="batch-col bean-name-col">生豆名称</div>
          <div className="batch-col date-col">烘焙日期</div>
          <div className="batch-col level-col">烘焙度</div>
          <div className="batch-col notes-col">风味备注</div>
          <div className="batch-col temp-col">温度参数</div>
          <div className="batch-col score-col">风味评分</div>
        </div>
        <div className="batch-table-body">
          {filteredBatches.length === 0 ? (
            <div className="empty-state">暂无符合条件的烘焙批次</div>
          ) : (
            filteredBatches.map((batch) => (
              <div key={batch.id} className="batch-row">
                <div className="batch-col bean-name-col">
                  <span className="bean-name-text">{batch.beanName}</span>
                </div>
                <div className="batch-col date-col">{batch.roastDate}</div>
                <div className="batch-col level-col">
                  <span
                    className="roast-badge"
                    style={{
                      backgroundColor: getRoastBadgeColor(batch.roastLevel),
                      color: getRoastBadgeTextColor(batch.roastLevel),
                    }}
                  >
                    {BeanManager.getRoastLevelLabel(batch.roastLevel)}
                  </span>
                </div>
                <div className="batch-col notes-col">
                  <span className="notes-text">{batch.flavorNotes}</span>
                </div>
                <div className="batch-col temp-col">
                  <span className="temp-info">
                    入{batch.inputTemp}°C / 出{batch.outputTemp}°C
                  </span>
                </div>
                <div className="batch-col score-col">
                  {renderStars(batch.score)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchList;
