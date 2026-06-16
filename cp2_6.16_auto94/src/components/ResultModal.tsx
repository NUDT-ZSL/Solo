import React, { memo } from 'react';
import type { RaceResult } from '../types';
import { formatTime, formatPace } from '../utils/format';

interface ResultModalProps {
  result: RaceResult | null;
  onClose: () => void;
}

const ResultModal: React.FC<ResultModalProps> = memo(function ResultModal({
  result,
  onClose
}) {
  if (!result) return null;

  const diffStr = result.difference > 0
    ? `+${formatTime(result.difference)}`
    : formatTime(Math.abs(result.difference));

  const diffColor = result.difference > 0 ? '#ef4444' : '#10b981';
  const diffText = result.difference > 0 ? '慢于目标' : '快于目标';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏁</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
            比赛完成！
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>恭喜你完成了马拉松比赛</p>
        </div>

        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ color: '#64748b' }}>目标用时</span>
          <span style={{ fontWeight: '600', color: '#1e293b' }}>{formatTime(result.targetTime)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ color: '#64748b' }}>实际用时</span>
          <span style={{ fontWeight: '600', color: '#1e40af', fontSize: '18px' }}>
            {formatTime(result.actualTime)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>差距</span>
          <span style={{ fontWeight: '600', color: diffColor }}>
            {diffStr} ({diffText})
          </span>
        </div>
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>
        每公里配速
      </h3>
      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
        {result.paceList.map((entry) => (
          <div
          key={entry.km}
          style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '14px'
        }}
        >
          <span style={{ color: '#64748b' }}>{entry.km}km</span>
          <span style={{ color: '#1e293b' }}>{formatPace(entry.actualPace)}</span>
        </div>
        ))}
      </div>

        <button
          className="button"
          style={{ width: '100%', marginTop: '24px' }}
          onClick={onClose}
        >
          关闭
        </button>
      </div>
    </div>
  );
});

export default ResultModal;
