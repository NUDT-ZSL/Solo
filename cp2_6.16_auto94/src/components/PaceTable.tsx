import React, { memo, useMemo, useCallback } from 'react';
import type { PaceEntry } from '../types';
import { formatPace, formatTime } from '../utils/format';
import { getPaceColor } from '../utils/paceCalculator';

interface PaceTableProps {
  paceData: PaceEntry[];
  onPaceChange: (km: number, newPace: number) => void;
  disabled?: boolean;
}

const PaceTable: React.FC<PaceTableProps> = memo(function PaceTable({
  paceData,
  onPaceChange,
  disabled = false
}) {
  const { minPace, maxPace } = useMemo(() => {
    const paces = paceData.map(p => p.actualPace);
    return {
      minPace: Math.min(...paces),
      maxPace: Math.max(...paces)
    };
  }, [paceData]);

  const handlePaceInputChange = useCallback(
    (km: number, value: string) => {
      const parts = value.split(':');
      if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        if (!isNaN(minutes) && !isNaN(seconds) && seconds >= 0 && seconds < 60) {
          const totalSeconds = minutes * 60 + seconds;
          onPaceChange(km, totalSeconds);
        }
      }
    },
    [onPaceChange]
  );

  return (
    <div className="card" style={{ maxHeight: '500px', overflow: 'auto' }}>
      <h3 style={{ marginBottom: '16px', color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
        配速建议表
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <th
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                borderBottom: '2px solid #e2e8f0'
              }}
            >
              公里
            </th>
            <th
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                borderBottom: '2px solid #e2e8f0'
              }}
            >
              推荐配速
            </th>
            <th
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                borderBottom: '2px solid #e2e8f0'
              }}
            >
              实际配速
            </th>
            <th
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                borderBottom: '2px solid #e2e8f0'
              }}
            >
              累计用时
            </th>
            <th
              style={{
                padding: '12px 8px',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                borderBottom: '2px solid #e2e8f0'
              }}
            >
              海拔变化
            </th>
          </tr>
        </thead>
        <tbody>
          {paceData.map((entry) => (
            <tr
              key={entry.km}
              style={{
                backgroundColor: getPaceColor(entry.actualPace, minPace, maxPace),
                transition: 'background-color 0.2s ease'
              }}
            >
              <td style={{ padding: '10px 8px', fontSize: '14px', borderBottom: '1px solid #e2e8f0' }}>
                {entry.km}
              </td>
              <td style={{ padding: '10px 8px', fontSize: '14px', borderBottom: '1px solid #e2e8f0' }}>
                {formatPace(entry.recommendedPace)}
              </td>
              <td style={{ padding: '10px 8px', fontSize: '14px', borderBottom: '1px solid #e2e8f0' }}>
                {disabled ? (
                  formatPace(entry.actualPace)
                ) : (
                  <input
                    type="text"
                    value={formatPace(entry.actualPace)}
                    onChange={(e) => handlePaceInputChange(entry.km, e.target.value)}
                    style={{
                      width: '70px',
                      padding: '4px 8px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: 'rgba(255,255,255,0.8)'
                    }}
                  />
                )}
              </td>
              <td style={{ padding: '10px 8px', fontSize: '14px', borderBottom: '1px solid #e2e8f0' }}>
                {formatTime(entry.cumulativeTime)}
              </td>
              <td
                style={{
                  padding: '10px 8px',
                  fontSize: '14px',
                  borderBottom: '1px solid #e2e8f0',
                  color: entry.elevationChange > 0 ? '#dc2626' : entry.elevationChange < 0 ? '#16a34a' : '#64748b'
                }}
              >
                {entry.elevationChange > 0 ? '+' : ''}{entry.elevationChange}m
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default PaceTable;
