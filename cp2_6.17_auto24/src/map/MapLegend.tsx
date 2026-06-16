import { useState } from 'react';

interface MapLegendProps {
  lineColors: Record<string, string>;
}

export default function MapLegend({ lineColors }: MapLegendProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const lines = Object.entries(lineColors);
  const isTwoColumn = lines.length > 6;

  if (lines.length === 0) return null;

  return (
    <div className="map-legend">
      <div className="legend-header">
        <span className="legend-title-icon">🎨</span>
        <span className="legend-title">线路图例</span>
      </div>
      
      <div
        className={`legend-list ${isTwoColumn ? 'two-column' : 'one-column'}`}
      >
        {lines.map(([lineName, color]) => {
          const isHovered = hoveredLine === lineName;
          return (
            <div
              key={lineName}
              className="legend-item"
              onMouseEnter={() => setHoveredLine(lineName)}
              onMouseLeave={() => setHoveredLine(null)}
            >
              <span
                className="legend-dot"
                style={{
                  backgroundColor: color,
                  boxShadow: isHovered
                    ? `0 0 0 3px ${color}33`
                    : `0 1px 3px ${color}40`,
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                }}
              />
              <span
                className="legend-name"
                style={{
                  fontWeight: isHovered ? 700 : 500,
                  color: isHovered ? '#111827' : '#1f2937',
                }}
              >
                {lineName}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .map-legend {
          position: absolute;
          left: 20px;
          bottom: 20px;
          background: #f9fafb;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          padding: 12px;
          z-index: 10;
          min-width: 140px;
          user-select: none;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.8);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }
        
        .map-legend:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        
        .legend-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .legend-title-icon {
          font-size: 14px;
        }
        
        .legend-title {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .legend-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .legend-list.two-column {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          column-gap: 16px;
          row-gap: 8px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: default;
          padding: 2px 0;
        }
        
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          border: 2px solid #ffffff;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .legend-name {
          font-size: 14px;
          color: #1f2937;
          white-space: nowrap;
          transition: font-weight 0.15s ease, color 0.15s ease;
          line-height: 1.4;
        }
        
        @media (max-width: 768px) {
          .map-legend {
            left: 12px;
            bottom: 12px;
            padding: 10px;
            min-width: 120px;
          }
          
          .legend-header {
            margin-bottom: 8px;
            padding-bottom: 6px;
          }
          
          .legend-list {
            gap: 6px;
          }
          
          .legend-list.two-column {
            column-gap: 12px;
            row-gap: 6px;
          }
          
          .legend-name {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}
