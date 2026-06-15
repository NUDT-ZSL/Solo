import React, { useState } from 'react';
import { FilterCriteria, PetType, ServiceType, PET_TYPE_LABELS, PET_TYPE_COLORS, SERVICE_TYPE_LABELS } from '../types';

interface SearchPanelProps {
  filters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const PetIcon: React.FC<{ type: PetType; selected: boolean; onClick: () => void }> = ({ type, selected, onClick }) => {
  const icons: Record<PetType, string> = {
    dog: '🐕',
    cat: '🐱',
    rabbit: '🐰',
    hamster: '🐹'
  };

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: '24px',
        border: `2.5px solid ${selected ? PET_TYPE_COLORS[type] : '#E8DCC8'}`,
        backgroundColor: selected ? PET_TYPE_COLORS[type] + '25' : '#FFFFFF',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        fontWeight: selected ? 700 : 400,
        fontSize: '14px',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        boxShadow: selected ? `0 4px 12px ${PET_TYPE_COLORS[type]}40` : '0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: PET_TYPE_COLORS[type] + (selected ? '50' : '20'),
        fontSize: '20px',
        transition: 'all 0.25s ease',
        transform: selected ? 'scale(1.1)' : 'scale(1)'
      }}>
        {icons[type]}
      </span>
      <span style={{
        color: selected ? PET_TYPE_COLORS[type] : '#5C4A32',
        fontWeight: selected ? 700 : 500,
        transition: 'color 0.25s ease'
      }}>
        {PET_TYPE_LABELS[type]}
      </span>
    </button>
  );
};

const SearchPanel: React.FC<SearchPanelProps> = ({ filters, onFilterChange, isExpanded = true, onToggleExpand }) => {
  const [localFilters, setLocalFilters] = useState<FilterCriteria>(filters);

  const updateFilter = (patch: Partial<FilterCriteria>) => {
    const newFilters = { ...localFilters, ...patch };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const today = new Date().toISOString().split('T')[0];

  const content = (
    <div
      style={{
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        maxHeight: isExpanded ? '1000px' : '0',
        opacity: isExpanded ? 1 : 0
      }}
    >
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#8B7355',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🐾 宠物种类
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <PetIcon
              type="dog"
              selected={localFilters.petType === 'dog'}
              onClick={() => updateFilter({ petType: localFilters.petType === 'dog' ? undefined : 'dog' })}
            />
            <PetIcon
              type="cat"
              selected={localFilters.petType === 'cat'}
              onClick={() => updateFilter({ petType: localFilters.petType === 'cat' ? undefined : 'cat' })}
            />
            <PetIcon
              type="rabbit"
              selected={localFilters.petType === 'rabbit'}
              onClick={() => updateFilter({ petType: localFilters.petType === 'rabbit' ? undefined : 'rabbit' })}
            />
            <PetIcon
              type="hamster"
              selected={localFilters.petType === 'hamster'}
              onClick={() => updateFilter({ petType: localFilters.petType === 'hamster' ? undefined : 'hamster' })}
            />
          </div>
        </div>

        <div>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#8B7355',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🏠 服务类型
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]).map((type) => (
              <label
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: localFilters.serviceType === type ? '#F5DEB380' : '#FFFFFF',
                  border: `1px solid ${localFilters.serviceType === type ? '#DEB887' : '#E8DCC8'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="radio"
                  name="serviceType"
                  checked={localFilters.serviceType === type}
                  onChange={() => updateFilter({ serviceType: localFilters.serviceType === type ? undefined : type })}
                  style={{ accentColor: '#B22222' }}
                />
                <span style={{ fontSize: '14px', color: '#5C4A32' }}>{SERVICE_TYPE_LABELS[type]}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#8B7355',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📅 期望日期
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#8B7355', display: 'block', marginBottom: '4px' }}>开始日期</label>
              <input
                type="date"
                min={today}
                value={localFilters.startDate || ''}
                onChange={(e) => updateFilter({ startDate: e.target.value || undefined })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E8DCC8',
                  fontSize: '14px',
                  color: '#5C4A32',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#8B7355', display: 'block', marginBottom: '4px' }}>结束日期</label>
              <input
                type="date"
                min={localFilters.startDate || today}
                value={localFilters.endDate || ''}
                onChange={(e) => updateFilter({ endDate: e.target.value || undefined })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E8DCC8',
                  fontSize: '14px',
                  color: '#5C4A32',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: '#8B7355',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            ⭐ 最低评分: {localFilters.minRating !== undefined ? localFilters.minRating.toFixed(1) + '+' : '全部'}
          </h3>
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={localFilters.minRating !== undefined ? localFilters.minRating : 0}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              updateFilter({ minRating: val === 0 ? undefined : val });
            }}
            style={{
              width: '100%',
              accentColor: '#FFD700'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#A08870' }}>
            <span>0</span>
            <span>2.5</span>
            <span>5.0</span>
          </div>
        </div>

        <button
          onClick={() => {
            setLocalFilters({});
            onFilterChange({});
          }}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #DEB887',
            backgroundColor: 'transparent',
            color: '#8B7355',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5DEB380')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          🔄 重置筛选
        </button>
      </div>
    </div>
  );

  if (onToggleExpand) {
    return (
      <div style={{
        backgroundColor: '#FFFEF7',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
        border: '1px solid #E8DCC8',
        marginBottom: '20px'
      }}>
        <button
          onClick={onToggleExpand}
          style={{
            width: '100%',
            padding: '16px 20px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '16px',
            fontWeight: 600,
            color: '#8B7355'
          }}
        >
          <span>🔍 筛选寄养人</span>
          <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
            ▼
          </span>
        </button>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#FFFEF7',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(139, 115, 85, 0.08)',
      border: '1px solid #E8DCC8'
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #E8DCC8'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 700,
          color: '#8B7355',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔍 筛选寄养人
        </h2>
      </div>
      {content}
    </div>
  );
};

export default SearchPanel;
