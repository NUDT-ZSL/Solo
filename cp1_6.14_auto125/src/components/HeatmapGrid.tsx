import React, { useMemo, useState, useCallback } from 'react';
import type { Emotions, EmotionKey } from '../types';
import { getDominantEmotion } from '../utils/Simulator';

export interface HeatmapCellData {
  minute: number;
  userId: string;
  normalizedIntensity: number;
  emotions: Emotions;
}

interface HeatmapGridProps {
  heatmapData: HeatmapCellData[];
  userIds: string[];
  totalMinutes: number;
  startMinute: number;
}

const EMOTION_LABELS: Record<EmotionKey, string> = {
  joy: '高兴',
  fear: '恐惧',
  anger: '愤怒',
  surprise: '惊喜'
};

const COLOR_STOPS = [
  { pos: 0, r: 254, g: 226, b: 226 },
  { pos: 0.25, r: 252, g: 165, b: 165 },
  { pos: 0.5, r: 248, g: 113, b: 113 },
  { pos: 0.75, r: 239, g: 68, b: 68 },
  { pos: 1, r: 220, g: 38, b: 38 }
];

function interpolateColor(normalized: number): string {
  const clamped = Math.max(0, Math.min(1, normalized));
  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (clamped >= COLOR_STOPS[i].pos && clamped <= COLOR_STOPS[i + 1].pos) {
      lower = COLOR_STOPS[i];
      upper = COLOR_STOPS[i + 1];
      break;
    }
  }

  const range = upper.pos - lower.pos;
  const factor = range > 0 ? (clamped - lower.pos) / range : 0;
  const r = Math.round(lower.r + (upper.r - lower.r) * factor);
  const g = Math.round(lower.g + (upper.g - lower.g) * factor);
  const b = Math.round(lower.b + (upper.b - lower.b) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

const HeatmapGrid: React.FC<HeatmapGridProps> = React.memo(({ heatmapData, userIds, totalMinutes, startMinute }) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCellData>();
    for (const cell of heatmapData) {
      map.set(`${cell.userId}-${cell.minute}`, cell);
    }
    return map;
  }, [heatmapData]);

  const minutes = useMemo(() => {
    const result: number[] = [];
    for (let m = startMinute; m < startMinute + totalMinutes; m++) {
      result.push(m);
    }
    return result;
  }, [startMinute, totalMinutes]);

  const handleMouseEnter = useCallback((cell: HeatmapCellData, e: React.MouseEvent) => {
    setHoveredCell(cell);
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const minuteLabels = useMemo(() => {
    const labels: { minute: number; index: number }[] = [];
    minutes.forEach((m, i) => {
      if (m % 5 === 0) {
        labels.push({ minute: m, index: i });
      }
    });
    return labels;
  }, [minutes]);

  return (
    <div className="chart-card" style={{ position: 'relative' }}>
      <h3 className="chart-title">参会者情绪热力图</h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', marginLeft: '40px', height: '16px', flexShrink: 0 }}>
          {minuteLabels.map(label => (
            <div
              key={label.minute}
              style={{
                position: 'absolute',
                left: `${(label.index / Math.max(totalMinutes - 1, 1)) * 100}%`,
                fontSize: '10px',
                color: '#64748b',
                transform: 'translateX(-50%)',
                top: 0
              }}
            >
              第{label.minute}分
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            marginTop: '4px',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {userIds.map(userId => (
            <div
              key={userId}
              style={{
                display: 'flex',
                gap: '2px',
                alignItems: 'center',
                flex: 1,
                minHeight: 0
              }}
            >
              <div
                style={{
                  width: '36px',
                  fontSize: '10px',
                  color: '#64748b',
                  textAlign: 'right',
                  flexShrink: 0,
                  paddingRight: '4px'
                }}
              >
                {userId}
              </div>
              <div style={{ display: 'flex', gap: '2px', flex: 1, minWidth: 0 }}>
                {minutes.map(minute => {
                  const cell = cellMap.get(`${userId}-${minute}`);
                  return (
                    <div
                      key={minute}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: '100%',
                        borderRadius: '4px',
                        backgroundColor: cell ? interpolateColor(cell.normalizedIntensity) : '#1e293b',
                        cursor: cell ? 'pointer' : 'default',
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={cell ? (e) => handleMouseEnter(cell, e) : undefined}
                      onMouseMove={cell ? handleMouseMove : undefined}
                      onMouseLeave={cell ? handleMouseLeave : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '8px',
            fontSize: '10px',
            color: '#64748b',
            flexShrink: 0
          }}
        >
          <span>低</span>
          <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <div
                key={i}
                style={{
                  width: '20px',
                  backgroundColor: interpolateColor(t)
                }}
              />
            ))}
          </div>
          <span>高</span>
        </div>
      </div>

      {hoveredCell && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 12,
            top: mousePos.y + 12,
            backgroundColor: '#1f2937',
            borderRadius: '8px',
            padding: '10px 12px',
            color: 'white',
            fontSize: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            pointerEvents: 'none',
            minWidth: '160px'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '6px', color: '#f1f5f9' }}>
            {hoveredCell.userId} · 第{hoveredCell.minute}分钟
          </div>
          {(Object.keys(hoveredCell.emotions) as EmotionKey[]).map(key => {
            const isDominant = getDominantEmotion(hoveredCell.emotions).key === key;
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '2px',
                  fontWeight: isDominant ? 600 : 400,
                  color: isDominant ? '#f1f5f9' : '#94a3b8'
                }}
              >
                <span>{EMOTION_LABELS[key]}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {hoveredCell.emotions[key].toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

HeatmapGrid.displayName = 'HeatmapGrid';

export default HeatmapGrid;
