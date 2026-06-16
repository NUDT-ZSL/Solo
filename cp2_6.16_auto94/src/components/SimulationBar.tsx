import React, { memo, useCallback } from 'react';
import type { SimulationState } from '../types';
import { formatPace, formatTime } from '../utils/format';

interface SimulationBarProps {
  simulation: SimulationState;
  targetTime: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  disabled?: boolean;
}

const BAR_WIDTH = 700;
const BAR_HEIGHT = 60;
const MARATHON_DISTANCE = 42.2;

const SimulationBar: React.FC<SimulationBarProps> = memo(function SimulationBar({
  simulation,
  targetTime,
  onStart,
  onPause,
  onReset,
  disabled = false
}) {
  const getProgressColor = useCallback(() => {
    const targetPace = targetTime / MARATHON_DISTANCE;
    const expectedTime = simulation.currentKm * targetPace;
    const diff = simulation.cumulativeTime - expectedTime;

    if (diff < -10) return '#10b981';
    if (diff > 10) return '#ef4444';
    return '#facc15';
  }, [simulation.currentKm, simulation.cumulativeTime, targetTime]);

  const progress = (simulation.currentKm / MARATHON_DISTANCE) * 100;

  return (
    <div className="card" style={{ marginTop: '24px' }}>
      <h3 style={{ marginBottom: '16px', color: '#1e293b', fontSize: '18px', fontWeight: '600' }}>
        比赛模拟
      </h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '64px', fontWeight: 'bold', color: '#1e293b', lineHeight: 1 }}>
            {simulation.currentKm.toFixed(1)}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>当前公里</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#1e40af' }}>
            {formatPace(simulation.currentPace)}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>当前配速</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#facc15' }}>
            {formatTime(simulation.cumulativeTime)}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>累计用时</div>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: `${BAR_WIDTH}px`,
          height: `${BAR_HEIGHT}px`,
          backgroundColor: '#e2e8f0',
          borderRadius: '0 0 8px 8px',
          overflow: 'hidden',
          position: 'relative',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: getProgressColor(),
            transition: 'width 0.1s linear, background-color 0.3s ease'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${progress}%`,
            transform: 'translate(-50%, -50%)',
            width: '12px',
            height: '12px',
            backgroundColor: 'white',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.1s linear'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {!simulation.isRunning && !simulation.isCompleted && (
          <button
            className="button button-success"
            onClick={onStart}
            disabled={disabled}
          >
            {simulation.currentKm > 0 ? '继续' : '开始模拟'}
          </button>
        )}
        {simulation.isRunning && (
          <button
            className="button button-secondary"
            onClick={onPause}
          >
            暂停
          </button>
        )}
        {(simulation.currentKm > 0 || simulation.isCompleted) && (
          <button
            className="button button-danger"
            onClick={onReset}
          >
            重置
          </button>
        )}
      </div>
    </div>
  );
});

export default SimulationBar;
