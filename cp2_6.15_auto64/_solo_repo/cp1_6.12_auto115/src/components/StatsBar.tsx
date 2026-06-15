import React, { useMemo } from 'react';

interface StatsBarProps {
  totalStudents: number;
  avgQuestion: number;
  totalAccuracy: number;
  stuckCount: number;
  timeoutCount: number;
  accuracyDistribution: number[];
}

const DISTRIBUTION_LABELS = ['0', '10', '20', '30', '40', '50', '60', '70', '80', '90'];

const StatsBar: React.FC<StatsBarProps> = React.memo(({
  totalStudents,
  avgQuestion,
  totalAccuracy,
  stuckCount,
  timeoutCount,
  accuracyDistribution,
}) => {
  const maxCount = useMemo(() => {
    return Math.max(...accuracyDistribution, 1);
  }, [accuracyDistribution]);

  return (
    <div style={{
      width: '100%',
      height: '60px',
      background: '#2C3E50',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: '40px',
      paddingRight: '40px',
      borderBottom: '2px solid #3498DB',
      boxSizing: 'border-box',
      color: '#FFFFFF',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        fontSize: '13px',
        flexShrink: 0,
      }}>
        <span>
          参考人数: <strong style={{ color: '#00D4FF' }}>{totalStudents}</strong>
        </span>
        <span>
          平均题号: <strong style={{ color: '#00D4FF' }}>{avgQuestion}</strong>
        </span>
        <span>
          正确率均值: <strong style={{ color: '#00D4FF' }}>{totalAccuracy}%</strong>
        </span>
        <span style={{ color: stuckCount > 0 ? '#F39C12' : undefined }}>
          卡住: <strong>{stuckCount}</strong>
        </span>
        <span style={{ color: timeoutCount > 0 ? '#E74C3C' : undefined }}>
          超时: <strong>{timeoutCount}</strong>
        </span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '3px',
        height: '40px',
        padding: '0 8px',
        position: 'relative',
      }}>
        {accuracyDistribution.map((count, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            {count > 0 && (
              <span style={{
                fontSize: '9px',
                color: '#FFFFFF',
                lineHeight: 1,
              }}>
                {count}
              </span>
            )}
            <div style={{
              width: '14px',
              height: `${Math.max((count / maxCount) * 28, count > 0 ? 4 : 0)}px`,
              background: '#4A90D9',
              borderRadius: '2px 2px 0 0',
              transition: 'height 0.5s ease',
            }} />
          </div>
        ))}
        <div style={{
          position: 'absolute',
          bottom: '-2px',
          left: '0',
          right: '0',
          display: 'flex',
          justifyContent: 'space-around',
        }}>
          {DISTRIBUTION_LABELS.map((label, idx) => (
            <span key={idx} style={{
              fontSize: '7px',
              color: 'rgba(255,255,255,0.5)',
              width: '14px',
              textAlign: 'center',
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
StatsBar.displayName = 'StatsBar';

export default StatsBar;
