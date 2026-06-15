import React from 'react';
import { EnsembleResult, INSTRUMENTS, InstrumentType } from '@/types';

interface SummaryPanelProps {
  result: EnsembleResult;
  onClose: () => void;
  onRestart: () => void;
}

export default function SummaryPanel({ result, onClose, onRestart }: SummaryPanelProps) {
  const renderHalfRingChart = () => {
    const size = 48;
    const strokeWidth = 6;
    const gap = 4;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const maxValue = Math.max(...Object.values(result.instrumentActivity), 1);

    const createArcPath = (startAngle: number, endAngle: number, r: number) => {
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);
      const x1 = center + r * Math.cos(startRad);
      const y1 = center + r * Math.sin(startRad);
      const x2 = center + r * Math.cos(endRad);
      const y2 = center + r * Math.sin(endRad);
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };

    const instruments: InstrumentType[] = ['piano', 'violin', 'cello', 'flute', 'percussion'];
    const totalAngle = 180;
    const anglePerInstrument = (totalAngle - gap * (instruments.length - 1)) / instruments.length;

    return (
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        {instruments.map((inst, index) => {
          const instrument = INSTRUMENTS.find((i) => i.id === inst)!;
          const value = result.instrumentActivity[inst];
          const percentage = value / maxValue;
          const startAngle = index * (anglePerInstrument + gap);
          const endAngle = startAngle + anglePerInstrument * percentage;
          const fullEndAngle = startAngle + anglePerInstrument;

          return (
            <g key={inst}>
              <path
                d={createArcPath(startAngle, fullEndAngle, radius)}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <path
                d={createArcPath(startAngle, endAngle, radius)}
                fill="none"
                stroke={instrument.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>合奏完成！</h2>

        <div style={styles.durationSection}>
          <span style={styles.durationLabel}>总时长</span>
          <span style={styles.durationValue}>{result.totalDuration} 秒</span>
        </div>

        <div style={styles.chartSection}>
          <span style={styles.chartTitle}>乐器活跃度</span>
          <div style={styles.chartContainer}>
            {renderHalfRingChart()}
          </div>
          <div style={styles.legend}>
            {INSTRUMENTS.map((inst) => (
              <div key={inst.id} style={styles.legendItem}>
                <div style={{ ...styles.legendDot, backgroundColor: inst.color }} />
                <span style={styles.legendText}>{inst.name}</span>
                <span style={styles.legendValue}>{result.instrumentActivity[inst.id]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.closeButton} onClick={onClose}>
            关闭
          </button>
          <button style={styles.restartButton} onClick={onRestart}>
            重新开始
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '520px',
    height: '380px',
    borderRadius: '20px',
    backgroundColor: '#2d2d3d',
    backdropFilter: 'blur(8px)',
    padding: '32px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  title: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '24px',
    fontFamily: "'Playfair Display', serif",
  },
  durationSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px',
  },
  durationLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    marginBottom: '4px',
  },
  durationValue: {
    color: '#ffffff',
    fontSize: '36px',
    fontWeight: 'bold',
  },
  chartSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '24px',
  },
  chartTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    marginBottom: '12px',
  },
  chartContainer: {
    marginBottom: '16px',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  legendText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '12px',
  },
  legendValue: {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    marginTop: 'auto',
  },
  closeButton: {
    padding: '10px 28px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-out, transform 0.2s ease-out',
  },
  restartButton: {
    padding: '10px 28px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#66bb6a',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-out, transform 0.2s ease-out',
  },
};
