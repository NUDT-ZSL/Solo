import React, { useMemo, useState } from 'react';
import type { Emotions, EmotionKey } from '../types';
import { getDominantEmotion } from '../utils/Simulator';

interface HeatmapCell {
  minute: number;
  userId: string;
  maxIntensity: number;
  emotions: Emotions;
}

interface HeatmapGridProps {
  dataByMinute: { minute: number; data: { timestamp: number; userId: string; emotions: Emotions }[] }[];
  userIds: string[];
}

const EMOTION_LABELS: Record<EmotionKey, string> = {
  joy: '高兴',
  fear: '恐惧',
  anger: '愤怒',
  surprise: '惊喜'
};

const HeatmapGrid: React.FC<HeatmapGridProps> = React.memo(({ dataByMinute, userIds }) => {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const heatmapData = useMemo(() => {
    const grid: (HeatmapCell | null)[][] = [];

    for (let u = 0; u < userIds.length; u++) {
      const row: (HeatmapCell | null)[] = [];
      for (let m = 0; m < dataByMinute.length; m++) {
        const minuteData = dataByMinute[m];
        const userData = minuteData.data.find(d => d.userId === userIds[u]);
        if (userData) {
          const maxVal = Math.max(
            userData.emotions.joy,
            userData.emotions.fear,
            userData.emotions.anger,
            userData.emotions.surprise
          );
          row.push({
            minute: minuteData.minute,
            userId: userIds[u],
            maxIntensity: maxVal,
            emotions: userData.emotions
          });
        } else {
          row.push(null);
        }
      }
      grid.push(row);
    }

    return grid;
  }, [dataByMinute, userIds]);

  const getColor = (intensity: number): string => {
    const normalized = Math.max(0, (intensity + 1) / 2);
    const r = Math.round(254 - (254 - 220) * normalized);
    const g = Math.round(226 - (226 - 38) * normalized);
    const b = Math.round(226 - (226 - 38) * normalized);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleMouseEnter = (cell: HeatmapCell, e: React.MouseEvent) => {
    setHoveredCell(cell);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const minuteLabels = useMemo(() => {
    const labels: { minute: number; index: number }[] = [];
    dataByMinute.forEach((d, i) => {
      if (d.minute % 5 === 0) {
        labels.push({ minute: d.minute, index: i });
      }
    });
    return labels;
  }, [dataByMinute]);

  return (
    <div className="chart-card" style={{ position: 'relative' }}>
      <h3 className="chart-title">参会者情绪热力图</h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100% - 32px)',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', marginLeft: '40px', flexShrink: 0 }}>
          {minuteLabels.map(label => (
            <div
              key={label.minute}
              style={{
                position: 'absolute',
                left: `${40 + label.index * (100 / Math.max(dataByMinute.length, 1))}%`,
                fontSize: '10px',
                color: '#64748b',
                transform: 'translateX(-50%)',
                marginTop: '-2px'
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
            marginTop: '18px',
            flex: 1,
            overflow: 'hidden'
          }}
        >
          {heatmapData.map((row, rowIdx) => (
            <div
              key={userIds[rowIdx]}
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
                  flexShrink: 0
                }}
              >
                {userIds[rowIdx]}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '2px',
                  flex: 1,
                  minWidth: 0
                }}
              >
                {row.map((cell, colIdx) => (
                  <div
                    key={colIdx}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: '100%',
                      borderRadius: '4px',
                      backgroundColor: cell ? getColor(cell.maxIntensity) : '#1e293b',
                      cursor: cell ? 'pointer' : 'default',
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={cell ? (e) => handleMouseEnter(cell, e) : undefined}
                    onMouseMove={cell ? handleMouseMove : undefined}
                    onMouseLeave={cell ? handleMouseLeave : undefined}
                  />
                ))}
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
            color: '#64748b'
          }}
        >
          <span>低</span>
          <div
            style={{
              display: 'flex',
              height: '8px',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <div
                key={i}
                style={{
                  width: '20px',
                  backgroundColor: getColor(t * 2 - 1)
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
