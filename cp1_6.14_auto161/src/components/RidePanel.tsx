import React, { useState, useEffect } from 'react';
import { TrackPoint, Note } from '@/types';
import { round1, formatDuration } from '@/utils/helpers';

type RideTab = 'data' | 'notes';

interface RidePanelProps {
  onEndRide: () => void;
  currentPosition: TrackPoint | null;
  totalDistance: number;
  avgSpeed: number;
  notes: Note[];
  onSwitchTab: (tab: RideTab) => void;
  activeTab: RideTab;
}

const formatTime = (date: Date): string => {
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((v) => v.toString().padStart(2, '0'))
    .join(':');
};

const formatNoteTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  return [d.getHours(), d.getMinutes()]
    .map((v) => v.toString().padStart(2, '0'))
    .join(':');
};

const RidePanel: React.FC<RidePanelProps> = ({
  onEndRide,
  currentPosition,
  totalDistance,
  avgSpeed,
  notes,
  onSwitchTab,
  activeTab,
}) => {
  const [now, setNow] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = React.useRef<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sortedNotes = [...notes].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="ride-panel">
      <div className="ride-panel-time">{formatTime(now)}</div>

      <div
        style={{
          display: 'flex',
          marginBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <button
          onClick={() => onSwitchTab('data')}
          style={{
            flex: 1,
            padding: '8px 0 12px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            color: activeTab === 'data' ? '#3b82f6' : '#64748b',
            borderBottom: activeTab === 'data' ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-1px',
            transition: 'all 0.2s ease',
          }}
        >
          数据
        </button>
        <button
          onClick={() => onSwitchTab('notes')}
          style={{
            flex: 1,
            padding: '8px 0 12px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            color: activeTab === 'notes' ? '#3b82f6' : '#64748b',
            borderBottom: activeTab === 'notes' ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-1px',
            transition: 'all 0.2s ease',
          }}
        >
          备注
        </button>
      </div>

      {activeTab === 'data' && (
        <div style={{ marginBottom: '16px' }}>
          <div className="ride-stat">
            <div className="ride-stat-value">{round1(totalDistance)} km</div>
            <div className="ride-stat-label">总里程</div>
          </div>
          <div className="ride-stat">
            <div className="ride-stat-value">{round1(avgSpeed)} km/h</div>
            <div className="ride-stat-label">平均速度</div>
          </div>
          <div className="ride-stat">
            <div className="ride-stat-value">
              {currentPosition ? `${Math.round(currentPosition.altitude)} m` : '--'}
            </div>
            <div className="ride-stat-label">海拔</div>
          </div>
          <div className="ride-stat" style={{ marginBottom: 0 }}>
            <div className="ride-stat-value">
              {currentPosition ? `${round1(currentPosition.speed)} km/h` : '--'}
            </div>
            <div className="ride-stat-label">当前速度 · {formatDuration(elapsed)}</div>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div
          style={{
            maxHeight: '240px',
            overflowY: 'auto',
            marginBottom: '16px',
          }}
        >
          {sortedNotes.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '13px',
              }}
            >
              暂无备注，长按地图添加
            </div>
          ) : (
            sortedNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    marginBottom: '4px',
                  }}
                >
                  {formatNoteTime(note.timestamp)}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#1e293b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {note.text}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <button
        className="btn-end"
        onClick={onEndRide}
        style={{
          width: '100%',
          background: '#ef4444',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#dc2626';
          e.currentTarget.style.transform = 'scale(1.03)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = '#ef4444';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        结束骑行
      </button>
    </div>
  );
};

export default RidePanel;
