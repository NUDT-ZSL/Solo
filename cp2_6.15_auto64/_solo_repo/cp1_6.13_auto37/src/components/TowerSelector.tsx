import { useState } from 'react';
import { TowerType } from '../types';

interface TowerSelectorProps {
  selectedType: TowerType | null;
  onSelect: (type: TowerType) => void;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function TowerSelector({
  selectedType,
  onSelect,
  position,
  onClose,
}: TowerSelectorProps) {
  const [hoveredType, setHoveredType] = useState<TowerType | null>(null);

  const towers: { type: TowerType; color: string; icon: string; name: string }[] = [
    { type: 'fire', color: '#c53030', icon: '🔥', name: '火塔' },
    { type: 'ice', color: '#2c7a7b', icon: '❄️', name: '冰塔' },
    { type: 'electric', color: '#d69e2e', icon: '⚡', name: '电塔' },
  ];

  const handleSectorClick = (e: React.MouseEvent, type: TowerType) => {
    e.stopPropagation();
    onSelect(type);
  };

  const handleSectorHover = (type: TowerType | null) => {
    setHoveredType(type);
  };

  const createSectorPath = (index: number, total: number, radius: number, hoverScale: number = 1) => {
    const angle = 360 / total;
    const startAngle = index * angle - 90;
    const endAngle = startAngle + angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const scaledRadius = radius * hoverScale;
    
    const x1 = scaledRadius * Math.cos(startRad);
    const y1 = scaledRadius * Math.sin(startRad);
    const x2 = scaledRadius * Math.cos(endRad);
    const y2 = scaledRadius * Math.sin(endRad);
    
    return `M 0 0 L ${x1} ${y1} A ${scaledRadius} ${scaledRadius} 0 0 1 ${x2} ${y2} Z`;
  };

  const radius = 80;
  const iconRadius = radius * 0.65;

  return (
    <div
      className="tower-selector"
      style={{
        left: position.x,
        top: position.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <svg
        width={radius * 2.2}
        height={radius * 2.2}
        viewBox={`${-radius * 1.1} ${-radius * 1.1} ${radius * 2.2} ${radius * 2.2}`}
      >
        <defs>
          <linearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fc8181" />
            <stop offset="100%" stopColor="#c53030" />
          </linearGradient>
          <linearGradient id="iceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#81e6d9" />
            <stop offset="100%" stopColor="#2c7a7b" />
          </linearGradient>
          <linearGradient id="electricGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f6e05e" />
            <stop offset="100%" stopColor="#d69e2e" />
          </linearGradient>
        </defs>

        {towers.map((tower, index) => {
          const isSelected = selectedType === tower.type;
          const isHovered = hoveredType === tower.type;
          const scale = isHovered ? 1.1 : 1;
          const angle = (index * (360 / towers.length) - 90 + (360 / towers.length / 2)) * (Math.PI / 180);
          const iconX = Math.cos(angle) * iconRadius;
          const iconY = Math.sin(angle) * iconRadius;

          return (
            <g key={tower.type}>
              <path
                d={createSectorPath(index, towers.length, radius, scale)}
                fill={`url(#${tower.type}Gradient)`}
                stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)'}
                strokeWidth={isSelected ? 3 : 1}
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={(e) => handleSectorClick(e, tower.type)}
                onMouseEnter={() => handleSectorHover(tower.type)}
                onMouseLeave={() => handleSectorHover(null)}
              />
              <text
                x={iconX}
                y={iconY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="24"
                style={{ pointerEvents: 'none' }}
              >
                {tower.icon}
              </text>
            </g>
          );
        })}

        <circle
          cx={0}
          cy={0}
          r={radius * 0.35}
          fill="rgba(26, 32, 44, 0.9)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
        />
        <text
          x={0}
          y={-5}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#e2e8f0"
          fontSize="12"
          fontWeight="bold"
        >
          选择
        </text>
        <text
          x={0}
          y={12}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#a0aec0"
          fontSize="10"
        >
          能量塔
        </text>
      </svg>

      <div className="tower-names">
        {towers.map((tower) => (
          <div
            key={tower.type}
            className={`tower-name-tag ${selectedType === tower.type ? 'selected' : ''}`}
            style={{ borderColor: tower.color }}
          >
            <span>{tower.icon}</span>
            <span>{tower.name}</span>
          </div>
        ))}
      </div>

      <button className="close-selector" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
