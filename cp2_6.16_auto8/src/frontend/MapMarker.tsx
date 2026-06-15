import React from 'react';
import type { Photo } from '../types';

interface MapMarkerProps {
  photos: Photo[];
  onLocationClick: (photoId: string) => void;
  highlightedCity?: string | null;
  width?: number;
  height?: number;
}

const MapMarker: React.FC<MapMarkerProps> = ({ photos, onLocationClick, highlightedCity, width = 320, height = 240 }) => {
  const cityOrder = new Map<string, { order: number; photoId: string }>();
  photos.forEach((p) => {
    if (p.city && !cityOrder.has(p.city)) {
      cityOrder.set(p.city, { order: p.orderIndex, photoId: p.id });
    }
  });

  const cities = Array.from(cityOrder.entries())
    .map(([city, info]) => ({ city, ...info }))
    .sort((a, b) => a.order - b.order);

  const padding = 40;
  const cx = width / 2;
  const cy = height / 2;
  const rx = (width - padding * 2) / 2 - 10;
  const ry = (height - padding * 2) / 2 - 10;

  const points = cities.map((c, i) => {
    const angle = (i / Math.max(cities.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const jitter = (i % 2 === 0 ? 1 : -1) * (i * 8);
    return {
      ...c,
      x: cx + Math.cos(angle) * rx + jitter * 0.3,
      y: cy + Math.sin(angle) * ry + jitter * 0.2,
    };
  });

  const pathD = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  return (
    <div style={{
      width,
      height,
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id="mm-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8f5e9" />
            <stop offset="100%" stopColor="#e3f2fd" />
          </linearGradient>
          <pattern id="mm-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
          </pattern>
          <marker id="mm-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff5722" />
          </marker>
        </defs>

        <rect width={width} height={height} fill="url(#mm-bg)" />
        <rect width={width} height={height} fill="url(#mm-grid)" />

        <path d={`M ${padding} ${cy - 30} Q ${cx} ${padding - 10} ${width - padding} ${cy + 20}`} fill="none" stroke="#a5d6a7" strokeWidth="22" strokeOpacity="0.4" />
        <path d={`M ${padding - 5} ${cy + 40} L ${width - padding + 5} ${cy - 30}`} fill="none" stroke="#90caf9" strokeWidth="16" strokeOpacity="0.4" />

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#1565c0"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#mm-arrow)"
            markerMid="url(#mm-arrow)"
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              animation: 'drawPath 2.5s ease forwards 0.3s',
            }}
          />
        )}

        {points.map((p, i) => {
          const isHighlighted = highlightedCity === p.city;
          return (
            <g key={p.city} style={{ cursor: 'pointer' }} onClick={() => onLocationClick(p.photoId)}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isHighlighted ? 14 : 11}
                fill="#fff"
                stroke={isHighlighted ? '#ff5722' : '#1565c0'}
                strokeWidth={isHighlighted ? 3 : 2}
                style={{
                  transition: 'all 0.3s',
                  filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(255,87,34,0.6))' : 'none',
                }}
              />
              <circle cx={p.x} cy={p.y} r={isHighlighted ? 6 : 4} fill={isHighlighted ? '#ff5722' : '#1565c0'} />
              <text
                x={p.x}
                y={p.y - (isHighlighted ? 22 : 18)}
                textAnchor="middle"
                fontSize={11}
                fontWeight={isHighlighted ? 700 : 600}
                fill={isHighlighted ? '#ff5722' : '#333'}
                style={{ pointerEvents: 'none' }}
              >
                {i + 1}. {p.city}
              </text>
            </g>
          );
        })}
      </svg>
      <style>{`
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};

export default MapMarker;
